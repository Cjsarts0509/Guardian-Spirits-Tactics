/** Storage/orchestration only: immutable, disjoint seed shards of a frozen runner. */
import {existsSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {deepStrictEqual,strictEqual,ok} from 'node:assert';
const [operation,input,directory,sizeText,frozen]=process.argv.slice(2);
ok(['prepare','merge'].includes(operation)&&input&&directory&&frozen);
const {CooperativeStore,storeHash}=await import(pathToFileURL(resolve(frozen,'packages/rules/scripts/cooperative-store.ts')).href);
const key=r=>[r.fixture.mode,r.fixture.seed,r.fixture.reversed,r.variant].join('/');
const allKeys=m=>['civil_war','primordial','lidellut','troll'].flatMap(mode=>Array.from({length:m.count},(_,i)=>[false,true].flatMap(rev=>['baseline','control','candidate'].map(v=>[mode,m.start+i,rev,v].join('/')))).flat());
const exportsFor=out=>[out,out.replace(/\.json$/,'.journal.ndjson'),out.replace(/\.json$/,'.publication.json')];
const hashes=paths=>Object.fromEntries(paths.map(p=>[p,storeHash(readFileSync(p))]));
const json=x=>JSON.stringify(x,null,2)+'\n';
const planPath=join(directory,'plan.json');
if(operation==='prepare'){
 ok(!existsSync(directory),'Refuse existing shard directory');const size=Number(sizeText);
 const raw=readFileSync(input),snapshot=JSON.parse(raw),{meta,fingerprint}=JSON.parse(readFileSync(input+'.store/metadata.json','utf8'));
 strictEqual(meta.kind,'own-failure-faction-identical-policy');strictEqual(fingerprint,storeHash(JSON.stringify(meta)));
 strictEqual(execFileSync('git',['rev-parse','HEAD'],{cwd:frozen}).toString().trim(),meta.sourceRef);
 ok(Number.isSafeInteger(size)&&size>0&&size%5===0&&meta.count%size===0);
 strictEqual(snapshot.fingerprint,fingerprint);strictEqual(snapshot.executions,snapshot.records.length);
 deepStrictEqual(snapshot.records.map(key),allKeys(meta).slice(0,snapshot.executions));
 mkdirSync(directory,{recursive:true});const workers=[];
 for(let start=meta.start;start<meta.start+meta.count;start+=size){
  const index=workers.length,out=join(directory,`worker-${index}.json`),workerMeta={...meta,start,count:size},workerFingerprint=storeHash(JSON.stringify(workerMeta));
  const copied=snapshot.records.filter(r=>r.fixture.seed>=start&&r.fixture.seed<start+size);
  deepStrictEqual(copied.map(key),allKeys(workerMeta).slice(0,copied.length));
  for(let seed=start;seed<start+size;seed++)strictEqual(8+(seed-meta.start)%5,8+(seed-start)%5,'player-count stratum changed');
  const store=new CooperativeStore({out,meta:workerMeta,fingerprint:workerFingerprint,expectedCount:size*24,key,project:s=>s.records});
  try{for(const row of copied)store.append(row);store.checkpoint({...workerMeta,fingerprint:workerFingerprint,executions:copied.length,complete:copied.length===size*24,records:store.records});}finally{store.close();}
  workers.push({index,out,start,count:size,expected:size*24,copiedRecords:copied.length,fingerprint:workerFingerprint,initialExportSHA256:hashes(exportsFor(out))});
 }
 strictEqual(workers.reduce((n,w)=>n+w.copiedRecords,0),snapshot.executions);
 const plan={kind:'frozen-selfplay-disjoint-seed-shards',createdAt:new Date().toISOString(),master:input,frozen,sourceRef:meta.sourceRef,meta,fingerprint,expected:meta.count*24,initialMasterCount:snapshot.executions,initialMasterExportSHA256:hashes(exportsFor(input)),initialPayloadSHA256:Object.fromEntries(snapshot.records.map(r=>[key(r),storeHash(JSON.stringify(r))])),workers,newGamesDuringPreparation:0,policyOptionsOrFixturesChanged:false,all960OrConfiguredFixtureInputsPreserved:true};
 writeFileSync(planPath,json(plan));console.log(JSON.stringify({preparedWorkers:workers.length,copiedRecords:snapshot.executions,newGames:0,planPath,planSHA256:storeHash(readFileSync(planPath))}));
}else{
 const plan=JSON.parse(readFileSync(planPath,'utf8'));strictEqual(plan.master,input);strictEqual(plan.frozen,frozen);
 const registration=JSON.parse(readFileSync(join(directory,'registration.json'),'utf8'));strictEqual(registration.planSHA256,storeHash(readFileSync(planPath)));
 strictEqual(execFileSync('git',['rev-parse','HEAD'],{cwd:frozen}).toString().trim(),plan.sourceRef);
 const {meta,fingerprint}=plan,expectedKeys=allKeys(meta),store=new CooperativeStore({out:input,meta,fingerprint,expectedCount:plan.expected,key,project:s=>s.records,leaseMs:900000});
 const lineage=[];const workerFor=seed=>{const w=plan.workers.find(w=>seed>=w.start&&seed<w.start+w.count);ok(w);return w;};
 const committed=(w,k)=>{
  const path=w.out+'.store/records/'+storeHash(k)+'.json';if(!existsSync(path))return null;
  const e=JSON.parse(readFileSync(path,'utf8')),head=JSON.parse(readFileSync(w.out+'.store/HEAD.json','utf8'));if(head.count<=e.ordinal)return null;
  strictEqual(head.fingerprint,w.fingerprint);strictEqual(e.fingerprint,w.fingerprint);strictEqual(e.version,2);strictEqual(e.key,k);strictEqual(e.sha256,storeHash(JSON.stringify(e.record)));
  strictEqual(allKeys({...meta,start:w.start,count:w.count})[e.ordinal],k);strictEqual(key(e.record),k);
  strictEqual(e.record.fixture.count,8+(e.record.fixture.seed-meta.start)%5);
  return e;
 };
 const save=()=>{store.checkpoint({...meta,fingerprint,executions:store.records.length,complete:store.records.length===plan.expected,records:store.records});writeFileSync(join(directory,'lineage.json'),json({sourceRef:plan.sourceRef,planSHA256:storeHash(readFileSync(planPath)),copiedOriginalPrefix:plan.initialMasterCount,mergedNewRows:lineage,executions:store.records.length}));};
 try{
  deepStrictEqual(store.records.map(key),expectedKeys.slice(0,store.records.length));
  for(const [i,row] of store.records.entries()){
   if(i<plan.initialMasterCount)strictEqual(storeHash(JSON.stringify(row)),plan.initialPayloadSHA256[key(row)]);
   else{const w=workerFor(row.fixture.seed),e=committed(w,key(row));ok(e);deepStrictEqual(e.record,row);lineage.push({globalOrdinal:i,worker:w.index,workerOrdinal:e.ordinal,key:e.key,payloadSHA256:e.sha256});}
  }
  let saved=store.records.length,lastSave=Date.now();
  while(store.records.length<plan.expected){
   const k=expectedKeys[store.records.length],seed=Number(k.split('/')[1]),w=workerFor(seed),e=committed(w,k);
   if(e){const i=store.records.length;store.append(e.record);lineage.push({globalOrdinal:i,worker:w.index,workerOrdinal:e.ordinal,key:e.key,payloadSHA256:e.sha256});}
   else if(existsSync(join(directory,'driver-done.json'))||Date.now()>Date.parse(meta.stopAt)+180000)break;
   else await new Promise(r=>setTimeout(r,1000));
   if(store.records.length-saved>=12||Date.now()-lastSave>=60000){save();saved=store.records.length;lastSave=Date.now();console.log(JSON.stringify({merged:saved,expected:plan.expected,newResearchCountedOnlyInMaster:true}));}
  }
  save();writeFileSync(join(directory,'merge-done.json'),json({at:new Date().toISOString(),executions:store.records.length,complete:store.records.length===plan.expected,exportSHA256:hashes(exportsFor(input)),originalPrefixPreserved:true}));
 }finally{store.close();}
}
