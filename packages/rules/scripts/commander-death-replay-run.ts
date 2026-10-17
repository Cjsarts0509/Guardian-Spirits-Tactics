/** Finite, resumable replay of round045. Never generates a new research fixture. */
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {strictEqual,ok} from 'node:assert';
import {CooperativeStore,storeHash} from './cooperative-store.js';
import {replayDeathRecord,replayHash,type OriginalRecord} from './commander-death-replay.js';
const [input,out,sourceRef,batchArg='40']=process.argv.slice(2);
if(!input||!out||!sourceRef||!/^([a-f0-9]{40})$/.test(sourceRef))throw Error('input.json.gz out.json frozenSourceSHA [batch=40]');
const batch=Number(batchArg);ok(Number.isSafeInteger(batch)&&batch>=0&&batch<=40);
const root=resolve(fileURLToPath(new URL('../',import.meta.url))),repo=resolve(root,'../..');
const bytes=gunzipSync(readFileSync(input)),d=JSON.parse(bytes.toString());
strictEqual(storeHash(bytes),'3660f8ce495e8789e011171ca23ceec9a1f97825e90a1020ba3d1d415ca0e822');
strictEqual(d.complete,true);strictEqual(d.executions,320);strictEqual(d.records.length,320);
for(const [p,h] of Object.entries(d.sourceHashes))strictEqual(storeHash(readFileSync(resolve(root,p))),h,'045 source changed: '+p);
for(const [p,h] of Object.entries(d.auxiliarySourceHashes))strictEqual(storeHash(readFileSync(resolve(repo,p))),h,'045 verifier changed: '+p);
const scripts=['scripts/commander-death-replay.ts','scripts/commander-death-replay-run.ts','scripts/cooperative-store.ts'];
const sourceHashes=Object.fromEntries(scripts.map(p=>[p,storeHash(readFileSync(resolve(root,p)))]));
const verificationHashes=Object.fromEntries(['tools/verify-commander-death-replay.py','tools/test-commander-death-replay.py','tools/run-commander-death-replay.py'].map(p=>[p,storeHash(readFileSync(resolve(repo,p)))]));
const meta={kind:'commander-engine-death-replay',sourceRef,inputSHA256:storeHash(bytes),inputSourceRef:'cad80d2c843c16dd97104f5c844a0298e589f51d',optionsSHA256:d.optionsSHA256,settings:d.settings,sourceHashes,verificationHashes,newResearchExecutions:0,expectedUniqueGames:320,passesPerUniqueGame:2};
type Row=ReturnType<typeof replayDeathRecord>;
const key=(r:Row)=>`${r.variant}:${r.fixture.seed}:${r.fixture.reversed}`;
const store=new CooperativeStore<Row>({out,meta,fingerprint:storeHash(JSON.stringify(meta)),expectedCount:320,key,project:s=>s.records});
const oldCount=store.records.length;
try{
 for(let i=0;i<oldCount;i++){
  const o=d.records[i] as OriginalRecord,r=store.records[i]!;
  strictEqual(key(r),`${o.variant}:${o.result.game.fixture.seed}:${o.result.game.fixture.reversed}`);strictEqual(r.originalRecordSHA256,replayHash(o));
 }
 for(let i=oldCount;i<Math.min(320,oldCount+batch);i++){
  const r=replayDeathRecord(d.records[i],d.settings);store.append(r);
  console.log(JSON.stringify({completed:i+1,fixture:r.fixture,variant:r.variant,deaths:r.deaths.map(x=>[x.character,x.cause])}));
 }
 const snapshot=store.checkpoint({...meta,fingerprint:storeHash(JSON.stringify(meta)),executions:store.records.length,complete:store.records.length===320,records:store.records});
 writeFileSync(out.replace(/\.json$/,'.resume.json'),JSON.stringify({executions:snapshot.executions,newUniqueGames:store.records.length-oldCount,complete:snapshot.complete,policyReplayPasses:store.records.length-oldCount,commandReplayPasses:store.records.length-oldCount},null,2));
}finally{store.close();}
