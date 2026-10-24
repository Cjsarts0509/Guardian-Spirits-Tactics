// Storage-only projection of four completed workers; does not invoke either policy.
import {readFileSync} from 'node:fs';
import {strictEqual,deepStrictEqual} from 'node:assert';
import {CooperativeStore,storeHash} from '../packages/rules/scripts/cooperative-store.ts';
const [out,planPath,workerDirectory]=process.argv.slice(2),plan=JSON.parse(readFileSync(planPath,'utf8'));
const records=[],origins={};let reference=null;
for(const mode of ['civil_war','primordial','lidellut','troll']){
 const base=workerDirectory+'/gst074-'+mode,snapshot=readFileSync(base+'.json'),journal=readFileSync(base+'.journal.ndjson'),publication=readFileSync(base+'.publication.json');
 const data=JSON.parse(snapshot),pub=JSON.parse(publication);strictEqual(data.executions,25);strictEqual(data.complete,true);
 strictEqual(storeHash(snapshot),pub.snapshotSHA256);strictEqual(storeHash(journal),pub.journalSHA256);
 deepStrictEqual(data.records,journal.toString().trimEnd().split('\n').slice(1).map(x=>JSON.parse(x)));
 strictEqual(data.mode,mode);strictEqual(data.candidateRef,plan.candidateRef);strictEqual(data.mainRef,plan.mainRef);
 reference??=data;deepStrictEqual(data.sources,reference.sources);deepStrictEqual(data.mainSources,reference.mainSources);
 origins[mode]={snapshotSHA256:storeHash(snapshot),journalSHA256:storeHash(journal),publicationSHA256:storeHash(publication),fingerprint:data.fingerprint,executions:25};records.push(...data.records);
}
deepStrictEqual(records.map(r=>r.fixture),plan.fixtures);strictEqual(records.length,100);
const meta={kind:'pinned-main-head-to-head-primary',phase:'user-requested-status-evaluation',sourceRef:reference.sourceRef,candidateRef:plan.candidateRef,mainRef:plan.mainRef,
 start:154000,count:40,planSHA256:storeHash(readFileSync(planPath)),settings:reference.settings,candidateOptions:reference.candidateOptions,optionsSHA256:reference.optionsSHA256,
 sources:reference.sources,mainSources:reference.mainSources,workerOrigins:origins,design:plan.design,humanMatches:0,skillValuesChanged:false};
const key=r=>[r.fixture.mode,r.fixture.seed,r.fixture.count,r.fixture.reversed,r.fixture.currentSide].join('/'),fingerprint=storeHash(JSON.stringify(meta));
const store=new CooperativeStore({out,meta,fingerprint,expectedCount:100,key,project:s=>s.records});
let fresh=0;try{
 for(let i=0;i<store.records.length;i++)deepStrictEqual(store.records[i],records[i]);
 for(const row of records.slice(store.records.length)){store.append(row);fresh++;}
 store.checkpoint({...meta,fingerprint,executions:store.records.length,complete:store.records.length===100,records:store.records});
 console.log(JSON.stringify({copiedExistingRecords:fresh,newResearchExecutions:0,executions:store.records.length,complete:store.records.length===100}));
}finally{store.close();}
