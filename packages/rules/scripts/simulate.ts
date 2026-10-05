// 봇 시뮬레이션: pnpm sim -- [판수] [인원]  (인원 생략 시 8~12 순환)
import { advance, applyAction, createGame, randomBotAction } from '../src/index.js';

const args = process.argv.slice(2).filter((a) => a !== '--');
const games = Number(args[0] ?? 200);
const count = Number(args[1] ?? 0);
const wins = { 1: 0, 2: 0, none: 0 };
let totalEvents = 0;
let totalTurns = 0;
const t0 = Date.now();

for (let i = 0; i < games; i++) {
  const n = count || 8 + (i % 5);
  const players = Array.from({ length: n }, (_, k) => ({ id: `p${k + 1}`, nickname: `봇${k + 1}` }));
  const { state } = createGame({ mode: 'civil_war', players, seed: 1000 + i, now: 0 });
  const bot = { rng: 77 + i };
  let now = 0;
  // 최대 60분, 1초 단위 진행
  while (state.phase === 'running' && now < 60 * 60 * 1000) {
    now += 1000;
    advance(state, now);
    for (const p of state.players) {
      const a = randomBotAction(state, p.id, bot, { activity: 0.05 });
      if (a) applyAction(state, p.id, a, now);
    }
  }
  if (state.winner === 1) wins[1]++;
  else if (state.winner === 2) wins[2]++;
  else wins.none++;
  totalEvents += state.log.length;
  totalTurns += state.turn;
}
console.log(JSON.stringify({ games, wins, avgEvents: Math.round(totalEvents / games), avgTurns: +(totalTurns / games).toFixed(1), ms: Date.now() - t0 }));
