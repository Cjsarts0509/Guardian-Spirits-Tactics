import {CooperativeStore} from './cooperative-store.js';
import {readFileSync,readdirSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname} from 'node:path';
import type {ModeId} from '../src/types.js';
import type {ClaimStyle} from './claim-opponents.js';
import {fixtures,DEFAULT_SETTINGS} from './league-runner.js';
import {playCheckSingle} from './cooperative-check-single.js';
const count=Number(process.argv[2]??32),start=Number(process.argv[3]??142000),out=process.argv[4]??'/tmp/check-pairs.json',batch=Number(process.argv[5]??96);
if(!Number.isSafeInteger(count)||count<1||!Number.isSafeInteger(start)||!Number.isSafeInteger(batch)||batch<0||batch%2)throw Error('시드/배치 오류');
const hash=(b:string|Buffer)=>createHash('sha256').update(b).digest('hex'),sourceHashes:Record<string,string>={};
const walk=(dir:URL,prefix='')=>{for(const e of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const p=prefix+e.name;if(e.isDirectory())walk(new URL(e.name+'/',dir),p+'/');else if(e.name.endsWith('.ts'))sourceHashes['src/'+p]=hash(readFileSync(new URL(e.name,dir)));}};walk(new URL('../src/',import.meta.url));
for(const p of ['cooperative-check-pairs.ts','cooperative-check-single.ts','cooperative-claim-intervention.ts','cooperative-store.ts','league-runner.ts','baselines/pre-cooperative.ts','claim-opponents.ts'])sourceHashes['scripts/'+p]=hash(readFileSync(new URL(p,import.meta.url)));
const auxiliarySourceHashes=Object.fromEntries(['verify-check-pairs.py','run-cooperative-generations.py'].map(p=>['tools/'+p,hash(readFileSync(new URL('../../../tools/'+p,import.meta.url)))]));
const meta={format:1,persistence:{version:2},kind:'public-p1-first-private-check-single-attack',phase:'development',selectedPublicPlayer:'p1',count,start,settings:DEFAULT_SETTINGS,variants:['control','single'],sourceHashes,auxiliarySourceHashes,
 design:{singleExtraSkill:true,preserveOriginalRng:true,noExtraChat:true,selection:'global_seed99LowerPositive',minInterventions:96,minSeeds:16,bootstrapSamples:10000,bootstrapSeed:0x475354,policySelection:false}};
const fingerprint=hash(JSON.stringify(meta));mkdirSync(dirname(out),{recursive:true});
type GameRecord={mode:ModeId;style:ClaimStyle;variant:'control'|'single';result:ReturnType<typeof playCheckSingle>};const records:GameRecord[]=[],seen=new Set<string>();let fresh=0;
const key=(r:GameRecord)=>{const f=r.result.game.fixture;return `${r.mode}/${r.style}/${f.seed}/${f.reversed}/${f.currentSide}/${r.variant}`;};
const store=new CooperativeStore<GameRecord>({out,meta,fingerprint,expectedCount:count*96,key,project:s=>s.records});
for(const r of store.records){records.push(r);seen.add(key(r));}
const save=(complete:boolean)=>store.checkpoint({...meta,fingerprint,complete,executions:records.length,records});
for(const mode of ['civil_war','primordial','lidellut','troll'] as ModeId[])for(const style of ['truthful','bluff','skill-aware-bluff'] as ClaimStyle[])for(let i=0;i<count;i++)for(const f of fixtures(mode,start+i,8+i%5))for(const variant of ['control','single'] as const){
 const k=`${mode}/${style}/${f.seed}/${f.reversed}/${f.currentSide}/${variant}`;if(seen.has(k))continue;
 const r={mode,style,variant,result:playCheckSingle(f,style,variant==='single')};store.append(r);records.push(r);seen.add(k);fresh++;
 if(fresh%12===0)save(false);
 if(batch&&fresh>=batch&&records.length<count*96){save(false);store.close();process.stderr.write(`[check-pairs] 신규${fresh}/누적${records.length}, 체크포인트\n`);process.exit(0);}
}
if(records.length!==count*96)throw Error('실행 수 오류');save(true);store.close();process.stderr.write(`[check-pairs] 전체${records.length}, 신규${fresh}\n`);
