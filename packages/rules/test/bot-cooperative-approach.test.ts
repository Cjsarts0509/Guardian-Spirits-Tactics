import {describe,it,expect} from 'vitest';
import {botKnowledge,createBotMemory,smartBotAction,viewFor} from '../src/index.js';
import {shareIntel,trustedIntel} from '../src/bot-intel.js';
import {civilTable,fill} from './helpers.js';

describe('실제 동맹 요청의 검증과 비대칭 정보 공유',()=>{
 it('B는 A의 보고를 보류하다가 동맹 요청자인 A를 직접 확인한 뒤 참고한다',()=>{
  const t=civilTable();t.publish('kelhu','kelhu');t.publish('freya','freya');
  for(const c of ['freya','reindila']){fill(t,'kelhu');t.p('kelhu').gem=2;t.p('kelhu').gemCooldownUntil=0;expect(t.skill('kelhu','truth_gem',c).ok).toBe(true);}
  fill(t,'kelhu','freya');expect(t.skill('kelhu','ally','freya').ok).toBe(true);
  const a=createBotMemory(3),b=createBotMemory(4),av=viewFor(t.state,t.id.kelhu!),ak=botKnowledge(t.state,t.id.kelhu!,av,a);
  const report=shareIntel(av,ak,a)!;expect(t.act('kelhu',report).ok).toBe(true);
  let bv=viewFor(t.state,t.id.freya!),bk=botKnowledge(t.state,t.id.freya!,bv,b);
  expect(bk.known.has(t.id.kelhu!)).toBe(false);expect(trustedIntel(bv,bk,b).size).toBe(0);
  // 이번 시점에는 보석만 사용할 수 있다. 자기 보석을 써 발신자를 직접 확인한다.
  t.p('freya').skills=t.p('freya').skills.filter(s=>s.key==='ally');t.p('freya').gem=2;
  const action=smartBotAction(t.state,t.id.freya!,b,{activity:1,verifyIncomingAllies:true});
  expect(action).toEqual({type:'skill',skill:'truth_gem',target:t.id.kelhu});expect(t.act('freya',action!).ok).toBe(true);
  bv=viewFor(t.state,t.id.freya!);bk=botKnowledge(t.state,t.id.freya!,bv,b);
  expect(bk.known.get(t.id.kelhu!)).toBe('kelhu');expect(bk.known.has(t.id.reindila!)).toBe(false);
  expect(trustedIntel(bv,bk,b).get(t.id.reindila!)).toBe('reindila');
  expect(smartBotAction(t.state,t.id.freya!,b,{activity:1,verifyIncomingAllies:true})).toEqual({type:'skill',skill:'ally',target:t.id.kelhu});
 });
 it('변장한 동맹 요청자는 확인 성공 뒤에도 아군이나 신뢰 발신자로 확정하지 않는다',()=>{
  const t=civilTable();t.publish('kai','kai');t.publish('soen','arin');fill(t,'soen','kai');t.skill('soen','ally','kai');
  const name=viewFor(t.state,t.id.kai!).roster.find(r=>r.key==='dantes')!.name;
  t.act('soen',{type:'chat',channel:'whisper',to:t.id.kai,text:`확인 정보: [${t.p('arin').seat}] ${name}`});
  t.p('kai').skills=t.p('kai').skills.filter(s=>['ally','ally_check'].includes(s.key));
  const b=createBotMemory(5),action=smartBotAction(t.state,t.id.kai!,b,{activity:1,verifyIncomingAllies:true});
  expect(action).toEqual({type:'skill',skill:'ally_check',target:t.id.soen});expect(t.act('kai',action!).ok).toBe(true);
  const v=viewFor(t.state,t.id.kai!),k=botKnowledge(t.state,t.id.kai!,v,b);
  expect(k.known.has(t.id.soen!)).toBe(false);expect(k.candidates.get(t.id.soen!)).toContain('soen');
  expect(trustedIntel(v,k,b).size).toBe(0);
  expect(smartBotAction(t.state,t.id.kai!,b,{activity:1,verifyIncomingAllies:true})).not.toEqual({type:'skill',skill:'ally',target:t.id.soen});
 });
});
