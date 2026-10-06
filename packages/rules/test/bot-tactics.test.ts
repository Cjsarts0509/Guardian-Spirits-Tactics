import { describe, expect, it } from 'vitest';
import { botKnowledge, createBotMemory, estimatedHits, neutralizedSkill, roleThreat, skillTiming, smartBotAction, updateBotKnowledge, viewFor } from '../src/index.js';
import { CIVIL_ORDER, PRIMORDIAL_ORDER, TROLL_ORDER, civilTable, fill, modeTable } from './helpers.js';

function comboTable() {
  const t = civilTable();
  t.publish('sephy', 'sephy'); fill(t, 'sephy');
  for (const p of t.state.players) if (!['arin', 'krate'].includes(p.character)) t.state.revealed[p.id] = p.character;
  return t;
}

describe('관찰 가능한 상대 스킬 시간', () => {
  it('이름이 공개된 스킬 사용은 역할 단위로만 쿨다운을 기록한다', () => {
    const t = civilTable();
    t.tick(15_000);
    expect(t.skill('sephy', 'burning_magic', 'kai').ok).toBe(true);
    const mem = createBotMemory(1);
    botKnowledge(t.state, t.id.arin!, undefined, mem);
    const battle = mem.perception!.battle;
    expect(skillTiming(battle, 'sephy', 'burning_magic')).toMatchObject({ readyEarliest: 115_000, readyLatest: 115_000, usedMin: 1 });
    expect(mem.perception!.known.has(t.id.sephy!)).toBe(false);
    const before = structuredClone(battle);
    botKnowledge(t.state, t.id.arin!, undefined, mem);
    expect(battle).toEqual(before);
  });

  it('교란과 나이트메어의 공개 관찰은 동일하며 두 시전자를 모두 확정하지 않는다', () => {
    const a = civilTable(); const b = civilTable();
    a.skill('sephy', 'confusion', 'kai'); b.skill('krate', 'nightmare', 'kai');
    const read = (t: typeof a) => {
      const mem = createBotMemory(1);
      botKnowledge(t.state, t.id.freya!, undefined, mem);
      return mem.perception!.battle;
    };
    expect(read(a)).toEqual(read(b));
    const battle = read(a);
    expect(battle.ambiguous[0]!.options).toEqual([{ character: 'sephy', skill: 'confusion' }, { character: 'krate', skill: 'nightmare' }]);
    expect(skillTiming(battle, 'sephy', 'confusion')).toMatchObject({ readyEarliest: 0, readyLatest: 120_000, usedMin: 0 });
  });

  it('공개 이름 공격의 쿨다운이 돌아오기 전에는 위협 점수를 낮춘다', () => {
    const t = civilTable();
    expect(t.skill('kaspa', 'attack', 'freya', 'freya').ok).toBe(true);
    const mem = createBotMemory(1);
    botKnowledge(t.state, t.id.kai!, undefined, mem);
    const b = mem.perception!.battle;
    const timing = skillTiming(b, 'kaspa', 'attack')!;
    expect(timing.readyEarliest).toBeGreaterThan(10_000);
    expect(roleThreat(viewFor(t.state, t.id.kai!), b, 'kaspa')).toBe(0);
    t.tick(timing.readyEarliest);
    expect(roleThreat(viewFor(t.state, t.id.kai!), b, 'kaspa')).toBeGreaterThan(0);
  });

  it('익명 광폭화로 공격 쿨다운 초기화 가능성은 열되 카즈로우와 세이로우를 구별하지 않는다', () => {
    const t = modeTable('troll', TROLL_ORDER);
    t.publish('kazrow', 'kazrow');
    fill(t, 'kazrow');
    t.skill('kazrow', 'advanced_attack', 'tokra', 'tokra');
    const mem = createBotMemory(1);
    botKnowledge(t.state, t.id.chis!, undefined, mem);
    const b = mem.perception!.battle;
    expect(skillTiming(b, 'kazrow', 'advanced_attack')!.readyEarliest).toBeGreaterThan(0);
    expect(t.skill('kazrow', 'berserk_kazrow').ok).toBe(true);
    botKnowledge(t.state, t.id.chis!, undefined, mem);
    expect(skillTiming(b, 'kazrow', 'advanced_attack')!.readyEarliest).toBe(0);
    expect(skillTiming(b, 'kazrow', 'berserk_kazrow')!.usedMin).toBe(0);
    expect(skillTiming(b, 'seirow', 'berserk_seirow')!.usedMin).toBe(0);
  });

  it('다른 봇의 비공개 스킬 결과로 상대 쿨다운을 채우지 않는다', () => {
    const t = civilTable();
    t.skill('kaspa', 'shadow_eye', 'freya'); // 아직 미해금이라 거절.
    t.tick(300_000); fill(t, 'kaspa');
    t.p('kaspa').gem = 1;
    expect(t.skill('kaspa', 'shadow_eye', 'freya').ok).toBe(true);
    const mem = createBotMemory(1);
    updateBotKnowledge(viewFor(t.state, t.id.dantes!), t.state.log, mem);
    expect(skillTiming(mem.perception!.battle, 'kaspa', 'shadow_eye')).toBeUndefined();
  });

  it('동일한 관찰에서 숨겨진 플레이어 배정이 달라도 시간 기억은 같다', () => {
    const a = civilTable();
    const b = civilTable(CIVIL_ORDER.map((c) => c === 'soen' ? 'arin' : c === 'arin' ? 'soen' : c));
    a.skill('sephy', 'burning_magic', 'dantes'); b.skill('sephy', 'burning_magic', 'dantes');
    const read = (t: typeof a) => {
      const mem = createBotMemory(3);
      botKnowledge(t.state, t.id.kai!, undefined, mem);
      return mem.perception!.battle;
    };
    expect(read(a)).toEqual(read(b));
  });
});

