import type { CharKey, PlayerId } from './types.js';
import type { PlayerView } from './engine/view.js';
import type { AssignmentBelief } from './bot-belief.js';
import { claimCheckSucceeds } from './bot-claims.js';
import { estimatedHits, NAME_ATTACKS, roleThreat, type BattleMemory } from './bot-tactics.js';

const GUARDS: Record<string, Record<string, string[]>> = {
  civil_war: { kai: ['arin'], dantes: ['kelhu'] },
  lidellut: { kai: ['arin'] },
  troll: { chis: ['satoshi', 'zwinra'] },
};

/** 확인 직후 자신의 준비된 이름 공격을 활용할 수 있는 역할의 가치. 숨은 상대 자원은 가정하지 않는다. */
export function confirmedAttackValue(view: PlayerView, battle: BattleMemory, character: CharKey, remainingMana: number): number {
  const role = view.roster.find((r) => r.key === character);
  if (!role || role.side === view.me.side) return 0;
  if (GUARDS[view.mode]?.[character]?.some((guard) => view.roster.some((r) => r.key === guard && r.inGame) &&
    !view.players.some((p) => p.revealed === guard && !p.alive))) return 0;
  const attack = view.me.skills.some((s) => NAME_ATTACKS.includes(s.key) && !s.passive && s.blocked === null &&
    s.cooldownRemainingMs === 0 && s.usesLeft !== 0 && s.mana <= remainingMana && s.nameOptions?.includes(character));
  if (!attack) return 0;
  // 추가 목숨·공개 방어 횟수로 공격 효과를 낮추고 관찰된 공격 쿨다운으로 위협을 조정한다.
  return (1 + Number(role.commander) + Math.min(4, roleThreat(view, battle, character)) / 4) /
    Math.max(1, estimatedHits(view, battle, character));
}

/** 확인 결과별 후보가 실제로 하나가 되는 경우의 후속 공격 가치만 적분한다.
 * 높은 공표 확률을 확정 정체로 바꾸지 않으며 지휘관/변장의 묶인 결과를 유지한다.
 */
export function confirmationCombatValue(view: PlayerView, belief: AssignmentBelief, battle: BattleMemory,
  player: PlayerId, skill: string, mana: number, name?: CharKey): number {
  if (!belief.consistent) return 0;
  const target = view.players.find((p) => p.id === player);
  if (!target?.alive || target.statuses.some((s) => s.kind === 'invulnerable')) return 0;
  const outcomes = new Map<string, { mass: number; roles: Set<CharKey> }>();
  for (const [character, mass] of belief.probabilities.get(player) ?? []) {
    if (mass <= 0) continue;
    const role = view.roster.find((r) => r.key === character)!;
    const outcome = skill === 'truth_gem' ? role.commander ? '#commander' : character :
      claimCheckSucceeds(view, skill, character, target.published, name) ? '#success' : '#failure';
    const group = outcomes.get(outcome) ?? { mass: 0, roles: new Set<CharKey>() };
    group.mass += mass; group.roles.add(character); outcomes.set(outcome, group);
  }
  if (outcomes.size < 2) return 0;
  let value = 0;
  for (const group of outcomes.values()) if (group.roles.size === 1) {
    value += group.mass * confirmedAttackValue(view, battle, [...group.roles][0]!, view.me.mana - mana);
  }
  return value;
}
