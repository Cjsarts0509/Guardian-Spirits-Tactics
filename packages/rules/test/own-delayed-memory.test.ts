import {describe,it,expect} from 'vitest';
import {fixture058,readOwn058,targetCollision058,scenario058,hostTrace058,savedInput058} from '../scripts/own-delayed-memory.js';
import {pendingOwn} from '../scripts/pending-confirmation.js';
import {createBotMemory,updateBotKnowledge} from '../src/index.js';
describe('058 own delayed receipt representation and real host restore',()=>{
  it('saved knowledge compares exact player/value mappings independently of insertion order, rejecting wrong values',()=>{
    const f=fixture058(),r=readOwn058(f.snapshot,f.actor);
    const c={...r,known:r.known.slice().reverse(),candidates:r.candidates.slice().reverse(),waiting:pendingOwn(r.events,f.actor,r.view.elapsedMs)};
    expect(savedInput058(c).knowledgeRebuilt).toBe(true);
    expect(()=>savedInput058({...c,known:[[f.target,'wrong']]})).toThrow();
  });
  it('distinct accepted target histories collapse to the same persistent memory, not just the same identity map',()=>{
    const r=targetCollision058();expect(r.targets[0]).not.toBe(r.targets[1]);expect(r.persistentMemoryEqual).toBe(true);expect(r.cooldownRemainingMs).toBe(70000);
  });
  it.each(['success','failure','actor-left','target-left','end-before-due','rejected'] as const)('%s: engine boundary, full/delta restore and next action/RNG',kind=>{
    const r=scenario058(kind);expect(r.checkpoints).toHaveLength(5);expect(r.otherPrivateReceipts).toBe(0);
  });
  it.each(['neonis','kazrow','satoshi'])('%s: repeated actual host ticks through result delivery remain identical',target=>{
    expect(hostTrace058(target).ticks).toBe(9);
  });
  it('incremental receipt processing is idempotent and private foreign facts do not cross the memory boundary',()=>{
    const f=fixture058(),a=readOwn058(f.snapshot,f.actor),before=structuredClone(f.snapshot.memories.get(f.actor)!);
    updateBotKnowledge(a.view,a.events,f.snapshot.memories.get(f.actor)!);expect(f.snapshot.memories.get(f.actor)).toEqual(before);
    const other=createBotMemory(258);updateBotKnowledge(a.view,[{seq:999,at:1000,kind:'skill.chaos_hex.result',text:'',
      vis:{to:'players',ids:[f.ids.satoshi!]},data:{target:f.target,success:true},facts:[{player:f.target,character:'neonis'}]}],other);
    expect(other.perception!.known.has(f.target)).toBe(false);expect(other.perception!.lastSeq).toBe(0);
  });
  it('a new game resets old received facts instead of inheriting another game result',()=>{
    const a=fixture058();readOwn058(a.snapshot,a.actor);const m=a.snapshot.memories.get(a.actor)!;
    m.perception!.known.set(a.target,'neonis');m.perception!.lastElapsedMs=61000;
    updateBotKnowledge({...readOwn058(fixture058().snapshot,a.actor).view,elapsedMs:0},[],m);
    expect(m.perception!.known.size).toBe(0);expect(m.perception!.lastSeq).toBe(0);
  });
});
