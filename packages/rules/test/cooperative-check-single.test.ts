import {describe,it,expect} from 'vitest';
import {botKnowledge,createBotMemory,smartBotAction,botCommunicationAction,viewFor} from '../src/index.js';
import {singleCheckProposal,playCheckSingle} from '../scripts/cooperative-check-single.js';
import {playMatch,DEFAULT_SETTINGS} from '../scripts/league-runner.js';
import {smartBotAction as previous} from '../scripts/baselines/pre-cooperative.js';
import {opponentClaim} from '../scripts/claim-opponents.js';
import {civilTable,fill} from './helpers.js';
function own(){const t=civilTable();fill(t,'mertz');t.p('mertz').gem=2;t.p('mertz').skills=t.p('mertz').skills.filter(s=>s.key==='advanced_attack');const m=createBotMemory(2);botKnowledge(t.state,t.id.mertz!,undefined,m,{directCheckFollowup:true});t.skill('mertz','truth_gem','kaspa');botKnowledge(t.state,t.id.mertz!,undefined,m,{directCheckFollowup:true});t.tick(1000);return {t,m,r:m.perception!.directCheckReaction!};}
describe('공개p1의 단일 직접 확인 후속 대응 진단',()=>{
 it('복제 판단은 자기 기억/행동RNG/엔진을 변경하지 않고 실제 확인 영수증만 사용한다',()=>{
  const {t,m,r}=own(),before=structuredClone({s:t.state,m,r}),x=singleCheckProposal(t.state,t.id.mertz!,m,1e-9,r);
  expect(x?.action).toEqual({type:'skill',skill:'advanced_attack',target:t.id.kaspa,name:'kaspa'});expect({s:t.state,m,r}).toEqual(before);
 });
 it('보고/가짜 영수증/비활동0/정상활동/기절/만료에는 개입 제안을 만들지 않는다',()=>{
  const {t,m,r}=own();expect(singleCheckProposal(t.state,t.id.mertz!,m,0,r)).toBeNull();expect(singleCheckProposal(t.state,t.id.mertz!,m,1,r)).toBeNull();
  expect(singleCheckProposal(t.state,t.id.mertz!,m,1e-9,{...r,seq:r.seq+999})).toBeNull();t.p('mertz').effects.push({id:91,kind:'incapacitated',until:99999,source:'confusion',announced:true});expect(singleCheckProposal(t.state,t.id.mertz!,m,1e-9,r)).toBeNull();t.p('mertz').effects=[];t.tick(4250);expect(singleCheckProposal(t.state,t.id.mertz!,m,1e-9,r)).toBeNull();
 });
 it('정체를 모르는 타인의 숨은 배정·마나를 바꿔도 자기 제안은 같다',()=>{
  const {t,m,r}=own(),s=structuredClone(t.state),a=s.players.find(p=>p.id===t.id.freya)!,b=s.players.find(p=>p.id===t.id.reindila)!;[a.character,b.character]=[b.character,a.character];a.mana=0;b.mana=149;
  expect(viewFor(s,t.id.mertz!)).toEqual(viewFor(t.state,t.id.mertz!));expect(singleCheckProposal(s,t.id.mertz!,m,1e-9,r)).toEqual(singleCheckProposal(t.state,t.id.mertz!,m,1e-9,r));
 });
 it('대조군의 관측 표식은 기존 기본 정책의 실제 경기 결과를 바꾸지 않는다',()=>{
  const f={mode:'civil_war' as const,seed:25,count:8,reversed:false,currentSide:1 as const};
  const expected=playMatch(f,{current:(s,id,m,o)=>smartBotAction(s,id,m,o),reference:(s,id,m,o)=>{const a=previous(s,id,m,{activity:o.activity});return a?.type==='skill'&&a.skill==='publish'?{...a,name:opponentClaim(viewFor(s,id),m,'bluff',a.name)}:a;}},DEFAULT_SETTINGS,undefined,{current:(s,id,m)=>botCommunicationAction(s,id,m)});
  expect(playCheckSingle(f,'bluff',false).game).toEqual(expected);
 });
 it('딱 한 번만 공격하며 개입 전 상태/자기 기억/뷰와 원래RNG를 보존한다',()=>{
  const f={mode:'civil_war' as const,seed:25,count:8,reversed:false,currentSide:1 as const},c=playCheckSingle(f,'truthful',false),s=playCheckSingle(f,'truthful',true);
  expect(c.point).not.toBeNull();expect(s.forcedChanges).toBe(1);expect(c.forcedChanges).toBe(0);
  for(const key of ['at','stateHash','memoryHash','viewHash','rngBefore','rngAfterBaseline','rngAfterSelection','action','event'] as const)expect(s.point![key]).toEqual(c.point![key]);
  expect(s.point!.rngAfterSelection).toBe(s.point!.rngAfterBaseline);expect(s.point!.accepted).toBe(true);expect(c.point!.executed).toBeNull();
  expect(s.actions.filter(a=>a.at===s.point!.at)).toHaveLength(1);expect(s.actions.find(a=>a.at===s.point!.at)!.action.type).toBe('skill');expect(c.actions.some(a=>a.at===c.point!.at)).toBe(false);
 });
 it('단일 개입 관측ON/OFF의 실제 경기 결과/행동 통계가 같다',()=>{
  const f={mode:'civil_war' as const,seed:25,count:8,reversed:false,currentSide:1 as const};expect(playCheckSingle(f,'truthful',true,DEFAULT_SETTINGS,'p1',false).game).toEqual(playCheckSingle(f,'truthful',true).game);
 });
 it('대상이 없는 공개ID에서는 개입/비개입 경기가 완전히 같다',()=>{
  const f={mode:'troll' as const,seed:25,count:8,reversed:false,currentSide:1 as const};expect(playCheckSingle(f,'truthful',true,DEFAULT_SETTINGS,'not-a-player')).toEqual(playCheckSingle(f,'truthful',false,DEFAULT_SETTINGS,'not-a-player'));
 });
});
