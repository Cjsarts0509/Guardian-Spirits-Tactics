import {describe,it,expect} from 'vitest';
import {applyAction,botKnowledge,botCommunicationAction,createBotMemory,smartBotAction,viewFor,encodeHostSnapshot,decodeHostSnapshot,type HostSnapshot} from '../src/index.js';
import {civilTable,fill} from './helpers.js';
function setup(){
 const t=civilTable();fill(t,'mertz');t.p('mertz').gem=2;t.p('mertz').skills=t.p('mertz').skills.filter(s=>['advanced_attack','ally','break_ally'].includes(s.key));
 const m=createBotMemory(2);botKnowledge(t.state,t.id.mertz!,undefined,m,{directCheckFollowup:true});
 expect(t.skill('mertz','truth_gem','kaspa').ok).toBe(true);
 botKnowledge(t.state,t.id.mertz!,undefined,m,{directCheckFollowup:true});return {t,m};
}
const options={activity:1e-9,directCheckFollowup:true};
describe('본인 직접 확인 뒤 한 번의 제한 이름 공격',()=>{
 it('실제 보석 확인 결과에서1초 뒤 비활동 추첨에도 공격하고 반복하지 않는다',()=>{
  const {t,m}=setup();expect(m.perception?.directCheckReaction).toMatchObject({target:t.id.kaspa,name:'kaspa'});
  expect(smartBotAction(t.state,t.id.mertz!,m,options)).toBeNull();t.tick(1000);
  const a=smartBotAction(t.state,t.id.mertz!,m,options);expect(a).toEqual({type:'skill',skill:'advanced_attack',target:t.id.kaspa,name:'kaspa'});
  expect(applyAction(t.state,t.id.mertz!,a!,t.now).ok).toBe(true);expect(m.perception?.directCheckReaction).toBeUndefined();
  expect(smartBotAction(t.state,t.id.mertz!,m,options)).toBeNull();
 });
 it('기본OFF·activity0·5초 만료는 후속을 만들지 않는다',()=>{
  for(const opt of [{activity:1e-9},{activity:0,directCheckFollowup:true}]){const {t,m}=setup();t.tick(1000);expect(smartBotAction(t.state,t.id.mertz!,m,opt)).toBeNull();}
  const {t,m}=setup();t.tick(5250);expect(smartBotAction(t.state,t.id.mertz!,m,options)).toBeNull();expect(m.perception?.directCheckReaction).toBeUndefined();
 });
 it('정상 활동이 먼저 오면 기존 공격을 하고 추가 후속을 소비한다',()=>{
  const {t,m}=setup();t.tick(250);expect(smartBotAction(t.state,t.id.mertz!,m,{activity:1,directCheckFollowup:true})).toMatchObject({skill:'advanced_attack'});expect(m.perception?.directCheckReaction).toBeUndefined();
 });
 it('공격 쿨다운·확정 적 동맹 파기 우선순위를 우회하지 않고 재시도하지 않는다',()=>{
  const {t,m}=setup();t.p('mertz').skills.find(s=>s.key==='advanced_attack')!.cooldownUntil=5000;t.tick(1000);
  expect(smartBotAction(t.state,t.id.mertz!,m,options)).toBeNull();t.tick(4000);expect(smartBotAction(t.state,t.id.mertz!,m,options)).toBeNull();
  const x=setup();x.t.p('mertz').allies.push(x.t.id.kaspa!);x.t.tick(1000);expect(smartBotAction(x.t.state,x.t.id.mertz!,x.m,options)).toBeNull();
  expect(smartBotAction(x.t.state,x.t.id.mertz!,x.m,{activity:1,directCheckFollowup:true})).toMatchObject({skill:'break_ally'});
 });
 it('보고·oneOf·타인 비수신 결과는 후속 사실로 승격하지 않는다',()=>{
  const t=civilTable(),m=createBotMemory(2);botKnowledge(t.state,t.id.mertz!,undefined,m,{directCheckFollowup:true});
  for(const event of [
   {kind:'chat.whisper',vis:{to:'players' as const,ids:[t.id.mertz!]},facts:undefined},
   {kind:'inspect.result',vis:{to:'players' as const,ids:[t.id.mertz!]},facts:[{player:t.id.kaspa!,character:null,oneOf:['kaspa','soen']}]},
   {kind:'inspect.result',vis:{to:'players' as const,ids:[t.id.freya!]},facts:[{player:t.id.kaspa!,character:'kaspa'}]},
  ])t.state.log.push({...event,seq:++t.state.seq,at:0,text:'수신 경계',data:{from:t.id.kelhu,text:'확인 정보: [12] 카스파'}});
  botKnowledge(t.state,t.id.mertz!,undefined,m,{directCheckFollowup:true});expect(m.perception?.directCheckReaction).toBeUndefined();expect(m.perception?.known.has(t.id.kaspa!)).toBe(false);
 });
 it('실제 주 행동 뒤 별도 대화 갱신에서도 직접 확인 후속을 보존한다',()=>{
  const {t,m}=setup();delete m.perception!.directCheckReaction;m.perception!.known.delete(t.id.kaspa!);
  m.perception!.lastSeq=0;m.communicationAt=0;botCommunicationAction(t.state,t.id.mertz!,m,{directCheckFollowup:true});expect(m.perception?.directCheckReaction).toMatchObject({name:'kaspa'});
 });
 it('호스트 기억 복원 후에도 같은 후속을 단 한 번 실행한다',()=>{
  const {t,m}=setup();t.tick(1000);const snap:HostSnapshot={version:1,state:t.state,memories:new Map([[t.id.mertz!,m]]),handled:0,records:[],results:[]};
  const restored=decodeHostSnapshot(encodeHostSnapshot(snap)),copy=restored.memories.get(t.id.mertz!)!;
  expect(copy.perception?.directCheckReaction).toEqual(m.perception?.directCheckReaction);
  const expected=smartBotAction(t.state,t.id.mertz!,m,options);expect(smartBotAction(restored.state,t.id.mertz!,copy,options)).toEqual(expected);expect(copy.perception?.directCheckReaction).toBeUndefined();
 });
 it('같은 자기 뷰에서 타인 숨은 배정·마나·비수신 이벤트를 바꿔도 같다',()=>{
  const {t,m}=setup();t.tick(1000);const s=structuredClone(t.state),a=s.players.find(p=>p.id===t.id.freya)!,b=s.players.find(p=>p.id===t.id.reindila)!;
  [a.character,b.character]=[b.character,a.character];a.mana=1;b.mana=149;s.log.push({seq:++s.seq,at:1000,kind:'inspect.result',text:'남의 확인',vis:{to:'players',ids:[a.id]},facts:[{player:b.id,character:'reindila'}]});
  expect(viewFor(s,t.id.mertz!)).toEqual(viewFor(t.state,t.id.mertz!));expect(smartBotAction(s,t.id.mertz!,structuredClone(m),options)).toEqual(smartBotAction(t.state,t.id.mertz!,structuredClone(m),options));
 });
});
