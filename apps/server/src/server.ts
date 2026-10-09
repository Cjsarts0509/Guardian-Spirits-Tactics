import { createServer as createHttpServer, type IncomingMessage, type Server } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { createStatic } from './static.js';
import { WebSocketServer, type WebSocket } from 'ws';
import { parseClientMessage, type ServerMessage } from '@gst/protocol';
import type { Action } from '@gst/rules';
import { createVerifier } from './auth.js';
import type { ServerConfig } from './config.js';
import { loadModeRecords } from './persist.js';
import { buildRecord, saveRecord } from './records.js';
import { matchDelivery } from './match-delivery.js';
import { RoomManager, type Conn, type Room } from './rooms.js';
import { modes } from '@gst/rules';

interface Session {
  userId: string;
  nickname: string;
  authId: string | null;
  token: string;
  conn: Conn | null;
  socket: WebSocket | null;
  hostCapable: boolean;
}

export interface GameServer {
  http: Server;
  rooms: RoomManager;
  listen(): Promise<number>;
  close(): Promise<void>;
}

const RATE_PER_SEC = 20;

/** 같은 주소(화면을 이 서버가 줄 때)는 항상, 그 외에는 허용 목록. 목록이 비고 strict 가 아니면 전부 허용(개발) */
export function originAllowed(cfg: Pick<ServerConfig, 'allowedOrigins' | 'strictOrigin'>, req: Pick<IncomingMessage, 'headers'>): boolean {
  const origin = req.headers.origin ?? '';
  let sameOrigin = false;
  try {
    sameOrigin = !!origin && new URL(origin).host === req.headers.host;
  } catch {
    sameOrigin = false;
  }
  if (sameOrigin || cfg.allowedOrigins.includes(origin)) return true;
  return !cfg.strictOrigin && cfg.allowedOrigins.length === 0;
}

