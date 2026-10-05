import { describe, expect, it } from 'vitest';
import { advance, applyAction, createGame, randomBotAction, viewFor } from '../src/index.js';
import { fill, lastText, modeTable, TROLL_ORDER } from './helpers.js';

const table = (seed = 1) => modeTable('troll', TROLL_ORDER, seed);
const has = (t: ReturnType<typeof table>, c: string, k: string) => t.p(c).skills.some((s) => s.key === k);

describe('트롤 · 승리 조건', () => {
  it('데카 사망 → 얼음 부족 승리 (블러디 매드니스는 마나 25 미만일 때만 뚫린다)', () => {
    const t = table();
    fill(t, 'satoshi');
    t.p('deka').mana = 40;
    const r1 = t.skill('satoshi', 'advanced_attack', 'deka', 'deka');
    expect(lastText(r1)).toContain('블러디 매드니스');
    expect(t.p('deka').alive).toBe(true);
    expect(t.p('deka').mana).toBe(15);
    expect(t.p('satoshi').alive).toBe(true);
    t.skill('satoshi', 'advanced_attack', 'deka', 'deka', 61_000);
    expect(t.p('deka').alive).toBe(false);
    expect(t.state.winner).toBe(1);
  });
  it('치스 사망 → 반란자 승리 (사토시·즈윈라 둘 다 죽어야 공격이 통한다)', () => {
    const t = table();
    fill(t, 'kazrow', 'deka', 'neonis');
    t.p('deka').mana = 150;
    const r = t.skill('kazrow', 'advanced_attack', 'chis', 'chis');
    expect(lastText(r)).toContain('실패');
    expect(t.p('chis').alive).toBe(true);
    // 사토시(목숨 2) 처치
    t.skill('deka', 'supreme_attack', 'satoshi', 'satoshi');
    t.skill('deka', 'supreme_attack', 'satoshi', 'satoshi', 61_000);
    expect(t.p('satoshi').alive).toBe(false);
    // 즈윈라만 살아 있어도 보호
    expect(lastText(t.skill('kazrow', 'advanced_attack', 'chis', 'chis', 62_000))).toContain('실패');
    expect(t.p('chis').alive).toBe(true);
    fill(t, 'deka');
    t.skill('deka', 'supreme_attack', 'zwinra', 'zwinra', 122_000);
    t.skill('deka', 'supreme_attack', 'zwinra', 'zwinra', 183_000);
    expect(t.p('zwinra').alive).toBe(false);
    fill(t, 'neonis');
    t.skill('neonis', 'attack', 'chis', 'chis', 184_000);
    expect(t.p('chis').alive).toBe(false);
    expect(t.state.winner).toBe(2);
  });
  it('사토시·즈윈라·울디안 전멸 → 반란자 승리 (치스가 살아 있어도)', () => {
    const t = table();
    fill(t, 'deka');
    t.p('deka').mana = 150;
    t.skill('deka', 'supreme_attack', 'uldian', 'uldian');
    t.skill('deka', 'supreme_attack', 'satoshi', 'satoshi', 61_000);
    t.skill('deka', 'supreme_attack', 'satoshi', 'satoshi', 122_000);
    fill(t, 'deka');
    t.skill('deka', 'supreme_attack', 'zwinra', 'zwinra', 183_000);
    expect(t.state.phase).toBe('running');
    t.skill('deka', 'supreme_attack', 'zwinra', 'zwinra', 244_000);
    expect(t.state.winner).toBe(2);
    expect(t.state.endReason).toContain('공격할 힘');
    expect(t.p('chis').alive).toBe(true);
  });
});

