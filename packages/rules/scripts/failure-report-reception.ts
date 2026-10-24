/** Replay-only observation of selected actual reports. No policy changes or new games in the research count. */
import {createHash} from 'node:crypto';
import {deepStrictEqual,strictEqual,ok} from 'node:assert';
import {smartBotAction,botCommunicationAction,updateBotKnowledge,viewFor,eventsFor,serializeHostMemories,
 type BotMemory,type PlayerView,type GameEvent,type Knowledge} from '../src/index.js';
import {trustedIntel} from '../src/bot-intel.js';
import {smartBotAction as previous} from './baselines/pre-cooperative.js';
import {playMatch,DEFAULT_SETTINGS,type Settings,type Policy} from './league-runner.js';
import {opponentClaim} from './claim-opponents.js';
import {FAILURE_OPTIONS,type playFailureDevelopment} from './failure-development.js';
import {storeHash} from './cooperative-store.js';

type Row=ReturnType<typeof playFailureDevelopment>;
const wire=(id:string,m:BotMemory)=>serializeHostMemories(new Map([[id,m]]));
type Subscription={ordinal:number;sender:string;recipient:string;target:string;name:string;at:number;
 event:GameEvent;firstConsumed:unknown|null;transitions:any[];actions:any[];lastSignature:string|null};

/** Selection uses actual accepted reports and earlier own-inference evidence, never winners. */
export function failureReportOrdinals(row:Row):number[]{
 if(row.variant!=='candidate')return [];
 return row.actions.flatMap((a,ordinal)=>a.accepted&&a.action.type==='chat'&&a.action.channel==='whisper'&&a.reportTarget&&
  a.reportKnown===a.reportedName&&row.probes.some(p=>p.actor===a.player&&p.at<=a.at&&p.ordinal<=ordinal&&
   p.newExact.some(([target,name]:[string,string])=>target===a.reportTarget&&name===a.reportedName))?[ordinal]:[]);
}

