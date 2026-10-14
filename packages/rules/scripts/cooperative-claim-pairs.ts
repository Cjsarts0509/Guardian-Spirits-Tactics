// 새 학습/개발 진단. 고정 공개ID의 자기 정책 제안 한 번만 바꾸고 실제 대응 경기를 실행한다.
import {readFileSync,writeFileSync,appendFileSync,existsSync,mkdirSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname} from 'node:path';
import type {ModeId} from '../src/types.js';
import {fixtures,DEFAULT_SETTINGS} from './league-runner.js';
import {playClaimIntervention,diagnosticHash} from './cooperative-claim-intervention.js';
import type {ClaimStyle} from './claim-opponents.js';

const count=Number(process.argv[2]??32),start=Number(process.argv[3]??128000),out=process.argv[4]??'../../docs/evaluations/cooperation-round-015-claim-pairs.json';
if(!Number.isSafeInteger(count)||count<1||!Number.isSafeInteger(start))throw Error('시드 조건 오류');
const batchLimit=Number(process.argv[5]??0);
if(!Number.isSafeInteger(batchLimit)||batchLimit<0||batchLimit%2!==0)throw Error('배치 실행 수는0 또는 양의 짝수');
const hash=(data:string|Buffer)=>createHash('sha256').update(data).digest('hex');
const sourceHashes:Record<string,string>={},src=new URL('../src/',import.meta.url);
const walk=(dir:URL,prefix='')=>{for(const e of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const p=prefix+e.name;if(e.isDirectory())walk(new URL(e.name+'/',dir),p+'/');else if(e.name.endsWith('.ts'))sourceHashes['src/'+p]=hash(readFileSync(new URL(e.name,dir)));}};
walk(src);
for(const p of ['cooperative-claim-pairs.ts','cooperative-claim-intervention.ts','league-runner.ts','baselines/pre-cooperative.ts','claim-opponents.ts'])sourceHashes['scripts/'+p]=hash(readFileSync(new URL(p,import.meta.url)));
const auxiliarySourceHashes:Record<string,string>={};
for(const p of ['learn-claim-intervention.py','verify-claim-pairs.py'])auxiliarySourceHashes['tools/'+p]=hash(readFileSync(new URL('../../../tools/'+p,import.meta.url)));
const meta={format:1,kind:'first-false-claim-single-intervention',phase:'training-diagnostic',start,count,settings:DEFAULT_SETTINGS,
  selectedPublicPlayer:'p1',sourceHashes,auxiliarySourceHashes,
  learning:{features:['commander','unfinishedGem','nearTurn43s'],cells:8,minPairs:24,minSeeds:8,bootstrapSamples:10000,bootstrapSeed:0x475354,selection:'seed95LowerPositive'},
  limitations:['한 번 강제 개입의 효과이며 모든 봇에 적용한 정책의 성능이 아니다.','진명 유지/생존/미래 마나는 보장하지 않는다.','턴 보너스 원시 합계는150마나 상한 전 값이다.','개발/진단/학습 자료이며 독립 승격 결과가 아니다.']};
const fingerprint=diagnosticHash(meta),journal=out.replace(/\.json$/,'')+'.journal.ndjson';mkdirSync(dirname(out),{recursive:true});
type Result=ReturnType<typeof playClaimIntervention>;
type Pair={fixture:ReturnType<typeof fixtures>[number];control?:Result;truthful?:Result};
type Row={mode:ModeId;style:ClaimStyle;pairs:Pair[]};
const rows:Row[]=[],byKey=new Map<string,Pair>();let executions=0,newExecutions=0;
const key=(mode:string,style:string,f:Pair['fixture'])=>`${mode}/${style}/${f.seed}/${f.reversed}/${f.currentSide}`;
const getPair=(mode:ModeId,style:ClaimStyle,f:Pair['fixture'])=>{
  const k=key(mode,style,f);let pair=byKey.get(k);if(pair)return pair;
  let row=rows.find(r=>r.mode===mode&&r.style===style);if(!row){row={mode,style,pairs:[]};rows.push(row);}
  pair={fixture:f};row.pairs.push(pair);byKey.set(k,pair);return pair;
};
if(existsSync(journal)){
  const lines=readFileSync(journal,'utf8').trimEnd().split('\n'),header=JSON.parse(lines.shift()!);
  if(header.type!=='header'||header.fingerprint!==fingerprint)throw Error('복구 저널의 소스/설계가 현재와 다름');
  for(const line of lines){const x=JSON.parse(line);if(x.type!=='game'||!['control','truthful'].includes(x.variant))throw Error('저널 형식 오류');
    const pair=getPair(x.mode,x.style,x.result.game.fixture),variant=x.variant as 'control'|'truthful';
    if(pair[variant])throw Error('저널에 중복 실행 있음');pair[variant]=x.result;executions++;
  }
}else{if(existsSync(out))throw Error('스냅샷은 있지만 복구 저널이 없음');appendFileSync(journal,JSON.stringify({type:'header',fingerprint,meta})+'\n');}
const save=(complete:boolean)=>writeFileSync(out,JSON.stringify({...meta,fingerprint,complete,executions,journalSha256:hash(readFileSync(journal)),rows},null,2));
for(const mode of ['civil_war','primordial','lidellut','troll'] as ModeId[])for(const style of ['truthful','bluff','skill-aware-bluff'] as ClaimStyle[]){
  for(let i=0;i<count;i++)for(const f of fixtures(mode,start+i,8+i%5)){
    const pair=getPair(mode,style,f);
    for(const variant of ['control','truthful'] as const)if(!pair[variant]){
      const result=playClaimIntervention(f,style,variant==='truthful');
      appendFileSync(journal,JSON.stringify({type:'game',mode,style,variant,result})+'\n');pair[variant]=result;executions++;newExecutions++;
    }
    const a=pair.control!,b=pair.truthful!;
    if(Boolean(a.point)!==Boolean(b.point))throw Error('대응 개입 유무 불일치');
    if(a.point&&b.point){for(const k of ['at','player','cell','stateHash','memoryHash','viewHash'] as const)if(a.point[k]!==b.point[k])throw Error('개입 전 대응 불일치: '+k);
      if(JSON.stringify(a.point.before)!==JSON.stringify(b.point.before)||JSON.stringify(a.point.original)!==JSON.stringify(b.point.original))throw Error('개입 전 제안/뷰 불일치');
    }else if(JSON.stringify(a)!==JSON.stringify(b))throw Error('비개입 경기 결과/진단 불일치');
    if(executions%8===0)save(false);
    if(batchLimit&&newExecutions>=batchLimit&&executions<count*4*3*4*2){save(false);process.stderr.write(`[claim-pairs] 체크포인트 신규${newExecutions}/누적${executions}, 다음 호출에서 저널 복구\n`);process.exit(0);}
  }
  save(false);process.stderr.write(`[claim-pairs] ${mode}/${style}: 저장확인 누적${executions}, 이번호출 신규${newExecutions}\n`);
}
if(executions!==count*4*3*4*2)throw Error('전체 실행 수 불일치');save(true);
