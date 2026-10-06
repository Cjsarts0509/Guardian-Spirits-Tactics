import { describe, expect, it } from 'vitest';
import { advance, createBotMemory, smartBotAction, viewFor } from '../src/index.js';
import { bestGemTarget } from '../src/bot-information.js';
import type { AssignmentBelief } from '../src/bot-belief.js';
import { civilTable } from './helpers.js';
import { fixtures, prepareMatch } from '../scripts/league-runner.js';

describe('보석 정보 대상 선택', () => {
  it('같은 정보량이면 적 확률을 우선하고 지휘관끼리 구별 못 하는 대상은 건너뛴다', () => {
    const t = civilTable(), v = viewFor(t.state, t.id.dantes!);
    const allies = v.roster.filter((r) => r.side === v.me.side && !r.commander);
    const enemies = v.roster.filter((r) => r.side !== v.me.side && !r.commander);
    const commanders = v.roster.filter((r) => r.commander);
    const belief: AssignmentBelief = { consistent: true, probabilities: new Map([
      ['ally', new Map([[allies[0]!.key, 0.5], [allies[1]!.key, 0.5]])],
      ['enemy', new Map([[enemies[0]!.key, 0.5], [enemies[1]!.key, 0.5]])],
      ['commanders', new Map([[commanders[0]!.key, 0.5], [commanders[1]!.key, 0.5]])],
    ]) };
    expect(bestGemTarget(v, belief, [{ id: 'commanders' }, { id: 'ally' }, { id: 'enemy' }])).toBe('enemy');
    expect(bestGemTarget(v, belief, [{ id: 'commanders' }])).toBeUndefined();
  });

  it('트롤은 기존 정책과 행동 및 난수 경로를 유지한다', () => {
    const { state } = prepareMatch(fixtures('troll', 19000, 12)[0]!);
    const current = createBotMemory(99), legacy = createBotMemory(99);
    for (const at of [0, 120_000, 240_000]) {
      advance(state, at);
      for (let i = 0; i < 30; i++) {
        expect(smartBotAction(state, 'p1', current, { activity: 1 })).toEqual(
          smartBotAction(state, 'p1', legacy, { activity: 1, gemTargets: 'legacy' }));
        expect(current.rng).toBe(legacy.rng);
      }
    }
  });
});
