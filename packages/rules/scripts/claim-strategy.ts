// pnpm --filter @gst/rules exec tsx scripts/claim-strategy.ts [시드 수] [시작 시드] [current|truthful|truthful-noncommanders|all]
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { smartBotAction, viewFor } from '../src/index.js';
import { smartBotAction as previous } from './baselines/pre-claim.js';
import { opponentClaim, type ClaimStyle } from './claim-opponents.js';
import { fixtures, playMatch, summarize, DEFAULT_SETTINGS, type Policy } from './league-runner.js';

const args = process.argv.slice(2).filter((a) => a !== '--');
const seeds = Number(args[0] ?? 25), startSeed = Number(args[1] ?? 9000), selected = args[2] ?? 'all';
const strategies = ['current', 'truthful', 'truthful-noncommanders'] as const;
if (!Number.isSafeInteger(seeds) || seeds <= 0 || !Number.isSafeInteger(startSeed) ||
  !(selected === 'all' || strategies.some((s) => s === selected))) throw new Error('평가 설정 오류');
const output: Record<string, unknown> = {};
for (const strategy of strategies.filter((s) => selected === 'all' || s === selected)) {
  const modes: Record<string, unknown> = {};
  const current: Policy = (s, id, m, o) => smartBotAction(s, id, m, { ...o, claimStrategy: strategy });
  for (const mode of ['civil_war', 'primordial', 'lidellut', 'troll'] as const) {
    const opponents: Record<string, unknown> = {};
    for (const style of ['previous', 'truthful', 'bluff', 'skill-aware-bluff'] as const) {
      const reference: Policy = (s, id, m, o) => {
        const action = previous(s, id, m, o);
        if (style === 'previous' || action?.type !== 'skill' || action.skill !== 'publish') return action;
        return { ...action, name: opponentClaim(viewFor(s, id), m, style as ClaimStyle, action.name) };
      };
      const results = [];
      for (let i = 0; i < seeds; i++) for (const f of fixtures(mode, startSeed + i, 8 + i % 5)) results.push(playMatch(f, { current, reference }));
      opponents[style] = summarize(results);
      process.stderr.write(`[strategy] ${strategy}/${mode}/${style}: ${seeds} 시드\n`);
    }
    modes[mode] = opponents;
  }
  output[strategy] = modes;
}
console.log(JSON.stringify({ format: 1, seeds, startSeed, selected, settings: DEFAULT_SETTINGS,
  referenceSource: '446d213 / 7faac91:packages/rules/src/bot.ts',
  hashes: Object.fromEntries(['../src/bot.ts', '../src/bot-memory.ts', './baselines/pre-claim.ts', './claim-opponents.ts', './claim-strategy.ts'].map((p) =>
    [p, createHash('sha256').update(readFileSync(new URL(p, import.meta.url))).digest('hex')])), strategies: output }, null, 2));
