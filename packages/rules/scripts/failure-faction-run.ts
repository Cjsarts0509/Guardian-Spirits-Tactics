import {readFileSync,writeFileSync,appendFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {strictEqual,deepStrictEqual,ok} from 'node:assert';
import {createBotMemory,updateBotKnowledge} from '../src/index.js';
import {storeHash} from './cooperative-store.js';
import {SENDER_OPTIONS} from './sender-development.js';
import {failureRule061} from './failure-faction-rule.js';
import {verifiedFailureProbe061,FAILURE_FACTION_OPTIONS} from './failure-faction-probe.js';
const [input,live,output,journal,maxText]=process.argv.slice(2);
if(!input||!live||!output||!journal)throw Error('original055.json live060.json.gz output061.json journal.ndjson [maxNew]');
const max=maxText===undefined?96:Number(maxText);ok(Number.isSafeInteger(max)&&max>=0&&max<=96);
const raw=readFileSync(input),prior=gunzipSync(readFileSync(live));
strictEqual(storeHash(raw),'ee3a619c0c0d453174dd64533a838068acc6f8c4523fee4560c97774f34a8e77');
strictEqual(storeHash(prior),'61e7362ec495d6e2169d201af048c1bbc5020e4fed11c200450cdd0abc3a96e2');
const data=JSON.parse(raw.toString()),old=JSON.parse(prior.toString());
const key=(r:any)=>JSON.stringify([r.fixture,r.style,r.variant]);
const selected=old.records.filter((r:any)=>r.episodes.some((e:any)=>e.firstResultSeen?.record.status==='failed'));
const original=new Map(data.records.map((r:any)=>[key(r),r]));
strictEqual(selected.reduce((n:number,r:any)=>n+r.episodes.filter((e:any)=>e.firstResultSeen?.record.status==='failed').length,0),110);
const git=(args:string[])=>execFileSync('git',args,{encoding:'utf8'}).trim();
git(['diff','HEAD','--exit-code','--','packages/rules/src','packages/rules/scripts','packages/rules/test','tools']);
const codeTrees=Object.fromEntries(['packages/rules/src','packages/rules/scripts','packages/rules/test','tools'].map(p=>[p,git(['rev-parse',`HEAD:${p}`])]));
const paths=['packages/rules/scripts/failure-faction-rule.ts','packages/rules/scripts/failure-faction-probe.ts','packages/rules/scripts/failure-faction-run.ts',
 'packages/rules/src/bot-own-delayed-check.ts','packages/rules/src/bot-memory.ts','packages/rules/src/bot.ts',
 'packages/rules/src/modes/troll.ts','docs/spec/troll.md','tools/verify-failure-faction.py'];
const options={originalControl:{rememberOwnDelayedCheck:true},originalCandidate:{...SENDER_OPTIONS,rememberOwnDelayedCheck:true},probe:FAILURE_FACTION_OPTIONS};
const expected={kind:'round061-exact-own-failure-faction-probes',inputSHA256:storeHash(raw),liveSHA256:storeHash(prior),settings:data.settings,options,
 optionsSHA256:storeHash(JSON.stringify(options)),codeTrees,sourceHashes:Object.fromEntries(paths.map(p=>[p,storeHash(readFileSync(p))])),targetRecords:selected.length,
 newResearchExecutions:0,newResearchSeeds:0};
let meta:any,records:any[]=[];
if(existsSync(journal)){
 const lines=readFileSync(journal,'utf8').trim().split('\n').map(l=>JSON.parse(l));meta=lines[0];const {sourceRef,...rest}=meta;deepStrictEqual(rest,expected);
 for(const [i,line] of lines.slice(1).entries()){strictEqual(line.index,i);strictEqual(line.key,key(selected[i]));strictEqual(line.sha256,storeHash(JSON.stringify(line.record)));records.push(line.record);}
}else{meta={...expected,sourceRef:git(['rev-parse','HEAD'])};writeFileSync(journal,JSON.stringify(meta)+'\n');}
const rules=failureRule061().map(r=>{
 const m=createBotMemory(258);updateBotKnowledge(r.preView,r.preEvents,m,FAILURE_FACTION_OPTIONS);
 const k=updateBotKnowledge(r.view,r.events,m,FAILURE_FACTION_OPTIONS);
 const candidates=[...k.candidates],known=[...k.known];
 if(r.accepted)ok(k.candidates.get(r.target)?.includes(r.role)||k.known.get(r.target)===r.role);
 return {...r,candidateCandidates:candidates,candidateKnown:known};
});
const start=records.length;
for(let i=start;i<Math.min(selected.length,start+max);i++){
 const record=verifiedFailureProbe061(original.get(key(selected[i])) as any,data.settings,selected[i]);records.push(record);
 appendFileSync(journal,JSON.stringify({index:i,key:key(selected[i]),sha256:storeHash(JSON.stringify(record)),record})+'\n');
 console.log(JSON.stringify({complete:i+1,total:selected.length,variant:record.variant,seed:record.fixture.seed,failedResults:record.expectedFailedResults,probes:record.rows.length}));
}
const summary=Object.fromEntries(['control','candidate'].map(v=>{
 const games=records.filter(r=>r.variant===v),rows=games.flatMap(r=>r.rows),receipts=rows.flatMap(r=>r.receipts);
 return [v,{games:games.length,actions:games.reduce((n,r)=>n+r.actions,0),probes:rows.length,failedResults:receipts.length,
 eligible:receipts.filter(r=>r.eligible).length,reduced:receipts.filter(r=>r.eligible&&r.removed.length>0).length,
 actionChanged:rows.filter(r=>r.actionChanged).length,newExactIdentities:rows.reduce((n,r)=>n+r.newExactIdentities.length,0),
 removedNames:rows.reduce((n,r)=>n+r.removed.reduce((z:number,x:any)=>z+x.removed.length,0),0),
 candidateCommands:rows.filter(r=>r.candidateCommand).length,candidateRejected:rows.filter(r=>r.candidateCommand&&!r.candidateCommand.accepted).length}];
}));
writeFileSync(output,JSON.stringify({...meta,completed:records.length===selected.length,rules,records,summary,
 limitations:['Existing games replayed unchanged; candidate actions only applied on separate same-moment clones.',
 'Eligible denominator requires both factions among old target candidates. Already-known targets are not new opportunities.',
 'No whole-match candidate wins or resource effects measured; no human games; no new cumulative research games.']},null,2)+'\n');
console.log(JSON.stringify({resumedRecords:start,newReplays:records.length-start,completed:records.length===selected.length,summary}));
