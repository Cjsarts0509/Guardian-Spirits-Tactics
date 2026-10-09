import { describe, expect, it } from 'vitest';
import { botKnowledge, createBotMemory, smartBotAction, viewFor } from '../src/index.js';
import { boundedSequenceSearch, sequenceFollowup } from '../src/bot-sequence.js';
import { civilTable, fill, modeTable, PRIMORDIAL_ORDER } from './helpers.js';

const options = { activity: 1, sequenceSearch: true, sequenceSkills: true, sequenceExtended: true };

describe('확장 수순의 전술 우선순위', () => {
  it('확인된 카이의 전용 처치를 불필요한 아군 확인으로 미루지 않는다', () => {
    const t = civilTable(); fill(t, 'dantes'); t.publish('dantes', 'dantes');
    t.state.revealed[t.id.kai!] = 'kai';
    expect(smartBotAction(t.state, t.id.dantes!, createBotMemory(11), options))
      .toEqual({ type: 'skill', skill: 'dantes_command', target: t.id.kai });
  });

  it('공격 가능한 확인된 적의 이름 공격을 다른 대상 확인으로 미루지 않는다', () => {
    const t = civilTable(); fill(t, 'arin'); t.publish('arin', 'arin');
    t.state.revealed[t.id.freya!] = 'freya';
    expect(smartBotAction(t.state, t.id.arin!, createBotMemory(11), options))
      .toEqual({ type: 'skill', skill: 'attack', target: t.id.freya, name: 'freya' });
  });

  it('확인된 적이 있으면 가설 후속에서도 최종 진화보다 준비된 공격을 먼저 쓴다', () => {
    const t = modeTable('primordial', PRIMORDIAL_ORDER); fill(t, 'consume');
    for (const key of ['consume_resistance', 'consume_iron_skin', 'advanced_attack'])
      t.p('consume').skills.push({ key, cooldownUntil: 0, usesLeft: null, level: 1 });
    t.state.revealed[t.id.kane!] = 'kane';
    const view = viewFor(t.state, t.id.consume!), memory = createBotMemory(11);
    const knowledge = botKnowledge(t.state, view.me.id, view, memory);
    expect(sequenceFollowup(view, knowledge, memory, true, true)?.action)
      .toMatchObject({ target: t.id.kane, name: 'kane' });
    expect(sequenceFollowup(view, knowledge, memory, true, true)?.action)
      .not.toMatchObject({ skill: 'consume_final_evolution' });
    // 공격 슬롯이 쿨다운이면 조건을 갖춘 성장 행동을 허용한다.
    for (const s of t.p('consume').skills) if (['attack', 'advanced_attack'].includes(s.key)) s.cooldownUntil = 1000;
    expect(sequenceFollowup(viewFor(t.state, view.me.id), knowledge, memory, true, true)?.action)
      .toEqual({ type: 'skill', skill: 'consume_final_evolution' });
  });

  it('성장도 가까운 턴도 없는 위치에서는 이전 25종 탐색과 결과가 완전히 같다', () => {
    const t = civilTable(); fill(t, 'arin'); t.publish('freya', 'freya');
    const view = viewFor(t.state, t.id.arin!), memory = createBotMemory(11);
    const knowledge = botKnowledge(t.state, view.me.id, view, memory);
    const before = structuredClone(view), perception = structuredClone(memory.perception);
    const prior = boundedSequenceSearch(view, knowledge, structuredClone(memory), undefined, true, false);
    const current = boundedSequenceSearch(view, knowledge, memory, undefined, true, true);
    expect(current).toBeDefined(); expect(current).toEqual(prior);
    expect(view).toEqual(before); expect(memory.perception).toEqual(perception); expect(memory.rng).toBe(11);
  });

  it('공표만 한 적은 수정된 우선순위에서도 확인된 공격 대상으로 취급하지 않는다', () => {
    const t = civilTable(); fill(t, 'arin'); t.publish('arin', 'arin'); t.publish('freya', 'freya');
    const action = smartBotAction(t.state, t.id.arin!, createBotMemory(11), options);
    expect(action).not.toMatchObject({ skill: 'attack', target: t.id.freya });
  });

  it('보석 등 기존 정보 행동도 확장 첫 후보에 없다는 이유로 빼앗지 않는다', () => {
    const t = civilTable(); fill(t, 'arin'); t.publish('arin', 'arin'); t.p('arin').gem = 3;
    const previous = smartBotAction(t.state, t.id.arin!, createBotMemory(11), { ...options, sequenceExtended: false });
    const current = smartBotAction(t.state, t.id.arin!, createBotMemory(11), options);
    expect(previous).toMatchObject({ skill: 'truth_gem' }); expect(current).toEqual(previous);
  });
});
