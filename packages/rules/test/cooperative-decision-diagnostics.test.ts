import {describe,it,expect} from 'vitest';
import {createBotMemory,smartBotAction} from '../src/index.js';
import {diagnoseDeferredGem,recordDeferredGemOutcome} from '../scripts/cooperative-decision-diagnostics.js';
import {civilTable,fill} from './helpers.js';
import {playMatch,fixtures,DEFAULT_SETTINGS,type Policy} from '../scripts/league-runner.js';

function setup(){const t=civilTable();t.tick(t.state.nextTurnAt-43000);t.p('mertz').published='mertz';t.p('mertz').gem=2;t.p('mertz').skills=[];fill(t,'mertz');return t;}
describe('평가 전용 부분 보석 대체 행동 관측',()=>{
 it('진단기를 붙여도 동일 정책의 실제 경기 결과가 완전히 같다',()=>{
  const f=fixtures('civil_war',42,8)[0]!,settings={...DEFAULT_SETTINGS,activity:0.5,limitMs:10*60_000};
  const plain:Policy=(s,id,m,o)=>smartBotAction(s,id,m,{...o,preservePartialGem:true});
  const traced:Policy=(s,id,m,o)=>{const d=diagnoseDeferredGem(s,id,m,{...o,preservePartialGem:true}),a=plain(s,id,m,o);if(d)expect(a).toEqual(d.chosen);return a;};
  expect(playMatch(f,{current:traced,reference:plain},settings)).toEqual(playMatch(f,{current:plain,reference:plain},settings));
 });
 it('복제 판단은 상태·원래 기억·난수를 바꾸지 않고 실제 제안과 일치한다',()=>{
  const t=setup(),m=createBotMemory(2),state=structuredClone(t.state),memory=structuredClone(m),options={activity:1,preservePartialGem:true};
  const row=diagnoseDeferredGem(t.state,t.id.mertz!,m,options)!;
  expect(row.wouldUse).toMatchObject({skill:'truth_gem'});expect(row.chosen).toBeNull();expect(row.gemExpectedInformation).toBeGreaterThan(0);
  expect(t.state).toEqual(state);expect(m).toEqual(memory);expect(row.chosen).toEqual(smartBotAction(t.state,t.id.mertz!,m,options));
 });
 it('대체 스캔의 실제 자기 수신 결과와 정보 변화만 기록한다',()=>{
  const t=setup();t.p('mertz').skills=[{key:'advanced_scan',level:1,usesLeft:null,cooldownUntil:0}];
  const m=createBotMemory(2),options={activity:1,preservePartialGem:true},row=diagnoseDeferredGem(t.state,t.id.mertz!,m,options)!;
  const action=smartBotAction(t.state,t.id.mertz!,m,options)!;expect(action).toMatchObject({skill:'advanced_scan'});expect(row.alternativeExpectedInformation).toBeGreaterThan(0);
  const result=t.act('mertz',action),before=structuredClone(m);recordDeferredGemOutcome(row,t.state,t.id.mertz!,m,result);
  expect(row.accepted).toBe(true);expect(row.error).toBeNull();expect(row.totalCandidatesAfter).toBeLessThanOrEqual(row.totalCandidatesBefore);expect(m).toEqual(before);
 });
 it('본인 거절 문자열을 보존하고 종료 후 전원 공개 정보는 정보 성과에서 제외한다',()=>{
  const t=setup(),m=createBotMemory(2),row=diagnoseDeferredGem(t.state,t.id.mertz!,m,{activity:1,preservePartialGem:true})!;
  recordDeferredGemOutcome(row,t.state,t.id.mertz!,m,{ok:false,error:'대상이 보호받고 있어 지정할 수 없습니다.',events:[]});
  expect(row.accepted).toBe(false);expect(row.error).toContain('보호');
  t.state.phase='ended';row.totalCandidatesAfter=null;row.knownAfter=null;
  recordDeferredGemOutcome(row,t.state,t.id.mertz!,m,{ok:true,events:[]});expect(row.ended).toBe(true);expect(row.knownAfter).toBeNull();
 });
 it('비활동/비보류 판단은 관측하지 않고 남의 숨은 배정/마나에 의존하지 않는다',()=>{
  const t=setup();expect(diagnoseDeferredGem(t.state,t.id.mertz!,createBotMemory(2),{activity:0,preservePartialGem:true})).toBeUndefined();
  expect(diagnoseDeferredGem(t.state,t.id.mertz!,createBotMemory(2),{activity:1})).toBeUndefined();
  const a=diagnoseDeferredGem(t.state,t.id.mertz!,createBotMemory(2),{activity:1,preservePartialGem:true});
  const x=t.p('arin'),y=t.p('kaspa');[x.character,y.character]=[y.character,x.character];x.mana=0;y.gem=3;
  expect(diagnoseDeferredGem(t.state,t.id.mertz!,createBotMemory(2),{activity:1,preservePartialGem:true})).toEqual(a);
 });
});
