import { describe, expect, it } from 'vitest';
import { createGame, eventsFor, viewFor } from '../src/index.js';
import { CIVIL_ORDER, civilTable } from './helpers.js';

const seats = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, nickname: `n${i + 1}` }));

describe('게임 생성·배정', () => {
  it('8~12명만 시작할 수 있다', () => {
    expect(() => createGame({ mode: 'civil_war', players: seats(7), seed: 1, now: 0 })).toThrow();
    expect(() => createGame({ mode: 'civil_war', players: seats(13), seed: 1, now: 0 })).toThrow();
    for (const n of [8, 9, 10, 11, 12]) expect(() => createGame({ mode: 'civil_war', players: seats(n), seed: 1, now: 0 })).not.toThrow();
  });

  it('인원별 제외 캐릭터는 배정되지 않는다', () => {
    const excluded: Record<number, string[]> = {
      12: [],
      11: ['sephy'],
      10: ['sephy', 'kaspa'],
      9: ['reindila', 'sephy', 'kaspa'],
      8: ['reindila', 'sephy', 'tuma', 'kaspa'],
    };
    for (const n of [8, 9, 10, 11, 12]) {
      for (let seed = 1; seed <= 20; seed++) {
        const { state } = createGame({ mode: 'civil_war', players: seats(n), seed, now: 0 });
        const chars = state.players.map((p) => p.character);
        expect(new Set(chars).size).toBe(n);
        for (const ex of excluded[n]!) expect(chars).not.toContain(ex);
      }
    }
  });

  it('같은 시드면 같은 배정, 다른 시드면 대체로 다른 배정', () => {
    const a = createGame({ mode: 'civil_war', players: seats(12), seed: 42, now: 0 }).state.players.map((p) => p.character);
    const b = createGame({ mode: 'civil_war', players: seats(12), seed: 42, now: 0 }).state.players.map((p) => p.character);
    expect(a).toEqual(b);
    const distinct = new Set<string>();
    for (let s = 1; s <= 30; s++) distinct.add(createGame({ mode: 'civil_war', players: seats(12), seed: s, now: 0 }).state.players.map((p) => p.character).join());
    expect(distinct.size).toBeGreaterThan(25);
  });

  it('배정은 균등 무작위에 가깝다 (각 좌석이 각 캐릭터를 받는 빈도)', () => {
    const counts: Record<string, number> = {};
    const N = 2400;
    for (let s = 0; s < N; s++) {
      const { state } = createGame({ mode: 'civil_war', players: seats(12), seed: s * 7919 + 13, now: 0 });
      const c = state.players[0]!.character;
      counts[c] = (counts[c] ?? 0) + 1;
    }
    for (const c of CIVIL_ORDER) expect(counts[c] ?? 0).toBeGreaterThan(N / 12 * 0.6);
  });

  it('자기 정체와 목표는 본인에게만 보인다', () => {
    const t = civilTable();
    const roleOf = (c: string) => t.seen(c).filter((e) => e.kind === 'role');
    expect(roleOf('kai')).toHaveLength(1);
    expect(roleOf('kai')[0]!.text).toContain('카이');
    expect(roleOf('dantes')[0]!.text).toContain('단테스');
    // 다른 사람의 role 이벤트는 안 보인다
    expect(eventsFor(t.state, t.id.kai!).some((e) => e.kind === 'role' && e.text.includes('단테스입'))).toBe(false);
  });

  it('시작 마나 120, 켈후 목숨 3, 투마 목숨 2', () => {
    const t = civilTable();
    expect(t.p('dantes').mana).toBe(120);
    expect(t.p('kelhu').extraLives).toBe(2);
    expect(t.p('tuma').extraLives).toBe(1);
    expect(t.p('kai').extraLives).toBe(0);
  });
});

describe('턴', () => {
  it('90초마다 마나 +20', () => {
    const t = civilTable();
    t.p('kai').mana = 50;
    t.tick(89_999);
    expect(t.p('kai').mana).toBe(50);
    t.tick(1);
    expect(t.p('kai').mana).toBe(70);
    expect(t.state.turn).toBe(2);
    t.tick(90_000);
    expect(t.p('kai').mana).toBe(90);
  });

  it('나에게 동맹을 건 생존자 1명당 +10 (내가 건 동맹은 무관)', () => {
    const t = civilTable();
    t.skill('arin', 'ally', 'kai');
    t.skill('tuma', 'ally', 'kai');
    t.skill('kai', 'ally', 'krate');
    for (const c of ['kai', 'krate']) t.p(c).mana = 0;
    t.tick(90_000);
    expect(t.p('kai').mana).toBe(40);
    expect(t.p('krate').mana).toBe(30);
  });

  it('죽은 플레이어의 동맹은 마나에 세지 않는다 (A11)', () => {
    const t = civilTable();
    t.skill('arin', 'ally', 'kai');
    t.state.players.find((p) => p.character === 'arin')!.alive = false;
    t.p('kai').mana = 0;
    t.tick(90_000);
    expect(t.p('kai').mana).toBe(20);
  });

  it('진명이면 +10 과 진실의 조각 1/3 → 2/3 → 완성', () => {
    const t = civilTable();
    t.publish('kai', 'kai');
    t.p('kai').mana = 0;
    t.tick(90_000);
    expect(t.p('kai').mana).toBe(30);
    expect(t.p('kai').gem).toBe(1);
    t.tick(90_000);
    expect(t.p('kai').gem).toBe(2);
    t.tick(90_000);
    expect(t.p('kai').gem).toBe(3);
    t.tick(90_000);
    expect(t.p('kai').gem).toBe(3);
  });

  it('가짜 이름이면 조각을 얻지 못한다', () => {
    const t = civilTable();
    t.publish('kai', 'tuma');
    t.tick(90_000);
    expect(t.p('kai').gem).toBe(0);
  });

  it('마나는 150을 넘지 않는다', () => {
    const t = civilTable();
    t.p('kai').mana = 145;
    t.tick(90_000);
    expect(t.p('kai').mana).toBe(150);
  });

  it('한 번도 공표 안 한 생존자는 턴에 무작위 이름으로 자동 공표되고 전체 공지된다 (A14)', () => {
    const t = civilTable();
    t.publish('kai', 'kai');
    const evs = t.tick(90_000);
    const autos = evs.filter((e) => e.kind === 'publish.auto');
    expect(autos).toHaveLength(11);
    expect(autos.every((e) => e.vis.to === 'all')).toBe(true);
    for (const p of t.state.players) expect(p.published).not.toBeNull();
    const roster = new Set(CIVIL_ORDER);
    for (const p of t.state.players) expect(roster.has(p.published!)).toBe(true);
  });

  it('신탁은 180초, 그림자의 눈은 300초에 살아 있을 때만 생긴다', () => {
    const t = civilTable();
    t.tick(179_999);
    expect(t.state.players.find((p) => p.character === 'freya')!.skills.some((s) => s.key === 'oracle')).toBe(false);
    t.tick(1);
    expect(t.p('freya').skills.some((s) => s.key === 'oracle')).toBe(true);
    t.p('kaspa').alive = false;
    t.tick(120_000);
    expect(t.p('kaspa').skills.some((s) => s.key === 'shadow_eye')).toBe(false);
  });

  it('뷰의 다음 턴 마나 미리보기', () => {
    const t = civilTable();
    t.skill('arin', 'ally', 'kai');
    t.publish('kai', 'kai');
    t.p('kai').mana = 10;
    expect(viewFor(t.state, t.id.kai!).me.nextTurnManaPreview).toBe(40);
  });
});
