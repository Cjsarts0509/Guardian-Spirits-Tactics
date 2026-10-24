import {describe,it,expect} from 'vitest';
import {botKnowledge,createBotMemory,smartBotAction,viewFor} from '../src/index.js';
import {diagnoseReportVerification,recordReportVerificationOutcome} from '../scripts/cooperative-report-diagnostics.js';
import {playMatch,fixtures,DEFAULT_SETTINGS,type Policy} from '../scripts/league-runner.js';
import {civilTable,fill} from './helpers.js';

function setup(){
  const t=civilTable();fill(t,'freya');t.p('freya').gem=3;t.p('freya').gemCooldownUntil=0;
  t.state.revealed[t.id.kelhu!]='kelhu';
  expect(t.act('kelhu',{type:'chat',channel:'whisper',to:t.id.freya,text:`확인 정보: [${t.p('reindila').seat}] 레인딜라`}).ok).toBe(true);
  t.p('freya').skills=t.p('freya').skills.filter(s=>s.key==='scan');return t;
}
describe('자기 관찰만 사용하는 보고 재확인 대체 행동 진단',()=>{
  it('같은 순간의 보고 스캔/일반 보석 제안을 분리하고 실제 선택과 맞는다',()=>{
    const t=setup();
    for(const reportVerification of ['priority','normal'] as const){
      const m=createBotMemory(7),opts={activity:1,reportVerification};
      const row=diagnoseReportVerification(t.state,t.id.freya!,m,opts)!;
      expect(row.priority).toEqual({type:'skill',skill:'scan',target:t.id.reindila,name:'reindila'});
      expect(row.normal).toMatchObject({type:'skill',skill:'truth_gem'});
      expect(row.changed).toBe(true);expect(row.reportName).toBe('reindila');
      expect(row.priorityExpectedInformation).toBeGreaterThan(0);expect(row.normalExpectedInformation).toBeGreaterThan(0);
      expect(row.chosen).toEqual(smartBotAction(t.state,t.id.freya!,m,opts));
    }
  });
  it('상태와 실제 기억/RNG를 전혀 바꾸지 않고 보고를 facts로 만들지 않는다',()=>{
    const t=setup(),m=createBotMemory(7),state=structuredClone(t.state),memory=structuredClone(m);
    expect(diagnoseReportVerification(t.state,t.id.freya!,m,{activity:1})).toBeDefined();
    expect(t.state).toEqual(state);expect(m).toEqual(memory);
    expect(botKnowledge(t.state,t.id.freya!,undefined,m).known.has(t.id.reindila!)).toBe(false);
  });
  it('비활동·협력OFF·미확인/상충 발신자 및 먼저 실행할 동맹은 관측하지 않는다',()=>{
    const t=setup();
    expect(diagnoseReportVerification(t.state,t.id.freya!,createBotMemory(7),{activity:0})).toBeUndefined();
    expect(diagnoseReportVerification(t.state,t.id.freya!,createBotMemory(7),{activity:1,teamwork:false})).toBeUndefined();
    delete t.state.revealed[t.id.kelhu!];expect(diagnoseReportVerification(t.state,t.id.freya!,createBotMemory(7),{activity:1})).toBeUndefined();
    t.state.revealed[t.id.kelhu!]='kelhu';t.state.revealed[t.id.mertz!]='mertz';
    t.act('mertz',{type:'chat',channel:'whisper',to:t.id.freya,text:`확인 정보: [${t.p('reindila').seat}] 켈후`});
    expect(diagnoseReportVerification(t.state,t.id.freya!,createBotMemory(7),{activity:1})).toBeUndefined();
    const u=setup();u.p('freya').skills=civilTable().p('freya').skills;
    expect(diagnoseReportVerification(u.state,u.id.freya!,createBotMemory(7),{activity:1})).toBeUndefined();
  });
  it('실제 본인 결과의 즉시 지식만 기록하고 종료 공개를 제외한다',()=>{
    const t=setup(),m=createBotMemory(7),row=diagnoseReportVerification(t.state,t.id.freya!,m,{activity:1})!;
    const action=smartBotAction(t.state,t.id.freya!,m,{activity:1})!,result=t.act('freya',action),before=structuredClone(m);
    recordReportVerificationOutcome(row,t.state,t.id.freya!,m,result);
    expect(row.accepted).toBe(true);expect(row.totalCandidatesAfter).toBeLessThanOrEqual(row.totalCandidatesBefore);expect(m).toEqual(before);
    const ended={...row,knownAfter:null,totalCandidatesAfter:null};t.state.phase='ended';
    recordReportVerificationOutcome(ended,t.state,t.id.freya!,m,{ok:true,events:[]});
    expect(ended.ended).toBe(true);expect(ended.knownAfter).toBeNull();
    recordReportVerificationOutcome(row,t.state,t.id.freya!,m,{ok:false,error:'대상이 보호받고 있어 지정할 수 없습니다.',events:[]});
    expect(row.accepted).toBe(false);expect(row.error).toContain('보호');
  });
  it('남의 숨은 배정/마나 변경은 관측 제안에도 영향을 주지 않는다',()=>{
    const t=setup(),other=structuredClone(t.state),a=other.players.find(p=>p.id===t.id.arin)!,b=other.players.find(p=>p.id===t.id.kaspa)!;
    [a.character,b.character]=[b.character,a.character];a.mana=0;b.mana=1;
    expect(diagnoseReportVerification(other,t.id.freya!,createBotMemory(7),{activity:1})).toEqual(diagnoseReportVerification(t.state,t.id.freya!,createBotMemory(7),{activity:1}));
  });
  it('관측기를 붙여도 두 고정 정책 각각의 실제 경기 결과/행동은 같다',()=>{
    for(const reportVerification of ['priority','normal'] as const){
      const f=fixtures('civil_war',43,8)[0]!,settings={...DEFAULT_SETTINGS,activity:0.2,limitMs:10*60_000};
      const plain:Policy=(s,id,m,o)=>smartBotAction(s,id,m,{...o,reportVerification});
      const traced:Policy=(s,id,m,o)=>{const row=diagnoseReportVerification(s,id,m,{...o,reportVerification}),a=plain(s,id,m,o);if(row)expect(row.chosen).toEqual(a);return a;};
      expect(playMatch(f,{current:traced,reference:plain},settings)).toEqual(playMatch(f,{current:plain,reference:plain},settings));
    }
  });
});
