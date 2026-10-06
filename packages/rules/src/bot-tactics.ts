import { getMode } from './modes/index.js';
import { skillRegistry } from './skills/registry.js';
import type { CharKey, GameEvent, ModeId } from './types.js';
import type { PlayerView } from './engine/view.js';

export interface SkillTiming {
  /** 추가 비공개 사용·마나 부족은 알 수 없다. 범위는 관찰한 사용이 주는 제약이다. */
  readyEarliest: number;
  readyLatest: number;
  usedMin: number;
  usedMax: number;
}
export interface BattleMemory {
  timings: Map<string, SkillTiming>;
  ambiguous: { seq: number; at: number; options: { character: CharKey; skill: string }[] }[];
  passives: Map<string, boolean>;
  hitsRemaining: Map<CharKey, number>;
  grants: Map<CharKey, Set<string>>;
  removals: Map<CharKey, Set<string>>;
  guardCharges: Map<CharKey, number>;
}
export interface SkillPlan {
  kind: 'burn_curse';
  target: string;
  expires: number;
  awaitingBurn: boolean;
  startedAt: number;
}
export const NAME_ATTACKS = ['attack', 'advanced_attack', 'supreme_attack', 'soen_chain_murder'];
const OFFENSIVE = new Set([...NAME_ATTACKS, 'backstab', 'soul_reaver', 'valiant_charge', 'reckless_charge',
  'dantes_command', 'great_will', 'mass_teleport', 'greater_mass_teleport', 'heresy_judgment',
  'kane_wolfs_slash', 'rael_master_power', 'kilder_master_power', 'consume_slaughter', 'eoril_phoenix_flame',
  'confusion', 'nightmare', 'eoril_flame_shackle', 'drakan_black_spell', 'burning_magic', 'troll_venom']);
const EXTRA: Record<string, Record<string, string[]>> = {
  civil_war: { soen: ['soen_chain_murder'], kelhu: ['calmness'] },
  primordial: { rael: ['rael_eoril_test', 'rael_master_power'], consume: ['advanced_attack', 'consume_slaughter', 'consume_resistance', 'consume_iron_skin', 'consume_bodyguard'],
    sasint: ['advanced_attack'], kilder: ['kilder_master_power'], kumarin: ['kumarin_bodyguard'] },
  lidellut: { yui: ['scan', 'advanced_scan', 'mass_teleport', 'greater_mass_teleport'],
    loneris: ['enemy_check', 'advanced_attack', 'order_inquisition', 'heresy_judgment'], tuma: ['supreme_attack'] },
  troll: { seirow: ['advanced_attack', 'dark_skin'], deka: ['berserk_deka'],
    uldian: ['battle_sense'], ulpian: ['battle_sense'] },
};
export function createBattleMemory(): BattleMemory {
  return { timings: new Map(), ambiguous: [], passives: new Map(), hitsRemaining: new Map(), grants: new Map(), removals: new Map(), guardCharges: new Map() };
}
const timingKey = (c: string, s: string) => `${c}:${s}`;

/** 공개 캐릭터 정의와 조건부 획득 목록. 실제 서버의 상대 스킬 슬롯은 읽지 않는다. */
export function roleSkills(view: PlayerView, battle: BattleMemory, character: CharKey, potential = false): string[] {
  const def = getMode(view.mode as ModeId).characters.find((c) => c.key === character)!;
  return [...new Set([...def.skills,
    ...(def.unlocks ?? []).filter((u) => u.at * 1000 <= view.elapsedMs).map((u) => u.skill),
    ...(battle.grants.get(character) ?? []), ...(potential ? EXTRA[view.mode]?.[character] ?? [] : []),
  ])].filter((s) => !battle.removals.get(character)?.has(s));
}

function changeSkill(b: BattleMemory, c: string, s: string, present: boolean): void {
  const add = present ? b.grants : b.removals;
  const remove = present ? b.removals : b.grants;
  const keys = add.get(c) ?? new Set<string>();
  keys.add(s); add.set(c, keys); remove.get(c)?.delete(s);
}

