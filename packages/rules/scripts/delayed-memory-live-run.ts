import {readFileSync,writeFileSync,appendFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {strictEqual,deepStrictEqual,ok} from 'node:assert';
import {storeHash} from './cooperative-store.js';
import {SENDER_OPTIONS} from './sender-development.js';
import {verifiedLiveDelayed060} from './delayed-memory-live.js';
import type {Record055} from './troll-regression-replay.js';
const [input,census,output,journal,maxNewText]=process.argv.slice(2);
if(!input||!census||!output||!journal)throw Error('original055.json census057.json.gz output060.json journal.ndjson [maxNew]');
const maxNew=maxNewText===undefined?96:Number(maxNewText);ok(Number.isSafeInteger(maxNew)&&maxNew>=0&&maxNew<=96);
const raw=readFileSync(input),prior=gunzipSync(readFileSync(census));
strictEqual(storeHash(raw),'ee3a619c0c0d453174dd64533a838068acc6f8c4523fee4560c97774f34a8e77');
strictEqual(storeHash(prior),'75ce772b18dfaaa254656819af34092bce1e29f1b5aa837739b6207ea9580600');
const data=JSON.parse(raw.toString()),old=JSON.parse(prior.toString());
const key=(r:any)=>JSON.stringify([r.fixture,r.style,r.variant]);
const selected=(data.records as Record055[]).filter(r=>['control','candidate'].includes(r.variant)&&r.actions.some(a=>
  a.side===r.fixture.currentSide&&a.accepted&&a.action.type==='skill'&&a.action.skill==='chaos_hex'));
strictEqual(selected.length,96);deepStrictEqual(selected.map(key),old.replays.map(key));
const git=(args:string[])=>execFileSync('git',args,{encoding:'utf8'}).trim();
git(['diff','HEAD','--exit-code','--','packages/rules/src','packages/rules/scripts','packages/rules/test','tools']);
const codeTrees=Object.fromEntries(['packages/rules/src','packages/rules/scripts','packages/rules/test','tools'].map(p=>[p,git(['rev-parse',`HEAD:${p}`])]));
const paths=['packages/rules/scripts/delayed-memory-live.ts','packages/rules/scripts/delayed-memory-live-run.ts',
  'packages/rules/src/bot-own-delayed-check.ts','packages/rules/src/bot-memory.ts','packages/rules/src/bot.ts','tools/verify-delayed-memory-live.py'];
const options={control:{rememberOwnDelayedCheck:true},candidate:{...SENDER_OPTIONS,rememberOwnDelayedCheck:true}};
const expected={kind:'round060-live-delayed-memory-census',inputSHA256:storeHash(raw),censusSHA256:storeHash(prior),
  settings:data.settings,options,optionsSHA256:storeHash(JSON.stringify(options)),codeTrees,
  sourceHashes:Object.fromEntries(paths.map(p=>[p,storeHash(readFileSync(p))])),targetRecords:96,newResearchExecutions:0,newResearchSeeds:0};
let meta:any,rows:any[]=[];
if(existsSync(journal)){
  const lines=readFileSync(journal,'utf8').trim().split('\n').map(l=>JSON.parse(l));meta=lines[0];
  const {sourceRef,...rest}=meta;deepStrictEqual(rest,expected);ok(typeof sourceRef==='string');
  for(const [i,line] of lines.slice(1).entries()){
    strictEqual(line.index,i);strictEqual(line.key,key(selected[i]));strictEqual(line.sha256,storeHash(JSON.stringify(line.record)));rows.push(line.record);
  }
}else{meta={...expected,sourceRef:git(['rev-parse','HEAD'])};writeFileSync(journal,JSON.stringify(meta)+'\n');}
const start=rows.length;
for(let i=start;i<Math.min(96,start+maxNew);i++){
  const record=verifiedLiveDelayed060(selected[i]!,data.settings);rows.push(record);
  appendFileSync(journal,JSON.stringify({index:i,key:key(selected[i]),sha256:storeHash(JSON.stringify(record)),record})+'\n');
  console.log(JSON.stringify({complete:i+1,total:96,variant:record.variant,seed:record.fixture.seed,actions:record.actions,receipts:record.episodes.length}));
}
writeFileSync(output,JSON.stringify({...meta,completed:rows.length===96,records:rows,
  summary:{records:rows.length,actions:rows.reduce((n,r)=>n+r.actions,0),receipts:rows.reduce((n,r)=>n+r.episodes.length,0),
    primaryComparisons:rows.reduce((n,r)=>n+r.primaryCompared,0),chatComparisons:rows.reduce((n,r)=>n+r.chatCompared,0),
    intakeObservations:rows.reduce((n,r)=>n+r.observations.length,0)},
  limitations:['Replay of existing request-bearing cohort, not new independent games or a win-rate experiment.',
    'Only actual live-policy memory updates count. Postmortem and ended results are censored separately.',
    'Observer never calls updateBotKnowledge to fill the actual memory. Passive ledger has no tactical consumer.']},null,2)+'\n');
console.log(JSON.stringify({resumedRecords:start,newReplays:rows.length-start,completed:rows.length===96}));
