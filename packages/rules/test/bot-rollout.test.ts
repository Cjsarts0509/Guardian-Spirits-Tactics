import { describe, expect, it } from 'vitest';
import { botKnowledge, createBotMemory, sampleAssignments, viewFor } from '../src/index.js';
import { boundedAttackSearch, rolloutState } from '../src/bot-rollout.js';
import { hypothesisScenarios, hypothesisWorld } from '../src/bot-hypothesis.js';
import { civilTable, fill, modeTable, TROLL_ORDER } from './helpers.js';

describe('제한 공격 엔진 탐색', () => {
  it('자신만 관찰한 효과를 상대에게 공개하지 않고 공개 효과는 유지한다', () => {
    const t = civilTable(); fill(t, 'arin');
    expect(t.skill('arin', 'rune_protection', 'dantes').ok).toBe(true);
    const self = t.id.dantes!, other = t.id.krate!;
    for (const announced of [false, true]) {
      t.p('dantes').effects[0]!.announced = announced;
      const view = viewFor(t.state, self), memory = createBotMemory(7);
      const knowledge = botKnowledge(t.state, self, view, memory);
      const assignment = sampleAssignments(view, knowledge, memory, { rng: 1 }, 1)[0]!;
      const world = hypothesisWorld(view, knowledge, memory.perception!.battle, assignment);
      const state = rolloutState(view, world, hypothesisScenarios(world, self)[0]!);
      expect(viewFor(state, self).me.effects).toEqual(view.me.effects);
      expect(viewFor(state, other).players.find((p) => p.id === self)!.statuses)
        .toEqual(view.players.find((p) => p.id === self)!.statuses);
    }
  });

  it('데카가 마나를 소모해 버티는 공격도 방어 자원 소진으로 평가한다', () => {
    const t = modeTable('troll', TROLL_ORDER);
    t.p('satoshi').mana = 85; t.state.revealed[t.id.deka!] = 'deka';
    const view = viewFor(t.state, t.id.satoshi!), memory = createBotMemory(7);
    const knowledge = botKnowledge(t.state, view.me.id, view, memory);
    expect(boundedAttackSearch(view, knowledge, memory)!.action).toMatchObject({
      type: 'skill', skill: 'advanced_attack', target: t.id.deka, name: 'deka',
    });
  });
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