/** 입력 이벤트는 기억 경계에서 수신자를 검증한다. 시전자 ID를 추측해서 채우지 않는다. */
export function observeBattle(view: PlayerView, event: GameEvent, battle: BattleMemory): void {
  // GameEvent.at과 view.elapsedMs는 모두 게임 시작 기준이며 서버 벽시계와 무관하다.
  const at = event.at;
  const mode = getMode(view.mode as ModeId);
  const defs = { ...skillRegistry, ...mode.skills };
  const owners = (skill: string) => view.roster.filter((r) => r.inGame && roleSkills(view, battle, r.key, true).includes(skill))
    .map((r) => ({ character: r.key, skill }));
  let options: { character: string; skill: string }[] = [];
  let delay = 0;
  if (event.kind === 'inspect') {
    options = Object.keys(defs).filter((s) => s.endsWith('_check') || s.includes('scan')).flatMap(owners);
  } else if (/^skill\.(rune_protection|soul_recovery)\.(self|target)$/.test(event.kind)) {
    options = owners(event.kind.split('.')[1]!);
  } else if (event.kind === 'status.incapacitated') {
    options = ['confusion', 'nightmare', 'eoril_flame_shackle'].flatMap(owners);
  } else if (event.kind === 'status.shadow_jail') options = owners('shadow_jail');
  else if (event.kind === 'skill.berserk') {
    options = [...owners('berserk_kazrow'), ...owners('berserk_seirow')];
    // 세이로우의 20초 지연과 카즈로우의 즉시 통보는 같은 문구다. 둘의 사용을 모두 확정하지 않는다.
    for (const [key, t] of battle.timings) if (key.startsWith('kazrow:')) t.readyEarliest = 0;
  } else if (event.kind === 'skill.berserk.self') {
    for (const [key, t] of battle.timings) if (key.startsWith(`${view.me.character}:`)) t.readyEarliest = t.readyLatest = 0;
  } else if (event.kind === 'skill.mass_teleport') options = [...owners('mass_teleport'), ...owners('greater_mass_teleport')];
  else if (event.kind.startsWith('attack.') && ['hit', 'kill', 'guarded', 'fail', 'fail.death'].includes(event.kind.slice(7)) && typeof event.data?.attacker === 'string') {
    const c = event.data.attacker;
    const attacks = event.text.includes('울프스 슬러쉬') ? ['kane_wolfs_slash'] : event.text.includes('연쇄살인') ? ['soen_chain_murder'] : NAME_ATTACKS;
    options = roleSkills(view, battle, c, true).filter((s) => attacks.includes(s)).map((skill) => ({ character: c, skill }));
  } else {
    const match = /^skill\.([a-z_]+)(?:\.fail|\.blocked)?$/.exec(event.kind);
    let key = match?.[1];
    if (key === 'ancient_hex') key = 'ancient_hex_hachi';
    if (key && defs[key] && !defs[key]!.passive && key !== 'religious_alliance') {
      options = owners(key);
      if (key === 'chaos_hex') delay = 60_000;
      if (key === 'kilder_casanova') delay = 8_000;
    }
  }
  if (options.length) {
    const exact = options.length === 1;
    if (!exact) {
      battle.ambiguous.push({ seq: event.seq, at, options });
      if (battle.ambiguous.length > 64) battle.ambiguous.shift();
    }
    for (const o of options) {
      const def = defs[o.skill];
      if (!def || def.passive) continue;
      const key = timingKey(o.character, o.skill);
      const old = battle.timings.get(key) ?? { readyEarliest: 0, readyLatest: 0, usedMin: 0, usedMax: 0 };
      const until = Math.max(0, at - delay) + def.cooldown * 1000;
      battle.timings.set(key, {
        readyEarliest: exact ? until : old.readyEarliest,
        readyLatest: Math.max(old.readyLatest, until),
        usedMin: old.usedMin + Number(exact), usedMax: old.usedMax + 1,
      });
      if (exact) changeSkill(battle, o.character, o.skill, true);
    }
  }
  const grantEvents: Record<string, [string, string][]> = {
    'skill.advice': [['kelhu', 'calmness']],
    'skill.hermilly_libido_protection': [['consume', 'consume_resistance']],
    'skill.drakan_enchant_muscle': [['consume', 'consume_iron_skin']],
    'skill.sasint_training': [['consume', 'advanced_attack']],
    'skill.sasint_battle_mastery': [['sasint', 'advanced_attack']],
    'skill.consume_final_evolution': [['consume', 'consume_slaughter']],
    'skill.kilder_absorb': [['kilder', 'kilder_master_power']],
    'skill.rael_eoril_test': [['rael', 'rael_master_power']],
  };
  for (const [c, s] of grantEvents[event.kind] ?? []) { changeSkill(battle, c, s, true); battle.passives.set(timingKey(c, s), true); }
  if (event.kind === 'skill.kumarin_binding') { changeSkill(battle, 'consume', 'consume_resistance', false); battle.passives.set('consume:consume_resistance', false); }
  if (event.kind === 'skill.sasint_training') changeSkill(battle, 'consume', 'attack', false);
  if (event.kind === 'skill.sasint_battle_mastery') { changeSkill(battle, 'sasint', 'attack', false); changeSkill(battle, 'sasint', 'sasint_support', false); }
  if (event.kind === 'skill.kilder_absorb') changeSkill(battle, 'kilder', 'kilder_casanova', false);
  if (event.kind === 'attack.lives' && typeof event.data?.target === 'string' && typeof event.data?.remaining === 'number') battle.hitsRemaining.set(event.data.target, event.data.remaining);
  if (event.kind === 'skill.drakan_enchant_muscle') battle.hitsRemaining.set('consume', 3);
  if (event.kind === 'skill.angel_baptism' && event.data?.character === 'supra') battle.hitsRemaining.set('supra', Math.min(4, estimatedHits(view, battle, 'supra') + 2));
  if (event.kind === 'skill.angel_baptism' && event.data?.character === 'loneris') changeSkill(battle, 'loneris', 'heresy_judgment', true);
  if (event.kind === 'skill.valiant_charge' && view.mode === 'lidellut') { changeSkill(battle, 'tuma', 'advanced_attack', false); changeSkill(battle, 'tuma', 'supreme_attack', true); }
  if (event.kind === 'skill.kumarin_commander_guard') battle.guardCharges.set('rael', 2);
  if (event.kind === 'skill.consume_master_guard') battle.guardCharges.set('eltas', 2);
  if (event.kind === 'attack.guarded' && typeof event.data?.target === 'string' && event.text.includes('보디가드')) {
    const c = event.data.target;
    battle.guardCharges.set(c, Math.max(0, (battle.guardCharges.get(c) ?? 2) - 1));
  }
}

