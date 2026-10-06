// 운영 기본 봇과 직접 대결. [시드 수] [시작 시드] [entropy|enemy-entropy|probability|balanced|all]
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { smartBotAction } from '../src/index.js';
import { smartBotAction as production } from './baselines/pre-adaptive.js';
import { fixtures, playMatch, summarize, DEFAULT_SETTINGS, pairedInterval } from './league-runner.js';

const args = process.argv.slice(2);
const seeds = Number(args[0] ?? 50), startSeed = Number(args[1] ?? 17000), selected = args[2] ?? 'all';
const policies = ['entropy', 'enemy-entropy', 'probability', 'balanced'] as const;
if (!Number.isSafeInteger(seeds) || seeds <= 0 || !Number.isSafeInteger(startSeed) ||
  !(selected === 'all' || policies.some((p) => p === selected))) throw new Error('설정 오류');
const results: Record<string, unknown> = {};
for (const policy of policies.filter((p) => selected === 'all' || p === selected)) {
  const modes: Record<string, ReturnType<typeof summarize>> = {};
  for (const mode of ['civil_war', 'primordial', 'lidellut', 'troll'] as const) {
    const games = [];
    for (let i = 0; i < seeds; i++) for (const f of fixtures(mode, startSeed + i, 8 + i % 5)) {
      games.push(playMatch(f, { current: (s, id, m, o) => smartBotAction(s, id, m, { ...o, informationTargets: policy }),
        reference: (s, id, m, o) => production(s, id, m, { activity: o.activity }) }, DEFAULT_SETTINGS));
    }
    modes[mode] = summarize(games);
    process.stderr.write(`[overall] ${policy}/${mode}: ${seeds} 시드\n`);
  }
  // 시드마다 네 모드에 같은 가중치를 주고, 시드를 독립 재표본 단위로 유지한다.
  const seedScores = Array.from({ length: seeds }, (_, i) => Object.values(modes).reduce((s, m) => s + m.pairedScores[i]!.score, 0) / 4);
  results[policy] = { modes, overall: { score: seedScores.reduce((s, x) => s + x, 0) / seeds,
    seedBootstrap95: pairedInterval(seedScores), seedScores } };
}
console.log(JSON.stringify({ format: 1, seeds, startSeed, selected, settings: DEFAULT_SETTINGS,
  reference: 'main 7e18a65 (default truthful), identical decision body c505d4b frozen pre-adaptive',
  hashes: Object.fromEntries(['../src/bot.ts', '../src/bot-belief.ts', '../src/bot-memory.ts', './baselines/pre-adaptive.ts', './overall-information.ts', './league-runner.ts'].map((p) =>
    [p, createHash('sha256').update(readFileSync(new URL(p, import.meta.url))).digest('hex')])), results }, null, 2));
