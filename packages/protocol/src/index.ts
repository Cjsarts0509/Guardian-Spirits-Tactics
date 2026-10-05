// 클라이언트 ↔ 게임 서버 메시지 (JSON over WebSocket)
import { z } from 'zod';
import type { GameEvent, PlayerView } from '@gst/rules';

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
    mode: z.literal('civil_war'),
    turnSeconds: z.union([z.literal(60), z.literal(90), z.literal(120)]).default(90),
  }),
  z.object({ type: z.literal('room.join'), roomId: z.string().max(32) }),
  z.object({ type: z.literal('room.leave') }),
  z.object({ type: z.literal('room.addBots'), count: z.number().int().min(1).max(11) }),
  z.object({ type: z.literal('room.removeBots') }),
  z.object({ type: z.literal('room.start') }),
  z.object({ type: z.literal('game.action'), action: actionSchema, ref: z.number().int().optional() }),
  z.object({ type: z.literal('ping'), t: z.number() }),
]);

export type ClientMessage = z.infer<typeof clientMessage>;
export type ClientAction = z.infer<typeof actionSchema>;

// ───────────── Server → Client ─────────────

export interface RoomSummary {
  id: string;
  name: string;
  mode: 'civil_war';
  modeName: string;
  players: number;
  maxPlayers: number;
  status: 'lobby' | 'playing' | 'ended';
}

export interface RoomMember {
  id: string;
  nickname: string;
  bot: boolean;
  connected: boolean;
}

export interface RoomDetail extends RoomSummary {
  hostId: string;
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
  | { type: 'game'; view: PlayerView; events: GameEvent[]; serverTime: number }
  | { type: 'action.result'; ok: boolean; error?: string; ref?: number }
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
