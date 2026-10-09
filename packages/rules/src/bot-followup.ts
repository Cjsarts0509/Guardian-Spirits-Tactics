import type { Action, CharKey, GameEvent, GameState } from './types.js';
import type { PlayerView, SkillView } from './engine/view.js';
import { updateBotKnowledge, type BotMemory, type Knowledge } from './bot-memory.js';
import { assignmentBelief } from './bot-belief.js';
import { neutralizedSkill, roleThreat } from './bot-tactics.js';

export const ROLE_INFORMATION = new Set(['rael_leadership', 'eltas_leadership', 'libido_priestess', 'curse', 'chivalry']);
const EXECUTES = ['dantes_command', 'soul_reaver', 'rael_master_power', 'kilder_master_power', 'consume_slaughter', 'backstab', 'eoril_phoenix_flame', 'kane_wolfs_slash'];
const CONTROL = ['drakan_black_spell', 'confusion', 'nightmare', 'eoril_flame_shackle'];
const SUPPORT = ['drakan_enchant_muscle', 'angel_baptism', 'nukelius_chakra_magic', 'sasint_support', 'support', 'rune_protection', 'soul_recovery'];
const KNIGHTS = ['yui', 'loneris', 'supra'];
const usable = (view: PlayerView, s: SkillView) => !s.passive && s.blocked === null && s.cooldownRemainingMs === 0 &&
  s.usesLeft !== 0 && s.mana <= view.me.mana;

/** 인물별 후속 후보도 자기 관찰로만 고른다. 상대의 숨은 마나/flags를 받지 않는다.
 * 즉사/해제는 먼저, 제어/지원/정보는 이름 공격이 없을 때 사용한다.
 */
export function roleFollowup(view: PlayerView, knowledge: Knowledge, memory: BotMemory, priorityOnly = false): Action | undefined {
  if (!view.me.alive || view.phase !== 'running' || !memory.perception) return undefined;
  const skills = new Map(view.me.skills.filter((s) => usable(view, s)).map((s) => [s.key, s]));
  const roles = new Map(view.roster.map((r) => [r.key, r]));
  const known = new Map(knowledge.known); known.set(view.me.id, view.me.character);
  // 엔진의 모든 대상 지정 스킬은 자기 자신을 대상으로 삼을 수 없다.
  const living = view.players.filter((p) => p.alive && p.id !== view.me.id && known.has(p.id));
  const order = (a: typeof living[number], b: typeof living[number]) =>
    Number(roles.get(known.get(b.id)!)!.commander) - Number(roles.get(known.get(a.id)!)!.commander) ||
    roleThreat(view, memory.perception!.battle, known.get(b.id)!) - roleThreat(view, memory.perception!.battle, known.get(a.id)!) || a.seat - b.seat;
  const enemies = living.filter((p) => roles.get(known.get(p.id)!)!.side !== view.me.side).sort(order);
  const friends = living.filter((p) => roles.get(known.get(p.id)!)!.side === view.me.side).sort(order);
  const allowed = (s: SkillView, p: typeof living[number]) => s.ignoresInvulnerable || !p.statuses.some((e) => e.kind === 'invulnerable');
  const act = (s: SkillView, id?: string, name?: CharKey): Action => {
    const a: Action = { type: 'skill', skill: s.key };
    if (id !== undefined) a.target = id;
    if (name !== undefined) a.name = name;
    return a;
  };
  const dispel = skills.get('tachin_neutralize');
  const trapped = dispel && friends.find((p) => p.statuses.some((e) => e.kind === 'incapacitated'));
  if (dispel && trapped) return act(dispel, trapped.id);
  for (const key of EXECUTES) {
    const s = skills.get(key); if (!s) continue;
    const p = enemies.find((p) => allowed(s, p) &&
      (key !== 'dantes_command' || known.get(p.id) === 'kai') &&
      (key !== 'eoril_phoenix_flame' || known.get(p.id) === 'consume') &&
      (key !== 'backstab' || view.me.alliedBy.includes(p.id)) &&
      !neutralizedSkill(view, memory.perception!.battle, key, known.get(p.id)!));
    if (p) return act(s, p.id);
  }
  if (priorityOnly) return undefined;
  for (const key of CONTROL) {
    const s = skills.get(key), p = s && enemies.find((p) => allowed(s, p) && !p.statuses.some((e) => e.kind === 'incapacitated'));
    if (s && p) return act(s, p.id);
  }
  for (const key of SUPPORT) {
    const s = skills.get(key); if (!s) continue;
    const p = friends.find((p) => allowed(s, p) &&
      (key !== 'drakan_enchant_muscle' || known.get(p.id) === 'consume') &&
      (key !== 'angel_baptism' || (KNIGHTS.includes(known.get(p.id)!) && !memory.perception!.baptized.has(known.get(p.id)!))) &&
      (key !== 'rune_protection' || !p.statuses.some((e) => e.kind === 'invulnerable')));
    if (p) return act(s, p.id, s.nameOptions ? known.get(p.id)! : undefined);
  }
  for (const key of ['rael_leadership', 'eltas_leadership']) {
    const s = skills.get(key), name = s?.nameOptions?.find((n) => n !== view.me.character && ![...known.values()].includes(n));
    if (s && name) return act(s, undefined, name);
  }
  const libido = skills.get('libido_priestess');
  if (libido && view.roster.some((r) => r.key === 'freya' && r.inGame) && ![...known.values()].includes('freya')) return act(libido);
  const chivalry = skills.get('chivalry');
  const knight = chivalry && friends.find((p) => KNIGHTS.includes(known.get(p.id)!) && allowed(chivalry, p) &&
    (view.me.trueName || p.published === known.get(p.id)));
  if (chivalry && knight) return act(chivalry, knight.id);
  const curse = skills.get('curse');
  const unknown = curse && view.players.find((p) => p.alive && p.id !== view.me.id && !knowledge.known.has(p.id) &&
    !memory.perception!.commanders.has(p.id) && allowed(curse, p));
  if (curse && unknown) return act(curse, unknown.id);
  return undefined;
}

