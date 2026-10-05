import { describe, expect, it } from 'vitest';
import { advance, applyAction, createGame, randomBotAction, viewFor } from '../src/index.js';
import { fill, lastText, LIDELLUT_ORDER, modeTable } from './helpers.js';

const table = (seed = 1) => modeTable('lidellut', LIDELLUT_ORDER, seed);
const has = (t: ReturnType<typeof table>, c: string, k: string) => t.p(c).skills.some((s) => s.key === k);

/** 유이에게 합류 4번 → 전략 포인트 4 */
function joinAll(t: ReturnType<typeof table>): void {
  fill(t, 'shining', 'chizuko', 'loneris', 'supra', 'kamikaze');
  for (const c of ['chizuko', 'loneris', 'supra', 'kamikaze'] as const) expect(t.skill(c, 'join', 'yui').ok).toBe(true);
  expect(t.state.modeState.Z).toBe(4);
}

describe('황야 · 승리 조건', () => {
  it('카이 사망 → 가디언 승리 (아린이 죽은 뒤 일반 공격으로)', () => {
    const t = table();
    fill(t, 'yui', 'supra');
    t.skill('yui', 'attack', 'arin', 'arin');
    expect(t.p('arin').alive).toBe(false);
    t.skill('supra', 'advanced_attack', 'kai', 'kai');
    expect(t.p('kai').alive).toBe(false);
    expect(t.state.winner).toBe(2);
  });
  it('샤이닝 + 기사단 전원 사망 → 다크니스 승리 (카미카제가 살아 있어도)', () => {
    const t = table();
    fill(t, 'kai', 'kaspa');
    t.skill('kai', 'soul_reaver', 'shining');
    expect(t.p('shining').alive).toBe(false);
    expect(t.state.phase).toBe('running');
    t.skill('kaspa', 'attack', 'yui', 'yui');
    t.skill('kaspa', 'attack', 'loneris', 'loneris', 61_000);
    expect(t.state.phase).toBe('running');
    fill(t, 'kaspa');
    t.skill('kaspa', 'attack', 'supra', 'supra', 122_000);
    expect(t.state.winner).toBe(1);
  });
  it('위대한 의지 실패 후 기사단 + 카미카제 전멸이면 샤이닝이 살아 있어도 다크니스 승리', () => {
    const t = table();
    fill(t, 'shining', 'kai', 'kaspa', 'tuma');
    t.skill('shining', 'great_will', 'arin');
    expect(t.state.modeState.greatWillFailed).toBe(true);
    expect(t.p('shining').alive).toBe(true);
    t.skill('tuma', 'valiant_charge', 'kamikaze');
    expect(t.p('kamikaze').alive).toBe(false);
    t.skill('kaspa', 'attack', 'yui', 'yui');
    t.skill('kaspa', 'attack', 'loneris', 'loneris', 61_000);
    fill(t, 'kaspa');
    t.skill('kaspa', 'attack', 'supra', 'supra', 122_000);
    expect(t.state.winner).toBe(1);
    expect(t.p('shining').alive).toBe(true);
  });
  it('위대한 의지 실패 → 20초 후 샤이닝 정체 공개', () => {
    const t = table();
    fill(t, 'shining');
    t.skill('shining', 'great_will', 'tuma');
    expect(t.state.revealed[t.id.shining!]).toBeUndefined();
    t.tick(20_000);
    expect(t.state.revealed[t.id.shining!]).toBe('shining');
  });
  it('위대한 의지로 카이를 맞히면 보디가드 무시 즉사 → 가디언 승리', () => {
    const t = table();
    fill(t, 'shining');
    t.skill('shining', 'great_will', 'kai');
    expect(t.p('kai').alive).toBe(false);
    expect(t.state.winner).toBe(2);
  });
});

describe('황야 · 보디가드 (아린)', () => {
  it('아린이 살아 있으면 카이 정답 공격자가 실패 처리된다', () => {
    const t = table();
    fill(t, 'yui');
    const r = t.skill('yui', 'attack', 'kai', 'kai');
    expect(lastText(r)).toContain('실패');
    expect(t.p('kai').alive).toBe(true);
    expect(t.p('yui').alive).toBe(false);
  });
  it('매스 텔레포트는 보디가드를 무시하고 유이 정체를 공개한다', () => {
    const t = table();
    joinAll(t);
    t.tick(10_000);
    expect(has(t, 'yui', 'mass_teleport')).toBe(true);
    fill(t, 'yui');
    t.skill('yui', 'mass_teleport', 'kai');
    expect(t.p('kai').alive).toBe(false);
    expect(t.state.winner).toBe(2);
  });
});

