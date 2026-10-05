import { describe, expect, it } from 'vitest';
import { advance, applyAction, createGame, eventsFor, randomBotAction, viewFor, MAX_MANA } from '../src/index.js';
import type { GameState } from '../src/index.js';
import { civilTable } from './helpers.js';

describe('플레이어별 뷰 (정보 은닉)', () => {
  it('다른 플레이어의 정체·마나는 뷰에 없다', () => {
    const t = civilTable();
    const v = viewFor(t.state, t.id.dantes!);
    expect(v.me.character).toBe('dantes');
    for (const p of v.players) {
      expect(p).not.toHaveProperty('character');
      expect(p).not.toHaveProperty('mana');
      expect(p.revealed).toBeNull();
    }
    const json = JSON.stringify(v.players);
    expect(json).not.toContain('"kai"');
  });

  it('사망하면 정체가 전체 공개된다', () => {
    const t = civilTable();
    t.skill('kaspa', 'attack', 'freya', 'freya');
    const v = viewFor(t.state, t.id.dantes!);
    expect(v.players.find((p) => p.id === t.id.freya)!.revealed).toBe('freya');
  });

  it('비공개 이벤트는 해당 플레이어에게만 보이고, 게임 종료 후에는 전부 공개된다', () => {
    const t = civilTable();
    t.skill('kelhu', 'kelhu_loyal', 'dantes');
    const kelhuOnly = t.state.log.find((e) => e.kind === 'probe.result')!;
    expect(eventsFor(t.state, t.id.kai!).includes(kelhuOnly)).toBe(false);
    expect(eventsFor(t.state, t.id.kelhu!).includes(kelhuOnly)).toBe(true);
    t.skill('dantes', 'dantes_command', 'kai');
    expect(t.state.phase).toBe('ended');
    expect(eventsFor(t.state, t.id.kai!).includes(kelhuOnly)).toBe(true);
  });

  it('스킬 뷰: 쿨다운 남은 시간과 사용 불가 사유', () => {
    const t = civilTable();
    t.publish('kai', 'kai');
    t.tick(10_000);
    const s = viewFor(t.state, t.id.kai!).me.skills.find((x) => x.key === 'publish')!;
    expect(s.cooldownRemainingMs).toBe(30_000);
    expect(s.blocked).toContain('재사용 대기');
  });
});

function checkInvariants(state: GameState) {
  for (const p of state.players) {
    expect(p.mana).toBeGreaterThanOrEqual(0);
    expect(p.mana).toBeLessThanOrEqual(MAX_MANA);
    if (!p.alive) {
      expect(p.allies).toEqual([]);
      expect(state.revealed[p.id]).toBe(p.character);
    }
    expect(p.extraLives).toBeGreaterThanOrEqual(0);
  }
  if (state.phase === 'ended') {
    expect(state.winner === 1 || state.winner === 2).toBe(true);
    expect(state.queue).toEqual([]);
  }
  for (let i = 1; i < state.queue.length; i++) expect(state.queue[i]!.at).toBeGreaterThanOrEqual(state.queue[i - 1]!.at);
  for (let i = 1; i < state.log.length; i++) expect(state.log[i]!.seq).toBe(state.log[i - 1]!.seq + 1);
}

describe('무작위 봇 시뮬레이션', () => {
  it('300판: 예외 없음, 불변식 유지, 승패 판정 일관', () => {
    let ended = 0;
    for (let i = 0; i < 300; i++) {
      const n = 8 + (i % 5);
      const players = Array.from({ length: n }, (_, k) => ({ id: `p${k}`, nickname: `봇${k}` }));
      const { state } = createGame({ mode: 'civil_war', players, seed: 5000 + i, now: 0 });
      const bot = { rng: 9000 + i };
      let now = 0;
      while (state.phase === 'running' && now < 40 * 60 * 1000) {
        now += 1000;
        advance(state, now);
        for (const p of state.players) {
          const a = randomBotAction(state, p.id, bot, { activity: 0.02 });
          if (a) applyAction(state, p.id, a, now);
        }
        if (now % 30_000 === 0) checkInvariants(state);
      }
      checkInvariants(state);
      if (state.phase === 'ended') {
        ended++;
        const kai = state.players.find((p) => p.character === 'kai')!;
        if (state.winner === 1) expect(kai.alive).toBe(false);
        if (state.winner === 2) {
          const dantes = state.players.find((p) => p.character === 'dantes')!;
          expect(dantes.alive).toBe(false);
          expect(kai.alive).toBe(true);
        }
      }
    }
    expect(ended).toBeGreaterThan(250);
  });

  it('같은 시드·같은 입력이면 같은 결과 (리플레이 재현)', () => {
    const run = () => {
      const players = Array.from({ length: 12 }, (_, k) => ({ id: `p${k}`, nickname: `봇${k}` }));
      const { state } = createGame({ mode: 'civil_war', players, seed: 777, now: 1_000_000 });
      const bot = { rng: 4242 };
      let now = 1_000_000;
      while (state.phase === 'running' && now < 1_000_000 + 30 * 60 * 1000) {
        now += 500;
        advance(state, now);
        for (const p of state.players) {
          const a = randomBotAction(state, p.id, bot, { activity: 0.03 });
          if (a) applyAction(state, p.id, a, now);
        }
      }
      return JSON.stringify(state);
    };
    expect(run()).toBe(run());
  });
});
