import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { smartBotAction } from '../src/bot.js';
import { fixtures, playMatch } from './league-runner.js';
const path = process.argv[2];
if (!path) throw new Error('main fe4ccaa와 트리가 같은 13af50b 체크아웃의 bot.ts 필요');
const production: typeof smartBotAction = (await import(pathToFileURL(path).href)).smartBotAction;
let pairedConditions = 0, comparedActions = 0;
for (const mode of ['civil_war', 'primordial', 'lidellut', 'troll'] as const)
  for (const count of [8, 12]) for (const fixture of fixtures(mode, 63000 + count, count)) {
    const before: unknown[] = [], after: unknown[] = [];
    const prior = playMatch(fixture, { current: production, reference: smartBotAction }, undefined,
      (s, id, a, r) => before.push([s.now, id, a, r]));
    const current = playMatch(fixture, { current: smartBotAction, reference: smartBotAction }, undefined,
      (s, id, a, r) => after.push([s.now, id, a, r]));
    if (JSON.stringify(prior) !== JSON.stringify(current) || JSON.stringify(before) !== JSON.stringify(after))
      throw new Error(`기본 설정의 운영 정책 차이: ${JSON.stringify(fixture)}`);
    pairedConditions++; comparedActions += before.length;
  }
const hash = (p: string | URL) => createHash('sha256').update(readFileSync(p)).digest('hex');
console.log(JSON.stringify({ format: 1, pairedConditions, engineRuns: pairedConditions * 2, comparedActions,
  exactMatch: true, compared: '결과 객체 및 모든 시도 행동의 시각/시전자/내용/허용 결과/수신 이벤트',
  production: { remoteCommit: 'fe4ccaa7ec872d134a9bcfddebf70758ff279ee3', localCommit: '13af50b',
    equalTree: '8c24d554e4342b9387b52aac82bce4d1ae7f38e3' },
  hashes: { productionBot: hash(path), currentBot: hash(new URL('../src/bot.ts', import.meta.url)),
    script: hash(new URL('./sequence-post-audit-production-compatibility.ts', import.meta.url)),
    runner: hash(new URL('./league-runner.ts', import.meta.url)) } }, null, 2));
