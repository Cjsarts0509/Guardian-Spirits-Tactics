// 봇 두 종류
// - randomBotAction: 무작위 (규칙 엔진 퍼즈 테스트용)
// - smartBotAction: 자기가 아는 것(자기 정체, 공개 정보, 자기가 받은 확인 결과)만으로 판단하는 봇 (플레이테스트용)
//   상대 정체를 모르면 공격하지 않고 확인부터 한다. 시간이 지나면 후보가 좁혀진 대상에게 추측 공격을 시작한다.
import { randomInt, nextRandom } from './rng.js';
import type { Action, CharKey, GameState, PlayerId } from './types.js';
import { eventsFor, viewFor, type PlayerView, type SkillView } from './engine/view.js';
import { createBotMemory, updateBotKnowledge, type BotMemory, type Knowledge } from './bot-memory.js';
import { assignmentBelief, checkInformation, probabilityOf } from './bot-belief.js';
import { claimCheckSucceeds, wantsTrueName } from './bot-claims.js';
import { adaptiveClaimName } from './bot-claim-policy.js';
import { hasIdentityEvidence, bestConfirmation } from './bot-confirmation.js';
import { boundedSequenceSearch } from './bot-sequence.js';
import { boundedAttackSearch } from './bot-rollout.js';
import { bestGemTarget } from './bot-information.js';
import { estimatedHits, NAME_ATTACKS, neutralizedSkill, roleThreat } from './bot-tactics.js';
export type { BotMemory, Knowledge } from './bot-memory.js';

export interface BotOptions {
  /** 행동 확률 (0~1). 호출될 때마다 이 확률로만 행동 */
  activity?: number;
  /** 확인된 적에 대한 제한 엔진 탐색 실험. 기본은 비활성화. */
  attackSearch?: boolean;
  /** 확인/공표 후 관찰에 따른 후속 행동 탐색. 기본 비활성화. */
  sequenceSearch?: boolean;
  /** 기본 스킬·교체 관계와 관찰에 기반한 상대 대응을 포함한 탐색 실험. */
  attackResponse?: boolean;
  /** 상대 즉사기·행동 불능기를 추가하는 별도 실험. attackResponse가 필요하다. */
  attackResponseSkills?: boolean;
  /** 태초 정책 비교용. 조기 공표·무작위 리더쉽 대상을 유지한다. */
  primordialLeadership?: 'early' | 'after-six-minutes';
  primordialPriorities?: boolean;
  /** 비교용으로 기존 보석 대상 선택을 지정할 수 있다. */
  gemTargets?: 'legacy';
  /** 기본은 검증한 황야 한정 확인 탐색. false는 기존 확인 선택 비교용. */
  confirmationSearch?: boolean | 'combat' | 'combat-gem' | 'combat-lidellut';
  primordialSlash?: 'early' | 'finish-or-revealed';
  /** 공표 전략 비교. 기본은 진명이며 지연 리더쉽 실험은 기존 선택을 유지한다. */
  claimStrategy?: 'current' | 'truthful' | 'truthful-noncommanders' | 'adaptive';
}

export function randomBotAction(state: GameState, playerId: PlayerId, rng: { rng: number }, opts: BotOptions = {}): Action | null {
  if (state.phase !== 'running') return null;
  const me = state.players.find((p) => p.id === playerId);
  if (!me || !me.alive) return null;
  if (nextRandom(rng) > (opts.activity ?? 0.5)) return null;

  const view = viewFor(state, playerId);
  const usable = view.me.skills.filter((s) => !s.passive && s.blocked === null);
  if (usable.length === 0) return null;

  // 공표는 진명/가짜를 섞는다
  const skill = usable[randomInt(rng, usable.length)];
  if (!skill) return null;
  const others = view.players.filter((p) => p.id !== playerId && p.alive && (skill.ignoresInvulnerable || !p.statuses.some((st) => st.kind === 'invulnerable')));
  const target = skill.target === 'none' ? undefined : others[randomInt(rng, others.length)]?.id;
  if (skill.target !== 'none' && !target) return null;

  let name: string | undefined;
  if (skill.nameOptions && skill.nameOptions.length > 0) {
    if (skill.key === 'publish' && nextRandom(rng) < 0.5) name = view.me.character;
    else name = skill.nameOptions[randomInt(rng, skill.nameOptions.length)];
  }
  const action: Action = { type: 'skill', skill: skill.key };
  if (target) action.target = target;
  if (name) action.name = name;
  return action;
}

// ── 똑똑한 봇 ───────────────────────────────────────────────────────────

