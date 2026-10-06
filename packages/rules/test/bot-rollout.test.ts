import { describe, expect, it } from 'vitest';
import { botKnowledge, createBotMemory, sampleAssignments, viewFor } from '../src/index.js';
import { boundedAttackSearch, rolloutState } from '../src/bot-rollout.js';
import { hypothesisScenarios, hypothesisWorld } from '../src/bot-hypothesis.js';
import { civilTable, fill } from './helpers.js';

describe('제한 공격 엔진 탐색', () => {
  it('정체 정보 없이는 후보 공격을 만들지 않는다', () => {
    const t = civilTable(), view = viewFor(t.state, t.id.dantes!), memory = createBotMemory(7);
    const knowledge = botKnowledge(t.state, view.me.id, view, memory);
    expect(boundedAttackSearch(view, knowledge, memory)).toBeUndefined();
    expect(memory.rng).toBe(7);
  });

  it('확인된 보호 없는 적에게는 즉시 공격하고 행동 RNG와 입력을 보존한다', () => {
    const t = civilTable(); fill(t, 'dantes'); t.state.revealed[t.id.krate!] = 'krate';
    const view = viewFor(t.state, t.id.dantes!), memory = createBotMemory(7);
    const knowledge = botKnowledge(t.state, view.me.id, view, memory);
    const before = structuredClone(view), known = new Map(knowledge.known);
    const result = boundedAttackSearch(view, knowledge, memory)!;
    expect(result.action).toMatchObject({ type: 'skill', target: t.id.krate, name: 'krate' });
    expect(result.simulations).toBeLessThanOrEqual(64);
    expect(memory.rng).toBe(7); expect(knowledge.known).toEqual(known); expect(view).toEqual(before);
  });

  it('살아 있는 영구 보디가드에 막히는 공격은 대기보다 좋다고 평가하지 않는다', () => {
    const t = civilTable(); fill(t, 'dantes'); t.state.revealed[t.id.kai!] = 'kai';
    const view = viewFor(t.state, t.id.dantes!), memory = createBotMemory(7);
    const knowledge = botKnowledge(t.state, view.me.id, view, memory);
    expect(boundedAttackSearch(view, knowledge, memory)!.action).toBeNull();
  });

  it('복원 엔진 상태는 자기 공개/비공개 관찰만 유지하고 가짜 과거 이벤트를 제거한다', () => {
    const t = civilTable(), view = viewFor(t.state, t.id.dantes!), memory = createBotMemory(7);
    const knowledge = botKnowledge(t.state, view.me.id, view, memory);
    const assignment = sampleAssignments(view, knowledge, memory, { rng: 1 }, 1)[0]!;
    const world = hypothesisWorld(view, knowledge, memory.perception!.battle, assignment);
    const state = rolloutState(view, world, hypothesisScenarios(world, view.me.id)[0]!);
    const self = state.players.find((p) => p.id === view.me.id)!;
    expect(self.mana).toBe(view.me.mana); expect(self.flags).toEqual(view.me.flags);
    expect(self.extraLives).toBe(view.me.extraLives); expect(self.allies).toEqual(view.me.allies);
    expect(state.log).toEqual([]); expect(state.queue).toEqual([]);
    self.mana = 0; expect(view.me.mana).toBeGreaterThan(0);
  });
});
