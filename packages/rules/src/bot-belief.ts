import type { CharKey, PlayerId } from './types.js';
import type { PlayerView } from './engine/view.js';
import type { BotMemory, Knowledge } from './bot-memory.js';
import { claimWeight, claimCheckSucceeds } from './bot-claims.js';

export interface AssignmentBelief {
  probabilities: Map<PlayerId, Map<CharKey, number>>;
  /** 확정 제약에 맞는 전체 배정이 존재하는가 */
  consistent: boolean;
}

/** 최대 12명: 부분집합 DP로 전체 순열의 가중합을 정확 계산한다 (O(n² 2ⁿ)).
 * 파티클의 표본 누락 없이 역할 중복 금지를 반영한다. 진짜 배정은 입력하지 않는다.
 */
export function assignmentBelief(view: PlayerView, knowledge: Knowledge, memory: BotMemory): AssignmentBelief {
  const rows = view.players.filter((p) => p.id !== view.me.id);
  const roles = view.roster.filter((r) => r.inGame && r.key !== view.me.character).map((r) => r.key);
  const signature = JSON.stringify([view.mode, view.me.id, view.me.character, Math.floor(view.elapsedMs / 60_000),
    rows.map((p) => [p.id, p.published, memory.perception?.automaticClaims.has(p.id), knowledge.candidates.get(p.id)])]);
  if (memory.beliefCache?.signature === signature) return memory.beliefCache.value;
  const probabilities = new Map<PlayerId, Map<CharKey, number>>([[view.me.id, new Map([[view.me.character, 1]])]]);
  const n = rows.length;
  if (n !== roles.length || n > 12) return { probabilities, consistent: false };
  const weights = rows.map((p) => roles.map((c) => knowledge.candidates.get(p.id)?.includes(c)
    ? claimWeight(view, c, memory.perception?.automaticClaims.has(p.id) ? null : p.published) : 0));
  const size = 1 << n;
  const counts = new Uint8Array(size);
  for (let mask = 1; mask < size; mask++) counts[mask] = counts[mask >>> 1]! + (mask & 1);
  const suffix = new Float64Array(size);
  suffix[size - 1] = 1;
  for (let mask = size - 2; mask >= 0; mask--) {
    const i = counts[mask]!;
    for (let j = 0; j < n; j++) if (!(mask & (1 << j))) suffix[mask]! += weights[i]![j]! * suffix[mask | (1 << j)]!;
  }
  const total = suffix[0]!;
  if (total > 0) {
    const prefix = new Float64Array(size);
    prefix[0] = 1;
    const marginal = rows.map(() => new Float64Array(n));
    for (let mask = 0; mask < size - 1; mask++) {
      const i = counts[mask]!;
      if (!prefix[mask]) continue;
      for (let j = 0; j < n; j++) if (!(mask & (1 << j))) {
        const next = mask | (1 << j);
        const mass = prefix[mask]! * weights[i]![j]!;
        prefix[next]! += mass;
        marginal[i]![j]! += mass * suffix[next]! / total;
      }
    }
    rows.forEach((p, i) => probabilities.set(p.id, new Map(roles.map((c, j) => [c, marginal[i]![j]!]))));
  }
  const value = { probabilities, consistent: total > 0 };
  memory.beliefCache = { signature, value };
  return value;
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
