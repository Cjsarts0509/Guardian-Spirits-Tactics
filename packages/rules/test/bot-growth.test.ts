import { describe, expect, it } from 'vitest';
import { advance, applyAction, botKnowledge, createBotMemory, viewFor } from '../src/index.js';
import { growthCandidates } from '../src/bot-growth.js';
import { boundedSequenceSearch, extendedPositionScore, scheduleObservedTurn, sequenceFollowup } from '../src/bot-sequence.js';
import { civilTable, fill, modeTable, PRIMORDIAL_ORDER, LIDELLUT_ORDER, TROLL_ORDER } from './helpers.js';

const observe = (t: ReturnType<typeof civilTable>, character: string) => {
  const memory = createBotMemory(11), view = viewFor(t.state, t.id[character]!);
  return { view, memory, knowledge: botKnowledge(t.state, view.me.id, view, memory) };
};

describe('성장·희생·관측된 다음 턴', () => {
  it('최종 진화는 자신의 세 필수 스킬을 모두 갖춘 경우에만 후보가 된다', () => {
    const t = modeTable('primordial', PRIMORDIAL_ORDER); fill(t, 'consume');
    let o = observe(t, 'consume');
    expect(growthCandidates(o.view, o.knowledge, o.memory)).not.toContainEqual({ type: 'skill', skill: 'consume_final_evolution' });
    for (const key of ['consume_resistance', 'consume_iron_skin', 'advanced_attack', 'consume_final_evolution'])
      if (!t.p('consume').skills.some((s) => s.key === key)) t.p('consume').skills.push({ key, cooldownUntil: 0, usesLeft: key === 'consume_final_evolution' ? 1 : null, level: 1 });
    o = observe(t, 'consume');
    const action = sequenceFollowup(o.view, o.knowledge, o.memory, true, true)!.action;
    expect(action).toEqual({ type: 'skill', skill: 'consume_final_evolution' });
    expect(applyAction(t.state, o.view.me.id, action, t.now).ok).toBe(true);
    expect(t.p('consume').skills.some((s) => s.key === 'consume_slaughter')).toBe(true);
    expect(growthCandidates(viewFor(t.state, o.view.me.id), o.knowledge, o.memory)).not.toContainEqual(action);
  });

  it('희생 돌격은 공표가 아닌 확인된 적 지휘관만 대상으로 한다', () => {
    const t = modeTable('troll', TROLL_ORDER); fill(t, 'kazrow'); t.publish('chis', 'chis');
    let o = observe(t, 'kazrow');
    expect(growthCandidates(o.view, o.knowledge, o.memory).some((a) => a.type === 'skill' && a.skill === 'reckless_charge')).toBe(false);
    t.state.revealed[t.id.chis!] = 'chis'; o = observe(t, 'kazrow');
    const action = { type: 'skill', skill: 'reckless_charge', target: t.id.chis } as const;
    expect(growthCandidates(o.view, o.knowledge, o.memory)).toContainEqual(action);
    const initial = structuredClone(t.state);
    expect(applyAction(t.state, o.view.me.id, action, t.now).ok).toBe(true);
    expect(extendedPositionScore(initial, t.state, o.view.me.id)).toBe(1000);
  });

  it('관측된 족장 보호를 돌격 가설에도 복원한다', () => {
    const t = modeTable('troll', TROLL_ORDER); fill(t, 'kazrow', 'satoshi');
    t.skill('satoshi', 'chief_protection', 'chis'); t.state.revealed[t.id.chis!] = 'chis';
    const o = observe(t, 'kazrow'); expect(o.memory.perception!.chiefProtected).toBe(true);
    const result = boundedSequenceSearch(o.view, o.knowledge, o.memory, undefined, true, true)!;
    expect(result.action).not.toMatchObject({ skill: 'reckless_charge' });
    expect(result.simulations).toBeLessThanOrEqual(128);
  });

  it('매스 텔레포트는 획득한 슬롯·마나·사용 횟수를 지키며 확인된 대상만 고른다', () => {
    const t = modeTable('lidellut', LIDELLUT_ORDER); fill(t, 'yui'); t.state.revealed[t.id.kai!] = 'kai';
    t.p('yui').skills.push({ key: 'mass_teleport', cooldownUntil: 0, usesLeft: 1, level: 1 });
    const o = observe(t, 'yui');
    const action = { type: 'skill', skill: 'mass_teleport', target: t.id.kai } as const;
    expect(growthCandidates(o.view, o.knowledge, o.memory)).toContainEqual(action);
    t.p('yui').mana = 9;
    expect(growthCandidates(viewFor(t.state, o.view.me.id), o.knowledge, o.memory)).not.toContainEqual(action);
  });

  it('다음 턴에 진명·동맹 마나와 보석을 실제 엔진 규칙으로 얻고 쿨다운도 경과한다', () => {
    const t = civilTable(); for (const p of t.state.players) p.published = p.character;
    t.tick(t.state.nextTurnAt - 1000); t.p('dantes').mana = 0; t.p('dantes').gem = 1;
    t.p('dantes').skills.find((s) => s.key === 'attack')!.cooldownUntil = t.now + 500;
    t.p('mertz').allies.push(t.id.dantes!);
    const o = observe(t, 'dantes'), state = structuredClone(t.state); state.queue = [];
    expect(scheduleObservedTurn(state, o.view)).toBe(true);
    advance(state, state.nextTurnAt);
    const after = viewFor(state, o.view.me.id);
    expect(after.me.mana).toBe(40); expect(after.me.gem).toBe(2);
    expect(after.me.skills.find((s) => s.key === 'attack')!.cooldownRemainingMs).toBe(0);
    expect(after.turn).toBe(o.view.turn + 1);
  });

  it('미공표자의 자동 공표와 먼 미래 턴을 확정 예측하지 않는다', () => {
    const t = civilTable(), o = observe(t, 'dantes');
    const state = structuredClone(t.state); state.queue = [];
    expect(scheduleObservedTurn(state, { ...o.view, nextTurnInMs: 1000 })).toBe(false);
    for (const p of t.state.players) p.published = p.character;
    expect(scheduleObservedTurn(state, { ...viewFor(t.state, o.view.me.id), nextTurnInMs: 30_001 })).toBe(false);
    expect(state.queue).toEqual([]);
  });

  it('자신의 첫 공표가 마지막 미공표를 해소하면 다음 턴 보너스를 평가한다', () => {
    const t = civilTable(); for (const p of t.state.players) p.published = p.character;
    t.p('dantes').published = null; t.tick(t.state.nextTurnAt - 1000);
    const o = observe(t, 'dantes'), state = structuredClone(t.state); state.queue = [];
    expect(scheduleObservedTurn(state, o.view)).toBe(false);
    expect(applyAction(state, o.view.me.id, { type: 'skill', skill: 'publish', name: 'dantes' }, state.now).ok).toBe(true);
    expect(scheduleObservedTurn(state, viewFor(state, o.view.me.id))).toBe(true);
    const mana = state.players.find((p) => p.id === o.view.me.id)!.mana;
    advance(state, state.nextTurnAt);
    expect(viewFor(state, o.view.me.id).me.mana).toBe(Math.min(150, mana + 30));
  });

  it('사망 희생을 개인 생존만으로 평가하지 않고 팀 손실로 평가한다', () => {
    const t = civilTable(); fill(t, 'reindila');
    const initial = structuredClone(t.state);
    expect(t.skill('reindila', 'soul_wall', 'dantes').ok).toBe(true);
    expect(extendedPositionScore(initial, t.state, t.id.reindila!)).toBe(-4);
    expect(t.p('dantes').flags.soulWall).toBe(true);
  });

  it('확장 탐색은 상대 비공개 자원 변경에도 같은 자기 관찰에서 같은 행동을 고른다', () => {
    const t = modeTable('troll', TROLL_ORDER); fill(t, 'kazrow'); t.state.revealed[t.id.chis!] = 'chis';
    const o = observe(t, 'kazrow'), snapshot = structuredClone(o.memory), view = structuredClone(o.view);
    const first = boundedSequenceSearch(o.view, o.knowledge, o.memory, undefined, true, true);
    t.p('chis').mana = 99; t.p('satoshi').gem = 3; t.p('chis').flags.secret = true;
    const other = viewFor(t.state, o.view.me.id); expect(other).toEqual(view);
    expect(boundedSequenceSearch(other, o.knowledge, o.memory, undefined, true, true)).toEqual(first);
    expect(o.memory.perception).toEqual(snapshot.perception); expect(o.memory.rng).toBe(snapshot.rng);
    expect(o.memory.plan).toEqual(snapshot.plan); expect(o.view).toEqual(view);
  });
});
