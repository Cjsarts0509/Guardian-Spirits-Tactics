import { randomBytes } from 'node:crypto';
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  advance,
  applyAction,
  createGame,
  eventsFor,
  getMode,
  modes,
  type ModeId,
  playerLeft,
  randomBotAction,
  smartBotAction,
  viewFor,
  spectatorView,
  type Action,
  type GameState,
} from '@gst/rules';
import type { RoomDetail, RoomSummary, ServerMessage } from '@gst/protocol';
import type { ServerConfig } from './config.js';

export interface Conn {
  send(msg: ServerMessage): void;
}

interface Member {
  id: string;
  nickname: string;
  bot: boolean;
  /** 봇만 돌리는 판의 관전자 */
  spectator?: boolean;
  /** 로그인 사용자의 auth id (게스트·봇은 null) */
  authId: string | null;
  conn: Conn | null;
  lastSeq: number;
  graceTimer: NodeJS.Timeout | null;
}

const id = (n = 6) => randomBytes(n).toString('base64url').slice(0, n);

export class Room {
  readonly id = id(6);
  status: 'lobby' | 'playing' | 'ended' = 'lobby';
  members: Member[] = [];
  state: GameState | null = null;
  endedAt = 0;
  private botRng = { rng: Math.floor(Math.random() * 2 ** 31) };
  private botSeq = 0;

  constructor(
    readonly cfg: ServerConfig,
    readonly name: string,
    readonly mode: ModeId,
    public hostId: string,
    readonly turnSeconds: number,
    private readonly onEnd: (room: Room) => void,
    private readonly clock: () => number = Date.now,
  ) {}

  summary(): RoomSummary {
    return {
      id: this.id,
      name: this.name,
      mode: this.mode,
      modeName: getMode(this.mode).displayName,
      players: this.members.length,
      maxPlayers: MAX_PLAYERS,
      status: this.status,
    };
  }

  detail(): RoomDetail {
    return {
      ...this.summary(),
      hostId: this.hostId,
      turnSeconds: this.turnSeconds,
      members: this.members.map((m) => ({ id: m.id, nickname: m.nickname, bot: m.bot, connected: m.bot || !!m.conn, ...(m.spectator ? { spectator: true } : {}) })),
      minPlayers: MIN_PLAYERS,
      botsAllowed: this.cfg.allowBots,
    };
  }

  member(userId: string): Member | undefined {
    return this.members.find((m) => m.id === userId);
  }

  humans(): Member[] {
    return this.members.filter((m) => !m.bot);
  }

  /** 입장 또는 재접속 */
  join(userId: string, nickname: string, authId: string | null, conn: Conn): string | null {
    const existing = this.member(userId);
    if (existing) {
      existing.conn = conn;
      existing.lastSeq = 0; // 재접속 시 전체 로그 다시 전송
      if (existing.graceTimer) clearTimeout(existing.graceTimer);
      existing.graceTimer = null;
      this.broadcastRoom();
      this.syncGame([existing]);
      return null;
    }
    if (this.status !== 'lobby') return '이미 시작된 방입니다.';
    if (this.members.length >= MAX_PLAYERS) return '방이 가득 찼습니다.';
    this.members.push({ id: userId, nickname, bot: false, authId, conn, lastSeq: 0, graceTimer: null });
    this.broadcastRoom();
    return null;
  }

  /** 명시적 퇴장 */
  leave(userId: string, now: number): void {
    const m = this.member(userId);
    if (!m) return;
    if (this.status === 'lobby' || this.status === 'ended') {
      this.members = this.members.filter((x) => x.id !== userId);
      if (this.hostId === userId) this.hostId = this.humans()[0]?.id ?? '';
    } else if (m.spectator) {
      this.members = this.members.filter((x) => x.id !== userId);
    } else if (this.state) {
      m.conn = null;
      if (m.graceTimer) clearTimeout(m.graceTimer);
      m.graceTimer = null;
      playerLeft(this.state, userId, now);
      this.afterChange();
    }
    this.broadcastRoom();
  }

  /** 연결 끊김 */
  disconnected(userId: string): void {
    const m = this.member(userId);
    if (!m) return;
    m.conn = null;
    if (this.status === 'lobby') {
      this.leave(userId, this.clock());
      return;
    }
    if (this.status === 'playing' && !m.spectator && !m.graceTimer) {
      m.graceTimer = setTimeout(() => {
        m.graceTimer = null;
        if (!m.conn && this.state && this.status === 'playing') {
          playerLeft(this.state, m.id, this.clock());
          this.afterChange();
        }
      }, this.cfg.reconnectGraceSeconds * 1000);
    }
    this.broadcastRoom();
  }

  addBots(byUser: string, count: number): string | null {
    if (!this.cfg.allowBots) return '봇이 허용되지 않은 서버입니다.';
    if (byUser !== this.hostId) return '방장만 할 수 있습니다.';
    if (this.status !== 'lobby') return '대기 중인 방에서만 가능합니다.';
    const n = Math.min(count, MAX_PLAYERS - this.members.filter((m) => !m.spectator).length);
    for (let i = 0; i < n; i++) {
      const bid = `bot-${this.id}-${++this.botSeq}`;
      this.members.push({ id: bid, nickname: `봇${this.botSeq}`, bot: true, authId: null, conn: null, lastSeq: 0, graceTimer: null });
    }
    this.broadcastRoom();
    return null;
  }

