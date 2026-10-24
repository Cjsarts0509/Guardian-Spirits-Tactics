import {describe,it,expect} from 'vitest';
import {advance,botCommunicationAction,botKnowledge,createBotMemory,smartBotAction,viewFor,type GameEvent} from '../src/index.js';
import {smartBotAction as frozen} from '../scripts/baselines/pre-claim-turn-commitment.js';
import {fixtures,prepareMatch} from '../scripts/league-runner.js';
import {claimTurnCommitted,observeClaimTurnCommitment} from '../src/bot-claim-commitment.js';
import {civilTable,fill,modeTable,TROLL_ORDER} from './helpers.js';
const opts={activity:1,claimTurnCommitment:true};

function natural(at=47_000){
  const t=civilTable();t.tick(at);const self=t.p('dantes'),skills=[...self.skills];
  self.mana=0;self.published='mertz';self.skills=skills.filter(s=>s.key==='publish');
  const m=createBotMemory(5),action=smartBotAction(t.state,t.id.dantes!,m,opts);
  expect(action).toEqual({type:'skill',skill:'publish',name:'dantes'});
  expect(m.perception!.claimCommitment!.until).toBe(0);
  expect(t.act('dantes',action!).ok).toBe(true);
  botCommunicationAction(t.state,t.id.dantes!,m);
  return {t,m,skills};
}
describe('자발적 진명 성공 공표를 다음 자기 턴까지만 유지하는 개발 옵션',()=>{
  it('기본OFF는 고정e527 정책과 행동·전체 기억·RNG가 같다',()=>{
    for(const mode of ['civil_war','primordial','lidellut','troll'] as const)for(const f of fixtures(mode,23,12).slice(0,2)){
      const {state}=prepareMatch(f),a=createBotMemory(71),b=createBotMemory(71);
      for(const at of [0,120000,240000]){advance(state,at);for(let i=0;i<10;i++){
        expect(smartBotAction(state,'p1',a,{activity:.5})).toEqual(frozen(state,'p1',b,{activity:.5}));expect(a).toEqual(b);
      }}
    }
  });
  it('원래 정책의 성공 공표 뒤 대화가 먼저 이벤트를 소비해도 한 턴 의도를 저장한다',()=>{
    const {t,m}=natural(),v=viewFor(t.state,t.id.dantes!);
    expect(claimTurnCommitted(v,m)).toBe(true);expect(m.perception!.claimCommitment!.until).toBe(t.state.nextTurnAt);
    expect(m.perception!.trueNameUntil).toBe(0);
    t.tick(40000);fill(t,'dantes');expect(smartBotAction(t.state,t.id.dantes!,m,opts)).toBeNull();
    const other=structuredClone(m);expect(smartBotAction(t.state,t.id.dantes!,other,{activity:1})).toMatchObject({skill:'publish'});
  });
  it('같은 성공 이벤트 반복/늦은 호출은 종료 시각을 연장하지 않는다',()=>{
    const {t,m}=natural(),until=m.perception!.claimCommitment!.until,events=t.seen('dantes');
    t.tick(5000);const v=viewFor(t.state,t.id.dantes!);
    observeClaimTurnCommitment({...v,nextTurnInMs:999999},events,m);expect(m.perception!.claimCommitment!.until).toBe(until);
  });
  it('자기 턴 수신 때 해제하며 이미 턴을 받은 공표를 늦게 읽어 새 턴을 만들지 않는다',()=>{
    const {t,m}=natural();t.tick(t.state.nextTurnAt-t.now);botKnowledge(t.state,t.id.dantes!,undefined,m);
    expect(claimTurnCommitted(viewFor(t.state,t.id.dantes!),m)).toBe(false);
    botKnowledge(t.state,t.id.dantes!,undefined,m);expect(m.perception!.claimCommitment!.until).toBe(0);
    const late=createBotMemory(3);botKnowledge(t.state,t.id.dantes!,undefined,late,{claimTurnCommitment:true});
    expect(late.perception!.claimCommitment!.until).toBe(0);
  });
  it('턴 이벤트가 없어도 공개된 다음 턴 시각에서 유한하게 종료한다',()=>{
    const {t,m}=natural(),v=viewFor(t.state,t.id.dantes!),until=m.perception!.claimCommitment!.until;
    expect(claimTurnCommitted({...v,elapsedMs:until},m)).toBe(false);
    observeClaimTurnCommitment({...v,elapsedMs:until,nextTurnInMs:90000},[],m);expect(m.perception!.claimCommitment!.until).toBe(0);
  });
  it('실패한 제안·남의 공표·자동 공표·타인 비공개 이벤트는 시작하지 않는다',()=>{
    const t=civilTable();t.p('dantes').published='dantes';const m=createBotMemory(4),v=viewFor(t.state,t.id.dantes!);
    botKnowledge(t.state,t.id.dantes!,v,m,{claimTurnCommitment:true});
    expect(t.publish('dantes','not-a-character').ok).toBe(false);botKnowledge(t.state,t.id.dantes!,undefined,m);
    expect(m.perception!.claimCommitment!.until).toBe(0);
    const seq=t.state.seq+10,event=(n:number,kind:string,player:string,vis:GameEvent['vis']={to:'all'}):GameEvent=>({seq:seq+n,at:0,kind,text:'test',vis,data:{player,name:'dantes'}});
    observeClaimTurnCommitment(v,[event(0,'publish',t.id.kai!),event(1,'publish',t.id.dantes!,{to:'players',ids:[t.id.kai!]}),event(2,'publish.auto',t.id.dantes!)],m);
    expect(m.perception!.claimCommitment!.until).toBe(0);
  });
  it('변장 인물은 실제 진명 공표를 성공해도 유지하지 않는다',()=>{
    const t=modeTable('troll',TROLL_ORDER),m=createBotMemory(4);expect(t.publish('neonis','neonis').ok).toBe(true);
    botKnowledge(t.state,t.id.neonis!,undefined,m,{claimTurnCommitment:true});expect(m.perception!.claimCommitment!.until).toBe(0);
  });
  it('죽음·다른 가명·인물 변환·새 판은 의도를 해제한다',()=>{
    const {t,m}=natural(),v=viewFor(t.state,t.id.dantes!);
    const dead=structuredClone(m);observeClaimTurnCommitment({...v,me:{...v.me,alive:false}},[],dead);expect(dead.perception!.claimCommitment!.until).toBe(0);
    t.tick(40000);expect(t.publish('dantes','mertz').ok).toBe(true);botKnowledge(t.state,t.id.dantes!,undefined,m);expect(m.perception!.claimCommitment!.until).toBe(0);
    const fresh=natural(),sameRole=civilTable();botKnowledge(sameRole.state,sameRole.id.dantes!,undefined,fresh.m,{claimTurnCommitment:true});expect(fresh.m.perception!.claimCommitment!.until).toBe(0);
    const changed=natural();changed.t.p('dantes').character='mertz';botKnowledge(changed.t.state,changed.t.id.dantes!,undefined,changed.m,{claimTurnCommitment:true});expect(changed.m.perception!.claimCommitment!.until).toBe(0);
  });
  it('유지 중에도 확정 적 공격을 기존 행동/RNG대로 실행한다',()=>{
    const {t,m,skills}=natural(330000);t.p('dantes').skills=skills;fill(t,'dantes');t.state.revealed[t.id.arin!]='arin';
    const a=structuredClone(m),b=structuredClone(m),expected=smartBotAction(t.state,t.id.dantes!,a,{activity:1});
    const actual=smartBotAction(t.state,t.id.dantes!,b,opts);expect(actual).toEqual(expected);expect(a.rng).toBe(b.rng);
    expect(actual?.type).toBe('skill');expect(['attack','advanced_attack','supreme_attack']).toContain(actual?.type==='skill'?actual.skill:'');
    expect(t.act('dantes',actual!).ok).toBe(true);
  });
  it('확정 아군 동맹·적 동맹 파기와 별도 비공개 보고를 계속한다',()=>{
    const t=civilTable();fill(t,'freya');t.state.revealed[t.id.kelhu!]='kelhu';t.state.revealed[t.id.reindila!]='reindila';
    expect(t.publish('freya','freya').ok).toBe(true);const m=createBotMemory(7);
    botKnowledge(t.state,t.id.freya!,undefined,m,{claimTurnCommitment:true});expect(claimTurnCommitted(viewFor(t.state,t.id.freya!),m)).toBe(true);
    const a=smartBotAction(t.state,t.id.freya!,m,opts);expect(a).toEqual({type:'skill',skill:'ally',target:t.id.kelhu});expect(t.act('freya',a!).ok).toBe(true);
    const chat=botCommunicationAction(t.state,t.id.freya!,m);expect(chat).toMatchObject({type:'chat',channel:'whisper',to:t.id.kelhu});expect(t.act('freya',chat!).ok).toBe(true);
    t.p('freya').allies.push(t.id.arin!);t.state.revealed[t.id.arin!]='arin';expect(smartBotAction(t.state,t.id.freya!,m,opts)).toEqual({type:'skill',skill:'break_ally',target:t.id.arin});
  });
  it('타인의 숨은 정체/마나 교환은 자기 행동·기억·의도에 영향을 주지 않는다',()=>{
    const {t,m,skills}=natural();t.p('dantes').skills=skills;fill(t,'dantes');const other=structuredClone(t.state);
    const x=other.players.find(p=>p.id===t.id.arin)!,y=other.players.find(p=>p.id===t.id.kaspa)!;[x.character,y.character]=[y.character,x.character];x.mana=0;y.mana=1;
    const a=structuredClone(m),b=structuredClone(m);expect(smartBotAction(other,t.id.dantes!,b,opts)).toEqual(smartBotAction(t.state,t.id.dantes!,a,opts));expect(b).toEqual(a);
  });
  it('비활동은 의도/RNG를 추가 변경하거나 대화 기회를 만들지 않는다',()=>{
    const {t,m}=natural(),a=structuredClone(m),b=structuredClone(m),before=structuredClone(m.perception!.claimCommitment);
    expect(smartBotAction(t.state,t.id.dantes!,a,{activity:0})).toBeNull();expect(smartBotAction(t.state,t.id.dantes!,b,{...opts,activity:0})).toBeNull();
    expect(a.rng).toBe(b.rng);expect(b.perception!.claimCommitment).toEqual(before);expect(botCommunicationAction(t.state,t.id.dantes!,b)).toBeNull();
  });
  it('strategic 외의 공표 전략에는 의도를 생성하지 않는다',()=>{
    const t=civilTable(),a=createBotMemory(7),b=createBotMemory(7);const base={activity:1,claimStrategy:'current' as const};
    expect(smartBotAction(t.state,t.id.dantes!,a,{...base,claimTurnCommitment:true})).toEqual(smartBotAction(t.state,t.id.dantes!,b,base));expect(a).toEqual(b);
  });
});