/** 보디가드가 살아 있으면 공격이 무조건 실패하는 관계 (모드 규칙, 공개 정보). 태초의 횟수제 보디가드는 공격자 손해가 없어 제외 */
const GUARDS: Record<string, Record<CharKey, CharKey[]>> = {
  civil_war: { kai: ['arin'], dantes: ['kelhu'] },
  lidellut: { kai: ['arin'] },
  troll: { chis: ['satoshi', 'zwinra'] }, // 한 명이라도 살아 있으면 보호 (G1)
};
/** 대상이 특정 캐릭터일 때만 의미 있는 조건부 스킬. friendly: 아군에게 거는 것(공표 이름을 믿고 시도). knownOnly: 확실히 알 때만 (실패 손해가 큰 것) */
interface Need {
  want: CharKey[];
  friendly: boolean;
  knownOnly?: boolean;
}
const need = (want: CharKey | CharKey[], friendly: boolean, knownOnly = false): Need => ({ want: Array.isArray(want) ? want : [want], friendly, knownOnly });
const NEEDS_COMMON: Record<string, Need> = {
  dantes_command: need('kai', false),
  dantes_successor: need('mertz', true),
  advice: need('kelhu', true),
  eoril_trial: need('rael', true),
  rael_eoril_test: need('eoril', true),
  kumarin_commander_guard: need('rael', true),
  consume_master_guard: need('eltas', true),
  sasint_training: need('consume', true),
  drakan_enchant_muscle: need('consume', true),
  hermilly_libido_protection: need('consume', true),
  eoril_phoenix_flame: need('consume', false),
  kumarin_binding: need('consume', false),
};
/** 같은 스킬 키가 모드마다 다른 대상을 원하는 경우 (내전 용맹한 돌진 → 켈후, 황야 → 카미카제) */
const NEEDS_MODE: Record<string, Record<string, Need>> = {
  civil_war: { valiant_charge: need('kelhu', false) },
  lidellut: {
    valiant_charge: need('kamikaze', false),
    great_will: need('kai', false, true), // 실패하면 샤이닝 정체 공개 + 패배 조건 추가
    heresy_judgment: need(['kaspa', 'freia'], false),
    join: need('yui', true),
    order_founding: need('supra', true),
  },
  troll: {
    holy_binding: need('deka', false),
    purify_hex: need('kanulla', false),
    brothers: need(['satoshi', 'zwinra'], true),
    chief_protection: need('chis', true, true),
    wild_essence: need(['uldian', 'ulpian'], true),
    wild_blessing: need(['uldian', 'ulpian'], true),
  },
};
/** 정체 확인용 탐색 스킬: 대상이 이 캐릭터인지 알아낸다 (반복 사용 가능) */
const PROBES: Record<string, CharKey> = {
  mertz_spouse: 'reindila',
  reindila_spouse: 'mertz',
  kelhu_loyal: 'dantes',
  kai_loyal: 'kai',
  tachin_union: 'kumarin',
  kumarin_union: 'tachin',
  consume_slave_instinct: 'eltas',
  kilder_casanova: 'eoril',
  loyal_servant: 'kai',
  kinship_shining: 'chizuko',
  kinship_chizuko: 'shining',
  commander_search: 'shining',
  charge_sense: 'kamikaze',
  neviathan_avatar: 'kanulla',
};
/** 이 이름을 공표한 대상에게는 쓸 수 없는 탐색 (황야 돌격 감각) */
const PROBE_EXCLUDES_PUBLISHED: Record<string, CharKey[]> = { charge_sense: ['tuma', 'kamikaze'], kilder_casanova: ['kilder'], warrior_scent: ['tuma', 'kelhu'] };
/** 천사의 세례 대상 (기사) */
const KNIGHTS: CharKey[] = ['yui', 'loneris', 'supra'];
/** 죽으면 자기 진영이 패배 조건에 가까워지는 캐릭터: 추측 공격을 더 조심한다 */
const PRECIOUS: Record<string, CharKey[]> = {
  troll: ['satoshi', 'zwinra', 'uldian'],
  lidellut: ['yui', 'loneris', 'supra'],
};
/** 사냥꾼의 표식 이름 목록 (반란자) */
const REBELS: CharKey[] = ['deka', 'neonis', 'kanulla', 'kazrow', 'seirow'];
const ATTACKS = ['supreme_attack', 'advanced_attack', 'attack', 'soen_chain_murder'] as const;
/** 정체·목숨·보디가드 무시 살해 */
const EXECUTES = ['soul_reaver', 'rael_master_power', 'kilder_master_power', 'consume_slaughter', 'mass_teleport', 'greater_mass_teleport'] as const;
/** 이름 없이 때리는 공격 (목숨 1 감소) */
const STRIKES = ['kane_wolfs_slash'] as const;
const DISRUPT = ['shadow_jail', 'nightmare', 'confusion', 'burning_magic', 'eoril_flame_shackle', 'drakan_black_spell', 'distortion', 'troll_venom'] as const;
const INFO = ['warrior_scent', 'oracle', 'shadow_eye', 'curse', 'hermilly_seeing_libido', 'battle_sense', 'spirit_hex'] as const;
/** 아군(같은 편 이름 공표자)에게 거는 지원 */
const SUPPORT = ['sasint_support', 'nukelius_chakra_magic', 'rune_protection', 'soul_recovery', 'dawn_mist', 'diplomacy', 'support'] as const;
/** 자기도 죽는 즉사기 (무모한 돌진): 정체를 아는 적 지휘관에게만 */
const SUICIDES = ['reckless_charge'] as const;
/** 진명 공표 등 조건만 맞으면 바로 쓰는 자기 대상 스킬 */
const SELF_SKILLS = ['ancient_sorcery', 'religious_alliance', 'ancient_hex_hachi', 'chief_search', 'wild_path', 'berserk_seirow'] as const;
/** 행동 불능인 아군을 풀어주는 해제 */
const DISPEL = ['tachin_neutralize'] as const;
const MIN = 60_000;

