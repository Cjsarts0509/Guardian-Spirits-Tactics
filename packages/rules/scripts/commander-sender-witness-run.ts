import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {strictEqual} from 'node:assert';
import {execFileSync} from 'node:child_process';
import {CooperativeStore,storeHash} from './cooperative-store.js';
import {verifiedCommanderSenderWitness} from './commander-sender-witness.js';
const [input,out,sourceRef]=process.argv.slice(2);if(!input||!out||!sourceRef||!/^[a-f0-9]{40}$/.test(sourceRef))throw Error('raw045.gz output.json frozenSourceSHA');
const root=fileURLToPath(new URL('../',import.meta.url)),repo=resolve(root,'../..'),bytes=gunzipSync(readFileSync(input)),d=JSON.parse(bytes.toString());strictEqual(storeHash(bytes),'3660f8ce495e8789e011171ca23ceec9a1f97825e90a1020ba3d1d415ca0e822');
const legacySourceRef='3bafb562897e480b7935a3718f713d5931a088aa',policyDeltaFiles:Record<string,{legacySHA256:string;currentSHA256:string}>={};
for(const [p,h] of Object.entries(d.sourceHashes)){
 const current=storeHash(readFileSync(resolve(root,p)));
 if(['src/bot.ts','src/bot-intel.ts'].includes(p)){
  const legacy=storeHash(execFileSync('git',['show',legacySourceRef+':packages/rules/'+p],{cwd:repo}));strictEqual(legacy,h);
  policyDeltaFiles[p]={legacySHA256:legacy,currentSHA256:current};
 }else strictEqual(current,h);
}
for(const [p,h] of Object.entries(d.auxiliarySourceHashes))strictEqual(storeHash(readFileSync(resolve(repo,p))),h);
const sourceHashes=Object.fromEntries(['scripts/commander-sender-witness.ts','scripts/commander-sender-witness-run.ts','scripts/commander-death-replay.ts','scripts/cooperative-store.ts','src/bot.ts','src/bot-intel.ts','scripts/baselines/pre-round053.ts'].map(p=>[p,storeHash(readFileSync(resolve(root,p)))]));
const verificationHashes=Object.fromEntries(['tools/verify-commander-sender-witness.py','tools/test-commander-sender-witness.py','tools/verify-own-share-witness.py'].map(p=>[p,storeHash(readFileSync(resolve(repo,p)))]));
const selected=d.records.filter((r:any)=>{const f=r.result.game.fixture;return f.count===12&&(f.seed===151009&&f.reversed||f.seed===151014&&!f.reversed);});strictEqual(selected.length,4);
const candidateOptions={verifyIncomingAllies:'commander-report'},candidateOptionsSHA256=storeHash(JSON.stringify(candidateOptions));
const meta={legacySourceRef,policyDeltaFiles,candidateOptions,candidateOptionsSHA256,actualCandidateGames:0,kind:'commander-report-sender-witness',sourceRef,input045SHA256:storeHash(bytes),optionsSHA256:d.optionsSHA256,settings:d.settings,sourceHashes,verificationHashes,newResearchExecutions:0,expectedUniqueGames:4,passesPerUniqueGame:2};
type Row=ReturnType<typeof verifiedCommanderSenderWitness>;
const store=new CooperativeStore<Row>({out,meta,fingerprint:storeHash(JSON.stringify(meta)),expectedCount:4,key:r=>`${r.variant}:${r.fixture.seed}:${r.fixture.reversed}`,project:s=>s.records});
try{
 for(let i=0;i<store.records.length;i++)strictEqual(store.records[i]!.originalRecordSHA256,storeHash(JSON.stringify(selected[i])));
 for(let i=store.records.length;i<4;i++){const r=verifiedCommanderSenderWitness(selected[i],d.settings);store.append(r);store.checkpoint({...meta,fingerprint:storeHash(JSON.stringify(meta)),executions:store.records.length,complete:store.records.length===4,records:store.records});console.log(JSON.stringify({completed:store.records.length,variant:r.variant,fixture:r.fixture,active:r.activeCalls}));}
 if(store.records.length===4)store.checkpoint({...meta,fingerprint:storeHash(JSON.stringify(meta)),executions:4,complete:true,records:store.records});
}finally{store.close();}