export function skillTiming(battle: BattleMemory, character: string, skill: string): SkillTiming | undefined {
  return battle.timings.get(timingKey(character, skill));
}
export function estimatedHits(view: PlayerView, battle: BattleMemory, character: string, includeGuard = true): number {
  const hits = battle.hitsRemaining.get(character) ?? (getMode(view.mode as ModeId).characters.find((r) => r.key === character)!.extraLives + 1);
  if (!includeGuard) return hits;
  const guardian = view.mode === 'primordial' ? ({ rael: 'kumarin', eltas: 'consume' } as Record<string, string>)[character] : undefined;
  const absent = guardian && (!view.roster.some((r) => r.key === guardian && r.inGame) || view.players.some((p) => p.revealed === guardian && !p.alive));
  return hits + (absent ? 0 : battle.guardCharges.get(character) ?? 0);
}
export function neutralizedSkill(view: PlayerView, battle: BattleMemory, skill: string, target: string): boolean {
  if (view.mode === 'civil_war' && skill === 'valiant_charge' && target === 'kelhu') return battle.passives.get('kelhu:calmness') === true;
  return skill === 'eoril_phoenix_flame' && target === 'consume' && battle.passives.get('consume:consume_resistance') === true;
}
/** 상대는 마나 부족·추가 비공개 사용 때문에 행동할 수 없을 수도 있다. 보수적인 위협 순위 점수다. */
export function roleThreat(view: PlayerView, battle: BattleMemory, character: string): number {
  const mode = getMode(view.mode as ModeId);
  return roleSkills(view, battle, character).reduce((sum, skill) => {
    const def = mode.skills[skill] ?? skillRegistry[skill];
    if (!def || def.passive || !OFFENSIVE.has(skill)) return sum;
    const timing = skillTiming(battle, character, skill);
    if ((def.uses !== null && (timing?.usedMin ?? 0) >= def.uses) || (timing?.readyEarliest ?? 0) > view.elapsedMs + 10_000) return sum;
    return sum + (NAME_ATTACKS.includes(skill) ? 1 : 2);
  }, 0);
}
