import { describe, expect, it } from 'vitest';
import { advance, createBotMemory, smartBotAction, viewFor } from '../src/index.js';
import type { AssignmentBelief } from '../src/bot-belief.js';
import { confirmedAttackValue, confirmationCombatValue } from '../src/bot-confirmation-combat.js';
import { bestGemTarget } from '../src/bot-information.js';
import { createBattleMemory, roleSkills, NAME_ATTACKS } from '../src/bot-tactics.js';
import { civilTable, fill } from './helpers.js';
import { fixtures, prepareMatch } from '../scripts/league-runner.js';

function ready() {
  const t = civilTable(); fill(t, 'dantes');
  const view = viewFor(t.state, t.id.dantes!);
  view.me.skills = view.me.skills.filter((s) => !NAME_ATTACKS.includes(s.key));
  view.me.skills.push({ ...view.me.skills[0]!, key: 'attack', passive: false, mana: 30, cooldown: 60,
    cooldownRemainingMs: 0, blocked: null, usesLeft: null, nameOptions: ['krate', 'tuma', 'kai'] });
  return { t, view, battle: createBattleMemory() };
}

describe('확인 결과의 후속 공격 가치', () => {
  it('기본 정책은 검증한 황야 한정 후보와 행동 및 난수 경로가 같다', () => {
    for (const mode of ['civil_war', 'primordial', 'lidellut', 'troll'] as const) {
      const { state } = prepareMatch(fixtures(mode, 26100, 12)[0]!);
      const current = createBotMemory(99), selected = createBotMemory(99);
      for (const at of [0, 240_000, 720_000]) {
        advance(state, at);
        for (let i = 0; i < 30; i++) {
          expect(smartBotAction(state, 'p1', current, { activity: 1 })).toEqual(
            smartBotAction(state, 'p1', selected, { activity: 1, confirmationSearch: 'combat-lidellut' }));
          expect(current.rng).toBe(selected.rng);
        }
      }
    }
  });

  it('황야 한정 후보는 다른 세 모드의 행동과 난수 경로를 유지한다', () => {
    for (const mode of ['civil_war', 'primordial', 'troll'] as const) {
      const { state } = prepareMatch(fixtures(mode, 25100, 12)[0]!);
      const current = createBotMemory(99), reference = createBotMemory(99);
      for (const at of [0, 240_000, 720_000]) {
        advance(state, at);
        for (let i = 0; i < 30; i++) {
          expect(smartBotAction(state, 'p1', current, { activity: 1, confirmationSearch: 'combat-lidellut' })).toEqual(
            smartBotAction(state, 'p1', reference, { activity: 1, confirmationSearch: false }));
          expect(current.rng).toBe(reference.rng);
        }
      }
    }
  });

  it('준비된 공격·남은 마나와 영구 보디가드를 검사한다', () => {
    const { t, view, battle } = ready();
    expect(confirmedAttackValue(view, battle, 'krate', 150)).toBeGreaterThan(0);
    expect(confirmedAttackValue(view, battle, 'krate', 0)).toBe(0);
    expect(confirmedAttackValue(view, battle, 'freya', 150)).toBe(0);
    expect(confirmedAttackValue(view, battle, 'kai', 150)).toBe(0);
    const guard = view.players.find((p) => p.id === t.id.arin)!;
    guard.alive = false; guard.revealed = 'arin';
    expect(confirmedAttackValue(view, battle, 'kai', 150)).toBeGreaterThan(0);
    for (const skill of view.me.skills) if (skill.key === 'attack') skill.cooldownRemainingMs = 1;
    expect(confirmedAttackValue(view, battle, 'krate', 150)).toBe(0);
  });

  it('상대의 관찰된 쿨다운과 추가 목숨이 확인 가치를 낮춘다', () => {
    const { view, battle } = ready();
    const initial = confirmedAttackValue(view, battle, 'krate', 150);
    for (const skill of roleSkills(view, battle, 'krate')) battle.timings.set(`krate:${skill}`, {
      readyEarliest: view.elapsedMs + 60_000, readyLatest: view.elapsedMs + 60_000, usedMin: 0, usedMax: 1,
    });
    expect(confirmedAttackValue(view, battle, 'krate', 150)).toBeLessThan(initial);
    const cooling = confirmedAttackValue(view, battle, 'krate', 150);
    battle.hitsRemaining.set('krate', 4);
    expect(confirmedAttackValue(view, battle, 'krate', 150)).toBeLessThan(cooling);
  });

  it('지휘관 묶음과 애매한 성공을 확정 공격 기회로 계산하지 않는다', () => {
    const { t, view, battle } = ready();
    const id = t.id.krate!;
    const belief: AssignmentBelief = { consistent: true, probabilities: new Map([[id, new Map([['kai', 0.5], ['dantes', 0.5]])]]) };
    expect(confirmationCombatValue(view, belief, battle, id, 'truth_gem', 0)).toBe(0);
    belief.probabilities.set(id, new Map([['krate', 0.4], ['tuma', 0.3], ['freya', 0.3]]));
    const scan = confirmationCombatValue(view, belief, battle, id, 'scan', 0, 'krate');
    expect(scan).toBeCloseTo(0.4 * confirmedAttackValue(view, battle, 'krate', 150));
    expect(confirmationCombatValue(view, belief, battle, id, 'scan', 150, 'krate')).toBe(0);
  });

  it('동일한 정보량이면 공격으로 활용할 수 있는 적을 보석 대상으로 선택한다', () => {
    const { t, view, battle } = ready();
    const a = t.id.mertz!, b = t.id.krate!;
    const belief: AssignmentBelief = { consistent: true, probabilities: new Map([
      [a, new Map([['arin', 0.5], ['kaspa', 0.5]])],
      [b, new Map([['krate', 0.5], ['tuma', 0.5]])],
    ]) };
    expect(bestGemTarget(view, belief, [{ id: a }, { id: b }])).toBe(a);
    expect(bestGemTarget(view, belief, [{ id: a }, { id: b }], battle)).toBe(b);
  });
});
