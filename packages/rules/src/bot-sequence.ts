import type { Action, GameState } from './types.js';
import { advance, applyAction } from './engine/actions.js';
import { eventsFor, viewFor, type PlayerView } from './engine/view.js';
import { updateBotKnowledge, type BotMemory, type Knowledge } from './bot-memory.js';
import { assignmentBelief, sampleAssignments } from './bot-belief.js';
import { confirmationCandidates } from './bot-confirmation.js';
import { confirmedAttackValue } from './bot-confirmation-combat.js';
import { NAME_ATTACKS } from './bot-tactics.js';
import { hypothesisScenarios, hypothesisWorld } from './bot-hypothesis.js';
import { combatScenario, positionScore, rolloutState } from './bot-rollout.js';
import { respondToKnownEnemies } from './bot-response.js';
import { ROLE_INFORMATION, roleFollowup, roleInformationGain, rolePositionValue } from './bot-followup.js';
import { growthCandidates } from './bot-growth.js';
import { getMode } from './modes/index.js';
import type { ModeId } from './types.js';

/** 후속 정책의 입력도 자기 관찰과 수신 가능한 사건뿐이다. 가설 배정은 받지 않는다. */
export function sequenceFollowup(view: PlayerView, knowledge: Knowledge, memory: BotMemory, skills = false, extended = false): { action: Action; information: number } | undefined {
  if (view.phase !== 'running' || !view.me.alive || !memory.perception) return undefined;
  const growth = extended && growthCandidates(view, knowledge, memory).find((a) => a.type === 'skill' &&
    !['reckless_charge', 'soul_wall', 'destroyer_guidance'].includes(a.skill));
  if (growth) return { action: growth, information: 0 };
  const priority = skills && roleFollowup(view, knowledge, memory, true);
  if (priority) return { action: priority, information: 0 };
  const attacks = view.players.filter((p) => p.alive && !p.statuses.some((s) => s.kind === 'invulnerable')).flatMap((p) => {
    const name = knowledge.known.get(p.id);
    if (!name) return [];
    const value = confirmedAttackValue(view, memory.perception!.battle, name, view.me.mana);
    if (value <= 0) return [];
    return view.me.skills.filter((s) => NAME_ATTACKS.includes(s.key) && s.blocked === null && !s.passive &&
      s.cooldownRemainingMs === 0 && s.usesLeft !== 0 && s.mana <= view.me.mana && s.nameOptions?.includes(name))
      .map((s) => ({ action: { type: 'skill', skill: s.key, target: p.id, name } as Action, value }));
  }).sort((a, b) => b.value - a.value);
  if (attacks[0]) return { action: attacks[0].action, information: 0 };
  const role = skills && roleFollowup(view, knowledge, memory);
  if (role) return { action: role, information: 0 };
  const belief = assignmentBelief(view, knowledge, memory);
  const check = confirmationCandidates(view, belief, view.players.filter((p) => !knowledge.known.has(p.id)), view.me.skills)[0];
  return check && { action: check.action, information: check.score };
}

/** 재구성 로그의 seq를 현재 기억 다음으로 연결한다. 원본 기억은 변경하지 않는다. */
export function observeSequence(state: GameState, self: string, memory: BotMemory): Knowledge {
  return updateBotKnowledge(viewFor(state, self), eventsFor(state, self, memory.perception?.lastSeq ?? 0), memory);
}

/** 공표가 모두 관측된 경우만 실제 턴 규칙을 예측한다. 미공표자의 자동 공표를 추측하지 않는다. */
export function scheduleObservedTurn(state: GameState, view: PlayerView): boolean {
  if (view.nextTurnInMs > 30_000 || view.players.some((p) => p.alive && p.published === null)) return false;
  state.queue.push({ id: ++state.taskSeq, at: state.nextTurnAt, kind: 'turn', payload: {} });
  const own = getMode(view.mode as ModeId).characters.find((p) => p.key === view.me.character)!;
  for (const u of own.unlocks ?? []) if (u.at * 1000 > view.elapsedMs && u.at * 1000 <= state.nextTurnAt) {
    state.queue.push({ id: ++state.taskSeq, at: u.at * 1000, kind: 'unlock', payload: {
      player: view.me.id, skill: u.skill, ...(u.requires ? { requires: u.requires } : {}), ...(u.replaces ? { replaces: u.replaces } : {}),
    } });
  }
  state.queue.sort((a, b) => a.at - b.at);
  return true;
}

