import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {smartBotAction,botKnowledge} from '../src/bot.js';
import {viewFor} from '../src/engine/view.js';
import {applyAction} from '../src/engine/actions.js';
import type {BotMemory,Knowledge} from '../src/bot-memory.js';
import type {Action} from '../src/types.js';
import {NAME_ATTACKS} from '../src/bot-tactics.js';
import {playMatch,type MatchResult} from './league-runner.js';
import {claimOpponent,type ClaimStyle} from './claim-opponents.js';
import {context,select,type Model} from './ally-context-model.js';
const root=resolve(import.meta.dirname,'../../..'),source=resolve(root,'docs/evaluations/ally-context'),out=resolve(root,'docs/evaluations/ally-context-diagnosis');mkdirSync(out,{recursive:true});
const historical=JSON.parse(gunzipSync(readFileSync(resolve(source,'holdout-matches.json.gz'))).toString()) as (MatchResult&{style:ClaimStyle;learned:boolean})[];
const model=JSON.parse(readFileSync(resolve(source,'model.json'),'utf8')) as Model;
const knowledgeSummary=(k:Knowledge)=>Object.fromEntries([...k.candidates].map(([id,c])=>[id,{count:c.length,known:k.known.get(id)??null}]));
type KS=ReturnType<typeof knowledgeSummary>;
interface Row {fixture:MatchResult['fixture'];style:ClaimStyle;player:string;at:number;original:Action;alternative:Action;beforeMana:number;beforeKnowledge:KS;ok?:boolean;error?:string;manaSpent?:number;allyCounterfactual:{ok:boolean;error?:string;manaSpent:number};afterKnowledge?:KS;changedTargets?:string[];newIdentities?:Record<string,string>;manaBlockedVsAlly?:string[];followups:{afterMs:number;action:Action;ok:boolean;error?:string;onChangedTarget:boolean;namedNewIdentity:boolean}[];firstAlly?:number;firstOriginalAlly?:number;actorDeathAfterMs?:number;originalTargetDeathAfterMs?:number;endAfterMs?:number;winnerPolicy?:MatchResult['winnerPolicy']}
const records:Row[]=[];let replayed=0;
const targetOf=(a:Action)=>a.type==='skill'?a.target:undefined;
for(const old of historical){
 const seen=new WeakSet<BotMemory>(),pending=new Map<string,{row:Row;memory:BotMemory;counterView:ReturnType<typeof viewFor>}>(),active=new Map<string,Row>();
 const game=playMatch(old.fixture,{current:(s,id,m,o)=>{
  const action=smartBotAction(s,id,m,o);
  if(!old.learned||seen.has(m)||action?.type!=='skill'||action.skill!=='ally')return action;
  const view=viewFor(s,id),knowledge=botKnowledge(s,id,view,m),ctx=context(view,knowledge,action);if(!ctx)return action;
  seen.add(m);const arm=model[ctx.cell]!.choice,chosen=select(action,ctx,arm);
  if(arm==='information'&&chosen){
   // 평가용 복제 엔진의 원래 동맹 즉시 결과. 실제 정책에 전달하지 않는다.
   const copy=structuredClone(s),counter=applyAction(copy,id,action,s.now),cv=viewFor(copy,id);
   const row:Row={fixture:old.fixture,style:old.style,player:id,at:s.now,original:action,alternative:chosen,beforeMana:view.me.mana,beforeKnowledge:knowledgeSummary(knowledge),allyCounterfactual:{ok:counter.ok,error:counter.error,manaSpent:view.me.mana-cv.me.mana},followups:[]};
   records.push(row);pending.set(id,{row,memory:structuredClone(m),counterView:cv});
  }
  return chosen;
 },reference:claimOpponent(old.style)},undefined,(s,id,action,result)=>{
  const first=pending.get(id);
  if(first){
   pending.delete(id);const {row,memory,counterView}=first,after=viewFor(s,id);
   row.ok=result.ok;row.error=result.error;row.manaSpent=row.beforeMana-after.me.mana;
   // 게임 종료 뒤 전체 공개된 정체를 정보 수집 성과로 세지 않는다.
   if(s.phase==='running'){
    row.afterKnowledge=knowledgeSummary(botKnowledge(s,id,after,memory));row.changedTargets=[];row.newIdentities={};
    for(const [target,before] of Object.entries(row.beforeKnowledge)){
     const next=row.afterKnowledge[target];if(!next)continue;
     if(next.count<before.count||next.known!==null&&before.known===null)row.changedTargets.push(target);
     if(next.known!==null&&before.known===null)row.newIdentities[target]=next.known;
    }
    row.manaBlockedVsAlly=after.me.skills.filter(x=>x.blocked?.startsWith('마나가 부족합니다.')&&counterView.me.skills.some(c=>c.key===x.key&&c.blocked===null)).map(x=>x.key);
   }
   active.set(id,row);
  }else{
   const row=active.get(id);
   if(row){
    const target=targetOf(action),name=action.type==='skill'?action.name:undefined;
    row.followups.push({afterMs:s.now-row.at,action,ok:result.ok,error:result.error,onChangedTarget:!!target&&!!row.changedTargets?.includes(target),namedNewIdentity:action.type==='skill'&&NAME_ATTACKS.includes(action.skill)&&!!target&&!!name&&row.newIdentities?.[target]===name});
    if(result.ok&&action.type==='skill'&&action.skill==='ally'){
     row.firstAlly??=s.now-row.at;if(action.target===targetOf(row.original))row.firstOriginalAlly??=s.now-row.at;
    }
   }
  }
  for(const [actor,row] of active){
   const dead=(target:string|undefined)=>target!==undefined&&s.players.some(p=>p.id===target&&!p.alive);
   if(dead(actor))row.actorDeathAfterMs??=s.now-row.at;
   if(dead(targetOf(row.original)))row.originalTargetDeathAfterMs??=s.now-row.at;
  }
 });
 const {style,learned,...expected}=old;assert.deepEqual(game,expected);replayed++;
 for(const row of active.values()){row.endAfterMs=game.elapsedMs-row.at;row.winnerPolicy=game.winnerPolicy;}
 if(replayed%128===0)process.stderr.write(`[diagnosis] ${replayed}/${historical.length}\n`);
}
assert.equal(records.length,246);
const count=(fn:(r:Row)=>boolean)=>records.filter(fn).length;
const times=(xs:number[])=>{const s=xs.sort((a,b)=>a-b);return {n:s.length,medianMs:s.length?s[Math.floor(s.length/2)]:null,p90Ms:s.length?s[Math.min(s.length-1,Math.floor(s.length*.9))]:null};};
const groups:Record<string,number>={};for(const r of records){const k=r.alternative.type==='skill'?r.alternative.skill:r.alternative.type;groups[k]=(groups[k]??0)+1;}
const pairs=new Map<string,{baseline?:MatchResult;candidate?:MatchResult}>();
for(const g of historical){const key=JSON.stringify([g.fixture,g.style]),pair=pairs.get(key)??{};pair[g.learned?'candidate':'baseline']=g;pairs.set(key,pair);}
const outcomes={same:0,improved:0,worsened:0};for(const p of pairs.values()){assert(p.baseline&&p.candidate);const score=(g:MatchResult)=>g.winnerPolicy==='current'?1:g.winnerPolicy==='reference'?0:.5;const d=score(p.candidate)-score(p.baseline);outcomes[d>0?'improved':d<0?'worsened':'same']++;}
const files=['scripts/ally-context-diagnosis.ts','scripts/ally-context-model.ts','scripts/league-runner.ts','src/bot.ts','src/bot-memory.ts','src/bot-belief.ts'];
const summary={replayed,matchResultsIdentical:true,interventions:records.length,accepted:count(r=>r.ok===true),rejected:count(r=>r.ok===false),skills:groups,knowledgeNarrowed:count(r=>(r.changedTargets?.length??0)>0),identityLearned:count(r=>Object.keys(r.newIdentities??{}).length>0),followupOnChangedTarget60s:count(r=>r.followups.some(f=>f.afterMs<=60000&&f.ok&&f.onChangedTarget)),followupOnChangedTargetAny:count(r=>r.followups.some(f=>f.ok&&f.onChangedTarget)),namedAttackNewIdentity60s:count(r=>r.followups.some(f=>f.afterMs<=60000&&f.ok&&f.namedNewIdentity)),namedAttackNewIdentityAny:count(r=>r.followups.some(f=>f.ok&&f.namedNewIdentity)),manaSpent:records.reduce((n,r)=>n+(r.manaSpent??0),0),counterfactualAllyManaSpent:records.reduce((n,r)=>n+r.allyCounterfactual.manaSpent,0),counterfactualAllyAccepted:count(r=>r.allyCounterfactual.ok),immediateAdditionalManaBlock:count(r=>(r.manaBlockedVsAlly?.length??0)>0),originalAllyLater:count(r=>r.firstOriginalAlly!==undefined),originalAllyWithin60s:count(r=>(r.firstOriginalAlly??Infinity)<=60000),originalAllyDelay:times(records.flatMap(r=>r.firstOriginalAlly===undefined?[]:[r.firstOriginalAlly])),anyAllyLater:count(r=>r.firstAlly!==undefined),actorDiedBeforeOriginalAlly:count(r=>r.actorDeathAfterMs!==undefined&&r.actorDeathAfterMs<(r.firstOriginalAlly??Infinity)),originalTargetDiedBeforeAlly:count(r=>r.originalTargetDeathAfterMs!==undefined&&r.originalTargetDeathAfterMs<(r.firstOriginalAlly??Infinity)),pairedOutcomes:outcomes,hashes:Object.fromEntries(files.map(p=>[p,createHash('sha256').update(readFileSync(resolve(root,'packages/rules',p))).digest('hex')]))};
writeFileSync(resolve(out,'records.json.gz'),gzipSync(JSON.stringify(records)));
writeFileSync(resolve(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');
