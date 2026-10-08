import type { CharKey, PlayerId } from './types.js';
import type { PlayerView } from './engine/view.js';
import type { BotMemory, Knowledge } from './bot-memory.js';
import { claimWeight, claimCheckSucceeds } from './bot-claims.js';
import { nextRandom } from './rng.js';

export interface AssignmentBelief {
  probabilities: Map<PlayerId, Map<CharKey, number>>;
  /** 확정 제약에 맞는 전체 배정이 존재하는가 */
  consistent: boolean;
}

interface SamplingModel {
  players: PlayerId[];
  roles: CharKey[];
  weights: number[][];
  suffix: Float64Array;
}
// 믿음 캐시와 함께 수명이 끝난다. 서버 상태나 실제 배정은 보관하지 않는다.
const samplingModels = new WeakMap<AssignmentBelief, SamplingModel>();
// 크기별 불변 조합 정보만 공유한다. 관찰·확률·실제 정체를 보관하지 않는다.
const subsetCounts = new Map<number, Uint8Array>();
function countsFor(n: number): Uint8Array {
  let counts = subsetCounts.get(n);
  if (!counts) {
    counts = new Uint8Array(1 << n);
    for (let mask = 1; mask < counts.length; mask++) counts[mask] = counts[mask >>> 1]! + (mask & 1);
    subsetCounts.set(n, counts);
  }
  return counts;
}

/** 최대 12명: 부분집합 DP로 전체 순열의 가중합을 정확 계산한다 (O(n² 2ⁿ)).
 * 파티클의 표본 누락 없이 역할 중복 금지를 반영한다. 진짜 배정은 입력하지 않는다.
 */
export function assignmentBelief(view: PlayerView, knowledge: Knowledge, memory: BotMemory, claimScale = 1): AssignmentBelief {
  return computeAssignmentBelief(view, knowledge, memory, false, claimScale);
}

function computeAssignmentBelief(view: PlayerView, knowledge: Knowledge, memory: BotMemory, retainSampling: boolean, claimScale = 1): AssignmentBelief {
  if (!Number.isFinite(claimScale) || claimScale < 0 || claimScale > 4) throw new RangeError('공표 가중치 배율은 0~4입니다.');
  const rows = view.players.filter((p) => p.id !== view.me.id);
  const roles = view.roster.filter((r) => r.inGame && r.key !== view.me.character).map((r) => r.key);
  const signature = JSON.stringify([claimScale, view.mode, view.me.id, view.me.character, Math.floor(view.elapsedMs / 60_000),
    rows.map((p) => [p.id, p.published, memory.perception?.automaticClaims.has(p.id), knowledge.candidates.get(p.id)])]);
  const cached = memory.beliefCache?.signature === signature ? memory.beliefCache.value : undefined;
  if (cached && (!retainSampling || samplingModels.has(cached))) return cached;
  const probabilities = new Map<PlayerId, Map<CharKey, number>>([[view.me.id, new Map([[view.me.character, 1]])]]);
  const n = rows.length;
  if (n !== roles.length || n > 12) return { probabilities, consistent: false };
  const weights = rows.map((p) => roles.map((c) => {
    if (!knowledge.candidates.get(p.id)?.includes(c)) return 0;
    const weight = claimWeight(view, c, memory.perception?.automaticClaims.has(p.id) ? null : p.published);
    return claimScale === 1 ? weight : weight ** claimScale;
  }));
  const size = 1 << n;
  const counts = countsFor(n);
  const allowed = weights.map((row) => row.reduce((mask, weight, j) => weight > 0 ? mask | (1 << j) : mask, 0));
  const suffix = new Float64Array(size);
  suffix[size - 1] = 1;
  for (let mask = size - 2; mask >= 0; mask--) {
    const i = counts[mask]!;
    for (let choices = allowed[i]! & ~mask; choices; choices &= choices - 1) {
      const bit = choices & -choices, j = 31 - Math.clz32(bit);
      suffix[mask]! += weights[i]![j]! * suffix[mask | bit]!;
    }
  }
  const total = suffix[0]!;
  if (cached) {
    if (total > 0) samplingModels.set(cached, { players: rows.map((p) => p.id), roles, weights, suffix });
    return cached;
  }
  if (total > 0) {
    const prefix = new Float64Array(size);
    prefix[0] = 1;
    const marginal = rows.map(() => new Float64Array(n));
    for (let mask = 0; mask < size - 1; mask++) {
      const i = counts[mask]!;
      if (!prefix[mask]) continue;
      for (let choices = allowed[i]! & ~mask; choices; choices &= choices - 1) {
        const bit = choices & -choices, j = 31 - Math.clz32(bit);
        const next = mask | bit;
        const mass = prefix[mask]! * weights[i]![j]!;
        prefix[next]! += mass;
        marginal[i]![j]! += mass * suffix[next]! / total;
      }
    }
    rows.forEach((p, i) => probabilities.set(p.id, new Map(roles.map((c, j) => [c, marginal[i]![j]!]))));
  }
  const value = { probabilities, consistent: total > 0 };
  if (retainSampling && total > 0) samplingModels.set(value, { players: rows.map((p) => p.id), roles, weights, suffix });
  memory.beliefCache = { signature, value };
  return value;
}

