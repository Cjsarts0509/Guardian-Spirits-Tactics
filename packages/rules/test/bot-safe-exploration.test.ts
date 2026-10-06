import { describe, expect, it } from 'vitest';
import { botKnowledge, createBotMemory, smartBotAction } from '../src/index.js';
import { claimOpponent } from '../scripts/claim-opponents.js';
import { playMatch } from '../scripts/league-runner.js';
import { civilTable, fill, modeTable, TROLL_ORDER } from './helpers.js';

describe('최상급 공격의 관측 실패 순환', () => {
  it('진명 전략은 지휘관 공표까지 바꾸고 일반 인물 전략은 기존 지휘관 공표를 유지한다', () => {
    const t = civilTable();
    t.p('dantes').skills = t.p('dantes').skills.filter((s) => s.key === 'publish');
    const current = smartBotAction(t.state, t.id.dantes!, createBotMemory(1), { activity: 1, claimStrategy: 'current' });
    const honest = smartBotAction(t.state, t.id.dantes!, createBotMemory(1), { activity: 1, claimStrategy: 'truthful' });
    const members = smartBotAction(t.state, t.id.dantes!, createBotMemory(1), { activity: 1, claimStrategy: 'truthful-noncommanders' });
    expect(honest).toEqual({ type: 'skill', skill: 'publish', name: 'dantes' });
    expect(smartBotAction(t.state, t.id.dantes!, createBotMemory(1), { activity: 1 })).toEqual(honest);
    expect(members).toEqual(current);
    expect(current && 'name' in current && current.name).not.toBe('dantes');
  });

  it('일반 인물 진명 전략은 변장 인물의 공표도 실제 자기 이름으로 바꾼다', () => {
    const t = modeTable('troll', TROLL_ORDER);
    t.p('neonis').skills = t.p('neonis').skills.filter((s) => ['publish', 'disguise'].includes(s.key));
    expect(smartBotAction(t.state, t.id.neonis!, createBotMemory(2), { activity: 1, claimStrategy: 'truthful-noncommanders' }))
      .toEqual({ type: 'skill', skill: 'publish', name: 'neonis' });
  });

  it('실패한 이름을 자기 기억에만 남기고 후보를 확정 배제하지 않는다', () => {
    const t = modeTable('troll', TROLL_ORDER); fill(t, 'deka');
    expect(t.skill('deka', 'supreme_attack', 'chis', 'satoshi').ok).toBe(true);
    const memory = createBotMemory(1);
    const k = botKnowledge(t.state, t.id.deka!, undefined, memory);
    expect(memory.perception!.lastAttackNameFailure.get(t.id.chis!)?.has('satoshi')).toBe(true);
    expect(k.candidates.get(t.id.chis!)).toContain('satoshi');
    const other = createBotMemory(2); botKnowledge(t.state, t.id.kanulla!, undefined, other);
    expect(other.perception!.lastAttackNameFailure.size).toBe(0);
  });

  it.each([
    [7001, 9, true], [7011, 9, true], [8001, 9, false], [8002, 10, false],
    [8005, 8, false], [8006, 9, false], [8026, 9, true], [8035, 8, false],
  ] as const)('블러프 상대 미종료 시드 %i를 안전한 후보 순환으로 끝낸다', (seed, count, reversed) => {
    const result = playMatch({ mode: 'troll', seed, count, reversed, currentSide: 2 }, {
      current: (s, id, m, o) => smartBotAction(s, id, m, { ...o, claimStrategy: 'current' }),
      reference: claimOpponent('bluff'),
    });
    expect(result.winner).not.toBeNull();
    expect(result.stats.current.earlyAttackFailures).toBe(0);
    expect(result.stats.current.rejected).toBe(0);
  });
});
