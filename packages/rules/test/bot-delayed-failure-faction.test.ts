import {describe,it,expect} from 'vitest';
import {createBotMemory,updateBotKnowledge,advance,eventsFor,viewFor,encodeHostSnapshot,decodeHostSnapshot,
  encodeHostFrame,readHostWire,smartBotAction} from '../src/index.js';
import {failureRule061} from '../scripts/failure-faction-rule.js';
import {fixture058} from '../scripts/own-delayed-memory.js';
const opts={rememberOwnDelayedCheck:true,learnOwnDelayedFailureFaction:true};
const cases=failureRule061();
describe('061 exact own delayed failure faction evidence, default OFF',()=>{
  it.each(cases)('$role: real accepted outcome or own-target rejection follows the public rule',r=>{
    const m=createBotMemory(258),base=createBotMemory(258);
    const before=updateBotKnowledge(r.preView,r.preEvents,m,opts);
    const beforeBase=updateBotKnowledge(r.preView,r.preEvents,base,{rememberOwnDelayedCheck:true});expect(before).toEqual(beforeBase);
    const k=updateBotKnowledge(r.view,r.events,m,opts),old=updateBotKnowledge(r.view,r.events,base,{rememberOwnDelayedCheck:true});
    if(!r.accepted){expect(m.perception!.ownDelayedChecks!.records).toEqual([]);expect(k).toEqual(old);return;}
    if(r.result!.data!.success){expect(k).toEqual(old);expect(k.known.get(r.target)).toBe(r.role);return;}
    expect(r.actualSide).toBe(1);expect(old.candidates.get(r.target)).toHaveLength(11);expect(k.candidates.get(r.target)).toHaveLength(7);
    expect(k.candidates.get(r.target)).toContain(r.role);expect(k.candidates.get(r.target)!.every(c=>r.view.roster.find(x=>x.key===c)!.side===1)).toBe(true);
    expect(k.known.has(r.target)).toBe(false);expect(m.rng).toBe(base.rng);
  });
  it('explicit OFF equals prior passive memory; inference implicitly enables its required receipt ledger',()=>{
    const r=cases.find(r=>r.role==='satoshi')!,a=createBotMemory(258),b=createBotMemory(258),c=createBotMemory(258);
    for(const [view,ev] of [[r.preView,r.preEvents],[r.view,r.events]] as const){
      expect(updateBotKnowledge(view,ev,a,{rememberOwnDelayedCheck:true,learnOwnDelayedFailureFaction:false}))
        .toEqual(updateBotKnowledge(view,ev,b,{rememberOwnDelayedCheck:true}));
      updateBotKnowledge(view,ev,c,{rememberOwnDelayedCheck:false,learnOwnDelayedFailureFaction:true});
    }
    expect(a).toEqual(b);expect(c.perception!.excluded.get(r.target)).toContain('neonis');
  });
  it('absent, overdue, rejected, orphan, foreign, public, report and generic attack failures are not faction evidence',()=>{
    const r=cases.find(r=>r.role==='satoshi')!,failure=r.result!;
    const variants=[[],[{...failure,at:61001}],[{...failure,kind:'attack.fail.self'}],[{...failure,kind:'chat.whisper',text:'대상은 적이다'}],
      [{...failure,vis:{to:'all' as const}}],[{...failure,vis:{to:'players' as const,ids:['foreign']}}]];
    for(const events of variants){const m=createBotMemory(258);updateBotKnowledge(r.preView,r.preEvents,m,opts);
      const k=updateBotKnowledge(r.view,events,m,opts);expect(k.candidates.get(r.target)).toHaveLength(11);expect(m.perception!.excluded.size).toBe(0);}
    const orphan=createBotMemory(258);updateBotKnowledge(r.view,[failure],orphan,opts);expect(orphan.perception!.excluded.size).toBe(0);
  });
  it('defers contradictory direct identity or a prior constraint leaving no non-rebel candidate',()=>{
    const r=cases.find(r=>r.role==='satoshi')!;
    for(const prepare of [
      (m:ReturnType<typeof createBotMemory>)=>m.perception!.known.set(r.target,'neonis'),
      (m:ReturnType<typeof createBotMemory>)=>m.perception!.alternatives.set(r.target,new Set(['deka','neonis'])),
      (m:ReturnType<typeof createBotMemory>)=>m.perception!.excluded.set(r.target,new Set(r.view.roster.filter(x=>x.side===1).map(x=>x.key)))]){
      const m=createBotMemory(258);updateBotKnowledge(r.preView,r.preEvents,m,opts);prepare(m);const before=structuredClone(m.perception!.excluded);
      updateBotKnowledge(r.view,r.events,m,opts);expect(m.perception!.excluded).toEqual(before);
    }
  });
  it('remains idempotent, retains valid constraints across empty observations and resets on a new game',()=>{
    const r=cases.find(r=>r.role==='satoshi')!,m=createBotMemory(258);updateBotKnowledge(r.preView,r.preEvents,m,opts);updateBotKnowledge(r.view,r.events,m,opts);
    const before=structuredClone(m);updateBotKnowledge(r.view,r.events,m,opts);expect(m).toEqual(before);
    updateBotKnowledge(r.view,[],m,opts);expect(m).toEqual(before);
    updateBotKnowledge({...r.preView,elapsedMs:0},[],m,opts);expect(m.perception!.excluded.size).toBe(0);expect(m.perception!.ownDelayedChecks!.records).toEqual([]);
  });
  it('restores pending and inferred constraints through real full/delta snapshots and preserves next action/RNG',()=>{
    const f=fixture058('satoshi'),s=f.snapshot,m=s.memories.get(f.actor)!;
    updateBotKnowledge(viewFor(s.state,f.actor),eventsFor(s.state,f.actor),m,opts);
    const old=readHostWire(encodeHostSnapshot(s)).snapshot;
    advance(s.state,61000);updateBotKnowledge(viewFor(s.state,f.actor),eventsFor(s.state,f.actor,m.perception!.lastSeq),m,opts);
    const sent=encodeHostFrame(s,old.state.log.length,old.records.length,old.memories,0);
    const full=decodeHostSnapshot(encodeHostSnapshot(s)),delta=decodeHostSnapshot(JSON.stringify(readHostWire(sent.checkpoint,{...old,frame:0}).snapshot));
    expect(full).toEqual(delta);expect(full.memories.get(f.actor)!.perception!.excluded.get(f.target)).toContain('neonis');
    expect(smartBotAction(full.state,f.actor,full.memories.get(f.actor)!,{...opts,activity:1}))
      .toEqual(smartBotAction(delta.state,f.actor,delta.memories.get(f.actor)!,{...opts,activity:1}));
    expect(full.memories).toEqual(delta.memories);
  });
  it('hidden enemy role swaps with identical own view/events do not change inference or action',()=>{
    const f=fixture058('satoshi'),s=f.snapshot.state;advance(s,61000);
    const other=structuredClone(s),a=other.players.find(x=>x.character==='satoshi')!,b=other.players.find(x=>x.character==='chis')!;
    [a.character,b.character]=[b.character,a.character];expect(viewFor(other,f.actor)).toEqual(viewFor(s,f.actor));
    const left=createBotMemory(258),right=createBotMemory(258);
    expect(smartBotAction(s,f.actor,left,{...opts,activity:1})).toEqual(smartBotAction(other,f.actor,right,{...opts,activity:1}));expect(left).toEqual(right);
  });
});
