import { createServer as createHttpServer, type IncomingMessage, type Server } from 'node:http';
import { randomBytes } from 'node:crypto';
import { createStatic } from './static.js';
import { WebSocketServer, type WebSocket } from 'ws';
import { parseClientMessage, type ServerMessage } from '@gst/protocol';
import type { Action } from '@gst/rules';
import { createVerifier } from './auth.js';
import type { ServerConfig } from './config.js';
import { saveMatch } from './persist.js';
import { RoomManager, type Conn, type Room } from './rooms.js';

interface Session {
  userId: string;
  nickname: string;
  authId: string | null;
  token: string;
  conn: Conn | null;
  socket: WebSocket | null;
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

  const onEnd = (room: Room) => {
    if (!room.state) return;
    saveMatch(cfg, room.state, room.authIds()).catch((e) => log('[persist] 실패', String(e)));
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
    if (serveStatic) return serveStatic(req, res);
    res.writeHead(404);
    res.end();
  });

  const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });

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

    ws.on('message', async (buf) => {
      const now = Date.now();
      tokens = Math.min(RATE_PER_SEC, tokens + ((now - last) / 1000) * RATE_PER_SEC);
      last = now;
      if (tokens < 1) return send({ type: 'error', message: '요청이 너무 많습니다.' });
      tokens -= 1;

      const msg = parseClientMessage(buf.toString());
      if ('error' in msg) return send({ type: 'error', message: msg.error });
      const gameNow = clock();

      if (msg.type === 'ping') return send({ type: 'pong', t: msg.t, serverTime: gameNow });

      if (msg.type === 'hello') {
        session = await authenticate(msg, conn, ws);
        if (!session) return;
        send({ type: 'welcome', userId: session.userId, nickname: session.nickname, session: session.token, guest: !session.authId });
        const room = rooms.roomOf(session.userId);
        if (room) room.join(session.userId, session.nickname, session.authId, conn);
        else send({ type: 'room', room: null });
        return;
      }

      if (!session) return send({ type: 'error', message: '먼저 hello 를 보내야 합니다.' });
      const s: Session = session;
      const current = rooms.roomOf(s.userId);
      const reply = (error: string | null) => error && send({ type: 'error', message: error });

      switch (msg.type) {
        case 'room.list':
          return send({ type: 'rooms', rooms: rooms.list() });
        case 'room.create': {
          if (current) return reply('이미 방에 들어가 있습니다.');
          const room = rooms.create(msg.name, msg.mode, s.userId, msg.turnSeconds);
          return reply(room.join(s.userId, s.nickname, s.authId, conn));
        }
        case 'room.join': {
          if (current && current.id !== msg.roomId) return reply('이미 다른 방에 들어가 있습니다.');
          const room = rooms.rooms.get(msg.roomId);
          if (!room) return reply('방이 없습니다.');
          return reply(room.join(s.userId, s.nickname, s.authId, conn));
        }
        case 'room.leave':
          current?.leave(s.userId, gameNow);
          return send({ type: 'room', room: null });
        case 'room.addBots':
          return reply(current ? current.addBots(s.userId, msg.count) : '방에 없습니다.');
        case 'room.removeBots':
          return reply(current ? current.removeBots(s.userId) : '방에 없습니다.');
        case 'room.start':
          return reply(current ? current.start(s.userId, gameNow) : '방에 없습니다.');
        case 'game.action': {
          if (!current) return send({ type: 'action.result', ok: false, error: '방에 없습니다.', ref: msg.ref });
          const r = current.act(s.userId, msg.action as Action, gameNow);
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
    msg: { token?: string | undefined; nickname?: string | undefined; resume?: string | undefined },
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
          s = { userId: u.userId, nickname: (msg.nickname ?? u.nickname ?? '플레이어').slice(0, 16), authId: u.userId, token: randomBytes(24).toString('hex'), conn: null, socket: null };
        }
      } catch {
        return fail('로그인 토큰이 유효하지 않습니다.');
      }
    }

    if (!s) {
      if (!cfg.allowGuests) return fail('로그인이 필요합니다.');
      if (!msg.nickname) return fail('닉네임이 필요합니다.');
      const userId = `g_${randomBytes(6).toString('hex')}`;
      s = { userId, nickname: msg.nickname.slice(0, 16), authId: null, token: randomBytes(24).toString('hex'), conn: null, socket: null };
    }

    // 기존 연결이 있으면 닫고 이 연결로 교체
    if (s.socket && s.socket !== ws) {
      try {
        s.socket.close(4000, 'replaced');
      } catch {
        /* ignore */
      }
    }
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
        for (const r of rooms.rooms.values()) r.dispose();
        for (const c of wss.clients) c.terminate();
        wss.close();
        http.close(() => resolve());
      }),
  };
}
