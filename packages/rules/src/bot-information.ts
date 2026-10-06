import type { PlayerView } from './engine/view.js';
import type { AssignmentBelief } from './bot-belief.js';
import { checkInformation } from './bot-belief.js';

/** 정보량과 적일 가능성으로 대상의 가치를 비교한다. 숨겨진 실제 상태는 입력하지 않는다. */
export function bestGemTarget(view: PlayerView, belief: AssignmentBelief, pool: readonly { id: string }[]): string | undefined {
  const enemyRoles = new Set(view.roster.filter((r) => r.side !== view.me.side).map((r) => r.key));
  return pool.map((p) => {
    const enemyMass = [...belief.probabilities.get(p.id) ?? []].reduce((sum, [role, mass]) => sum + (enemyRoles.has(role) ? mass : 0), 0);
    return { id: p.id, score: checkInformation(view, belief, p.id, 'truth_gem') * (1 + enemyMass) };
  }).filter((p) => p.score > 0).sort((a, b) => b.score - a.score)[0]?.id;
}
