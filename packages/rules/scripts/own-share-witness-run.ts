import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {strictEqual} from 'node:assert';
import {CooperativeStore,storeHash} from './cooperative-store.js';
import {verifiedShareWitness} from './own-share-witness.js';
const [input,out,sourceRef]=process.argv.slice(2);if(!input||!out||!sourceRef||!/^[a-f0-9]{40}$/.test(sourceRef))throw Error('raw045.gz output.json frozenSourceSHA');
const root=fileURLToPath(new URL('../',import.meta.url)),repo=resolve(root,'../..'),bytes=gunzipSync(readFileSync(input)),d=JSON.parse(bytes.toString());strictEqual(storeHash(bytes),'3660f8ce495e8789e011171ca23ceec9a1f97825e90a1020ba3d1d415ca0e822');
for(const [p,h] of Object.entries(d.sourceHashes))strictEqual(storeHash(readFileSync(resolve(root,p))),h);
for(const [p,h] of Object.entries(d.auxiliarySourceHashes))strictEqual(storeHash(readFileSync(resolve(repo,p))),h);
const sourceHashes=Object.fromEntries(['scripts/own-share-witness.ts','scripts/own-share-witness-run.ts','scripts/commander-death-replay.ts','scripts/cooperative-store.ts'].map(p=>[p,storeHash(readFileSync(resolve(root,p)))]));
const verificationHashes=Object.fromEntries(['tools/verify-own-share-witness.py','tools/test-own-share-witness.py','tools/analyze-own-share-path.py','tools/test-own-share-path.py'].map(p=>[p,storeHash(readFileSync(resolve(repo,p)))]));
const selected=d.records.filter((r:any)=>{const f=r.result.game.fixture;return f.count===12&&(f.seed===151009&&f.reversed||f.seed===151014&&!f.reversed);});strictEqual(selected.length,4);
const meta={kind:'own-sender-share-witness',sourceRef,input045SHA256:storeHash(bytes),optionsSHA256:d.optionsSHA256,settings:d.settings,sourceHashes,verificationHashes,newResearchExecutions:0,expectedUniqueGames:4,passesPerUniqueGame:2};
type Row=ReturnType<typeof verifiedShareWitness>;
const store=new CooperativeStore<Row>({out,meta,fingerprint:storeHash(JSON.stringify(meta)),expectedCount:4,key:r=>`${r.variant}:${r.fixture.seed}:${r.fixture.reversed}`,project:s=>s.records});
try{
 for(let i=0;i<store.records.length;i++)strictEqual(store.records[i]!.originalRecordSHA256,storeHash(JSON.stringify(selected[i])));
 for(let i=store.records.length;i<4;i++){const r=verifiedShareWitness(selected[i],d.settings);store.append(r);store.checkpoint({...meta,fingerprint:storeHash(JSON.stringify(meta)),executions:store.records.length,complete:store.records.length===4,records:store.records});console.log(JSON.stringify({completed:store.records.length,variant:r.variant,fixture:r.fixture,active:r.activeCalls}));}
 if(store.records.length===4)store.checkpoint({...meta,fingerprint:storeHash(JSON.stringify(meta)),executions:4,complete:true,records:store.records});
}finally{store.close();}
