import type { Action } from './types.js';
import type { PlayerView } from './engine/view.js';
import type { Knowledge, BotMemory } from './bot-memory.js';

/** 자기 스킬 조건과 확인된 정체만 사용하는 성장·희생 후보. 공표는 정체 증거가 아니다. */
export function growthCandidates(view: PlayerView, knowledge: Knowledge, memory: BotMemory): Action[] {
  const ready = new Set(view.me.skills.filter((s) => !s.passive && s.blocked === null &&
    s.cooldownRemainingMs === 0 && s.usesLeft !== 0 && s.mana <= view.me.mana).map((s) => s.key));
  const has = (key: string) => view.me.skills.some((s) => s.key === key);
  const result: Action[] = [];
  const add = (skill: string, target?: string) => {
    if (ready.has(skill)) result.push(target ? { type: 'skill', skill, target } : { type: 'skill', skill });
  };
  if (['consume_resistance', 'consume_iron_skin', 'advanced_attack'].every(has)) add('consume_final_evolution');
  if (view.elapsedMs > 180_000) add('sasint_battle_mastery');
  add('berserk_seirow');
  if (view.me.skills.some((s) => !s.passive && s.cooldownRemainingMs > 20_000 &&
    ['attack', 'advanced_attack', 'battle_sense'].includes(s.key))) add('berserk_kazrow');
  add('ancient_sorcery');
  const known = new Map(knowledge.known); known.set(view.me.id, view.me.character);
  const roles = new Map(view.roster.map((r) => [r.key, r]));
  const living = view.players.filter((p) => p.alive && known.has(p.id) && !p.statuses.some((s) => s.kind === 'invulnerable'));
  const enemies = living.filter((p) => roles.get(known.get(p.id)!)?.side !== view.me.side)
    .sort((a, b) => Number(roles.get(known.get(b.id)!)?.commander) - Number(roles.get(known.get(a.id)!)?.commander) || a.seat - b.seat);
  for (const p of enemies.slice(0, 2)) {
    add('greater_mass_teleport', p.id); add('mass_teleport', p.id);
    // 희생 돌격은 승리 목표인 확인된 지휘관에 한정한다. 보호 여부는 가설 엔진에서 평가한다.
    if (roles.get(known.get(p.id)!)?.commander) add('reckless_charge', p.id);
  }
  const deka = living.find((p) => known.get(p.id) === 'deka');
  if (deka && memory.perception?.madnessPurged) add('destroyer_guidance', deka.id);
  const kai = enemies.find((p) => known.get(p.id) === 'kai');
  if (kai) for (const p of living.filter((p) => p.id !== view.me.id && roles.get(known.get(p.id)!)?.side === view.me.side && roles.get(known.get(p.id)!)?.commander)) add('soul_wall', p.id);
  return result;
}
