import { observeBotActionResult } from './bot-retry.js';
import { advance, applyAction, playerLeft } from './engine/actions.js';
import { randomBotAction, smartBotAction } from './bot.js';
import type { BotMemory } from './bot-memory.js';
import type { Action, GameState } from './types.js';
import { diffHostMemory, applyHostMemoryPatch, isHostMemoryWire, checkHostMemoryJson, type HostMemoryWire } from './host-memory.js';

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
export interface HostWireSnapshot extends Omit<HostSnapshot, 'memories'> { memories: HostMemoryWire }
const revive = (_key: string, value: any): any => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    if (Object.keys(value).length === 1 && Array.isArray(value.$gstMap)) return new Map(value.$gstMap);
    if (Object.keys(value).length === 1 && Array.isArray(value.$gstSet)) return new Set(value.$gstSet);
  }
  return value;
};
const memoryText = (memories: Map<string, BotMemory>) => JSON.stringify(memories, (key, value) => key === 'beliefCache'
  ? undefined : value instanceof Map ? { $gstMap: [...value] } : value instanceof Set ? { $gstSet: [...value] } : value);
export const serializeHostMemories = (memories: Map<string, BotMemory>): HostMemoryWire => JSON.parse(memoryText(memories));

/** Map/Set도 손실 없이 보존한다. 믿음 표본 모델은 WeakMap 파생 캐시여서 복원 때 다시 만든다. */
export function encodeHostSnapshot(snapshot: HostSnapshot): string {
  return JSON.stringify({ ...snapshot, memories: serializeHostMemories(snapshot.memories) });
}
export function decodeHostSnapshot(text: string): HostSnapshot {
  const raw = JSON.parse(text);
  const snapshot = { ...raw, memories: JSON.parse(typeof raw.memories === 'string'
    ? raw.memories : JSON.stringify(raw.memories), revive) } as HostSnapshot;
  if (snapshot.version !== 1 || !(snapshot.memories instanceof Map) || !snapshot.state || !Array.isArray(snapshot.records)
    || !Array.isArray(snapshot.results) || !Number.isSafeInteger(snapshot.handled) || snapshot.handled < 0)
    throw Error('잘못된 호스트 체크포인트');
  for (const memory of snapshot.memories.values()) delete memory.beliefCache;
  return snapshot;
}

/** 확정된 이력은 재전송하지 않는다. 기준 위치는 서버가 ACK한 길이다. */
export function encodeHostDelta(snapshot: HostSnapshot, logBase: number, recordBase: number): string {
  return JSON.stringify({ ...snapshot, memories: serializeHostMemories(snapshot.memories), delta: 1, logBase, recordBase,
    state: { ...snapshot.state, log: snapshot.state.log.slice(logBase) }, records: snapshot.records.slice(recordBase) });
}

/** ACK된 기억만 기준으로 삼는다. 첫 관측 등 변경분이 더 크면 전체 기억을 보낸다. */
export function encodeHostFrame(snapshot: HostSnapshot, logBase: number, recordBase: number,
  priorMemories: HostMemoryWire, memoryBase: number): { checkpoint: string; memories: HostMemoryWire } {
  const memories=serializeHostMemories(snapshot.memories),patch=diffHostMemory(priorMemories,memories);
  const full=JSON.stringify(memories),delta=JSON.stringify(patch);
  const body={...snapshot,memories:undefined,delta:1,logBase,recordBase,
    state:{...snapshot.state,log:snapshot.state.log.slice(logBase)},records:snapshot.records.slice(recordBase)};
  return {memories,checkpoint:JSON.stringify(delta.length+64<full.length
    ? {...body,memoryBase,memoryDelta:patch} : {...body,memories})};
}

/** 서버는 AI 기억을 복원하지 않고 다음 호스트가 사용할 JSON으로 보관한다. */
export function readHostWire(text: string, prior?: { state: GameState; records: HostActionRecord[]; memories?: HostMemoryWire; frame?: number }): { snapshot: HostWireSnapshot; validationState: GameState } {
  const raw = JSON.parse(text);
  let memories: unknown;
  if(Object.hasOwn(raw,'memoryDelta')) {
    if(Object.hasOwn(raw,'memories') || !prior?.memories || !Number.isSafeInteger(raw.memoryBase) || raw.memoryBase!==prior.frame)
      throw Error('확정 기억 기준 불일치');
    memories=applyHostMemoryPatch(prior.memories,raw.memoryDelta);
  } else {
    memories=typeof raw.memories==='string'?JSON.parse(raw.memories):raw.memories;
    checkHostMemoryJson(memories);
  }
  if (raw.version !== 1 || !isHostMemoryWire(memories)
    || !Array.isArray(raw.records) || !Array.isArray(raw.results) || !Number.isSafeInteger(raw.handled) || raw.handled < 0)
    throw Error('잘못된 호스트 와이어');
  const validationState = raw.state as GameState;
  if (raw.delta !== undefined) {
    if (raw.delta !== 1 || !prior || raw.logBase !== prior.state.log.length || raw.recordBase !== prior.records.length
      || !Array.isArray(raw.state?.log)) throw Error('확정 기록 기준 불일치');
    return { validationState, snapshot: { version: 1, state: { ...raw.state, log: prior.state.log.concat(raw.state.log) },
      records: prior.records.concat(raw.records), memories, handled: raw.handled, results: raw.results } };
  }
  return { validationState, snapshot: {version:1,state:raw.state,records:raw.records,memories,handled:raw.handled,results:raw.results} };
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
      observeBotActionResult(memory, action, result, now - snapshot.state.startedAt);
      snapshot.records.push({ t: now - snapshot.state.startedAt, player: member.id, action, ok: result.ok, error: result.error });
    }
  }
}
