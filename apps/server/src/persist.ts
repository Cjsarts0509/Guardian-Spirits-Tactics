// 판 종료 시 Supabase 에 기록 (supabase/migrations 스키마). 설정이 없으면 아무것도 안 한다.
import type { GameState } from '@gst/rules';
import type { ServerConfig } from './config.js';

export async function saveMatch(cfg: ServerConfig, state: GameState, userIds: Record<string, string | null>): Promise<void> {
  if (!cfg.supabaseUrl || !cfg.supabaseServiceRoleKey) return;
  const base = `${cfg.supabaseUrl.replace(/\/$/, '')}/rest/v1`;
  const headers = {
    apikey: cfg.supabaseServiceRoleKey,
    Authorization: `Bearer ${cfg.supabaseServiceRoleKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
  const res = await fetch(`${base}/matches`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      mode: state.mode,
      player_count: state.players.length,
      winner_side: state.winner,
      started_at: new Date(state.startedAt).toISOString(),
      ended_at: new Date(state.now).toISOString(),
      version: 'gst-web-1',
      seed: state.seed,
    }),
  });
  if (!res.ok) throw new Error(`matches insert ${res.status}: ${await res.text()}`);
  const [match] = (await res.json()) as { id: string }[];
  if (!match) return;

  const players = state.players.map((p) => ({
    match_id: match.id,
    user_id: userIds[p.id] ?? null,
    seat: p.seat,
    nickname: p.nickname,
    slot: p.slot,
    character_key: p.character,
    side: p.side,
    died_at_ms: p.diedAt === null ? null : p.diedAt - state.startedAt,
    won: state.winner === p.side,
  }));
  const r2 = await fetch(`${base}/match_players`, { method: 'POST', headers, body: JSON.stringify(players) });
  if (!r2.ok) throw new Error(`match_players insert ${r2.status}: ${await r2.text()}`);

  // 이벤트 로그는 500건 단위로 나눠 저장 (리플레이용)
  const events = state.log.map((e) => ({ match_id: match.id, seq: e.seq, t_ms: e.at, payload: e }));
  for (let i = 0; i < events.length; i += 500) {
    const r3 = await fetch(`${base}/match_events`, { method: 'POST', headers, body: JSON.stringify(events.slice(i, i + 500)) });
    if (!r3.ok) throw new Error(`match_events insert ${r3.status}: ${await r3.text()}`);
  }
}
