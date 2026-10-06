import type { Action, GameState, ModeId } from './types.js';
import type { PlayerView } from './engine/view.js';
import type { BotMemory, Knowledge } from './bot-memory.js';
import { createGame } from './engine/create.js';
import { advance, applyAction } from './engine/actions.js';
import { getMode } from './modes/index.js';
import { skillRegistry } from './skills/registry.js';
import { respondToKnownEnemies } from './bot-response.js';
import { NAME_ATTACKS, estimatedHits } from './bot-tactics.js';
import { sampleAssignments } from './bot-belief.js';
import { hypothesisScenarios, hypothesisWorld, type HypothesisScenario, type HypothesisWorld } from './bot-hypothesis.js';

/** 가설로부터 새 엔진 상태를 만든다. 실제 GameState는 입력하지 않는다.
 * 미관측 예약 작업·상대 조건부 flags·미래 해금은 재현하지 않는 제한 어댑터다.
 */
export function rolloutState(view: PlayerView, world: HypothesisWorld, scenario: HypothesisScenario): GameState {
  const mode = getMode(view.mode as ModeId);
  const state = createGame({ mode: view.mode as ModeId, now: 0, seed: 0,
    players: view.players.map((p) => ({ id: p.id, nickname: p.nickname })),
    assignment: Object.fromEntries([...world.players].map(([id, p]) => [id, p.character])) }).state;
  state.now = view.elapsedMs; state.turn = view.turn;
  state.nextTurnAt = view.elapsedMs + view.nextTurnInMs;
  state.queue = []; state.log = []; state.seq = 0; state.revealed = {};
  for (const p of state.players) {
    const hypothesis = scenario.players.get(p.id)!, observed = view.players.find((q) => q.id === p.id)!;
    p.alive = hypothesis.alive; p.left = observed.left; p.diedAt = p.alive ? null : state.now;
    p.mana = hypothesis.mana; p.extraLives = Math.max(0, hypothesis.lives - 1); p.published = observed.published;
    p.flags = p.id === view.me.id ? { ...view.me.flags } : { guardCharges: hypothesis.guardCharges };
    p.skills = hypothesis.skills.filter((s) => s.present && !((mode.skills[s.key] ?? skillRegistry[s.key])?.item)).map((s) => ({
      key: s.key, cooldownUntil: state.now + s.cooldownRemainingMs, usesLeft: s.usesLeft,
      level: p.id === view.me.id ? view.me.skills.find((q) => q.key === s.key)!.level : 1,
    }));
    p.effects = hypothesis.statuses.filter((s) => s.kind === 'incapacitated' || s.kind === 'invulnerable').map((s) => ({
      id: ++state.effectSeq, kind: s.kind as 'incapacitated' | 'invulnerable', source: s.source,
      until: state.now + s.remainingMs, announced: true,
    }));
    if (observed.revealed) state.revealed[p.id] = observed.revealed;
    if (p.id === view.me.id) {
      p.allies = [...view.me.allies]; p.gem = view.me.gem;
      p.gemCooldownUntil = state.now + view.me.gemCooldownRemainingMs;
    } else {
      p.allies = p.allies.filter((id) => id !== view.me.id);
      if (view.me.alliedBy.includes(p.id)) p.allies.push(view.me.id);
    }
  }
  return state;
}

/** 공격/방어에 필요한 기본 보유와 교체 관계만 복원한다. 전체 도달 가능성 증명은 아니다. */
export function combatScenario(view: PlayerView, scenario: HypothesisScenario, memory: BotMemory): HypothesisScenario {
  const result = structuredClone(scenario), mode = getMode(view.mode as ModeId);
  for (const [id, p] of result.players) {
    if (id === view.me.id) continue;
    const def = mode.characters.find((r) => r.key === p.character)!;
    const base = new Set([...def.skills, ...(def.unlocks ?? []).filter((u) => u.at * 1000 <= view.elapsedMs).map((u) => u.skill)]);
    for (const skill of p.skills) if (base.has(skill.key)) skill.present = true;
    const replacements: [string, string[]][] = [
      ['advanced_attack', ['attack']], ['supreme_attack', ['advanced_attack', 'attack']],
      ['advanced_scan', ['scan']], ['greater_mass_teleport', ['mass_teleport']],
      ['kilder_master_power', ['kilder_casanova']],
      ...((def.unlocks ?? []).filter((u) => !!u.replaces).map((u): [string, string[]] => [u.skill, [u.replaces!]])),
    ];
    const has = (key: string) => p.skills.some((s) => s.key === key && s.present);
    for (const [replacement, removed] of replacements) if (has(replacement)) {
      for (const skill of p.skills) if (removed.includes(skill.key)) skill.present = false;
    }
    if (view.mode === 'primordial' && p.character === 'sasint' && has('advanced_attack')) {
      for (const skill of p.skills) if (skill.key === 'sasint_support') skill.present = false;
    }
    if (view.mode === 'troll' && p.character === 'seirow' && has('advanced_attack')) {
      for (const skill of p.skills) if (skill.key === 'advanced_ally_check') skill.present = false;
    }
    if (view.mode === 'troll' && p.character === 'deka' && memory.perception?.madnessPurged) {
      for (const skill of p.skills) if (skill.key === 'bloody_madness') skill.present = false;
    }
  }
  return result;
}

