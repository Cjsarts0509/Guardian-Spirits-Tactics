// 고정 정책 새 시드 검증. [시드 수] [시작 시드] [civil_war|primordial|lidellut|troll|all] [skills|plain]
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { smartBotAction } from '../src/index.js';
import { fixtures, playMatch, summarize, pairedInterval, DEFAULT_SETTINGS } from './league-runner.js';
const seeds = Number(process.argv[2] ?? 200), startSeed = Number(process.argv[3] ?? 46000);
const selected = process.argv[4] ?? 'civil_war', skillMode = process.argv[5] ?? 'plain';
const all = ['civil_war', 'primordial', 'lidellut', 'troll'] as const;
if (!Number.isSafeInteger(seeds) || seeds <= 0 || !Number.isSafeInteger(startSeed) ||
  (selected !== 'all' && !all.some((m) => m === selected)) || !['plain', 'skills'].includes(skillMode)) throw new Error('설정 오류');
const modes: Record<string, ReturnType<typeof summarize>> = {};
for (const mode of all.filter((m) => selected === 'all' || selected === m)) {
  const games = [];
  for (let i = 0; i < seeds; i++) {
    for (const f of fixtures(mode, startSeed + i, 8 + i % 5)) games.push(playMatch(f, {
      current: (s, id, m, o) => smartBotAction(s, id, m, { ...o, sequenceSearch: true, sequenceSkills: skillMode === 'skills' }),
      reference: (s, id, m, o) => smartBotAction(s, id, m, { activity: o.activity, sequenceSearch: false, attackSearch: false }),
    }, DEFAULT_SETTINGS));
    if ((i + 1) % 25 === 0) process.stderr.write(`[sequence-validation] ${mode}: ${i + 1}/${seeds} 시드\n`);
  }
  modes[mode] = summarize(games);
}
const scores = Array.from({ length: seeds }, (_, i) => Object.values(modes).reduce((sum, m) => sum + m.pairedScores[i]!.score, 0) / Object.keys(modes).length);
const sources = ['../src/bot.ts', '../src/bot-sequence.ts', '../src/bot-followup.ts', '../src/bot-rollout.ts', '../src/bot-response.ts', '../src/bot-hypothesis.ts', '../src/bot-confirmation.ts', '../src/bot-information.ts', '../src/bot-belief.ts', '../src/bot-memory.ts', './sequence-validation.ts', './league-runner.ts'];
console.log(JSON.stringify({ format: 1, seeds, startSeed, selected, skillMode,
  reference: 'fe4ccaa production policy, experimental search disabled', settings: DEFAULT_SETTINGS, modes,
  overall: { score: scores.reduce((s, x) => s + x, 0) / seeds, seedBootstrap95: pairedInterval(scores), seedScores: scores },
  hashes: Object.fromEntries(sources.filter((p) => existsSync(new URL(p, import.meta.url))).map((p) =>
    [p, createHash('sha256').update(readFileSync(new URL(p, import.meta.url))).digest('hex')])) }, null, 2));
