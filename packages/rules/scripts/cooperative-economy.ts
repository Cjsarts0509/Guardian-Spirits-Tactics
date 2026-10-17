// 평가 전용 관측자. 예산 통계·실제 배정은 정책 입력으로 돌려주지 않는다.
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {smartBotAction,botCommunicationAction,viewFor,type ModeId,type PlayerView} from '../src/index.js';
import {smartBotAction as previous} from './baselines/pre-cooperative.js';
import {opponentClaim,type ClaimStyle} from './claim-opponents.js';
import {fixtures,playMatch,summarize,DEFAULT_SETTINGS,type Policy} from './league-runner.js';
const count=Number(process.argv[2]??5),start=Number(process.argv[3]??114000),out=process.argv[4]??'../../docs/evaluations/cooperation-economy-round-001.json';
if(!Number.isSafeInteger(count)||count<1||!Number.isSafeInteger(start))throw Error('시드 오류');
const hash=(p:string)=>createHash('sha256').update(readFileSync(new URL(p,import.meta.url))).digest('hex');
const sourceHashes=Object.fromEntries(['bot.ts','bot-intel.ts','bot-claim-policy.ts','bot-belief.ts','bot-memory.ts','engine/time.ts','constants.ts'].map(f=>[f,hash('../src/'+f)]));
sourceHashes.runner=hash('./league-runner.ts');sourceHashes.baseline=hash('./baselines/pre-cooperative.ts');sourceHashes.observer=hash('./cooperative-economy.ts');
const rows=[];
for(const mode of ['lidellut','troll'] as ModeId[])for(const style of ['truthful','bluff','skill-aware-bluff'] as ClaimStyle[]){
 const reference:Policy=(s,id,m,o)=>{const a=previous(s,id,m,{activity:o.activity});return a?.type==='skill'&&a.skill==='publish'?{...a,name:opponentClaim(viewFor(s,id),m,style,a.name)}:a;};
 const results:Record<string,unknown>={};
 for(const variant of ['baseline','candidate']){
  const stats={allies:0,allyMana:0,reciprocalAtCreation:0,potentialSkillBlocks:0,potentialAttackBlocks:0,potentialCheckBlocks:0,turns:0,falseNameTurns:0,potentialTrueNameManaMissed:0,gemGrowthMissed:0,incomingAllyManaGross:0,turnManaGross:0};
  const traces:{fixture:unknown;actor:string;at:number;beforeMana:number;afterMana:number;incoming:number;outgoing:number;reciprocal:boolean;blockedSkills:string[]}[]=[];
  const games=[];
  for(let i=0;i<count;i++)for(const f of fixtures(mode,start+i,8+i%5)){
   const previews=new Map<string,PlayerView>();let lastSeq=0;
   const policy:Policy=(s,id,m,o)=>{const a=variant==='candidate'?smartBotAction(s,id,m,o):previous(s,id,m,{activity:o.activity});if(a?.type==='skill'&&a.skill==='ally')previews.set(id,viewFor(s,id));return a;};
   games.push(playMatch(f,{current:policy,reference},DEFAULT_SETTINGS,(state,id,action,result)=>{
    for(const e of state.log)if(e.seq>lastSeq&&e.kind==='turn'&&e.vis.to==='players'){
     const p=state.players.find(p=>e.vis.to==='players'&&p.id===e.vis.ids[0]);if(!p||p.side!==f.currentSide)continue;
     const gain=Number(e.data?.gain??0),allies=Number(e.data?.allies??0),gem=Number(e.data?.gem??0);stats.turns++;stats.turnManaGross+=gain;stats.incomingAllyManaGross+=allies*10;
     if(e.data?.trueName===false){stats.falseNameTurns++;stats.potentialTrueNameManaMissed+=10;if(gem<3)stats.gemGrowthMissed++;}
    }
    lastSeq=state.seq;
    if(!result.ok||action.type!=='skill'||action.skill!=='ally'||state.players.find(p=>p.id===id)?.side!==f.currentSide)return;
    const before=previews.get(id);if(!before)throw Error('동맹 직전 뷰 누락');previews.delete(id);
    const after=viewFor(state,id),target=state.players.find(p=>p.id===action.target);
    const blocked=before.me.skills.filter(s=>!s.passive&&s.blocked===null&&s.key!=='ally'&&s.mana>after.me.mana).map(s=>s.key);
    const reciprocal=!!target?.allies.includes(id);stats.allies++;stats.allyMana+=before.me.mana-after.me.mana;stats.reciprocalAtCreation+=Number(reciprocal);
    stats.potentialSkillBlocks+=Number(blocked.length>0);stats.potentialAttackBlocks+=Number(blocked.some(s=>/attack|murder|slaughter|reaver/.test(s)));stats.potentialCheckBlocks+=Number(blocked.some(s=>/scan|check|truth_gem|oracle|curse|sense|shadow_eye/.test(s)));
    traces.push({fixture:f,actor:id,at:state.now-state.startedAt,beforeMana:before.me.mana,afterMana:after.me.mana,incoming:before.me.alliedBy.length,outgoing:before.me.allies.length,reciprocal,blockedSkills:blocked});
   },variant==='candidate'?{current:botCommunicationAction}:{}));
  }
  results[variant]={summary:summarize(games),stats,traces,games};
  process.stderr.write(`[economy] ${mode}/${style}/${variant}: ${games.length} 완료\n`);
 }
 rows.push({mode,style,results});mkdirSync(new URL('../../docs/evaluations/',import.meta.url),{recursive:true});
 writeFileSync(out,JSON.stringify({format:1,kind:'development-diagnostic-only',count,start,settings:DEFAULT_SETTINGS,sourceHashes,limitations:['직후 사용 가능 스킬의 마나 부족은 잠재 기회비용이며 실제 공격/확인을 선택했을 것이라는 인과 증거는 아니다.','턴 gain 및 진명 보너스 미수령은 엔진의 원시 지급량이며 마나 상한 150에서의 순수령 차이를 뜻하지 않는다.','동맹 즉시 상호 여부는 시전 당시 상태이며 이후 답례 동맹/생존의 인과효과를 포함하지 않는다.'],rows},null,2));
}
