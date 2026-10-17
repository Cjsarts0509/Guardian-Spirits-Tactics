import {readFileSync,readdirSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {CooperativeStore} from './cooperative-store.js';
import {DEFAULT_SETTINGS} from './league-runner.js';
import {playGuardSelfplay,GUARD_VARIANTS} from './guard-selfplay.js';
const count=Number(process.argv[2]),start=Number(process.argv[3]),out=process.argv[4],batch=Number(process.argv[5]??40);
if(!out||!Number.isSafeInteger(count)||count<1||!Number.isSafeInteger(start)||start<0||!Number.isSafeInteger(batch)||batch<1)throw Error('invalid finite selfplay arguments');
const hash=(x:string|Buffer)=>createHash('sha256').update(x).digest('hex'),sourceHashes:Record<string,string>={};
const walk=(dir:URL,prefix='')=>{for(const e of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const p=prefix+e.name;if(e.isDirectory())walk(new URL(e.name+'/',dir),p+'/');else if(e.name.endsWith('.ts'))sourceHashes['src/'+p]=hash(readFileSync(new URL(e.name,dir)));}};walk(new URL('../src/',import.meta.url));
for(const p of ['guard-selfplay.ts','guard-selfplay-run.ts','cooperative-commitment-match.ts','league-runner.ts','cooperative-store.ts','claim-opponents.ts','baselines/pre-cooperative.ts','baselines/pre-round024.ts'])sourceHashes['scripts/'+p]=hash(readFileSync(new URL(p,import.meta.url)));
const auxiliarySourceHashes=Object.fromEntries(['tools/verify-guard-selfplay.py','tools/run-guard-selfplay.py'].map(p=>[p,hash(readFileSync(p))]));
const options={cooperative:{},knownCommanderGuardBeforeAlly:{knownCommanderGuardBeforeAlly:true}};
const meta={format:1,kind:'identical-guard-policy-primordial',count,start,settings:DEFAULT_SETTINGS,variants:GUARD_VARIANTS,options,optionsSHA256:hash(JSON.stringify(options)),sourceHashes,auxiliarySourceHashes,
 design:{unit:'seed',orders:2,currentSide:1,policiesIdenticalOnBothTeams:true,skillValuesChanged:false,exploratory:true,holdout:false,playerCount:'8+(seed-start)%5'}};
const fingerprint=hash(JSON.stringify(meta));type SelfplayRecord=ReturnType<typeof playGuardSelfplay>;
const key=(r:SelfplayRecord)=>[r.variant,r.result.game.fixture.seed,r.result.game.fixture.reversed].join('/');
const expectedCount=count*4;mkdirSync(dirname(out),{recursive:true});
const store=new CooperativeStore<SelfplayRecord>({out,meta,fingerprint,expectedCount,key,project:s=>s.records});let fresh=0;
const seen=new Set(store.records.map(key));
const save=(complete:boolean)=>store.checkpoint({...meta,fingerprint,complete,executions:store.records.length,records:store.records});
for(let i=0;i<count;i++)for(const reversed of [false,true])for(const variant of GUARD_VARIANTS){
 const fixture={mode:'primordial' as const,seed:start+i,count:8+i%5,reversed,currentSide:1 as const};
 const k=[variant,fixture.seed,reversed].join('/');if(seen.has(k))continue;
 store.append(playGuardSelfplay(fixture,variant));seen.add(k);fresh++;if(fresh%4===0)save(false);
 if(fresh>=batch&&store.records.length<expectedCount){save(false);store.close();console.log(JSON.stringify({fresh,total:store.records.length,complete:false}));process.exit(0);}
}
if(store.records.length!==expectedCount)throw Error('incomplete selfplay sample');save(true);store.close();console.log(JSON.stringify({fresh,total:store.records.length,complete:true}));
