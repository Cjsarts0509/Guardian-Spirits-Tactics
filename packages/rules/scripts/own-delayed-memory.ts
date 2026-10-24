/** Round058 evaluator only. No production policy or memory changes. */
import {createHash} from 'node:crypto';
import {deepStrictEqual,strictEqual,ok} from 'node:assert';
import {
  createGame,createBotMemory,updateBotKnowledge,eventsFor,viewFor,advance,playerLeft,
  encodeHostSnapshot,decodeHostSnapshot,encodeHostFrame,readHostWire,serializeHostMemories,
  applyHostInputs,tickHost,smartBotAction,
  type HostSnapshot,type GameEvent,type PlayerView,type BotMemory,
} from '../src/index.js';
import {pendingOwn} from './pending-confirmation.js';

export const ROLES058=['chis','satoshi','zwinra','hachi','tokra','uldian','ulpian','deka','neonis','kanulla','kazrow','seirow'];
export const CAST058=1000,DUE058=61000;
export const digest058=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const own=(e:GameEvent,id:string)=>e.vis.to==='all'||e.vis.to==='players'&&e.vis.ids.includes(id);
const normalized=(s:HostSnapshot)=>decodeHostSnapshot(encodeHostSnapshot(s));
const memoryWire=(id:string,m:BotMemory)=>serializeHostMemories(new Map([[id,m]]));

/** Explicit synthetic assignment and mana setup; real engine handles all commands/results. */
export function fixture058(target='neonis',publish=true){
  const players=ROLES058.map((_,i)=>({id:`u${i+1}`,nickname:`fixture${i+1}`}));
  const ids=Object.fromEntries(ROLES058.map((c,i)=>[c,players[i]!.id]));
  const {state}=createGame({mode:'troll',players,seed:900258,now:0,
    assignment:Object.fromEntries(ROLES058.map((c,i)=>[players[i]!.id,c]))});
  const actor=ids.kanulla!;
  state.players.find(p=>p.id===actor)!.mana=150;
  const snapshot:HostSnapshot={version:1,state,memories:new Map([[actor,createBotMemory(258)]]),handled:0,records:[],results:[]};
  const initial=readHostWire(encodeHostSnapshot(snapshot)).snapshot;
  if(publish)applyHostInputs(snapshot,[{id:1,kind:'action',player:actor,action:{type:'skill',skill:'publish',name:'kanulla'}}],0);
  applyHostInputs(snapshot,[{id:publish?2:1,kind:'action',player:actor,action:{type:'skill',skill:'chaos_hex',target:ids[target]!}}],CAST058);
  strictEqual(snapshot.results.at(-1)!.ok,publish);
  return {snapshot,initial,ids,actor,target:ids[target]!,targetRole:target};
}

/** One legitimate incremental own-input observation, including failed outcomes without invented facts. */
export function readOwn058(s:HostSnapshot,id:string){
  const m=s.memories.get(id)!;
  const events=eventsFor(s.state,id,m.perception?.lastSeq??0).filter(e=>own(e,id));
  const v=viewFor(s.state,id),before=digest058(s.state),rng=m.rng;
  const k=updateBotKnowledge(v,events,m,{learnOwnAttackOutcome:false});
  strictEqual(digest058(s.state),before);strictEqual(m.rng,rng);
  return {view:v,events,known:[...k.known],candidates:[...k.candidates],memory:memoryWire(id,m)};
}

/** A concrete collision: distinct engine-accepted target histories, same own view and persistent memory. */
export function targetCollision058(){
  const a=fixture058('neonis'),b=fixture058('kazrow');
  const aa=readOwn058(a.snapshot,a.actor),bb=readOwn058(b.snapshot,b.actor);
  deepStrictEqual(aa.view,bb.view);deepStrictEqual(aa.memory,bb.memory);
  const pa=pendingOwn(aa.events,a.actor,CAST058),pb=pendingOwn(bb.events,b.actor,CAST058);
  strictEqual(pa.length,1);strictEqual(pb.length,1);ok(pa[0]!.target!==pb[0]!.target);
  const again=readOwn058(a.snapshot,a.actor);strictEqual(again.events.length,0);deepStrictEqual(again.memory,aa.memory);
  return {case:'distinct-accepted-targets',targets:[a.target,b.target],ownViewEqual:true,persistentMemoryEqual:true,
    ownReceipts:[aa.events.filter(e=>e.kind==='skill.chaos_hex.self'),bb.events.filter(e=>e.kind==='skill.chaos_hex.self')],
    eventDerivedPending:[pa,pb],ownViews:[aa.view,bb.view],memories:[aa.memory,bb.memory],incrementalNextEvents:again.events.length,
    cooldownRemainingMs:aa.view.me.skills.find(s=>s.key==='chaos_hex')!.cooldownRemainingMs};
}

