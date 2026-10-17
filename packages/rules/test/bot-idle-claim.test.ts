import {describe,it,expect} from 'vitest';
import {botCommunicationAction,createBotMemory,smartBotAction,viewFor} from '../src/index.js';
import {idleClaimViewEligible,idleManualTrueClaim} from '../src/bot-idle-claim.js';
import {civilTable} from './helpers.js';
const opts={activity:1,idleClaimMana:true};
function idle(){
  const t=civilTable();t.p('mertz').mana=20;t.p('mertz').skills=t.p('mertz').skills.filter(s=>s.key==='publish');
  expect(t.publish('mertz','mertz').ok).toBe(true);t.tick(40000);return {t,id:t.id.mertz!};
}
describe('기존 주 행동이 null인 실제 활동 때만 기존 수동 진명으로+5마나',()=>{
  it('기존 null/전체 자기 기억/RNG를 유지하며 실제 같은 이름 공표로5마나를 얻는다',()=>{
    const {t,id}=idle(),a=createBotMemory(71),b=createBotMemory(71),state=structuredClone(t.state);
    expect(smartBotAction(t.state,id,a,{activity:1})).toBeNull();const action=smartBotAction(t.state,id,b,opts);
    expect(action).toEqual({type:'skill',skill:'publish',name:'mertz'});expect(b).toEqual(a);expect(t.state).toEqual(state);
    const before=viewFor(t.state,id);expect(t.act('mertz',action!).ok).toBe(true);const after=viewFor(t.state,id);
    expect(after.me.mana-before.me.mana).toBe(5);expect(after.me.published).toBe(before.me.published);expect(after.me.skills.find(s=>s.key==='publish')!.blocked).not.toBeNull();
  });
  it('순수 제안은 원래 행동이 있으면 거절하고 뷰/자기 기억을 바꾸지 않는다',()=>{
    const {t,id}=idle(),m=createBotMemory(5);smartBotAction(t.state,id,m,{activity:1});const v=viewFor(t.state,id),before=structuredClone({v,m});
    expect(idleManualTrueClaim(v,m,{type:'skill',skill:'scan',target:t.id.kai})).toBeNull();expect(idleManualTrueClaim(v,m,null)).toMatchObject({name:'mertz'});expect({v,m}).toEqual(before);
  });
  it('종료/죽음/가명/변장/불가 공표/불완전 마나 여유/불가 이름은 제외한다',()=>{
    const {t,id}=idle(),m=createBotMemory(5);smartBotAction(t.state,id,m,{activity:1});const v=viewFor(t.state,id);
    const cases=[{...v,phase:'ended' as const},{...v,me:{...v.me,alive:false}},{...v,me:{...v.me,trueName:false,published:'freya'}},
      {...v,me:{...v.me,skills:[...v.me.skills,{...v.me.skills[0]!,key:'disguise'}]}},
      {...v,me:{...v.me,skills:v.me.skills.map(s=>({...s,blocked:'대기'}))}},
      {...v,me:{...v.me,mana:v.me.maxMana-4}},
      {...v,me:{...v.me,skills:v.me.skills.map(s=>({...s,nameOptions:['freya']}))}}];
    for(const x of cases){expect(idleClaimViewEligible(x)).toBe(false);expect(idleManualTrueClaim(x,m,null)).toBeNull();}
  });
  it('자동 공표만 한 경우·타인/다른 판/다른 인물 기억은 추가하지 않는다',()=>{
    const {t,id}=idle(),m=createBotMemory(5);smartBotAction(t.state,id,m,{activity:1});const v=viewFor(t.state,id);
    for(const change of [(n:typeof m)=>{n.perception!.manualClaims.delete(id);n.perception!.automaticClaims.add(id);},
      (n:typeof m)=>{n.perception!.playerId=t.id.kai!;},(n:typeof m)=>{n.perception!.mode='troll';},
      (n:typeof m)=>{n.perception!.character='kai';},(n:typeof m)=>{n.perception!.lastElapsedMs=v.elapsedMs+1;}]){
      const n=structuredClone(m);change(n);expect(idleManualTrueClaim(v,n,null)).toBeNull();
    }
  });
  it('비활동은 추가 행동/RNG/대화 기회를 만들지 않는다',()=>{
    const {t,id}=idle(),a=createBotMemory(71),b=createBotMemory(71);a.communicationAt=t.now;b.communicationAt=t.now;
    expect(smartBotAction(t.state,id,a,{activity:0})).toBeNull();expect(smartBotAction(t.state,id,b,{...opts,activity:0})).toBeNull();expect(b).toEqual(a);
    expect(botCommunicationAction(t.state,id,b)).toBeNull();
  });
  it('이미 선택한 확정 공격은 실제 재공표 가능 상태에서도 그대로 실행한다',()=>{
    const t=civilTable();expect(t.publish('dantes','dantes').ok).toBe(true);t.tick(330000);t.p('dantes').mana=100;t.state.revealed[t.id.arin!]='arin';
    const a=createBotMemory(7),b=createBotMemory(7),expected=smartBotAction(t.state,t.id.dantes!,a,{activity:1});
    expect(smartBotAction(t.state,t.id.dantes!,b,opts)).toEqual(expected);expect(b).toEqual(a);
    expect(['attack','advanced_attack','supreme_attack']).toContain(expected?.type==='skill'?expected.skill:'');expect(t.act('dantes',expected!).ok).toBe(true);
  });
  it('아군 동맹/적 동맹 파기와 같은 판단의 실제 비공개 보고를 유지한다',()=>{
    const t=civilTable();expect(t.publish('freya','freya').ok).toBe(true);t.tick(40000);t.p('freya').mana=100;t.state.revealed[t.id.kelhu!]='kelhu';t.state.revealed[t.id.reindila!]='reindila';
    const m=createBotMemory(7),a=smartBotAction(t.state,t.id.freya!,m,opts);expect(a).toEqual({type:'skill',skill:'ally',target:t.id.kelhu});expect(t.act('freya',a!).ok).toBe(true);
    const chat=botCommunicationAction(t.state,t.id.freya!,m);expect(chat).toMatchObject({type:'chat',channel:'whisper',to:t.id.kelhu});expect(t.act('freya',chat!).ok).toBe(true);
    t.p('freya').allies.push(t.id.arin!);t.state.revealed[t.id.arin!]='arin';expect(smartBotAction(t.state,t.id.freya!,m,opts)).toEqual({type:'skill',skill:'break_ally',target:t.id.arin});
  });
  it('남의 숨은 배정/마나/미수신 이벤트는 자기 행동·기억에 영향이 없다',()=>{
    const {t,id}=idle(),other=structuredClone(t.state),x=other.players.find(p=>p.id===t.id.arin)!,y=other.players.find(p=>p.id===t.id.kaspa)!;
    [x.character,y.character]=[y.character,x.character];x.mana=0;y.mana=1;
    other.log.push({seq:++other.seq,at:other.now,kind:'scan',vis:{to:'players',ids:[t.id.kai!]},text:'타인 비공개',facts:[{player:t.id.kaspa!,character:'kaspa'}]});
    const a=createBotMemory(7),b=createBotMemory(7);expect(smartBotAction(other,id,b,opts)).toEqual(smartBotAction(t.state,id,a,opts));expect(b).toEqual(a);
  });
  it('다른 공표 전략은 바꾸지 않는다',()=>{
    const {t,id}=idle(),a=createBotMemory(7),b=createBotMemory(7),base={activity:1,claimStrategy:'current' as const};
    expect(smartBotAction(t.state,id,b,{...base,idleClaimMana:true})).toEqual(smartBotAction(t.state,id,a,base));expect(b).toEqual(a);
  });
});
