// 봇 두 종류
// - randomBotAction: 무작위 (규칙 엔진 퍼즈 테스트용)
// - smartBotAction: 자기가 아는 것(자기 정체, 공개 정보, 자기가 받은 확인 결과)만으로 판단하는 봇 (플레이테스트용)
//   상대 정체를 모르면 공격하지 않고 확인부터 한다. 시간이 지나면 후보가 좁혀진 대상에게 추측 공격을 시작한다.
import { randomInt, nextRandom } from './rng.js';
import type { Action, CharKey, GameState, PlayerId } from './types.js';
import { eventsFor, viewFor, type PlayerView, type SkillView } from './engine/view.js';

export interface BotOptions {
  /** 행동 확률 (0~1). 호출될 때마다 이 확률로만 행동 */
  activity?: number;
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
  const others = view.players.filter((p) => p.id !== playerId && p.alive);
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

/** 보디가드가 살아 있으면 공격이 무조건 실패하는 관계 (모드 규칙, 공개 정보) */
const GUARDS: Record<string, Record<CharKey, CharKey>> = {
  civil_war: { kai: 'arin', dantes: 'kelhu' },
  lidellut: { kai: 'arin' },
};
/** 대상이 특정 캐릭터일 때만 의미 있는 1회성/조건부 스킬 */
const NEEDS: Record<string, CharKey> = {
  dantes_command: 'kai',
  dantes_successor: 'mertz',
  valiant_charge: 'kelhu',
  advice: 'kelhu',
};
/** 정체 확인용 탐색 스킬: 대상이 이 캐릭터인지 알아낸다 */
const PROBES: Record<string, CharKey> = {
  mertz_spouse: 'reindila',
  reindila_spouse: 'mertz',
  kelhu_loyal: 'dantes',
  kai_loyal: 'kai',
};
const ATTACKS = ['supreme_attack', 'advanced_attack', 'attack', 'soen_chain_murder'] as const;
const DISRUPT = ['shadow_jail', 'nightmare', 'confusion', 'burning_magic'] as const;
const MIN = 60_000;

export interface Knowledge {
  /** 정체를 아는 플레이어 */
  known: Map<PlayerId, CharKey>;
  /** 이 플레이어의 정체 후보 (아는 경우 1개) */
  candidates: Map<PlayerId, CharKey[]>;
}

/** 봇이 정당하게 아는 정보만으로 각 플레이어의 정체 후보를 계산한다 */
export function botKnowledge(state: GameState, playerId: PlayerId, view: PlayerView = viewFor(state, playerId)): Knowledge {
  const known = new Map<PlayerId, CharKey>();
  const not = new Map<PlayerId, Set<CharKey>>();
  const commander = new Set<PlayerId>();
  for (const e of eventsFor(state, playerId)) {
    for (const f of e.facts ?? []) {
      if (f.player === playerId) continue;
      if (f.character) known.set(f.player, f.character);
      if (f.not) (not.get(f.player) ?? not.set(f.player, new Set()).get(f.player)!).add(f.not);
      if (f.commander) commander.add(f.player);
    }
  }
  for (const p of view.players) if (p.revealed && p.id !== playerId) known.set(p.id, p.revealed);
  const roster = view.roster.filter((r) => r.inGame);
  const taken = new Set<CharKey>([view.me.character, ...known.values()]);
  const candidates = new Map<PlayerId, CharKey[]>();
  for (const p of view.players) {
    if (p.id === playerId) continue;
    const k = known.get(p.id);
    if (k) {
      candidates.set(p.id, [k]);
      continue;
    }
    const nots = not.get(p.id);
    let c = roster.filter((r) => !taken.has(r.key) && !nots?.has(r.key));
    if (commander.has(p.id)) c = c.filter((r) => r.commander);
    candidates.set(
      p.id,
      c.map((r) => r.key),
    );
  }
  return { known, candidates };
}

export interface BotMemory {
  rng: number;
}

export function smartBotAction(state: GameState, playerId: PlayerId, mem: BotMemory, opts: BotOptions = {}): Action | null {
  if (state.phase !== 'running') return null;
  const self = state.players.find((p) => p.id === playerId);
  if (!self || !self.alive) return null;
  if (nextRandom(mem) > (opts.activity ?? 0.5)) return null;

  const view = viewFor(state, playerId);
  const { known, candidates } = botKnowledge(state, playerId, view);
  const me = view.me;
  const elapsed = view.elapsedMs;
  const sideOf = new Map(view.roster.map((r) => [r.key, r.side]));
  const isCommander = new Map(view.roster.map((r) => [r.key, r.commander]));
  const guards = GUARDS[view.mode] ?? {};
  const deadChars = new Set(view.players.filter((p) => !p.alive && p.revealed).map((p) => p.revealed!));
  const alive = view.players.filter((p) => p.alive && p.id !== playerId && !p.statuses.some((s) => s.kind === 'invulnerable'));
  const usable = new Map(me.skills.filter((s) => !s.passive && s.blocked === null).map((s) => [s.key, s]));
  const pick = <T,>(xs: T[]): T | undefined => xs[randomInt(mem, xs.length)];
  const enemy = (c: CharKey) => sideOf.get(c) !== me.side;
  const attackable = (c: CharKey) => enemy(c) && !(guards[c] && !deadChars.has(guards[c]!));
  const act = (s: SkillView, target?: PlayerId, name?: CharKey): Action => {
    const a: Action = { type: 'skill', skill: s.key };
    if (target) a.target = target;
    if (name) a.name = name;
    return a;
  };

  const knownEnemies = alive.filter((p) => {
    const c = known.get(p.id);
    return c !== undefined && enemy(c);
  });
  const unknown = alive.filter((p) => !known.has(p.id));
  const claimsSide = (p: { published: CharKey | null }, side: number) => p.published !== null && sideOf.get(p.published) === side;

  // 1) 확실한 처치: 정체를 아는 적
  for (const p of knownEnemies) {
    const c = known.get(p.id)!;
    for (const [k, want] of Object.entries(NEEDS)) {
      const s = usable.get(k);
      if (s && c === want && k !== 'dantes_successor' && k !== 'advice') return act(s, p.id);
    }
    const reaver = usable.get('soul_reaver');
    if (reaver && (isCommander.get(c) || elapsed > 6 * MIN)) return act(reaver, p.id);
    if (!attackable(c)) continue;
    for (const k of ATTACKS) {
      const s = usable.get(k);
      if (s && s.nameOptions?.includes(c)) return act(s, p.id, c);
    }
  }
  // 백스탭: 나에게 동맹을 건 적 (또는 적 진영 이름을 공표한 사람)
  const backstab = usable.get('backstab');
  if (backstab) {
    const t = alive.find((p) => me.alliedBy.includes(p.id) && (known.has(p.id) ? enemy(known.get(p.id)!) : claimsSide(p, me.side === 1 ? 2 : 1)));
    if (t) return act(backstab, t.id);
  }
  // 아군 전용 조건부 스킬 (후계자 임명, 조언)
  for (const k of ['dantes_successor', 'advice'] as const) {
    const s = usable.get(k);
    const t = s && alive.find((p) => known.get(p.id) === NEEDS[k]);
    if (s && t) return act(s, t.id);
  }
  // 정체가 드러난 아군 지휘관 보호
  const rune = usable.get('rune_protection');
  if (rune) {
    const cmd = alive.find((p) => p.revealed && !enemy(p.revealed) && isCommander.get(p.revealed));
    if (cmd) return act(rune, cmd.id);
  }

  // 2) 공표. 지휘관은 진명을 숨기고, 나머지는 대체로 진명(턴 마나·진실의 조각). 가짜로 시작했어도 나중에 진명으로 바꾼다
  const publish = usable.get('publish');
  if (publish) {
    const commander = !!isCommander.get(me.character);
    const own = view.roster.filter((r) => r.inGame && r.side === me.side && !r.commander && r.key !== me.character).map((r) => r.key);
    if (me.published === null) {
      const honest = !commander && nextRandom(mem) < 0.75;
      const name = honest ? me.character : (pick(own) ?? me.character);
      if (publish.nameOptions?.includes(name)) return act(publish, undefined, name);
    } else if (!commander && !me.trueName && elapsed > 3 * MIN && nextRandom(mem) < 0.15 && publish.nameOptions?.includes(me.character)) {
      return act(publish, undefined, me.character);
    }
  }

  // 3) 진실의 보석: 모르는 사람 중 적 이름을 공표한 사람 우선
  const gem = usable.get('truth_gem');
  if (gem && unknown.length) {
    const t = unknown.find((p) => claimsSide(p, me.side === 1 ? 2 : 1)) ?? pick(unknown);
    if (t) return act(gem, t.id);
  }

  // 4) 정보 수집
  const roll = nextRandom(mem);
  if (unknown.length && roll < 0.75) {
    const allyClaim = unknown.filter((p) => claimsSide(p, me.side));
    const enemyClaim = unknown.filter((p) => claimsSide(p, me.side === 1 ? 2 : 1));
    for (const k of ['advanced_ally_check', 'ally_check'] as const) {
      const s = usable.get(k);
      const t = s && pick(allyClaim);
      if (s && t) return act(s, t.id);
    }
    for (const k of ['advanced_enemy_check', 'enemy_check'] as const) {
      const s = usable.get(k);
      const t = s && pick(enemyClaim);
      if (s && t) return act(s, t.id);
    }
    for (const [k, want] of Object.entries(PROBES)) {
      const s = usable.get(k);
      if (!s) continue;
      const pool = unknown.filter((p) => candidates.get(p.id)?.includes(want));
      const t = pool.find((p) => p.published === want) ?? pick(pool);
      if (t) return act(s, t.id);
    }
    for (const k of ['advanced_scan', 'scan', 'ally_scan', 'enemy_scan'] as const) {
      const s = usable.get(k);
      if (!s?.nameOptions) continue;
      const t = pick(unknown);
      const options = t ? (candidates.get(t.id) ?? []).filter((c) => s.nameOptions!.includes(c)) : [];
      const name = t && (t.published && options.includes(t.published) ? t.published : pick(options));
      if (t && name) return act(s, t.id, name);
    }
    for (const k of ['warrior_scent', 'oracle', 'shadow_eye', 'curse'] as const) {
      const s = usable.get(k);
      const t = s && pick(unknown);
      if (s && t) return act(s, t.id);
    }
    const lp = usable.get('libido_priestess');
    if (lp) return act(lp);
  }

  // 5) 방해: 아는 적 또는 적 이름을 공표한 사람
  if (roll >= 0.75 && roll < 0.85) {
    const pool = knownEnemies.length ? knownEnemies : alive.filter((p) => !known.has(p.id) && claimsSide(p, me.side === 1 ? 2 : 1));
    for (const k of DISRUPT) {
      const s = usable.get(k);
      const t = s && pick(pool);
      if (s && t) return act(s, t.id);
    }
  }

  // 6) 동맹: 같은 편 이름을 공표했고 적으로 확인되지 않은 사람 / 적으로 확인된 사람과는 파기
  const ally = usable.get('ally');
  const breakAlly = usable.get('break_ally');
  const toBreak = breakAlly && alive.find((p) => me.allies.includes(p.id) && known.has(p.id) && enemy(known.get(p.id)!));
  if (breakAlly && toBreak) return act(breakAlly, toBreak.id);
  if (ally && roll >= 0.85) {
    const friends = alive.filter((p) => !me.allies.includes(p.id) && (known.has(p.id) ? !enemy(known.get(p.id)!) : claimsSide(p, me.side)));
    const t = pick(friends);
    if (t) return act(ally, t.id);
  }

  // 7) 추측 공격: 시간이 지날수록 후보가 넓어도 시도한다. 후보가 가장 좁은 대상부터, 그 사람이 공표한 이름이 후보에 있으면 그 이름으로
  const guessLimit = elapsed > 30 * MIN ? 7 : elapsed > 20 * MIN ? 4 : elapsed > 12 * MIN ? 3 : elapsed > 8 * MIN ? 2 : elapsed > 4 * MIN ? 1 : 0;
  const guessChance = elapsed > 20 * MIN ? 0.7 : 0.4;
  if (guessLimit > 0 && nextRandom(mem) < guessChance) {
    const targets = alive
      .map((p) => {
        const all = candidates.get(p.id) ?? [];
        const c = all.filter((k) => attackable(k));
        // 적일 가능성: 후보 중 공격 가능한 적의 비율. 아군일 가능성이 높으면 건드리지 않는다
        return { p, all, c, enemyRatio: all.length ? c.length / all.length : 0 };
      })
      .filter((x) => x.c.length > 0 && x.enemyRatio >= 0.5 && x.all.length <= guessLimit);
    targets.sort((a, b) => a.all.length - b.all.length || b.enemyRatio - a.enemyRatio);
    const t = targets[0];
    if (t) {
      const name = t.p.published && t.c.includes(t.p.published) ? t.p.published : pick(t.c)!;
      const supreme = usable.get('supreme_attack');
      if (supreme?.nameOptions?.includes(name)) return act(supreme, t.p.id, name);
      const adv = usable.get('advanced_attack');
      if (adv && adv.nameOptions?.includes(name) && (adv.level === 1 || t.all.length <= 2)) return act(adv, t.p.id, name);
      const atk = usable.get('attack');
      if (atk && atk.nameOptions?.includes(name) && (t.all.length <= 2 || elapsed > 20 * MIN)) return act(atk, t.p.id, name);
    }
  }
  // 8) 카이의 소울 리버: 오래 끌리면 단테스일 가능성이 가장 높은 사람에게
  const reaver = usable.get('soul_reaver');
  if (reaver && elapsed > 15 * MIN && nextRandom(mem) < 0.3) {
    const pool = alive
      .map((p) => ({ p, all: candidates.get(p.id) ?? [] }))
      .filter((x) => x.all.some((c) => isCommander.get(c) && enemy(c)))
      .sort((a, b) => a.all.length - b.all.length);
    const t = pool[0];
    if (t && (t.all.length <= 3 || elapsed > 30 * MIN)) return act(reaver, t.p.id);
  }
  return null;
}