/** 봇이 정당하게 아는 정보만으로 각 플레이어의 정체 후보를 계산한다 */
export function botKnowledge(state: GameState, playerId: PlayerId, view: PlayerView = viewFor(state, playerId), memory: BotMemory = createBotMemory(0)): Knowledge {
  const p = memory.perception;
  if (p && (p.playerId !== playerId || p.mode !== view.mode || p.character !== view.me.character || view.elapsedMs < p.lastElapsedMs || state.seq < p.lastSeq)) memory.perception = undefined;
  return updateBotKnowledge(view, eventsFor(state, playerId, memory.perception?.lastSeq ?? 0), memory);
}

export function smartBotAction(state: GameState, playerId: PlayerId, mem: BotMemory, opts: BotOptions = {}): Action | null {
  if (state.phase !== 'running') return null;
  const self = state.players.find((p) => p.id === playerId);
  if (!self || !self.alive) return null;
  if (nextRandom(mem) > (opts.activity ?? 0.5)) return null;

  const view = viewFor(state, playerId);
  const knowledge = botKnowledge(state, playerId, view, mem);
  const { known, candidates } = knowledge;
  const requestedConfirmation = opts.confirmationSearch ?? 'combat-lidellut';
  const confirmationStrategy = requestedConfirmation === 'combat-lidellut'
    ? view.mode === 'lidellut' ? 'combat' : false : requestedConfirmation;
  const combatInformation = confirmationStrategy === 'combat' || confirmationStrategy === 'combat-gem';
  const belief = assignmentBelief(view, knowledge, mem);
  const me = view.me;
  const elapsed = view.elapsedMs;
  const sideOf = new Map(view.roster.map((r) => [r.key, r.side]));
  const isCommander = new Map(view.roster.map((r) => [r.key, r.commander]));
  const guards = GUARDS[view.mode] ?? {};
  const needs: Record<string, Need> = { ...NEEDS_COMMON, ...(NEEDS_MODE[view.mode] ?? {}) };
  const { baptized, chiefProtected, madnessPurged, lastAttackFailure, battle } = mem.perception!;
  const deadChars = new Set(view.players.filter((p) => !p.alive && p.revealed).map((p) => p.revealed!));
  const living = view.players.filter((p) => p.alive && p.id !== playerId);
  const alive = living.filter((p) => !p.statuses.some((s) => s.kind === 'invulnerable'));
  const usable = new Map(me.skills.filter((s) => !s.passive && s.blocked === null).map((s) => [s.key, s]));
  const pick = <T,>(xs: T[]): T | undefined => xs[randomInt(mem, xs.length)];
  const enemy = (c: CharKey) => sideOf.get(c) !== me.side;
  const attackable = (c: CharKey) => enemy(c) && !guards[c]?.some((gd) => !deadChars.has(gd));
  const act = (s: SkillView, target?: PlayerId, name?: CharKey): Action => {
    const strategy = opts.claimStrategy ?? (opts.primordialLeadership === 'after-six-minutes' ? 'current' : 'truthful');
    if (s.key === 'publish' && strategy === 'adaptive') name = adaptiveClaimName(view, knowledge, mem);
    if (s.key === 'publish' && (strategy === 'truthful' ||
      (strategy === 'truthful-noncommanders' && !me.commander)) && s.nameOptions?.includes(me.character)) name = me.character;
    const a: Action = { type: 'skill', skill: s.key };
    if (target) a.target = target;
    if (name) a.name = name;
    return a;
  };

  const knownEnemies = alive.filter((p) => {
    const c = known.get(p.id);
    return c !== undefined && enemy(c);
  });
  // 곧 돌아오는 확정 공격의 마나를 관계없는 확인·지원에 먼저 쓰지 않는다.
  const reserve = Math.max(0, ...me.skills.filter((s) => NAME_ATTACKS.includes(s.key) &&
    s.cooldownRemainingMs > 0 && s.cooldownRemainingMs <= 20_000 && me.mana >= s.mana &&
    knownEnemies.some((p) => attackable(known.get(p.id)!) && s.nameOptions?.includes(known.get(p.id)!)),
  ).map((s) => s.mana));
  if (reserve) for (const [key, s] of usable) if (!NAME_ATTACKS.includes(key) && s.mana > me.mana - reserve) usable.delete(key);
  const unknown = alive.filter((p) => !known.has(p.id));
  const informed = (id: PlayerId) => hasIdentityEvidence(view, knowledge, mem, id);
  const claimsSide = (p: { published: CharKey | null }, side: number) => p.published !== null && sideOf.get(p.published) === side;
  const massOf = (id: PlayerId, c: CharKey) => belief.consistent ? probabilityOf(belief, id, c) :
    candidates.get(id)?.includes(c) ? 1 / candidates.get(id)!.length : 0;
  const sideMass = (id: PlayerId, side: number) => (candidates.get(id) ?? []).filter((c) => sideOf.get(c) === side).reduce((sum, c) => sum + massOf(id, c), 0);
  const likelyName = (id: PlayerId, names: CharKey[]) => names.slice().sort((a, b) => massOf(id, b) - massOf(id, a))[0];
  const bestCheck = (skill: string, pool: typeof unknown) => pool.slice().sort((a, b) =>
    checkInformation(view, belief, b.id, skill) - checkInformation(view, belief, a.id, skill),
  )[0];
  const threat = (id: PlayerId) => (candidates.get(id) ?? []).reduce((sum, c) => sum + massOf(id, c) * roleThreat(view, battle, c), 0);

  // 필요한 진명 스킬을 공표로 열어 둔다. 지휘관도 역할상 필요하면 예외다.
  const sequence = (baseline: Action): Action => opts.sequenceSearch
    ? boundedSequenceSearch(view, knowledge, mem, baseline)?.action ?? baseline : baseline;
  const publish = usable.get('publish');
  const waitLeadership = view.mode === 'primordial' && opts.primordialLeadership === 'after-six-minutes' &&
    ['rael', 'eltas'].includes(me.character);
  if (publish && !me.trueName && ((!waitLeadership && wantsTrueName(view)) || mem.perception!.trueNameUntil > elapsed) && publish.nameOptions?.includes(me.character)) {
    return sequence(act(publish, undefined, me.character));
  }

  // 1) 확실한 처치: 정체를 아는 적 (지휘관 우선)
  knownEnemies.sort((a, b) => Number(!!isCommander.get(known.get(b.id)!)) - Number(!!isCommander.get(known.get(a.id)!)) ||
    threat(b.id) - threat(a.id) || estimatedHits(view, battle, known.get(a.id)!) - estimatedHits(view, battle, known.get(b.id)!));
  for (const p of knownEnemies) {
    const c = known.get(p.id)!;
    // 흡수 계열 패시브가 있으면 처치 가능한 일반 공격으로 마나를 회수하고 1회 즉사기를 남긴다.
    if (estimatedHits(view, battle, c) === 1 && attackable(c) && me.skills.some((s) =>
      s.passive && ['essence_absorb', 'essence_drain', 'kilder_vampiric', 'eltas_bloody_heart'].includes(s.key))) {
      const s = ATTACKS.map((k) => usable.get(k)).find((s) => s?.nameOptions?.includes(c));
      if (s) return act(s, p.id, c);
    }
    for (const [k, need] of Object.entries(needs)) {
      const s = usable.get(k);
      if (s && !need.friendly && need.want.includes(c) && !neutralizedSkill(view, battle, k, c)) return act(s, p.id);
    }
    for (const k of EXECUTES) {
      const s = usable.get(k);
      if (s && (isCommander.get(c) || estimatedHits(view, battle, c) > 1 || elapsed > 6 * MIN || s.usesLeft === null)) return act(s, p.id);
    }
    for (const k of STRIKES) {
      const s = usable.get(k);
      if (k === 'kane_wolfs_slash' && (opts.primordialSlash ?? 'finish-or-revealed') === 'finish-or-revealed' &&
        !view.players.find((p) => p.id === me.id)?.revealed && estimatedHits(view, battle, c, false) > 1) continue;
      if (s && (isCommander.get(c) || elapsed > 6 * MIN)) return act(s, p.id);
    }
    for (const k of SUICIDES) {
      const s = usable.get(k);
      if (!s || !isCommander.get(c)) continue;
      if (c === 'chis' && chiefProtected && !deadChars.has('satoshi')) continue; // 족장 보호에 막힌다
      return act(s, p.id);
    }
    // 사냥꾼의 표식: 정체를 아는 반란자에게 (틀리면 하치가 드러나므로 아는 경우만)
    const mark = usable.get('hunters_mark');
    if (mark && REBELS.includes(c)) return act(mark, p.id, c);
    if (!attackable(c)) continue;
    // 블러디 매드니스(데카)는 마나를 깎아야 뚫린다: 맹독을 먼저
    const venom = usable.get('troll_venom');
    if (venom && c === 'deka') return act(venom, p.id);
    for (const k of ATTACKS) {
      const s = usable.get(k);
      if (s && s.nameOptions?.includes(c)) {
        if (opts.attackSearch) {
          const plan = boundedAttackSearch(view, knowledge, mem, opts.attackResponse ?? false,
            opts.attackResponse ? act(s, p.id, c) : undefined, opts.attackResponseSkills ?? false);
          // 상대 대응 실험은 기존 공격의 순위를 보완한다. 불완전한 가설의
          // 대기 선택으로 기존 공격을 반복 취소하지 않는다.
          if (plan && (!opts.attackResponse || plan.action)) return plan.action;
        }
        return act(s, p.id, c);
      }
    }
  }
  // 자기 시전 영수증이 제안한 대상·시점과 일치한 경우만 저주 연계를 이어 간다.
  if (mem.plan) {
    const plan = mem.plan;
    const burn = mem.perception!.lastBurn;
    if (plan.expires <= elapsed || !alive.some((p) => p.id === plan.target) || known.has(plan.target) ||
      (plan.awaitingBurn && (!burn || burn.at < plan.startedAt || burn.target !== plan.target))) mem.plan = undefined;
    else {
      plan.awaitingBurn = false;
      const curse = usable.get('curse');
      if (curse) { mem.plan = undefined; return act(curse, plan.target); }
      // 1차 연계에 남겨 둔 마나를 다른 스킬로 소모하지 않고 다음 결정까지 기다린다.
      if (me.skills.some((s) => s.key === 'curse' && s.cooldownRemainingMs <= 10_000)) return null;
      mem.plan = undefined;
    }
  }
  const burning = usable.get('burning_magic');
  const curse = me.skills.find((s) => s.key === 'curse');
  if (burning && curse && !curse.passive && curse.cooldownRemainingMs <= 10_000 &&
    me.mana >= burning.mana + curse.mana && (view.mode !== 'civil_war' || me.trueName)) {
    // 저주는 지휘관의 진명 대신 지휘관 여부만 준다. 이미 안 지휘관을 재확인하지 않는다.
    const target = unknown.filter((p) => !mem.perception!.commanders.has(p.id) && sideMass(p.id, me.side) <= 0.5)
      .sort((a, b) => threat(b.id) - threat(a.id))[0];
    if (target) {
      mem.plan = { kind: 'burn_curse', target: target.id, expires: elapsed + 40_000, awaitingBurn: true, startedAt: elapsed };
      return act(burning, target.id);
    }
  }
  // 백스탭: 나에게 동맹을 건 적 (또는 적 진영 이름을 공표한 사람)
  const backstab = usable.get('backstab');
  if (backstab) {
    const t = alive.find((p) => me.alliedBy.includes(p.id) && (known.has(p.id) ? enemy(known.get(p.id)!) : informed(p.id) && sideMass(p.id, me.side) <= 0.25));
    if (t) return act(backstab, t.id);
  }
  // 아군에게 거는 조건부 스킬: 정체를 알거나, 그 이름을 공표한 사람이 있으면 (적 이름을 공표한 사람은 제외)
  for (const [k, need] of Object.entries(needs)) {
    const s = usable.get(k);
    if (!s || !need.friendly) continue;
    const t =
      alive.find((p) => need.want.includes(known.get(p.id)!)) ??
      (elapsed > 2 * MIN && !need.knownOnly ? alive.find((p) => !known.has(p.id) && p.published !== null && need.want.includes(p.published) && (candidates.get(p.id) ?? []).includes(p.published)) : undefined);
    if (t) return act(s, t.id);
  }
  // 파괴자의 인도: 데카의 블러디 매드니스가 정화된 뒤, 정체를 아는 데카에게 (카'눌라 희생)
  const guidance = usable.get('destroyer_guidance');
  if (guidance && madnessPurged) {
    const t = alive.find((p) => known.get(p.id) === 'deka');
    if (t) return act(guidance, t.id);
  }
  // 천사의 세례: 정체를 아는 아군 기사(아직 세례 전)에게. 틀리면 영구 소멸이라 아는 경우만
  const baptism = usable.get('angel_baptism');
  if (baptism) {
    const t = alive.find((p) => {
      const c = known.get(p.id);
      return c !== undefined && KNIGHTS.includes(c) && !baptized.has(c);
    });
    if (t) return act(baptism, t.id, known.get(t.id)!);
  }
  // 기사도: 내가 진명을 공표했거나 대상이 기사 이름을 공표했을 때, 아군 기사(확실하거나 기사 이름 공표자)에게
  const chivalry = usable.get('chivalry');
  if (chivalry && nextRandom(mem) < 0.5) {
    const knightClaim = (p: { published: CharKey | null }) => p.published !== null && KNIGHTS.includes(p.published);
    const t =
      alive.find((p) => KNIGHTS.includes(known.get(p.id)!) && claimCheckSucceeds(view, 'chivalry', known.get(p.id)!, p.published)) ??
      alive.find((p) => !known.has(p.id) && knightClaim(p) && (candidates.get(p.id) ?? []).includes(p.published!));
    if (t) return act(chivalry, t.id);
  }
  // 적에게 거는 조건부 1회 스킬: 시간이 지났고 그 이름을 공표한 사람이 있거나, 후보가 2명 이하로 좁혀졌으면 시도
  if (elapsed > 8 * MIN) {
    for (const [k, need] of Object.entries(needs)) {
      const s = usable.get(k);
      if (!s || need.friendly || need.knownOnly) continue;
      const t =
        alive.find((p) => !known.has(p.id) && informed(p.id) && p.published !== null && need.want.includes(p.published) && !neutralizedSkill(view, battle, k, p.published) && (candidates.get(p.id) ?? []).includes(p.published)) ??
        (elapsed > 12 * MIN
          ? alive.find((p) => {
              const c = candidates.get(p.id) ?? [];
              return !known.has(p.id) && informed(p.id) && c.length <= 2 && c.some((x) => need.want.includes(x) && !neutralizedSkill(view, battle, k, x));
            })
          : undefined);
      if (t && nextRandom(mem) < 0.3) return act(s, t.id);
    }
    // 사냥꾼의 표식 추측: 후보가 반란자 2명 이하로 좁혀진 사람
    const mark = usable.get('hunters_mark');
    if (mark && elapsed > 12 * MIN && nextRandom(mem) < 0.3) {
      const t = alive.find((p) => {
        const c = candidates.get(p.id) ?? [];
        return !known.has(p.id) && informed(p.id) && c.length > 0 && c.length <= 2 && c.every((x) => REBELS.includes(x));
      });
      if (t) return act(mark, t.id, pick(candidates.get(t.id)!)!);
    }
  }
  // 자기 자신에게 쓰는 성장 스킬
  const mastery = usable.get('sasint_battle_mastery');
  if (mastery && elapsed > 3 * MIN) return act(mastery);
  const evo = usable.get('consume_final_evolution');
  if (evo && ['consume_resistance', 'consume_iron_skin', 'advanced_attack'].every((k) => me.skills.some((x) => x.key === k))) return act(evo);
  // 조건만 맞으면 바로 쓰는 자기 대상 스킬 (조건 미달이면 blocked 라 usable 에 없다)
  for (const k of SELF_SKILLS) {
    const s = usable.get(k);
    if (s) return act(s);
  }
  // 카즈로우 광폭화: 쿨다운 중인 스킬이 있을 때
  const berserk = usable.get('berserk_kazrow');
  if (berserk && me.skills.some((x) => !x.passive && x.key !== 'truth_gem' &&
    (NAME_ATTACKS.includes(x.key) || x.key === 'battle_sense') && x.cooldownRemainingMs > 20_000)) return act(berserk);
  // 이름만 고르는 정보 스킬 (리더쉽): 모르는 아군 이름 하나
  for (const s of usable.values()) {
    if (s.target !== 'none' || !s.nameOptions || s.key === 'publish') continue;
    const unknownNames = s.nameOptions.filter((n) => ![...known.values()].includes(n));
    const priority = view.mode === 'primordial' && opts.primordialPriorities && s.key.includes('leadership')
      ? me.character === 'rael' ? ['eoril', 'kumarin', 'tachin', 'nukelius'] : ['consume', 'sasint', 'kilder', 'hermilly', 'drakan'] : [];
    const n = priority.find((n) => unknownNames.includes(n)) ?? pick(unknownNames.length ? unknownNames : s.nameOptions);
    if (n) return act(s, undefined, n);
  }
  // 행동 불능인 아군 풀어주기
  for (const k of DISPEL) {
    const s = usable.get(k);
    const t = s && (s.ignoresInvulnerable ? living : alive).find((p) => p.statuses.some((st) => st.kind === 'incapacitated') && (known.has(p.id) ? !enemy(known.get(p.id)!) : claimsSide(p, me.side)));
    if (s && t) return act(s, t.id);
  }
  // 아군 지원·보호: 정체가 드러난 아군 지휘관 우선, 아니면 같은 편 이름 공표자
  for (const k of SUPPORT) {
    const s = usable.get(k);
    if (!s || nextRandom(mem) > 0.25) continue;
    const cmd = alive.find((p) => p.revealed && !enemy(p.revealed) && isCommander.get(p.revealed));
    const friends = alive.filter((p) => (known.has(p.id) ? !enemy(known.get(p.id)!) : sideMass(p.id, me.side) >= 0.75));
    const t = cmd ?? (['support', 'sasint_support', 'nukelius_chakra_magic'].includes(k)
      ? friends.sort((a, b) => threat(b.id) - threat(a.id))[0] : pick(friends));
    if (t) return act(s, t.id);
  }

  // 2) 공표. 지휘관은 진명을 숨기고, 나머지는 대체로 진명(턴 마나·진실의 조각). 가짜로 시작했어도 나중에 진명으로 바꾼다
  if (publish) {
    if (opts.claimStrategy === 'adaptive') {
      const desired = adaptiveClaimName(view, knowledge, mem);
      // 최초 공표는 기존 난수·후보 선택 경로를 유지해 비교를 성향 전환 효과에 한정한다.
      // 자동 가짜 공표의 진명 복구 시점도 기존 정책과 같게 두고, 자기 수동 위장만 되돌린다.
      const ownManual = mem.perception!.manualClaims.get(me.id);
      if (me.published !== null && desired !== me.published && (desired !== me.character || ownManual?.name === me.published) &&
        publish.nameOptions?.includes(desired)) return sequence(act(publish, undefined, desired));
    }
    const commander = !!isCommander.get(me.character);
    const own = view.roster.filter((r) => r.inGame && r.side === me.side && !r.commander && r.key !== me.character).map((r) => r.key);
    if (me.published === null) {
      const disguise = me.skills.some((s) => s.key === 'disguise');
      const honest = !commander && !disguise && nextRandom(mem) < 0.75;
      const decoys = disguise ? view.roster.filter((r) => r.inGame && r.side !== me.side && !r.commander).map((r) => r.key) : own;
      const name = honest ? me.character : (pick(decoys) ?? me.character);
      if (publish.nameOptions?.includes(name)) return sequence(act(publish, undefined, name));
    } else if (!commander && !me.trueName && !me.skills.some((s) => s.key === 'disguise') && elapsed > 3 * MIN && nextRandom(mem) < 0.15 && publish.nameOptions?.includes(me.character)) {
      return sequence(act(publish, undefined, me.character));
    }
  }

  // 3) 진실의 보석: 지휘관 재통보만 남는 대상보다 새 정보를 줄 대상을 우선한다.
  const gem = usable.get('truth_gem');
  if (gem && unknown.length) {
    // 교환 리그로 검증한 트롤에 적용한다. 다른 모드의 전투 우선순위는 별도 검증 전 유지한다.
    const pool = view.mode === 'troll' ? unknown.filter((p) => !mem.perception!.commanders.has(p.id) &&
      (!belief.consistent || checkInformation(view, belief, p.id, 'truth_gem') > 0)) : unknown;
    const useInformation = (view.mode !== 'troll' || combatInformation) && opts.gemTargets !== 'legacy' && belief.consistent;
    const targetId = useInformation ? bestGemTarget(view, belief, pool, combatInformation ? battle : undefined) : undefined;
    const t = useInformation ? pool.find((p) => p.id === targetId) :
      pool.find((p) => claimsSide(p, me.side === 1 ? 2 : 1)) ?? pick(pool);
    if (t) return act(gem, t.id);
  }
  // 혼돈의 주술은 단순 지원이 아니라 반란자의 정체를 확인하는 지연 정보 스킬이다.
  const chaos = usable.get('chaos_hex');
  if (chaos && unknown.length) {
    const t = belief.consistent ? bestCheck('chaos_hex', unknown) : pick(unknown);
    if (t && (!belief.consistent || checkInformation(view, belief, t.id, 'chaos_hex') > 0)) return act(chaos, t.id);
  }

  // 4) 정보 수집
  if (confirmationStrategy && confirmationStrategy !== 'combat-gem') {
    const confirmation = bestConfirmation(view, belief, unknown, [...usable.values()], confirmationStrategy === 'combat' ? battle : undefined);
    if (confirmation) return sequence(confirmation);
  }
  if (opts.sequenceSearch) {
    const plan = boundedSequenceSearch(view, knowledge, mem);
    if (plan) return plan.action;
  }
  const roll = nextRandom(mem);
  if (unknown.length && roll < 0.75) {
    const allyClaim = unknown.filter((p) => claimsSide(p, me.side));
    const enemyClaim = unknown.filter((p) => claimsSide(p, me.side === 1 ? 2 : 1));
    for (const k of ['advanced_ally_check', 'ally_check'] as const) {
      const s = usable.get(k);
      const t = s && bestCheck(k, allyClaim);
      if (s && t && checkInformation(view, belief, t.id, k) > 0) return act(s, t.id);
    }
    for (const k of ['advanced_enemy_check', 'enemy_check'] as const) {
      const s = usable.get(k);
      const t = s && bestCheck(k, enemyClaim);
      if (s && t && checkInformation(view, belief, t.id, k) > 0) return act(s, t.id);
    }
    for (const [k, want] of Object.entries(PROBES)) {
      const s = usable.get(k);
      if (!s) continue;
      const ex = PROBE_EXCLUDES_PUBLISHED[k];
      const pool = unknown.filter((p) => candidates.get(p.id)?.includes(want) && !(ex && p.published !== null && ex.includes(p.published)));
      const t = pool.find((p) => p.published === want) ?? pick(pool);
      if (t) return act(s, t.id);
    }
    for (const k of ['advanced_scan', 'scan', 'ally_scan', 'enemy_scan', 'troll_scan', 'troll_ally_scan', 'troll_enemy_scan'] as const) {
      const s = usable.get(k);
      if (!s?.nameOptions) continue;
      const choices = unknown.flatMap((p) => (candidates.get(p.id) ?? []).filter((c) => s.nameOptions!.includes(c))
        .map((name) => ({ p, name, information: checkInformation(view, belief, p.id, k, name) })));
      choices.sort((a, b) => b.information - a.information);
      const choice = choices[0];
      if (choice && choice.information > 0) return act(s, choice.p.id, choice.name);
    }
    for (const k of INFO) {
      const s = usable.get(k);
      const excludes = PROBE_EXCLUDES_PUBLISHED[k];
      const t = s && pick(unknown.filter((p) => !p.published || !excludes?.includes(p.published)));
      if (s && t) return act(s, t.id);
    }
    const lp = usable.get('libido_priestess');
    if (lp) return act(lp);
  }

  // 5) 방해: 아는 적 또는 적 이름을 공표한 사람
  if (roll >= 0.75 && roll < 0.85) {
    const pool = (knownEnemies.length ? knownEnemies : alive.filter((p) => !known.has(p.id) && claimsSide(p, me.side === 1 ? 2 : 1)))
      .sort((a, b) => threat(b.id) - threat(a.id));
    for (const k of DISRUPT) {
      const s = usable.get(k);
      const t = s && pool.find((p) => !p.statuses.some((st) => st.kind === 'incapacitated') && threat(p.id) > 0);
      if (s && t) return act(s, t.id);
    }
  }

  // 6) 동맹: 같은 편 이름을 공표했고 적으로 확인되지 않은 사람 / 적으로 확인된 사람과는 파기
  const ally = usable.get('ally');
  const breakAlly = usable.get('break_ally');
  const toBreak = breakAlly && alive.find((p) => me.allies.includes(p.id) && known.has(p.id) && enemy(known.get(p.id)!));
  if (breakAlly && toBreak) return act(breakAlly, toBreak.id);
  if (ally && roll >= 0.85) {
    const friends = alive.filter((p) => !me.allies.includes(p.id) && (known.has(p.id) ? !enemy(known.get(p.id)!) :
      sideMass(p.id, me.side) >= 0.75 && (view.mode !== 'civil_war' || massOf(p.id, 'soen') <= 0.05)));
    const t = pick(friends);
    if (t) return act(ally, t.id);
  }

  // 7) 추측 공격: 시간이 지날수록 후보가 넓어도 시도한다. 후보가 가장 좁은 대상부터, 그 사람이 공표한 이름이 후보에 있으면 그 이름으로
  const guessLimit = elapsed > 30 * MIN ? 7 : elapsed > 20 * MIN ? 4 : elapsed > 12 * MIN ? 3 : elapsed > 8 * MIN ? 2 : elapsed > 4 * MIN ? 1 : 0;
  const guessChance = elapsed > 20 * MIN ? 0.7 : 0.4;
  if (guessLimit > 0 && nextRandom(mem) < guessChance) {
    const supreme = usable.get('supreme_attack');
    const safeExplore = view.mode === 'troll' && !!supreme && me.mana >= 100 && elapsed > 12 * MIN;
    const oldestNameFailure = (id: PlayerId, names: CharKey[]) => Math.min(...names.map((n) => mem.perception!.lastAttackNameFailure.get(id)?.get(n) ?? -1));
    const targets = alive
      .map((p) => {
        const all = candidates.get(p.id) ?? [];
        const c = all.filter((k) => attackable(k));
        // 적일 가능성: 후보 중 공격 가능한 적의 비율. 아군일 가능성이 높으면 건드리지 않는다
        return { p, all, c, enemyRatio: c.reduce((sum, k) => sum + massOf(p.id, k), 0) };
      })
      .filter((x) => informed(x.p.id) && x.c.length > 0 && x.all.length <= guessLimit && (x.enemyRatio >= 0.5 ||
        // 최상급 공격은 오답으로 죽지 않는다. 장기 정체·여유 마나일 때 안전한 이름 후보를 시도한다.
        (view.mode === 'troll' && usable.has('supreme_attack') && me.mana >= 100 && elapsed > 12 * MIN && x.enemyRatio > 0)));
    targets.sort((a, b) => (safeExplore ? oldestNameFailure(a.p.id, a.c) - oldestNameFailure(b.p.id, b.c) : 0) || a.all.length - b.all.length ||
      (Math.abs(b.enemyRatio - a.enemyRatio) > 1e-9 ? b.enemyRatio - a.enemyRatio : 0) ||
      (lastAttackFailure.get(a.p.id) ?? -1) - (lastAttackFailure.get(b.p.id) ?? -1));
    const t = targets[0];
    if (t) {
      // 실패 사망이 없는 최상급 공격만 미시도/오래전에 실패한 이름을 순환한다.
      // 실패를 정체 배제 증거로 쓰지 않으며 일반·상급 공격은 기존 확률 판단을 유지한다.
      const failures = mem.perception!.lastAttackNameFailure.get(t.p.id);
      const name = safeExplore
        ? t.c.slice().sort((a, b) => (failures?.get(a) ?? -1) - (failures?.get(b) ?? -1) || massOf(t.p.id, b) - massOf(t.p.id, a))[0]!
        : likelyName(t.p.id, t.c)!;
      if (supreme?.nameOptions?.includes(name)) return act(supreme, t.p.id, name);
      // 자기 진영의 패배 조건에 들어가는 캐릭터(트롤 사토시·즈윈라·울디안, 황야 기사단)는 후보가 좁을 때만 건다
      const careful = (PRECIOUS[view.mode] ?? []).includes(me.character);
      const adv = usable.get('advanced_attack');
      if (adv && adv.nameOptions?.includes(name) && ((adv.level === 1 && !careful) || t.all.length <= 2)) return act(adv, t.p.id, name);
      const atk = usable.get('attack');
      if (atk && atk.nameOptions?.includes(name) && (t.all.length <= 2 || (elapsed > 20 * MIN && !careful))) return act(atk, t.p.id, name);
    }
  }
  // 8) 즉사기: 오래 끌리면 적 지휘관일 가능성이 가장 높은 사람에게
  const reaver = [...EXECUTES, ...STRIKES].filter((k) => k !== 'kane_wolfs_slash' || (opts.primordialSlash ?? 'finish-or-revealed') !== 'finish-or-revealed' ||
    view.players.find((p) => p.id === me.id)?.revealed).map((k) => usable.get(k)).find((s) => s);
  if (reaver && elapsed > 15 * MIN && nextRandom(mem) < 0.3) {
    const pool = alive
      .map((p) => ({ p, all: candidates.get(p.id) ?? [] }))
      .filter((x) => informed(x.p.id) && x.all.some((c) => isCommander.get(c) && enemy(c)))
      .sort((a, b) => a.all.length - b.all.length);
    const t = pool[0];
    if (t && (t.all.length <= 3 || elapsed > 30 * MIN)) return act(reaver, t.p.id);
  }
  return null;
}