export type Scenario058='success'|'failure'|'actor-left'|'target-left'|'end-before-due'|'rejected';
export function scenario058(kind:Scenario058){
  const f=fixture058(kind==='failure'?'satoshi':'neonis',kind!=='rejected');
  const {snapshot:s,actor,target}=f;
  let committed=f.initial,frame=0;
  const checkpoints:any[]=[];
  const observe=(stage:string)=>{
    // Ended/dead observations are diagnostic, not a claim that a living policy acts there.
    const input=readOwn058(s,actor),expected=normalized(s),before=encodeHostSnapshot(s);
    const full=decodeHostSnapshot(before),sent=encodeHostFrame(s,committed.state.log.length,committed.records.length,committed.memories,frame);
    committed=readHostWire(sent.checkpoint,{...committed,frame}).snapshot;frame++;
    const delta=decodeHostSnapshot(JSON.stringify(committed));
    deepStrictEqual(full,expected);deepStrictEqual(delta,expected);
    const probes=[s,full,delta].map(x=>{
      const clone=normalized(x),m=clone.memories.get(actor)!,stateBefore=digest058(clone.state);
      const action=smartBotAction(clone.state,actor,m,{activity:1});
      strictEqual(digest058(clone.state),stateBefore);
      return {action,memory:memoryWire(actor,m),rng:m.rng};
    });
    deepStrictEqual(probes[0],probes[1]);deepStrictEqual(probes[0],probes[2]);strictEqual(encodeHostSnapshot(s),before);
    const allOwn=eventsFor(s.state,actor).filter(e=>own(e,actor));
    checkpoints.push({stage,at:s.state.now,alive:input.view.me.alive,phase:s.state.phase,
      pendingFromOwnEvents:pendingOwn(allOwn,actor,s.state.now),input,
      fullRestoreEqual:true,deltaRestoreEqual:true,frameUsedMemoryDelta:Object.hasOwn(JSON.parse(sent.checkpoint),'memoryDelta'),
      nextActionAndRngEqual:true,observerUnchanged:true,probe:probes[0]});
  };
  observe('after-command');
  if(kind==='actor-left')playerLeft(s.state,actor,2000);
  if(kind==='target-left')playerLeft(s.state,target,2000);
  if(kind==='end-before-due')playerLeft(s.state,f.ids.deka!,2000);
  advance(s.state,30000);observe('mid-wait');
  advance(s.state,DUE058-1);observe('one-ms-before-due');
  advance(s.state,DUE058);observe('at-due');
  advance(s.state,DUE058+1);observe('after-due');
  const visible=eventsFor(s.state,actor).filter(e=>own(e,actor));
  const receipts=visible.filter(e=>e.kind==='skill.chaos_hex.self'),results=visible.filter(e=>e.kind==='skill.chaos_hex.result');
  const expectedResults=['rejected','end-before-due'].includes(kind)?0:1;
  strictEqual(results.length,expectedResults);strictEqual(receipts.length,kind==='rejected'?0:1);
  if(results.length){
    strictEqual(results[0]!.at,DUE058);strictEqual(results[0]!.data?.target,target);
    strictEqual(results[0]!.data?.success,kind!=='failure');
    if(kind==='failure')strictEqual(results[0]!.facts,undefined);
    else strictEqual(s.memories.get(actor)!.perception!.known.get(target),f.targetRole);
  }
  // Visibility checks use a live other player's view while running; end-of-game debrief is separate.
  const other=f.ids.satoshi!,otherPrivate=eventsFor(s.state,other).filter(e=>e.vis.to==='players'&&e.vis.ids.includes(other)&&e.kind.startsWith('skill.chaos_hex.'));
  strictEqual(otherPrivate.length,0);
  return {kind,actor,target,targetRole:f.targetRole,fixtureSeed:900258,synthetic:true,receipts,results,
    otherPrivateReceipts:0,checkpoints,finalKnown:s.memories.get(actor)!.perception!.known.get(target)??null,
    consumedThroughSeq:s.memories.get(actor)!.perception!.lastSeq,gameEnded:s.state.phase==='ended',
    limitation:kind==='actor-left'?'Postmortem results are diagnostic, not live-policy utilization.':
      kind==='end-before-due'?'End-of-game public debrief is excluded from own-private receipt boundaries.':null};
}

