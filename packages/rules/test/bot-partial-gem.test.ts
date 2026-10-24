import {describe,it,expect} from 'vitest';
import {botKnowledge,createBotMemory,smartBotAction,viewFor} from '../src/index.js';
import {shouldPreservePartialGem} from '../src/bot-information.js';
import {civilTable,fill} from './helpers.js';

function nearTurn(){const t=civilTable();t.tick(t.state.nextTurnAt-43_000);t.p('mertz').published='mertz';t.p('mertz').gem=2;t.p('mertz').gemCooldownUntil=0;t.p('mertz').skills=[];fill(t,'mertz');return t;}
describe('부분 보석 완성 직전 소비 보류 개발 옵션',()=>{
 it('현재 진명·2단계·43초·완성 마나 조건에서만 보류한다',()=>{
  const t=nearTurn(),v=viewFor(t.state,t.id.mertz!);expect(shouldPreservePartialGem(v)).toBe(true);
  for(const stage of [0,1,3] as const)expect(shouldPreservePartialGem({...v,me:{...v.me,gem:stage}})).toBe(false);
  expect(shouldPreservePartialGem({...v,nextTurnInMs:43001})).toBe(false);
  expect(shouldPreservePartialGem({...v,nextTurnInMs:0})).toBe(false);
  expect(shouldPreservePartialGem({...v,me:{...v.me,trueName:false}})).toBe(false);
  expect(shouldPreservePartialGem({...v,me:{...v.me,mana:50,nextTurnManaPreview:24}})).toBe(false);
  expect(shouldPreservePartialGem({...v,me:{...v.me,mana:50,nextTurnManaPreview:25}})).toBe(true);
  expect(shouldPreservePartialGem({...v,me:{...v.me,skills:v.me.skills.map(s=>({...s,blocked:'재사용 대기'}))}})).toBe(false);
 });
 it('기본은 원래 소비, 옵션은 부분을 남기고 실제 다음 턴 완성 후 75마나로 사용한다',()=>{
  const t=nearTurn();expect(smartBotAction(t.state,t.id.mertz!,createBotMemory(2),{activity:1})).toMatchObject({skill:'truth_gem'});
  const m=createBotMemory(2);expect(smartBotAction(t.state,t.id.mertz!,m,{activity:1,preservePartialGem:true})).toBeNull();expect(t.p('mertz').gem).toBe(2);
  t.tick(t.state.nextTurnAt-t.now);expect(t.p('mertz').gem).toBe(3);
  const a=smartBotAction(t.state,t.id.mertz!,m,{activity:1,preservePartialGem:true});expect(a).toMatchObject({skill:'truth_gem'});
  expect(t.act('mertz',a!).ok).toBe(true);expect(t.p('mertz').gem).toBe(3);expect(t.p('mertz').mana).toBe(75);
 });
 it('보류 중에도 사용 가능한 다른 확인은 실행한다',()=>{
  const t=nearTurn();t.p('mertz').skills=[{key:'scan',cooldownUntil:0,usesLeft:null,level:1}];
  const a=smartBotAction(t.state,t.id.mertz!,createBotMemory(2),{activity:1,preservePartialGem:true});
  expect(a).toMatchObject({skill:'scan'});expect(t.act('mertz',a!).ok).toBe(true);expect(t.p('mertz').gem).toBe(2);
 });
 it('확정 적 공격과 확정 아군 동맹은 보석 보류보다 먼저 실행한다',()=>{
  const t=nearTurn();t.p('mertz').skills=[{key:'advanced_attack',cooldownUntil:0,usesLeft:null,level:1}];t.state.revealed[t.id.arin!]='arin';
  expect(smartBotAction(t.state,t.id.mertz!,createBotMemory(2),{activity:1,preservePartialGem:true})).toEqual({type:'skill',skill:'advanced_attack',target:t.id.arin,name:'arin'});
  delete t.state.revealed[t.id.arin!];t.p('mertz').skills=[{key:'ally',cooldownUntil:0,usesLeft:null,level:1}];t.state.revealed[t.id.kelhu!]='kelhu';
  expect(smartBotAction(t.state,t.id.mertz!,createBotMemory(2),{activity:1,preservePartialGem:true})).toEqual({type:'skill',skill:'ally',target:t.id.kelhu});
 });
 it('진명이나 자원이 바뀌면 다음 결정에서 보류가 풀리고 남의 숨은 상태는 읽지 않는다',()=>{
  const t=nearTurn(),v=viewFor(t.state,t.id.mertz!),memory=createBotMemory(2);botKnowledge(t.state,t.id.mertz!,v,memory);
  const before=smartBotAction(t.state,t.id.mertz!,structuredClone(memory),{activity:1,preservePartialGem:true});
  const other=structuredClone(t.state);for(const p of other.players)if(p.id!==t.id.mertz){p.mana=0;p.gem=3;p.flags.hidden=123;}
  expect(smartBotAction(other,t.id.mertz!,structuredClone(memory),{activity:1,preservePartialGem:true})).toEqual(before);
  t.p('mertz').published='kelhu';expect(smartBotAction(t.state,t.id.mertz!,createBotMemory(2),{activity:1,preservePartialGem:true})).toMatchObject({skill:'truth_gem'});
 });
});
