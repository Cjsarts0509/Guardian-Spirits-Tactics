import { describe, expect, it } from 'vitest';
import { createBotMemory, viewFor } from '../src/index.js';
import { opponentClaim } from '../scripts/claim-opponents.js';
import { PRIMORDIAL_ORDER, modeTable } from './helpers.js';

describe('공표 성향 평가 상대', () => {
  it('강제 블러프와 스킬 의존 진명 유지의 차이를 실제 리더쉽 역할로 확인한다', () => {
    const t = modeTable('primordial', PRIMORDIAL_ORDER);
    const view = viewFor(t.state, t.id.rael!);
    expect(opponentClaim(view, createBotMemory(1), 'truthful')).toBe('rael');
    expect(opponentClaim(view, createBotMemory(1), 'skill-aware-bluff')).toBe('rael');
    expect(opponentClaim(view, createBotMemory(1), 'bluff')).not.toBe('rael');
  });
  it('다른 사람의 숨은 배정을 바꿔도 같은 자기 뷰에서 공표를 고른다', () => {
    const t = modeTable('primordial', PRIMORDIAL_ORDER);
    const before = viewFor(t.state, t.id.kane!);
    const a = t.p('eltas'), b = t.p('drakan');
    [a.character, b.character] = [b.character, a.character];
    const after = viewFor(t.state, t.id.kane!);
    for (const style of ['truthful', 'bluff', 'skill-aware-bluff'] as const)
      expect(opponentClaim(after, createBotMemory(2), style)).toEqual(opponentClaim(before, createBotMemory(2), style));
  });
});
