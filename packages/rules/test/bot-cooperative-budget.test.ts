import {describe,it,expect} from 'vitest';
import {botKnowledge,createBotMemory,smartBotAction,viewFor} from '../src/index.js';
import {strategicClaimName} from '../src/bot-claim-policy.js';
import {civilTable,fill} from './helpers.js';

describe('개발 후보의 동맹 예산과 마지막 보석 성장',()=>{
 it('확인 마나를 없애는 동맹은 미루지만 확인 한 번을 남기면 동맹한다',()=>{
  const t=civilTable();t.p('dantes').skills=t.p('dantes').skills.filter(s=>['ally','ally_check'].includes(s.key));
  t.state.revealed[t.id.kelhu!]='kelhu';t.publish('freya','freya');t.p('dantes').mana=20;
  const options={activity:1,confirmationSearch:true as const};
  expect(smartBotAction(t.state,t.id.dantes!,createBotMemory(3),options)).toEqual({type:'skill',skill:'ally',target:t.id.kelhu});
  expect(smartBotAction(t.state,t.id.dantes!,createBotMemory(3),{...options,teamworkBudget:true})).toMatchObject({type:'skill',skill:'ally_check'});
  t.p('dantes').mana=25;
  expect(smartBotAction(t.state,t.id.dantes!,createBotMemory(3),{...options,teamworkBudget:true})).toEqual({type:'skill',skill:'ally',target:t.id.kelhu});
 });
 it('확정 후계자의 지원 예산을 동맹보다 먼저 보존한다',()=>{
  const t=civilTable();t.p('dantes').skills=t.p('dantes').skills.filter(s=>['ally','dantes_successor'].includes(s.key));
  t.state.revealed[t.id.mertz!]='mertz';t.p('dantes').mana=35;
  expect(smartBotAction(t.state,t.id.dantes!,createBotMemory(3),{activity:1,teamworkBudget:true})).toEqual({type:'skill',skill:'dantes_successor',target:t.id.mertz});
  t.p('dantes').mana=40;
  expect(smartBotAction(t.state,t.id.dantes!,createBotMemory(3),{activity:1,teamworkBudget:true})).toEqual({type:'skill',skill:'ally',target:t.id.mertz});
 });
 it('확인할 미지 대상과 지원 대상이 없으면 불필요한 마나를 예약하지 않는다',()=>{
  const t=civilTable();t.p('dantes').skills=t.p('dantes').skills.filter(s=>['ally','ally_check'].includes(s.key));
  for(const p of t.state.players)t.state.revealed[p.id]=p.character;
  t.p('dantes').mana=10;
  expect(smartBotAction(t.state,t.id.dantes!,createBotMemory(3),{activity:1,teamworkBudget:true})).toEqual({type:'skill',skill:'ally',target:t.id.mertz});
 });
 it('단계2에서는 진명을 유지해 단계3을 얻고 완성 후에는 위장을 허용한다',()=>{
  const t=civilTable();t.p('mertz').skills=t.p('mertz').skills.filter(s=>['publish','advanced_attack'].includes(s.key));
  t.state.revealed[t.id.arin!]='arin';t.p('mertz').gem=2;fill(t,'mertz');t.publish('mertz','mertz');
  const m=createBotMemory(2);let v=viewFor(t.state,t.id.mertz!),k=botKnowledge(t.state,t.id.mertz!,v,m);
  expect(strategicClaimName(v,k,m,2)).not.toBe('mertz');expect(strategicClaimName(v,k,m,3)).toBe('mertz');
  t.tick(t.state.nextTurnAt-t.now);expect(t.p('mertz').gem).toBe(3);
  v=viewFor(t.state,t.id.mertz!);k=botKnowledge(t.state,t.id.mertz!,v,m);expect(strategicClaimName(v,k,m,3)).not.toBe('mertz');
 });
});
