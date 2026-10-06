import type { Action, PlayerId } from './types.js';
import type { PlayerView, SkillView } from './engine/view.js';
import type { BotMemory, Knowledge } from './bot-memory.js';
import type { AssignmentBelief } from './bot-belief.js';
import { confirmationCombatValue } from './bot-confirmation-combat.js';
import type { BattleMemory } from './bot-tactics.js';
import { checkInformation } from './bot-belief.js';

/** 공표 가중치나 경과 시간은 확인 증거가 아니다. 공개/개인 확인과 배정 소거만 허용한다. */
export function hasIdentityEvidence(view: PlayerView, knowledge: Knowledge, memory: BotMemory, id: PlayerId): boolean {
  if (knowledge.known.has(id)) return true;
  const initial = view.roster.filter((r) => r.inGame && r.key !== view.me.character).length;
  const remaining = knowledge.candidates.get(id)?.length ?? initial;
  return remaining > 0 && (remaining < initial || !!memory.perception?.excluded.get(id)?.size ||
    !!memory.perception?.alternatives.get(id)?.size || !!memory.perception?.commanders.has(id));
}

const CHECKS = new Set(['advanced_ally_check', 'ally_check', 'advanced_enemy_check', 'enemy_check']);
const SCANS = new Set(['advanced_scan', 'scan', 'ally_scan', 'enemy_scan', 'troll_scan', 'troll_ally_scan', 'troll_enemy_scan']);

/** 한 단계의 확인 결과를 비교한다. 상대의 숨겨진 자원·쿨다운은 읽지 않는다. */
export function bestConfirmation(view: PlayerView, belief: AssignmentBelief, pool: readonly { id: PlayerId }[], skills: readonly SkillView[], battle?: BattleMemory): Action | undefined {
  if (!belief.consistent) return undefined;
  let best: { action: Action; score: number } | undefined;
  for (const skill of skills) {
    if (skill.passive || skill.blocked !== null || skill.cooldownRemainingMs > 0 || skill.mana > view.me.mana || skill.usesLeft === 0) continue;
    if (!CHECKS.has(skill.key) && !SCANS.has(skill.key)) continue;
    for (const p of pool) {
      const target = view.players.find((t) => t.id === p.id);
      if (!target?.alive || target.id === view.me.id || (!skill.ignoresInvulnerable && target.statuses.some((s) => s.kind === 'invulnerable'))) continue;
      const names = SCANS.has(skill.key) ? skill.nameOptions ?? [] : [undefined];
      for (const name of names) {
        const information = checkInformation(view, belief, p.id, skill.key, name);
        // 같은 정보라면 마나가 적게 들고 빨리 재사용할 수 있는 확인을 우선한다. 가중치는 실험값.
        const combat = battle ? confirmationCombatValue(view, belief, battle, p.id, skill.key, skill.mana, name) : 0;
        const score = (information + combat) / (1 + skill.mana / 50 + skill.cooldown / 60);
        if (score > 0 && (!best || score > best.score)) {
          const action: Action = { type: 'skill', skill: skill.key, target: p.id };
          if (name !== undefined) action.name = name;
          best = { action, score };
        }
      }
    }
  }
  return best?.action;
}
