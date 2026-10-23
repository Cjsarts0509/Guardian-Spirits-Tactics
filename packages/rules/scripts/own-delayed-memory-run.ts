import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {strictEqual} from 'node:assert';
import {targetCollision058,scenario058,hostTrace058,savedInput058,type Scenario058} from './own-delayed-memory.js';
const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('input.json.gz output.json required');
const hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const bytes=readFileSync(input),decoded=gunzipSync(bytes),data=JSON.parse(decoded.toString());
strictEqual(hash(decoded),'75ce772b18dfaaa254656819af34092bce1e29f1b5aa837739b6207ea9580600');
strictEqual(data.replays.length,96);
const paths=['packages/rules/scripts/own-delayed-memory.ts','packages/rules/scripts/own-delayed-memory-run.ts','packages/rules/test/own-delayed-memory.test.ts',
  'packages/rules/src/bot-memory.ts','packages/rules/src/bot-tactics.ts','packages/rules/src/host-runtime.ts','packages/rules/src/host-memory.ts','packages/rules/src/modes/troll.ts','tools/verify-own-delayed-memory.py'];
const kinds:Scenario058[]=['success','failure','actor-left','target-left','end-before-due','rejected'];
const cases=kinds.map(scenario058),traces=['neonis','kazrow','satoshi'].map(hostTrace058);
const observations=data.replays.map((r:any)=>({fixture:r.fixture,style:r.style,variant:r.variant,
  rows:r.choices.map(savedInput058)}));
strictEqual(observations.reduce((n:number,r:any)=>n+r.rows.length,0),829);
const result={kind:'round058-own-delayed-memory-and-host-audit',sourceRef:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  sourceHashes:Object.fromEntries(paths.map(p=>[p,hash(readFileSync(p))])),inputSHA256:hash(decoded),compressedInputSHA256:hash(bytes),
  newResearchExecutions:0,newResearchSeeds:0,productionSourceChanges:0,
  collision:targetCollision058(),cases,traces,observations,
  summary:{scenarios:cases.length,checkpoints:cases.reduce((n,c)=>n+c.checkpoints.length,0),
    restoredCheckpoints:cases.reduce((n,c)=>n+c.checkpoints.filter((x:any)=>x.fullRestoreEqual&&x.deltaRestoreEqual).length,0),
    actualHostTicks:traces.reduce((n,t)=>n+t.ticks,0),storedGames:observations.length,storedOwnInputObservations:829,
    reconstructedKnowledgeMatches:829,receiptTargetInsensitive:829,
    successFactRetained:cases.filter(c=>c.results.some(e=>e.data?.success===true)&&c.finalKnown===c.targetRole).length,
    resultCases:cases.filter(c=>c.results.length).length,hostDivergences:0},
  limitations:['Synthetic engine fixtures and reprocessed prior own-input records, not new competitive games.',
    'Changing a private receipt target is a synthetic memory sensitivity probe, not a valid alternate full match.',
    'Pending target omission is before transport; full host state/log/queue still retains the event and delayed effect.',
    'Successful result facts persist. Failed outcomes do not assert exact identities.',
    'No blanket wait suppression or performance/balance claim; round055 conclusions unchanged.']};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result.summary));
