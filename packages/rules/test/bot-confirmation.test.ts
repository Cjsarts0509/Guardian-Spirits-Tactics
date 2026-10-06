import { describe, expect, it } from 'vitest';
import { botKnowledge, createBotMemory, smartBotAction, viewFor } from '../src/index.js';
import { bestConfirmation, hasIdentityEvidence } from '../src/bot-confirmation.js';
import type { AssignmentBelief } from '../src/bot-belief.js';
import { civilTable, fill } from './helpers.js';

describe('확인 후 공격', () => {
  it('공표와 경과 시간만으로 공격 증거를 만들지 않고 소거 정보는 인정한다', () => {
    const t = civilTable();
    t.publish('mertz', 'kai');
    t.tick(31 * 60_000);
    const view = viewFor(t.state, t.id.dantes!), memory = createBotMemory(1);
    const knowledge = botKnowledge(t.state, t.id.dantes!, view, memory);
    expect(hasIdentityEvidence(view, knowledge, memory, t.id.mertz!)).toBe(false);
    memory.perception!.excluded.set(t.id.mertz!, new Set(['kai']));
    const updated = botKnowledge(t.state, t.id.dantes!, view, memory);
    expect(hasIdentityEvidence(view, updated, memory, t.id.mertz!)).toBe(true);
  });

  it('아무 확인 정보가 없는 장기전에서도 공격·즉사기를 먼저 쓰지 않는다', () => {
    const t = civilTable();
    t.tick(31 * 60_000);
    for (const character of ['dantes', 'mertz', 'kelhu', 'freya', 'soen'] as const) {
      fill(t, character);
      const memory = createBotMemory(47);
      for (let i = 0; i < 100; i++) {
        const action = smartBotAction(t.state, t.id[character]!, memory, { activity: 1 });
        if (action?.type === 'skill') expect(['attack', 'advanced_attack', 'supreme_attack', 'soen_chain_murder', 'soul_reaver', 'dantes_command', 'backstab']).not.toContain(action.skill);
      }
    }
  });

  it('공개된 적 정체를 얻은 뒤에는 확정 공격을 허용한다', () => {
    const t = civilTable();
    t.tick(31 * 60_000);
    fill(t, 'dantes');
    t.state.revealed[t.id.krate!] = 'krate';
    const memory = createBotMemory(47);
    const action = smartBotAction(t.state, t.id.dantes!, memory, { activity: 1 });
    expect(action).toMatchObject({ type: 'skill', target: t.id.krate });
    if (action?.type === 'skill') expect(['attack', 'advanced_attack', 'supreme_attack']).toContain(action.skill);
  });

  it('동일한 결과를 얻는 스캔은 자원을 비교하며 패시브·쿨다운·사용 제한을 지킨다', () => {
    const t = civilTable(), view = viewFor(t.state, t.id.dantes!);
    const target = t.id.mertz!;
    const belief: AssignmentBelief = { consistent: true, probabilities: new Map([[target, new Map([['mertz', 0.5], ['freya', 0.5]])]]) };
    const base = view.me.skills.find((s) => s.key === 'advanced_scan')!;
    const cheap = { ...base, key: 'scan', mana: 5, cooldown: 10, cooldownRemainingMs: 0, blocked: null, usesLeft: null, nameOptions: ['mertz'] };
    const expensive = { ...cheap, key: 'advanced_scan', mana: 50, cooldown: 60 };
    const pool = [{ id: target }];
    expect(bestConfirmation(view, belief, pool, [expensive, cheap])).toEqual({ type: 'skill', skill: 'scan', target, name: 'mertz' });
    for (const blocked of [{ ...cheap, passive: true }, { ...cheap, cooldownRemainingMs: 1 }, { ...cheap, usesLeft: 0 }, { ...cheap, mana: 999 }, { ...cheap, blocked: '진명 필요' }]) {
      expect(bestConfirmation(view, belief, pool, [blocked])).toBeUndefined();
    }
    expect(bestConfirmation(view, { ...belief, consistent: false }, pool, [cheap])).toBeUndefined();
  });
});
