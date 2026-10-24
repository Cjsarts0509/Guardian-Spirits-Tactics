import {readFileSync,readdirSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {CooperativeStore} from './cooperative-store.js';
import {DEFAULT_SETTINGS} from './league-runner.js';
import {playSelfplay,SELFPLAY_MODES,type SelfplayVariant} from './selfplay-balance.js';
const count=Number(process.argv[2]),start=Number(process.argv[3]),out=process.argv[4],batch=Number(process.argv[5]??48);
if(!out||!Number.isSafeInteger(count)||count<1||!Number.isSafeInteger(start)||start<0||!Number.isSafeInteger(batch)||batch<0)throw Error('invalid selfplay arguments');
const hash=(x:string|Buffer)=>createHash('sha256').update(x).digest('hex'),sourceHashes:Record<string,string>={};
const walk=(dir:URL,prefix='')=>{for(const e of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const p=prefix+e.name;if(e.isDirectory())walk(new URL(e.name+'/',dir),p+'/');else if(e.name.endsWith('.ts'))sourceHashes['src/'+p]=hash(readFileSync(new URL(e.name,dir)));}};walk(new URL('../src/',import.meta.url));
for(const p of ['selfplay-balance.ts','selfplay-balance-run.ts','league-runner.ts','cooperative-store.ts','baselines/pre-cooperative.ts'])sourceHashes['scripts/'+p]=hash(readFileSync(new URL(p,import.meta.url)));
const variants:SelfplayVariant[]=['main','cooperative','ownOutcome'];
const meta={format:1,kind:'identical-policy-faction-balance',count,start,settings:DEFAULT_SETTINGS,variants,sourceHashes,
 design:{unit:'seed',orders:2,currentSide:1,policiesIdenticalOnBothTeams:true,side2ControllerRelabelIsDuplicate:true,skillValuesChanged:false,exploratory:true,holdout:false,scope:'Compare faction outcomes within each identical policy; never treat total same-policy 50% as strength evidence.'}};
const fingerprint=hash(JSON.stringify(meta));type SelfplayRecord=ReturnType<typeof playSelfplay>;
const key=(r:SelfplayRecord)=>[r.variant,r.game.fixture.mode,r.game.fixture.seed,r.game.fixture.reversed].join('/');
const expectedCount=count*4*2*variants.length;mkdirSync(dirname(out),{recursive:true});
const store=new CooperativeStore<SelfplayRecord>({out,meta,fingerprint,expectedCount,key,project:s=>s.records});let fresh=0;
const seen=new Set(store.records.map(key));
const save=(complete:boolean)=>store.checkpoint({...meta,fingerprint,complete,executions:store.records.length,records:store.records});
for(const mode of SELFPLAY_MODES)for(let i=0;i<count;i++)for(const reversed of [false,true])for(const variant of variants){
 const fixture={mode,seed:start+i,count:8+i%5,reversed,currentSide:1 as const};
 const k=[variant,mode,fixture.seed,reversed].join('/');if(seen.has(k))continue;
 store.append(playSelfplay(fixture,variant));seen.add(k);fresh++;if(fresh%6===0)save(false);
 if(batch&&fresh>=batch&&store.records.length<expectedCount){save(false);store.close();console.log(JSON.stringify({fresh,total:store.records.length,complete:false}));process.exit(0);}
}
if(store.records.length!==expectedCount)throw Error('incomplete selfplay sample');save(true);store.close();console.log(JSON.stringify({fresh,total:store.records.length,complete:true}));
