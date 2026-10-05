// 판 기록을 서버 로컬 파일로 보관 (AI 개량·리플레이용). RECORDS_DIR 이 비어 있으면 아무것도 안 한다.
// 파일: <RECORDS_DIR>/<YYYY-MM>/<시작시각>_<모드>_<방id>.json  — 설정·참가자·모든 행동(거절 포함)·전체 이벤트 로그·최종 상태
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Action, GameState } from '@gst/rules';

export interface ActionRecord {
  /** 게임 시작 기준 경과 ms */
  t: number;
  player: string;
  action: Action;
  ok: boolean;
  error?: string;
}

export interface MatchRecord {
  version: 'gst-record-1';
  roomId: string;
  roomName: string;
  mode: string;
  seed: number;
  turnSeconds: number;
  botKind: string;
  aiOnly: boolean;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  winner: number | null;
  endReason: string | null;
  players: { id: string; seat: number; nickname: string; character: string; side: number; bot: boolean; alive: boolean; diedAtMs: number | null }[];
  actions: ActionRecord[];
  /** 전체 이벤트 (비공개 포함) */
  log: GameState['log'];
  finalState: GameState;
}

export function buildRecord(opts: {
  roomId: string;
  roomName: string;
  turnSeconds: number;
  botKind: string;
  aiOnly: boolean;
  bots: Set<string>;
  state: GameState;
  actions: ActionRecord[];
}): MatchRecord {
  const { state } = opts;
  return {
    version: 'gst-record-1',
    roomId: opts.roomId,
    roomName: opts.roomName,
    mode: state.mode,
    seed: state.seed,
    turnSeconds: Math.round(state.turnMs / 1000),
    botKind: opts.botKind,
    aiOnly: opts.aiOnly,
    startedAt: new Date(state.startedAt).toISOString(),
    endedAt: new Date(state.now).toISOString(),
    durationMs: state.now - state.startedAt,
    winner: state.winner,
    endReason: state.endReason,
    players: state.players.map((p) => ({
      id: p.id,
      seat: p.seat,
      nickname: p.nickname,
      character: p.character,
      side: p.side,
      bot: opts.bots.has(p.id),
      alive: p.alive,
      diedAtMs: p.diedAt === null ? null : p.diedAt - state.startedAt,
    })),
    actions: opts.actions,
    log: state.log,
    finalState: state,
  };
}

export async function saveRecord(dir: string, rec: MatchRecord): Promise<string> {
  const d = new Date(rec.startedAt);
  const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  const stamp = d.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const folder = join(dir, month);
  await mkdir(folder, { recursive: true });
  const file = join(folder, `${stamp}_${rec.mode}_${rec.roomId}.json`);
  await writeFile(file, JSON.stringify(rec), 'utf8');
  return file;
}
