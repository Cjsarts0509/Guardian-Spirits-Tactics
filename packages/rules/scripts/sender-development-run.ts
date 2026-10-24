import {readFileSync,readdirSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {strictEqual} from 'node:assert';
import {CooperativeStore,storeHash} from './cooperative-store.js';
import {fixtures,DEFAULT_SETTINGS} from './league-runner.js';
import {playSenderDevelopment,SENDER_OPTIONS,SENDER_VARIANTS,senderPublicRules} from './sender-development.js';
import type {ClaimStyle} from './claim-opponents.js';
import type {ModeId} from '../src/types.js';
const [out,sourceRef,startArg='152000',countArg='8',batchArg='96']=process.argv.slice(2),start=Number(startArg),count=Number(countArg),batch=Number(batchArg);
if(!out||!sourceRef||!/^[a-f0-9]{40}$/.test(sourceRef)||![start,count,batch].every(Number.isSafeInteger)||count<1||batch<1||batch%3)throw Error('finite sender evaluation arguments');
const root=fileURLToPath(new URL('../',import.meta.url)),repo=resolve(root,'../..');
strictEqual(execFileSync('git',['rev-parse','HEAD'],{cwd:repo}).toString().trim(),sourceRef);
const sourceHashes:Record<string,string>={};
const walk=(dir:string,prefix:string)=>{for(const e of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){if(e.isDirectory())walk(resolve(dir,e.name),prefix+e.name+'/');else if(e.name.endsWith('.ts'))sourceHashes[prefix+e.name]=storeHash(readFileSync(resolve(dir,e.name)));}};walk(resolve(root,'src'),'src/');
for(const p of ['sender-development.ts','sender-development-run.ts','sender-arbitration-witness.ts','cooperative-store.ts','league-runner.ts','baselines/pre-cooperative.ts','claim-opponents.ts'])sourceHashes['scripts/'+p]=storeHash(readFileSync(resolve(root,'scripts',p)));
const verificationHashes=Object.fromEntries(['tools/verify-sender-development.py','tools/test-sender-development.py','tools/verify-own-share-witness.py'].map(p=>[p,storeHash(readFileSync(resolve(repo,p)))]));
for(const [p,h] of Object.entries(sourceHashes))strictEqual(h,storeHash(execFileSync('git',['show',sourceRef+':packages/rules/'+p],{cwd:repo})));
for(const [p,h] of Object.entries(verificationHashes))strictEqual(h,storeHash(execFileSync('git',['show',sourceRef+':'+p],{cwd:repo})));
const meta={format:1,kind:'commander-sender-development',phase:'development',sourceRef,start,count,variants:SENDER_VARIANTS,options:{baseline:{},control:{},candidate:SENDER_OPTIONS},optionsSHA256:storeHash(JSON.stringify({baseline:{},control:{},candidate:SENDER_OPTIONS})),candidateOptionsSHA256:storeHash(JSON.stringify(SENDER_OPTIONS)),settings:DEFAULT_SETTINGS,publicRules:senderPublicRules(),sourceHashes,verificationHashes,design:{unit:'seed',fixedOpponent:true,identicalPolicySelfplay:false,playerCount:'8+(seed-start)%5',skillValuesChanged:false,promotionEvidence:false}};
type Row=ReturnType<typeof playSenderDevelopment>;const key=(r:Row)=>[r.fixture.mode,r.style,r.fixture.seed,r.fixture.reversed,r.fixture.currentSide,r.variant].join('/');
const expected=count*144;mkdirSync(dirname(out),{recursive:true});
const store=new CooperativeStore<Row>({out,meta,fingerprint:storeHash(JSON.stringify(meta)),expectedCount:expected,key,project:s=>s.records}),seen=new Set(store.records.map(key));let fresh=0;
const save=()=>store.checkpoint({...meta,fingerprint:storeHash(JSON.stringify(meta)),executions:store.records.length,complete:store.records.length===expected,records:store.records});
try{
 outer:for(const mode of ['civil_war','primordial','lidellut','troll'] as ModeId[])for(const style of ['truthful','bluff','skill-aware-bluff'] as ClaimStyle[])for(let i=0;i<count;i++)for(const f of fixtures(mode,start+i,8+i%5))for(const variant of SENDER_VARIANTS){
  const k=[mode,style,f.seed,f.reversed,f.currentSide,variant].join('/');if(seen.has(k))continue;
  store.append(playSenderDevelopment(f,style,variant));seen.add(k);fresh++;if(fresh%12===0)save();if(fresh>=batch)break outer;
 }
 save();console.log(JSON.stringify({fresh,total:store.records.length,expected,complete:store.records.length===expected}));
}finally{store.close();}
