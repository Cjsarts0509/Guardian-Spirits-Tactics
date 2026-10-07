import { describe, expect, it } from 'vitest';
import { applyAction, botKnowledge, createBotMemory, eventsFor, viewFor } from '../src/index.js';
import { roleFollowup, roleInformationGain, rolePositionValue } from '../src/bot-followup.js';
import { sequenceFollowup, boundedSequenceSearch } from '../src/bot-sequence.js';
import { growthCandidates } from '../src/bot-growth.js';
import { CIVIL_ORDER } from './helpers.js';
import { civilTable, fill, modeTable, PRIMORDIAL_ORDER, LIDELLUT_ORDER, TROLL_ORDER } from './helpers.js';

describe('인물별 관찰 기반 후속 스킬', () => {
  it('4개 모드 48인물의 초기·해금 이후 후보가 실제 엔진에서 허용된다', () => {
    for (const [mode, order] of [['civil_war', CIVIL_ORDER], ['primordial', PRIMORDIAL_ORDER],
      ['lidellut', LIDELLUT_ORDER], ['troll', TROLL_ORDER]] as const) {
      for (const at of [0, 60_001, 180_001, 360_001]) for (const character of order) {
        const t = modeTable(mode, [...order]);
        for (const p of t.state.players) t.publish(p.character, p.character);
        t.tick(at);
        fill(t, character);
        for (const p of t.state.players) t.state.revealed[p.id] = p.character;
        const view = viewFor(t.state, t.id[character]!), memory = createBotMemory(7);
        const knowledge = botKnowledge(t.state, view.me.id, view, memory);
        const role = roleFollowup(view, knowledge, memory);
        for (const action of [...(role ? [role] : []), ...growthCandidates(view, knowledge, memory)]) {
          const result = applyAction(structuredClone(t.state), view.me.id, action, t.now);
          expect(result.ok, `${mode}/${character}/${at}/${JSON.stringify(action)}: ${result.events.map((e) => e.text).join(' ')}`).toBe(true);
        }
      }
    }
  });

  it('확인된 아군이 자신뿐이면 자기 대상 지원을 선택하지 않는다', () => {
    const t = modeTable('troll', TROLL_ORDER);
    t.p('tokra').mana = 100;
    const memory = createBotMemory(7), view = viewFor(t.state, t.id.tokra!);
    const knowledge = botKnowledge(t.state, view.me.id, view, memory);
    expect(roleFollowup(view, knowledge, memory)).toBeUndefined();
    t.state.revealed[t.id.chis!] = 'chis';
    const updated = viewFor(t.state, view.me.id);
    const known = botKnowledge(t.state, view.me.id, updated, memory);
    const action = roleFollowup(updated, known, memory)!;
    expect(action).toMatchObject({ skill: 'support', target: t.id.chis });
    expect(applyAction(t.state, view.me.id, action, t.now).ok).toBe(true);
  });

  it('진명 공표로 열린 리더쉽을 고르고 실제 개인 결과만 정보 이득으로 평가한다', () => {
    const t = modeTable('primordial', PRIMORDIAL_ORDER); fill(t, 'rael');
    const memory = createBotMemory(7), initial = viewFor(t.state, t.id.rael!);
    const knowledge = botKnowledge(t.state, initial.me.id, initial, memory);
    expect(roleFollowup(initial, knowledge, memory)).toBeUndefined();
    t.publish('rael', 'rael');
    const before = viewFor(t.state, initial.me.id), first = eventsFor(t.state, initial.me.id);
    const action = roleFollowup(before, knowledge, memory)!;
    expect(action).toMatchObject({ skill: 'rael_leadership' });
    expect(applyAction(t.state, initial.me.id, action, t.now).ok).toBe(true);
    const after = viewFor(t.state, initial.me.id), last = eventsFor(t.state, initial.me.id);
    expect(roleInformationGain(before, first, after, last, memory)).toBeGreaterThan(0);
    expect(roleInformationGain(before, first, after, last.filter((e) => e.vis.to === 'all'), memory)).toBe(0);
  });

  it('모르는 대상이나 공표만 한 대상에게 즉사·행동 불능기를 쓰지 않는다', () => {
    const t = civilTable(); fill(t, 'sephy', 'dantes'); t.publish('krate', 'krate');
    for (const character of ['sephy', 'dantes']) {
      const memory = createBotMemory(7), view = viewFor(t.state, t.id[character]!);
      const knowledge = botKnowledge(t.state, view.me.id, view, memory);
      expect(roleFollowup(view, knowledge, memory, true)).toBeUndefined();
      const a = roleFollowup(view, knowledge, memory);
      if (a?.type === 'skill') expect(['confusion', 'dantes_command']).not.toContain(a.skill);
    }
  });

  it('확인된 카이에 대한 전용 즉사와 쿨다운·사용 횟수를 반영한다', () => {
    const t = civilTable(); fill(t, 'dantes'); t.state.revealed[t.id.kai!] = 'kai';
    const memory = createBotMemory(7), view = viewFor(t.state, t.id.dantes!);
    const knowledge = botKnowledge(t.state, view.me.id, view, memory);
    expect(sequenceFollowup(view, knowledge, memory, true)?.action).toMatchObject({ skill: 'dantes_command', target: t.id.kai });
    const slot = t.p('dantes').skills.find((s) => s.key === 'dantes_command')!;
    slot.cooldownUntil = 1000;
    expect(roleFollowup(viewFor(t.state, view.me.id), knowledge, memory, true)).toBeUndefined();
    slot.cooldownUntil = 0; slot.usesLeft = 0;
    expect(roleFollowup(viewFor(t.state, view.me.id), knowledge, memory, true)).toBeUndefined();
  });

  it('정체가 확인된 적에게 제어를 쓰고 이미 행동 불능이면 반복하지 않는다', () => {
    const t = civilTable(); fill(t, 'sephy'); t.state.revealed[t.id.krate!] = 'krate';
    const memory = createBotMemory(7), view = viewFor(t.state, t.id.sephy!);
    const knowledge = botKnowledge(t.state, view.me.id, view, memory);
    const action = sequenceFollowup(view, knowledge, memory, true)!.action;
    expect(action).toMatchObject({ skill: 'confusion', target: t.id.krate });
    expect(applyAction(t.state, view.me.id, action, t.now).ok).toBe(true);
    t.p('sephy').skills.find((s) => s.key === 'confusion')!.cooldownUntil = 0;
    expect(roleFollowup(viewFor(t.state, view.me.id), knowledge, memory)).not.toMatchObject({ skill: 'confusion' });
  });

  it('행동 불능인 확인된 아군을 해제하고 적이나 아군 공표만 한 대상은 제외한다', () => {
    const t = modeTable('primordial', PRIMORDIAL_ORDER); fill(t, 'tachin', 'eoril');
    t.skill('eoril', 'eoril_flame_shackle', 'rael'); t.publish('rael', 'rael');
    const memory = createBotMemory(7), view = viewFor(t.state, t.id.tachin!);
    const knowledge = botKnowledge(t.state, view.me.id, view, memory);
    expect(roleFollowup(view, knowledge, memory, true)).toBeUndefined();
    t.state.revealed[t.id.rael!] = 'rael';
    const updated = viewFor(t.state, view.me.id), known = botKnowledge(t.state, view.me.id, updated, memory);
    const action = roleFollowup(updated, known, memory, true)!;
    expect(action).toMatchObject({ skill: 'tachin_neutralize', target: t.id.rael });
    const before = structuredClone(t.state);
    expect(applyAction(t.state, view.me.id, action, t.now).ok).toBe(true);
    expect(t.p('rael').effects).toEqual([]);
    expect(rolePositionValue(before, t.state, view.me.id)).toBeGreaterThan(0);
  });

  it('세례의 이름·아군 정체·기존 세례 기억을 확인한다', () => {
    const t = modeTable('lidellut', LIDELLUT_ORDER); fill(t, 'chizuko'); t.state.revealed[t.id.supra!] = 'supra';
    const memory = createBotMemory(7), view = viewFor(t.state, t.id.chizuko!);
    const knowledge = botKnowledge(t.state, view.me.id, view, memory);
    expect(roleFollowup(view, knowledge, memory)).toMatchObject({ skill: 'angel_baptism', target: t.id.supra, name: 'supra' });
    memory.perception!.baptized.add('supra');
    expect(roleFollowup(view, knowledge, memory)).not.toMatchObject({ skill: 'angel_baptism' });
  });

  it('지원은 확인된 아군을 고르고 패시브 슬롯은 행동 후보가 아니다', () => {
    const t = modeTable('troll', TROLL_ORDER); fill(t, 'tokra'); t.state.revealed[t.id.chis!] = 'chis';
    const memory = createBotMemory(7), view = viewFor(t.state, t.id.tokra!);
    const knowledge = botKnowledge(t.state, view.me.id, view, memory);
    const action = roleFollowup(view, knowledge, memory)!;
    expect(action).toMatchObject({ skill: 'support', target: t.id.chis });
    const before = structuredClone(t.state);
    expect(applyAction(t.state, view.me.id, action, t.now).ok).toBe(true);
    expect(t.p('chis').mana).toBeGreaterThan(before.players.find((p) => p.id === t.id.chis)!.mana);
    expect(rolePositionValue(before, t.state, view.me.id)).toBeGreaterThan(0);
    const onlyPassive = { ...view, me: { ...view.me, skills: view.me.skills.map((s) => ({ ...s, passive: true })) } };
    expect(roleFollowup(onlyPassive, knowledge, memory)).toBeUndefined();
  });

  it('확장 탐색도 수순 상한·관찰 기억·입력·행동 RNG를 보존한다', () => {
    const t = modeTable('primordial', PRIMORDIAL_ORDER); fill(t, 'rael'); t.publish('eoril', 'eoril');
    const memory = createBotMemory(7), view = viewFor(t.state, t.id.rael!);
    const knowledge = botKnowledge(t.state, view.me.id, view, memory);
    const before = structuredClone(view), perception = structuredClone(memory.perception);
    const result = boundedSequenceSearch(view, knowledge, memory, { type: 'skill', skill: 'publish', name: 'rael' }, true)!;
    expect(result.simulations).toBeLessThanOrEqual(128);
    expect(result.followupCacheHits).toBeGreaterThan(0);
    expect(view).toEqual(before); expect(memory.perception).toEqual(perception); expect(memory.rng).toBe(7);
  });
});