describe('트롤 · 치스 · 사토시 · 즈윈라', () => {
  it('홀리 바인딩: 데카면 정체 공개 + 블러디 매드니스 제거, 광폭화 상태면 마나 −80', () => {
    const t = table();
    fill(t, 'chis');
    t.skill('chis', 'holy_binding', 'deka');
    expect(t.state.revealed[t.id.deka!]).toBe('deka');
    expect(has(t, 'deka', 'bloody_madness')).toBe(false);
    expect(has(t, 'chis', 'holy_binding')).toBe(false);

    const t2 = table();
    fill(t2, 'chis', 'kanulla');
    t2.skill('kanulla', 'destroyer_guidance', 'deka');
    expect(has(t2, 'deka', 'berserk_deka')).toBe(true);
    expect(t2.p('deka').mana).toBe(150);
    t2.skill('chis', 'holy_binding', 'deka');
    expect(has(t2, 'deka', 'bloody_madness')).toBe(true);
    expect(t2.p('deka').mana).toBe(70);
  });
  it('홀리 바인딩 실패는 공개되고 소멸', () => {
    const t = table();
    fill(t, 'chis');
    const r = t.skill('chis', 'holy_binding', 'neonis');
    expect(lastText(r)).toContain('데카가 아닙니다');
    expect(has(t, 'chis', 'holy_binding')).toBe(false);
  });
  it('정령의 주술: 3분 후 획득, 진명 필요, 보석 없는 반란자만 알아낸다', () => {
    const t = table();
    expect(has(t, 'chis', 'spirit_hex')).toBe(false);
    t.tick(180_000);
    expect(has(t, 'chis', 'spirit_hex')).toBe(true);
    fill(t, 'chis');
    expect(t.skill('chis', 'spirit_hex', 'neonis').ok).toBe(false);
    t.publish('chis', 'chis');
    expect(lastText(t.skill('chis', 'spirit_hex', 'neonis'))).toContain('네오니스');
    t.p('kazrow').gem = 1;
    expect(lastText(t.skill('chis', 'spirit_hex', 'kazrow', undefined, 241_000))).toContain('실패');
    expect(lastText(t.skill('chis', 'spirit_hex', 'hachi', undefined, 302_000))).toContain('실패');
  });
  it('형제: 서로 맞히면 동맹 + 아군 확인, 양쪽 형제 소멸', () => {
    const t = table();
    fill(t, 'satoshi', 'zwinra');
    expect(lastText(t.skill('satoshi', 'brothers', 'hachi'))).toContain('즈윈라가 아닙니다');
    expect(has(t, 'satoshi', 'brothers')).toBe(true);
    t.skill('zwinra', 'brothers', 'satoshi');
    expect(t.p('satoshi').allies).toContain(t.id.zwinra);
    expect(t.p('zwinra').allies).toContain(t.id.satoshi);
    expect(has(t, 'satoshi', 'brothers')).toBe(false);
    expect(has(t, 'zwinra', 'brothers')).toBe(false);
    expect(has(t, 'satoshi', 'ally_check')).toBe(true);
    expect(has(t, 'zwinra', 'ally_check')).toBe(true);
  });
  it('족장 보호 + 사토시 생존이면 무모한 돌진이 막히고 서로의 정체를 안다', () => {
    const t = table();
    fill(t, 'satoshi', 'kazrow', 'seirow');
    t.skill('satoshi', 'chief_protection', 'chis');
    expect(t.state.modeState.chiefProtected).toBe(true);
    const r = t.skill('kazrow', 'reckless_charge', 'chis');
    expect(lastText(r)).toContain('가로막혔습니다');
    expect(t.p('chis').alive).toBe(true);
    expect(t.p('kazrow').alive).toBe(true);
    expect(has(t, 'kazrow', 'reckless_charge')).toBe(false);
    expect(t.texts(t.seen('satoshi')).some((x) => x.includes('돌격한 자의 정체는'))).toBe(true);
    expect(t.texts(t.seen('kazrow')).some((x) => x.includes('사토시의 정체는'))).toBe(true);
    // 사토시가 죽으면 보호 무효
    fill(t, 'deka');
    t.p('deka').mana = 150;
    t.skill('deka', 'supreme_attack', 'satoshi', 'satoshi');
    t.skill('deka', 'supreme_attack', 'satoshi', 'satoshi', 61_000);
    t.skill('seirow', 'reckless_charge', 'chis');
    expect(t.p('chis').alive).toBe(false);
    expect(t.state.winner).toBe(2);
  });
  it('무모한 돌진은 보디가드·목숨을 무시하고 둘 다 죽는다', () => {
    const t = table();
    fill(t, 'kazrow');
    t.skill('kazrow', 'reckless_charge', 'satoshi');
    expect(t.p('satoshi').alive).toBe(false);
    expect(t.p('kazrow').alive).toBe(false);
    expect(t.state.phase).toBe('running');
  });
  it('족장 탐색: 3분 후 획득, 진명 필요, 60초 후 치스 확인', () => {
    const t = table();
    t.tick(180_000);
    expect(has(t, 'zwinra', 'chief_search')).toBe(true);
    fill(t, 'zwinra');
    expect(t.skill('zwinra', 'chief_search').ok).toBe(false);
    t.publish('zwinra', 'zwinra');
    expect(t.skill('zwinra', 'chief_search').ok).toBe(true);
    expect(t.texts(t.seen('zwinra')).some((x) => x.includes('치스는'))).toBe(false);
    t.tick(60_000);
    expect(t.texts(t.seen('zwinra')).some((x) => x.includes('치스는'))).toBe(true);
  });
});

