import {readFileSync,readdirSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {strictEqual} from 'node:assert';
import {CooperativeStore,storeHash} from './cooperative-store.js';
import {DEFAULT_SETTINGS} from './league-runner.js';
import {FAILURE_OPTIONS,FAILURE_VARIANTS} from './failure-development.js';
import {playFailureSelfplay} from './failure-selfplay.js';
import type {ModeId} from '../src/types.js';
const [out,sourceRef,startArg='153000',countArg='40',batchArg='48',stopAtText]=process.argv.slice(2),start=Number(startArg),count=Number(countArg),batch=Number(batchArg);
if(!out||!sourceRef||!/^[a-f0-9]{40}$/.test(sourceRef)||![start,count,batch].every(Number.isSafeInteger)||count<1||count%5||batch<1||batch%3)throw Error('finite failure-faction evaluation arguments');
const stopAt=stopAtText===undefined?null:Date.parse(stopAtText);
if(stopAt!==null&&!Number.isFinite(stopAt))throw Error('invalid stopAt timestamp');
const root=fileURLToPath(new URL('../',import.meta.url)),repo=resolve(root,'../..');
strictEqual(execFileSync('git',['rev-parse','HEAD'],{cwd:repo}).toString().trim(),sourceRef);
const sourceHashes:Record<string,string>={};
const walk=(dir:string,prefix:string)=>{for(const e of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){if(e.isDirectory())walk(resolve(dir,e.name),prefix+e.name+'/');else if(e.name.endsWith('.ts'))sourceHashes[prefix+e.name]=storeHash(readFileSync(resolve(dir,e.name)));}};walk(resolve(root,'src'),'src/');
for(const p of ['failure-development.ts','failure-selfplay.ts','failure-selfplay-run.ts','sender-development.ts','sender-arbitration-witness.ts','cooperative-store.ts','league-runner.ts','baselines/pre-cooperative.ts','claim-opponents.ts'])sourceHashes['scripts/'+p]=storeHash(readFileSync(resolve(root,'scripts',p)));
const verificationHashes=Object.fromEntries(['tools/verify-failure-development.py','tools/verify-failure-selfplay.py','tools/test-failure-selfplay.py'].map(p=>[p,storeHash(readFileSync(resolve(repo,p)))]));
for(const [p,h] of Object.entries(sourceHashes))strictEqual(h,storeHash(execFileSync('git',['show',sourceRef+':packages/rules/'+p],{cwd:repo})));
for(const [p,h] of Object.entries(verificationHashes))strictEqual(h,storeHash(execFileSync('git',['show',sourceRef+':'+p],{cwd:repo})));
const meta={format:1,kind:'own-failure-faction-identical-policy',phase:'balance-development',sourceRef,start,count,stopAt:stopAtText??null,variants:FAILURE_VARIANTS,options:FAILURE_OPTIONS,optionsSHA256:storeHash(JSON.stringify(FAILURE_OPTIONS)),settings:DEFAULT_SETTINGS,sourceHashes,verificationHashes,design:{unit:'seed',fixedOpponent:false,identicalPolicySelfplay:true,playerCount:'8+(seed-start)%5',balancedPlayerCounts:true,orders:2,currentSide:1,controllerRelabelIsDuplicate:true,skillValuesChanged:false,promotionEvidence:false}};
type Row=ReturnType<typeof playFailureSelfplay>;const key=(r:Row)=>[r.fixture.mode,r.fixture.seed,r.fixture.reversed,r.variant].join('/');
const expected=count*24;mkdirSync(dirname(out),{recursive:true});
const store=new CooperativeStore<Row>({out,meta,fingerprint:storeHash(JSON.stringify(meta)),expectedCount:expected,key,project:s=>s.records}),seen=new Set(store.records.map(key));let fresh=0;
const save=()=>store.checkpoint({...meta,fingerprint:storeHash(JSON.stringify(meta)),executions:store.records.length,complete:store.records.length===expected,records:store.records});
try{
 outer:for(const mode of ['civil_war','primordial','lidellut','troll'] as ModeId[])for(let i=0;i<count;i++)for(const reversed of [false,true])for(const variant of FAILURE_VARIANTS){
  const f={mode,seed:start+i,count:8+i%5,reversed,currentSide:1 as const};
  const k=[mode,f.seed,f.reversed,variant].join('/');if(seen.has(k))continue;
  if(stopAt!==null&&Date.now()>=stopAt)break outer;
  store.append(playFailureSelfplay(f,variant));seen.add(k);fresh++;if(fresh%12===0)save();if(fresh>=batch)break outer;
 }
 save();console.log(JSON.stringify({fresh,total:store.records.length,expected,complete:store.records.length===expected,deadlineReached:stopAt!==null&&Date.now()>=stopAt}));
}finally{store.close();}
