import {deepStrictEqual,strictEqual,ok} from 'node:assert';
import {createBotMemory,updateBotKnowledge,eventsFor,viewFor,advance,playerLeft,
  encodeHostSnapshot,decodeHostSnapshot,encodeHostFrame,readHostWire,smartBotAction,botCommunicationAction,
  type BotMemory,type GameEvent,type PlayerView} from '../src/index.js';
import {fixture058,digest058,type Scenario058} from './own-delayed-memory.js';
export function withoutDelayed059(memory:BotMemory){
  const copy=structuredClone(memory);if(copy.perception)delete copy.perception.ownDelayedChecks;return copy;
}
export function scenario059(kind:Scenario058){
  const f=fixture058(kind==='failure'?'satoshi':'neonis',kind!=='rejected'),s=f.snapshot;
  const m=s.memories.get(f.actor)!,control=createBotMemory(m.rng),points:any[]=[];
  let committed=f.initial,frame=0;
  const observe=()=>{
    const view=viewFor(s.state,f.actor),events=eventsFor(s.state,f.actor,m.perception?.lastSeq??0)
      .filter(e=>e.vis.to==='all'||e.vis.to==='players'&&e.vis.ids.includes(f.actor));
    const stateBefore=digest058(s.state),rng=m.rng;
    const k=updateBotKnowledge(view,events,m,{rememberOwnDelayedCheck:true}),c=updateBotKnowledge(view,events,control,{rememberOwnDelayedCheck:false});
    deepStrictEqual(k,c);deepStrictEqual(withoutDelayed059(m),control);strictEqual(rng,m.rng);strictEqual(stateBefore,digest058(s.state));
    const once=structuredClone(m);updateBotKnowledge(view,events,m,{rememberOwnDelayedCheck:true});deepStrictEqual(m,once);
    const encoded=encodeHostSnapshot(s),full=decodeHostSnapshot(encoded),sent=encodeHostFrame(s,committed.state.log.length,committed.records.length,committed.memories,frame);
    committed=readHostWire(sent.checkpoint,{...committed,frame}).snapshot;frame++;
    const delta=decodeHostSnapshot(JSON.stringify(committed));deepStrictEqual(full,delta);
    const probes=[full,delta].map(restored=>{
      const memory=restored.memories.get(f.actor)!,off=withoutDelayed059(memory);
      const action=smartBotAction(restored.state,f.actor,memory,{activity:1,rememberOwnDelayedCheck:true});
      const other=smartBotAction(restored.state,f.actor,off,{activity:1,rememberOwnDelayedCheck:false});
      deepStrictEqual(action,other);deepStrictEqual(withoutDelayed059(memory),off);
      const chat=botCommunicationAction(restored.state,f.actor,memory,{rememberOwnDelayedCheck:true});
      deepStrictEqual(chat,botCommunicationAction(restored.state,f.actor,off,{rememberOwnDelayedCheck:false}));
      deepStrictEqual(withoutDelayed059(memory),off);return {action,chat,memory};
    });deepStrictEqual(probes[0],probes[1]);strictEqual(encodeHostSnapshot(s),encoded);
    const records=m.perception!.ownDelayedChecks!.records;
    strictEqual(records.length,kind==='rejected'?0:1);
    if(records.length){const r=records[0]!;
      strictEqual(r.target,f.target);strictEqual(r.at,1000);strictEqual(r.due,61000);
      const expected=view.phase==='ended'?'ended-unresolved':view.elapsedMs<61000?'pending':kind==='failure'?'failed':'succeeded';
      strictEqual(r.status,expected);
    }
    points.push({at:view.elapsedMs,phase:view.phase,alive:view.me.alive,ownInput:{view,events},records:structuredClone(records),
      known:[...k.known],fullDeltaEqual:true,nextActionChatRngEqual:true,controlKnowledgeAndMemoryEqual:true,observerUnchanged:true,
      duplicateIdempotent:true,memoryDeltaUsed:Object.hasOwn(JSON.parse(sent.checkpoint),'memoryDelta')});
  };
  observe();if(kind==='actor-left')playerLeft(s.state,f.actor,2000);if(kind==='target-left')playerLeft(s.state,f.target,2000);
  if(kind==='end-before-due')playerLeft(s.state,f.ids.deka!,2000);
  for(const at of [30000,60999,61000,61001]){advance(s.state,at);observe();}
  return {kind,actor:f.actor,target:f.target,points};
}
export function savedLedger059(c:{view:PlayerView;events:GameEvent[];waiting:{receiptSeq:number;target:string;at:number;due:number}[]}){
  const a=createBotMemory(258),b=createBotMemory(258),state=digest058(c),rng=a.rng;
  const k=updateBotKnowledge(c.view,c.events,a,{rememberOwnDelayedCheck:true}),old=updateBotKnowledge(c.view,c.events,b,{rememberOwnDelayedCheck:false});
  deepStrictEqual(k,old);deepStrictEqual(withoutDelayed059(a),b);strictEqual(state,digest058(c));strictEqual(a.rng,rng);
  const actual=a.perception!.ownDelayedChecks!.records.filter(r=>r.status==='pending').map(({target,at,due,receiptSeq})=>({target,at,due,receiptSeq}));
  deepStrictEqual(actual,c.waiting);ok(actual.length>0);
  const reversed=createBotMemory(258);updateBotKnowledge(c.view,[...c.events].reverse(),reversed,{rememberOwnDelayedCheck:true});
  deepStrictEqual(reversed.perception!.ownDelayedChecks,a.perception!.ownDelayedChecks);
  return {at:c.view.elapsedMs,player:c.view.me.id,inputSHA256:digest058({view:c.view,events:c.events}),
    expected:c.waiting,actual,records:a.perception!.ownDelayedChecks!.records,knowledgeAndOldMemoryEqual:true,
    reversedReceiptOrderEqual:true,observerUnchanged:true};
}
