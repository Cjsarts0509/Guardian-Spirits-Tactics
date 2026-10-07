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

/** Map/Set도 손실 없이 보존한다. 믿음 표본 모델은 WeakMap 파생 캐시여서 복원 때 다시 만든다. */
export function encodeHostSnapshot(snapshot: HostSnapshot): string {
  return JSON.stringify(snapshot, (_key, value) => value instanceof Map
    ? { $gstMap: [...value] } : value instanceof Set ? { $gstSet: [...value] } : value);
}
export function decodeHostSnapshot(text: string): HostSnapshot {
  const snapshot = JSON.parse(text, (_key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (Object.keys(value).length === 1 && Array.isArray(value.$gstMap)) return new Map(value.$gstMap);
      if (Object.keys(value).length === 1 && Array.isArray(value.$gstSet)) return new Set(value.$gstSet);
    }
    return value;
  }) as HostSnapshot;
  if (snapshot.version !== 1 || !(snapshot.memories instanceof Map) || !snapshot.state || !Array.isArray(snapshot.records)
    || !Array.isArray(snapshot.results) || !Number.isSafeInteger(snapshot.handled) || snapshot.handled < 0)
    throw Error('잘못된 호스트 체크포인트');
  for (const memory of snapshot.memories.values()) delete memory.beliefCache;
  return snapshot;
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
