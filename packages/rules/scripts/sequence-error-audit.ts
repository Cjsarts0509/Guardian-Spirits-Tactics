import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { smartBotAction } from '../src/bot.js';
import { fixtures, playMatch, DEFAULT_SETTINGS } from './league-runner.js';

const baselinePath = process.argv[2];
if (!baselinePath) throw new Error('수정 전 f1c64e9 체크아웃의 bot.ts 절대 경로 필요');
const prior: typeof smartBotAction = (await import(pathToFileURL(baselinePath).href)).smartBotAction;
let pairedConditions = 0;
const smoke = [];
for (const mode of ['civil_war', 'primordial', 'lidellut', 'troll'] as const) {
  for (const count of [8, 12]) for (const fixture of fixtures(mode, 59000 + count, count)) {
    const before = playMatch(fixture, { current: prior, reference: smartBotAction });
    const after = playMatch(fixture, { current: smartBotAction, reference: smartBotAction });
    if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error(`기본 정책 변화: ${JSON.stringify(fixture)}`);
    pairedConditions++;
  }
  const result = playMatch(fixtures(mode, 59100, 12)[0]!, {
    current: (s, id, m, o) => smartBotAction(s, id, m, { ...o, sequenceSearch: true, sequenceSkills: true, sequenceExtended: true }),
    reference: smartBotAction,
  });
  if (result.winner === null) throw new Error(`확장 옵션 미종료: ${mode}`);
  smoke.push(result);
  process.stderr.write(`[error-audit] ${mode} 완료\n`);
}
console.log(JSON.stringify({ format: 1, baselineLocalCommit: 'f1c64e9',
  baselineRemoteCommit: '56f9ca5e21bfbbc1f4f194a7757bb5d4ee4e5869', settings: DEFAULT_SETTINGS,
  defaultCompatibility: { pairedConditions, engineRuns: pairedConditions * 2, exactMatch: true },
  extendedSmoke: smoke, scope: '오류 점검과 기본 정책 호환성. 승률·지연 개선 증거가 아님.',
  hashes: { baselineBot: createHash('sha256').update(readFileSync(baselinePath)).digest('hex'),
    ...Object.fromEntries(['../src/bot.ts', '../src/bot-followup.ts', '../src/bot-rollout.ts',
      './sequence-error-audit.ts', './league-runner.ts'].map((p) => [p,
        createHash('sha256').update(readFileSync(new URL(p, import.meta.url))).digest('hex')])) } }, null, 2));
