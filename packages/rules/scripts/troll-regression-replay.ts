/** Evaluation-only round056: frozen trajectories, never policy tuning or truth-driven choices. */
import {deepStrictEqual,strictEqual,ok} from 'node:assert';
import {smartBotAction,botCommunicationAction,botKnowledge,viewFor,eventsFor,advance,applyAction,type Action,type BotMemory,type GameState,type PlayerView} from '../src/index.js';
import {createBotMemory,updateBotKnowledge} from '../src/bot-memory.js';
import {nextRandom} from '../src/rng.js';
import {trustedIntel} from '../src/bot-intel.js';
import {NAME_ATTACKS} from '../src/bot-tactics.js';
import {KNOWN_ATTACK_GUARDS} from '../src/bot-attack-budget.js';
import {smartBotAction as previous} from './baselines/pre-cooperative.js';
import {opponentClaim} from './claim-opponents.js';
import {playMatch,prepareMatch,type Policy,type Settings} from './league-runner.js';
import {playSenderDevelopment,SENDER_OPTIONS} from './sender-development.js';
import {inspectSenderArbitration} from './sender-arbitration-witness.js';
import {storeHash} from './cooperative-store.js';
export type Record055=ReturnType<typeof playSenderDevelopment>;
export const hash=(x:unknown)=>storeHash(JSON.stringify(x));
export function firstSignal(r:Record055){return r.decisions.find(d=>d.changed||d.originalAfterRng!==d.chosenAfterRng)??null;}
/** Own-input public-rule attack candidates, not a claim that this policy stage is reached. */
export function readyKnownAttacks(v:PlayerView,known:Map<string,string>){
 const dead=new Set(v.players.filter(p=>!p.alive&&p.revealed).map(p=>p.revealed!)),guards=KNOWN_ATTACK_GUARDS[v.mode]??{};
 return v.me.skills.filter(s=>NAME_ATTACKS.includes(s.key)&&!s.passive&&s.blocked===null).flatMap(s=>v.players.filter(p=>p.id!==v.me.id&&p.alive&&!p.statuses.some(e=>e.kind==='invulnerable')&&known.has(p.id)&&v.roster.some(r=>r.key===known.get(p.id)&&r.side!==v.me.side)&&s.nameOptions?.includes(known.get(p.id)!)&&!(guards[known.get(p.id)!]??[]).some(g=>!dead.has(g))).map(p=>({skill:s.key,target:p.id,name:known.get(p.id)!,mana:s.mana})));
}
export function observeTrajectory(original:Record055,settings:Settings,cutoff:number,observe=true){
 const options=original.variant==='candidate'?SENDER_OPTIONS:{},pending=new Map<string,PlayerView>(),actions:any[]=[],choices:any[]=[];
 const remember=(s:GameState,id:string,a:Action|null)=>{if(a)pending.set(id,viewFor(s,id));return a;};
 const current:Policy=(s,id,m,o)=>{
  const active=nextRandom({rng:m.rng})<=(o.activity??.5);
  if(!observe||!active||actions.length<cutoff)return remember(s,id,smartBotAction(s,id,m,{...o,...options}));
  const pre=structuredClone(m),stateBefore=hash(s),v=viewFor(s,id),copy=structuredClone(pre),k=botKnowledge(s,id,v,copy,{learnOwnAttackOutcome:false}),ev=eventsFor(s,id);
  const rebuilt=updateBotKnowledge(v,ev,createBotMemory(0),{learnOwnAttackOutcome:false});deepStrictEqual(k.known,rebuilt.known);deepStrictEqual(k.candidates,rebuilt.candidates);
  const diagnostic=inspectSenderArbitration(v,k,copy),ready=readyKnownAttacks(v,k.known),shadow=structuredClone(pre),expected=smartBotAction(s,id,shadow,{...o,...options});
  deepStrictEqual(m,pre);strictEqual(hash(s),stateBefore,'own observer mutated engine');
  const a=smartBotAction(s,id,m,{...o,...options});deepStrictEqual(a,expected);deepStrictEqual(m,shadow,'observer changed full actual memory/RNG');
  // Actual assignment can be read only now, after selection, for external grading.
  const wrongKnown=[...k.known].filter(([target,name])=>s.players.find(p=>p.id===target)?.character!==name);strictEqual(wrongKnown.length,0);
  choices.push({player:id,at:v.elapsedMs,ordinal:actions.length,view:structuredClone(v),events:structuredClone(ev),known:[...k.known],candidates:[...k.candidates],storedKnown:[...(copy.perception?.known??[])],trusted:[...trustedIntel(v,k,copy)],diagnostic,readyKnownAttacks:ready,chosenAction:a,preRng:pre.rng,afterRng:m.rng,ownInputRebuilt:true,memoryAndEngineUnchanged:true,wrongKnown});
  return remember(s,id,a);
 };
 const reference:Policy=(s,id,m,o)=>{const a=previous(s,id,m,{activity:o.activity});return remember(s,id,a?.type==='skill'&&a.skill==='publish'?{...a,name:opponentClaim(viewFor(s,id),m,original.style,a.name)}:a);};
 const chat:Policy=(s,id,m,o)=>remember(s,id,botCommunicationAction(s,id,m,{...o,...options}));
 const game=playMatch(original.fixture,{current,reference},settings,(s,id,a,r)=>{
  const v=pending.get(id)!;ok(v);pending.delete(id);const after=viewFor(s,id);
  actions.push({player:id,at:v.elapsedMs,action:a,accepted:r.ok,error:r.ok?null:r.error??'unknown rejection',side:v.me.side,character:v.me.character,beforeMana:v.me.mana,afterMana:after.me.mana,maxMana:v.me.maxMana,nominalMana:a.type==='skill'?v.me.skills.find(z=>z.key===a.skill)?.mana??0:0,receiptKinds:r.events.map(e=>e.kind)});
 },{current:chat});
 deepStrictEqual(game,original.game);const keys=Object.keys(actions[0]??{});deepStrictEqual(actions,original.actions.map(a=>Object.fromEntries(keys.map(k=>[k,(a as any)[k]]))));
 return {game,matchedActions:actions.length,actionsSHA256:hash(actions),wholeGameAndReceiptsMatched:true,choices};
}
function mechanics(s:GameState){return s.players.map(p=>({id:p.id,character:p.character,side:p.side,alive:p.alive,diedAt:p.diedAt,mana:p.mana,extraLives:p.extraLives,gem:p.gem,published:p.published,allies:structuredClone(p.allies),flags:structuredClone(p.flags),effects:structuredClone(p.effects),skills:structuredClone(p.skills)}));}
/** No bots here: immutable commands are replayed; grader snapshots never become policy inputs. */
export function commandTrace(original:Record055,settings:Settings,cutoff:number,observe=true){
 const {state:s,controllers}=prepareMatch(original.fixture),rows:any[]=[];let index=0;
 const boundary=(kind:'advance'|'action',actor:string|null,action:Action|null,run:()=>void)=>{
  const seq=s.seq,before=observe&&index>=cutoff?mechanics(s):null;run();
  if(before&&(s.seq!==seq||hash(before)!==hash(mechanics(s))))rows.push({kind,at:s.now,ordinal:index,actor,action,before,after:mechanics(s),events:structuredClone(s.log.filter(e=>e.seq>seq))});
 };
 for(let now=settings.tickMs;s.phase==='running'&&now<=settings.limitMs;now+=settings.tickMs){
  if(s.queue.some(t=>t.at<=now))boundary('advance',null,null,()=>advance(s,now));else advance(s,now);
  let position=-1;
  while(index<original.actions.length&&original.actions[index]!.at===now){
   const a=original.actions[index]!,pos=s.players.findIndex(p=>p.id===a.player);ok(pos>=position);position=pos;ok(s.phase==='running'&&s.players[pos]!.alive);
   const v=viewFor(s,a.player);strictEqual(v.me.mana,a.beforeMana);strictEqual(v.me.character,a.character);strictEqual(v.me.side,a.side);strictEqual(v.me.maxMana,a.maxMana);
   const act=a.action;strictEqual(a.nominalMana,act.type==='skill'?v.me.skills.find(z=>z.key===act.skill)?.mana??0:0);
   boundary('action',a.player,a.action,()=>{const r=applyAction(s,a.player,structuredClone(a.action),now);strictEqual(r.ok,a.accepted);strictEqual(r.ok?null:r.error??'unknown rejection',a.error);strictEqual(viewFor(s,a.player).me.mana,a.afterMana);deepStrictEqual(r.events.map(e=>e.kind),a.receiptKinds);});index++;
  }
  ok(index===original.actions.length||original.actions[index]!.at>now);
 }
 strictEqual(index,original.actions.length);strictEqual(s.winner,original.game.winner);strictEqual(s.now,original.game.elapsedMs);strictEqual(s.endReason??'시간 제한',original.game.reason);
 deepStrictEqual(s.players.map(p=>({character:p.character,controller:controllers.get(p.id)!,alive:p.alive})),original.game.survivors);
 return {receipts:index,terminalSHA256:hash(s),engineLogSHA256:hash(s.log),final:mechanics(s),rows};
}
