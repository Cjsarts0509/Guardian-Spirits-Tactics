import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { smartBotAction } from '../src/bot.js';
import { fixtures, playMatch, summarize, pairedInterval, DEFAULT_SETTINGS } from './league-runner.js';

const seeds = Number(process.argv[2] ?? 50), startSeed = Number(process.argv[3] ?? 60000);
const comparator = process.argv[4] ?? 'pre-audit', baselinePath = process.argv[5];
if (!Number.isSafeInteger(seeds) || seeds <= 0 || !Number.isSafeInteger(startSeed) || startSeed < 0 ||
  !['pre-audit', 'production'].includes(comparator) || (comparator === 'pre-audit' && !baselinePath)) throw new Error('평가 설정 오류');
const previous: typeof smartBotAction = comparator === 'pre-audit'
  ? (await import(pathToFileURL(baselinePath!).href)).smartBotAction : smartBotAction;
const policyFiles = ['bot.ts', 'bot-sequence.ts', 'bot-followup.ts', 'bot-growth.ts', 'bot-rollout.ts',
  'bot-response.ts', 'bot-hypothesis.ts', 'bot-confirmation.ts', 'bot-information.ts', 'bot-belief.ts', 'bot-memory.ts'];
const hash = (path: string | URL) => createHash('sha256').update(readFileSync(path)).digest('hex');
const baselineHashes = comparator === 'pre-audit'
  ? Object.fromEntries(policyFiles.map((p) => [p, hash(resolve(dirname(baselinePath!), p))])) : undefined;
const modes: Record<string, ReturnType<typeof summarize>> = {};
for (const mode of ['civil_war', 'primordial', 'lidellut', 'troll'] as const) {
  const games = [];
  for (let i = 0; i < seeds; i++) {
    for (const fixture of fixtures(mode, startSeed + i, 8 + i % 5)) games.push(playMatch(fixture, {
      current: (s, id, m, o) => smartBotAction(s, id, m, { ...o, sequenceSearch: true, sequenceSkills: true, sequenceExtended: true }),
      reference: (s, id, m, o) => previous(s, id, m, comparator === 'production' ? o :
        { ...o, sequenceSearch: true, sequenceSkills: true, sequenceExtended: true }),
    }, DEFAULT_SETTINGS));
    if ((i + 1) % 10 === 0) process.stderr.write(`[post-audit] ${comparator}/${mode}: ${i + 1}/${seeds}\n`);
  }
  modes[mode] = summarize(games);
}
const scores = Array.from({ length: seeds }, (_, i) => Object.values(modes).reduce((sum, m) => sum + m.pairedScores[i]!.score, 0) / 4);
console.log(JSON.stringify({ format: 1, currentPolicy: { localCommit: '1b83ade', remoteCommit: 'b1925aba87889aaf38f65a9fb470cb223c878c17' },
  seeds, startSeed, comparator, reference: comparator === 'pre-audit'
    ? { localCommit: 'f1c64e9', remoteCommit: '56f9ca5e21bfbbc1f4f194a7757bb5d4ee4e5869', baselineHashes }
    : { policy: 'same current source with all experimental search options left at default false; production confirmationSearch combat-lidellut' },
  settings: DEFAULT_SETTINGS, modes,
  overall: { score: scores.reduce((s, x) => s + x, 0) / seeds, seedBootstrap95: pairedInterval(scores), seedScores: scores },
  scope: '새 시드의 좌석/진영 교환 합성 대전. 인간 실력이나 VM 지연의 근거가 아님. 모드별 구간은 다중 비교 미보정.',
  hashes: Object.fromEntries([...policyFiles.map((p) => [`../src/${p}`, hash(new URL(`../src/${p}`, import.meta.url))]),
    ...['sequence-post-audit-validation.ts', 'league-runner.ts'].map((p) => [p, hash(new URL(p, import.meta.url))])]) }, null, 2));
