import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createBotMemory,updateBotKnowledge,advance,eventsFor,viewFor} from '../src/index.js';
import {observeOwnDelayedCheck,type OwnDelayedCheckMemory} from '../src/bot-own-delayed-check.js';
import {fixture058,readOwn058} from '../scripts/own-delayed-memory.js';
import {scenario059,withoutDelayed059} from '../scripts/delayed-memory-evaluation.js';
import {regression059} from '../scripts/delayed-memory-regression.js';
describe('059 own delayed receipt ledger, passive and default OFF',()=>{
  it.each(['success','failure','actor-left','target-left','end-before-due','rejected'] as const)('%s real engine + full/delta host restoration + action/chat/RNG',kind=>{
    expect(scenario059(kind).points).toHaveLength(5);
  });
  it('keeps distinct accepted targets distinct without changing any other memory or knowledge',()=>{
    const memories=['neonis','kazrow'].map(target=>{const f=fixture058(target),r=readOwn058(f.snapshot,f.actor),m=createBotMemory(258);
      updateBotKnowledge(r.view,r.events,m,{rememberOwnDelayedCheck:true});return m;});
    expect(memories[0]!.perception!.ownDelayedChecks!.records[0]!.target).not.toBe(memories[1]!.perception!.ownDelayedChecks!.records[0]!.target);
    expect(withoutDelayed059(memories[0]!)).toEqual(withoutDelayed059(memories[1]!));
  });
  it('deadline alone means overdue, never a failed result or exact identity; explicit OFF removes only the ledger',()=>{
    const f=fixture058(),r=readOwn058(f.snapshot,f.actor),m=createBotMemory(258);updateBotKnowledge(r.view,r.events,m,{rememberOwnDelayedCheck:true});
    const v={...r.view,elapsedMs:61001};updateBotKnowledge(v,[],m,{rememberOwnDelayedCheck:true});
    expect(m.perception!.ownDelayedChecks!.records[0]).toMatchObject({status:'overdue'});expect(m.perception!.known.size).toBe(0);
    const before=withoutDelayed059(m);updateBotKnowledge(v,[],m,{rememberOwnDelayedCheck:false});expect(m).toEqual(before);
  });
  it('rejects foreign/public/multiple-recipient/future/unknown-target receipts and wrong role/mode',()=>{
    const f=fixture058(),r=readOwn058(f.snapshot,f.actor),e=r.events.find(e=>e.kind==='skill.chaos_hex.self')!;
    for(const bad of [{...e,vis:{to:'players' as const,ids:[f.ids.satoshi!]}},{...e,vis:{to:'all' as const}},
      {...e,vis:{to:'players' as const,ids:[f.actor,f.ids.satoshi!]}},{...e,at:1001},{...e,data:{target:'missing'}},
      {...e,kind:'chat.whisper',text:'confirmed target'}]){
      const m:OwnDelayedCheckMemory={lastSeq:0,records:[]};observeOwnDelayedCheck(r.view,[bad],m);expect(m.records).toEqual([]);
    }
    for(const v of [{...r.view,mode:'civil_war'},{...r.view,me:{...r.view.me,character:'satoshi'}}]){
      const m=createBotMemory(258);updateBotKnowledge(v,[e],m,{rememberOwnDelayedCheck:true});expect(m.perception!.ownDelayedChecks).toBeUndefined();
    }
  });
  it('orders own receipts before results, ignores duplicate/conflicting seq, and does not invent a receipt for an orphan result',()=>{
    const f=fixture058();advance(f.snapshot.state,61000);const v=viewFor(f.snapshot.state,f.actor),ev=eventsFor(f.snapshot.state,f.actor);
    const receipt=ev.find(e=>e.kind==='skill.chaos_hex.self')!,result=ev.find(e=>e.kind==='skill.chaos_hex.result')!;
    const m:OwnDelayedCheckMemory={lastSeq:0,records:[]};observeOwnDelayedCheck(v,[result,receipt,receipt,result],m);
    expect(m.records).toHaveLength(1);expect(m.records[0]!.status).toBe('succeeded');
    const before=structuredClone(m);observeOwnDelayedCheck(v,[receipt,result],m);expect(m).toEqual(before);
    for(const input of [[result],[receipt,{...receipt,data:{target:f.ids.kazrow!}},result]]){
      const x:OwnDelayedCheckMemory={lastSeq:0,records:[]};observeOwnDelayedCheck(v,input,x);expect(x.records).toEqual([]);
    }
    const x:OwnDelayedCheckMemory={lastSeq:0,records:[]};observeOwnDelayedCheck(v,[receipt,{...result,at:61001}],x);expect(x.records[0]!.result).toBeUndefined();
  });
  it('new game resets the ledger and completed receipt history stays bounded',()=>{
    const f=fixture058(),r=readOwn058(f.snapshot,f.actor),m=createBotMemory(258);updateBotKnowledge(r.view,r.events,m,{rememberOwnDelayedCheck:true});
    updateBotKnowledge({...r.view,elapsedMs:0},[],m,{rememberOwnDelayedCheck:true});expect(m.perception!.ownDelayedChecks!.records).toEqual([]);
    const receipt=r.events.find(e=>e.kind==='skill.chaos_hex.self')!,events=[];
    for(let i=0;i<70;i++){events.push({...receipt,seq:i*2+1,at:i*70000});events.push({...receipt,kind:'skill.chaos_hex.result',seq:i*2+2,at:i*70000+60000,data:{target:f.target,success:false}});}
    const x:OwnDelayedCheckMemory={lastSeq:0,records:[]};observeOwnDelayedCheck({...r.view,elapsedMs:4900000},events,x);
    expect(x.records).toHaveLength(64);expect(x.records.every(r=>r.status==='failed')).toBe(true);expect(x.records[0]!.receiptSeq).toBe(13);
  });
  it('four-mode synthetic traces preserve frozen pre-change actions/state/old-memory/RNG/chat for default, OFF and ON',()=>{
    const baseline=JSON.parse(readFileSync(new URL('../scripts/baselines/round059-prechange.json',import.meta.url),'utf8'));
    for(const flag of [undefined,false,true])expect(regression059(flag).map(r=>r.core)).toEqual(baseline.rows);
  },180000);
});
