/** Evaluate complete identical-policy games. Hidden commander state is grading only. */
import {deepStrictEqual,strictEqual,ok} from 'node:assert';
import {advance,applyAction,viewFor} from '../src/index.js';
import {prepareMatch,type Settings} from './league-runner.js';
import {playFailureSelfplay} from './failure-selfplay.js';
import {COMMANDERS,commanderSnapshot,traceCommanderTransition,replayHash,type Boundary} from './commander-death-replay.js';
type OriginalRecord=ReturnType<typeof playFailureSelfplay>;
type Snapshot=ReturnType<typeof commanderSnapshot>;
/** No bot is called here. Own views are diagnostic output, not decision inputs. */
export function replayFailureCommanderCommands(original:OriginalRecord,settings:Settings,observe=true){
 strictEqual(original.fixture.mode,'primordial');
 const {state:s,controllers}=prepareMatch(original.fixture),actions=original.actions;
 deepStrictEqual(s.players.map(p=>({id:p.id,character:p.character,side:p.side})),original.roles.map(p=>({id:p.id,character:p.character,side:p.side})));
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
   const act=a.action;strictEqual(a.nominalMana,act.type==='skill'?v.me.skills.find(z=>z.key===act.skill)?.mana??0:0);
   const r=applyAction(s,a.player,structuredClone(a.action),now),after=viewFor(s,a.player);
   strictEqual(r.ok,a.accepted,'receipt accepted mismatch');strictEqual(r.ok?null:r.error??'알 수 없는 거절',a.error);
   strictEqual(after.me.mana,a.afterMana,'receipt mana mismatch');deepStrictEqual(r.events.map(e=>e.kind),a.receiptKinds,'receipt events mismatch');receipts++;
   inspect(own,actionSeq,{kind:'action',at:now,actionIndex:index,actor:a.player,action:a.action});index++;
  }
  ok(index===actions.length||actions[index]!.at>now,'missed recorded action timestamp');
 }
 strictEqual(index,actions.length,'unreplayed actions');
 const g=original.game;strictEqual(s.winner,g.winner);strictEqual(s.now,g.elapsedMs);strictEqual(s.endReason??'시간 제한',g.reason);
 deepStrictEqual(s.players.map(p=>({character:p.character,controller:controllers.get(p.id)!,alive:p.alive})),g.survivors);
 if(observe){
  const finalDead=s.players.filter(p=>COMMANDERS.has(p.character)&&!p.alive).map(p=>p.id).sort();
  deepStrictEqual(deaths.map(d=>d.victim).sort(),finalDead,'all commander deaths must be traced exactly once');
 }
 return {fixture:g.fixture,variant:original.variant,winner:s.winner,elapsedMs:s.now,ticks,receipts,allOriginalActionsMatched:true,
  finalCommanders:s.players.filter(p=>COMMANDERS.has(p.character)).map(p=>({id:p.id,character:p.character,alive:p.alive,diedAt:p.diedAt})),
  fullStateSHA256:replayHash(s),engineLogSHA256:replayHash(s.log),engineEvents:s.log.length,deaths,transitions};
}
export function replayFailureCommanderDeaths(original:OriginalRecord,settings:Settings){
 const replay=playFailureSelfplay(original.fixture,original.variant,settings,true);
 deepStrictEqual(replay,original,'original full policy game/actions/resources/opportunities mismatch');
 return {...replayFailureCommanderCommands(original,settings),originalRecordSHA256:replayHash(original),originalPolicyMatched:true,
  policyResultSHA256:replayHash(replay),policyReplayPasses:1,commandReplayPasses:1,
  memoryTraceSHA256:replay.memoryTraceSHA256,newResearchExecutions:0,style:original.style};
}
