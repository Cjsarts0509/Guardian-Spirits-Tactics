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

/** 후속 정책의 입력도 자기 관찰과 수신 가능한 사건뿐이다. 가설 배정은 받지 않는다. */
export function sequenceFollowup(view: PlayerView, knowledge: Knowledge, memory: BotMemory): { action: Action; information: number } | undefined {
  if (view.phase !== 'running' || !view.me.alive || !memory.perception) return undefined;
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
  const belief = assignmentBelief(view, knowledge, memory);
  const check = confirmationCandidates(view, belief, view.players.filter((p) => !knowledge.known.has(p.id)), view.me.skills)[0];
  return check && { action: check.action, information: check.score };
}

/** 재구성 로그의 seq를 현재 기억 다음으로 연결한다. 원본 기억은 변경하지 않는다. */
export function observeSequence(state: GameState, self: string, memory: BotMemory): Knowledge {
  return updateBotKnowledge(viewFor(state, self), eventsFor(state, self, memory.perception?.lastSeq ?? 0), memory);
}

const same = (a: Action, b: Action) => a.type === 'skill' && b.type === 'skill' &&
  a.skill === b.skill && a.target === b.target && a.name === b.name;

/** 첫 행동은 확인/공표, 두 번째는 관찰 결과에 따른 고정 정책. 실제 서버 상태는 입력하지 않는다.
 * 8개 배정 × 자원 끝점 2개 × 대응 유무 2개 × 첫 후보 최대 4개 = 최대 128 수순.
 * 배정별 자원/대응 최악값을 평균한다. 끝점에 확률을 부여하지 않는다.
 */
export function boundedSequenceSearch(view: PlayerView, knowledge: Knowledge, memory: BotMemory, baseline?: Action):
  { action: Action; score: number; simulations: number; followupEvaluations: number; followupCacheHits: number } | undefined {
  if (!memory.perception || view.phase !== 'running' || !view.me.alive || view.me.effects.length) return undefined;
  const belief = assignmentBelief(view, knowledge, memory);
  const ranked = confirmationCandidates(view, belief, view.players.filter((p) => !knowledge.known.has(p.id)), view.me.skills);
  if (!ranked.length) return undefined;
  const original = baseline && ranked.find((c) => same(c.action, baseline));
  const baselinePublish = baseline?.type === 'skill' && baseline.skill === 'publish' &&
    view.me.skills.some((s) => s.key === 'publish' && !s.passive && s.blocked === null && !!baseline.name && s.nameOptions?.includes(baseline.name));
  const candidates = original ? [original] : baseline && baselinePublish ? [{ action: baseline, score: 0 }] : [];
  for (const c of ranked) if (!candidates.some((p) => same(p.action, c.action)) && candidates.length < 3) candidates.push(c);
  const publish = view.me.skills.find((s) => s.key === 'publish' && !s.passive && s.blocked === null);
  if (publish?.nameOptions?.includes(view.me.character) && !view.me.trueName) {
    const action: Action = { type: 'skill', skill: 'publish', name: view.me.character };
    if (!candidates.some((c) => same(c.action, action))) candidates.push({ action, score: 0 });
  }
  const assignments = sampleAssignments(view, knowledge, memory, { rng: memory.rng ^ 0x53455155 }, 8);
  if (!assignments.length) return undefined;
  const worlds = assignments.map((assignment) => {
    const world = hypothesisWorld(view, knowledge, memory.perception!.battle, assignment);
    return hypothesisScenarios(world, view.me.id).map((scenario) => {
      const state = rolloutState(view, world, combatScenario(view, scenario, memory, true));
      state.seq = memory.perception!.lastSeq;
      return state;
    });
  });
  const horizon = Math.min(10_000, Math.max(0, view.nextTurnInMs - 1));
  // 같은 자기 뷰와 수신 이벤트는 같은 기존 기억에서 같은 후속 선택을 만든다.
  // 가설의 숨은 배정/자원은 캐시 키와 후속 정책 입력에 넣지 않는다.
  const followups = new Map<string, ReturnType<typeof sequenceFollowup>>();
  let followupEvaluations = 0, followupCacheHits = 0;
  let best: { action: Action; score: number } | undefined, simulations = 0;
  for (const candidate of candidates) {
    let total = 0;
    for (const states of worlds) {
      let worst = Infinity;
      for (const initial of states) for (const response of [false, true]) {
        simulations++;
        const state = structuredClone(initial);
        if (!applyAction(state, view.me.id, candidate.action, state.now).ok) { worst = -Infinity; continue; }
        if (response) respondToKnownEnemies(state, view.me.id, true);
        advance(state, view.elapsedMs + horizon);
        let information = 0;
        if (state.phase === 'running' && state.players.find((p) => p.id === view.me.id)!.alive) {
          const modeledView = viewFor(state, view.me.id);
          const received = eventsFor(state, view.me.id, memory.perception.lastSeq);
          const key = JSON.stringify([modeledView, received]);
          let followup: ReturnType<typeof sequenceFollowup>;
          if (followups.has(key)) { followup = followups.get(key); followupCacheHits++; }
          else {
            const modeledMemory = structuredClone(memory);
            const observed = updateBotKnowledge(modeledView, received, modeledMemory);
            followup = sequenceFollowup(modeledView, observed, modeledMemory);
            followups.set(key, followup); followupEvaluations++;
          }
          if (followup && applyAction(state, view.me.id, followup.action, state.now).ok) information = followup.information;
          if (response && state.phase === 'running') respondToKnownEnemies(state, view.me.id, true);
        }
        worst = Math.min(worst, positionScore(initial, state, view.me.id) + candidate.score + information);
      }
      total += worst;
    }
    const score = total / worlds.length;
    if (!best || score > best.score) best = { action: candidate.action, score };
  }
  return best && Number.isFinite(best.score) ? { ...best, simulations, followupEvaluations, followupCacheHits } : undefined;
}