describe('트롤 · 하치 · 토크라 · 울디안 · 울피안', () => {
  it('하이드: 확인·스캔으로 하치를 맞힐 수 없다', () => {
    const t = table();
    fill(t, 'uldian', 'neonis', 'chis');
    t.publish('hachi', 'hachi');
    expect(lastText(t.skill('uldian', 'ally_check', 'hachi'))).toContain('실패');
    expect(lastText(t.skill('neonis', 'enemy_check', 'hachi'))).toContain('실패');
    const r = t.skill('chis', 'troll_ally_scan', 'hachi', 'hachi');
    expect(lastText(r)).toContain('실패');
    expect(r.events.every((e) => !e.facts?.length)).toBe(true); // 하치 실패는 추론 정보가 아님
  });
  it('사냥꾼의 표식: 맞히면 대상 공개, 틀리면 하치 공개', () => {
    const t = table();
    fill(t, 'hachi');
    t.skill('hachi', 'hunters_mark', 'deka', 'deka');
    expect(t.state.revealed[t.id.deka!]).toBe('deka');
    expect(t.state.revealed[t.id.hachi!]).toBeUndefined();
    t.skill('hachi', 'hunters_mark', 'kazrow', 'seirow', 61_000);
    expect(t.state.revealed[t.id.hachi!]).toBe('hachi');
  });
  it('맹독 −30, 고대의 주술은 조각 있을 때만 (쿨 150 반복), 지원 +30', () => {
    const t = table();
    fill(t, 'hachi', 'tokra');
    t.p('deka').mana = 100;
    t.skill('hachi', 'troll_venom', 'deka');
    expect(t.p('deka').mana).toBe(70);
    expect(t.skill('hachi', 'ancient_hex_hachi').ok).toBe(false);
    t.p('hachi').gem = 1;
    expect(t.skill('hachi', 'ancient_hex_hachi').ok).toBe(true);
    expect(t.p('hachi').gem).toBe(2);
    expect(t.skill('hachi', 'ancient_hex_hachi', undefined, undefined, 100_000).ok).toBe(false); // 쿨
    fill(t, 'hachi');
    expect(t.skill('hachi', 'ancient_hex_hachi', undefined, undefined, 151_000).ok).toBe(true);
    expect(t.p('hachi').gem).toBe(3);
    t.p('deka').mana = 50;
    t.skill('tokra', 'support', 'deka');
    expect(t.p('deka').mana).toBe(80);
    expect(t.skill('tokra', 'support', 'tokra', undefined, 300_000).ok).toBe(false);
  });
  it('야생의 정기(2분) → 10초 후 야생의 축복 → 울디안 상급 공격 / 울피안 배틀 센스, 실패 시 소멸', () => {
    const t = table();
    expect(has(t, 'tokra', 'wild_essence')).toBe(false);
    t.tick(120_000);
    fill(t, 'tokra');
    expect(lastText(t.skill('tokra', 'wild_essence', 'hachi'))).toContain('느껴지지 않습니다');
    expect(lastText(t.skill('tokra', 'wild_essence', 'ulpian', undefined, 161_000))).toContain('느껴집니다');
    expect(has(t, 'tokra', 'wild_essence')).toBe(false);
    t.tick(10_000);
    expect(has(t, 'tokra', 'wild_blessing')).toBe(true);
    t.skill('tokra', 'wild_blessing', 'uldian');
    expect(has(t, 'uldian', 'attack')).toBe(false);
    expect(has(t, 'uldian', 'advanced_attack')).toBe(true);
    expect(has(t, 'tokra', 'wild_blessing')).toBe(true);
    fill(t, 'tokra');
    t.skill('tokra', 'wild_blessing', 'ulpian', undefined, 262_000);
    expect(has(t, 'ulpian', 'battle_sense')).toBe(true);
    fill(t, 'tokra');
    t.skill('tokra', 'wild_blessing', 'hachi', undefined, 353_000);
    expect(has(t, 'tokra', 'wild_blessing')).toBe(false);
  });
  it('야생의 길: 20초 뒤에도 진명이면 치스 확인, 바꿨으면 실패', () => {
    const t = table();
    fill(t, 'uldian');
    expect(t.skill('uldian', 'wild_path').ok).toBe(false);
    t.publish('uldian', 'uldian');
    expect(t.skill('uldian', 'wild_path', undefined, undefined, 41_000).ok).toBe(true);
    expect(t.publish('uldian', 'hachi', 45_000).ok).toBe(true);
    t.tick(20_000);
    expect(t.texts(t.seen('uldian')).some((x) => x.includes('치스는'))).toBe(false);
    expect(t.texts(t.seen('uldian')).some((x) => x.includes('실패'))).toBe(true);
  });
  it("정화의 주술: 카'눌라 또는 혼돈의 주술 대상(데카 포함)을 즉사", () => {
    const t = table();
    fill(t, 'ulpian', 'kanulla');
    t.publish('kanulla', 'kanulla');
    t.skill('kanulla', 'chaos_hex', 'deka');
    t.tick(60_000);
    expect(t.state.modeState.chaosTarget).toBe(t.id.deka);
    expect(t.texts(t.seen('kanulla')).some((x) => x.includes('데카다'))).toBe(true);
    t.p('deka').mana = 150;
    t.skill('ulpian', 'purify_hex', 'deka');
    expect(t.p('deka').alive).toBe(false);
    expect(t.state.winner).toBe(1);

    const t2 = table();
    fill(t2, 'ulpian');
    expect(lastText(t2.skill('ulpian', 'purify_hex', 'seirow'))).toContain('실패');
    expect(has(t2, 'ulpian', 'purify_hex')).toBe(false);
  });
  it('울디안↔울피안, 카즈로우↔세이로우는 시작 동맹', () => {
    const t = table();
    expect(t.p('uldian').allies).toContain(t.id.ulpian);
    expect(t.p('ulpian').allies).toContain(t.id.uldian);
    expect(t.p('kazrow').allies).toContain(t.id.seirow);
    expect(t.p('seirow').allies).toContain(t.id.kazrow);
    expect(t.p('chis').allies).toHaveLength(0);
  });
});

