import { PerformanceObserver, performance } from 'node:perf_hooks';
import { readFileSync } from 'node:fs';
import type { Room } from '../src/rooms.js';

interface Span { name: string; start: number; end: number; wallMs: number; cpuMs: number }
const cpuMs = (u: NodeJS.CpuUsage) => (u.user + u.system) / 1000;
export const readOsCounters = (read: (path: string) => string = (path) => readFileSync(path, 'utf8')) => {
  const number = (value: string | undefined): number | null => {
    if (value === undefined) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  };
  let throttledUs: number | null = null, throttleCount: number | null = null;
  let runNs: number | null = null, waitNs: number | null = null, cgroupPath: string | null = null;
  try {
    const ownPath = read('/proc/self/cgroup').split('\n').find((line) => line.startsWith('0::'))?.slice(3);
    if (ownPath?.startsWith('/') && !ownPath.split('/').includes('..')) {
      const path = `/sys/fs/cgroup${ownPath === '/' ? '' : ownPath}/cpu.stat`;
      const cgroup = Object.fromEntries(read(path).trim().split('\n').map((line) => line.trim().split(/\s+/)));
      throttledUs = number(cgroup.throttled_usec); throttleCount = number(cgroup.nr_throttled); cgroupPath = path;
    }
  } catch { /* cgroup v1/미지원은 알 수 없음으로 남긴다. */ }
  try {
    const values = read('/proc/self/schedstat').trim().split(/\s+/);
    runNs = number(values[0]); waitNs = number(values[1]);
  } catch { /* cgroup 여부와 독립적으로 /proc를 시도한다. */ }
  return { throttledUs, throttleCount, runNs, waitNs, cgroupPath };
};
const delta = (before: number | null, after: number | null, scale = 1) =>
  before !== null && after !== null && after >= before ? (after - before) / scale : null;

/** 평가 전용 시계열. OS/GC 관측은 정책에 전달하지 않는다. */
export class LagTrace {
  private spans: Span[] = [];
  private gc: { start: number; end: number; durationMs: number }[] = [];
  private gaps: { start: number; end: number; intervalMs: number; lateMs: number; cpuMs: number;
    throttledMs: number | null; throttleCount: number | null; schedulerRunMs: number | null;
    schedulerWaitMs: number | null; readMs: number }[] = [];
  private ticks: { at: number; intervalMs: number }[] = [];
  private observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) this.gc.push({ start: entry.startTime,
      end: entry.startTime + entry.duration, durationMs: entry.duration });
  });
  private timer: NodeJS.Timeout | undefined;
  private previousTick: number | undefined;
  private sends = new WeakSet<object>();
  private allBeatMax = 0;
  private beatCount = 0;
  private osAvailability: ReturnType<typeof readOsCounters> | undefined;

  measure<T>(name: string, run: () => T): T {
    const start = performance.now(), cpu = process.cpuUsage();
    try { return run(); }
    finally {
      const end = performance.now(), used = cpuMs(process.cpuUsage(cpu));
      if (end - start >= 1) this.spans.push({ name, start, end, wallMs: end - start, cpuMs: used });
    }
  }

  room(room: Room): void {
    const tick = room.tick.bind(room), sync = room.syncGame.bind(room), start = room.start.bind(room), join = room.join.bind(room);
    room.tick = (now) => this.measure(`room.tick:${room.mode}`, () => tick(now));
    room.syncGame = (only) => this.measure(`room.sync:${room.mode}`, () => sync(only));
    room.start = (...args) => this.measure(`room.start:${room.mode}`, () => start(...args));
    room.join = (...args) => {
      const conn = args[3];
      if (!this.sends.has(conn)) {
        this.sends.add(conn);
        const send = conn.send.bind(conn);
        conn.send = (msg) => this.measure('server.send', () => send(msg));
      }
      return this.measure('room.join', () => join(...args));
    };
  }

  tick(): void {
    const at = performance.now();
    if (this.previousTick !== undefined) this.ticks.push({ at, intervalMs: at - this.previousTick });
    this.previousTick = at;
  }

  start(): void {
    this.spans = []; this.gc = []; this.gaps = []; this.ticks = []; this.previousTick = undefined;
    this.observer.observe({ entryTypes: ['gc'] });
    let before = performance.now(), cpu = process.cpuUsage(), os = readOsCounters();
    this.osAvailability = os;
    this.timer = setInterval(() => {
      const end = performance.now(), used = process.cpuUsage(cpu), readStart = performance.now(),
        nextOs = this.measure('trace.counters', () => readOsCounters());
      const readMs = performance.now() - readStart, intervalMs = end - before;
      this.allBeatMax = Math.max(this.allBeatMax, intervalMs); this.beatCount++;
      if (intervalMs >= 30) this.gaps.push({ start: before, end, intervalMs, lateMs: intervalMs - 10,
        cpuMs: cpuMs(used), throttledMs: delta(os.throttledUs, nextOs.throttledUs, 1000),
        throttleCount: delta(os.throttleCount, nextOs.throttleCount),
        schedulerRunMs: nextOs.runNs !== null && nextOs.runNs > 0 ? delta(os.runNs, nextOs.runNs, 1e6) : null,
        schedulerWaitMs: nextOs.runNs !== null && nextOs.runNs > 0 ? delta(os.waitNs, nextOs.waitNs, 1e6) : null, readMs });
      before = end; cpu = process.cpuUsage(); os = nextOs;
    }, 10);
  }

  async finish() {
    if (this.timer) clearInterval(this.timer);
    // GC observer notifications are asynchronous; flush before correlating.
    await new Promise<void>((resolve) => setImmediate(resolve));
    this.observer.disconnect();
    return { resolutionMs: 10, beatCount: this.beatCount, maxBeatIntervalMs: this.allBeatMax, osAvailability: this.osAvailability,
      spans: this.spans, gc: this.gc, ticks: this.ticks,
      gaps: this.gaps.map((gap) => ({ ...gap,
        overlappingSpans: this.spans.filter((s) => s.end > gap.start && s.start < gap.end),
        overlappingGc: this.gc.filter((g) => g.end > gap.start && g.start < gap.end) })) };
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.observer.disconnect();
  }
}