export function createGameServer(cfg: ServerConfig, log: (...a: unknown[]) => void = console.log): GameServer {
  const verify = createVerifier(cfg);
  const sessionsByToken = new Map<string, Session>();
  const sessionsByUser = new Map<string, Session>();

  const delivery = matchDelivery(cfg, log);
  const onEnd = (room: Room) => {
    if (!room.state) return;
    void delivery.enqueue({ id: randomUUID(), state: structuredClone(room.state), authIds: room.authIds() }).catch(e => log('[persist] 보관 실패', String(e)));
    if (cfg.recordsDir) {
      const rec = buildRecord({ roomId: room.id, roomName: room.name, turnSeconds: room.turnSeconds, botKind: cfg.botKind, aiOnly: room.aiOnly, bots: room.botIds(), state: room.state, actions: room.actions });
      saveRecord(cfg.recordsDir, rec)
        .then((f) => log(`[record] 저장: ${f} (행동 ${rec.actions.length}, 이벤트 ${rec.log.length})`))
        .catch((e) => log('[record] 실패', String(e)));
    }
    log(`[room ${room.id}] 종료: ${room.state.endReason}`);
  };
  // 게임 시계 (TIME_SCALE 배속, 운영은 1)
  const t0 = Date.now();
  const clock = () => (cfg.timeScale === 1 ? Date.now() : Math.round(t0 + (Date.now() - t0) * cfg.timeScale));
  const rooms = new RoomManager(cfg, onEnd, clock);

  const serveStatic = cfg.staticDir ? createStatic(cfg.staticDir) : null;
  const http = createHttpServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify({ ok: true, rooms: rooms.rooms.size, sessions: sessionsByUser.size }));
      return;
    }
    // 클라이언트 설정 (공개 값만): 로그인 가능 여부와 Supabase 공개 키
    if (req.url === '/config.json') {
      const auth = cfg.supabaseUrl && cfg.supabasePublishableKey && verify ? { supabaseUrl: cfg.supabaseUrl, supabasePublishableKey: cfg.supabasePublishableKey } : null;
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify({ auth, allowGuests: cfg.allowGuests }));
      return;
    }
    if (serveStatic) return serveStatic(req, res);
    res.writeHead(404);
    res.end();
  });

  const wss = new WebSocketServer({ noServer: true, maxPayload: 9 * 1024 * 1024 });

  http.on('upgrade', (req: IncomingMessage, socket, head) => {
    if (!originAllowed(cfg, req)) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  });

  // 연결 유지: 주기적으로 ping, 다음 주기까지 pong 이 없으면 끊는다
  const alive = new WeakMap<WebSocket, boolean>();
  const heartbeat = setInterval(() => {
    for (const c of wss.clients) {
      if (alive.get(c) === false) {
        c.terminate();
        continue;
      }
      alive.set(c, false);
      try {
        c.ping();
      } catch {
        /* 닫히는 중 */
      }
    }
  }, cfg.heartbeatMs);
  heartbeat.unref();
  const deliveryTimer = setInterval(() => { void delivery.flush().catch(e => log('[persist]', String(e))); }, 30000);
  deliveryTimer.unref();
  void delivery.flush().catch(e => log('[persist]', String(e)));

  wss.on('connection', (ws: WebSocket) => {
    alive.set(ws, true);
    ws.on('pong', () => alive.set(ws, true));
    let session: Session | null = null;
    let tokens = RATE_PER_SEC;
    let last = Date.now();
    const send = (m: ServerMessage) => {
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(m));
    };
    const conn: Conn = { send };

    ws.on('message', async (data) => {
      const buf = Buffer.isBuffer(data) ? data : Array.isArray(data) ? Buffer.concat(data) : Buffer.from(data);
      if (session && session.socket !== ws) return;
      if (buf.byteLength > 16 * 1024 && (!session || rooms.roomOf(session.userId)?.hostId !== session.userId)) {
        ws.close(1009, 'host checkpoint required'); return;
      }
      const now = Date.now();
      tokens = Math.min(RATE_PER_SEC, tokens + ((now - last) / 1000) * RATE_PER_SEC);
      last = now;
      if (tokens < 1) return send({ type: 'error', message: '요청이 너무 많습니다.' });
      tokens -= 1;

      const msg = parseClientMessage(buf.toString());
      if (!('error' in msg) && buf.byteLength > 16 * 1024 && msg.type !== 'host.frame') { ws.close(1009, 'oversized request'); return; }
      if ('error' in msg) return send({ type: 'error', message: msg.error });
      const gameNow = clock();

      if (msg.type === 'ping') return send({ type: 'pong', t: msg.t, serverTime: gameNow });

      if (msg.type === 'hello') {
        session = await authenticate(msg, conn, ws);
        if (!session) return;
        send({ type: 'welcome', userId: session.userId, nickname: session.nickname, session: session.token, guest: !session.authId });
        // 끊겼다 돌아온 자리(away)는 자동 복귀, 스스로 잠시 나간 자리(left)는 로비에서 재입장
        const uid = session.userId;
        const room = rooms.roomOf(uid) ?? rooms.awayRoomsOf(uid).find((r) => r.member(uid)?.away && !r.member(uid)?.left);
        if (room) room.join(session.userId, session.nickname, session.authId, conn, session.hostCapable);
        else send({ type: 'room', room: null });
        return;
      }

      if (!session) return send({ type: 'error', message: '먼저 hello 를 보내야 합니다.' });
      const s: Session = session;
      const current = rooms.roomOf(s.userId);
      const reply = (error: string | null) => error && send({ type: 'error', message: error });

      switch (msg.type) {
        case 'profile.get':
          try { send({ type: 'profile', profile: { nickname: s.nickname, guest: !s.authId, modes: s.authId ? await loadModeRecords(cfg, s.authId) : [] } }); }
          catch { reply('전적을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'); }
          return;
        case 'room.list':
          return send({ type: 'rooms', rooms: rooms.list(s.userId) });
        case 'room.create': {
          if (current) return reply('이미 방에 들어가 있습니다.');
          if (!modes[msg.mode]) return reply('아직 준비되지 않은 모드입니다.');
          // 자리를 비워 둔 다른 판이 있으면 그 판에서는 완전히 나간 것으로 (사망 처리)
          for (const r of rooms.awayRoomsOf(s.userId)) r.leave(s.userId, gameNow, 'quit');
          const room = rooms.create(msg.name, msg.mode, s.userId, msg.turnSeconds, msg.capacity ? 'server' : msg.hosting)
          if (msg.capacity) room.configure(msg.capacity);
          return reply(room.join(s.userId, s.nickname, s.authId, conn, s.hostCapable));
        }
        case 'room.join': {
          if (current && current.id !== msg.roomId) return reply('이미 다른 방에 들어가 있습니다.');
          const room = rooms.rooms.get(msg.roomId);
          if (!room) return reply('방이 없습니다.');
          for (const r of rooms.awayRoomsOf(s.userId)) if (r.id !== room.id) r.leave(s.userId, gameNow, 'quit');
          return reply(room.join(s.userId, s.nickname, s.authId, conn, s.hostCapable));
        }
        case 'room.leave':
          current?.leave(s.userId, gameNow, msg.mode ?? 'quit');
          return send({ type: 'room', room: null });
        case 'room.addBots':
          return reply(current ? current.addBots(s.userId, msg.count) : '방에 없습니다.');
        case 'room.removeBots':
          return reply(current ? current.removeBots(s.userId) : '방에 없습니다.');
        case 'room.ready': return reply(current ? current.ready(s.userId, msg.ready) : '방에 없습니다.');
        case 'room.capacity': return reply(current ? current.setCapacity(s.userId, msg.capacity) : '방에 없습니다.');
        case 'room.slot': return reply(current ? current.setSlot(s.userId, msg.slot, msg.kind) : '방에 없습니다.');
        case 'room.kick': return reply(current ? current.kick(s.userId, msg.userId) : '방에 없습니다.');
        case 'room.chat': return reply(current ? current.say(s.userId, msg.text) : '방에 없습니다.');
        case 'game.assign': return reply(current ? current.assign(s.userId, gameNow) : '방에 없습니다.');
        case 'game.begin': return reply(current ? current.begin(s.userId) : '방에 없습니다.');
        case 'replay.get':
          if (!current?.state || current.status !== 'ended') return reply('게임 종료 후에만 복기할 수 있습니다.');
          return send({ type: 'replay', replay: { frames: current.replayFrames, events: current.state.log } });
        case 'room.start':
          return reply(current ? (current.staged ? current.requestStart(s.userId) : current.start(s.userId, gameNow, !!msg.aiOnly)) : '방에 없습니다.');
        case 'host.release':
          current?.releaseHost(s.userId, msg.epoch);
          return;
        case 'host.frame':
          return reply(current ? current.commitHost(s.userId, msg.epoch, msg.frame, msg.checkpoint) : '방에 없습니다.');
        case 'game.action': {
          if (!current) return send({ type: 'action.result', ok: false, error: '방에 없습니다.', ref: msg.ref });
          const r = current.act(s.userId, msg.action as Action, gameNow, msg.ref);
          if (r.pending) return;
          return send({ type: 'action.result', ok: r.ok, error: r.error, ref: msg.ref });
        }
      }
    });

    ws.on('close', () => {
      if (!session) return;
      if (session.socket !== ws) return; // 다른 연결로 대체됨
      session.conn = null;
      session.socket = null;
      rooms.roomOf(session.userId)?.disconnected(session.userId);
    });
  });

  async function authenticate(
    msg: { token?: string | undefined; nickname?: string | undefined; resume?: string | undefined; hostCapable?: boolean },
    conn: Conn,
    ws: WebSocket,
  ): Promise<Session | null> {
    const fail = (message: string) => {
      conn.send({ type: 'error', message });
      return null;
    };
    let s: Session | undefined;
    if (msg.resume) s = sessionsByToken.get(msg.resume);

    if (!s && msg.token) {
      if (!verify) return fail('이 서버는 로그인 검증이 설정되지 않았습니다.');
      try {
        const u = await verify(msg.token);
        s = sessionsByUser.get(u.userId);
        if (!s) {
          s = { userId: u.userId, nickname: (msg.nickname ?? u.nickname ?? '플레이어').slice(0, 16), authId: u.userId, token: randomBytes(24).toString('hex'), conn: null, socket: null, hostCapable: false };
        }
      } catch {
        return fail('로그인 토큰이 유효하지 않습니다.');
      }
    }

    if (!s) {
      if (!cfg.allowGuests) return fail('로그인이 필요합니다.');
      if (!msg.nickname) return fail('닉네임이 필요합니다.');
      const userId = `g_${randomBytes(6).toString('hex')}`;
      s = { userId, nickname: msg.nickname.slice(0, 16), authId: null, token: randomBytes(24).toString('hex'), conn: null, socket: null, hostCapable: false };
    }

    // 기존 연결이 있으면 닫고 이 연결로 교체
    if (s.socket && s.socket !== ws) {
      try {
        s.socket.close(4000, 'replaced');
      } catch {
        /* ignore */
      }
    }
    s.hostCapable = !!msg.hostCapable;
    s.conn = conn;
    s.socket = ws;
    sessionsByToken.set(s.token, s);
    sessionsByUser.set(s.userId, s);
    return s;
  }

  let timer: NodeJS.Timeout | null = null;

  return {
    http,
    rooms,
    listen: () =>
      new Promise((resolve) => {
        http.listen(cfg.port, cfg.host, () => {
          timer = setInterval(() => rooms.tick(clock()), cfg.tickMs);
          const addr = http.address();
          resolve(typeof addr === 'object' && addr ? addr.port : cfg.port);
        });
      }),
    close: () =>
      new Promise((resolve) => {
        if (timer) clearInterval(timer);
        clearInterval(heartbeat);
        clearInterval(deliveryTimer);
        for (const r of rooms.rooms.values()) r.dispose();
        for (const c of wss.clients) c.terminate();
        wss.close();
        http.close(() => resolve());
      }),
  };
}
