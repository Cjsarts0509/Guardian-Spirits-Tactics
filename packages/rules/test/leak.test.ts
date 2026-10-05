// 정보 은닉 감사: 공개 이벤트의 data 에 '플레이어 id + 그 플레이어의 정체' 가 같이 실리면 안 된다 (공개된 정체 제외).
// 화면 텍스트가 아니라 개발자 도구로 보는 원시 데이터 기준.
import { describe, expect, it } from 'vitest';
import { advance, applyAction, createGame, randomBotAction, viewFor } from '../src/index.js';
import type { ModeId } from '../src/index.js';

/** data.character 가 대상이 아니라 '시전자 캐릭터' 를 뜻하는 이벤트 (대상 플레이어 정체와 무관) */
const ACTOR_CHARACTER = new Set(['skill.reckless_charge', 'skill.join']);

describe('정보 은닉', () => {
  it('공개 이벤트 data 로 미공개 정체를 알 수 없고, 남의 뷰에 정체·슬롯이 없다', () => {
    const modes: ModeId[] = ['civil_war', 'primordial', 'lidellut', 'troll'];
    for (let i = 0; i < 40; i++) {
      const mode = modes[i % 4]!;
      const players = Array.from({ length: 8 + (i % 5) }, (_, k) => ({ id: `p${k + 1}`, nickname: `봇${k + 1}` }));
      const { state } = createGame({ mode, players, seed: 20_000 + i, now: 0 });
      const rng = { rng: i };
      let now = 0;
      const revealedAt = new Map<string, number>(); // player → seq 시점에 공개
      while (state.phase === 'running' && now < 30 * 60 * 1000) {
        now += 1000;
        advance(state, now);
        for (const p of state.players) {
          const a = randomBotAction(state, p.id, rng, { activity: 0.05 });
          if (a) applyAction(state, p.id, a, now);
        }
        // 남의 뷰: 공개 안 된 정체는 어디에도 없다
        if (state.phase === 'running' && now % 20_000 === 0) {
          for (const p of state.players) {
            const v = viewFor(state, p.id);
            for (const o of v.players) {
              if (o.id === p.id) continue;
              expect('character' in o, 'character in other view').toBe(false);
              expect('slot' in o, 'slot in other view').toBe(false);
              expect('mana' in o, 'mana in other view').toBe(false);
              expect(o.revealed ?? null).toBe(state.revealed[o.id] ?? null);
            }
          }
        }
      }
      const charOf = new Map(state.players.map((p) => [p.id, p.character]));
      // 공개 시점: 사망·정체 공개 이벤트 (그 이벤트 자체가 공개 처리)
      for (const e of state.log) {
        if ((e.kind === 'death' || e.kind === 'reveal') && typeof e.data?.player === 'string' && !revealedAt.has(e.data.player)) revealedAt.set(e.data.player, e.seq);
      }
      for (const e of state.log) {
        if (e.vis.to !== 'all' || !e.data) continue;
        if (ACTOR_CHARACTER.has(e.kind)) continue;
        const ch = e.data.character;
        if (typeof ch !== 'string') continue;
        for (const key of ['player', 'target', 'attacker']) {
          const pid = e.data[key];
          if (typeof pid !== 'string' || !charOf.has(pid)) continue;
          if (charOf.get(pid) !== ch) continue;
          // 그 시점에 이미 공개된 정체여야 한다 (사망·공개 이벤트 자체는 공개 처리 직후)
          const at = revealedAt.get(pid);
          expect(at !== undefined && at <= e.seq, `${mode} seed ${20_000 + i} seq ${e.seq} ${e.kind}: ${pid}=${ch} 미공개 상태로 공개 이벤트에 실림`).toBe(true);
        }
      }
    }
  });
});
