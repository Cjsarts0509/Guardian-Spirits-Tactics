import type { PlayerView } from './engine/view.js';
import type { AssignmentBelief } from './bot-belief.js';
import { confirmationCombatValue } from './bot-confirmation-combat.js';
import type { BattleMemory } from './bot-tactics.js';
import { checkInformation } from './bot-belief.js';

/** 개발 비교: 현재 진명과 다음 턴 미리보기로만 부분 보석 완성 직전의 소비를 보류한다.
 * 미래 생존/동맹 유지/공표 유지는 보장하지 않는다. 매 결정에서 조건을 다시 확인한다.
 */
export function shouldPreservePartialGem(view: PlayerView): boolean {
  return view.phase==='running' && view.me.gem===2 && view.me.trueName &&
    view.nextTurnInMs>0 && view.nextTurnInMs<=43_000 &&
    view.me.mana+view.me.nextTurnManaPreview>=75 &&
    view.me.skills.some(s=>s.key==='truth_gem'&&!s.passive&&s.blocked===null);
}

/** 정보량과 적일 가능성으로 대상의 가치를 비교한다. 숨겨진 실제 상태는 입력하지 않는다. */
export function bestGemTarget(view: PlayerView, belief: AssignmentBelief, pool: readonly { id: string }[], battle?: BattleMemory): string | undefined {
  const enemyRoles = new Set(view.roster.filter((r) => r.side !== view.me.side).map((r) => r.key));
  return pool.map((p) => {
    const enemyMass = [...belief.probabilities.get(p.id) ?? []].reduce((sum, [role, mass]) => sum + (enemyRoles.has(role) ? mass : 0), 0);
    const information = checkInformation(view, belief, p.id, 'truth_gem');
    const combat = battle ? confirmationCombatValue(view, belief, battle, p.id, 'truth_gem', 0) : 0;
    return { id: p.id, score: information > 0 ? information * (1 + enemyMass) + combat : 0 };
  }).filter((p) => p.score > 0).sort((a, b) => b.score - a.score)[0]?.id;
}
