/** Evaluator only. Commands come from an immutable completed game, never from this trace. */
import {deepStrictEqual,strictEqual,ok} from 'node:assert';
import {createHash} from 'node:crypto';
import {advance,applyAction,viewFor,type GameState,type GameEvent,type Action} from '../src/index.js';
import {prepareMatch,type Fixture,type Settings} from './league-runner.js';
import {playReportSelfplay,type ReportVariant} from './report-selfplay.js';
export const COMMANDERS=new Set(['rael','kane','eltas']);
export const replayHash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
export type OriginalRecord=ReturnType<typeof playReportSelfplay>;
function ownDefense(s:GameState,id:string){
 const v=viewFor(s,id);
 return {player:id,at:v.elapsedMs,character:v.me.character,mana:v.me.mana,alive:v.me.alive,
  effects:structuredClone(v.me.effects),skills:structuredClone(v.me.skills)};
}
export function commanderSnapshot(s:GameState,includeOwn=true){
 return s.players.filter(p=>COMMANDERS.has(p.character)).map(p=>{
  // Grader-only actual protector state is separate from the commander's own view.
  const guard=p.character==='eltas'?'consume':p.character==='rael'?'kumarin':null,g=s.players.find(q=>q.character===guard);
  return {id:p.id,character:p.character,side:p.side,alive:p.alive,extraLives:p.extraLives,effects:structuredClone(p.effects),
   ownDefense:includeOwn?ownDefense(s,p.id):null,
   externalProtection:g?{scope:'evaluator_only' as const,guardian:g.id,character:g.character,alive:g.alive,
    bodyguard:g.skills.some(k=>k.key===guard+'_bodyguard'),charges:Number(g.flags.guardCharges??0),
    guardianOwnView:includeOwn?ownDefense(s,g.id):null}:null};
 });
}
type Snapshot=ReturnType<typeof commanderSnapshot>;
export interface Boundary {kind:'action'|'advance';at:number;actionIndex:number|null;actor:string|null;action:Action|null}
export function traceCommanderTransition(before:Snapshot,after:Snapshot,events:GameEvent[],boundary:Boundary){
 const deaths=before.filter(p=>p.alive&&!after.find(q=>q.id===p.id)!.alive);
 const deathEvents=events.filter(e=>e.kind==='death'&&COMMANDERS.has(String(e.data?.character)));
 strictEqual(deaths.length,deathEvents.length,'commander death transition/event count mismatch');
 const rows=deaths.map(p=>{
  const matching=deathEvents.filter(e=>e.data?.player===p.id&&e.data?.character===p.character);
  strictEqual(matching.length,1,'missing/duplicate death identity');ok(p.ownDefense,'missing pre-death own view');
  const e=matching[0]!;ok(typeof e.data?.cause==='string');
  return {victim:p.id,character:p.character,side:p.side,cause:String(e.data!.cause),deathSeq:e.seq,
   boundary:structuredClone(boundary),before:structuredClone(p),after:structuredClone(after.find(q=>q.id===p.id)!),events:structuredClone(events)};
 });
 const changed=before.some(p=>{const q=after.find(z=>z.id===p.id)!;return p.alive!==q.alive||p.extraLives!==q.extraLives||replayHash(p.effects)!==replayHash(q.effects);});
 const commanderAttack=events.some(e=>e.kind.startsWith('attack.')&&before.some(p=>e.data?.target===p.id||e.data?.target===p.character));
 return {deaths:rows,transition:changed||commanderAttack?{boundary:structuredClone(boundary),before:structuredClone(before),after:structuredClone(after),events:structuredClone(events)}:null};
}
/** No bot is called here. Own views are diagnostic output, not decision inputs. */
export function replayCommands(original:OriginalRecord,settings:Settings,observe=true){
 const {state:s,controllers}=prepareMatch(original.result.game.fixture),actions=original.result.actions;
 deepStrictEqual(s.players.map(p=>({id:p.id,character:p.character,side:p.side})),original.roles);
 const deaths:ReturnType<typeof traceCommanderTransition>['deaths']=[],transitions:NonNullable<ReturnType<typeof traceCommanderTransition>['transition']>[]=[];
 let index=0,ticks=0,receipts=0;
 const inspect=(before:Snapshot,logStart:number,b:Boundary)=>{
  if(!observe)return;const row=traceCommanderTransition(before,commanderSnapshot(s,false),s.log.slice(logStart),b);
  deaths.push(...row.deaths);if(row.transition)transitions.push(row.transition);
 };
 for(let now=settings.tickMs;s.phase==='running'&&now<=settings.limitMs;now+=settings.tickMs){
  // advance can only execute a queued transition when a task is due. Still inspect every tick.
  const due=s.queue.some(t=>t.at<=now),before=observe?commanderSnapshot(s,due):[],seq=s.log.length;
  advance(s,now);ticks++;inspect(before,seq,{kind:'advance',at:now,actionIndex:null,actor:null,action:null});
  let lastPosition=-1;
  while(index<actions.length&&actions[index]!.at===now){
   const a=actions[index]!,pos=s.players.findIndex(p=>p.id===a.player);
   ok(pos>=lastPosition,'out-of-order recorded player action');lastPosition=pos;
   ok(s.phase==='running'&&s.players[pos]!.alive,'recorded action by dead actor or after game');
   const v=viewFor(s,a.player),own=observe?commanderSnapshot(s):[],actionSeq=s.log.length;
   strictEqual(a.character,v.me.character);strictEqual(a.side,v.me.side);strictEqual(a.beforeMana,v.me.mana);strictEqual(a.maxMana,v.me.maxMana);
   strictEqual(a.beforeTrueName,v.me.trueName);strictEqual(a.beforePublished,v.me.published);
   const act=a.action;strictEqual(a.nominalMana,act.type==='skill'?v.me.skills.find(z=>z.key===act.skill)?.mana??0:0);
   const r=applyAction(s,a.player,structuredClone(a.action),now),after=viewFor(s,a.player);
   strictEqual(r.ok,a.accepted,'receipt accepted mismatch');strictEqual(r.ok?null:r.error??'알 수 없는 거절',a.error);
   strictEqual(after.me.mana,a.afterMana,'receipt mana mismatch');deepStrictEqual(r.events.map(e=>e.kind),a.receiptKinds,'receipt events mismatch');receipts++;
   inspect(own,actionSeq,{kind:'action',at:now,actionIndex:index,actor:a.player,action:a.action});index++;
  }
  ok(index===actions.length||actions[index]!.at>now,'missed recorded action timestamp');
 }
 strictEqual(index,actions.length,'unreplayed actions');
 const g=original.result.game;strictEqual(s.winner,g.winner);strictEqual(s.now,g.elapsedMs);strictEqual(s.endReason??'시간 제한',g.reason);
 deepStrictEqual(s.players.map(p=>({character:p.character,controller:controllers.get(p.id)!,alive:p.alive})),g.survivors);
 if(observe){
  const finalDead=s.players.filter(p=>COMMANDERS.has(p.character)&&!p.alive).map(p=>p.id).sort();
  deepStrictEqual(deaths.map(d=>d.victim).sort(),finalDead,'all commander deaths must be traced exactly once');
 }
 return {fixture:g.fixture,variant:original.variant,winner:s.winner,elapsedMs:s.now,ticks,receipts,allOriginalActionsMatched:true,
  finalCommanders:s.players.filter(p=>COMMANDERS.has(p.character)).map(p=>({id:p.id,character:p.character,alive:p.alive,diedAt:p.diedAt})),
  fullStateSHA256:replayHash(s),engineLogSHA256:replayHash(s.log),engineEvents:s.log.length,deaths,transitions};
}
export function replayDeathRecord(original:OriginalRecord,settings:Settings){
 const replay=playReportSelfplay(original.result.game.fixture,original.variant as ReportVariant,settings,true);
 deepStrictEqual(replay,original,'original full policy game/actions/resources/opportunities mismatch');
 return {...replayCommands(original,settings),originalRecordSHA256:replayHash(original),originalPolicyMatched:true,
  policyResultSHA256:replayHash(replay),policyReplayPasses:1,commandReplayPasses:1};
}
