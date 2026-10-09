import { z } from 'zod';

const num = z.number().finite();
const integer = num.int().nonnegative();
const text = z.string().max(4096);
const scalar = z.union([z.boolean(), num]);
const skill = z.object({ key: text, cooldownUntil: num, usesLeft: num.nullable(), level: num });
const effect = z.object({ id: integer, kind: z.enum(['incapacitated', 'invulnerable']), until: num, source: text, announced: z.boolean() });
const player = z.object({ id: text, nickname: text, seat: integer, slot: integer, character: text,
  side: z.union([z.literal(1), z.literal(2)]), alive: z.boolean(), diedAt: num.nullable(), left: z.boolean(), mana: num,
  published: text.nullable(), allies: z.array(text), gem: num.int().min(0).max(3), gemCooldownUntil: num,
  skills: z.array(skill), extraLives: num, effects: z.array(effect), flags: z.record(scalar) });
const visibility = z.discriminatedUnion('to', [z.object({ to: z.literal('all') }),
  z.object({ to: z.literal('dead') }), z.object({ to: z.literal('players'), ids: z.array(text) })]);
const fact = z.object({ player: text, character: text.nullable(), not: text.optional(), oneOf: z.array(text).optional(), commander: z.boolean().optional() });
const event = z.object({ seq: integer, at: num, kind: text, vis: visibility, text,
  data: z.record(z.unknown()).optional(), facts: z.array(fact).optional() });

/** 호스트가 보낸 JSON의 형태를 검사한다. 호스트의 규칙 준수/정직성을 증명하는 검사는 아니다. */
export const hostStateSchema = z.object({ version: z.literal(1), mode: z.enum(['civil_war', 'primordial', 'lidellut', 'troll']),
  seed: num.int(), rng: num.int(), startedAt: num, now: num, phase: z.enum(['running', 'ended']),
  winner: z.union([z.literal(1), z.literal(2)]).nullable(), endReason: text.nullable(), players: z.array(player).min(8).max(12),
  turn: integer, turnMs: num.positive(), nextTurnAt: num, queue: z.array(z.object({ id: integer, at: num,
    kind: z.enum(['turn', 'unlock', 'reveal', 'effectEnd', 'flagEnd', 'mode']), payload: z.record(z.unknown()) })),
  revealed: z.record(text), log: z.array(event), seq: integer, taskSeq: integer, effectSeq: integer,
  modeState: z.record(z.union([scalar, text])) });
