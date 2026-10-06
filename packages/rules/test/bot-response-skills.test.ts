import { describe, expect, it } from 'vitest';
import { respondToKnownEnemies } from '../src/bot-response.js';
import { civilTable, fill, modeTable, PRIMORDIAL_ORDER } from './helpers.js';

describe('가설 상대 액티브 대응', () => {
  it('이름 공격이 없는 상대의 행동 불능기도 확인된 대상에게만 사용한다', () => {
    const t = civilTable();
    for (const p of t.state.players) p.mana = 0;
    fill(t, 'krate');
    expect(respondToKnownEnemies(t.state, t.id.mertz!, true)).toBe(0);
    t.state.revealed[t.id.mertz!] = 'mertz';
    expect(respondToKnownEnemies(t.state, t.id.mertz!, false)).toBe(0);
    expect(respondToKnownEnemies(t.state, t.id.mertz!, true)).toBe(1);
    expect(t.p('mertz').effects.some((e) => e.kind === 'incapacitated')).toBe(true);
    expect(t.p('krate').skills.find((s) => s.key === 'nightmare')!.cooldownUntil).toBeGreaterThan(0);
    expect(respondToKnownEnemies(t.state, t.id.mertz!, true)).toBe(0);
  });

  it('사용 횟수 없는 즉사기는 무시하고, 남은 횟수가 있으면 엔진의 목숨 무시 판정을 실행한다', () => {
    const t = modeTable('primordial', PRIMORDIAL_ORDER);
    for (const p of t.state.players) p.mana = 0;
    fill(t, 'kilder'); t.state.revealed[t.id.kane!] = 'kane';
    const skill = { key: 'kilder_master_power', cooldownUntil: 0, usesLeft: 0, level: 1 };
    t.p('kilder').skills = [skill];
    expect(respondToKnownEnemies(t.state, t.id.kane!, true)).toBe(0);
    skill.usesLeft = 1;
    expect(respondToKnownEnemies(t.state, t.id.kane!, true)).toBe(1);
    expect(t.p('kane').alive).toBe(false);
    expect(skill.usesLeft).toBe(0);
  });

  it('조건부 즉사기는 조건 없는 다른 대상에게 비용을 낭비하지 않는다', () => {
    const t = modeTable('primordial', PRIMORDIAL_ORDER);
    for (const p of t.state.players) p.mana = 0;
    fill(t, 'eoril'); t.state.revealed[t.id.eltas!] = 'eltas';
    t.p('eoril').skills = [{ key: 'eoril_phoenix_flame', cooldownUntil: 0, usesLeft: 1, level: 1 }];
    expect(respondToKnownEnemies(t.state, t.id.eltas!, true)).toBe(0);
    expect(t.p('eoril').mana).toBe(150);
    t.state.revealed[t.id.consume!] = 'consume';
    expect(respondToKnownEnemies(t.state, t.id.eltas!, true)).toBe(1);
    expect(t.p('consume').alive).toBe(false);
  });
});
