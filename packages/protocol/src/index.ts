// 클라이언트 ↔ 게임 서버 메시지 (JSON over WebSocket)
import { z } from 'zod';
import type { GameEvent, ModeId, PlayerView, SpectatorView, Action } from '@gst/rules';

export const MODE_IDS = ['civil_war', 'primordial', 'lidellut', 'troll'] as const;

export const PROTOCOL_VERSION = 1;

// ───────────── Client → Server ─────────────

const actionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('skill'),
    skill: z.string().min(1).max(64),
    target: z.string().max(64).optional(),
    name: z.string().max(64).optional(),
  }),
  z.object({
    type: z.literal('chat'),
    channel: z.enum(['all', 'ally', 'whisper', 'global', 'dead']),
    text: z.string().min(1).max(200),
    to: z.string().max(64).optional(),
  }),
]);

export const clientMessage = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('hello'),
    protocol: z.literal(PROTOCOL_VERSION),
    hostCapable: z.boolean().optional(),
    /** Supabase access token (로그인 사용자) */
    token: z.string().max(4096).optional(),
    /** 게스트 닉네임 (서버가 게스트 허용일 때) */
    nickname: z.string().min(1).max(16).optional(),
    /** 재접속용 세션 토큰 */
    resume: z.string().max(128).optional(),
  }),
  z.object({ type: z.literal('room.list') }),
  z.object({
    type: z.literal('room.create'),
    name: z.string().min(1).max(30),
    mode: z.enum(MODE_IDS),
    hosting: z.enum(['server', 'player']).default('server'),
    turnSeconds: z.union([z.literal(60), z.literal(90), z.literal(120)]).default(90),
  }),
  z.object({ type: z.literal('room.join'), roomId: z.string().max(32) }),
  /** away: 자리를 비움 (봇이 대신, 재입장 가능). quit: 완전히 나감 (진행 중이면 사망 처리) */
  z.object({ type: z.literal('room.leave'), mode: z.enum(['away', 'quit']).optional() }),
  z.object({ type: z.literal('room.addBots'), count: z.number().int().min(1).max(11) }),
  z.object({ type: z.literal('room.removeBots') }),
  /** aiOnly: 사람은 모두 관전, 봇만으로 판을 돌린다 (테스트용) */
  z.object({ type: z.literal('room.start'), aiOnly: z.boolean().optional() }),
  z.object({ type: z.literal('game.action'), action: actionSchema, ref: z.number().int().optional() }),
  z.object({ type: z.literal('host.frame'), epoch: z.number().int().positive(), frame: z.number().int().positive(), checkpoint: z.string().min(1).max(8 * 1024 * 1024) }),
  z.object({ type: z.literal('host.release'), epoch: z.number().int().positive() }),
  z.object({ type: z.literal('ping'), t: z.number() }),
]);

export type ClientMessage = z.infer<typeof clientMessage>;
export type ClientAction = z.infer<typeof actionSchema>;

// ───────────── Server → Client ─────────────

export interface RoomSummary {
  id: string;
  name: string;
  mode: ModeId;
  modeName: string;
  players: number;
  maxPlayers: number;
  status: 'lobby' | 'playing' | 'ended';
  /** 요청한 사람이 이 방의 자리를 비운 상태 (재입장 가능) */
  rejoinable?: boolean;
}

export interface RoomMember {
  id: string;
  nickname: string;
  bot: boolean;
  connected: boolean;
  /** 자리 비움 (봇이 대신 플레이 중) */
  away?: boolean;
  /** 봇만 돌리는 판의 관전자 */
  spectator?: boolean;
}

export interface RoomDetail extends RoomSummary {
  hostId: string;
  hosting?: 'server' | 'player';
  hostEpoch?: number;
  hostPaused?: boolean;
  turnSeconds: number;
  members: RoomMember[];
  minPlayers: number;
  botsAllowed: boolean;
}

export type ServerMessage =
  | { type: 'welcome'; userId: string; nickname: string; session: string; guest: boolean }
  | { type: 'error'; message: string; ref?: number }
  | { type: 'rooms'; rooms: RoomSummary[] }
  | { type: 'room'; room: RoomDetail | null }
  | { type: 'game'; view: PlayerView | SpectatorView; events: GameEvent[]; serverTime: number }
  | { type: 'action.result'; ok: boolean; error?: string; ref?: number }
  | { type: 'host.grant'; epoch: number; frame: number; checkpoint: string; members: HostMember[]; commands: HostCommand[]; tickMs: number; activity: number; botKind: 'smart' | 'random'; timeScale: number }
  | { type: 'host.members'; epoch: number; members: HostMember[] }
  | { type: 'host.command'; epoch: number; command: HostCommand }
  | { type: 'host.ack'; epoch: number; frame: number }
  | { type: 'pong'; t: number; serverTime: number };

export function parseClientMessage(raw: string): ClientMessage | { error: string } {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { error: 'JSON 형식이 아닙니다.' };
  }
  const r = clientMessage.safeParse(data);
  if (!r.success) return { error: `잘못된 메시지: ${r.error.issues[0]?.message ?? 'invalid'}` };
  return r.data;
}

export interface HostMember { id: string; bot: boolean; spectator?: boolean; automate: boolean }
export type HostCommand = { id: number; player: string; ref?: number } & (
  { kind: 'action'; action: Action } | { kind: 'quit' }
);
