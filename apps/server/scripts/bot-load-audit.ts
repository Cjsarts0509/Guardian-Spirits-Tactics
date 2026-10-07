// 격리된 로컬 서버만 사용한다. 운영 주소·인증·저장소에 연결하지 않는다.
import { performance, monitorEventLoopDelay } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { cpus } from 'node:os';
import { WebSocket } from 'ws';
import { loadConfig } from '../src/config.js';
import { createGameServer } from '../src/server.js';
import type { Room } from '../src/rooms.js';
import type { ServerMessage } from '@gst/protocol';
import type { ModeId } from '@gst/rules';
import { LagTrace } from './server-lag-trace.js';

const durationMs = Number(process.argv[2] ?? 20_000);
const traceMode = process.argv[3] === 'trace';
if (!Number.isSafeInteger(durationMs) || durationMs < 1000 || durationMs > 120_000) throw new Error('측정 기간은 1000–120000ms');
const quantiles = (xs: number[]) => {
  const sorted = xs.slice().sort((a, b) => a - b);
  return { samples: xs.length, median: sorted[Math.floor(sorted.length * .5)] ?? null,
    p95: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * .95))] ?? null,
    max: sorted.at(-1) ?? null };
};
const cases = [
  { name: 'one-room-default', modes: ['civil_war'] as ModeId[], activity: .012 },
  { name: 'four-rooms-default', modes: ['civil_war', 'primordial', 'lidellut', 'troll'] as ModeId[], activity: .012 },
  { name: 'four-rooms-high-activity', modes: ['civil_war', 'primordial', 'lidellut', 'troll'] as ModeId[], activity: 1 },
];
const results = [];
for (const scenario of cases) {
  const trace = traceMode ? new LagTrace() : undefined;
  const timed = <T>(name: string, run: () => T): T => trace ? trace.measure(name, run) : run();
  const config = { ...loadConfig({}), port: 0, host: '127.0.0.1', timeScale: 60, botActivity: scenario.activity };
  const server = createGameServer(config, () => {});
  if (trace) {
    const create = server.rooms.create.bind(server.rooms);
    server.rooms.create = (...args) => { const room = create(...args); trace.room(room); return room; };
    const requests = server.http.listeners('request');
    server.http.removeAllListeners('request');
    server.http.on('request', (...args) => timed('http.handler', () => {
      for (const listener of requests) listener.apply(server.http, args);
    }));
  }
  const sockets: WebSocket[] = [];
  const observedRooms = new Map<string, Room>();
  let bytes = 0, messages = 0, wsErrors = 0, measuring = false, peakRss = process.memoryUsage().rss;
  const tick: number[] = [], activeBots: number[] = [], health: number[] = [];
  let healthErrors = 0, probeBusy = false, overBudget = 0;
  const originalTick = server.rooms.tick.bind(server.rooms);
  server.rooms.tick = (now) => {
    if (measuring) trace?.tick();
    for (const r of server.rooms.rooms.values()) observedRooms.set(r.id, r);
    const alive = [...server.rooms.rooms.values()].reduce((n, r) => n + (r.status === 'playing'
      ? r.state!.players.filter((p) => p.alive).length : 0), 0);
    const begin = performance.now();
    timed('manager.tick', () => originalTick(now));
    if (measuring && alive > 0) {
      const elapsed = performance.now() - begin;
      tick.push(elapsed); activeBots.push(alive); overBudget += Number(elapsed > config.tickMs);
      peakRss = Math.max(peakRss, process.memoryUsage().rss);
    }
  };
  const port = await server.listen();
  const loop = monitorEventLoopDelay({ resolution: 10 });
  let probeTimer: NodeJS.Timeout | undefined;
  try {
    for (const mode of scenario.modes) {
      const ws = new WebSocket(`ws://127.0.0.1:${port}`);
      sockets.push(ws);
      await new Promise<void>((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('AI 방 시작 시간 초과')), 5000);
        let created = false, started = false, restarting = false;
        ws.on('error', () => wsErrors++);
        ws.on('message', (data) => timed('client.message', () => {
          const text = data.toString();
          if (measuring) { messages++; bytes += Buffer.byteLength(text); }
          const msg = JSON.parse(text) as ServerMessage;
          if (msg.type === 'error') { clearTimeout(timeout); reject(new Error(msg.message)); }
          if (msg.type === 'welcome' && !created) {
            created = true; ws.send(JSON.stringify({ type: 'room.create', name: mode, mode, turnSeconds: 60 }));
          }
          if (msg.type === 'room' && msg.room?.status === 'lobby' && !started) {
            started = true; ws.send(JSON.stringify({ type: 'room.start', aiOnly: true }));
          }
          if (msg.type === 'game') {
            clearTimeout(timeout); resolve();
            if (msg.view.phase === 'running') restarting = false;
            else if (measuring && !restarting) {
              restarting = true; started = false;
              ws.send(JSON.stringify({ type: 'room.leave' }));
              ws.send(JSON.stringify({ type: 'room.create', name: mode, mode, turnSeconds: 60 }));
            }
          }
        }));
        ws.send(JSON.stringify({ type: 'hello', protocol: 1, nickname: '부하 관전자' }));
      });
    }
    if ([...server.rooms.rooms.values()].some((r) => r.state?.players.length !== 12)) throw new Error('12봇 방이 아님');
    for (const r of server.rooms.rooms.values()) observedRooms.set(r.id, r);
    const probe = async () => {
      if (probeBusy) return;
      probeBusy = true;
      const begin = performance.now();
      try {
        const response = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(5000) });
        const body = await response.json() as { ok: boolean };
        if (!response.ok || !body.ok) throw new Error('health 실패');
        if (measuring) {
          health.push(performance.now() - begin);
          peakRss = Math.max(peakRss, process.memoryUsage().rss);
        }
      } catch { if (measuring) healthErrors++; }
      finally { probeBusy = false; }
    };
    // HTTP 초기화와 방의 최초 시작은 측정 전이다.
    await probe();
    const initialRss = process.memoryUsage().rss, cpu = process.cpuUsage(), begin = performance.now();
    peakRss = initialRss; measuring = true; loop.enable(); trace?.start();
    probeTimer = setInterval(() => { void probe(); }, 100);
    await new Promise((resolve) => setTimeout(resolve, durationMs));
    const measuredMs = performance.now() - begin, usage = process.cpuUsage(cpu);
    measuring = false; loop.disable(); clearInterval(probeTimer);
    const lagTrace = await trace?.finish();
    while (probeBusy) await new Promise((resolve) => setTimeout(resolve, 10));
    const finalRss = process.memoryUsage().rss;
    peakRss = Math.max(peakRss, finalRss);
    const rooms = [...observedRooms.values()].map((r) => ({ mode: r.mode, seed: r.state!.seed, status: r.status,
      elapsedGameMs: r.state!.now - r.state!.startedAt, actions: r.actions.length,
      rejected: r.actions.filter((a) => !a.ok).length,
      rejectedErrors: r.actions.filter((a) => !a.ok).map((a) => a.error),
      alive: r.state!.players.filter((p) => p.alive).length }));
    if (!tick.length || !health.length || !messages || wsErrors || healthErrors) throw new Error('부하 표본/전송/health 검사 실패');
    results.push({ ...scenario, requestedMs: durationMs, measuredMs, settings: { tickMs: config.tickMs, timeScale: config.timeScale },
      tickMs: quantiles(tick), ticksOver250ms: overBudget, activeBots: quantiles(activeBots),
      healthRttMs: quantiles(health), healthErrors, wsErrors, messages, bytes,
      eventLoopMs: { p95: loop.percentile(95) / 1e6, max: loop.max / 1e6 },
      cpuMs: (usage.user + usage.system) / 1000, cpuOneCorePercent: (usage.user + usage.system) / (measuredMs * 10),
      memoryBytes: { initialRss, peakRss, finalRss }, rooms,
      samples: { tickMs: tick, activeBots, healthRttMs: health }, lagTrace });
    process.stderr.write(`[bot-load] ${scenario.name}: ${tick.length} active ticks\n`);
  } finally {
    trace?.stop();
    measuring = false; loop.disable(); if (probeTimer) clearInterval(probeTimer);
    for (const ws of sockets) ws.terminate();
    await server.close();
  }
}
const paths = [
  ...readdirSync('packages/rules/src').filter((p) => /^bot.*\.ts$/.test(p)).map((p) => `packages/rules/src/${p}`),
  'apps/server/src/server.ts', 'apps/server/src/rooms.ts', 'apps/server/src/config.ts', 'apps/server/scripts/bot-load-audit.ts',
  'apps/server/scripts/server-lag-trace.ts',
];
console.log(JSON.stringify({ format: 2, traceMode, runtime: { node: process.version, arch: process.arch, platform: process.platform,
  cpu: cpus()[0]?.model, logicalCpus: cpus().length },
  scope: '로컬 실제 서버의 운영 기본 AI. 실제 시계 250ms 틱, 게임 시계 60배. 판 종료 시 새 12봇 판 시작. 관전 WebSocket과 같은 프로세스 HTTP 클라이언트 포함. 실험 탐색/VM ARM/외부 네트워크/인간 대전 측정 아님.',
  results, hashes: Object.fromEntries(paths.map((p) => [p, createHash('sha256').update(readFileSync(p)).digest('hex')])) }, null, 2));
