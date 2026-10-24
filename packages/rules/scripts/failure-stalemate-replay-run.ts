/** Finite preregistered replay selection; each stored row is a replay, not a new game. */
import {readFileSync,readdirSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {deepStrictEqual,strictEqual,ok} from 'node:assert';
import {CooperativeStore,storeHash} from './cooperative-store.js';
import {replayFailureStalemate} from './failure-stalemate-replay.js';
import {FAILURE_OPTIONS} from './failure-development.js';
const [manifestPath,out,sourceRef,batchArg='12',stopAtText]=process.argv.slice(2),batch=Number(batchArg);
if(!manifestPath||!out||!sourceRef||!/^[a-f0-9]{40}$/.test(sourceRef)||!Number.isSafeInteger(batch)||batch<1||!stopAtText)throw Error('manifest, out, source, finite batch and deadline required');
const stopAt=Date.parse(stopAtText);ok(Number.isFinite(stopAt));
const root=fileURLToPath(new URL('../',import.meta.url)),repo=resolve(root,'../..');
strictEqual(execFileSync('git',['rev-parse','HEAD'],{cwd:repo}).toString().trim(),sourceRef);
const sourceHashes:Record<string,string>={};
const walk=(dir:string,prefix:string)=>{for(const e of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){if(e.isDirectory())walk(resolve(dir,e.name),prefix+e.name+'/');else if(e.name.endsWith('.ts'))sourceHashes[prefix+e.name]=storeHash(readFileSync(resolve(dir,e.name)));}};walk(resolve(root,'src'),'src/');
for(const p of ['failure-stalemate-replay.ts','failure-stalemate-replay-run.ts','failure-development.ts','sender-development.ts','sender-arbitration-witness.ts','cooperative-store.ts','league-runner.ts','baselines/pre-cooperative.ts','claim-opponents.ts'])sourceHashes['scripts/'+p]=storeHash(readFileSync(resolve(root,'scripts',p)));
for(const [p,h] of Object.entries(sourceHashes))strictEqual(h,storeHash(execFileSync('git',['show',sourceRef+':packages/rules/'+p],{cwd:repo})));
const verificationHashes=Object.fromEntries(['tools/verify-failure-stalemate-replay.py'].map(p=>[p,storeHash(readFileSync(resolve(repo,p)))]));
for(const [p,h] of Object.entries(verificationHashes))strictEqual(h,storeHash(execFileSync('git',['show',sourceRef+':'+p],{cwd:repo})));
const manifestText=readFileSync(manifestPath,'utf8'),manifest=JSON.parse(manifestText);
strictEqual(manifest.kind,'own-failure-stalemate-selection');strictEqual(manifest.newResearchExecutions,0);
ok(Array.isArray(manifest.sources)&&Array.isArray(manifest.selected)&&manifest.selected.length>0);
const sources=new Map<string,any>();
for(const input of manifest.sources){
 ok(typeof input.id==='string'&&!sources.has(input.id));const path=resolve(dirname(manifestPath),input.path),encoded=readFileSync(path),raw=path.endsWith('.gz')?gunzipSync(encoded):encoded;
 strictEqual(storeHash(raw),input.sha256);const data=JSON.parse(raw.toString());strictEqual(data.sourceRef,input.sourceRef);strictEqual(data.complete,true);
 ok(['own-failure-faction-development','own-failure-faction-identical-policy'].includes(data.kind));strictEqual(data.executions,data.records.length);
 strictEqual(data.executions,data.count*(data.kind==='own-failure-faction-identical-policy'?24:144));
 deepStrictEqual(data.options,FAILURE_OPTIONS);
 // Exact production, option provider, engine runner and old baseline remain the original evaluated versions.
 for(const [p,h] of Object.entries(data.sourceHashes))if(p.startsWith('src/')||['scripts/sender-development.ts','scripts/sender-arbitration-witness.ts','scripts/league-runner.ts','scripts/baselines/pre-cooperative.ts','scripts/claim-opponents.ts'].includes(p))strictEqual(sourceHashes[p],h);
 sources.set(input.id,data);
}
const selectedKeys=new Set<string>();
const selected=manifest.selected.map((selection:any)=>{
 const data=sources.get(selection.inputId);ok(data);
 const matches=data.records.filter((r:any)=>JSON.stringify(r.fixture)===JSON.stringify(selection.fixture)&&r.style===selection.style&&r.variant===selection.variant);
 strictEqual(matches.length,1);const original=matches[0];strictEqual(storeHash(JSON.stringify(original)),selection.recordSHA256);
 const key=selection.inputId+'/'+selection.recordSHA256;ok(!selectedKeys.has(key));selectedKeys.add(key);
 return {selection,original,data,key};
});
const meta={format:1,kind:'own-failure-stalemate-replay',sourceRef,stopAt:stopAtText,sourceHashes,verificationHashes,
 manifestSHA256:storeHash(manifestText),manifest,newResearchExecutions:0};
const fingerprint=storeHash(JSON.stringify(meta));mkdirSync(dirname(out),{recursive:true});
const store=new CooperativeStore<any>({out,meta,fingerprint,expectedCount:selected.length,key:r=>r.key,project:s=>s.records});
const seen=new Set(store.records.map(r=>r.key));let fresh=0;
const save=()=>store.checkpoint({...meta,fingerprint,executions:store.records.length,expectedReplays:selected.length,complete:store.records.length===selected.length,records:store.records});
try{
 for(const item of selected){
  if(seen.has(item.key))continue;if(Date.now()>=stopAt||fresh>=batch)break;
  const replay=replayFailureStalemate(item.original,item.data.settings,item.data.kind==='own-failure-faction-identical-policy');
  store.append({key:item.key,inputId:item.selection.inputId,originalRecordSHA256:item.selection.recordSHA256,...replay});seen.add(item.key);fresh++;save();
 }
 save();console.log(JSON.stringify({freshReplays:fresh,newResearchExecutions:0,total:store.records.length,expected:selected.length,complete:store.records.length===selected.length,deadlineReached:Date.now()>=stopAt}));
}finally{store.close();}
