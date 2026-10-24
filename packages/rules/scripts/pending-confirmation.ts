/** 057 evaluator only: own accepted delayed receipts, never engine queues or hidden identities. */
import {deepStrictEqual,strictEqual,ok} from 'node:assert';
import {smartBotAction,botCommunicationAction,botKnowledge,eventsFor,viewFor,type GameEvent,type GameState,type Action,type PlayerView} from '../src/index.js';
import {createBotMemory,updateBotKnowledge} from '../src/bot-memory.js';
import {nextRandom} from '../src/rng.js';
import {smartBotAction as previous} from './baselines/pre-cooperative.js';
import {opponentClaim} from './claim-opponents.js';
import {playMatch,type Settings,type Policy} from './league-runner.js';
import {SENDER_OPTIONS,playSenderDevelopment} from './sender-development.js';
import {hash,type Record055} from './troll-regression-replay.js';
export const EXTRA_CHECKS=new Set(['truth_gem','ally_check','enemy_check','advanced_ally_check','advanced_enemy_check','scan','ally_scan','enemy_scan','advanced_scan','troll_scan','troll_ally_scan','troll_enemy_scan']);
const personal=(e:GameEvent,id:string)=>e.vis.to==='players'&&e.vis.ids.includes(id);
export function pendingOwn(events:GameEvent[],id:string,at:number){
 return events.filter(e=>e.kind==='skill.chaos_hex.self'&&personal(e,id)&&typeof e.data?.target==='string'&&e.at<=at&&at<e.at+60000&&!events.some(r=>r.kind==='skill.chaos_hex.result'&&personal(r,id)&&r.data?.target===e.data?.target&&r.seq>e.seq&&r.at<=at)).map(e=>({target:String(e.data!.target),at:e.at,due:e.at+60000,receiptSeq:e.seq}));
}
export function pendingReplay(original:Record055,settings:Settings,observe=true){
 const options=original.variant==='candidate'?SENDER_OPTIONS:{},pendingViews=new Map<string,PlayerView>(),actions:any[]=[],choices:any[]=[],extra:any[]=[],requests:any[]=[],receipts:any[]=[];
 const requesterSeq=new Map<string,number>();
 const collect=(s:GameState)=>{if(!observe)return;for(const [id,last] of requesterSeq){const ev=eventsFor(s,id,last);for(const e of ev)if(personal(e,id)&&['skill.chaos_hex.self','skill.chaos_hex.result'].includes(e.kind))receipts.push({actor:id,actorAlive:viewFor(s,id).me.alive,event:structuredClone(e)});requesterSeq.set(id,s.seq);}};
 const remember=(s:GameState,id:string,a:Action|null)=>{if(a)pendingViews.set(id,viewFor(s,id));return a;};
 const current:Policy=(s,id,m,o)=>{
  const active=nextRandom({rng:m.rng})<=(o.activity??.5);let ev:GameEvent[]=[];
  if(observe&&active)ev=eventsFor(s,id);
  const waiting=pendingOwn(ev,id,s.now-s.startedAt);
  if(!waiting.length)return remember(s,id,smartBotAction(s,id,m,{...o,...options}));
  const pre=structuredClone(m),stateHash=hash(s),v=viewFor(s,id),copy=structuredClone(m),k=botKnowledge(s,id,v,copy,{learnOwnAttackOutcome:false}),rebuilt=updateBotKnowledge(v,ev,createBotMemory(0),{learnOwnAttackOutcome:false});
  deepStrictEqual(k.known,rebuilt.known);deepStrictEqual(k.candidates,rebuilt.candidates);
  const shadow=structuredClone(pre),expected=smartBotAction(s,id,shadow,{...o,...options});deepStrictEqual(m,pre);strictEqual(hash(s),stateHash);
  const a=smartBotAction(s,id,m,{...o,...options});deepStrictEqual(a,expected);deepStrictEqual(m,shadow);
  for(const [target,name] of k.known)strictEqual(s.players.find(p=>p.id===target)?.character,name,'external post-choice known grade');
  choices.push({player:id,at:v.elapsedMs,ordinal:actions.length,waiting,view:structuredClone(v),events:structuredClone(ev),known:[...k.known],candidates:[...k.candidates],chosenAction:a,memoryAndEngineUnchanged:true,ownKnowledgeRebuilt:true});
  return remember(s,id,a);
 };
 const reference:Policy=(s,id,m,o)=>{const a=previous(s,id,m,{activity:o.activity});return remember(s,id,a?.type==='skill'&&a.skill==='publish'?{...a,name:opponentClaim(viewFor(s,id),m,original.style,a.name)}:a);};
 const chat:Policy=(s,id,m,o)=>remember(s,id,botCommunicationAction(s,id,m,{...o,...options}));
 const game=playMatch(original.fixture,{current,reference},settings,(s,id,a,r)=>{
  const v=pendingViews.get(id)!;ok(v);pendingViews.delete(id);const after=viewFor(s,id),ordinal=actions.length;
  actions.push({player:id,at:v.elapsedMs,action:a,accepted:r.ok,error:r.ok?null:r.error??'unknown rejection',side:v.me.side,character:v.me.character,beforeMana:v.me.mana,afterMana:after.me.mana,maxMana:v.me.maxMana,nominalMana:a.type==='skill'?v.me.skills.find(z=>z.key===a.skill)?.mana??0:0,receiptKinds:r.events.map(e=>e.kind)});
  if(observe&&v.me.side===original.fixture.currentSide&&a.type==='skill'){
   if(a.skill==='chaos_hex'&&r.ok){ok(r.events.some(e=>e.kind==='skill.chaos_hex.self'&&personal(e,id)&&e.data?.target===a.target));requests.push({actor:id,target:a.target,at:v.elapsedMs,due:v.elapsedMs+60000,ordinal});if(!requesterSeq.has(id))requesterSeq.set(id,0);}
   const choice=choices.find(c=>c.ordinal===ordinal&&c.player===id&&c.at===v.elapsedMs&&c.chosenAction!==null);
   const matches=choice?.waiting.filter((w:any)=>w.target===a.target)??[];
   if(EXTRA_CHECKS.has(a.skill)&&matches.length){const clone=structuredClone(s),k=botKnowledge(clone,id,viewFor(clone,id),createBotMemory(0),{learnOwnAttackOutcome:false});extra.push({ordinal,actor:id,target:a.target,at:v.elapsedMs,action:a,accepted:r.ok,knownBefore:choice.known.find((z:any)=>z[0]===a.target)?.[1]??null,knownAfter:k.known.get(a.target!)??null,ownEvents:r.events.filter(e=>e.vis.to==='all'||personal(e,id)),beforeMana:v.me.mana,afterMana:after.me.mana});}
  }
  collect(s);
 },{current:chat},collect);
 // Result knowledge is rebuilt from complete own events; no actual bot memory is exposed to diagnostics.
 deepStrictEqual(game,original.game);const keys=Object.keys(actions[0]??{});deepStrictEqual(actions,original.actions.map(a=>Object.fromEntries(keys.map(k=>[k,(a as any)[k]]))));
 return {fixture:original.fixture,style:original.style,variant:original.variant,game,matchedActions:actions.length,actionsSHA256:hash(actions),wholeGameAndReceiptsMatched:true,requests,choices,extra,receipts};
}
export function verifiedPendingReplay(r:Record055,settings:Settings){
 deepStrictEqual(playSenderDevelopment(r.fixture,r.style,r.variant,settings,true),r);
 const on=pendingReplay(r,settings),off=pendingReplay(r,settings,false);deepStrictEqual({...on,requests:[],choices:[],extra:[],receipts:[]},off);
 return {...on,originalCollectorMatched:true,observerOnOffMatched:true};
}
