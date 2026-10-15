// 사전 예약한 하나의 개발 후보와 기준 정책만 비교한다. 저널 복구는 완료 경기를 건너뛴다.
import {readFileSync,writeFileSync,appendFileSync,existsSync,mkdirSync,readdirSync,openSync,fsyncSync,closeSync,renameSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname} from 'node:path';
import type {ModeId} from '../src/types.js';
import {fixtures,DEFAULT_SETTINGS} from './league-runner.js';
import {playCommitmentMatch,type CommitmentVariant} from './cooperative-commitment-match.js';
import type {ClaimStyle} from './claim-opponents.js';
const count=Number(process.argv[2]??8),start=Number(process.argv[3]??130000),out=process.argv[4]??'../../docs/evaluations/cooperation-round-016-development.json',batch=Number(process.argv[5]??96),phase=process.argv[6]??'development';
if(!Number.isSafeInteger(count)||count<1||!Number.isSafeInteger(start)||!Number.isSafeInteger(batch)||batch<0||batch%3||!['development','holdout'].includes(phase))throw Error('시드/배치/단계 오류');
const candidate=process.argv[7]??'commitment';if(!['commitment','idleClaimMana','forecastAttackBudget','deadAllyReport'].includes(candidate))throw Error('고정 후보 이름 오류');
const candidateOptions=candidate==='commitment'?{claimTurnCommitment:true}:candidate==='idleClaimMana'?{idleClaimMana:true}:candidate==='deadAllyReport'?{verifyDeadAllyReports:true}:{forecastAttackBudget:true};
const hash=(x:string|Buffer)=>createHash('sha256').update(x).digest('hex'),sourceHashes:Record<string,string>={},src=new URL('../src/',import.meta.url);
const walk=(dir:URL,prefix='')=>{for(const e of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const p=prefix+e.name;if(e.isDirectory())walk(new URL(e.name+'/',dir),p+'/');else if(e.name.endsWith('.ts'))sourceHashes['src/'+p]=hash(readFileSync(new URL(e.name,dir)));}};walk(src);
for(const p of ['cooperative-claim-commitment.ts','cooperative-commitment-match.ts','league-runner.ts','baselines/pre-cooperative.ts','claim-opponents.ts'])sourceHashes['scripts/'+p]=hash(readFileSync(new URL(p,import.meta.url)));
const auxiliarySourceHashes={'tools/verify-claim-commitment.py':hash(readFileSync(new URL('../../../tools/verify-claim-commitment.py',import.meta.url)))};
const variants:CommitmentVariant[]=['baseline','control',candidate as CommitmentVariant];
const meta={format:1,kind:candidate==='commitment'?'claim-turn-commitment-comparison':candidate==='idleClaimMana'?'idle-manual-true-claim-mana-comparison':candidate==='deadAllyReport'?'dead-ally-report-verification-comparison':'forecast-attack-budget-comparison',phase,count,start,settings:DEFAULT_SETTINGS,variants,
  options:{baseline:{},control:{},[candidate]:candidateOptions},sourceHashes,auxiliarySourceHashes,
  design:{unit:'seed',development:'candidate>control AND candidate>=baseline AND safety=0',holdout:'overall_vs_baseline_seed95Lower>0 AND each_mode_difference>=-0.02 AND safety=0',
    limitations:['개발 결과로 승격하지 않는다.','턴 마나는 상한 전 원시 값이다. 공표 보상은 실제 자기 마나 전후 차이를 따로 기록한다.','대기 때 추가 행동이나 유지 중 행동의 횟수는 승패 개선을 대체하지 않는다.']}};
const fingerprint=hash(JSON.stringify(meta)),journal=out.replace(/\.json$/,'')+'.journal.ndjson';mkdirSync(dirname(out),{recursive:true});
type Result=ReturnType<typeof playCommitmentMatch>;type GameRecord={mode:ModeId;style:ClaimStyle;variant:CommitmentVariant;result:Result};
const records:GameRecord[]=[],seen=new Set<string>();let fresh=0;
const key=(x:GameRecord)=>{const f=x.result.game.fixture;return `${x.mode}/${x.style}/${f.seed}/${f.reversed}/${f.currentSide}/${x.variant}`;};
if(existsSync(journal)){
  const lines=readFileSync(journal,'utf8').trimEnd().split('\n'),h=JSON.parse(lines.shift()!);if(h.fingerprint!==fingerprint)throw Error('저널의 고정 소스/설계가 다름');
  for(const line of lines){const x:GameRecord=JSON.parse(line);if(seen.has(key(x)))throw Error('저널 중복 경기');records.push(x);seen.add(key(x));}
}else{if(existsSync(out))throw Error('저널 없는 스냅샷');appendFileSync(journal,JSON.stringify({type:'header',fingerprint,meta})+'\n');}
const target=count*4*3*4*3,save=(complete:boolean)=>{
  const j=openSync(journal,'r+');try{fsyncSync(j);}finally{closeSync(j);}
  const tmp=out+'.tmp',fd=openSync(tmp,'w');
  try{writeFileSync(fd,JSON.stringify({...meta,fingerprint,complete,executions:records.length,journalSha256:hash(readFileSync(journal)),records},null,2));fsyncSync(fd);}finally{closeSync(fd);}
  renameSync(tmp,out);const directory=openSync(dirname(out),'r');try{fsyncSync(directory);}finally{closeSync(directory);}
};
for(const mode of ['civil_war','primordial','lidellut','troll'] as ModeId[])for(const style of ['truthful','bluff','skill-aware-bluff'] as ClaimStyle[]){
  for(let i=0;i<count;i++)for(const f of fixtures(mode,start+i,8+i%5))for(const variant of variants){
    const k=`${mode}/${style}/${f.seed}/${f.reversed}/${f.currentSide}/${variant}`;if(seen.has(k))continue;
    const x={mode,style,variant,result:playCommitmentMatch(f,style,variant)};appendFileSync(journal,JSON.stringify(x)+'\n');records.push(x);seen.add(k);fresh++;
    if(fresh%12===0)save(false);
    if(batch&&fresh>=batch&&records.length<target){save(false);process.stderr.write(`[commitment] 신규${fresh}/누적${records.length}, 체크포인트\n`);process.exit(0);}
  }
}
if(records.length!==target)throw Error('전체 경기 수 불일치');save(true);process.stderr.write(`[commitment] 전체${records.length}, 이번호출 신규${fresh}\n`);
