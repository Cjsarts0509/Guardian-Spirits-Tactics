// 평가 전용: 자기 관찰·기억만 복제해 제안을 비교하고 대안은 엔진에 실행하지 않는다.
import {botKnowledge,smartBotAction} from '../src/bot.js';
import {viewFor} from '../src/engine/view.js';
import {assignmentBelief,checkInformation} from '../src/bot-belief.js';
import {trustedIntel,verifyIntel} from '../src/bot-intel.js';
import {nextRandom} from '../src/rng.js';
import type {BotMemory} from '../src/bot-memory.js';
import type {BotOptions} from '../src/bot.js';
import type {Action,ActionResult,GameState} from '../src/types.js';

export interface ReportVerificationDecision {
  at:number;player:string;role:string;actualPolicy:'priority'|'normal'|'when-busy';
  priority:Action;normal:Action|null;chosen:Action|null;changed:boolean;
  reportName:string;reportAgeMs:number;mana:number;
  priorityMana:number;normalMana:number;chosenMana:number;
  priorityExpectedInformation:number;normalExpectedInformation:number|null;
  knownBefore:number;totalCandidatesBefore:number;
  accepted:boolean|null;error:string|null;ended:boolean;
  knownAfter:number|null;totalCandidatesAfter:number|null;
}
const same=(a:Action|null,b:Action|null)=>JSON.stringify(a)===JSON.stringify(b);
const totalCandidates=(k:ReturnType<typeof botKnowledge>)=>[...k.candidates.values()].reduce((n,x)=>n+x.length,0);

/** 우선 제안이 신뢰 보고 검증과 일치하는 순간만 관측한다. 신뢰/facts/RNG는 바꾸지 않는다. */
export function diagnoseReportVerification(state:GameState,id:string,memory:BotMemory,options:BotOptions):ReportVerificationDecision|undefined {
  if(options.teamwork===false||state.phase!=='running'||nextRandom({rng:memory.rng})>(options.activity??0.5))return;
  const view=viewFor(state,id);if(!view.me.alive)return;
  const observationMemory=structuredClone(memory),knowledge=botKnowledge(state,id,view,observationMemory);
  const reports=trustedIntel(view,knowledge,observationMemory);if(!reports.size)return;
  const usable=new Map(view.me.skills.filter(s=>!s.passive&&s.blocked===null).map(s=>[s.key,s]));
  const verification=verifyIntel(view,knowledge,observationMemory,usable);
  if(verification?.type!=='skill'||!verification.target)return;
  const priority=smartBotAction(state,id,structuredClone(memory),{...options,reportVerification:'priority'});
  if(!priority||!same(priority,verification))return; // Earlier combat/alliance/publish decisions are excluded.
  const normal=smartBotAction(state,id,structuredClone(memory),{...options,reportVerification:'normal'});
  const actualPolicy=options.reportVerification??'priority';
  const chosen=actualPolicy==='when-busy'?(normal??priority):actualPolicy==='normal'?normal:priority;
  const reportName=reports.get(verification.target)!;
  const times=[...observationMemory.perception!.intel!.reports.get(verification.target)!]
    .filter(([sender,r])=>r.character===reportName&&view.players.some(p=>p.id===sender&&p.alive)&&
      view.roster.some(r=>r.key===knowledge.known.get(sender)&&r.side===view.me.side)).map(([,r])=>r.at);
  const belief=assignmentBelief(view,knowledge,observationMemory);
  const mana=(a:Action|null)=>a?.type==='skill'?usable.get(a.skill)?.mana??0:0;
  const information=(a:Action|null)=>a?.type==='skill'&&a.target&&/scan|check|truth_gem|oracle|curse|sense|shadow_eye/.test(a.skill)
    ?checkInformation(view,belief,a.target,a.skill,a.name):null;
  return {at:state.now,player:id,role:view.me.character,actualPolicy,priority,normal,chosen,changed:!same(priority,normal),
    reportName,reportAgeMs:view.elapsedMs-Math.max(...times),mana:view.me.mana,
    priorityMana:mana(priority),normalMana:mana(normal),chosenMana:mana(chosen),
    priorityExpectedInformation:information(priority)!,normalExpectedInformation:information(normal),
    knownBefore:knowledge.known.size,totalCandidatesBefore:totalCandidates(knowledge),
    accepted:null,error:null,ended:false,knownAfter:null,totalCandidatesAfter:null};
}

/** 본인의 즉시 수신 결과만 관측한다. 대안의 실행 가능 여부·미래 승패 인과는 측정하지 않는다. */
export function recordReportVerificationOutcome(row:ReportVerificationDecision,state:GameState,id:string,memory:BotMemory,result:ActionResult):void {
  row.accepted=result.ok;row.error=result.ok?null:result.error??'알 수 없는 거절';row.ended=state.phase==='ended';
  if(row.ended)return;
  const knowledge=botKnowledge(state,id,viewFor(state,id),structuredClone(memory));
  row.knownAfter=knowledge.known.size;row.totalCandidatesAfter=totalCandidates(knowledge);
}
