import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, fixtures, pairedInterval, playMatch, prepareMatch, summarize, type MatchResult, type Policy } from '../scripts/league-runner.js';
import { createBotMemory, smartBotAction } from '../src/index.js';
import { smartBotAction as foundation } from '../scripts/baselines/foundation.js';
import { smartBotAction as belief } from '../scripts/baselines/belief.js';

describe('버전 비교 리그', () => {
  it('네 대결에서 배정·역할별 난수는 고정하고 진영과 좌석 순서만 교환한다', () => {
    const prepared = fixtures('troll', 1201, 9).map(prepareMatch);
    const roles = (p: ReturnType<typeof prepareMatch>) => Object.fromEntries(p.state.players.map((x) => [x.id, x.character]).sort());
    for (const p of prepared) {
      expect(roles(p)).toEqual(roles(prepared[0]!));
      expect(p.memories).toEqual(prepared[0]!.memories);
      expect(p.state.rng).toBe(prepared[0]!.state.rng);
      expect([...p.controllers.keys()].sort()).toEqual(p.state.players.map((x) => x.id).sort());
    }
    expect(prepared[2]!.state.players.map((p) => p.id)).toEqual(prepared[0]!.state.players.map((p) => p.id).reverse());
    for (const [id, c] of prepared[0]!.controllers) expect(prepared[1]!.controllers.get(id)).not.toBe(c);
    expect(prepared[0]!.memories.get('p1')).not.toBe(prepared[1]!.memories.get('p1'));
  });

  it('아무도 행동하지 않는 제한 미종료는 승리가 아니라 미종료·0.5 점수로 분리한다', () => {
    const noop: Policy = () => null;
    const rows = fixtures('civil_war', 10, 8).map((f) => playMatch(f, { current: noop, reference: noop }, { ...DEFAULT_SETTINGS, limitMs: 500 }));
    const summary = summarize(rows);
    expect(summary.wins).toEqual({ current: 0, reference: 0, unfinished: 4 });
    expect(summary.currentScore).toBe(0.5);
    expect(summary.unfinished).toHaveLength(4);
    expect(summary.stats.current.attempted).toBe(0);
  });

  it('거절된 행동을 실제 시전자 정책에 기록하고 상대 메모리와 공유하지 않는다', () => {
    const seen = new Set<ReturnType<typeof createBotMemory>>();
    const invalid: Policy = (_state, _id, memory) => { seen.add(memory); return { type: 'skill', skill: 'does_not_exist' }; };
    const noop: Policy = () => null;
    const fixture = fixtures('civil_war', 20, 8)[0]!;
    const initial = prepareMatch(fixture);
    const n = [...initial.controllers.values()].filter((c) => c === 'current').length;
    const row = playMatch(fixture, { current: invalid, reference: noop }, { ...DEFAULT_SETTINGS, limitMs: 500 });
    expect(row.stats.current.rejected).toBe(n * 2);
    expect(row.stats.current.rejectedSkills.does_not_exist).toBe(n * 2);
    expect(row.stats.reference.attempted).toBe(0);
    expect(seen.size).toBe(n);
    expect([...seen].every((m) => Object.keys(m).join() === 'rng')).toBe(true);
  });

  it('동일 정책끼리는 진영 라벨을 교환해도 승자·행동 결과가 같다', () => {
    const fs = fixtures('civil_war', 42, 8);
    const settings = { ...DEFAULT_SETTINGS, activity: 0.5, limitMs: 10 * 60_000 };
    const a = playMatch(fs[0]!, { current: smartBotAction, reference: smartBotAction }, settings);
    const b = playMatch(fs[1]!, { current: smartBotAction, reference: smartBotAction }, settings);
    expect(a.winner).toBe(b.winner);
    expect(a.elapsedMs).toBe(b.elapsedMs);
    expect(a.reason).toBe(b.reason);
    expect(a.stats.current).toEqual(b.stats.reference);
    expect(a.survivors.map((p) => [p.character, p.alive])).toEqual(b.survivors.map((p) => [p.character, p.alive]));
  });

  it('고정한 이전 판단 코드가 현재 엔진의 동일 관찰에서 재현된다', () => {
    for (const policy of [foundation, belief]) {
      const p = prepareMatch(fixtures('primordial', 34, 10)[0]!);
      const a = policy(p.state, 'p1', createBotMemory(99), { activity: 1 });
      const b = policy(structuredClone(p.state), 'p1', createBotMemory(99), { activity: 1 });
      expect(a).toEqual(b);
    }
  });

  it('시드 단위로 구간을 만들고 교환 4판의 누락·중복을 거부한다', () => {
    const noop: Policy = () => null;
    const rows: MatchResult[] = fixtures('civil_war', 10, 8).map((f) => playMatch(f, { current: noop, reference: noop }, { ...DEFAULT_SETTINGS, limitMs: 250 }));
    expect(() => summarize(rows.slice(1))).toThrow('4판');
    expect(() => summarize([rows[0]!, rows[0]!, rows[2]!, rows[3]!])).toThrow('중복');
    expect(pairedInterval([0.25, 0.5, 0.75])).toEqual(pairedInterval([0.25, 0.5, 0.75]));
    expect(pairedInterval([1, 1, 1])).toEqual([1, 1]);
    expect(() => pairedInterval([])).toThrow();
  });

  it.each([
    { mode: 'troll' as const, seed: 1010, count: 8, reversed: false, currentSide: 2 as const },
    { mode: 'troll' as const, seed: 1046, count: 9, reversed: true, currentSide: 2 as const },
    { mode: 'troll' as const, seed: 1059, count: 12, reversed: true, currentSide: 2 as const },
    { mode: 'troll' as const, seed: 1060, count: 8, reversed: true, currentSide: 2 as const },
  ])('트롤 혼합 대전 정체 사례 $seed는 90분 안에 종료한다', (fixture) => {
    const row = playMatch(fixture, { current: smartBotAction, reference: foundation });
    expect(row.winner).not.toBeNull();
    expect(row.stats.current.earlyAttackFailures).toBe(0);
    expect(row.stats.reference.earlyAttackFailures).toBe(0);
  });
});
