import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { smartBotAction } from '../src/bot.js';

import { fixtures, playMatch, DEFAULT_SETTINGS } from './league-runner.js';
const reference = process.argv[2] ?? '720888270de82f366db31ac7d685a55da94310e3';
if (!/^[0-9a-f]{7,40}$/.test(reference)) throw new Error('커밋 SHA 필요');
const source = execFileSync('git', ['show', `${reference}:packages/rules/src/bot.ts`], { encoding: 'utf8' });
const temporary = new URL(`../src/bot-sequence-baseline-${process.pid}.ts`, import.meta.url);
writeFileSync(temporary, source);
try {
const prior: typeof smartBotAction = (await import(temporary.href)).smartBotAction;
let games = 0;
for (const mode of ['civil_war', 'primordial', 'lidellut', 'troll'] as const) {
  for (let i = 0; i < 5; i++) for (const f of fixtures(mode, 45000 + i, 8 + i)) {
    const before = playMatch(f, { current: prior, reference: prior }, DEFAULT_SETTINGS);
    const after = playMatch(f, { current: smartBotAction, reference: prior }, DEFAULT_SETTINGS);
    if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error(`기본 정책 변화: ${mode}, ${i}`);
    games++;
  }
}
console.log(JSON.stringify({ format: 1, games, engineRuns: games * 2, startSeed: 45000, seeds: 5,
  result: 'all paired match result objects exactly equal', baselineCommit: reference, baselineRemoteCommit: '720888270de82f366db31ac7d685a55da94310e3',
  scope: 'default-policy compatibility check, not independent improvement evidence',
  hashes: { baselineSource: createHash('sha256').update(source).digest('hex'), ...Object.fromEntries(['../src/bot.ts', '../src/bot-confirmation.ts', './sequence-default-compatibility.ts', './league-runner.ts'].map((p) =>
    [p, createHash('sha256').update(readFileSync(new URL(p, import.meta.url))).digest('hex')])) } }, null, 2));
} finally { unlinkSync(temporary); }
