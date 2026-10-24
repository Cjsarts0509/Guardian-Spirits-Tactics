import {readFileSync,readdirSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {strictEqual} from 'node:assert';
import {CooperativeStore,storeHash} from './cooperative-store.js';
import {DEFAULT_SETTINGS} from './league-runner.js';
import {loadPinnedMain,playMainComparison,COMPARISON_OPTIONS} from './main-comparison.js';
const [out,sourceRef,mainDir,planPath,mode]=process.argv.slice(2);
if(!out||!sourceRef||!mainDir||!planPath||!mode)throw Error('out sourceRef mainDir plan mode required');
const root=fileURLToPath(new URL('../../..',import.meta.url));
strictEqual(execFileSync('git',['rev-parse','HEAD'],{cwd:root}).toString().trim(),sourceRef);
const plan=JSON.parse(readFileSync(planPath,'utf8')),selected=plan.fixtures.filter((f:any)=>f.mode===mode);
strictEqual(selected.length,25);strictEqual(plan.candidateRef,'f29949ba12b9a6929e9bb129a068081cdc58d53d');
const sources:Record<string,string>={},mainSources:Record<string,string>={};
const walk=(path:string,base:string,target:Record<string,string>,ref:string)=>{for(const e of readdirSync(path,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
 if(e.isDirectory())walk(resolve(path,e.name),base+'/'+e.name,target,ref);
 else if(e.name.endsWith('.ts')){const p=base+'/'+e.name,raw=readFileSync(resolve(path,e.name));strictEqual(storeHash(raw),storeHash(execFileSync('git',['show',ref+':'+p],{cwd:root})));target[p]=storeHash(raw);}
}};
walk(resolve(root,'packages/rules/src'),'packages/rules/src',sources,plan.candidateRef);
walk(resolve(mainDir,'packages/rules/src'),'packages/rules/src',mainSources,plan.mainRef);
for(const p of ['main-comparison.ts','main-comparison-run.ts','league-runner.ts','cooperative-store.ts','failure-development.ts','sender-development.ts']){
 const path='packages/rules/scripts/'+p,raw=readFileSync(resolve(root,path));strictEqual(storeHash(raw),storeHash(execFileSync('git',['show',sourceRef+':'+path],{cwd:root})));sources[path]=storeHash(raw);}
const meta={kind:'pinned-main-head-to-head',sourceRef,candidateRef:plan.candidateRef,mainRef:plan.mainRef,planSHA256:storeHash(readFileSync(planPath)),
 mode,settings:DEFAULT_SETTINGS,candidateOptions:COMPARISON_OPTIONS,optionsSHA256:storeHash(JSON.stringify(COMPARISON_OPTIONS)),sources,mainSources,fixtures:selected,
 newResearchExecutions:25,humanMatches:0,skillValuesChanged:false};
type Row=ReturnType<typeof playMainComparison>;const key=(r:Row)=>[r.fixture.mode,r.fixture.seed,r.fixture.count,r.fixture.reversed,r.fixture.currentSide].join('/');
mkdirSync(dirname(out),{recursive:true});const fingerprint=storeHash(JSON.stringify(meta));
const store=new CooperativeStore<Row>({out,meta,fingerprint,expectedCount:selected.length,key,project:s=>s.records});
const seen=new Set(store.records.map(key)),main=await loadPinnedMain(mainDir);let fresh=0;
const save=()=>store.checkpoint({...meta,fingerprint,executions:store.records.length,complete:store.records.length===selected.length,records:store.records});
try{for(const f of selected){if(seen.has(key({fixture:f} as Row)))continue;const row=playMainComparison(f,main);store.append(row);seen.add(key(row));fresh++;save();
 console.log(JSON.stringify({mode,completed:store.records.length,seed:f.seed,side:f.currentSide,reversed:f.reversed,winner:row.winnerPolicy,elapsedMs:row.elapsedMs}));}
 save();console.log(JSON.stringify({mode,fresh,total:store.records.length,complete:store.records.length===25}));}finally{store.close();}