/** Actual host ticks after transfer; direct and wire-restored hosts execute the same policies. */
export function hostTrace058(target='neonis'){
  const f=fixture058(target);readOwn058(f.snapshot,f.actor);
  const control=normalized(f.snapshot);let full=normalized(f.snapshot),delta=normalized(f.snapshot);
  let committed=readHostWire(encodeHostSnapshot(delta)).snapshot,frame=0;
  const members=[{id:f.actor,bot:true,automate:true}],rows:any[]=[];
  for(const at of [2000,15000,30000,60000,60999,61000,61001,75000,90000]){
    for(const s of [control,full,delta])tickHost(s,members,at,{activity:1,botKind:'smart'});
    deepStrictEqual(normalized(full),normalized(control));deepStrictEqual(normalized(delta),normalized(control));
    full=normalized(full);
    const sent=encodeHostFrame(delta,committed.state.log.length,committed.records.length,committed.memories,frame);
    committed=readHostWire(sent.checkpoint,{...committed,frame}).snapshot;frame++;
    delta=decodeHostSnapshot(JSON.stringify(committed));deepStrictEqual(delta,normalized(control));
    rows.push({at,records:structuredClone(control.records),memory:serializeHostMemories(control.memories),
      stateSHA256:digest058(control.state),fullAndDeltaEqual:true,usedMemoryDelta:Object.hasOwn(JSON.parse(sent.checkpoint),'memoryDelta')});
  }
  ok(rows.some(r=>r.usedMemoryDelta));
  return {target:target,actor:f.actor,synthetic:true,ticks:rows.length,rows};
}

/** Reprocess saved own inputs only. The receipt rewrite is a synthetic sensitivity probe, not a new match. */
export function savedInput058(c:{view:PlayerView;events:GameEvent[];known:any;candidates:any;waiting:{receiptSeq:number;target:string}[]}){
  const {view:v,events}=c;
  ok(events.every(e=>own(e,v.me.id)&&e.at<=v.elapsedMs));
  const a=createBotMemory(258),b=createBotMemory(258),k=updateBotKnowledge(v,events,a,{learnOwnAttackOutcome:false});
  // Rebuilding from the full own history can insert inferred identities in a different order.
  // Compare exact target/value mappings; this does not claim incremental memory/trajectory equality.
  deepStrictEqual(k.known,new Map(c.known));deepStrictEqual(k.candidates,new Map(c.candidates));
  let rewrites=0;
  const changed=events.map(e=>{
    if(e.kind!=='skill.chaos_hex.self'||!c.waiting.some(w=>w.receiptSeq===e.seq))return e;
    const target=v.players.find(p=>p.id!==v.me.id&&p.id!==e.data?.target)!.id;
    rewrites++;return {...e,data:{...e.data,target}};
  });
  strictEqual(rewrites,c.waiting.length);ok(rewrites>0);
  updateBotKnowledge(v,changed,b,{learnOwnAttackOutcome:false});
  deepStrictEqual(memoryWire(v.me.id,a),memoryWire(v.me.id,b));
  return {player:v.me.id,at:v.elapsedMs,ownInputSHA256:digest058({view:v,events}),
    rewrites,pending:c.waiting,memorySHA256:digest058(memoryWire(v.me.id,a)),
    knownCount:k.known.size,knowledgeRebuilt:true,receiptTargetSensitivity:false};
}