describe('황야 · 합류 · 기사단', () => {
  it('유이가 아닌 대상에게 합류하면 실패하고 정체가 공개된다', () => {
    const t = table();
    fill(t, 'chizuko');
    const r = t.skill('chizuko', 'join', 'tuma');
    expect(lastText(r)).toContain('치즈코의 정체는');
    expect(t.state.revealed[t.id.chizuko!]).toBe('chizuko');
    expect(t.state.modeState.Z ?? 0).toBe(0);
  });
  it('전략 포인트 4 → 10초 후 매스 텔레포트, 세례를 받았으면 상급 매스 텔레포트(정체 비공개)', () => {
    const t = table();
    fill(t, 'chizuko');
    t.skill('chizuko', 'angel_baptism', 'yui', 'yui');
    expect(t.p('yui').flags.baptized).toBe(true);
    expect(has(t, 'yui', 'scan')).toBe(true);
    joinAll(t);
    expect(has(t, 'kamikaze', 'join')).toBe(false); // 4 이상이면 합류 소멸
    t.tick(10_000);
    expect(has(t, 'yui', 'greater_mass_teleport')).toBe(true);
    expect(has(t, 'yui', 'mass_teleport')).toBe(false);
    t.skill('yui', 'greater_mass_teleport', 'tuma');
    expect(t.p('tuma').alive).toBe(false);
    expect(t.state.revealed[t.id.yui!]).toBeUndefined();
  });
  it('기사단 창설(수프라) + 유이 합류 → 기사단의 심문, 60초 후 정체 확인', () => {
    const t = table();
    fill(t, 'loneris');
    expect(t.skill('loneris', 'order_founding', 'kai').ok).toBe(true);
    expect(has(t, 'loneris', 'order_founding')).toBe(false);
    const t2 = table();
    fill(t2, 'loneris');
    t2.skill('loneris', 'order_founding', 'supra');
    expect(has(t2, 'loneris', 'order_inquisition')).toBe(false);
    t2.skill('loneris', 'join', 'yui');
    expect(has(t2, 'loneris', 'order_inquisition')).toBe(true);
    fill(t2, 'loneris');
    t2.skill('loneris', 'order_inquisition', 'sepi');
    expect(t2.texts(t2.seen('loneris')).some((x) => x.includes('세피이다') || x.includes('세피다'))).toBe(false);
    t2.tick(60_000);
    expect(t2.texts(t2.seen('loneris')).some((x) => x.includes('세피다'))).toBe(true);
  });
});

describe('황야 · 기사도 · 천사의 세례', () => {
  it('기사도: 진명 공표가 있어야 성공, 보상 후 소멸', () => {
    const t = table();
    fill(t, 'loneris', 'supra', 'yui');
    expect(lastText(t.skill('loneris', 'chivalry', 'yui'))).toContain('실패');
    t.publish('loneris', 'loneris');
    expect(lastText(t.skill('loneris', 'chivalry', 'yui', undefined, 36_000))).toContain('유이다');
    expect(has(t, 'loneris', 'enemy_check')).toBe(true);
    expect(has(t, 'loneris', 'chivalry')).toBe(false);
    t.skill('supra', 'chivalry', 'loneris');
    expect(t.p('supra').extraLives).toBe(1);
    t.skill('yui', 'chivalry', 'loneris');
    expect(has(t, 'yui', 'scan')).toBe(true);
  });
  it('기사도는 기사가 아닌 대상에겐 실패하고 소멸하지 않는다', () => {
    const t = table();
    fill(t, 'supra');
    t.publish('supra', 'supra');
    t.skill('supra', 'chivalry', 'chizuko');
    expect(has(t, 'supra', 'chivalry')).toBe(true);
    expect(t.p('supra').extraLives).toBe(0);
  });
  it('세례: 수프라 목숨 +2, 상한 3, 같은 기사 2번 불가, 틀리면 스킬 소멸', () => {
    const t = table();
    fill(t, 'chizuko', 'supra');
    t.skill('chizuko', 'angel_baptism', 'supra', 'supra');
    expect(t.p('supra').extraLives).toBe(2);
    expect(t.skill('chizuko', 'angel_baptism', 'supra', 'supra', 31_000).ok).toBe(false);
    t.publish('supra', 'supra');
    t.skill('supra', 'chivalry', 'yui');
    expect(t.p('supra').extraLives).toBe(3);
    fill(t, 'chizuko');
    t.skill('chizuko', 'angel_baptism', 'tuma', 'loneris', 62_000);
    expect(has(t, 'chizuko', 'angel_baptism')).toBe(false);
  });
  it('로네리스 세례 → 이단 심판: 카스파·프레이아만 살해, 공격이 상급 공격으로', () => {
    const t = table();
    fill(t, 'chizuko', 'loneris');
    t.skill('chizuko', 'angel_baptism', 'loneris', 'loneris');
    expect(has(t, 'loneris', 'heresy_judgment')).toBe(true);
    t.skill('loneris', 'heresy_judgment', 'tuma');
    expect(t.p('tuma').alive).toBe(true);
    expect(has(t, 'loneris', 'attack')).toBe(true);
    t.skill('loneris', 'heresy_judgment', 'kaspa', undefined, 61_000);
    expect(t.p('kaspa').alive).toBe(false);
    expect(has(t, 'loneris', 'attack')).toBe(false);
    expect(has(t, 'loneris', 'advanced_attack')).toBe(true);
  });
  it('유이 세례 후 전략 4 이전에 매스 텔레포트를 이미 가졌으면 상급으로 교체', () => {
    const t = table();
    joinAll(t);
    t.tick(10_000);
    expect(has(t, 'yui', 'mass_teleport')).toBe(true);
    fill(t, 'chizuko');
    t.skill('chizuko', 'angel_baptism', 'yui', 'yui');
    expect(has(t, 'yui', 'mass_teleport')).toBe(false);
    expect(has(t, 'yui', 'greater_mass_teleport')).toBe(true);
  });
});

