// 판 종료 시 Supabase 에 기록 (supabase/migrations 스키마). 설정이 없으면 아무것도 안 한다.
import type { GameState } from '@gst/rules';
import type { ServerConfig } from './config.js';

export async function saveMatch(cfg: ServerConfig, state: GameState, userIds: Record<string, string | null>): Promise<void> {
  if (!cfg.supabaseUrl || !cfg.supabaseSecretKey) return;
  const base = `${cfg.supabaseUrl.replace(/\/$/, '')}/rest/v1`;
  const headers = { ...authHeaders(cfg.supabaseSecretKey), 'Content-Type': 'application/json', Prefer: 'return=representation' };
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

  // 이벤트 로그는 500건 단위로 나눠 저장 (리플레이용). 채팅은 비공개 테이블로 분리
  const rows = splitLog(match.id, state);
  await insertBatches(`${base}/match_events`, headers, rows.events, 'match_events');
  await insertBatches(`${base}/match_chat`, headers, rows.chat, 'match_chat');
}

/** 새 키(sb_secret_…)는 JWT 가 아니라서 apikey 헤더에만 넣는다. 레거시 service_role(JWT)은 Bearer 도 같이 */
export function authHeaders(key: string): Record<string, string> {
  return key.startsWith('sb_') ? { apikey: key } : { apikey: key, Authorization: `Bearer ${key}` };
}

export function splitLog(matchId: string, state: GameState) {
  const events: { match_id: string; seq: number; t_ms: number; payload: unknown }[] = [];
  const chat: { match_id: string; seq: number; t_ms: number; channel: string; payload: unknown }[] = [];
  for (const e of state.log) {
    const t_ms = e.at; // 이미 게임 시작 기준 경과 ms
    if (e.kind.startsWith('chat.')) chat.push({ match_id: matchId, seq: e.seq, t_ms, channel: e.kind.slice(5), payload: e });
    else events.push({ match_id: matchId, seq: e.seq, t_ms, payload: e });
  }
  return { events, chat };
}

async function insertBatches(url: string, headers: Record<string, string>, rows: unknown[], label: string): Promise<void> {
  const h = { ...headers, Prefer: 'return=minimal' };
  for (let i = 0; i < rows.length; i += 500) {
    const r = await fetch(url, { method: 'POST', headers: h, body: JSON.stringify(rows.slice(i, i + 500)) });
    if (!r.ok) throw new Error(`${label} insert ${r.status}: ${await r.text()}`);
  }
}