/** 희생은 개인 생존 패널티 대신 팀의 손실·보호·최종 승패로 평가한다. */
export function extendedPositionScore(initial: GameState, state: GameState, self: string): number {
  const me = state.players.find((p) => p.id === self)!;
  if (state.winner !== null) return positionScore(initial, state, self);
  const before = initial.players.find((p) => p.id === self)!;
  const development = me.alive ? (me.gem - before.gem) / 2 +
    me.skills.filter((s) => !before.skills.some((q) => q.key === s.key)).length / 2 : 0;
  if (me.alive) return positionScore(initial, state, self) + development;
  const proxy = structuredClone(state), own = proxy.players.find((p) => p.id === self)!;
  own.alive = true; own.mana = 0;
  return positionScore(initial, proxy, self) - (getMode(state.mode).characters.find((p) => p.key === me.character)!.commander ? 20 : 4);
}

const same = (a: Action, b: Action) => a.type === 'skill' && b.type === 'skill' &&
  a.skill === b.skill && a.target === b.target && a.name === b.name;

/** 기본 첫 행동은 확인/공표, 확장은 관측된 성장/희생 후보도 비교한다.
 * 후속 행동은 자기 관찰 정책으로만 고른다. 실제 서버 상태는 입력하지 않는다.
 * 8개 배정 × 자원 끝점 2개 × 대응 유무 2개 × 첫 후보 최대 4개 = 최대 128 수순.
 * 배정별 자원/대응 최악값을 평균한다. 끝점에 확률을 부여하지 않는다.
 */
