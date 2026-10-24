import {describe,it,expect} from 'vitest';
import {botCommunicationAction,createBotMemory,smartBotAction} from '../src/index.js';
import {civilTable,fill} from './helpers.js';

function setup(){const t=civilTable();t.tick(t.state.nextTurnAt-43000);t.p('mertz').published='mertz';t.p('mertz').gem=2;t.p('mertz').skills=[];fill(t,'mertz');return t;}
const active={activity:1,preservePartialGem:'when-busy' as const};
describe('대기만 생기면 원래 보석 선택을 유지하는 개발 후보',()=>{
 it('원래 보석 사용/대상·난수·전체 기억을 정확히 복원하고 실제 부분 보석은 소비한다',()=>{
  const t=setup(),a=createBotMemory(2),b=createBotMemory(2),state=structuredClone(t.state);
  expect(smartBotAction(t.state,t.id.mertz!,createBotMemory(2),{activity:1,preservePartialGem:true})).toBeNull();
  const expected=smartBotAction(t.state,t.id.mertz!,a,{activity:1});
  const actual=smartBotAction(t.state,t.id.mertz!,b,active);expect(actual).toEqual(expected);expect(b).toEqual(a);expect(t.state).toEqual(state);
  expect(t.act('mertz',actual!).ok).toBe(true);expect(t.p('mertz').gem).toBe(0);expect(t.p('mertz').mana).toBe(100);
 });
 it('사용 가능한 다른 확인이 있으면 보류 정책의 행동과 기억을 그대로 채택한다',()=>{
  const t=setup();t.p('mertz').skills=[{key:'advanced_scan',cooldownUntil:0,usesLeft:null,level:1}];
  const a=createBotMemory(2),b=createBotMemory(2),expected=smartBotAction(t.state,t.id.mertz!,a,{activity:1,preservePartialGem:true});
  const actual=smartBotAction(t.state,t.id.mertz!,b,active);expect(actual).toMatchObject({skill:'advanced_scan'});expect(actual).toEqual(expected);expect(b).toEqual(a);
  expect(t.act('mertz',actual!).ok).toBe(true);expect(t.p('mertz').gem).toBe(2);
 });
 it('비활동 호출은 기존과 같은 난수 진행이고 대화 활동도 새로 만들지 않는다',()=>{
  const t=setup(),a=createBotMemory(2),b=createBotMemory(2);a.communicationAt=123;b.communicationAt=123;
  expect(smartBotAction(t.state,t.id.mertz!,a,{activity:0})).toBeNull();expect(smartBotAction(t.state,t.id.mertz!,b,{...active,activity:0})).toBeNull();expect(b).toEqual(a);
  expect(botCommunicationAction(t.state,t.id.mertz!,b,active)).toBeNull();
 });
 it.each(['far','disguised','complete'] as const)('보류 범위 밖 %s에서는 기존 행동·기억과 같다',which=>{
  const t=setup();if(which==='far')t.state.nextTurnAt=t.state.now+43001;if(which==='disguised')t.p('mertz').published='kelhu';if(which==='complete')t.p('mertz').gem=3;
  const a=createBotMemory(2),b=createBotMemory(2);expect(smartBotAction(t.state,t.id.mertz!,b,active)).toEqual(smartBotAction(t.state,t.id.mertz!,a,{activity:1}));expect(b).toEqual(a);
 });
 it('확정 아군 동맹·적 동맹 파기를 보존하고 남의 숨은 정체/자원은 읽지 않는다',()=>{
  const t=setup();t.p('mertz').skills=[{key:'ally',cooldownUntil:0,usesLeft:null,level:1}];t.state.revealed[t.id.kelhu!]='kelhu';
  expect(smartBotAction(t.state,t.id.mertz!,createBotMemory(2),active)).toEqual({type:'skill',skill:'ally',target:t.id.kelhu});
  t.p('mertz').skills=[{key:'break_ally',cooldownUntil:0,usesLeft:null,level:1}];t.p('mertz').allies=[t.id.arin!];t.state.revealed[t.id.arin!]='arin';
  expect(smartBotAction(t.state,t.id.mertz!,createBotMemory(2),active)).toEqual({type:'skill',skill:'break_ally',target:t.id.arin});
  const other=structuredClone(t.state),x=other.players.find(p=>p.id===t.id.kaspa)!,y=other.players.find(p=>p.id===t.id.freya)!;[x.character,y.character]=[y.character,x.character];x.mana=0;y.gem=3;
  expect(smartBotAction(other,t.id.mertz!,createBotMemory(2),active)).toEqual(smartBotAction(t.state,t.id.mertz!,createBotMemory(2),active));
 });
});
