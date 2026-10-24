import {CooperativeStore} from './cooperative-store.js';
import {readFileSync,mkdirSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname} from 'node:path';
import type {ModeId} from '../src/types.js';
import {fixtures,DEFAULT_SETTINGS} from './league-runner.js';
import {playAllyIntervention} from './cooperative-ally-intervention.js';
import {diagnosticHash} from './cooperative-claim-intervention.js';
import type {ClaimStyle} from './claim-opponents.js';
const count=Number(process.argv[2]??64),start=Number(process.argv[3]??133000),out=process.argv[4]??'../../docs/evaluations/cooperation-round-019-ally-pairs.json',batch=Number(process.argv[5]??96);
if(!Number.isSafeInteger(count)||count<1||!Number.isSafeInteger(start)||!Number.isSafeInteger(batch)||batch<0||batch%2)throw Error('시드/배치 조건 오류');
const hash=(b:string|Buffer)=>createHash('sha256').update(b).digest('hex'),sourceHashes:Record<string,string>={};
const walk=(dir:URL,prefix='')=>{for(const e of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const p=prefix+e.name;if(e.isDirectory())walk(new URL(e.name+'/',dir),p+'/');else if(e.name.endsWith('.ts'))sourceHashes['src/'+p]=hash(readFileSync(new URL(e.name,dir)));}};walk(new URL('../src/',import.meta.url));
for(const p of ['cooperative-ally-pairs.ts','cooperative-ally-intervention.ts','cooperative-claim-intervention.ts','cooperative-store.ts','league-runner.ts','baselines/pre-cooperative.ts','claim-opponents.ts'])sourceHashes['scripts/'+p]=hash(readFileSync(new URL(p,import.meta.url)));
const auxiliarySourceHashes:Record<string,string>={};for(const p of ['verify-ally-pairs.py','learn-ally-delay.py'])auxiliarySourceHashes['tools/'+p]=hash(readFileSync(new URL('../../../tools/'+p,import.meta.url)));
const meta={format:1,persistence:{version:2},kind:'first-low-mana-confirmed-ally-single-delay',phase:'training-diagnostic',start,count,settings:DEFAULT_SETTINGS,selectedPublicPlayer:'p1',sourceHashes,auxiliarySourceHashes,
  learning:{features:['knownEnemy','afterManaLessThan20'],cells:4,minPairs:48,minSeeds:16,bootstrapSamples:10000,bootstrapSeed:0x475354,selection:'seed99LowerPositive'},
  limitations:['한 번의 지연이며 모든 봇에 적용한 정책이 아니다.','공격/보고/동맹과 미래 생존의 모든 실제 비용을 포함한다.','명목10마나 절약이나 보너스/완성률만으로 승격하지 않는다.','새 개발 진단이며 독립 승격 자료가 아니다.']};
const fingerprint=diagnosticHash(meta);mkdirSync(dirname(out),{recursive:true});
type Result=ReturnType<typeof playAllyIntervention>;type Pair={fixture:ReturnType<typeof fixtures>[number];control?:Result;delay?:Result};type Row={mode:ModeId;style:ClaimStyle;pairs:Pair[]};
const rows:Row[]=[],byKey=new Map<string,Pair>();let executions=0,fresh=0;
const getPair=(mode:ModeId,style:ClaimStyle,f:Pair['fixture'])=>{const key=`${mode}/${style}/${f.seed}/${f.reversed}/${f.currentSide}`;let p=byKey.get(key);if(p)return p;
  let row=rows.find(r=>r.mode===mode&&r.style===style);if(!row){row={mode,style,pairs:[]};rows.push(row);}p={fixture:f};row.pairs.push(p);byKey.set(key,p);return p;};
type GameRecord={type:'game';mode:ModeId;style:ClaimStyle;variant:'control'|'delay';result:Result};
const recordKey=(x:GameRecord)=>{const f=x.result.game.fixture;return `${x.mode}/${x.style}/${f.seed}/${f.reversed}/${f.currentSide}/${x.variant}`;};
const project=(s:{rows:Row[]}):GameRecord[]=>s.rows.flatMap(row=>row.pairs.flatMap(pair=>(["control", "delay"] as const).flatMap(variant=>pair[variant]?[{type:'game' as const,mode:row.mode,style:row.style,variant,result:pair[variant]!}]:[])));
const store=new CooperativeStore<GameRecord>({out,meta,fingerprint,expectedCount:count*4*3*4*2,key:recordKey,project});
for(const x of store.records){const p=getPair(x.mode,x.style,x.result.game.fixture);if(p[x.variant])throw Error('중복 경기');p[x.variant]=x.result;executions++;}
const save=(complete:boolean)=>store.checkpoint({...meta,fingerprint,complete,executions,rows});
for(const mode of ['civil_war','primordial','lidellut','troll'] as ModeId[])for(const style of ['truthful','bluff','skill-aware-bluff'] as ClaimStyle[])for(let i=0;i<count;i++)for(const f of fixtures(mode,start+i,8+i%5)){
  const pair=getPair(mode,style,f),beforeExecutions=executions;
  for(const v of ['control','delay'] as const)if(!pair[v]){const result=playAllyIntervention(f,style,v==='delay');store.append({type:'game',mode,style,variant:v,result});pair[v]=result;executions++;fresh++;}
  const a=pair.control!,b=pair.delay!;if(Boolean(a.point)!==Boolean(b.point))throw Error('개입 유무 불일치');
  if(a.point&&b.point){for(const k of ['at','player','cell','stateHash','memoryHash','viewHash','before','original'] as const)if(diagnosticHash(a.point[k])!==diagnosticHash(b.point[k]))throw Error('개입 전 대응 불일치:'+k);}
  else if(JSON.stringify(a)!==JSON.stringify(b))throw Error('비개입 쌍 불일치');
  if(executions!==beforeExecutions&&executions%8===0)save(false);
  if(batch&&fresh>=batch&&executions<count*4*3*4*2){save(false);store.close();process.stderr.write(`[ally-pairs] 신규${fresh}/누적${executions}, 부분 체크포인트\n`);process.exit(0);}
}
if(executions!==count*4*3*4*2)throw Error('실행 수 불일치');save(true);process.stderr.write(`[ally-pairs] 전체${executions}, 신규${fresh}\n`);

store.close();
