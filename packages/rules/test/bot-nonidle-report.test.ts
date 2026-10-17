import {describe,it,expect} from 'vitest';
import {botCommunicationAction,botKnowledge,createBotMemory,smartBotAction,viewFor} from '../src/index.js';
import {diagnoseReportVerification} from '../scripts/cooperative-report-diagnostics.js';
import {trustedIntel} from '../src/bot-intel.js';
import {civilTable,fill} from './helpers.js';

function setup(){
  const t=civilTable();fill(t,'freya');t.p('freya').gem=0;t.state.revealed[t.id.kelhu!]='kelhu';
  expect(t.act('kelhu',{type:'chat',channel:'whisper',to:t.id.freya,text:`확인 정보: [${t.p('reindila').seat}] 레인딜라`}).ok).toBe(true);
  t.p('freya').skills=t.p('freya').skills.filter(s=>s.key==='scan');return t;
}
const opts={activity:1,reportVerification:'when-busy' as const};
describe('일반 순서가 대기하면 원래 보고 검증으로 복귀하는 개발 후보',()=>{
  it('대기 판단을 버리고 원래 우선검증 행동/대상/RNG/전체 기억을 정확히 복원한다',()=>{
    const t=setup(),a=createBotMemory(5),b=createBotMemory(5),state=structuredClone(t.state);
    expect(smartBotAction(t.state,t.id.freya!,createBotMemory(5),{activity:1,reportVerification:'normal'})).toBeNull();
    const expected=smartBotAction(t.state,t.id.freya!,a,{activity:1});
    const actual=smartBotAction(t.state,t.id.freya!,b,opts);
    expect(actual).toEqual(expected);expect(b).toEqual(a);expect(t.state).toEqual(state);
    expect(actual).toMatchObject({skill:'scan',target:t.id.reindila,name:'reindila'});
    expect(t.act('freya',actual!).ok).toBe(true);
  });
  it('다른 주 행동이 있으면 일반 순서의 행동과 자기 기억을 그대로 채택한다',()=>{
    const t=setup();t.p('freya').gem=3;
    const a=createBotMemory(7),b=createBotMemory(7),ref=b;
    const expected=smartBotAction(t.state,t.id.freya!,a,{activity:1,reportVerification:'normal'});
    expect(smartBotAction(t.state,t.id.freya!,b,opts)).toEqual(expected);
    expect(expected).toMatchObject({skill:'truth_gem'});expect(b).toEqual(a);expect(b).toBe(ref);
  });
  it('비활동은 기존과 같은 난수 진행이며 추가 대화를 만들지 않는다',()=>{
    const t=setup(),a=createBotMemory(5),b=createBotMemory(5);a.communicationAt=123;b.communicationAt=123;
    expect(smartBotAction(t.state,t.id.freya!,a,{activity:0})).toBeNull();
    expect(smartBotAction(t.state,t.id.freya!,b,{...opts,activity:0})).toBeNull();expect(b).toEqual(a);
    expect(botCommunicationAction(t.state,t.id.freya!,b)).toBeNull();
  });
  it('미확인·상충 보고를 신뢰하지 않으며 보고를 직접 facts로 만들지 않는다',()=>{
    const t=setup();delete t.state.revealed[t.id.kelhu!];
    const m=createBotMemory(5);smartBotAction(t.state,t.id.freya!,m,opts);
    let k=botKnowledge(t.state,t.id.freya!,undefined,m);expect(trustedIntel(viewFor(t.state,t.id.freya!),k,m).size).toBe(0);
    t.state.revealed[t.id.kelhu!]='kelhu';t.state.revealed[t.id.mertz!]='mertz';
    t.act('mertz',{type:'chat',channel:'whisper',to:t.id.freya,text:`확인 정보: [${t.p('reindila').seat}] 켈후`});
    const n=createBotMemory(5);smartBotAction(t.state,t.id.freya!,n,opts);k=botKnowledge(t.state,t.id.freya!,undefined,n);
    expect(trustedIntel(viewFor(t.state,t.id.freya!),k,n).size).toBe(0);expect(k.known.has(t.id.reindila!)).toBe(false);
  });
  it('확정 아군 동맹과 적 동맹 파기를 기존대로 우선한다',()=>{
    const t=setup();t.p('freya').skills=civilTable().p('freya').skills;
    expect(smartBotAction(t.state,t.id.freya!,createBotMemory(5),opts)).toEqual({type:'skill',skill:'ally',target:t.id.kelhu});
    t.p('freya').allies=[t.id.arin!];t.state.revealed[t.id.arin!]='arin';
    expect(smartBotAction(t.state,t.id.freya!,createBotMemory(5),opts)).toEqual({type:'skill',skill:'break_ally',target:t.id.arin});
  });
  it('다른 숨은 배정/마나 변경은 행동·기억·관측 제안에 영향을 주지 않는다',()=>{
    const t=setup(),other=structuredClone(t.state),x=other.players.find(p=>p.id===t.id.arin)!,y=other.players.find(p=>p.id===t.id.kaspa)!;
    [x.character,y.character]=[y.character,x.character];x.mana=0;y.mana=1;
    const a=createBotMemory(5),b=createBotMemory(5);
    expect(diagnoseReportVerification(other,t.id.freya!,b,opts)).toEqual(diagnoseReportVerification(t.state,t.id.freya!,a,opts));
    expect(smartBotAction(other,t.id.freya!,b,opts)).toEqual(smartBotAction(t.state,t.id.freya!,a,opts));expect(b).toEqual(a);
  });
  it('기존 부분보석 대기복귀 옵션과 함께 사용해도 일반 제안/기억을 보존한다',()=>{
    const t=setup();t.tick(t.state.nextTurnAt-43000);fill(t,'freya');t.p('freya').published='freya';t.p('freya').gem=2;
    const a=createBotMemory(7),b=createBotMemory(7),combined={...opts,preservePartialGem:'when-busy' as const};
    const expected=smartBotAction(t.state,t.id.freya!,a,{...combined,reportVerification:'normal'});
    expect(expected).not.toBeNull();expect(smartBotAction(t.state,t.id.freya!,b,combined)).toEqual(expected);expect(b).toEqual(a);
  });
});
