import { describe, expect, it } from 'vitest';
import { advance, botKnowledge, createBotMemory, smartBotAction, viewFor } from '../src/index.js';
import { smartBotAction as previous } from '../scripts/baselines/pre-adaptive.js';
import { fixtures, prepareMatch } from '../scripts/league-runner.js';
import { adaptiveClaimName, observedClaimStyle, preserveClaimResources } from '../src/bot-claim-policy.js';
import { civilTable, modeTable, PRIMORDIAL_ORDER } from './helpers.js';

describe('관찰된 상대 공표 성향', () => {
  it('자원 보호 옵션은 완성 전 보석과 다음 턴까지 돌아오는 공격 마나를 지킨다', () => {
    const t = modeTable('primordial', PRIMORDIAL_ORDER);
    const v = viewFor(t.state, t.id.kane!);
    v.me.gem = 2;
    expect(preserveClaimResources(v)).toBe(true);
    v.me.gem = 3;
    const attack = v.me.skills.find((s) => s.key === 'attack')!;
    const publish = v.me.skills.find((s) => s.key === 'publish')!;
    v.me.mana = attack.mana + publish.mana - 1;
    expect(preserveClaimResources(v)).toBe(true);
    v.me.mana++;
    expect(preserveClaimResources(v)).toBe(false);
    v.me.mana = 0;
    attack.cooldownRemainingMs = v.nextTurnInMs + 1;
    expect(preserveClaimResources(v)).toBe(false);
    attack.cooldownRemainingMs = 0;
    attack.usesLeft = 0;
    expect(preserveClaimResources(v)).toBe(false);
  });

  it('성향 증거가 있어도 자원 보호는 진명을 유지하고 충족되면 가명을 허용한다', () => {
    const t = civilTable(); t.publish('kai', 'dantes'); t.publish('arin', 'kelhu');
    t.state.revealed[t.id.kai!] = 'kai'; t.state.revealed[t.id.arin!] = 'arin';
    const m = createBotMemory(7), v = viewFor(t.state, t.id.dantes!);
    const k = botKnowledge(t.state, t.id.dantes!, v, m);
    expect(adaptiveClaimName(v, k, m)).not.toBe('dantes');
    expect(adaptiveClaimName(v, k, m, true)).toBe('dantes');
    v.me.gem = 3; v.me.mana = v.me.maxMana;
    expect(adaptiveClaimName(v, k, m, true)).not.toBe('dantes');
  });
  it('블러핑 증거가 없으면 기존 정책과 행동·난수 경로가 같다', () => {
    for (const mode of ['civil_war', 'primordial', 'lidellut', 'troll'] as const) {
      const { state } = prepareMatch(fixtures(mode, 13, 12)[0]!);
      const a = createBotMemory(99), b = createBotMemory(99);
      for (const at of [0, 120_000, 240_000]) {
        advance(state, at);
        for (let i = 0; i < 20; i++) {
          expect(smartBotAction(state, 'p1', a, { activity: 1, claimStrategy: 'adaptive' }))
            .toEqual(previous(state, 'p1', b, { activity: 1 }));
          expect(a.rng).toBe(b.rng);
        }
      }
    }
  });

  it('모르는 정체·아군 공표를 적 블러핑으로 세지 않는다', () => {
    const t = civilTable(); t.publish('kai', 'dantes'); t.publish('arin', 'kelhu'); t.publish('mertz', 'freya');
    t.state.revealed[t.id.mertz!] = 'mertz';
    const m = createBotMemory(1), v = viewFor(t.state, t.id.dantes!);
    const k = botKnowledge(t.state, t.id.dantes!, v, m);
    expect(observedClaimStyle(v, k, m)).toEqual({ truthful: 0, bluffing: 0, bluffHeavy: false });
    expect(adaptiveClaimName(v, k, m)).toBe('dantes');
  });

  it('서로 다른 적 둘의 확정 정체와 수동 공표가 다르면 지휘관 위장을 선택한다', () => {
    const t = civilTable(); t.publish('kai', 'dantes'); t.publish('arin', 'kelhu');
    t.state.revealed[t.id.kai!] = 'kai'; t.state.revealed[t.id.arin!] = 'arin';
    const m = createBotMemory(2), v = viewFor(t.state, t.id.dantes!);
    const k = botKnowledge(t.state, t.id.dantes!, v, m);
    expect(observedClaimStyle(v, k, m)).toEqual({ truthful: 0, bluffing: 2, bluffHeavy: true });
    expect(adaptiveClaimName(v, k, m)).not.toBe('dantes');
    m.perception!.trueNameUntil = v.elapsedMs + 20_000;
    expect(adaptiveClaimName(v, k, m)).toBe('dantes');
    m.perception!.trueNameUntil = 0;
    // 공개된 본인 정체를 가짜 공표로 숨긴다고 취급하지 않는다.
    t.state.revealed[t.id.dantes!] = 'dantes';
    expect(adaptiveClaimName(viewFor(t.state, t.id.dantes!), k, m)).toBe('dantes');
  });

  it('같은 사람의 반복 공표와 반복 기억 갱신을 표본 수로 부풀리지 않는다', () => {
    const t = civilTable(); t.publish('kai', 'dantes'); t.tick(40_000); t.publish('kai', 'freya');
    t.state.revealed[t.id.kai!] = 'kai';
    const m = createBotMemory(3), v = viewFor(t.state, t.id.dantes!);
    for (let i = 0; i < 3; i++) {
      const k = botKnowledge(t.state, t.id.dantes!, v, m);
      expect(observedClaimStyle(v, k, m).bluffing).toBe(1);
      expect(adaptiveClaimName(v, k, m)).toBe('dantes');
    }
  });

  it('자동 공표를 성향에서 제외한다', () => {
    const t = civilTable(); t.publish('kai', 'dantes'); t.state.revealed[t.id.kai!] = 'kai';
    t.state.log.push({ seq: ++t.state.seq, at: 0, kind: 'publish.auto', vis: { to: 'all' }, text: '자동 공표', data: { player: t.id.kai, name: 'dantes' } });
    const m = createBotMemory(4), v = viewFor(t.state, t.id.dantes!);
    const k = botKnowledge(t.state, t.id.dantes!, v, m);
    expect(observedClaimStyle(v, k, m).bluffing).toBe(0);
  });

  it('진명 리더쉽과 진명 유지 효과는 성향보다 우선한다', () => {
    const t = modeTable('primordial', PRIMORDIAL_ORDER); t.publish('eltas', 'rael'); t.publish('sasint', 'kane');
    t.state.revealed[t.id.eltas!] = 'eltas'; t.state.revealed[t.id.sasint!] = 'sasint';
    const m = createBotMemory(5), v = viewFor(t.state, t.id.rael!);
    const k = botKnowledge(t.state, t.id.rael!, v, m);
    expect(observedClaimStyle(v, k, m).bluffHeavy).toBe(true);
    expect(adaptiveClaimName(v, k, m)).toBe('rael');
  });

  it('숨겨진 상대 배정을 교환해도 같은 관찰에서는 선택이 같다', () => {
    const t = civilTable(), m = createBotMemory(6), v = viewFor(t.state, t.id.dantes!);
    const k = botKnowledge(t.state, t.id.dantes!, v, m);
    const before = adaptiveClaimName(v, k, m);
    [t.p('kai').character, t.p('arin').character] = [t.p('arin').character, t.p('kai').character];
    const after = viewFor(t.state, t.id.dantes!);
    expect(adaptiveClaimName(after, botKnowledge(t.state, t.id.dantes!, after, m), m)).toBe(before);
  });
});
