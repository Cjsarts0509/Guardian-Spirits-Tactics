import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { smartBotAction } from '../src/bot.js';
import { fixtures, playMatch, summarize, pairedInterval, DEFAULT_SETTINGS } from './league-runner.js';
const seeds = Number(process.argv[2] ?? 100), startSeed = Number(process.argv[3] ?? 57000);
const selected = process.argv[4] ?? 'all', comparator = process.argv[5] ?? 'extended', baselinePath = process.argv[6];
const all = ['civil_war', 'primordial', 'lidellut', 'troll'] as const;
if (!Number.isSafeInteger(seeds) || seeds <= 0 || !Number.isSafeInteger(startSeed) ||
  (selected !== 'all' && !all.some((m) => m === selected)) || !['extended', 'roles'].includes(comparator) ||
  (comparator === 'extended' && !baselinePath)) throw new Error('설정 또는 고정 이전 소스 경로 오류');
const previous: typeof smartBotAction = comparator === 'extended'
  ? (await import(pathToFileURL(baselinePath!).href)).smartBotAction : smartBotAction;
const modes: Record<string, ReturnType<typeof summarize>> = {};
for (const mode of all.filter((m) => selected === 'all' || selected === m)) {
  const games = [];
  for (let i = 0; i < seeds; i++) {
    for (const f of fixtures(mode, startSeed + i, 8 + i % 5)) games.push(playMatch(f, {
      current: (s, id, m, o) => smartBotAction(s, id, m, { ...o, sequenceSearch: true, sequenceSkills: true, sequenceExtended: true }),
      reference: (s, id, m, o) => previous(s, id, m, { ...o, sequenceSearch: true, sequenceSkills: true, sequenceExtended: comparator === 'extended' }),
    }, DEFAULT_SETTINGS));
    if ((i + 1) % 25 === 0) process.stderr.write(`[priority-validation] ${comparator}/${mode}: ${i + 1}/${seeds}\n`);
  }
  modes[mode] = summarize(games);
}
const scores = Array.from({ length: seeds }, (_, i) => Object.values(modes).reduce((sum, m) => sum + m.pairedScores[i]!.score, 0) / Object.keys(modes).length);
const sources = ['../src/bot.ts', '../src/bot-sequence.ts', '../src/bot-followup.ts', '../src/bot-growth.ts', '../src/bot-rollout.ts',
  '../src/bot-response.ts', '../src/bot-hypothesis.ts', '../src/bot-confirmation.ts', '../src/bot-information.ts', '../src/bot-belief.ts',
  '../src/bot-memory.ts', './sequence-priority-validation.ts', './league-runner.ts'];
console.log(JSON.stringify({ format: 1, seeds, startSeed, selected, comparator,
  reference: comparator === 'extended' ? '68de00c frozen extended policy before tactical-priority correction' : 'b7c56ee 25-role policy, extended disabled',
  settings: DEFAULT_SETTINGS, modes, overall: { score: scores.reduce((s, x) => s + x, 0) / seeds, seedBootstrap95: pairedInterval(scores), seedScores: scores },
  hashes: { ...(baselinePath ? { frozenBaselineBot: createHash('sha256').update(readFileSync(baselinePath)).digest('hex') } : {}),
    ...Object.fromEntries(sources.map((p) => [p, createHash('sha256').update(readFileSync(new URL(p, import.meta.url))).digest('hex')])) } }, null, 2));
