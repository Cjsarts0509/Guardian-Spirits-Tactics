import { describe, expect, it } from 'vitest';
import { botKnowledge, createBotMemory, hypothesisScenarios, hypothesisWorld, viewFor } from '../src/index.js';
import { combatScenario, boundedAttackSearch, rolloutState } from '../src/bot-rollout.js';
import { respondToKnownEnemies } from '../src/bot-response.js';
import { civilTable, fill, modeTable, PRIMORDIAL_ORDER } from './helpers.js';

describe('가설 상대의 관찰 기반 대응', () => {
  it('상대가 대상 정체를 모르면 가설 배정을 알아도 공격하지 않는다', () => {
    const t = civilTable(); fill(t, 'kaspa');
    for (const p of t.state.players) if (p.character !== 'kaspa') p.mana = 0;
    expect(respondToKnownEnemies(t.state, t.id.mertz!)).toBe(0);
    expect(t.p('mertz').alive).toBe(true);
  });

  it('공개 확인된 적에게 자기 마나와 쿨다운이 허용할 때만 대응한다', () => {
    const t = civilTable(); fill(t, 'kaspa');
    for (const p of t.state.players) if (p.character !== 'kaspa') p.mana = 0;
    t.state.revealed[t.id.mertz!] = 'mertz';
    const skill = t.p('kaspa').skills.find((s) => s.key === 'attack')!;
    skill.cooldownUntil = 1000;
    expect(respondToKnownEnemies(t.state, t.id.mertz!)).toBe(0);
    skill.cooldownUntil = 0; t.p('kaspa').mana = 0;
    expect(respondToKnownEnemies(t.state, t.id.mertz!)).toBe(0);
    t.p('kaspa').mana = 150;
    expect(respondToKnownEnemies(t.state, t.id.mertz!)).toBe(1);
    expect(t.p('mertz').alive).toBe(false);
    expect(skill.cooldownUntil).toBeGreaterThan(0);
  });

  it('공개 보호 상태와 자기 행동 불능을 존중한다', () => {
    const t = civilTable(); fill(t, 'kaspa');
    for (const p of t.state.players) if (p.character !== 'kaspa') p.mana = 0;
    t.state.revealed[t.id.mertz!] = 'mertz';
    t.p('mertz').effects.push({ id: 1, kind: 'invulnerable', source: 'rune_protection', until: 1000, announced: true });
    expect(respondToKnownEnemies(t.state, t.id.mertz!)).toBe(0);
    t.p('mertz').effects = [];
    t.p('kaspa').effects.push({ id: 2, kind: 'incapacitated', source: 'confusion', until: 1000, announced: true });
    expect(respondToKnownEnemies(t.state, t.id.mertz!)).toBe(0);
  });

  it('기본 스킬을 유지하고 획득 공격 및 시간 해금의 교체 관계를 지킨다', () => {
    const t = modeTable('primordial', PRIMORDIAL_ORDER); t.tick(400_000);
    const view = viewFor(t.state, t.id.kane!), memory = createBotMemory(2);
    const knowledge = botKnowledge(t.state, view.me.id, view, memory);
    const world = hypothesisWorld(view, knowledge, memory.perception!.battle,
      new Map(t.state.players.map((p) => [p.id, p.character])));
    const endpoints = hypothesisScenarios(world, view.me.id);
    for (const endpoint of endpoints) {
      const model = combatScenario(view, endpoint, memory), state = rolloutState(view, world, model);
      const rael = state.players.find((p) => p.character === 'rael')!;
      expect(rael.skills.some((s) => s.key === 'rael_adv_leadership')).toBe(true);
      expect(rael.skills.some((s) => s.key === 'rael_leadership')).toBe(false);
      const consume = state.players.find((p) => p.character === 'consume')!;
      expect(consume.skills.filter((s) => ['attack', 'advanced_attack'].includes(s.key))).toHaveLength(1);
      expect(consume.skills.some((s) => s.key === 'consume_final_evolution')).toBe(true);
    }
    expect(endpoints[0]!.players.get(t.id.consume!)!.skills.some((s) => s.key === 'attack' && s.present)).toBe(true);
  });

  it('対応ありでも実観測と行動 RNG を保全して最大128回に収まる', () => {
    const t = civilTable(); fill(t, 'dantes'); t.state.revealed[t.id.krate!] = 'krate';
    const view = viewFor(t.state, t.id.dantes!), memory = createBotMemory(7);
    const knowledge = botKnowledge(t.state, view.me.id, view, memory), before = structuredClone(view);
    const result = boundedAttackSearch(view, knowledge, memory, true)!;
    expect(result.simulations).toBeLessThanOrEqual(128);
    expect(result.action).toMatchObject({ target: t.id.krate });
    expect(view).toEqual(before); expect(memory.rng).toBe(7);
  });
});
