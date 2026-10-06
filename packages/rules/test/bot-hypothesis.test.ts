import { describe, expect, it } from 'vitest';
import { botKnowledge, createBotMemory, sampleAssignments, viewFor } from '../src/index.js';
import { hypothesisScenarios, hypothesisWorld } from '../src/bot-hypothesis.js';
import { createBattleMemory } from '../src/bot-tactics.js';
import { civilTable, modeTable, TROLL_ORDER } from './helpers.js';

function setup() {
  const t = civilTable(), view = viewFor(t.state, t.id.kai!), memory = createBotMemory(8);
  const knowledge = botKnowledge(t.state, view.me.id, view, memory);
  const assignment = sampleAssignments(view, knowledge, memory, { rng: 99 }, 1)[0]!;
  return { t, view, memory, knowledge, assignment };
}

describe('가설 자원과 방어 범위', () => {
  it('자기 자원은 정확히 유지하고 상대 마나·스킬 존재는 불확실하게 둔다', () => {
    const { view, memory, knowledge, assignment } = setup();
    const world = hypothesisWorld(view, knowledge, memory.perception!.battle, assignment);
    const self = world.players.get(view.me.id)!;
    expect(self.mana).toEqual([view.me.mana, view.me.mana]);
    expect(self.lives).toEqual([view.me.extraLives + 1, view.me.extraLives + 1]);
    expect(self.skills.map((s) => s.key)).toEqual(view.me.skills.map((s) => s.key));
    for (const [id, p] of world.players) if (id !== view.me.id) {
      expect(p.mana).toEqual([0, 150]);
      expect(p.skills.every((s) => s.present[0] === 0 && s.present[1] === 1)).toBe(true);
    }
    const scenarios = hypothesisScenarios(world, view.me.id);
    expect(scenarios[0]!.players.get(view.me.id)).toEqual(scenarios[1]!.players.get(view.me.id));
    const enemy = [...world.players].find(([id, p]) => id !== view.me.id && p.side !== view.me.side)![0];
    expect(scenarios[0]!.players.get(enemy)!.mana).toBe(150);
    expect(scenarios[1]!.players.get(enemy)!.mana).toBe(0);
    scenarios[0]!.players.get(enemy)!.statuses.push({ kind: 'test', source: 'test', remainingMs: 1 });
    expect(world.players.get(enemy)!.statuses).toEqual([]);
  });

  it('실제 상대 마나·스킬·목숨을 바꿔도 같은 관찰의 가설 상태는 같다', () => {
    const { t, view, memory, knowledge, assignment } = setup();
    const before = hypothesisWorld(view, knowledge, memory.perception!.battle, assignment);
    const hidden = t.p('mertz'); hidden.mana = 0; hidden.extraLives = 3; hidden.skills = [];
    const afterView = viewFor(t.state, view.me.id);
    expect(afterView).toEqual(view);
    expect(hypothesisWorld(afterView, knowledge, memory.perception!.battle, assignment)).toEqual(before);
  });

  it('중복 역할과 확인 제약 위반 배정을 거절한다', () => {
    const { view, memory, knowledge, assignment } = setup();
    const broken = new Map(assignment), target = [...assignment.keys()].find((id) => id !== view.me.id)!;
    broken.set(target, view.me.character);
    expect(() => hypothesisWorld(view, knowledge, memory.perception!.battle, broken)).toThrow();
    knowledge.known.set(target, view.me.character);
    expect(() => hypothesisWorld(view, knowledge, memory.perception!.battle, assignment)).toThrow();
  });

  it('관찰된 쿨다운은 사용 가능 범위를 제한하고 광폭화 초기화 가능성은 남긴다', () => {
    const t = modeTable('troll', TROLL_ORDER), view = viewFor(t.state, t.id.chis!), memory = createBotMemory(2);
    const knowledge = botKnowledge(t.state, view.me.id, view, memory), battle = createBattleMemory();
    const assignment = new Map(t.state.players.map((p) => [p.id, p.character]));
    for (const role of ['neonis', 'kazrow']) battle.timings.set(`${role}:${role === 'kazrow' ? 'advanced_attack' : 'attack'}`, { readyEarliest: 60_000, readyLatest: 60_000, usedMin: 1, usedMax: 1 });
    const world = hypothesisWorld(view, knowledge, battle, assignment);
    expect(world.players.get(t.id.neonis!)!.skills.find((s) => s.key === 'attack')!.cooldownRemainingMs[0]).toBe(60_000);
    expect(world.players.get(t.id.kazrow!)!.skills.find((s) => s.key === 'advanced_attack')!.cooldownRemainingMs[0]).toBe(0);
  });
});
