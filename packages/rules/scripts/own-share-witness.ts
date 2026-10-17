/** Round051: observe one's own sender state after the actual communication choice. */
import {deepStrictEqual,strictEqual} from 'node:assert';
import {smartBotAction,botCommunicationAction,botKnowledge,viewFor,eventsFor,type PlayerView,type Action,type Knowledge,type BotMemory} from '../src/index.js';
import {shareIntel} from '../src/bot-intel.js';
import {playMatch,type Policy,type Settings} from './league-runner.js';
import {playReportSelfplay} from './report-selfplay.js';
import {replayHash,type OriginalRecord} from './commander-death-replay.js';
export function inspectOwnShare(view:PlayerView,k:Knowledge,memory:BotMemory){
 const intel=memory.perception?.intel;
 const lastSentAt=intel?.lastSentAt??-12000,cooldownRemainingMs=Math.max(0,12000-(view.elapsedMs-lastSentAt));
 const peers=view.players.filter(p=>p.id!==view.me.id).map(p=>{
  const known=k.known.get(p.id)??null,role=view.roster.find(r=>r.key===known);
  const reason=!p.alive?'dead':!view.me.allies.includes(p.id)?'no_outgoing_ally':!role?'identity_unconfirmed':role.side!==view.me.side?'confirmed_other_side':'eligible_friend';
  return {id:p.id,seat:p.seat,alive:p.alive,known,outgoingAlly:view.me.allies.includes(p.id),reason};
 });
 const friends=peers.filter(p=>p.reason==='eligible_friend');
 const targets=view.players.filter(p=>p.alive&&p.id!==view.me.id&&k.known.has(p.id)).map(p=>{
  const character=k.known.get(p.id)!,role=view.roster.find(r=>r.key===character)!;
  return {id:p.id,seat:p.seat,character,score:role.side!==view.me.side?role.commander?3:2:1,name:role.name};
 }).sort((a,b)=>b.score-a.score||a.seat-b.seat);
 const pairs=targets.flatMap(target=>friends.filter(f=>f.id!==target.id).map(friend=>{
  const text=`확인 정보: [${target.seat}] ${target.name}`;
  return {target:target.id,character:target.character,to:friend.id,text,alreadySent:intel?.sent.get(friend.id)?.get(target.id)===target.character,tooLong:text.length>50};
 }));
 const first=pairs.find(p=>!p.alreadySent&&!p.tooLong);
 const proposal:Action|null=cooldownRemainingMs===0&&first?{type:'chat',channel:'whisper',to:first.to,text:first.text}:null;
 // The mirror and production function must agree without modifying the real sender memory.
 deepStrictEqual(proposal,shareIntel(view,k,structuredClone(memory)));
 return {lastSentAt,cooldownRemainingMs,peers,friends:friends.map(f=>f.id),targets,pairs,proposal};
}
export function shareWitness(original:OriginalRecord,settings:Settings,observe=true){
 const decisions:Array<{player:string;at:number;beforeAppliedActions:number;view:PlayerView;events:ReturnType<typeof eventsFor>;known:Array<[string,string]>;candidates:Array<[string,string[]]>;intel:{lastSentAt:number;sent:Array<[string,Array<[string,string]>]>;reports:Array<[string,Array<[string,{character:string;at:number;seq:number}]>]>};diagnostic:ReturnType<typeof inspectOwnShare>;chosenCommunication:Action|null;memoryUnchanged:true;engineUnchanged:true}>=[];
 const pending=new Map<string,PlayerView>(),actions:Array<Record<string,unknown>>=[];
 let senderCalls=0,activeCalls=0,inactiveCalls=0;
 const options=original.variant==='reportedSupreme'?{reportedSupreme:true}:{};
 const remember=(s:Parameters<Policy>[0],id:string,a:Action|null)=>{if(a)pending.set(id,viewFor(s,id));return a;};
 const policy:Policy=(s,id,m,o)=>remember(s,id,smartBotAction(s,id,m,{...o,...options}));
 const chat:Policy=(s,id,m,o)=>{
  const eligible=m.communicationAt===s.now-s.startedAt;
  const a=botCommunicationAction(s,id,m,{...o,...options}),v=viewFor(s,id);remember(s,id,a);
  if(!['kilder','drakan'].includes(v.me.character))return a;
  senderCalls++;if(!eligible||s.phase!=='running'||!v.me.alive){inactiveCalls++;return a;}activeCalls++;
  if(observe){
   const before=structuredClone(m),stateHash=replayHash(s),memory=structuredClone(m),k=botKnowledge(s,id,v,memory,{learnOwnAttackOutcome:false});
   const diagnostic=inspectOwnShare(v,k,memory),intel=memory.perception!.intel!;
   deepStrictEqual(diagnostic.proposal,a,'observer proposal differs from actual sender choice');
   deepStrictEqual(m,before,'observer changed own memory/RNG');strictEqual(replayHash(s),stateHash,'observer changed engine');
   decisions.push({player:id,at:v.elapsedMs,beforeAppliedActions:actions.length,view:structuredClone(v),events:structuredClone(eventsFor(s,id)),known:[...k.known],candidates:[...k.candidates],
    intel:{lastSentAt:intel.lastSentAt,sent:[...intel.sent].map(([id,map])=>[id,[...map]]),reports:[...intel.reports].map(([id,map])=>[id,[...map]])},
    diagnostic,chosenCommunication:structuredClone(a),memoryUnchanged:true,engineUnchanged:true});
  }return a;
 };
 const game=playMatch(original.result.game.fixture,{current:policy,reference:policy},settings,(s,id,a,r)=>{
  const v=pending.get(id)!;if(!v)throw Error('missing own pre-action view');pending.delete(id);const after=viewFor(s,id);
  actions.push({player:id,at:v.elapsedMs,action:a,accepted:r.ok,error:r.ok?null:r.error??'알 수 없는 거절',beforeMana:v.me.mana,afterMana:after.me.mana,maxMana:v.me.maxMana,
   nominalMana:a.type==='skill'?v.me.skills.find(z=>z.key===a.skill)?.mana??0:0,character:v.me.character,side:v.me.side,beforeTrueName:v.me.trueName,beforePublished:v.me.published,receiptKinds:r.events.map(e=>e.kind)});
 },{current:chat,reference:chat});
 deepStrictEqual(game,original.result.game,'whole game differs');
 const keys=['player','at','action','accepted','error','beforeMana','afterMana','maxMana','nominalMana','character','side','beforeTrueName','beforePublished','receiptKinds'];
 deepStrictEqual(actions,original.result.actions.map(a=>Object.fromEntries(keys.map(k=>[k,(a as unknown as Record<string,unknown>)[k]]))),'full actions/resources/receipts differ');
 return {fixture:game.fixture,variant:original.variant,game,actionsSHA256:replayHash(actions),matchedActions:actions.length,wholeGameAndAllActionsMatched:true,senderCalls,activeCalls,inactiveCalls,decisions};
}
export function verifiedShareWitness(original:OriginalRecord,settings:Settings){
 const collector=playReportSelfplay(original.result.game.fixture,original.variant,settings,true);deepStrictEqual(collector,original,'full original collector differs');
 return {...shareWitness(original,settings),originalRecordSHA256:replayHash(original),originalCollectorMatched:true,originalCollectorPasses:1,witnessPasses:1};
}
