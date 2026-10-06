// 최종 기본 정책 대 운영 고정 기준. [시드 수] [시작 시드]
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { smartBotAction } from '../src/index.js';
import { smartBotAction as production } from './baselines/foundation.js';
import { smartBotAction as first } from './baselines/first-smart.js';
import { fixtures, playMatch, summarize, pairedInterval, DEFAULT_SETTINGS } from './league-runner.js';
const seeds = Number(process.argv[2] ?? 100), startSeed = Number(process.argv[3] ?? 28000);
if (!Number.isSafeInteger(seeds) || seeds <= 0 || !Number.isSafeInteger(startSeed)) throw new Error('설정 오류');
const reference = process.argv[4] === 'first' ? 'first' : 'foundation';
const modes: Record<string, ReturnType<typeof summarize>> = {};
for (const mode of reference === 'first' ? ['civil_war'] as const : ['civil_war', 'primordial', 'lidellut', 'troll'] as const) {
  const games = [];
  for (let i = 0; i < seeds; i++) for (const f of fixtures(mode, startSeed + i, 8 + i % 5)) {
    games.push(playMatch(f, { current: smartBotAction, reference: (s, id, m, o) => (reference === 'first' ? first : production)(s, id, m, { activity: o.activity }) }, DEFAULT_SETTINGS));
  }
  modes[mode] = summarize(games);
  process.stderr.write(`[initial-comparison] ${mode}: ${seeds} 시드\n`);
}
const scores = Array.from({ length: seeds }, (_, i) => Object.values(modes).reduce((sum, m) => sum + m.pairedScores[i]!.score, 0) / Object.keys(modes).length);
console.log(JSON.stringify({ format: 1, seeds, startSeed, reference: reference === 'first' ? 'e9063f9 first smart bot / civil war only' : 'b9b802b early four-mode policy',
  current: '58ff60d production policy', settings: DEFAULT_SETTINGS, modes, overall: { score: scores.reduce((s, x) => s + x, 0) / seeds,
    seedBootstrap95: pairedInterval(scores), seedScores: scores },
  hashes: Object.fromEntries(['../src/bot.ts', '../src/bot-confirmation.ts', '../src/bot-information.ts', '../src/bot-belief.ts', '../src/bot-memory.ts', './baselines/foundation.ts', './baselines/first-smart.ts', './initial-comparison.ts', './league-runner.ts'].map((p) =>
    [p, createHash('sha256').update(readFileSync(new URL(p, import.meta.url))).digest('hex')])) }, null, 2));
