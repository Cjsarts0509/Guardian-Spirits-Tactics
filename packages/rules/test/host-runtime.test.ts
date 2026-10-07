import { describe, expect, it } from 'vitest';
import { createGame, createBotMemory, encodeHostSnapshot, decodeHostSnapshot, applyHostInputs, tickHost, type HostSnapshot } from '../src/index.js';

describe('호스트 상태 복원', () => {
  for (const mode of ['civil_war', 'primordial', 'lidellut', 'troll'] as const) it(`${mode}: 이전 후 RNG·상태·스킬 기억과 다음 행동 일치`, () => {
    const { state } = createGame({ mode, players: Array.from({ length: 12 }, (_, i) => ({ id: `p${i}`, nickname: `P${i}` })), seed: 123, now: 1000 });
    const snapshot: HostSnapshot = { version: 1, state, memories: new Map(state.players.map((p,i) => [p.id, createBotMemory(i+1)])), handled: 0, records: [], results: [] };
    const members = state.players.map(p => ({ id: p.id, bot: true, automate: true }));
    for (let i=0; i<12; i++) tickHost(snapshot, members, 301000+i*250, { activity: 1, botKind: 'smart' });
    const migrated = decodeHostSnapshot(encodeHostSnapshot(snapshot));
    for (let i=0; i<20; i++) {
      const now = 304000+i*250;
      tickHost(snapshot, members, now, { activity: 1, botKind: 'smart' });
      tickHost(migrated, members, now, { activity: 1, botKind: 'smart' });
      expect(migrated.state).toEqual(snapshot.state);
      expect(migrated.records).toEqual(snapshot.records);
      // WeakMap 표본 모델을 포함한 파생 믿음 캐시는 복원 때 다시 만든다.
      expect(decodeHostSnapshot(encodeHostSnapshot(migrated)).memories).toEqual(decodeHostSnapshot(encodeHostSnapshot(snapshot)).memories);
    }
  });

  it('재전송 행동은 한 번만 적용하고 입력 누락은 거절', () => {
    const { state } = createGame({ mode: 'civil_war', players: Array.from({length:8}, (_,i)=>({id:`p${i}`,nickname:`P${i}`})), seed: 1, now: 1000 });
    const snapshot: HostSnapshot = { version: 1, state, memories: new Map(), handled: 0, records: [], results: [] };
    const command = { id: 1, kind: 'action' as const, player: 'p0', action: { type: 'chat' as const, channel: 'all' as const, text: '한 번' } };
    applyHostInputs(snapshot, [command], 1100);
    const first = structuredClone(snapshot);
    applyHostInputs(snapshot, [command], 1100);
    expect(snapshot).toEqual(first);
    expect(snapshot.results).toHaveLength(1);
    expect(() => applyHostInputs(snapshot, [{...command,id:3}], 1200)).toThrow('순서 누락');
  });
});
