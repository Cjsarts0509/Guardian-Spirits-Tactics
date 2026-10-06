// pnpm league -- [시드 수] [모드|all] [foundation|belief|tactics|current] [시작 시드]
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { smartBotAction, type ModeId } from '../src/index.js';
import { smartBotAction as foundation } from './baselines/foundation.js';
import { smartBotAction as belief } from './baselines/belief.js';
import { smartBotAction as tactics } from './baselines/tactics.js';
import { DEFAULT_SETTINGS, fixtures, playMatch, summarize } from './league-runner.js';

const args = process.argv.slice(2).filter((a) => a !== '--');
const seeds = Number(args[0] ?? 100), mode = args[1] ?? 'all', reference = args[2] ?? 'foundation', startSeed = Number(args[3] ?? 1000);
const modes: ModeId[] = ['civil_war', 'primordial', 'lidellut', 'troll'];
if (!Number.isSafeInteger(seeds) || seeds <= 0 || !Number.isSafeInteger(startSeed) ||
  !(mode === 'all' || modes.includes(mode as ModeId)) || !['foundation', 'belief', 'tactics', 'current'].includes(reference)) throw new Error('시드 수·모드·상대 정책·시작 시드를 확인하세요');
const referencePolicy = reference === 'foundation' ? foundation : reference === 'belief' ? belief : reference === 'tactics' ? tactics : smartBotAction;
const hashes = Object.fromEntries(['../src/bot.ts', './baselines/foundation.ts', './baselines/belief.ts', './baselines/tactics.ts'].map((p) =>
  [p, createHash('sha256').update(readFileSync(new URL(p, import.meta.url))).digest('hex')]));
const output: Record<string, ReturnType<typeof summarize>> = {};
for (const selected of mode === 'all' ? modes : [mode as ModeId]) {
  const results = [];
  for (let i = 0; i < seeds; i++) {
    for (const fixture of fixtures(selected, startSeed + i, 8 + (i % 5))) {
      results.push(playMatch(fixture, { current: smartBotAction, reference: referencePolicy }));
    }
    if ((i + 1) % 10 === 0 || i + 1 === seeds) process.stderr.write(`[league] ${selected} / ${reference}: ${i + 1}/${seeds} 시드 완료\n`);
  }
  output[selected] = summarize(results);
}
console.log(JSON.stringify({ format: 1, reference, startSeed, seedCount: seeds, settings: DEFAULT_SETTINGS,
  baselineSource: { foundation: 'b9b802b:packages/rules/src/bot.ts', belief: '77c592f:packages/rules/src/bot.ts', tactics: '73295e1:packages/rules/src/bot.ts' },
  policySha256: hashes, modes: output }, null, 2));
