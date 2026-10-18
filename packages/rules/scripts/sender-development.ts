/** Evaluation only. Choices receive own view/events/memory; truth is scored after selection. */
import {deepStrictEqual,strictEqual} from 'node:assert';
import {isDeepStrictEqual} from 'node:util';
import {smartBotAction,botCommunicationAction,botKnowledge,eventsFor,viewFor,type Action,type BotMemory,type PlayerView,type Knowledge} from '../src/index.js';
import {hasUnresolvedCommanderReport,trustedIntel} from '../src/bot-intel.js';
import {nextRandom} from '../src/rng.js';
import {NAME_ATTACKS} from '../src/bot-tactics.js';
import {getMode} from '../src/modes/index.js';
import {KNOWN_ATTACK_GUARDS} from '../src/bot-attack-budget.js';
import {inspectSenderArbitration} from './sender-arbitration-witness.js';
import {smartBotAction as previous} from './baselines/pre-cooperative.js';
import {opponentClaim,type ClaimStyle} from './claim-opponents.js';
import {prepareMatch,playMatch,DEFAULT_SETTINGS,type Fixture,type Policy,type Settings} from './league-runner.js';
export const SENDER_OPTIONS={verifyIncomingAllies:'commander-report-first' as const};
export const SENDER_VARIANTS=['baseline','control','candidate'] as const;
export type SenderVariant=typeof SENDER_VARIANTS[number];
export const senderPublicRules=()=>Object.fromEntries(['civil_war','primordial','lidellut','troll'].map(mode=>{const m=getMode(mode as Fixture['mode']);return [mode,{disguises:m.disguises,hiddenFromChecks:m.hiddenFromChecks,guards:KNOWN_ATTACK_GUARDS[mode]??{}}];}));
const ownIntel=(m:BotMemory)=>{const i=m.perception?.intel;return {lastSentAt:i?.lastSentAt??-12000,sent:[...(i?.sent??[])].map(([id,x])=>[id,[...x]]),reports:[...(i?.reports??[])].map(([id,x])=>[id,[...x]])};};
type OwnResult={accepted:boolean;error:string|null;ownEvents:ReturnType<typeof eventsFor>;knownAfter:Array<[string,string]>;candidatesAfter:Array<[string,string[]]>;trustedReportsAfter:Array<[string,string]>;beforeMana:number;afterMana:number};
type Decision={player:string;at:number;ordinal:number;view:PlayerView;events:ReturnType<typeof eventsFor>;known:Array<[string,string]>;candidates:Array<[string,string[]]>;intel:ReturnType<typeof ownIntel>;diagnostic:ReturnType<typeof inspectSenderArbitration>;originalAction:Action|null;chosenAction:Action|null;changed:boolean;selected:boolean;preRng:number;originalAfterRng:number;chosenAfterRng:number;memoryUnchanged:true;receipt:OwnResult|null};
type Episode={decision:number;actor:string;sender:string;at:number;startOrdinal:number;reports:Array<{target:string;name:string}>;immediateKnown:string|null;memoryObservedAt:number|null;memoryObservedName:string|null;targetObserved:Array<{target:string;name:string;at:number}>};
type Followup={episode:number;senderKnownName:string|null;ordinal:number;at:number;action:Action;kind:'sender_ally'|'report_consistent_check'|'report_consistent_attack'|'direct_known_target_action'|'direct_known_report_sent';target:string;knownName:string|null;trustedName:string|null};
export function playSenderDevelopment(fixture:Fixture,style:ClaimStyle,variant:SenderVariant,settings:Settings=DEFAULT_SETTINGS,observe=true){
 if(!SENDER_VARIANTS.includes(variant))throw Error('unknown sender variant');
 // Assignment inventory is evaluator-only, never passed into a choice or inspector.
 const roles=prepareMatch(fixture).state.players.map(p=>({id:p.id,character:p.character,side:p.side,seat:p.seat,name:getMode(fixture.mode).characters.find(c=>c.key===p.character)!.name}));
 const decisions:Decision[]=[],episodes:Episode[]=[],followups:Followup[]=[];
 const actions:Array<{player:string;at:number;action:Action;accepted:boolean;error:string|null;side:number;character:string;beforeMana:number;afterMana:number;maxMana:number;nominalMana:number;activePrimary:boolean;receiptKinds:string[];grade:{reportTarget:string|null;reportedName:string|null;reportKnownName:string|null;reportActualName:string|null}}>=[];
 const counters={activeChoices:0,knownEntriesChecked:0,wrongKnownEntries:0,incomingEligibleChoices:0,resourceProposals:0,selected:0,changed:0};
 const options=variant==='candidate'?SENDER_OPTIONS:{};
 const pending=new Map<string,{view:PlayerView;memory:BotMemory;primary:boolean;decision:number|null;seq:number;known:Map<string,string>;trusted:Map<string,string>}>();
 const observeMemory=(id:string,m:BotMemory,at:number)=>{
  for(const e of episodes)if(e.actor===id){
   const known=m.perception?.known;if(known?.has(e.sender)&&e.memoryObservedAt===null){e.memoryObservedAt=at;e.memoryObservedName=known.get(e.sender)!;}
   for(const r of e.reports){const name=known?.get(r.target);if(name&&!e.targetObserved.some(t=>t.target===r.target))e.targetObserved.push({target:r.target,name,at});}
  }
 };
 const remember=(s:Parameters<Policy>[0],id:string,m:BotMemory,a:Action|null,primary:boolean,decision:number|null=null,k?:Knowledge)=>{
  if(a){const v=viewFor(s,id);pending.set(id,{view:v,memory:m,primary,decision,seq:s.seq,known:new Map(k?.known??m.perception?.known??[]),trusted:k?trustedIntel(v,k,m):new Map()});}return a;
 };
 const current:Policy=(s,id,m,o)=>{
  if(variant==='baseline')return remember(s,id,m,previous(s,id,m,{activity:o.activity}),true);
  const active=nextRandom({rng:m.rng})<=(o.activity??.5);
  if(!observe||!active)return remember(s,id,m,smartBotAction(s,id,m,{...o,...options}),true);
  const pre=structuredClone(m),v=viewFor(s,id),diagnosticMemory=structuredClone(pre),k=botKnowledge(s,id,v,diagnosticMemory,{learnOwnAttackOutcome:false});
  const incoming=v.players.some(p=>hasUnresolvedCommanderReport(v,k,diagnosticMemory,p.id));
  const diagnostic=incoming?inspectSenderArbitration(v,k,diagnosticMemory):null;
  deepStrictEqual(m,pre,'own observer changed actual memory/RNG');
  const shadow=structuredClone(pre),originalAction=incoming?smartBotAction(s,id,shadow,{...o}):null;
  const a=smartBotAction(s,id,m,{...o,...options});counters.activeChoices++;observeMemory(id,m,v.elapsedMs);
  // External scoring is strictly after the full choice.
  for(const [target,name] of k.known){counters.knownEntriesChecked++;counters.wrongKnownEntries+=Number(s.players.find(p=>p.id===target)?.character!==name);}
  if(!incoming)return remember(s,id,m,a,true,null,k);
  counters.incomingEligibleChoices++;counters.resourceProposals+=Number(!!diagnostic!.proposal);
  const selected=!!diagnostic!.proposal&&isDeepStrictEqual(a,diagnostic!.proposal),changed=!isDeepStrictEqual(a,originalAction);
  if(changed&&!selected)throw Error('option changed an unrelated action');
  if(variant==='control'){deepStrictEqual(a,originalAction);deepStrictEqual(m,shadow);}
  counters.selected+=Number(selected);counters.changed+=Number(changed);
  const d:Decision={player:id,at:v.elapsedMs,ordinal:actions.length,view:structuredClone(v),events:structuredClone(eventsFor(s,id)),known:[...k.known],candidates:[...k.candidates],intel:ownIntel(diagnosticMemory),diagnostic:diagnostic!,originalAction,chosenAction:structuredClone(a),changed,selected,preRng:pre.rng,originalAfterRng:shadow.rng,chosenAfterRng:m.rng,memoryUnchanged:true,receipt:null};
  decisions.push(d);return remember(s,id,m,a,true,decisions.length-1,k);
 };
 const reference:Policy=(s,id,m,o)=>{const a=previous(s,id,m,{activity:o.activity});return remember(s,id,m,a?.type==='skill'&&a.skill==='publish'?{...a,name:opponentClaim(viewFor(s,id),m,style,a.name)}:a,true);};
 const chat:Policy=(s,id,m,o)=>{const a=botCommunicationAction(s,id,m,{...o,...options});if(observe)observeMemory(id,m,s.now-s.startedAt);return remember(s,id,m,a,false);};
 const game=playMatch(fixture,{current,reference},settings,(s,id,a,result)=>{
  const before=pending.get(id);if(!before)throw Error('missing pre-action receipt');pending.delete(id);const v=before.view,after=viewFor(s,id),ordinal=actions.length;
  const match=a.type==='chat'?/^확인 정보: \[(\d{1,2})\] (.+)$/.exec(a.text):null;
  const reportTarget=match?v.players.find(p=>p.seat===Number(match[1]))?.id??null:null;
  const self=s.players.find(p=>p.id===id)!;
  actions.push({player:id,at:v.elapsedMs,action:structuredClone(a),accepted:result.ok,error:result.ok?null:result.error??'unknown rejection',side:v.me.side,character:v.me.character,beforeMana:v.me.mana,afterMana:after.me.mana,maxMana:v.me.maxMana,nominalMana:a.type==='skill'?v.me.skills.find(x=>x.key===a.skill)?.mana??0:0,activePrimary:before.primary,receiptKinds:result.events.map(e=>e.kind),grade:{reportTarget,reportedName:match?v.roster.find(r=>r.name===match[2])?.key??null:null,reportKnownName:reportTarget?before.known.get(reportTarget)??null:null,reportActualName:reportTarget?s.players.find(p=>p.id===reportTarget)?.character??null:null}});
  if(self.side!==fixture.currentSide)return;
  for(let i=0;i<episodes.length;i++){
   const e=episodes[i]!;if(e.actor!==id||ordinal<=e.startOrdinal)continue;
   if(a.type==='skill'&&a.target===e.sender&&a.skill==='ally'&&before.known.has(e.sender))followups.push({episode:i,senderKnownName:before.known.get(e.sender)??null,ordinal,at:v.elapsedMs,action:a,kind:'sender_ally',target:e.sender,knownName:before.known.get(e.sender)!,trustedName:null});
   for(const r of e.reports){
    const known=before.known.get(r.target)??null,trusted=before.trusted.get(r.target)??null;
    if(a.type==='skill'&&a.target===r.target){
     const kind=known?'direct_known_target_action':trusted===r.name&&NAME_ATTACKS.includes(a.skill)&&a.name===r.name?'report_consistent_attack':trusted===r.name&&/scan|check|truth_gem|oracle|curse|sense|shadow_eye/.test(a.skill)?'report_consistent_check':null;
     if(kind)followups.push({episode:i,senderKnownName:before.known.get(e.sender)??null,ordinal,at:v.elapsedMs,action:a,kind,target:r.target,knownName:known,trustedName:trusted});
    }
    if(reportTarget===r.target&&before.known.get(r.target)===r.name)followups.push({episode:i,senderKnownName:before.known.get(e.sender)??null,ordinal,at:v.elapsedMs,action:a,kind:'direct_known_report_sent',target:r.target,knownName:r.name,trustedName:null});
   }
  }
  if(before.decision!==null){
   const d=decisions[before.decision]!;if(!d.selected)return;
   const clone=structuredClone(before.memory),ak=botKnowledge(s,id,after,clone,{learnOwnAttackOutcome:false});
   d.receipt={accepted:result.ok,error:result.ok?null:result.error??'unknown rejection',ownEvents:structuredClone(eventsFor(s,id,before.seq)),knownAfter:[...ak.known],candidatesAfter:[...ak.candidates],trustedReportsAfter:[...trustedIntel(after,ak,clone)],beforeMana:v.me.mana,afterMana:after.me.mana};
   if(result.ok&&a.type==='skill'&&a.target){
    const reports=d.diagnostic.senders.find(x=>x.id===a.target)!.reports.filter(r=>r.compatible&&r.targetKnown===null&&d.view.players.some(p=>p.id===r.target&&p.alive)&&d.view.roster.some(x=>x.key===r.character&&x.commander)).map(r=>({target:r.target,name:r.character}));
    episodes.push({decision:before.decision,actor:id,sender:a.target,at:v.elapsedMs,startOrdinal:ordinal,reports,immediateKnown:ak.known.get(a.target)??null,memoryObservedAt:null,memoryObservedName:null,targetObserved:[]});
   }
  }
 },variant==='baseline'?{}:{current:chat});
 const currentActions=actions.filter(a=>a.side===fixture.currentSide);
 const resources={nominalSkillMana:currentActions.filter(a=>a.accepted&&a.action.type==='skill').reduce((n,a)=>n+a.nominalMana,0),netSkillManaDelta:currentActions.filter(a=>a.accepted&&a.action.type==='skill').reduce((n,a)=>n+a.afterMana-a.beforeMana,0),attackFailures:currentActions.filter(a=>a.receiptKinds.includes('attack.fail.self')).length,rejected:currentActions.filter(a=>!a.accepted).length,reports:currentActions.filter(a=>a.grade.reportTarget!==null).length,falseReports:currentActions.filter(a=>a.grade.reportTarget!==null&&(a.grade.reportKnownName!==a.grade.reportActualName||a.grade.reportedName!==a.grade.reportActualName)).length};
 return {fixture,style,variant,roles,game,actions,counters,decisions,episodes,followups,resources};
}