describe('황야 · 다크니스 스킬', () => {
  it('종교 동맹: 진명 공표 필요, 먼저 쓴 쪽만 유효, 60초 후 서로 정체 확인', () => {
    const t = table();
    fill(t, 'kaspa', 'freia');
    expect(t.skill('kaspa', 'religious_alliance').ok).toBe(false);
    t.publish('kaspa', 'kaspa');
    expect(t.skill('kaspa', 'religious_alliance').ok).toBe(true);
    t.publish('freia', 'freia');
    expect(t.skill('freia', 'religious_alliance').ok).toBe(false);
    t.tick(60_000);
    expect(t.texts(t.seen('kaspa')).some((x) => x.includes('프레이아는'))).toBe(true);
    expect(t.texts(t.seen('freia')).some((x) => x.includes('카스파는'))).toBe(true);
    expect(t.texts(t.seen('yui')).some((x) => x.includes('종교 동맹이 체결'))).toBe(true);
  });
  it('용맹한 돌진: 카미카제 즉사(목숨 무시), 최상급 공격, 카이와 동맹·정체 교환', () => {
    const t = table();
    fill(t, 'tuma');
    t.skill('tuma', 'valiant_charge', 'kamikaze');
    expect(t.p('kamikaze').alive).toBe(false);
    expect(has(t, 'tuma', 'supreme_attack')).toBe(true);
    expect(has(t, 'tuma', 'advanced_attack')).toBe(false);
    expect(t.p('kai').allies).toContain(t.id.tuma);
    expect(t.p('tuma').allies).toContain(t.id.kai);
    expect(t.texts(t.seen('kai')).some((x) => x.includes('투마의 정체는'))).toBe(true);
  });
  it('용맹한 돌진 실패는 공개되고 소멸한다', () => {
    const t = table();
    fill(t, 'tuma');
    const r = t.skill('tuma', 'valiant_charge', 'yui');
    expect(lastText(r)).toContain('실패');
    expect(has(t, 'tuma', 'valiant_charge')).toBe(false);
    expect(t.p('yui').alive).toBe(true);
  });
  it('미명의 안개: 다음 1회의 적군 확인·배틀 센스를 무산시키고 프레이아에게 알린다', () => {
    const t = table();
    fill(t, 'freia', 'kamikaze');
    t.skill('freia', 'dawn_mist', 'kai');
    const r = t.skill('kamikaze', 'battle_sense', 'kai');
    expect(lastText(r)).toContain('안개');
    expect(t.texts(t.seen('freia')).some((x) => x.includes('확인하려 했습니다'))).toBe(true);
    const r2 = t.skill('kamikaze', 'battle_sense', 'kai', undefined, 61_000);
    expect(lastText(r2)).toContain('상급 전사');
  });
  it('왜곡: 보석 한 단계 하락, 신탁은 5분 후 획득', () => {
    const t = table();
    fill(t, 'sepi', 'kaspa');
    t.p('yui').gem = 2;
    t.skill('sepi', 'distortion', 'yui');
    expect(t.p('yui').gem).toBe(1);
    expect(has(t, 'kaspa', 'oracle')).toBe(false);
    t.tick(300_000);
    expect(has(t, 'kaspa', 'oracle')).toBe(true);
    const r = t.skill('kaspa', 'oracle', 'yui');
    expect(lastText(r)).toContain('1/3');
  });
  it('버닝 매직 −50, 저주는 마나 50 이하만, 정기 흡수 +50', () => {
    const t = table();
    fill(t, 'sepi', 'kaspa');
    t.p('loneris').mana = 90;
    t.skill('sepi', 'burning_magic', 'loneris');
    expect(t.p('loneris').mana).toBe(40);
    const r = t.skill('sepi', 'curse', 'loneris');
    expect(lastText(r)).toContain('로네리스');
    t.p('kaspa').mana = 100;
    t.skill('kaspa', 'attack', 'loneris', 'loneris');
    expect(t.p('loneris').alive).toBe(false);
    expect(t.p('kaspa').mana).toBe(100 - 50 + 50);
  });
  it('소울 리버: 즉사 후 20초 뒤 카이 정체 공개', () => {
    const t = table();
    fill(t, 'kai');
    t.skill('kai', 'soul_reaver', 'kamikaze');
    expect(t.p('kamikaze').alive).toBe(false);
    expect(t.state.revealed[t.id.kai!]).toBeUndefined();
    t.tick(20_000);
    expect(t.state.revealed[t.id.kai!]).toBe('kai');
  });
});

