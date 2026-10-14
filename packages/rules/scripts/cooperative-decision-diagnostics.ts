// 평가 전용. 복제한 자기 기억의 제안만 비교하고 실제 상태/기억/난수를 변경하지 않는다.
import {botKnowledge,smartBotAction} from '../src/bot.js';
import {viewFor as ownView} from '../src/engine/view.js';
import {assignmentBelief,checkInformation} from '../src/bot-belief.js';
import {shouldPreservePartialGem} from '../src/bot-information.js';
import {nextRandom} from '../src/rng.js';
import type {BotMemory} from '../src/bot-memory.js';
import type {BotOptions} from '../src/bot.js';
import type {Action,ActionResult,GameState} from '../src/types.js';

export interface DeferredGemDecision {
  at:number;player:string;role:string;wouldUse:Action;chosen:Action|null;
  mana:number;nextTurnInMs:number;totalCandidatesBefore:number;knownBefore:number;
  gemExpectedInformation:number;alternativeExpectedInformation:number|null;
  accepted:boolean|null;error:string|null;nominalMana:number;
  totalCandidatesAfter:number|null;knownAfter:number|null;ended:boolean;
}
const totalCandidates=(k:ReturnType<typeof botKnowledge>)=>[...k.candidates.values()].reduce((n,x)=>n+x.length,0);
const infoSkill=(a:Action|null)=>a?.type==='skill'&&/scan|check|truth_gem|oracle|curse|sense|shadow_eye/.test(a.skill);

/** 같은 시점/행동 RNG의 control과 보류 정책 의도. 실행(applyAction)은 하지 않는다. */
export function diagnoseDeferredGem(state:GameState,id:string,memory:BotMemory,options:BotOptions):DeferredGemDecision|undefined {
  if(!options.preservePartialGem||state.phase!=='running'||nextRandom({rng:memory.rng})>(options.activity??0.5))return;
  const view=ownView(state,id);if(!view.me.alive||!shouldPreservePartialGem(view))return;
  const controlMemory=structuredClone(memory),candidateMemory=structuredClone(memory);
  const wouldUse=smartBotAction(state,id,controlMemory,{...options,preservePartialGem:false});
  if(wouldUse?.type!=='skill'||wouldUse.skill!=='truth_gem'||!wouldUse.target)return;
  const chosen=smartBotAction(state,id,candidateMemory,options);
  if(chosen?.type==='skill'&&chosen.skill==='truth_gem'){
    if(options.preservePartialGem==='when-busy')return; // 보류하지 않은 정상 fallback은 gemUses에 기록한다.
    throw Error('보류 조건에서 보석 소비 제안');
  }
  const knowledge=botKnowledge(state,id,view,controlMemory),belief=assignmentBelief(view,knowledge,controlMemory);
  return {at:state.now,player:id,role:view.me.character,wouldUse,chosen,mana:view.me.mana,nextTurnInMs:view.nextTurnInMs,
    totalCandidatesBefore:totalCandidates(knowledge),knownBefore:knowledge.known.size,
    gemExpectedInformation:checkInformation(view,belief,wouldUse.target,'truth_gem'),
    alternativeExpectedInformation:infoSkill(chosen)&&chosen?.type==='skill'&&chosen.target?checkInformation(view,belief,chosen.target,chosen.skill,chosen.name):null,
    accepted:null,error:null,nominalMana:chosen?.type==='skill'?view.me.skills.find(s=>s.key===chosen.skill)?.mana??0:0,
    totalCandidatesAfter:null,knownAfter:null,ended:false};
}

/** 본인 행동 응답/수신 이벤트로만 즉시 정보 변화를 측정. 종료 후 전원 로그 공개는 제외한다. */
export function recordDeferredGemOutcome(row:DeferredGemDecision,state:GameState,id:string,memory:BotMemory,result:ActionResult):void {
  row.accepted=result.ok;row.error=result.ok?null:result.error??'알 수 없는 거절';row.ended=state.phase==='ended';
  if(row.ended)return;
  const knowledge=botKnowledge(state,id,ownView(state,id),structuredClone(memory));
  row.totalCandidatesAfter=totalCandidates(knowledge);row.knownAfter=knowledge.known.size;
}
