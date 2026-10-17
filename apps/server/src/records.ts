// 판 기록을 서버 로컬 파일로 보관 (AI 개량·리플레이용). RECORDS_DIR 이 비어 있으면 아무것도 안 한다.
// 파일: <RECORDS_DIR>/<YYYY-MM>/<시작시각>_<모드>_<방id>.json  — 설정·참가자·모든 행동(거절 포함)·전체 이벤트 로그·최종 상태
import { mkdir, open, readFile, link, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import {randomUUID} from 'node:crypto';
import type { Action, GameState } from '@gst/rules';

export interface ActionRecord {
  /** 게임 시작 기준 경과 ms */
  t: number;
  player: string;
  action: Action;
  ok: boolean;
  error?: string;
  /** 실제 사람이라는 인증이 아니라 입력 경로의 출처. */
  controller?: 'human-input' | 'bot' | 'away-bot';
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
  replay?: {version:1;initialState:GameState;initialBots:string[];authority:'server'|'player-host'};
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
  initialState?:GameState|null;initialBots?:Set<string>;authority?:'server'|'player-host';
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
    actions: structuredClone(opts.actions),
    log: structuredClone(state.log),
    finalState: structuredClone(state),
    ...(opts.initialState?{replay:{version:1 as const,initialState:structuredClone(opts.initialState),initialBots:[...(opts.initialBots??opts.bots)],authority:opts.authority??'server'}}:{}),
  };
}

export async function saveRecord(dir: string, rec: MatchRecord): Promise<string> {
  const d = new Date(rec.startedAt);
  const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  const stamp = d.toISOString().replace(/[:.]/g, '-');
  const folder = join(dir, month);
  await mkdir(folder, { recursive: true });
  const file = join(folder, `${stamp}_${rec.mode}_${rec.roomId}.json`);
  const text=JSON.stringify(rec),tmp=file+'.'+randomUUID()+'.tmp';
  const fd=await open(tmp,'wx');try{await fd.writeFile(text,'utf8');await fd.sync();}finally{await fd.close();}
  try {
    if(await readFile(tmp,'utf8')!==text)throw Error('판 기록 임시 파일 검증 실패');
    try{await link(tmp,file);}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST'||await readFile(file,'utf8')!==text)throw e;}
    const directory=await open(folder,'r');try{await directory.sync();}finally{await directory.close();}
    if(await readFile(file,'utf8')!==text)throw Error('판 기록 게시 검증 실패');
  }finally{await unlink(tmp);}
  return file;
}
