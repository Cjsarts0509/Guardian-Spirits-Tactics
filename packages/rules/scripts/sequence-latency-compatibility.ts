import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { smartBotAction } from '../src/bot.js';
import { fixtures, playMatch, DEFAULT_SETTINGS } from './league-runner.js';
const baselinePath = process.argv[2];
if (!baselinePath) throw new Error('수정 전 34398ab 고정 bot.ts 경로 필요');
const prior: typeof smartBotAction = (await import(pathToFileURL(baselinePath).href)).smartBotAction;
const hash = (p: string | URL) => createHash('sha256').update(readFileSync(p)).digest('hex');
const files = readdirSync(new URL('../src/', import.meta.url)).filter((p) => /^bot(?:-.*)?\.ts$/.test(p)).sort();
const groups = [];
for (const extended of [false, true]) {
  let conditions = 0, comparedActions = 0;
  for (const mode of ['civil_war', 'primordial', 'lidellut', 'troll'] as const) {
    for (let i = 0; i < 5; i++) for (const f of fixtures(mode, 64000 + i, 8 + i)) {
      const before: unknown[] = [], after: unknown[] = [];
      const options = extended ? { sequenceSearch: true, sequenceSkills: true, sequenceExtended: true } : {};
      const old = playMatch(f, {
        current: (s, id, m, o) => prior(s, id, m, { ...o, ...options }),
        reference: (s, id, m, o) => prior(s, id, m, { ...o, ...options }),
      }, DEFAULT_SETTINGS, (s, id, a, r) => before.push([s.now, id, a, r]));
      const current = playMatch(f, {
        current: (s, id, m, o) => smartBotAction(s, id, m, { ...o, ...options }),
        reference: (s, id, m, o) => smartBotAction(s, id, m, { ...o, ...options }),
      }, DEFAULT_SETTINGS, (s, id, a, r) => after.push([s.now, id, a, r]));
      if (JSON.stringify(old) !== JSON.stringify(current) || JSON.stringify(before) !== JSON.stringify(after))
        throw new Error(`행동/결과 차이: ${extended}/${JSON.stringify(f)}`);
      conditions++; comparedActions += before.length;
    }
    process.stderr.write(`[latency-compatibility] ${extended ? 'extended' : 'default'}/${mode} 완료\n`);
  }
  groups.push({ extended, conditions, engineRuns: conditions * 2, comparedActions, exactMatch: true });
}
console.log(JSON.stringify({ format: 1, baselineLocalCommit: '34398ab', baselineRemoteCommit: '778a6f8e36f869176ba5fdd51d8b7cea4da64b04',
  startSeed: 64000, seeds: 5, groups, settings: DEFAULT_SETTINGS,
  scope: '모든 봇의 정책을 교체한 전후 대전의 결과 객체·모든 시도 행동/결과/이벤트 일치. 새 승률 개선 증거가 아님.',
  baselineHashes: Object.fromEntries(files.map((p) => [p, hash(resolve(dirname(baselinePath), p))])),
  hashes: Object.fromEntries([...files.map((p) => [`../src/${p}`, hash(new URL(`../src/${p}`, import.meta.url))]),
    ...['sequence-latency-compatibility.ts', 'league-runner.ts'].map((p) => [p, hash(new URL(p, import.meta.url))])]) }, null, 2));
