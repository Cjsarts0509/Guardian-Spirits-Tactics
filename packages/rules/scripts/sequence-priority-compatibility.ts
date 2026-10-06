import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { smartBotAction } from '../src/bot.js';
import { fixtures, playMatch, DEFAULT_SETTINGS } from './league-runner.js';
const baselinePath = process.argv[2];
if (!baselinePath) throw new Error('이전 고정 bot.ts 절대 경로 필요');
const prior: typeof smartBotAction = (await import(pathToFileURL(baselinePath).href)).smartBotAction;
let games = 0;
for (const mode of ['civil_war', 'primordial', 'lidellut', 'troll'] as const) {
  for (let i = 0; i < 5; i++) for (const f of fixtures(mode, 45000 + i, 8 + i)) {
    const before = playMatch(f, { current: (s, id, m, o) => prior(s, id, m, { ...o, sequenceSearch: true, sequenceSkills: true }), reference: smartBotAction }, DEFAULT_SETTINGS);
    const after = playMatch(f, { current: (s, id, m, o) => smartBotAction(s, id, m, { ...o, sequenceSearch: true, sequenceSkills: true }), reference: smartBotAction }, DEFAULT_SETTINGS);
    if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error(`탐색 선택 변화: ${mode}, ${i}`);
    games++;
  }
}
console.log(JSON.stringify({ format: 1, games, engineRuns: games * 2, startSeed: 45000, seeds: 5,
  result: 'all paired match result objects exactly equal with sequence search enabled and 25-role skills enabled and extended option disabled',
  baselineRemoteCommit: '68de00c8381c29aacd43f915f60caa0ff25ecf93',
  scope: 'tactical-priority correction, extended-option-disabled compatibility, not independent improvement evidence',
  hashes: { baselineSource: createHash('sha256').update(readFileSync(baselinePath)).digest('hex'), ...Object.fromEntries(['../src/bot.ts', '../src/bot-sequence.ts', './sequence-priority-compatibility.ts', './league-runner.ts'].map((p) =>
    [p, createHash('sha256').update(readFileSync(new URL(p, import.meta.url))).digest('hex')])) } }, null, 2));
