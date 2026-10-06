import { describe, expect, it } from 'vitest';
import { applyAction, botKnowledge, createBotMemory, viewFor } from '../src/index.js';
import { boundedSequenceSearch, observeSequence, sequenceFollowup } from '../src/bot-sequence.js';
import { civilTable, fill } from './helpers.js';

describe('확인과 공표 후 관찰 기반 수순', () => {
  it('공표만 믿고 공격하지 않고 자기 확인 결과를 받은 뒤에만 이름 공격한다', () => {
    const t = civilTable(); fill(t, 'dantes');
    t.p('dantes').skills.push({ key: 'enemy_check', cooldownUntil: 0, usesLeft: null, level: 1 });
    t.publish('krate', 'krate');
    const memory = createBotMemory(7), view = viewFor(t.state, t.id.dantes!);
    const knowledge = botKnowledge(t.state, view.me.id, view, memory);
    expect(sequenceFollowup(view, knowledge, memory)?.action).not.toMatchObject({ skill: 'attack' });
    expect(t.skill('dantes', 'enemy_check', 'krate').ok).toBe(true);
    const observed = observeSequence(t.state, view.me.id, memory);
    expect(sequenceFollowup(viewFor(t.state, view.me.id), observed, memory)?.action).toEqual({
      type: 'skill', skill: 'attack', target: t.id.krate, name: 'krate',
    });
  });

  it('다른 사람의 비공개 확인은 후속 행동의 정체 지식이 되지 않는다', () => {
    const t = civilTable(); fill(t, 'dantes', 'kelhu');
    t.p('kelhu').skills.push({ key: 'enemy_check', cooldownUntil: 0, usesLeft: null, level: 1 });
    t.publish('krate', 'krate');
    const memory = createBotMemory(7), view = viewFor(t.state, t.id.dantes!);
    botKnowledge(t.state, view.me.id, view, memory);
    t.skill('kelhu', 'enemy_check', 'krate');
    const observed = observeSequence(t.state, view.me.id, memory);
    expect(observed.known.has(t.id.krate!)).toBe(false);
    expect(sequenceFollowup(viewFor(t.state, view.me.id), observed, memory)?.action).not.toMatchObject({ skill: 'attack' });
  });

  it('마나 부족과 쿨다운을 지키며 공표로 얻은 마나를 후속 공격에 반영한다', () => {
    const t = civilTable(); t.p('dantes').mana = 45; t.state.revealed[t.id.krate!] = 'krate';
    const memory = createBotMemory(7), view = viewFor(t.state, t.id.dantes!);
    const knowledge = botKnowledge(t.state, view.me.id, view, memory);
    expect(sequenceFollowup(view, knowledge, memory)?.action).not.toMatchObject({ skill: 'attack' });
    t.publish('dantes', 'dantes');
    const updated = observeSequence(t.state, view.me.id, memory);
    expect(sequenceFollowup(viewFor(t.state, view.me.id), updated, memory)?.action).toMatchObject({ skill: 'attack' });
    t.p('dantes').skills.find((s) => s.key === 'attack')!.cooldownUntil = t.now + 1000;
    expect(sequenceFollowup(viewFor(t.state, view.me.id), updated, memory)?.action).not.toMatchObject({ skill: 'attack' });
  });

  it('변장 가능한 스캔 성공을 확정 정체로 바꾸지 않는다', () => {
    const t = civilTable(); fill(t, 'kai'); t.publish('soen', 'krate');
    t.p('kai').skills.push({ key: 'scan', cooldownUntil: 0, usesLeft: null, level: 1 });
    const memory = createBotMemory(9), view = viewFor(t.state, t.id.kai!);
    botKnowledge(t.state, view.me.id, view, memory);
    expect(t.skill('kai', 'scan', 'soen', 'krate').ok).toBe(true);
    const observed = observeSequence(t.state, view.me.id, memory);
    expect(observed.known.has(t.id.soen!)).toBe(false);
    expect(observed.candidates.get(t.id.soen!)).toContain('soen');
    expect(sequenceFollowup(viewFor(t.state, view.me.id), observed, memory)?.action).not.toMatchObject({ skill: 'attack' });
  });

  it('생존 보디가드가 보호하는 지휘관에게 후속 일반 공격을 하지 않는다', () => {
    const t = civilTable(); fill(t, 'dantes'); t.state.revealed[t.id.kai!] = 'kai';
    const memory = createBotMemory(9), view = viewFor(t.state, t.id.dantes!);
    const knowledge = botKnowledge(t.state, view.me.id, view, memory);
    expect(sequenceFollowup(view, knowledge, memory)?.action).not.toMatchObject({ skill: 'attack' });
  });

  it('가설 탐색은 공격을 첫 후보로 받지 않고 입력과 행동 RNG를 보존한다', () => {
    const t = civilTable(); fill(t, 'dantes'); t.publish('krate', 'krate');
    t.p('dantes').skills.push({ key: 'enemy_check', cooldownUntil: 0, usesLeft: null, level: 1 });
    const memory = createBotMemory(7), view = viewFor(t.state, t.id.dantes!);
    const knowledge = botKnowledge(t.state, view.me.id, view, memory);
    const before = structuredClone(view), perception = structuredClone(memory.perception);
    const result = boundedSequenceSearch(view, knowledge, memory, { type: 'skill', skill: 'attack', target: t.id.krate, name: 'krate' })!;
    expect(result.action).not.toMatchObject({ skill: 'attack' });
    expect(result.simulations).toBeLessThanOrEqual(128);
    expect(applyAction(structuredClone(t.state), view.me.id, result.action, t.now).ok).toBe(true);
    expect(view).toEqual(before); expect(memory.perception).toEqual(perception); expect(memory.rng).toBe(7);
  });
});