describe('트롤 · 반란자', () => {
  it('위장: 얼음 이름을 공표한 네오니스는 얼음 부족의 아군 확인·스캔을 속인다 (적군 확인은 못 속임)', () => {
    const t = table();
    fill(t, 'uldian', 'chis', 'ulpian');
    t.publish('neonis', 'tokra');
    expect(lastText(t.skill('uldian', 'ally_check', 'neonis'))).toContain('토크라');
    expect(lastText(t.skill('chis', 'troll_ally_scan', 'neonis', 'tokra'))).toContain('성공');
    expect(lastText(t.skill('ulpian', 'enemy_check', 'neonis'))).toContain('실패');
  });
  it("네비아탄의 화신(마나 0), 혼돈의 주술은 진명 필요·반란자만, 파괴자의 인도는 데카가 아니면 비공개 실패 후 소멸", () => {
    const t = table();
    fill(t, 'neonis', 'kanulla');
    const m = t.p('neonis').mana;
    expect(lastText(t.skill('neonis', 'neviathan_avatar', 'kanulla'))).toContain("카'눌라이다");
    expect(t.p('neonis').mana).toBe(m);
    expect(t.skill('kanulla', 'chaos_hex', 'chis').ok).toBe(false);
    t.publish('kanulla', 'kanulla');
    t.skill('kanulla', 'chaos_hex', 'chis');
    t.tick(60_000);
    expect(t.texts(t.seen('kanulla')).some((x) => x.includes('실패한 모양'))).toBe(true);
    const r = t.skill('kanulla', 'destroyer_guidance', 'chis');
    expect(r.events.every((e) => e.vis.to === 'players')).toBe(true);
    expect(has(t, 'kanulla', 'destroyer_guidance')).toBe(false);
    expect(t.p('kanulla').alive).toBe(true);
  });
  it("파괴자의 인도: 데카에게 광폭화 + 마나 전부, 카'눌라 사망. 블러디 매드니스가 없으면 되돌려 준다", () => {
    const t = table();
    fill(t, 'kanulla', 'chis');
    t.skill('chis', 'holy_binding', 'deka');
    expect(has(t, 'deka', 'bloody_madness')).toBe(false);
    t.skill('kanulla', 'destroyer_guidance', 'deka');
    expect(has(t, 'deka', 'bloody_madness')).toBe(true);
    expect(has(t, 'deka', 'berserk_deka')).toBe(false);
    expect(t.p('kanulla').alive).toBe(false);
  });
  it('카즈로우 광폭화: 진명 필요, 모든 스킬 쿨 초기화', () => {
    const t = table();
    fill(t, 'kazrow');
    t.p('deka').mana = 0;
    t.skill('kazrow', 'advanced_attack', 'hachi', 'uldian'); // 실패 1단계
    expect(t.skill('kazrow', 'advanced_attack', 'hachi', 'hachi').ok).toBe(false); // 쿨
    expect(t.skill('kazrow', 'berserk_kazrow').ok).toBe(false);
    t.publish('kazrow', 'kazrow');
    expect(t.skill('kazrow', 'berserk_kazrow').ok).toBe(true);
    expect(t.skill('kazrow', 'advanced_attack', 'hachi', 'hachi').ok).toBe(true);
    expect(t.p('hachi').alive).toBe(false);
  });
  it('세이로우 광폭화: 상급 아군 확인 → 상급 공격 + 다크 스킨(목숨 2), 20초 후 공개', () => {
    const t = table();
    fill(t, 'seirow');
    t.publish('seirow', 'seirow');
    t.skill('seirow', 'berserk_seirow');
    expect(has(t, 'seirow', 'advanced_ally_check')).toBe(false);
    expect(has(t, 'seirow', 'advanced_attack')).toBe(true);
    expect(has(t, 'seirow', 'dark_skin')).toBe(true);
    expect(t.p('seirow').extraLives).toBe(1);
    expect(t.texts(t.seen('chis')).some((x) => x.includes('광폭화'))).toBe(false);
    t.tick(20_000);
    expect(t.texts(t.seen('chis')).some((x) => x.includes('광폭화'))).toBe(true);
  });
  it('전체 채팅은 치스·네오니스만, 익명, 마나 25. 스캔 목록에 치스·데카 없음', () => {
    const t = table();
    const r = t.act('neonis', { type: 'chat', channel: 'global', text: '안녕' });
    expect(r.ok).toBe(true);
    expect(lastText(r)).toBe('|전체 채팅|: 안녕');
    expect(t.p('neonis').mana).toBe(120 - 25);
    expect(t.act('deka', { type: 'chat', channel: 'global', text: 'x' }).ok).toBe(false);
    const v = viewFor(t.state, t.id.tokra!);
    const scan = v.me.skills.find((s) => s.key === 'troll_scan')!;
    expect(scan.nameOptions).not.toContain('chis');
    expect(scan.nameOptions).not.toContain('deka');
    expect(scan.nameOptions).toContain('hachi');
    const es = viewFor(t.state, t.id.kanulla!).me.skills.find((s) => s.key === 'troll_enemy_scan')!;
    expect(es.nameOptions).toEqual(expect.arrayContaining(['satoshi', 'zwinra', 'hachi', 'tokra', 'uldian', 'ulpian']));
    expect(es.nameOptions).not.toContain('chis');
  });
  it('8~11인 마스크대로 제외되고, 무작위 봇으로 200판 돌려도 예외·정지 없음', () => {
    for (let i = 0; i < 200; i++) {
      const n = 8 + (i % 5);
      const players = Array.from({ length: n }, (_, k) => ({ id: `p${k + 1}`, nickname: `봇${k + 1}` }));
      const { state } = createGame({ mode: 'troll', players, seed: 11_000 + i, now: 0 });
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
      expect(state.phase, `seed ${11_000 + i}`).toBe('ended');
    }
  });
});
