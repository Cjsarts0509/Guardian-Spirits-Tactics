// 똑똑한 봇: 아는 정보만 쓰고, 판을 끝까지 끌고 가며, 초반에 자살 공격을 하지 않는다
import { describe, expect, it } from 'vitest';
import { advance, applyAction, botKnowledge, createBotMemory, createGame, smartBotAction, viewFor } from '../src/index.js';

const MODES = ['civil_war', 'primordial', 'lidellut', 'troll'] as const;
function play(seed: number, n: number, mode: (typeof MODES)[number] = 'civil_war') {
  const players = Array.from({ length: n }, (_, k) => ({ id: `p${k + 1}`, nickname: `봇${k + 1}` }));
  const { state } = createGame({ mode, players, seed, now: 0 });
  const memories = new Map(players.map((p, k) => [p.id, createBotMemory(seed * 7 + k * 997)]));
  let now = 0;
  let rejected = 0;
  let actions = 0;
  while (state.phase === 'running' && now < 60 * 60 * 1000) {
    now += 250;
    advance(state, now);
    for (const p of state.players) {
      const a = smartBotAction(state, p.id, memories.get(p.id)!, { activity: 0.012 });
      if (!a) continue;
      actions++;
      if (!applyAction(state, p.id, a, now).ok) rejected++;
    }
  }
  return { state, rejected, actions, minutes: (state.now - state.startedAt) / 60000 };
}

describe('똑똑한 봇', () => {
  it('80판 모두 60분 안에 끝나고, 거절되는 행동이 거의 없다', () => {
    let rejected = 0;
    let actions = 0;
    for (let i = 0; i < 80; i++) {
      const r = play(500 + i, 8 + (i % 5), MODES[Math.floor(i / 20)]!);
      expect(r.state.phase, `seed ${500 + i}`).toBe('ended');
      rejected += r.rejected;
      actions += r.actions;
    }
    expect(rejected / actions).toBeLessThan(0.02);
    // 변장 공표로 유도한 일방 동맹에 백스탭하면 합법적으로 3분 전에도 끝날 수 있다.
    // 판 길이를 강제하지 않고 완주·거절률·아래의 초반 실패 기준으로 검증한다.
  });

  it('처음 4분 동안은 공격 실패(자살)가 없다', () => {
    for (let i = 0; i < 40; i++) {
      const { state } = play(900 + i, 12, MODES[i % 4]!);
      const early = state.log.filter((e) => e.at < 4 * 60000 && e.kind.startsWith('attack.fail'));
      expect(early, `seed ${900 + i}`).toHaveLength(0);
    }
  });

  it('봇의 지식은 자기가 볼 수 있는 이벤트와 공개 정보로만 이루어진다', () => {
    const players = Array.from({ length: 10 }, (_, k) => ({ id: `p${k + 1}`, nickname: `봇${k + 1}` }));
    const { state } = createGame({ mode: 'civil_war', players, seed: 31, now: 0 });
    const memories = new Map(players.map((p, k) => [p.id, createBotMemory(3 + k * 997)]));
    let now = 0;
    while (state.phase === 'running' && now < 20 * 60 * 1000) {
      now += 250;
      advance(state, now);
      for (const p of state.players) {
        const a = smartBotAction(state, p.id, memories.get(p.id)!, { activity: 0.03 });
        if (a) applyAction(state, p.id, a, now);
      }
      if (now % 30000 === 0) {
        for (const p of state.players) {
          const view = viewFor(state, p.id);
          const k = botKnowledge(state, p.id, view, memories.get(p.id)!);
          expect(k).toEqual(botKnowledge(state, p.id, view)); // 증분 기억과 전체 관찰 재계산 일치
          for (const [id, c] of k.known) {
            const target = state.players.find((x) => x.id === id)!;
            expect(c, `${p.id} thinks ${id} is ${c}`).toBe(target.character);
          }
          for (const [id, candidates] of k.candidates) {
            expect(candidates, `${p.id} excluded actual identity of ${id}`).toContain(state.players.find((x) => x.id === id)!.character);
          }
        }
      }
    }
  });
});