function positionScore(initial: GameState, state: GameState, self: string): number {
  const me = state.players.find((p) => p.id === self)!;
  if (state.winner !== null) return state.winner === me.side ? 1000 : -1000;
  if (!me.alive) return -100;
  let score = me.mana / 100;
  const mode = getMode(state.mode);
  for (const p of state.players) {
    const before = initial.players.find((q) => q.id === p.id)!;
    if (!before.alive) continue;
    const sign = p.side === me.side ? -1 : 1;
    if (!p.alive) score += sign * (mode.characters.find((r) => r.key === p.character)!.commander ? 20 : 4);
    else {
      score += sign * (before.extraLives - p.extraLives + (Number(before.flags.guardCharges ?? 0) - Number(p.flags.guardCharges ?? 0)) * 0.5);
      // 데카의 방어는 목숨/횟수가 아니라 마나를 소모한다. 이를 빼면 탐색이
      // 공격 비용만 보고 반복 대기하며 방어 자원을 소진시키지 않는다.
      if (before.skills.some((s) => s.key === 'bloody_madness')) score += sign * Math.max(0, before.mana - p.mana) * 0.04;
    }
  }
  return score;
}

/** 정체가 확인된 적의 이름 공격/대기만, 고정된 두 행동 수순을 동일 가설들에서 비교한다.
 * 세계별 비공개 상태를 보고 다른 후속 행동을 고르는 전략 융합을 하지 않는다.
 */
export function boundedAttackSearch(view: PlayerView, knowledge: Knowledge, memory: BotMemory, responses = false,
  baseline?: Action): { action: Action | null; simulations: number; score: number } | undefined {
  if (!memory.perception || view.phase !== 'running' || view.me.effects.length) return undefined;
  const roles = new Map(view.roster.map((r) => [r.key, r]));
  const enemies = view.players.filter((p) => p.alive && knowledge.known.has(p.id) &&
    roles.get(knowledge.known.get(p.id)!)?.side !== view.me.side && !p.statuses.some((s) => s.kind === 'invulnerable'));
  enemies.sort((a, b) => Number(roles.get(knowledge.known.get(b.id)!)!.commander) - Number(roles.get(knowledge.known.get(a.id)!)!.commander) ||
    estimatedHits(view, memory.perception!.battle, knowledge.known.get(a.id)!) - estimatedHits(view, memory.perception!.battle, knowledge.known.get(b.id)!));
  const allowed = enemies.flatMap((p) => view.me.skills.filter((s) => NAME_ATTACKS.includes(s.key) &&
    !s.passive && s.blocked === null && s.nameOptions?.includes(knowledge.known.get(p.id)!)).map((s): Action =>
    ({ type: 'skill', skill: s.key, target: p.id, name: knowledge.known.get(p.id)! })));
  const same = (a: Action, b: Action) => JSON.stringify(a) === JSON.stringify(b);
  const original = baseline && allowed.find((a) => same(a, baseline));
  const candidates: (Action | null)[] = (original ? [original, ...allowed.filter((a) => !same(a, original))] : allowed).slice(0, 3);
  if (!candidates.length) return undefined;
  candidates.push(null);
  const worlds = sampleAssignments(view, knowledge, memory, { rng: memory.rng ^ 0x53454152 }, 2);
  if (!worlds.length) return undefined;
  const states = worlds.flatMap((assignment) => {
    const world = hypothesisWorld(view, knowledge, memory.perception!.battle, assignment);
    return hypothesisScenarios(world, view.me.id).map((scenario) => rolloutState(view, world,
      responses ? combatScenario(view, scenario, memory) : scenario));
  });
  const horizon = Math.min(10_000, responses ? Math.max(0, view.nextTurnInMs - 1) : view.nextTurnInMs);
  let best: { action: Action | null; score: number } | undefined, simulations = 0;
  for (const first of candidates) {
    // 동일 첫 행동·대응·시간 진행은 후속 후보 사이에 재사용한다.
    const prefixes = states.flatMap((initial) => (responses ? [false, true] : [false]).map((response) => {
      const state = structuredClone(initial);
      const valid = !first || applyAction(state, view.me.id, first, state.now).ok;
      if (valid) {
        if (response) respondToKnownEnemies(state, view.me.id);
        advance(state, view.elapsedMs + horizon);
      }
      return { initial, state, response, valid };
    }));
    for (const second of candidates) {
    let worst = Infinity;
    for (const { initial, state: prefix, response, valid } of prefixes) {
      simulations++;
      if (!valid) { worst = -Infinity; break; }
      const state = structuredClone(prefix);
      if (state.phase === 'running' && second) applyAction(state, view.me.id, second, state.now);
      if (response && state.phase === 'running') respondToKnownEnemies(state, view.me.id);
      worst = Math.min(worst, positionScore(initial, state, view.me.id));
    }
    if (!best || worst > best.score) best = { action: first, score: worst };
    }
  }
  return best && Number.isFinite(best.score) ? { ...best, simulations } : undefined;
}
