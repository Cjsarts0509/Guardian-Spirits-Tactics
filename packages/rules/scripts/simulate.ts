// 봇 시뮬레이션: pnpm sim -- [판수] [인원] [smart|random] [모드]
// 서버와 같은 조건(250ms 틱, 봇 행동 확률 0.012)으로 돌려 판 길이 분포를 본다
import { advance, applyAction, createGame, randomBotAction, smartBotAction } from '../src/index.js';

const args = process.argv.slice(2).filter((a) => a !== '--');
const games = Number(args[0] ?? 200);
const count = Number(args[1] ?? 0);
const kind = args[2] ?? 'smart';
const mode = (args[3] ?? 'civil_war') as 'civil_war' | 'primordial' | 'lidellut' | 'troll';
const TICK = 250;
const ACTIVITY = 0.012;
const LIMIT = 90 * 60 * 1000;
const wins = { 1: 0, 2: 0, none: 0 };
const minutes: number[] = [];
const reasons = new Map<string, number>();
let failedAttacksEarly = 0;
const t0 = Date.now();

for (let i = 0; i < games; i++) {
  const n = count || 8 + (i % 5);
  const players = Array.from({ length: n }, (_, k) => ({ id: `p${k + 1}`, nickname: `봇${k + 1}` }));
  const { state } = createGame({ mode, players, seed: 1000 + i, now: 0 });
  const mem = { rng: 77 + i };
  let now = 0;
  while (state.phase === 'running' && now < LIMIT) {
    now += TICK;
    advance(state, now);
    for (const p of state.players) {
      const a = kind === 'random' ? randomBotAction(state, p.id, mem, { activity: ACTIVITY }) : smartBotAction(state, p.id, mem, { activity: ACTIVITY });
      if (a) applyAction(state, p.id, a, now);
    }
  }
  if (state.winner === 1) wins[1]++;
  else if (state.winner === 2) wins[2]++;
  else wins.none++;
  minutes.push((state.now - state.startedAt) / 60000);
  const r = (state.endReason ?? '시간 초과').slice(0, 20);
  reasons.set(r, (reasons.get(r) ?? 0) + 1);
  failedAttacksEarly += state.log.filter((e) => e.at < 4 * 60000 && e.kind.startsWith('attack.fail')).length;
}
minutes.sort((a, b) => a - b);
const q = (x: number) => +minutes[Math.min(minutes.length - 1, Math.floor(x * minutes.length))]!.toFixed(1);
console.log(
  JSON.stringify({ mode, kind, games, wins, minutes: { p10: q(0.1), median: q(0.5), p90: q(0.9), max: q(0.999) }, failedAttacksFirst4min: failedAttacksEarly, reasons: Object.fromEntries(reasons), ms: Date.now() - t0 }, null, 1),
);
