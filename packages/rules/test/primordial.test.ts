import { describe, expect, it } from 'vitest';
import { advance, applyAction, createGame, randomBotAction, viewFor } from '../src/index.js';
import { fill, lastText, modeTable, PRIMORDIAL_ORDER } from './helpers.js';

const table = (seed = 1) => modeTable('primordial', PRIMORDIAL_ORDER, seed);
const has = (t: ReturnType<typeof table>, c: string, k: string) => t.p(c).skills.some((s) => s.key === k);

describe('태초 · 승리 조건', () => {
  it('엘타스 사망 → 지상 연합 승리', () => {
    const t = table();
    fill(t, 'rael');
    t.skill('rael', 'attack', 'eltas', 'eltas'); // 엘타스 목숨 3
    t.skill('rael', 'attack', 'eltas', 'eltas', 61_000);
    t.skill('rael', 'attack', 'eltas', 'eltas', 122_000);
    expect(t.p('eltas').alive).toBe(false);
    expect(t.state.winner).toBe(1);
  });
  it('라엘·케인 둘 다 죽어야 다크니스 승리, 한 명만 죽으면 계속', () => {
    const t = table();
    fill(t, 'eltas', 'kilder');
    t.skill('eltas', 'supreme_attack', 'rael', 'rael');
    expect(t.p('rael').alive).toBe(false);
    expect(t.state.phase).toBe('running');
    t.skill('kilder', 'attack', 'kane', 'kane'); // 케인 목숨 2
    t.skill('kilder', 'attack', 'kane', 'kane', 61_000);
    expect(t.p('kane').alive).toBe(false);
    expect(t.state.winner).toBe(2);
  });
});

describe('태초 · 보디가드 (2회 방어)', () => {
  it('주인 보호 후 엘타스에게 오는 정답 공격 2번은 막히고, 공격자 페널티도 목숨 감소도 없다', () => {
    const t = table();
    fill(t, 'rael', 'consume');
    expect(t.skill('consume', 'consume_master_guard', 'eltas').ok).toBe(true);
    const r1 = t.skill('rael', 'attack', 'eltas', 'eltas');
    expect(lastText(r1)).toContain('보디가드');
    expect(t.p('eltas').extraLives).toBe(2);
    expect(t.p('rael').alive).toBe(true);
    t.skill('rael', 'attack', 'eltas', 'eltas', 61_000);
    expect(t.p('eltas').extraLives).toBe(2);
    const r3 = t.skill('rael', 'attack', 'eltas', 'eltas', 122_000);
    expect(lastText(r3)).not.toContain('보디가드');
    expect(t.p('eltas').extraLives).toBe(1);
  });
  it('보호자가 죽으면 즉시 무효', () => {
    const t = table();
    fill(t, 'rael', 'consume', 'eoril');
    t.skill('consume', 'consume_master_guard', 'eltas');
    t.skill('eoril', 'eoril_phoenix_flame', 'consume');
    expect(t.p('consume').alive).toBe(false);
    t.skill('rael', 'attack', 'eltas', 'eltas');
    expect(t.p('eltas').extraLives).toBe(1);
  });
  it('주인 보호를 엘타스가 아닌 사람에게 쓰면 비공개 실패 + 소멸', () => {
    const t = table();
    fill(t, 'consume');
    const r = t.skill('consume', 'consume_master_guard', 'kilder');
    expect(r.events.every((e) => e.vis.to === 'players')).toBe(true);
    expect(has(t, 'consume', 'consume_master_guard')).toBe(false);
    expect(has(t, 'consume', 'consume_bodyguard')).toBe(false);
  });
  it('울프스 슬러쉬는 보디가드를 무시하고 케인의 정체를 공개한다', () => {
    const t = table();
    fill(t, 'kane', 'consume');
    t.skill('consume', 'consume_master_guard', 'eltas');
    const r = t.skill('kane', 'kane_wolfs_slash', 'eltas');
    expect(t.p('eltas').extraLives).toBe(1);
    expect(t.state.revealed[t.id.kane!]).toBe('kane');
    expect(lastText(r)).toContain('케인은');
  });
});

