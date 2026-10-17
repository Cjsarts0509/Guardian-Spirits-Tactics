import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {smartBotAction,botCommunicationAction,viewFor,type ModeId} from '../src/index.js';
import {smartBotAction as previous} from './baselines/pre-cooperative.js';
import {opponentClaim,type ClaimStyle} from './claim-opponents.js';
import {fixtures,playMatch,summarize,DEFAULT_SETTINGS,type Policy} from './league-runner.js';
const count=Number(process.argv[2]??4),start=Number(process.argv[3]??110000),out=process.argv[4]??'../../docs/evaluations/cooperation-development.json';
if(!Number.isSafeInteger(count)||count<1||!Number.isSafeInteger(start))throw Error('시드 오류');
const modes:ModeId[]=['civil_war','primordial','lidellut','troll'];
const styles:ClaimStyle[]=['truthful','bluff','skill-aware-bluff'];
const rows=[];const ablation=process.argv[5]==='ablation';
const design={kind:'behavioral-policy-comparison',independentUnit:'seed',holdoutStart:112000,holdoutCount:16,minimumSafety:'no early attack failures or fabricated reports',adoption:'no win-rate improvement claim unless held-out evidence supports it; report per-mode regressions'};
const hashes=Object.fromEntries(['bot.ts','bot-memory.ts','bot-intel.ts','bot-belief.ts','bot-claim-policy.ts'].map(f=>[f,createHash('sha256').update(readFileSync(new URL('../src/'+f,import.meta.url))).digest('hex')]));
hashes.baseline=createHash('sha256').update(readFileSync(new URL('./baselines/pre-cooperative.ts',import.meta.url))).digest('hex');
hashes.runner=createHash('sha256').update(readFileSync(new URL('./league-runner.ts',import.meta.url))).digest('hex');
for(const mode of modes)for(const style of styles){
 const reference:Policy=(s,id,m,o)=>{const a=previous(s,id,m,{activity:o.activity});return a?.type==='skill'&&a.skill==='publish'?{...a,name:opponentClaim(viewFor(s,id),m,style,a.name)}:a;};
 const variants:Record<string,Policy>={baseline:(s,id,m,o)=>previous(s,id,m,{activity:o.activity}),candidate:smartBotAction};
 if(ablation){variants.teamwork=(s,id,m,o)=>smartBotAction(s,id,m,{...o,claimStrategy:'truthful'});variants.claim=(s,id,m,o)=>smartBotAction(s,id,m,{...o,teamwork:false});}
 const results:Record<string,unknown>={};
 for(const [variant,policy] of Object.entries(variants)){
  const games=[];const observations={trueClaims:0,falseClaims:0,allies:0,wrongAllies:0,reports:0,falseReports:0};
  for(let i=0;i<count;i++)for(const f of fixtures(mode,start+i,8+i%5))games.push(playMatch(f,{current:policy,reference},DEFAULT_SETTINGS,(state,id,action,result)=>{
   if(!result.ok||state.players.find(p=>p.id===id)?.side!==f.currentSide)return;
   const self=state.players.find(p=>p.id===id)!;
   if(action.type==='skill'&&action.skill==='publish'){if(action.name===self.character)observations.trueClaims++;else observations.falseClaims++;}
   if(action.type==='skill'&&action.skill==='ally'){observations.allies++;if(state.players.find(p=>p.id===action.target)?.side!==self.side)observations.wrongAllies++;}
   if(action.type==='chat'&&action.text.startsWith('확인 정보: ')){observations.reports++;const m=/^확인 정보: \[(\d+)\] (.+)$/.exec(action.text);const p=state.players.find(p=>p.seat===Number(m?.[1]));if(!p||viewFor(state,id).roster.find(r=>r.key===p.character)?.name!==m?.[2])observations.falseReports++;}
  },['candidate','teamwork'].includes(variant)?{current:botCommunicationAction}:{}));
  results[variant]={summary:summarize(games),observations,games};
  process.stderr.write(`[cooperation] ${mode}/${style}/${variant}: ${games.length} 완료\n`);
 }
 rows.push({mode,style,results});
 // 진행 결과도 보존. 판단 로직에는 반환하지 않음.
 mkdirSync(new URL('../../docs/evaluations/',import.meta.url),{recursive:true});writeFileSync(out,JSON.stringify({format:1,sourceBase:'a92d9bb',count,start,settings:DEFAULT_SETTINGS,ablation,design,hashes,rows},null,2));
}
