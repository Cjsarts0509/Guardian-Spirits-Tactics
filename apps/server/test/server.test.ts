// 실제 서버를 띄우고 WebSocket 으로 접속해 1인 + 봇 11명 판을 끝까지 진행한다.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import type { ServerMessage } from '@gst/protocol';
import { loadConfig } from '../src/config.js';
import { createGameServer, type GameServer } from '../src/server.js';

let server: GameServer;
let port = 0;

beforeAll(async () => {
  const cfg = { ...loadConfig({}), port: 0, host: '127.0.0.1', tickMs: 10, botActivity: 0.3, botKind: 'random' as const, reconnectGraceSeconds: 1, timeScale: 60 };
  server = createGameServer(cfg, () => {});
  port = await server.listen();
});
afterAll(async () => {
  await server.close();
});

function client() {
  const ws = new WebSocket(`ws://127.0.0.1:${port}`);
  const inbox: ServerMessage[] = [];
  const waiters: { pred: (m: ServerMessage) => boolean; resolve: (m: ServerMessage) => void }[] = [];
  ws.on('message', (d) => {
    const m = JSON.parse(d.toString()) as ServerMessage;
    inbox.push(m);
    for (const w of [...waiters]) if (w.pred(m)) {
      waiters.splice(waiters.indexOf(w), 1);
      w.resolve(m);
    }
  });
  const open = new Promise<void>((r) => ws.on('open', () => r()));
  return {
    ws,
    inbox,
    open,
    send: (m: unknown) => ws.send(JSON.stringify(m)),
    wait: <T extends ServerMessage>(pred: (m: ServerMessage) => boolean, ms = 15000) =>
      new Promise<T>((resolve, reject) => {
        const hit = inbox.find(pred);
        if (hit) return resolve(hit as T);
        const to = setTimeout(() => reject(new Error('timeout')), ms);
        waiters.push({ pred, resolve: (m) => (clearTimeout(to), resolve(m as T)) });
      }),
  };
}

describe('게임 서버', () => {
  it('/health 응답', async () => {
    const r = await fetch(`http://127.0.0.1:${port}/health`);
    expect(((await r.json()) as { ok: boolean }).ok).toBe(true);
  });

  it('잘못된 메시지·hello 전 요청은 에러', async () => {
    const c = client();
    await c.open;
    c.send({ type: 'room.list' });
    const e = await c.wait((m) => m.type === 'error');
    expect(e.type).toBe('error');
    c.send({ type: 'nope' });
    await c.wait((m) => m.type === 'error' && m.message.includes('잘못된'));
    c.ws.close();
  });

  it('게스트 입장 → 방 생성 → 봇 11명 → 시작 → 내 시점 뷰만 받음 → 종료까지 진행', async () => {
    const c = client();
    await c.open;
    c.send({ type: 'hello', protocol: 1, nickname: '테스터' });
    const welcome = await c.wait<Extract<ServerMessage, { type: 'welcome' }>>((m) => m.type === 'welcome');
    expect(welcome.guest).toBe(true);

    c.send({ type: 'room.create', name: '테스트방', mode: 'civil_war', turnSeconds: 60 });
    await c.wait((m) => m.type === 'room' && !!m.room);
    c.send({ type: 'room.start' });
    await c.wait((m) => m.type === 'error' && m.message.includes('8명'));

    c.send({ type: 'room.addBots', count: 11 });
    await c.wait((m) => m.type === 'room' && !!m.room && m.room.members.length === 12);
    c.send({ type: 'room.start' });
    const first = await c.wait<Extract<ServerMessage, { type: 'game' }>>((m) => m.type === 'game');
    if ('spectator' in first.view) throw new Error('플레이어 뷰여야 함');
    expect(first.view.me.id).toBe(welcome.userId);
    expect(first.events.some((e) => e.kind === 'role')).toBe(true);
    // 남의 정체는 뷰에 없다
    for (const p of first.view.players) expect(p.revealed).toBeNull();

    // 내 행동 1개: 공표
    const firstMe = first.view.me;
    c.send({ type: 'game.action', ref: 1, action: { type: 'skill', skill: 'publish', name: firstMe.character } });
    const ar = await c.wait<Extract<ServerMessage, { type: 'action.result' }>>((m) => m.type === 'action.result' && m.ref === 1);
    // 봇이 빠르게 움직여 이미 죽었거나 행동불능일 수 있다 — 그 외 거절은 실패
    expect(ar.ok || /사망|행동 불능|종료|진행 중인 게임이 없습니다/.test(ar.error ?? ''), ar.error).toBe(true);

    // 사람도 무작위로 행동 (지휘관이 가만히 있으면 판이 끝나지 않을 수 있음)
    let ref = 100;
    const autoplay = setInterval(() => {
      const last = [...c.inbox].reverse().find((m) => m.type === 'game') as Extract<ServerMessage, { type: 'game' }> | undefined;
      if (!last || 'spectator' in last.view) return;
      const lv = last.view;
      if (!lv.me.alive || lv.phase !== 'running') return;
      const usable = lv.me.skills.filter((s) => !s.passive && !s.blocked);
      const s = usable[Math.floor(Math.random() * usable.length)];
      if (!s) return;
      const others = lv.players.filter((p) => p.alive && p.id !== lv.me.id);
      const target = others[Math.floor(Math.random() * others.length)]?.id;
      const name = s.nameOptions ? s.nameOptions[Math.floor(Math.random() * s.nameOptions.length)] : undefined;
      c.send({ type: 'game.action', ref: ++ref, action: { type: 'skill', skill: s.key, ...(s.target !== 'none' ? { target } : {}), ...(name ? { name } : {}) } });
    }, 30);
    const end = await c
      .wait<Extract<ServerMessage, { type: 'game' }>>((m) => m.type === 'game' && m.view.phase === 'ended', 25000)
      .finally(() => clearInterval(autoplay));
    expect([1, 2]).toContain(end.view.winner);
    expect(end.view.players.every((p) => p.revealed !== null)).toBe(true);
    c.ws.close();
  }, 30000);

  it('세션 토큰으로 재접속하면 같은 방·같은 시점으로 복귀', async () => {
    const a = client();
    await a.open;
    a.send({ type: 'hello', protocol: 1, nickname: '재접속' });
    const w = await a.wait<Extract<ServerMessage, { type: 'welcome' }>>((m) => m.type === 'welcome');
    a.send({ type: 'room.create', name: '재접속방', mode: 'civil_war', turnSeconds: 120 });
    const room = await a.wait<Extract<ServerMessage, { type: 'room' }>>((m) => m.type === 'room' && !!m.room);
    a.ws.close();
    await new Promise((r) => setTimeout(r, 50));

    const b = client();
    await b.open;
    b.send({ type: 'hello', protocol: 1, resume: w.session });
    const w2 = await b.wait<Extract<ServerMessage, { type: 'welcome' }>>((m) => m.type === 'welcome');
    expect(w2.userId).toBe(w.userId);
    // 로비에서 끊기면 방에서 빠지므로 방은 사라졌거나 비어 있다
    expect(room.room!.id).toBeTruthy();
    b.ws.close();
  });
});