describe('태초 · 리더쉽', () => {
  it('진명 공표가 있어야 쓸 수 있고, 이름을 고르면 그 캐릭터가 누구인지 알려준다', () => {
    const t = table();
    fill(t, 'rael');
    expect(t.skill('rael', 'rael_leadership', undefined, 'eoril').ok).toBe(false);
    t.publish('rael', 'rael');
    const r = t.skill('rael', 'rael_leadership', undefined, 'eoril');
    expect(r.ok).toBe(true);
    expect(lastText(r)).toContain('에오릴의 정체는');
    expect(r.events[0]!.facts).toEqual([{ player: t.id.eoril, character: 'eoril' }]);
    expect(has(t, 'rael', 'rael_leadership')).toBe(false);
  });
  it('지휘관 이름은 고를 수 없다', () => {
    const t = table();
    fill(t, 'eltas');
    t.publish('eltas', 'eltas');
    expect(t.skill('eltas', 'eltas_leadership', undefined, 'eltas').ok).toBe(false);
    expect(t.skill('eltas', 'eltas_leadership', undefined, 'rael').ok).toBe(false);
    expect(t.skill('eltas', 'eltas_leadership', undefined, 'consume').ok).toBe(true);
  });
  it('6분까지 리더쉽을 안 썼으면 상급 리더쉽으로 교체, 썼으면 안 생긴다', () => {
    const t = table();
    t.tick(361_000);
    expect(has(t, 'rael', 'rael_leadership')).toBe(false);
    expect(has(t, 'rael', 'rael_adv_leadership')).toBe(true);
    fill(t, 'rael');
    expect(t.skill('rael', 'rael_adv_leadership', undefined, 'kane').ok).toBe(false); // 지휘관 제외
    expect(t.skill('rael', 'rael_adv_leadership', undefined, 'tachin').ok).toBe(true); // 진명 불필요

    const t2 = table();
    fill(t2, 'eltas');
    t2.publish('eltas', 'eltas');
    t2.skill('eltas', 'eltas_leadership', undefined, 'sasint');
    t2.tick(361_000);
    expect(has(t2, 'eltas', 'eltas_adv_leadership')).toBe(false);
  });
});

describe('태초 · 에오릴 ↔ 라엘 ↔ 킬데르', () => {
  it('시련 성공 60초 후 라엘이 시험을 얻고, 시험 성공 시 마스터의 권능(보디가드·목숨 무시 살해)', () => {
    const t = table();
    fill(t, 'eoril', 'rael', 'consume');
    t.skill('consume', 'consume_master_guard', 'eltas');
    expect(t.skill('eoril', 'eoril_trial', 'rael').ok).toBe(true);
    expect(has(t, 'rael', 'rael_eoril_test')).toBe(false);
    t.tick(60_000);
    expect(has(t, 'rael', 'rael_eoril_test')).toBe(true);
    t.skill('rael', 'rael_eoril_test', 'eoril');
    expect(has(t, 'rael', 'rael_master_power')).toBe(true);
    t.skill('rael', 'rael_master_power', 'eltas');
    expect(t.p('eltas').alive).toBe(false);
    expect(t.state.winner).toBe(1);
  });
  it('시련·시험은 실패해도 소멸한다', () => {
    const t = table();
    fill(t, 'eoril');
    t.skill('eoril', 'eoril_trial', 'kane');
    expect(has(t, 'eoril', 'eoril_trial')).toBe(false);
  });
  it('카사노바: 2분 후 획득, 킬데르 공표자에겐 불가(비용 없음), 8초 후 결과, 에오릴은 통보받는다', () => {
    const t = table();
    expect(has(t, 'kilder', 'kilder_casanova')).toBe(false);
    t.tick(120_000);
    expect(has(t, 'kilder', 'kilder_casanova')).toBe(true);
    fill(t, 'kilder', 'tachin');
    t.publish('tachin', 'kilder');
    const mana = t.p('kilder').mana;
    expect(t.skill('kilder', 'kilder_casanova', 'tachin').ok).toBe(false);
    expect(t.p('kilder').mana).toBe(mana);
    t.publish('eoril', 'eoril');
    const r = t.skill('kilder', 'kilder_casanova', 'eoril');
    expect(r.ok).toBe(true);
    const eorilSees = t.texts(t.seen('eoril'));
    expect(eorilSees.some((x) => x.includes('뱀파이어의 정체는'))).toBe(true);
    expect(eorilSees.some((x) => x.includes('당신의 정체가 킬데르에게'))).toBe(true);
    expect(t.texts(t.seen('kilder')).some((x) => x.includes('에오릴이다'))).toBe(false);
    t.tick(8_000);
    expect(t.texts(t.seen('kilder')).some((x) => x.includes('에오릴이다'))).toBe(true);
  });
  it('킬데르가 공격으로 에오릴을 죽이면 카사노바 → 마스터의 권능, 뱀파이어릭 마나 +50', () => {
    const t = table();
    t.tick(120_000);
    fill(t, 'kilder');
    t.p('kilder').mana = 100;
    t.skill('kilder', 'attack', 'eoril', 'eoril');
    expect(t.p('eoril').alive).toBe(false);
    expect(has(t, 'kilder', 'kilder_casanova')).toBe(false);
    expect(has(t, 'kilder', 'kilder_master_power')).toBe(true);
    expect(t.p('kilder').mana).toBe(100 - 50 + 50);
  });
  it('피닉스의 불꽃: 레지스턴스 없는 컨슘만 죽인다. 포박의 주술이 레지스턴스를 없앤다', () => {
    const t = table();
    fill(t, 'eoril', 'hermilly', 'kumarin');
    t.skill('hermilly', 'hermilly_libido_protection', 'consume');
    expect(has(t, 'consume', 'consume_resistance')).toBe(true);
    const r = t.skill('kumarin', 'kumarin_binding', 'consume');
    expect(lastText(r)).toContain('소멸');
    expect(has(t, 'consume', 'consume_resistance')).toBe(false);
    t.skill('eoril', 'eoril_phoenix_flame', 'consume');
    expect(t.p('consume').alive).toBe(false);
  });
});