export function boundedSequenceSearch(view: PlayerView, knowledge: Knowledge, memory: BotMemory, baseline?: Action, skills = false, extended = false):
  { action: Action; score: number; simulations: number; followupEvaluations: number; followupCacheHits: number } | undefined {
  if (!memory.perception || view.phase !== 'running' || !view.me.alive || view.me.effects.length) return undefined;
  const belief = assignmentBelief(view, knowledge, memory);
  const ranked = confirmationCandidates(view, belief, view.players.filter((p) => !knowledge.known.has(p.id)), view.me.skills);
  const growth = extended ? growthCandidates(view, knowledge, memory) : [];
  if (!ranked.length && !growth.length) return undefined;
  const original = baseline && ranked.find((c) => same(c.action, baseline));
  const baselinePublish = baseline?.type === 'skill' && baseline.skill === 'publish' &&
    view.me.skills.some((s) => s.key === 'publish' && !s.passive && s.blocked === null && !!baseline.name && s.nameOptions?.includes(baseline.name));
  const candidates = original ? [original] : baseline && baselinePublish ? [{ action: baseline, score: 0 }] : [];
  for (const c of ranked) if (!candidates.some((p) => same(p.action, c.action)) && candidates.length < 3) candidates.push(c);
  if (extended) {
    // 동일한 네 후보 예산 안에서 확인 2개와 성장/희생 2개를 비교한다.
    candidates.splice(2);
    for (const action of growth.slice(0, 2)) if (!candidates.some((p) => same(p.action, action))) candidates.push({ action, score: 0 });
  }
  const publish = view.me.skills.find((s) => s.key === 'publish' && !s.passive && s.blocked === null);
  if (publish?.nameOptions?.includes(view.me.character) && !view.me.trueName) {
    const action: Action = { type: 'skill', skill: 'publish', name: view.me.character };
    if (!candidates.some((c) => same(c.action, action)) && (!extended || candidates.length < 4)) candidates.push({ action, score: 0 });
  }
  const assignments = sampleAssignments(view, knowledge, memory, { rng: memory.rng ^ 0x53455155 }, 8);
  if (!assignments.length) return undefined;
  const worlds = assignments.map((assignment) => {
    const world = hypothesisWorld(view, knowledge, memory.perception!.battle, assignment);
    return hypothesisScenarios(world, view.me.id).map((scenario) => {
      const state = rolloutState(view, world, combatScenario(view, scenario, memory, true));
      if (extended) {
        state.modeState.chiefProtected = memory.perception!.chiefProtected;
        // 상대 보석은 관측되지 않았다. 끝점 스트레스 가정으로만 복원한다.
        for (const p of state.players) if (p.id !== view.me.id) p.gem =
          (scenario.assumption === 'opponents-strong' ? p.side !== view.me.side : p.side === view.me.side) ? 3 : 0;
        scheduleObservedTurn(state, view);
      }
      state.seq = memory.perception!.lastSeq;
      return state;
    });
  });
  const horizon = Math.min(10_000, Math.max(0, view.nextTurnInMs - 1));
  // 같은 자기 뷰와 수신 이벤트는 같은 기존 기억에서 같은 후속 선택을 만든다.
  // 가설의 숨은 배정/자원은 캐시 키와 후속 정책 입력에 넣지 않는다.
  const followups = new Map<string, ReturnType<typeof sequenceFollowup>>();
  const informationGains = new Map<string, number>();
  let followupEvaluations = 0, followupCacheHits = 0;
  const selectFollowup = (state: GameState) => {
    const modeledView = viewFor(state, view.me.id), received = eventsFor(state, view.me.id, memory.perception!.lastSeq);
    const key = JSON.stringify([modeledView, received]);
    if (followups.has(key)) { followupCacheHits++; return followups.get(key); }
    const modeledMemory = structuredClone(memory), observed = updateBotKnowledge(modeledView, received, modeledMemory);
    const followup = sequenceFollowup(modeledView, observed, modeledMemory, skills, extended);
    followups.set(key, followup); followupEvaluations++;
    return followup;
  };
  let best: { action: Action; score: number } | undefined, simulations = 0;
  for (const candidate of candidates) {
    let total = 0;
    for (const states of worlds) {
      let worst = Infinity;
      for (const initial of states) for (const response of [false, true]) {
        simulations++;
        const state = structuredClone(initial);
        if (!applyAction(state, view.me.id, candidate.action, state.now).ok) { worst = -Infinity; continue; }
        // 첫 공표로 마지막 미공표자가 없어지는 경우도 턴 보너스를 평가한다.
        if (extended && state.phase === 'running' && !state.queue.some((t) => t.kind === 'turn'))
          scheduleObservedTurn(state, viewFor(state, view.me.id));
        const projectedTurn = extended && state.queue.some((t) => t.kind === 'turn');
        if (response) respondToKnownEnemies(state, view.me.id, true);
        advance(state, view.elapsedMs + horizon);
        let information = 0;
        if (state.phase === 'running' && state.players.find((p) => p.id === view.me.id)!.alive) {
          const modeledView = viewFor(state, view.me.id);
          const received = eventsFor(state, view.me.id, memory.perception.lastSeq);
          const followup = selectFollowup(state);
          if (followup && applyAction(state, view.me.id, followup.action, state.now).ok) {
            information = followup.information;
            if (skills && followup.action.type === 'skill' && ROLE_INFORMATION.has(followup.action.skill)) {
              const after = viewFor(state, view.me.id), last = eventsFor(state, view.me.id, memory.perception.lastSeq);
              const resultKey = JSON.stringify([modeledView, received, after, last]);
              let gain = informationGains.get(resultKey);
              if (gain === undefined) {
                gain = roleInformationGain(modeledView, received, after, last, memory);
                const cost = modeledView.me.skills.find((s) => followup.action.type === 'skill' && s.key === followup.action.skill)!;
                gain /= 1 + cost.mana / 50 + cost.cooldown / 60;
                informationGains.set(resultKey, gain);
              }
              information += gain;
            }
          }
          if (response && state.phase === 'running') respondToKnownEnemies(state, view.me.id, true);
        }
        if (projectedTurn && state.phase === 'running') {
          advance(state, initial.nextTurnAt);
          if (response) respondToKnownEnemies(state, view.me.id, true);
          if (state.phase === 'running' && state.players.find((p) => p.id === view.me.id)!.alive) {
            const followup = selectFollowup(state);
            if (followup) applyAction(state, view.me.id, followup.action, state.now);
            if (response && state.phase === 'running') respondToKnownEnemies(state, view.me.id, true);
          }
        }
        worst = Math.min(worst, (extended ? extendedPositionScore(initial, state, view.me.id) : positionScore(initial, state, view.me.id)) + candidate.score + information +
          (skills ? rolePositionValue(initial, state, view.me.id) : 0));
      }
      total += worst;
    }
    const score = total / worlds.length;
    if (!best || score > best.score) best = { action: candidate.action, score };
  }
  return best && Number.isFinite(best.score) ? { ...best, simulations, followupEvaluations, followupCacheHits } : undefined;
}
