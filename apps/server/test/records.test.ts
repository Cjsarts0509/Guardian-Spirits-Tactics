import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyAction, createBotMemory, createGame, smartBotAction, advance } from '@gst/rules';
import { buildRecord, saveRecord } from '../src/records.js';

describe('판 기록 파일', () => {
  it('행동·이벤트·최종 상태가 JSON 으로 저장되고 다시 읽힌다', async () => {
    const players = Array.from({ length: 8 }, (_, k) => ({ id: `p${k + 1}`, nickname: `봇${k + 1}` }));
    const { state } = createGame({ mode: 'civil_war', players, seed: 5, now: 1_000_000 });
    const memories = new Map(players.map((p, k) => [p.id, createBotMemory(1 + k * 997)]));
    const actions = [];
    let now = 1_000_000;
    while (state.phase === 'running' && now < 1_000_000 + 60 * 60 * 1000) {
      now += 250;
      advance(state, now);
      for (const p of state.players) {
        const a = smartBotAction(state, p.id, memories.get(p.id)!, { activity: 0.012 });
        if (!a) continue;
        const r = applyAction(state, p.id, a, now);
        actions.push({ t: now - state.startedAt, player: p.id, action: a, ok: r.ok, ...(r.error ? { error: r.error } : {}) });
      }
    }
    const rec = buildRecord({ roomId: 'r1', roomName: '테스트', turnSeconds: 90, botKind: 'smart', aiOnly: true, bots: new Set(players.map((p) => p.id)), state, actions });
    const dir = await mkdtemp(join(tmpdir(), 'gst-rec-'));
    const file = await saveRecord(dir, rec);
    const back = JSON.parse(await readFile(file, 'utf8'));
    expect(back.version).toBe('gst-record-1');
    expect(back.players).toHaveLength(8);
    expect(back.players.every((p: { bot: boolean }) => p.bot)).toBe(true);
    expect(back.actions.length).toBeGreaterThan(10);
    expect(back.log.length).toBe(state.log.length);
    expect(back.finalState.phase).toBe('ended');
    expect(file).toMatch(/civil_war_r1\.json$/);
  });
});
