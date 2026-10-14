// 개발/독립 평가용. 실제 배정으로 기록한 집계는 봇 입력에 전달하지 않는다.
import {mkdirSync,writeFileSync,readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {smartBotAction,botCommunicationAction,viewFor,type ModeId,type PlayerView} from '../src/index.js';
import type {BotOptions} from '../src/bot.js';
import {smartBotAction as previous} from './baselines/pre-cooperative.js';
import {opponentClaim,type ClaimStyle} from './claim-opponents.js';
import {fixtures,playMatch,summarize,DEFAULT_SETTINGS,type Policy} from './league-runner.js';

const count=Number(process.argv[2]??5),start=Number(process.argv[3]??115000),out=process.argv[4]??'../../docs/evaluations/cooperation-round-002-development.json';
const phase=process.argv[5]??'development',selection=process.argv[6]??'all';
if(!Number.isSafeInteger(count)||count<1||!Number.isSafeInteger(start)||!['development','holdout'].includes(phase))throw Error('평가 조건 오류');
const options:Record<string,BotOptions>={control:{},growth:{claimGemGoal:3},budget:{teamworkBudget:true},combined:{claimGemGoal:3,teamworkBudget:true},approach:{verifyIncomingAllies:true},coordinated:{claimGemGoal:3,teamworkBudget:true,verifyIncomingAllies:true},selective:{verifyIncomingAllies:'useful-report'},selectiveCombined:{claimGemGoal:3,teamworkBudget:true,verifyIncomingAllies:'useful-report'}};
const developmentGroups:Record<string,string[]>={'approach-development':['control','combined','approach','coordinated'],'selective-development':['control','combined','selective','selectiveCombined']};
if(selection!=='all'&&!developmentGroups[selection]&&!options[selection])throw Error('후보 이름 오류');
if(phase==='holdout'&&(selection==='all'||developmentGroups[selection]))throw Error('독립 평가는 사전에 고정한 후보 하나만 지정한다');
const selected=selection==='all'?Object.keys(options):developmentGroups[selection]??['control',selection].filter((x,i,a)=>a.indexOf(x)===i);
const variants=['baseline',...selected];
const hash=(p:URL)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const src=new URL('../src/',import.meta.url);
const sourceHashes:Record<string,string>={};
const walk=(dir:URL,prefix='')=>{for(const e of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const p=prefix+e.name;if(e.isDirectory())walk(new URL(e.name+'/',dir),p+'/');else if(e.name.endsWith('.ts'))sourceHashes['src/'+p]=hash(new URL(e.name,dir));}};
walk(src);for(const file of ['cooperative-rounds.ts','league-runner.ts','baselines/pre-cooperative.ts','claim-opponents.ts'])sourceHashes['scripts/'+file]=hash(new URL(file,import.meta.url));
const freshEconomy=()=>({allies:0,allyMana:0,checkBlocks:0,turns:0,falseNameTurns:0,gemGrowthMissed:0,gemStageMissed:{0:0,1:0,2:0},incomingManaGross:0});
const rows=[];
for(const mode of ['civil_war','primordial','lidellut','troll'] as ModeId[])for(const style of ['truthful','bluff','skill-aware-bluff'] as ClaimStyle[]){
 const reference:Policy=(s,id,m,o)=>{const a=previous(s,id,m,{activity:o.activity});return a?.type==='skill'&&a.skill==='publish'?{...a,name:opponentClaim(viewFor(s,id),m,style,a.name)}:a;};
 const results:Record<string,unknown>={};
 for(const variant of variants){
  const games=[],diagnostics=[];
  for(let i=0;i<count;i++)for(const f of fixtures(mode,start+i,8+i%5)){
   const economy=freshEconomy(),observations={trueClaims:0,falseClaims:0,wrongAllies:0,reports:0,falseReports:0};
   const byRole:Record<string,{turns:number;falseNameTurns:number;gemGrowthMissed:number;gemStageMissed:Record<number,number>}>={};
   const previews=new Map<string,PlayerView>();let lastSeq=0;
   const policy:Policy=(s,id,m,o)=>{const a=variant==='baseline'?previous(s,id,m,{activity:o.activity}):smartBotAction(s,id,m,{...o,...options[variant]});if(a?.type==='skill'&&a.skill==='ally')previews.set(id,viewFor(s,id));return a;};
   games.push(playMatch(f,{current:policy,reference},DEFAULT_SETTINGS,(state,id,action,result)=>{
    for(const e of state.log)if(e.seq>lastSeq&&e.kind==='turn'&&e.vis.to==='players'){
     const p=state.players.find(p=>e.vis.to==='players'&&p.id===e.vis.ids[0]);if(!p||p.side!==f.currentSide)continue;
     const r=byRole[p.character]??={turns:0,falseNameTurns:0,gemGrowthMissed:0,gemStageMissed:{0:0,1:0,2:0}};
     economy.turns++;r.turns++;economy.incomingManaGross+=Number(e.data?.allies??0)*10;
     if(e.data?.trueName===false){economy.falseNameTurns++;r.falseNameTurns++;const gem=Number(e.data?.gem??0);if(gem<3){economy.gemGrowthMissed++;r.gemGrowthMissed++;economy.gemStageMissed[gem as 0|1|2]++;r.gemStageMissed[gem]=(r.gemStageMissed[gem]??0)+1;}}
    }
    lastSeq=state.seq;
    const self=state.players.find(p=>p.id===id)!;if(!result.ok||self.side!==f.currentSide)return;
    if(action.type==='skill'&&action.skill==='publish'){if(action.name===self.character)observations.trueClaims++;else observations.falseClaims++;}
    if(action.type==='skill'&&action.skill==='ally'){
     const before=previews.get(id);if(!before)throw Error('동맹 직전 뷰 누락');previews.delete(id);
     economy.allies++;economy.allyMana+=before.me.mana-viewFor(state,id).me.mana;
     economy.checkBlocks+=Number(before.me.skills.some(s=>s.blocked===null&&!s.passive&&/scan|check|truth_gem|oracle|curse|sense|shadow_eye/.test(s.key)&&s.mana>self.mana));
     if(state.players.find(p=>p.id===action.target)?.side!==self.side)observations.wrongAllies++;
    }
    if(action.type==='chat'&&action.text.startsWith('확인 정보: ')){
     observations.reports++;const m=/^확인 정보: \[(\d+)\] (.+)$/.exec(action.text),p=state.players.find(p=>p.seat===Number(m?.[1]));
     if(!p||viewFor(state,id).roster.find(r=>r.key===p.character)?.name!==m?.[2])observations.falseReports++;
    }
   },variant==='baseline'?{}:{current:(s,id,m,o)=>botCommunicationAction(s,id,m,{...o,...options[variant]})}));
   diagnostics.push({fixture:f,economy,observations,byRole});
  }
  results[variant]={summary:summarize(games),games,diagnostics};
  process.stderr.write(`[rounds] ${mode}/${style}/${variant}: ${games.length} 완료\n`);
 }
 rows.push({mode,style,results});mkdirSync(new URL('../../docs/evaluations/',import.meta.url),{recursive:true});
 writeFileSync(out,JSON.stringify({format:1,kind:'cooperative-resource-comparison',phase,count,start,settings:DEFAULT_SETTINGS,variants,options,sourceHashes,design:{unit:'seed',adoption:'독립 평가의 전체 차이 95% 하한 양수·각 모드 점수 차이 -2%p 이상·안전 위반 0. 개발 성적은 채택 근거로 삼지 않는다.',limitations:['동맹 직후 스킬 마나 차단은 잠재 비용이며 실제 대체 행동의 인과 증거가 아니다.','단방향 동맹의 수입과 지급을 분리하며 원시 턴 마나는 150 상한 전 값이다.','개발 후보 다중 비교는 후보 선택용이며 독립 평가를 대체하지 않는다.']},rows},null,2));
}