describe('황야 · 카미카제 · 기타', () => {
  it('고대의 주술: 조각 없으면 불가, 있으면 한 단계 상승 (완성 후 불가)', () => {
    const t = table();
    fill(t, 'kamikaze');
    expect(t.skill('kamikaze', 'ancient_sorcery').ok).toBe(false);
    t.p('kamikaze').gem = 2;
    expect(t.skill('kamikaze', 'ancient_sorcery').ok).toBe(true);
    expect(t.p('kamikaze').gem).toBe(3);
    expect(t.skill('kamikaze', 'ancient_sorcery', undefined, undefined, 151_000).ok).toBe(false);
  });
  it('사령관 탐색 성공 → 상급 아군 확인 획득, 하드스킨은 3회 피격', () => {
    const t = table();
    fill(t, 'kamikaze', 'kaspa');
    t.skill('kamikaze', 'commander_search', 'shining');
    expect(has(t, 'kamikaze', 'advanced_ally_check')).toBe(true);
    expect(has(t, 'kamikaze', 'commander_search')).toBe(false);
    t.skill('kaspa', 'attack', 'kamikaze', 'kamikaze');
    expect(t.p('kamikaze').extraLives).toBe(1);
  });
  it('전체 채팅은 카이·샤이닝만, 마나 35, 이름 공개', () => {
    const t = table();
    const r = t.act('shining', { type: 'chat', channel: 'global', text: '안녕' });
    expect(r.ok).toBe(true);
    expect(lastText(r)).toBe('샤이닝: 안녕');
    expect(t.p('shining').mana).toBe(120 - 35);
    expect(t.act('yui', { type: 'chat', channel: 'global', text: 'x' }).ok).toBe(false);
  });
  it('스캔은 카이·샤이닝을 고를 수 없다', () => {
    const t = table();
    const v = viewFor(t.state, t.id.freia!);
    const scan = v.me.skills.find((s) => s.key === 'advanced_scan')!;
    expect(scan.nameOptions).not.toContain('kai');
    expect(scan.nameOptions).not.toContain('shining');
    expect(scan.nameOptions).toContain('yui');
  });
  it('8~11인 마스크대로 제외되고, 무작위 봇으로 200판 돌려도 예외·정지 없음', () => {
    for (let i = 0; i < 200; i++) {
      const n = 8 + (i % 5);
      const players = Array.from({ length: n }, (_, k) => ({ id: `p${k + 1}`, nickname: `봇${k + 1}` }));
      const { state } = createGame({ mode: 'lidellut', players, seed: 9000 + i, now: 0 });
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
      expect(state.phase, `seed ${9000 + i}`).toBe('ended');
    }
  });
});
