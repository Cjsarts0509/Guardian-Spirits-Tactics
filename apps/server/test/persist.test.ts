// 판 기록: 공개 리플레이(match_events)에 채팅이 섞이지 않고, 채팅은 비공개 테이블(match_chat)로 간다.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { advance, applyAction, createGame, randomBotAction, type GameState } from '@gst/rules';
import { loadConfig } from '../src/config.js';
import { saveMatch, splitLog } from '../src/persist.js';

function playedGame(): GameState {
  const players = Array.from({ length: 10 }, (_, k) => ({ id: `p${k + 1}`, nickname: `봇${k + 1}` }));
  const { state } = createGame({ mode: 'civil_war', players, seed: 4242, now: 0 });
  applyAction(state, 'p1', { type: 'chat', channel: 'all', text: '안녕' }, 0);
  applyAction(state, 'p2', { type: 'chat', channel: 'whisper', to: 'p3', text: '비밀' }, 0);
  const bot = { rng: 9 };
  let now = 0;
  let deadChat = false;
  while (state.phase === 'running' && now < 60 * 60 * 1000) {
    now += 1000;
    advance(state, now);
    for (const p of state.players) {
      if (!p.alive && !deadChat) deadChat = applyAction(state, p.id, { type: 'chat', channel: 'dead', text: '억울' }, now).ok;
      const a = randomBotAction(state, p.id, bot, { activity: 0.05 });
      if (a) applyAction(state, p.id, a, now);
    }
  }
  return state;
}

afterEach(() => vi.unstubAllGlobals());

describe('판 기록', () => {
  const state = playedGame();

  it('채팅은 match_chat, 나머지는 match_events — 합치면 전체 로그', () => {
    const { events, chat } = splitLog('m1', state);
    expect(state.phase).toBe('ended');
    expect(events.some((r) => (r.payload as { kind: string }).kind.startsWith('chat.'))).toBe(false);
    expect(chat.map((r) => r.channel)).toEqual(expect.arrayContaining(['all', 'whisper', 'dead']));
    const seqs = [...events, ...chat].map((r) => r.seq).sort((a, b) => a - b);
    expect(seqs).toEqual(state.log.map((e) => e.seq));
    // t_ms 는 int4 범위 (게임 시작 기준 경과 ms)
    for (const r of [...events, ...chat]) expect(r.t_ms).toBeGreaterThanOrEqual(0), expect(r.t_ms).toBeLessThan(2 ** 31);
  });

  it('service_role 로 4개 테이블에 순서대로 기록', async () => {
    const calls: { url: string; body: unknown[] }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: { body: string }) => {
        const body = JSON.parse(init.body) as unknown;
        calls.push({ url, body: Array.isArray(body) ? body : [body] });
        return new Response(url.endsWith('/matches') ? JSON.stringify([{ id: 'm1' }]) : '', { status: 201 });
      }),
    );
    const cfg = { ...loadConfig({}), supabaseUrl: 'https://x.supabase.co', supabaseServiceRoleKey: 'k' };
    await saveMatch(cfg, state, { p1: 'u1' });
    const tables = [...new Set(calls.map((c) => c.url.split('/').pop()))];
    expect(tables).toEqual(['matches', 'match_players', 'match_events', 'match_chat']);
    const mp = calls.find((c) => c.url.endsWith('/match_players'))!.body as { user_id: string | null; seat: number }[];
    expect(mp).toHaveLength(10);
    expect(mp.filter((r) => r.user_id).map((r) => r.user_id)).toEqual(['u1']);
    const pub = calls.filter((c) => c.url.endsWith('/match_events')).flatMap((c) => c.body) as { payload: { kind: string } }[];
    expect(pub.every((r) => !r.payload.kind.startsWith('chat.'))).toBe(true);
  });

  it('설정이 없으면 아무것도 안 한다', async () => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    await saveMatch(loadConfig({}), state, {});
    expect(f).not.toHaveBeenCalled();
  });
});
