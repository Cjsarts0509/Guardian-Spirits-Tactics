// 최종 기본 정책 대 운영 고정 기준. [시드 수] [시작 시드]
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { smartBotAction } from '../src/index.js';
import { smartBotAction as production } from '../src/bot.js';
import { fixtures, playMatch, summarize, pairedInterval, DEFAULT_SETTINGS } from './league-runner.js';
const seeds = Number(process.argv[2] ?? 100), startSeed = Number(process.argv[3] ?? 31000);
if (!Number.isSafeInteger(seeds) || seeds <= 0 || !Number.isSafeInteger(startSeed)) throw new Error('설정 오류');

const modes: Record<string, ReturnType<typeof summarize>> = {};
for (const mode of ['civil_war', 'primordial', 'lidellut', 'troll'] as const) {
  const games = [];
  for (let i = 0; i < seeds; i++) for (const f of fixtures(mode, startSeed + i, 8 + i % 5)) {
    games.push(playMatch(f, { current: (s, id, m, o) => smartBotAction(s, id, m, { ...o, attackSearch: true }), reference: (s, id, m, o) => production(s, id, m, { activity: o.activity, attackSearch: false }) }, DEFAULT_SETTINGS));
  }
  modes[mode] = summarize(games);
  process.stderr.write(`[bounded-attack] ${mode}: ${seeds} 시드\n`);
}
const scores = Array.from({ length: seeds }, (_, i) => Object.values(modes).reduce((sum, m) => sum + m.pairedScores[i]!.score, 0) / 4);
console.log(JSON.stringify({ format: 1, seeds, startSeed, reference: '58ff60d policy, bounded attack disabled',
  settings: DEFAULT_SETTINGS, modes, overall: { score: scores.reduce((s, x) => s + x, 0) / seeds,
    seedBootstrap95: pairedInterval(scores), seedScores: scores },
  hashes: Object.fromEntries(['../src/bot.ts', '../src/bot-rollout.ts', '../src/bot-hypothesis.ts', '../src/bot-confirmation.ts', '../src/bot-information.ts', '../src/bot-belief.ts', '../src/bot-memory.ts', './bounded-attack.ts', './league-runner.ts'].map((p) =>
    [p, createHash('sha256').update(readFileSync(new URL(p, import.meta.url))).digest('hex')])) }, null, 2));
