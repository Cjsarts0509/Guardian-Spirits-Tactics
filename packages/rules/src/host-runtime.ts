import { advance, applyAction, playerLeft } from './engine/actions.js';
import { randomBotAction, smartBotAction } from './bot.js';
import type { BotMemory } from './bot-memory.js';
import type { Action, GameState } from './types.js';

export interface HostSeat { id: string; bot: boolean; spectator?: boolean; automate: boolean }
export type HostInput = { id: number; player: string; ref?: number } & (
  { kind: 'action'; action: Action } | { kind: 'quit' }
);
export interface HostActionRecord { t: number; player: string; action: Action; ok: boolean; error?: string }
export interface HostSnapshot {
  version: 1;
  state: GameState;
  memories: Map<string, BotMemory>;
  handled: number;
  records: HostActionRecord[];
  results: { id: number; player: string; ref?: number; ok: boolean; error?: string }[];
}
export interface HostWireSnapshot extends Omit<HostSnapshot, 'memories'> { memories: string }
const revive = (_key: string, value: any): any => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    if (Object.keys(value).length === 1 && Array.isArray(value.$gstMap)) return new Map(value.$gstMap);
    if (Object.keys(value).length === 1 && Array.isArray(value.$gstSet)) return new Set(value.$gstSet);
  }
  return value;
};
const memoryText = (memories: Map<string, BotMemory>) => JSON.stringify(memories, (key, value) => key === 'beliefCache'
  ? undefined : value instanceof Map ? { $gstMap: [...value] } : value instanceof Set ? { $gstSet: [...value] } : value);

/** Map/Set도 손실 없이 보존한다. 믿음 표본 모델은 WeakMap 파생 캐시여서 복원 때 다시 만든다. */
export function encodeHostSnapshot(snapshot: HostSnapshot): string {
  return JSON.stringify({ ...snapshot, memories: memoryText(snapshot.memories) });
}
export function decodeHostSnapshot(text: string): HostSnapshot {
  const raw = JSON.parse(text);
  const snapshot = (typeof raw.memories === 'string'
    ? { ...raw, memories: JSON.parse(raw.memories, revive) } : JSON.parse(text, revive)) as HostSnapshot;
  if (snapshot.version !== 1 || !(snapshot.memories instanceof Map) || !snapshot.state || !Array.isArray(snapshot.records)
    || !Array.isArray(snapshot.results) || !Number.isSafeInteger(snapshot.handled) || snapshot.handled < 0)
    throw Error('잘못된 호스트 체크포인트');
  for (const memory of snapshot.memories.values()) delete memory.beliefCache;
  return snapshot;
}

/** 확정된 이력은 재전송하지 않는다. 기준 위치는 서버가 ACK한 길이다. */
export function encodeHostDelta(snapshot: HostSnapshot, logBase: number, recordBase: number): string {
  return JSON.stringify({ ...snapshot, memories: memoryText(snapshot.memories), delta: 1, logBase, recordBase,
    state: { ...snapshot.state, log: snapshot.state.log.slice(logBase) }, records: snapshot.records.slice(recordBase) });
}

/** 서버는 AI 기억을 복원하지 않고 다음 호스트가 사용할 JSON으로 보관한다. */
export function readHostWire(text: string, prior?: { state: GameState; records: HostActionRecord[] }): { snapshot: HostWireSnapshot; validationState: GameState } {
  const raw = JSON.parse(text);
  if (raw.version !== 1 || typeof raw.memories !== 'string' || !Array.isArray(JSON.parse(raw.memories).$gstMap)
    || !Array.isArray(raw.records) || !Array.isArray(raw.results) || !Number.isSafeInteger(raw.handled) || raw.handled < 0)
    throw Error('잘못된 호스트 와이어');
  const validationState = raw.state as GameState;
  if (raw.delta !== undefined) {
    if (raw.delta !== 1 || !prior || raw.logBase !== prior.state.log.length || raw.recordBase !== prior.records.length
      || !Array.isArray(raw.state?.log)) throw Error('확정 기록 기준 불일치');
    return { validationState, snapshot: { version: 1, state: { ...raw.state, log: prior.state.log.concat(raw.state.log) },
      records: prior.records.concat(raw.records), memories: raw.memories, handled: raw.handled, results: raw.results } };
  }
  return { validationState, snapshot: raw as HostWireSnapshot };
}

/** 입력은 서버가 번호를 매긴 순서로 처리한다. 번호는 이탈 후 재전송의 중복 적용을 막는다. */
export function applyHostInputs(snapshot: HostSnapshot, inputs: readonly HostInput[], now: number): void {
  for (const input of inputs) {
    if (input.id <= snapshot.handled) continue;
    if (input.id !== snapshot.handled + 1) throw Error('호스트 입력 순서 누락');
    if (input.kind === 'quit') playerLeft(snapshot.state, input.player, now);
    else {
      const result = applyAction(snapshot.state, input.player, input.action, now);
      snapshot.records.push({ t: now - snapshot.state.startedAt, player: input.player, action: input.action, ok: result.ok, error: result.error });
      snapshot.results.push({ id: input.id, player: input.player, ref: input.ref, ok: result.ok, error: result.error });
    }
    snapshot.handled = input.id;
  }
}

export function tickHost(snapshot: HostSnapshot, members: readonly HostSeat[], now: number,
  options: { activity: number; botKind: 'smart' | 'random' }): void {
  if (snapshot.state.phase === 'ended') return;
  advance(snapshot.state, now);
  for (const member of members) {
    if (!member.automate || member.spectator) continue;
    const memory = snapshot.memories.get(member.id);
    if (!memory) continue;
    const action = (options.botKind === 'random' ? randomBotAction : smartBotAction)(snapshot.state, member.id, memory, { activity: options.activity });
    if (action) {
      const result = applyAction(snapshot.state, member.id, action, now);
      snapshot.records.push({ t: now - snapshot.state.startedAt, player: member.id, action, ok: result.ok, error: result.error });
    }
  }
}