/** 전체 배정의 조건부 가중치를 차례로 표본화한다. 주변 확률을 독립으로 뽑지 않는다.
 * 반환 배정은 가설이며 확인 사실로 메모리에 넣어서는 안 된다. 탐색 전용 RNG를 요구한다.
 */
export function sampleAssignments(view: PlayerView, knowledge: Knowledge, memory: BotMemory,
  rng: { rng: number }, count = 32): Map<PlayerId, CharKey>[] {
  if (!Number.isSafeInteger(count) || count < 0 || count > 256) throw new RangeError('배정 표본 수는 0~256 정수여야 합니다.');
  if (rng === memory) throw new Error('배정 표본은 행동 RNG와 분리해야 합니다.');
  if (count === 0) return [];
  const belief = computeAssignmentBelief(view, knowledge, memory, true);
  const model = samplingModels.get(belief);
  if (!belief.consistent || !model) return [];
  const worlds: Map<PlayerId, CharKey>[] = [];
  for (let sample = 0; sample < count; sample++) {
    const world = new Map<PlayerId, CharKey>([[view.me.id, view.me.character]]);
    let mask = 0;
    for (let i = 0; i < model.players.length; i++) {
      const draw = nextRandom(rng) * model.suffix[mask]!;
      let cumulative = 0, selected = -1;
      for (let j = 0; j < model.roles.length; j++) if (!(mask & (1 << j))) {
        const mass = model.weights[i]![j]! * model.suffix[mask | (1 << j)]!;
        if (mass <= 0) continue;
        selected = j; // 부동소수점 끝점에서는 마지막 양수 분기를 선택한다.
        cumulative += mass;
        if (draw < cumulative) break;
      }
      if (selected < 0) throw new Error('일관된 배정의 조건부 분기가 없습니다.');
      world.set(model.players[i]!, model.roles[selected]!);
      mask |= 1 << selected;
    }
    worlds.push(world);
  }
  return worlds;
}

export function probabilityOf(belief: AssignmentBelief, player: PlayerId, character: CharKey): number {
  return belief.probabilities.get(player)?.get(character) ?? 0;
}

/** 성공 관찰로 나뉘는 확률 질량. 0.5 근처일수록 이진 정보량이 크다.
 * 성공 때 여러 변장 후보가 남는 경우도 세계별 성공 조건에 포함한다.
 */
export function checkInformation(view: PlayerView, belief: AssignmentBelief, player: PlayerId, skill: string, name?: CharKey): number {
  // 보석은 지휘관 둘을 구별하지 않는다. 혼돈의 주술은 살아 있는 반란자만 정체를 준다.
  if (skill === 'truth_gem' || skill === 'chaos_hex') {
    const outcomes = new Map<string, number>();
    for (const [c, mass] of belief.probabilities.get(player) ?? []) {
      const role = view.roster.find((r) => r.key === c)!;
      const outcome = skill === 'truth_gem' ? role.commander ? '#commander' : c : role.side === 2 ? c : '#no-result';
      outcomes.set(outcome, (outcomes.get(outcome) ?? 0) + mass);
    }
    return [...outcomes.values()].reduce((h, mass) => h + (mass > 1e-12 && mass < 1 - 1e-12 ? -mass * Math.log2(mass) : 0), 0);
  }
  const target = view.players.find((p) => p.id === player)!;
  let success = 0;
  for (const [c, mass] of belief.probabilities.get(player) ?? []) {
    if (claimCheckSucceeds(view, skill, c, target.published, name)) success += mass;
  }
  return success > 1e-12 && success < 1 - 1e-12 ? -success * Math.log2(success) - (1 - success) * Math.log2(1 - success) : 0;
}

/** 평가 전용. 종료 정체를 의사결정 메모리에 넣지 않고 시점별로 외부에서 채점한다. */
export function beliefBrier(belief: AssignmentBelief, truths: ReadonlyMap<PlayerId, CharKey>, players: readonly PlayerId[]): number | null {
  if (!belief.consistent || !players.length) return null;
  let score = 0;
  for (const id of players) {
    const truth = truths.get(id);
    const probabilities = belief.probabilities.get(id);
    if (!truth || !probabilities?.has(truth)) return null;
    for (const [c, p] of probabilities) score += (p - Number(c === truth)) ** 2;
  }
  return score / players.length;
}