describe('태초 · 컨슘 성장', () => {
  it('트레이닝·인챈트먼트 머슬·리비도의 보호를 다 받아야 최종 진화 → 학살 반복 사용', () => {
    const t = table();
    fill(t, 'sasint', 'drakan', 'hermilly', 'consume');
    const fail = t.skill('consume', 'consume_final_evolution');
    expect(fail.ok).toBe(true);
    expect(has(t, 'consume', 'consume_slaughter')).toBe(false);
    expect(has(t, 'consume', 'consume_final_evolution')).toBe(false); // 실패해도 소멸

    const t2 = table();
    fill(t2, 'sasint', 'drakan', 'hermilly', 'consume');
    t2.skill('sasint', 'sasint_training', 'consume');
    expect(has(t2, 'consume', 'attack')).toBe(false);
    expect(has(t2, 'consume', 'advanced_attack')).toBe(true);
    t2.skill('drakan', 'drakan_enchant_muscle', 'consume');
    expect(t2.p('consume').extraLives).toBe(2);
    t2.skill('hermilly', 'hermilly_libido_protection', 'consume');
    t2.skill('consume', 'consume_final_evolution');
    expect(has(t2, 'consume', 'consume_slaughter')).toBe(true);
    t2.skill('consume', 'consume_slaughter', 'tachin');
    expect(t2.p('tachin').alive).toBe(false);
    expect(t2.skill('consume', 'consume_slaughter', 'kane').ok).toBe(false); // 쿨 30
    fill(t2, 'consume');
    expect(t2.skill('consume', 'consume_slaughter', 'kane', undefined, 31_000).ok).toBe(true);
  });
});

describe('태초 · 기타', () => {
  it('시잉 오브 리비도: 30초 후 정체 확인, 중화의 주술(무적 대상 가능)로 무산', () => {
    const t = table();
    fill(t, 'hermilly', 'tachin');
    t.skill('hermilly', 'hermilly_seeing_libido', 'rael');
    expect(t.skill('eltas', 'supreme_attack', 'rael', 'rael').ok).toBe(false); // 무적
    t.tick(30_000);
    expect(t.texts(t.seen('hermilly')).some((x) => x.includes('라엘이다'))).toBe(true);

    const t2 = table();
    fill(t2, 'hermilly', 'tachin');
    t2.skill('hermilly', 'hermilly_seeing_libido', 'rael');
    expect(t2.skill('tachin', 'tachin_neutralize', 'rael', undefined, 5_000).ok).toBe(true);
    t2.tick(30_000);
    expect(t2.texts(t2.seen('hermilly')).some((x) => x.includes('라엘이다'))).toBe(false);
  });
  it('블러디 하트: 적에게 명중(목숨 감소)해도 +30, 아군에겐 없음', () => {
    const t = table();
    t.p('eltas').mana = 100;
    t.skill('eltas', 'supreme_attack', 'kane', 'kane');
    expect(t.p('kane').extraLives).toBe(0);
    expect(t.p('eltas').mana).toBe(100 - 50 + 30);
  });
  it('전체 채팅은 익명, 마나 25', () => {
    const t = table();
    const r = t.act('nukelius', { type: 'chat', channel: 'global', text: '안녕' });
    expect(r.ok).toBe(true);
    expect(lastText(r)).toBe('|전체 채팅|: 안녕');
    expect(t.p('nukelius').mana).toBe(120 - 25);
    expect(t.act('rael', { type: 'chat', channel: 'global', text: 'x' }).ok).toBe(false);
  });
  it('스캔은 지휘관(라엘·엘타스)을 고를 수 없다', () => {
    const t = table();
    const v = viewFor(t.state, t.id.hermilly!);
    const scan = v.me.skills.find((s) => s.key === 'scan')!;
    expect(scan.nameOptions).not.toContain('rael');
    expect(scan.nameOptions).not.toContain('eltas');
    expect(scan.nameOptions).toContain('kane');
  });
  it('8~11인 마스크대로 제외되고, 무작위 봇으로 200판 돌려도 예외·정지 없음', () => {
    for (let i = 0; i < 200; i++) {
      const n = 8 + (i % 5);
      const players = Array.from({ length: n }, (_, k) => ({ id: `p${k + 1}`, nickname: `봇${k + 1}` }));
      const { state } = createGame({ mode: 'primordial', players, seed: 7000 + i, now: 0 });
      const rng = { rng: i };
      let now = 0;
      while (state.phase === 'running' && now < 60 * 60 * 1000) {
        now += 1000;
        advance(state, now);
        for (const p of state.players) {
          const a = randomBotAction(state, p.id, rng, { activity: 0.05 });
          if (a) applyAction(state, p.id, a, now);
        }
      }
      expect(state.phase, `seed ${7000 + i}`).toBe('ended');
    }
  });
});
