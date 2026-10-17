/** Round052 evaluator only: primary PRE-action own input, no intervention in actual play. */
import {deepStrictEqual,strictEqual} from 'node:assert';
import {isDeepStrictEqual} from 'node:util';
import {smartBotAction,botCommunicationAction,botKnowledge,viewFor,eventsFor,applyAction,type PlayerView,type Knowledge,type BotMemory,type Action} from '../src/index.js';
import {assignmentBelief,checkInformation} from '../src/bot-belief.js';
import {confirmationCandidates} from '../src/bot-confirmation.js';
import {hasUsefulIntelExchange} from '../src/bot-intel.js';
import {KNOWN_ATTACK_GUARDS} from '../src/bot-attack-budget.js';
import {NAME_ATTACKS} from '../src/bot-tactics.js';
import {nextRandom} from '../src/rng.js';
import {playMatch,type Policy,type Settings} from './league-runner.js';
import {playReportSelfplay} from './report-selfplay.js';
import {replayHash,type OriginalRecord} from './commander-death-replay.js';
export function inspectIncomingSender(view:PlayerView,k:Knowledge,memory:BotMemory){
 const dead=new Set(view.players.filter(p=>!p.alive&&p.revealed).map(p=>p.revealed!)),guards=KNOWN_ATTACK_GUARDS[view.mode]??{};
 const enemies=view.players.filter(p=>p.alive&&!p.statuses.some(e=>e.kind==='invulnerable')&&k.known.has(p.id)&&view.roster.some(r=>r.key===k.known.get(p.id)&&r.side!==view.me.side)&&!(guards[k.known.get(p.id)!]??[]).some(g=>!dead.has(g)));
 const reservedAttacks=view.me.skills.filter(s=>NAME_ATTACKS.includes(s.key)&&s.cooldownRemainingMs>0&&s.cooldownRemainingMs<=20000&&view.me.mana>=s.mana&&enemies.some(p=>s.nameOptions?.includes(k.known.get(p.id)!))).map(s=>({skill:s.key,cost:s.mana,cooldown:s.cooldownRemainingMs}));
 const reserve=Math.max(0,...reservedAttacks.map(s=>s.cost));
 const usable=view.me.skills.filter(s=>!s.passive&&s.blocked===null&&(!reserve||NAME_ATTACKS.includes(s.key)||s.key==='break_ally'||s.mana<=view.me.mana-reserve));
 const senders=[...new Set([...(memory.perception?.intel?.reports.values()??[])].flatMap(map=>[...map.keys()]))].map(id=>{
  const p=view.players.find(p=>p.id===id)!,known=k.known.get(id)??null;
  return {id,known,alive:p.alive,protected:p.statuses.some(e=>e.kind==='invulnerable'),incomingAlly:view.me.alliedBy.includes(id),useful:hasUsefulIntelExchange(view,k,memory,id),
   reports:[...(memory.perception?.intel?.reports??[])].flatMap(([target,map])=>{const r=map.get(id);return r?[{target,...r,targetKnown:k.known.get(target)??null,compatible:k.candidates.get(target)?.includes(r.character)??false}]:[];})};
 });
 const incoming=view.players.filter(p=>p.alive&&p.id!==view.me.id&&!p.statuses.some(e=>e.kind==='invulnerable')&&!k.known.has(p.id)&&view.me.alliedBy.includes(p.id)&&hasUsefulIntelExchange(view,k,memory,p.id));
 const belief=assignmentBelief(view,k,memory),checks=confirmationCandidates(view,belief,incoming,usable);
 const gem=usable.find(s=>s.key==='truth_gem'),gemCandidates=gem?incoming.filter(p=>!memory.perception!.commanders.has(p.id)&&checkInformation(view,belief,p.id,'truth_gem')>0).map(p=>({target:p.id,information:checkInformation(view,belief,p.id,'truth_gem')})):[];
 const proposal:Action|null=checks[0]?.action??(gemCandidates[0]?{type:'skill',skill:'truth_gem',target:gemCandidates[0].target}:null);
 return {reserve,reservedAttacks,usableKeys:usable.map(s=>s.key),senders,incoming:incoming.map(p=>p.id),beliefConsistent:belief.consistent,
  probabilities:[...belief.probabilities].map(([id,map])=>[id,[...map]] as const),knownCommanderIDs:[...(memory.perception?.commanders??[])],checks,gemCandidates,proposal};
}
function ownIntel(memory:BotMemory){
 const i=memory.perception?.intel;return {lastSentAt:i?.lastSentAt??-12000,sent:[...(i?.sent??[])].map(([id,map])=>[id,[...map]]),reports:[...(i?.reports??[])].map(([id,map])=>[id,[...map]])};
}
export function incomingSenderWitness(original:OriginalRecord,settings:Settings,observe=true){
 const decisions:Array<{player:string;at:number;beforeAppliedActions:number;view:PlayerView;events:ReturnType<typeof eventsFor>;known:Array<[string,string]>;candidates:Array<[string,string[]]>;intel:ReturnType<typeof ownIntel>;diagnostic:ReturnType<typeof inspectIncomingSender>;chosenAction:Action|null;alternative:Action|null;changed:boolean;proposalMatchesAlternative:boolean;preRng:number;baselineAfterRng:number;alternativeAfterRng:number;memoryUnchanged:true;engineUnchanged:true;actualMemoryMatchesBaseline:true;probe:{accepted:boolean;error:string|null;ownEvents:ReturnType<typeof eventsFor>;knownAfter:Array<[string,string]>;targetKnownAfter:string|null;beforeMana:number;afterMana:number;ended:boolean}|null}>=[];
 const pending=new Map<string,PlayerView>(),actions:Array<Record<string,unknown>>=[];
 let observedRoleCalls=0,activeCalls=0,inactiveCalls=0;
 const options=original.variant==='reportedSupreme'?{reportedSupreme:true}:{};
 const remember=(s:Parameters<Policy>[0],id:string,a:Action|null)=>{if(a)pending.set(id,viewFor(s,id));return a;};
 const policy:Policy=(s,id,m,o)=>{
  const selected=['kilder','drakan'].includes(viewFor(s,id).me.character),active=nextRandom({rng:m.rng})<=(o.activity??.5);
  if(!selected)return remember(s,id,smartBotAction(s,id,m,{...o,...options}));
  observedRoleCalls++;if(!active){inactiveCalls++;return remember(s,id,smartBotAction(s,id,m,{...o,...options}));}activeCalls++;
  if(!observe)return remember(s,id,smartBotAction(s,id,m,{...o,...options}));
  const pre=structuredClone(m),stateHash=replayHash(s),v=viewFor(s,id),observation=structuredClone(pre),k=botKnowledge(s,id,v,observation,{learnOwnAttackOutcome:false}),diagnostic=inspectIncomingSender(v,k,observation);
  const baseline=structuredClone(pre),alternativeMemory=structuredClone(pre),baselineAction=smartBotAction(s,id,baseline,{...o,...options}),alternative=smartBotAction(s,id,alternativeMemory,{...o,...options,verifyIncomingAllies:'useful-report'});
  deepStrictEqual(m,pre,'diagnostic mutated actual own memory/RNG');strictEqual(replayHash(s),stateHash,'diagnostic mutated engine');
  const a=smartBotAction(s,id,m,{...o,...options});deepStrictEqual(a,baselineAction);deepStrictEqual(m,baseline,'actual own full memory differs from no-observer baseline');
  const changed=!isDeepStrictEqual(a,alternative);let probe:null|typeof decisions[number]['probe']=null;
  if(changed&&alternative){
   const clone=structuredClone(s),lastSeq=clone.seq,result=applyAction(clone,id,alternative,clone.now),after=viewFor(clone,id),afterMemory=structuredClone(alternativeMemory),afterKnown=botKnowledge(clone,id,after,afterMemory,{learnOwnAttackOutcome:false});
   probe={accepted:result.ok,error:result.ok?null:result.error??'알 수 없는 거절',ownEvents:eventsFor(clone,id,lastSeq),knownAfter:[...afterKnown.known],targetKnownAfter:alternative.type==='skill'&&alternative.target?afterKnown.known.get(alternative.target)??null:null,beforeMana:v.me.mana,afterMana:after.me.mana,ended:clone.phase==='ended'};
  }
  strictEqual(replayHash(s),stateHash,'counterfactual changed actual engine');deepStrictEqual(m,baseline);
  decisions.push({player:id,at:v.elapsedMs,beforeAppliedActions:actions.length,view:structuredClone(v),events:structuredClone(eventsFor(s,id)),known:[...k.known],candidates:[...k.candidates],intel:ownIntel(observation),diagnostic,chosenAction:structuredClone(a),alternative:structuredClone(alternative),changed,proposalMatchesAlternative:diagnostic.proposal!==null&&isDeepStrictEqual(diagnostic.proposal,alternative),preRng:pre.rng,baselineAfterRng:baseline.rng,alternativeAfterRng:alternativeMemory.rng,memoryUnchanged:true,engineUnchanged:true,actualMemoryMatchesBaseline:true,probe});
  return remember(s,id,a);
 };
 const chat:Policy=(s,id,m,o)=>remember(s,id,botCommunicationAction(s,id,m,{...o,...options}));
 const game=playMatch(original.result.game.fixture,{current:policy,reference:policy},settings,(s,id,a,r)=>{
  const v=pending.get(id)!;if(!v)throw Error('missing own pre-action view');pending.delete(id);const after=viewFor(s,id);
  actions.push({player:id,at:v.elapsedMs,action:a,accepted:r.ok,error:r.ok?null:r.error??'알 수 없는 거절',beforeMana:v.me.mana,afterMana:after.me.mana,maxMana:v.me.maxMana,
   nominalMana:a.type==='skill'?v.me.skills.find(z=>z.key===a.skill)?.mana??0:0,character:v.me.character,side:v.me.side,beforeTrueName:v.me.trueName,beforePublished:v.me.published,receiptKinds:r.events.map(e=>e.kind)});
 },{current:chat,reference:chat});
 deepStrictEqual(game,original.result.game,'whole game differs');const keys=['player','at','action','accepted','error','beforeMana','afterMana','maxMana','nominalMana','character','side','beforeTrueName','beforePublished','receiptKinds'];
 deepStrictEqual(actions,original.result.actions.map(a=>Object.fromEntries(keys.map(k=>[k,(a as unknown as Record<string,unknown>)[k]]))),'full actions/resources/receipts differ');
 return {fixture:game.fixture,variant:original.variant,game,actionsSHA256:replayHash(actions),matchedActions:actions.length,wholeGameAndAllActionsMatched:true,observedRoleCalls,activeCalls,inactiveCalls,decisions};
}
export function verifiedIncomingWitness(original:OriginalRecord,settings:Settings){
 const collector=playReportSelfplay(original.result.game.fixture,original.variant,settings,true);deepStrictEqual(collector,original,'full original collector differs');
 return {...incomingSenderWitness(original,settings),originalRecordSHA256:replayHash(original),originalCollectorMatched:true,originalCollectorPasses:1,witnessPasses:1};
}