function entropy(view: PlayerView, events: readonly GameEvent[], memory: BotMemory): number {
  const clone = structuredClone(memory), knowledge = updateBotKnowledge(view, events, clone);
  const belief = assignmentBelief(view, knowledge, clone);
  if (!belief.consistent) return 0;
  let result = 0;
  for (const values of belief.probabilities.values()) for (const p of values.values()) if (p > 0) result -= p * Math.log2(p);
  return result;
}

/** 실제로 본인에게 전달된 결과의 후보 감소를 평가한다. 실패/지휘관 묶음은 그대로 유지한다. */
export function roleInformationGain(before: PlayerView, first: readonly GameEvent[], after: PlayerView, last: readonly GameEvent[], memory: BotMemory): number {
  if (after.phase !== 'running' || !after.me.alive) return 0;
  return Math.max(0, entropy(before, first, memory) - entropy(after, last, memory));
}

/** 확장 옵션 전용 보조 가치. 기본 공격/확인 점수는 변경하지 않는다. */
export function rolePositionValue(initial: GameState, state: GameState, self: string): number {
  if (state.phase !== 'running') return 0;
  const side = state.players.find((p) => p.id === self)!.side;
  let value = 0;
  for (const p of state.players) {
    const before = initial.players.find((q) => q.id === p.id)!;
    if (!p.alive || !before.alive) continue;
    const allied = p.side === side;
    if (allied && p.id !== self) value += (p.mana - before.mana) / 100;
    const effect = (q: typeof p, kind: string) => Math.min(10_000, Math.max(0, ...q.effects.filter((e) => e.kind === kind).map((e) => e.until - state.now))) / 10_000;
    value += (allied ? -1 : 1) * (effect(p, 'incapacitated') - effect(before, 'incapacitated'));
    value += (allied ? 1 : -1) * (effect(p, 'invulnerable') - effect(before, 'invulnerable'));
    if (allied && Number(p.flags.soulRecoveryUntil ?? 0) > state.now && Number(before.flags.soulRecoveryUntil ?? 0) <= state.now) value += .5;
  }
  return value;
}
