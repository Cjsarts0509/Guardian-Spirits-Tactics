import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {strictEqual,deepStrictEqual} from 'node:assert';
import {scenario059,savedLedger059} from './delayed-memory-evaluation.js';
import {regression059} from './delayed-memory-regression.js';
const hash=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('input057.json.gz output059.json required');
const compressed=readFileSync(input),raw=gunzipSync(compressed),old=JSON.parse(raw.toString());
strictEqual(hash(raw),'75ce772b18dfaaa254656819af34092bce1e29f1b5aa837739b6207ea9580600');
const cases=(['success','failure','actor-left','target-left','end-before-due','rejected'] as const).map(scenario059);
const observations=old.replays.map((r:any)=>({fixture:r.fixture,style:r.style,variant:r.variant,rows:r.choices.map(savedLedger059)}));
const regressions=regression059(true),baseline=JSON.parse(readFileSync(new URL('./baselines/round059-prechange.json',import.meta.url),'utf8'));
deepStrictEqual(regressions.map(r=>r.core),baseline.rows);
const paths=['packages/rules/src/bot-own-delayed-check.ts','packages/rules/src/bot-memory.ts','packages/rules/src/bot.ts',
  'packages/rules/scripts/delayed-memory-run.ts','packages/rules/scripts/delayed-memory-evaluation.ts','packages/rules/scripts/delayed-memory-regression.ts',
  'packages/rules/scripts/delayed-memory-baseline-run.ts','packages/rules/scripts/baselines/round059-prechange.json','packages/rules/test/bot-own-delayed-check.test.ts',
  'packages/rules/src/modes/troll.ts','tools/verify-delayed-memory.py'];
const options={rememberOwnDelayedCheck:true,behavior:'passive memory only',delayMs:60000,recordLimit:64};
const result={kind:'round059-passive-own-delayed-memory',sourceRef:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  sourceHashes:Object.fromEntries(paths.map(p=>[p,hash(readFileSync(p))])),options,optionsSHA256:hash(JSON.stringify(options)),
  inputSHA256:hash(raw),compressedInputSHA256:hash(compressed),baselineSourceRef:baseline.sourceRef,
  newResearchExecutions:0,newResearchSeeds:0,cases,observations,regressions,
  summary:{scenarios:6,checkpoints:30,restoredCheckpoints:30,knownAndOldMemoryUnchanged:30,storedRecords:96,
    storedOwnInputs:observations.reduce((n:number,r:any)=>n+r.rows.length,0),pendingMatches:829,
    wrongPendingTargets:0,newIdentityClaimsFromLedger:0,hostDivergences:0,syntheticLimitedRegressionRuns:4,
    prechangeRegressionMatches:4,limitedRegressionsUnfinished:regressions.filter(r=>r.core.game.winner===null).length},
  limitations:['All engine fixtures and 4-minute synthetic regressions excluded from competitive counts; 4 regressions hit the intentional limit.',
    '829 reprocessed prior own inputs are not 829 new games or independent observations.',
    'Dead/ended manual memory updates are functional diagnostics, not live-policy utilization.',
    'No tactical consumer, no win-rate or balance claim, no human matches. Round055 performance deficit remains.']};
strictEqual(result.summary.storedOwnInputs,829);writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result.summary));