  removeBots(byUser: string): string | null {
    if (byUser !== this.hostId) return '방장만 할 수 있습니다.';
    if (this.status !== 'lobby') return '대기 중인 방에서만 가능합니다.';
    this.members = this.members.filter((m) => !m.bot);
    this.broadcastRoom();
    return null;
  }

  start(byUser: string, now: number, aiOnly = false): string | null {
    if (byUser !== this.hostId) return '방장만 시작할 수 있습니다.';
    if (this.status !== 'lobby') return '이미 시작되었습니다.';
    if (aiOnly) {
      if (!this.cfg.allowBots) return '봇이 허용되지 않은 서버입니다.';
      for (const m of this.members) if (!m.bot) m.spectator = true;
      const bots = this.members.filter((m) => m.bot).length;
      if (bots < MAX_PLAYERS) this.addBots(byUser, MAX_PLAYERS - bots);
    }
    const players = this.members.filter((m) => !m.spectator);
    if (players.length < MIN_PLAYERS) return `${MIN_PLAYERS}명 이상이어야 시작할 수 있습니다.`;
    const { state } = createGame({
      mode: this.mode,
      players: players.map((m) => ({ id: m.id, nickname: m.nickname })),
      seed: randomBytes(4).readInt32LE(0),
      now,
      turnSeconds: this.turnSeconds,
    });
    this.state = state;
    this.status = 'playing';
    this.broadcastRoom();
    this.syncGame();
    return null;
  }

  act(userId: string, action: Action, now: number): { ok: boolean; error?: string } {
    if (!this.state || this.status !== 'playing') return { ok: false, error: '진행 중인 게임이 없습니다.' };
    if (this.member(userId)?.spectator) return { ok: false, error: '관전 중에는 행동할 수 없습니다.' };
    const r = applyAction(this.state, userId, action, now);
    this.afterChange();
    return r.ok ? { ok: true } : { ok: false, error: r.error ?? '실패' };
  }

  /** 서버 틱: 시간 진행 + 봇 행동 */
  tick(now: number): void {
    if (!this.state || this.status !== 'playing') return;
    const before = this.state.seq;
    advance(this.state, now);
    for (const m of this.members) {
      if (!m.bot) continue;
      const bot = this.cfg.botKind === 'random' ? randomBotAction : smartBotAction;
      const a = bot(this.state, m.id, this.botRng, { activity: this.cfg.botActivity });
      if (a) applyAction(this.state, m.id, a, now);
    }
    if (this.state.seq !== before) this.afterChange();
  }

  private afterChange(): void {
    if (this.state && this.state.phase === 'ended' && this.status === 'playing') {
      this.status = 'ended';
      this.endedAt = this.clock();
      for (const m of this.members) if (m.graceTimer) clearTimeout(m.graceTimer);
      this.broadcastRoom();
      this.onEnd(this);
    }
    this.syncGame();
  }

  /** 각 플레이어에게 자기 시점의 뷰와 새 이벤트를 보낸다 */
  syncGame(only?: Member[]): void {
    const st = this.state;
    if (!st) return;
    for (const m of only ?? this.members) {
      if (m.bot || !m.conn) continue;
      if (m.spectator) {
        m.conn.send({ type: 'game', view: spectatorView(st), events: st.log.filter((e) => e.seq > m.lastSeq), serverTime: this.clock() });
      } else {
        m.conn.send({ type: 'game', view: viewFor(st, m.id), events: eventsFor(st, m.id, m.lastSeq), serverTime: this.clock() });
      }
      m.lastSeq = st.seq;
    }
  }

  broadcastRoom(): void {
    const detail = this.detail();
    for (const m of this.members) m.conn?.send({ type: 'room', room: detail });
  }

  authIds(): Record<string, string | null> {
    return Object.fromEntries(this.members.map((m) => [m.id, m.authId]));
  }

  dispose(): void {
    for (const m of this.members) if (m.graceTimer) clearTimeout(m.graceTimer);
  }
}

export class RoomManager {
  readonly rooms = new Map<string, Room>();

  constructor(
    private readonly cfg: ServerConfig,
    private readonly onEnd: (room: Room) => void = () => {},
    private readonly clock: () => number = Date.now,
  ) {}

  create(name: string, mode: ModeId, hostId: string, turnSeconds: number): Room {
    const room = new Room(this.cfg, name, mode, hostId, turnSeconds, this.onEnd, this.clock);
    this.rooms.set(room.id, room);
    return room;
  }

  roomOf(userId: string): Room | undefined {
    for (const r of this.rooms.values()) if (r.member(userId)) return r;
    return undefined;
  }

  list(): RoomSummary[] {
    return [...this.rooms.values()].filter((r) => r.status !== 'ended').map((r) => r.summary());
  }

  tick(now: number): void {
    for (const r of this.rooms.values()) {
      r.tick(now);
      const idle = r.humans().length === 0 || r.humans().every((m) => !m.conn);
      const stale = r.status === 'ended' && now - r.endedAt > 10 * 60_000;
      if ((r.status === 'lobby' && r.humans().length === 0) || stale || (r.status === 'ended' && idle)) {
        r.dispose();
        this.rooms.delete(r.id);
      }
    }
  }
}