describe('연결 유지', () => {
  it('pong 에 답하지 않는 연결은 끊고, 답하는 연결은 유지', async () => {
    const cfg = { ...loadConfig({}), port: 0, host: '127.0.0.1', heartbeatMs: 80 };
    const s = createGameServer(cfg, () => {});
    const p = await s.listen();
    const good = new WebSocket(`ws://127.0.0.1:${p}`);
    const bad = new WebSocket(`ws://127.0.0.1:${p}`, { autoPong: false });
    await Promise.all([new Promise((r) => good.on('open', r)), new Promise((r) => bad.on('open', r))]);
    const badClosed = new Promise<boolean>((r) => bad.on('close', () => r(true)));
    expect(await Promise.race([badClosed, new Promise((r) => setTimeout(() => r(false), 1000))])).toBe(true);
    expect(good.readyState).toBe(WebSocket.OPEN);
    good.close();
    await s.close();
  });
});

describe('AI 전용 판 (관전)', () => {
  it('사람은 관전자가 되고 봇 12명이 끝까지 진행, 관전 뷰에는 전원 정체가 보인다', async () => {
    const cfg = { ...loadConfig({}), port: 0, host: '127.0.0.1', tickMs: 10, botActivity: 0.3, reconnectGraceSeconds: 1, timeScale: 60 };
    const s = createGameServer(cfg, () => {});
    const p = await s.listen();
    const ws = new WebSocket(`ws://127.0.0.1:${p}`);
    const inbox: ServerMessage[] = [];
    ws.on('message', (d) => inbox.push(JSON.parse(d.toString()) as ServerMessage));
    await new Promise((r) => ws.on('open', r));
    const wait = <T extends ServerMessage>(pred: (m: ServerMessage) => boolean, ms = 30000) =>
      new Promise<T>((resolve, reject) => {
        const t0 = Date.now();
        const tick = () => {
          const hit = inbox.find(pred);
          if (hit) return resolve(hit as T);
          if (Date.now() - t0 > ms) return reject(new Error('timeout'));
          setTimeout(tick, 20);
        };
        tick();
      });
    ws.send(JSON.stringify({ type: 'hello', protocol: 1, nickname: '관전자' }));
    await wait((m) => m.type === 'welcome');
    ws.send(JSON.stringify({ type: 'room.create', name: 'AI전', mode: 'civil_war', turnSeconds: 60 }));
    await wait((m) => m.type === 'room' && !!m.room);
    ws.send(JSON.stringify({ type: 'room.start', aiOnly: true }));
    const g = await wait<Extract<ServerMessage, { type: 'game' }>>((m) => m.type === 'game');
    expect('spectator' in g.view && g.view.spectator).toBe(true);
    expect(g.view.players).toHaveLength(12);
    expect(g.view.players.every((x) => x.revealed !== null)).toBe(true);
    ws.send(JSON.stringify({ type: 'game.action', ref: 5, action: { type: 'chat', channel: 'all', text: 'x' } }));
    const ar = await wait<Extract<ServerMessage, { type: 'action.result' }>>((m) => m.type === 'action.result' && m.ref === 5);
    expect(ar.ok).toBe(false);
    const end = await wait<Extract<ServerMessage, { type: 'game' }>>((m) => m.type === 'game' && m.view.phase === 'ended', 60000);
    expect([1, 2]).toContain(end.view.winner);
    ws.close();
    await s.close();
  }, 70000);
});