/** The caller must verify/freeze the source record first. Both complete output and per-call actual memory/RNG must match it. */
export function replayFailureReportReception(original:Row,selected:number[],settings:Settings=DEFAULT_SETTINGS,identicalPolicy=false){
 ok(selected.length>0,'at least one actual report required');
 deepStrictEqual(selected,[...new Set(selected)].sort((a,b)=>a-b),'ordered unique ordinals required');
 for(const ordinal of selected){const a=original.actions[ordinal];ok(a?.accepted&&a.action.type==='chat'&&a.action.channel==='whisper'&&a.action.to&&a.reportTarget&&a.reportedName,'selected command must be an accepted structured whisper');}
 const options=FAILURE_OPTIONS[original.variant],pending=new Map<string,{view:PlayerView;known:Map<string,string>;stage:string}>();
 const actions:any[]=[],subscriptions:Subscription[]=[],memoryHash=createHash('sha256');
 const knowledge=(v:PlayerView,m:BotMemory,enabled:boolean):Knowledge|null=>m.perception?updateBotKnowledge(v,[],structuredClone(m),enabled?options:{}):null;
 const status=(v:PlayerView,m:BotMemory,k:Knowledge|null,x:Subscription)=>({
  storedReport:m.perception?.intel?.reports.get(x.target)?.get(x.sender)??null,
  storedKnownTarget:m.perception?.known.get(x.target)??null,workingKnownTarget:k?.known.get(x.target)??null,
  workingKnownSender:k?.known.get(x.sender)??null,targetCandidates:k?.candidates.get(x.target)??[],
  trustedName:k?trustedIntel(v,k,m).get(x.target)??null:null,
  targetAlive:v.players.find(p=>p.id===x.target)?.alive??false,senderAlive:v.players.find(p=>p.id===x.sender)?.alive??false,
 });
 const wrap=(fn:Policy,stage:string,current:boolean):Policy=>(s,id,m,o)=>{
  const enabled=current||identicalPolicy,v=viewFor(s,id),watch=subscriptions.filter(x=>x.recipient===id);
  const pre=watch.length?structuredClone(m):null;
  const incoming=pre?eventsFor(s,id,pre.perception?.lastSeq??0).filter(e=>e.vis.to==='all'||e.vis.to==='players'&&e.vis.ids.includes(id)):[];
  const a=fn(s,id,m,{...o,...(enabled?options:{})});
  memoryHash.update(JSON.stringify([id,v.elapsedMs,stage,a,wire(id,m)]));
  const k=knowledge(v,m,enabled);if(a)pending.set(id,{view:v,known:k?.known??new Map(),stage});
  if(watch.length&&v.phase==='running'&&v.me.alive&&m.perception?.lastElapsedMs===v.elapsedMs){
   const actualMemory=storeHash(JSON.stringify(wire(id,m)));
   for(const x of watch){
    const after=status(v,m,k,x),signature=JSON.stringify(after);
    if(after.storedReport?.seq===x.event.seq&&x.firstConsumed===null){
     ok(pre);ok(incoming.some(e=>e.seq===x.event.seq),'first storage must come from recipient-visible new events');
     x.firstConsumed={at:v.elapsedMs,stage,ordinal:actions.length,chosenAction:a,
      view:structuredClone(v),events:structuredClone(incoming),preMemory:wire(id,pre),postMemory:wire(id,m),
      preCallWorkingKnowledgeFromCurrentOwnView:status(v,pre,knowledge(v,pre,enabled),x),after};
    }
    if(signature!==x.lastSignature){x.transitions.push({at:v.elapsedMs,stage,ordinal:actions.length,...after,
     view:structuredClone(v),events:structuredClone(incoming),preMemory:wire(id,pre!),postMemory:wire(id,m)});x.lastSignature=signature;}
   }
   strictEqual(storeHash(JSON.stringify(wire(id,m))),actualMemory,'observation changed actual recipient memory');
  }
  return a;
 };
 const reference:Policy=(s,id,m,o)=>{const a=previous(s,id,m,{activity:o.activity});return a?.type==='skill'&&a.skill==='publish'?{...a,name:opponentClaim(viewFor(s,id),m,original.style,a.name)}:a;};
 const own:Policy=original.variant==='baseline'?((s,id,m,o)=>previous(s,id,m,{activity:o.activity})):smartBotAction;
 const current=wrap(own,'primary',true),ref=wrap(identicalPolicy?own:reference,'primary',false);
 const chat=wrap(botCommunicationAction,'chat',true),refChat=wrap(botCommunicationAction,'chat',false);
 const game=playMatch(original.fixture,{current,reference:ref},settings,(s,id,a,result)=>{
  const b=pending.get(id);ok(b);pending.delete(id);const after=viewFor(s,id),ordinal=actions.length;
  const match=a.type==='chat'?/^확인 정보: \[(\d{1,2})\] (.+)$/.exec(a.text):null;
  const reportTarget=match?b.view.players.find(p=>p.seat===Number(match[1]))?.id??null:null;
  const reportedName=match?b.view.roster.find(r=>r.name===match[2])?.key??null:null;
  const recorded={player:id,at:b.view.elapsedMs,stage:b.stage,action:a,accepted:result.ok,error:result.ok?null:result.error,
   side:b.view.me.side,character:b.view.me.character,beforeMana:b.view.me.mana,afterMana:after.me.mana,maxMana:b.view.me.maxMana,
   nominalMana:a.type==='skill'?b.view.me.skills.find(x=>x.key===a.skill)?.mana??0:0,receiptKinds:result.events.map(e=>e.kind),
   reportTarget,reportedName,reportKnown:reportTarget?b.known.get(reportTarget)??null:null,reportActual:reportTarget?s.players.find(p=>p.id===reportTarget)!.character:null};
  actions.push(recorded);
  for(const x of subscriptions.filter(x=>x.recipient===id))if(a.type==='skill'&&(a.target===x.target||a.target===x.sender))
   x.actions.push({ordinal,at:b.view.elapsedMs,action:a,accepted:result.ok,receiptKinds:recorded.receiptKinds,
    relation:a.target===x.target?'reported-target':'report-sender',knownAtChoice:b.known.get(a.target)??null});
  if(selected.includes(ordinal)){
   ok(a.type==='chat'&&a.channel==='whisper'&&a.to&&reportTarget&&reportedName);
   const emitted=result.events.filter(e=>e.kind==='chat.whisper'&&e.data?.from===id&&e.data?.to===a.to&&e.data?.text===a.text);
   strictEqual(emitted.length,1);const event=emitted[0]!;
   ok(event.vis.to==='players'&&event.vis.ids.includes(a.to));
   subscriptions.push({ordinal,sender:id,recipient:a.to,target:reportTarget,name:reportedName,at:b.view.elapsedMs,
    event:structuredClone(event),firstConsumed:null,transitions:[],actions:[],lastSignature:null});
  }
 },original.variant==='baseline'?{}:identicalPolicy?{current:chat,reference:refChat}:{current:chat});
 deepStrictEqual(game,original.game,'replay changed whole game');deepStrictEqual(actions,original.actions,'replay changed any actual command/receipt/resource/report');
 const trace=memoryHash.digest('hex');strictEqual(trace,original.memoryTraceSHA256,'replay changed actual per-call memory/RNG');
 strictEqual(subscriptions.length,selected.length);
 return {fixture:original.fixture,style:original.style,variant:original.variant,identicalPolicy,newResearchExecutions:0,
  matchedActions:actions.length,actionsSHA256:storeHash(JSON.stringify(actions)),memoryTraceSHA256:trace,wholeGameMatched:true,
  reports:subscriptions.map(({lastSignature,...x})=>x),
  limitations:['Replay observations do not count as new independent games.','Report storage and trust are separate from exact identity knowledge.',
   'Pre-call working knowledge is recomputed from the current own view and pre-call memory, without new private events.',
   'Later actions are temporal associations; this replay does not estimate causal report value or a counterfactual win.']};
}
