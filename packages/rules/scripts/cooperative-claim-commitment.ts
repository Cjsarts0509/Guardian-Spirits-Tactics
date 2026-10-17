import {CooperativeStore} from './cooperative-store.js';
// 사전 예약한 하나의 개발 후보와 기준 정책만 비교한다. 저널 복구는 완료 경기를 건너뛴다.
import {readFileSync,mkdirSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {dirname} from 'node:path';
import type {ModeId} from '../src/types.js';
import {fixtures,DEFAULT_SETTINGS} from './league-runner.js';
import {playCommitmentMatch,type CommitmentVariant} from './cooperative-commitment-match.js';
import type {ClaimStyle} from './claim-opponents.js';
const count=Number(process.argv[2]??8),start=Number(process.argv[3]??130000),out=process.argv[4]??'../../docs/evaluations/cooperation-round-016-development.json',batch=Number(process.argv[5]??96),phase=process.argv[6]??'development';
if(!Number.isSafeInteger(count)||count<1||!Number.isSafeInteger(start)||!Number.isSafeInteger(batch)||batch<0||batch%3||!['development','holdout'].includes(phase))throw Error('시드/배치/단계 오류');
const candidate=process.argv[7]??'commitment';if(!['reportedSupreme','knownCommanderGuardBeforeAlly','learnOwnAttackOutcome','reportedFirstWarning','avoidRepeatedFailedGuess','directCheckFollowup','urgentDispelBeforeAlly','commitment','idleClaimMana','forecastAttackBudget','deadAllyReport','enemyBreakRepair','netAttackReserve'].includes(candidate))throw Error('고정 후보 이름 오류');
const candidateOptions=candidate==='reportedSupreme'?{reportedSupreme:true}:candidate==='knownCommanderGuardBeforeAlly'?{knownCommanderGuardBeforeAlly:true}:candidate==='learnOwnAttackOutcome'?{learnOwnAttackOutcome:true}:candidate==='reportedFirstWarning'?{reportedFirstWarning:true}:candidate==='avoidRepeatedFailedGuess'?{avoidRepeatedFailedGuess:true}:candidate==='directCheckFollowup'?{directCheckFollowup:true}:candidate==='urgentDispelBeforeAlly'?{urgentDispelBeforeAlly:true}:candidate==='netAttackReserve'?{netAttackReserve:true}:candidate==='enemyBreakRepair'?{}:candidate==='commitment'?{claimTurnCommitment:true}:candidate==='idleClaimMana'?{idleClaimMana:true}:candidate==='deadAllyReport'?{verifyDeadAllyReports:true}:{forecastAttackBudget:true};
const hash=(x:string|Buffer)=>createHash('sha256').update(x).digest('hex'),sourceHashes:Record<string,string>={},src=new URL('../src/',import.meta.url);
const walk=(dir:URL,prefix='')=>{for(const e of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const p=prefix+e.name;if(e.isDirectory())walk(new URL(e.name+'/',dir),p+'/');else if(e.name.endsWith('.ts'))sourceHashes['src/'+p]=hash(readFileSync(new URL(e.name,dir)));}};walk(src);
for(const p of ['cooperative-claim-commitment.ts','cooperative-commitment-match.ts','baselines/pre-round024.ts','cooperative-store.ts','league-runner.ts','baselines/pre-cooperative.ts','claim-opponents.ts'])sourceHashes['scripts/'+p]=hash(readFileSync(new URL(p,import.meta.url)));
if(candidate==='reportedSupreme')sourceHashes['scripts/reported-supreme-opportunities.ts']=hash(readFileSync(new URL('reported-supreme-opportunities.ts',import.meta.url)));
const auxiliarySourceHashes=Object.fromEntries(['verify-claim-commitment.py','run-cooperative-generations.py'].map(p=>['tools/'+p,hash(readFileSync(new URL('../../../tools/'+p,import.meta.url)))]));
const variants:CommitmentVariant[]=['baseline','control',candidate as CommitmentVariant];
const meta={format:1,persistence:{version:2},comparisonRevision:3,controlPolicy:candidate==='enemyBreakRepair'?'PR-before-round024':'current-default',kind:candidate==='reportedSupreme'?'trusted-supreme-report-comparison':candidate==='knownCommanderGuardBeforeAlly'?'known-commander-guard-before-ally-comparison':candidate==='learnOwnAttackOutcome'?'own-attack-outcome-knowledge-comparison':candidate==='reportedFirstWarning'?'first-warning-trusted-report-comparison':candidate==='avoidRepeatedFailedGuess'?'repeated-warned-failed-guess-comparison':candidate==='directCheckFollowup'?'private-confirmation-attack-followup-comparison':candidate==='urgentDispelBeforeAlly'?'confirmed-ally-urgent-dispel-comparison':candidate==='netAttackReserve'?'net-base-turn-attack-reserve-comparison':candidate==='enemyBreakRepair'?'confirmed-enemy-break-repair-comparison':candidate==='commitment'?'claim-turn-commitment-comparison':candidate==='idleClaimMana'?'idle-manual-true-claim-mana-comparison':candidate==='deadAllyReport'?'dead-ally-report-verification-comparison':'forecast-attack-budget-comparison',phase,count,start,settings:DEFAULT_SETTINGS,variants,
  options:{baseline:{},control:{},[candidate]:candidateOptions},sourceHashes,auxiliarySourceHashes,
  design:{unit:'seed',arithmetic:'exactHalfPointSeedTotalsBeforeNormalization',development:['reportedSupreme','knownCommanderGuardBeforeAlly','learnOwnAttackOutcome'].includes(candidate)?'behavior_quality_separate; legacy_score_gate_diagnostic_only':'candidate>control AND candidate>=baseline AND safety=0',holdout:'overall_vs_baseline_seed95Lower>0 AND each_mode_difference>=-0.02 AND safety=0',
    limitations:['개발 결과로 승격하지 않는다.','턴 마나는 상한 전 원시 값이다. 공표 보상은 실제 자기 마나 전후 차이를 따로 기록한다.','대기 때 추가 행동이나 유지 중 행동의 횟수는 승패 개선을 대체하지 않는다.']}};
const fingerprint=hash(JSON.stringify(meta));mkdirSync(dirname(out),{recursive:true});
type Result=ReturnType<typeof playCommitmentMatch>;type GameRecord={mode:ModeId;style:ClaimStyle;variant:CommitmentVariant;result:Result};
const records:GameRecord[]=[],seen=new Set<string>();let fresh=0;
const key=(x:GameRecord)=>{const f=x.result.game.fixture;return `${x.mode}/${x.style}/${f.seed}/${f.reversed}/${f.currentSide}/${x.variant}`;};
const target=count*4*3*4*3;
const store=new CooperativeStore<GameRecord>({out,meta,fingerprint,expectedCount:target,key,project:s=>s.records});
for(const x of store.records){records.push(x);seen.add(key(x));}
const save=(complete:boolean)=>store.checkpoint({...meta,fingerprint,complete,executions:records.length,records});
for(const mode of ['civil_war','primordial','lidellut','troll'] as ModeId[])for(const style of ['truthful','bluff','skill-aware-bluff'] as ClaimStyle[]){
  for(let i=0;i<count;i++)for(const f of fixtures(mode,start+i,8+i%5))for(const variant of variants){
    const k=`${mode}/${style}/${f.seed}/${f.reversed}/${f.currentSide}/${variant}`;if(seen.has(k))continue;
    const x={mode,style,variant,result:playCommitmentMatch(f,style,variant,DEFAULT_SETTINGS,true,candidate==='enemyBreakRepair')};store.append(x);records.push(x);seen.add(k);fresh++;
    if(fresh%12===0)save(false);
    if(batch&&fresh>=batch&&records.length<target){save(false);store.close();process.stderr.write(`[commitment] 신규${fresh}/누적${records.length}, 체크포인트\n`);process.exit(0);}
  }
}
if(records.length!==target)throw Error('전체 경기 수 불일치');save(true);process.stderr.write(`[commitment] 전체${records.length}, 이번호출 신규${fresh}\n`);

store.close();