describe('패시브와 액티브의 연계', () => {
  it('조언으로 냉정함을 얻은 켈후에게 용맹한 돌진을 낭비하지 않는다', () => {
    const t = civilTable();
    fill(t, 'soen');
    t.skill('soen', 'advice', 'kelhu');
    t.state.revealed[t.id.kelhu!] = 'kelhu';
    t.p('tuma').skills = t.p('tuma').skills.filter((s) => s.key === 'valiant_charge');
    const mem = createBotMemory(1);
    expect(smartBotAction(t.state, t.id.tuma!, mem, { activity: 1 })).toBeNull();
    expect(neutralizedSkill(viewFor(t.state, t.id.tuma!), mem.perception!.battle, 'valiant_charge', 'kelhu')).toBe(true);
  });

  it('레지스턴스가 있으면 피닉스의 불꽃을 아끼고 포박 이후에는 사용한다', () => {
    const t = modeTable('primordial', PRIMORDIAL_ORDER);
    fill(t, 'hermilly', 'kumarin', 'eoril');
    t.skill('hermilly', 'hermilly_libido_protection', 'consume');
    t.state.revealed[t.id.consume!] = 'consume';
    t.p('eoril').skills = t.p('eoril').skills.filter((s) => s.key === 'eoril_phoenix_flame');
    const mem = createBotMemory(1);
    expect(smartBotAction(t.state, t.id.eoril!, mem, { activity: 1 })).toBeNull();
    expect(t.skill('kumarin', 'kumarin_binding', 'consume').ok).toBe(true);
    expect(smartBotAction(t.state, t.id.eoril!, mem, { activity: 1 })).toEqual({ type: 'skill', skill: 'eoril_phoenix_flame', target: t.id.consume });
  });

  it('다중 목숨과 공개 방어 횟수를 구분해 기록한다', () => {
    const t = modeTable('primordial', PRIMORDIAL_ORDER);
    fill(t, 'consume', 'kane');
    t.skill('consume', 'consume_master_guard', 'eltas');
    const mem = createBotMemory(1);
    const read = () => { const v = viewFor(t.state, t.id.rael!); botKnowledge(t.state, t.id.rael!, v, mem); return estimatedHits(v, mem.perception!.battle, 'eltas'); };
    expect(read()).toBe(5);
    t.skill('kane', 'attack', 'eltas', 'eltas');
    expect(read()).toBe(4);
  });

  it('공격이 곧 준비되면 필요한 마나를 다른 확인에 소모하지 않는다', () => {
    const t = civilTable();
    t.state.revealed[t.id.freya!] = 'freya';
    t.p('kaspa').skills = t.p('kaspa').skills.filter((s) => ['attack', 'ally_check'].includes(s.key));
    const attack = t.p('kaspa').skills.find((s) => s.key === 'attack')!;
    attack.cooldownUntil = 10_000;
    t.p('kaspa').mana = viewFor(t.state, t.id.kaspa!).me.skills.find((s) => s.key === 'attack')!.mana;
    t.publish('arin', 'arin');
    const mem = createBotMemory(1);
    expect(smartBotAction(t.state, t.id.kaspa!, mem, { activity: 1 })).toBeNull();
    t.tick(10_000);
    expect(smartBotAction(t.state, t.id.kaspa!, mem, { activity: 1 })).toEqual({ type: 'skill', skill: 'attack', target: t.id.freya, name: 'freya' });
  });

  it('버닝 매직의 실제 사용 후 같은 대상에게 저주를 이어 쓴다', () => {
    const t = comboTable();
    const mem = createBotMemory(1);
    const a = smartBotAction(t.state, t.id.sephy!, mem, { activity: 1 });
    expect(a).toMatchObject({ type: 'skill', skill: 'burning_magic' });
    expect(t.act('sephy', a!).ok).toBe(true);
    const next = smartBotAction(t.state, t.id.sephy!, mem, { activity: 1 });
    expect(next).toEqual({ type: 'skill', skill: 'curse', target: a!.type === 'skill' ? a!.target : undefined });
  });

  it('제안한 버닝이 실행되지 않으면 연계를 확정 사용처럼 기억하지 않는다', () => {
    const t = comboTable();
    const mem = createBotMemory(1);
    const a = smartBotAction(t.state, t.id.sephy!, mem, { activity: 1 });
    expect(a).toMatchObject({ type: 'skill', skill: 'burning_magic' });
    // 적용하지 않은 제안을 다음 호출에서 실제 시전으로 해석하지 않는다.
    expect(smartBotAction(t.state, t.id.sephy!, mem, { activity: 1 })).toMatchObject({ type: 'skill', skill: 'burning_magic' });
  });

  it('버닝 시전 확인은 시전자에게만 전달되고 공개된 대상 정보로 추가되지 않는다', () => {
    const t = civilTable();
    const r = t.skill('sephy', 'burning_magic', 'kai');
    const receipt = r.events.find((e) => e.kind === 'skill.burning_magic.self')!;
    expect(receipt.vis).toEqual({ to: 'players', ids: [t.id.sephy] });
    expect(receipt.data).toEqual({ target: t.id.kai });
    expect(r.events.find((e) => e.kind === 'skill.burning_magic')!.data).toBeUndefined();
    const mem = createBotMemory(1);
    updateBotKnowledge(viewFor(t.state, t.id.arin!), t.state.log, mem);
    expect(mem.perception!.lastBurn).toBeUndefined();
  });

  it('카즈로우 광폭화는 일반 스킬만 초기화하며 보석 쿨다운 때문에 낭비하지 않는다', () => {
    const t = modeTable('troll', TROLL_ORDER);
    t.p('kazrow').published = 'kazrow';
    t.p('kazrow').gem = 3; t.p('kazrow').gemCooldownUntil = 200_000;
    t.p('kazrow').skills = t.p('kazrow').skills.filter((s) => ['advanced_attack', 'berserk_kazrow'].includes(s.key));
    const attack = t.p('kazrow').skills.find((s) => s.key === 'advanced_attack')!;
    expect(smartBotAction(t.state, t.id.kazrow!, createBotMemory(2), { activity: 1 })).toBeNull();
    attack.cooldownUntil = 60_000;
    const mem = createBotMemory(1);
    expect(smartBotAction(t.state, t.id.kazrow!, mem, { activity: 1 })).toEqual({ type: 'skill', skill: 'berserk_kazrow' });
    expect(t.skill('kazrow', 'berserk_kazrow').ok).toBe(true);
    expect(attack.cooldownUntil).toBe(0);
    expect(t.p('kazrow').gemCooldownUntil).toBe(200_000);
  });
});
