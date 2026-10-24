import {describe,it,expect} from 'vitest';
import {assignmentBelief,botCommunicationAction,botKnowledge,createBotMemory,smartBotAction,viewFor} from '../src/index.js';
import {shareIntel,trustedIntel} from '../src/bot-intel.js';
import {civilTable,fill,modeTable,TROLL_ORDER} from './helpers.js';

function scenario(sender='kanulla',name='hachi') {
  const t=modeTable('troll',TROLL_ORDER);t.tick(4*60_000);fill(t,'deka');
  t.state.revealed[t.id[sender]!]=sender;
  expect(t.act(sender,{type:'chat',channel:'whisper',to:t.id.deka,text:`확인 정보: [${t.p('hachi').seat}] ${viewFor(t.state,t.id.deka!).roster.find(r=>r.key===name)!.name}`}).ok).toBe(true);
  t.p('deka').gem=3;t.p('deka').gemCooldownUntil=0;
  t.p('deka').skills=t.p('deka').skills.filter(s=>['truth_gem','scan','troll_scan','advanced_scan'].includes(s.key));
  return t;
}

describe('보고 재확인을 일반 정보 순서에서 판단하는 개발 옵션',()=>{
  it('기본값은 기존 우선 검증과 행동·전체 기억·RNG가 같다',()=>{
    const t=scenario();
    for(let seed=1;seed<=12;seed++){
      const a=createBotMemory(seed),b=createBotMemory(seed);
      expect(smartBotAction(t.state,t.id.deka!,a,{activity:1})).toEqual(smartBotAction(t.state,t.id.deka!,b,{activity:1,reportVerification:'priority'}));
      expect(a).toEqual(b);
    }
  });
  it('신뢰 보고와 추론 가중치를 보존하고 직접 facts나 재전파로 승격하지 않는다',()=>{
    const t=scenario(),m=createBotMemory(7),v=viewFor(t.state,t.id.deka!),k=botKnowledge(t.state,t.id.deka!,v,m);
    const before=assignmentBelief(v,k,m).probabilities.get(t.id.hachi!)!.get('hachi')!;
    expect(trustedIntel(v,k,m).get(t.id.hachi!)).toBe('hachi');
    const without=structuredClone(m);without.perception!.intel=undefined;without.beliefCache=undefined;
    expect(before).toBeGreaterThan(assignmentBelief(v,k,without).probabilities.get(t.id.hachi!)!.get('hachi')!);
    smartBotAction(t.state,t.id.deka!,m,{activity:1,reportVerification:'normal'});
    expect(botKnowledge(t.state,t.id.deka!,undefined,m).known.has(t.id.hachi!)).toBe(false);
    expect(trustedIntel(v,k,m).get(t.id.hachi!)).toBe('hachi');expect(shareIntel(v,k,m)).toBeNull();
  });
  it('일반 순서에서도 실제 정보 행동을 선택하고 정상 엔진에서 허용된다',()=>{
    const t=scenario(),m=createBotMemory(9);
    const action=smartBotAction(t.state,t.id.deka!,m,{activity:1,reportVerification:'normal'});
    expect(action).toMatchObject({type:'skill',skill:'truth_gem'});
    expect(t.act('deka',action!).ok).toBe(true);
  });
  it('보고 이름별 스캔 강제 우선만 해제하고 기존 보석 정보 행동으로 진행한다',()=>{
    const t=civilTable();fill(t,'freya');t.p('freya').gem=3;t.p('freya').gemCooldownUntil=0;
    t.state.revealed[t.id.kelhu!]='kelhu';
    expect(t.act('kelhu',{type:'chat',channel:'whisper',to:t.id.freya,text:`확인 정보: [${t.p('reindila').seat}] 레인딜라`}).ok).toBe(true);
    t.p('freya').skills=t.p('freya').skills.filter(s=>s.key==='scan');
    const priority=smartBotAction(t.state,t.id.freya!,createBotMemory(7),{activity:1});
    const normal=smartBotAction(t.state,t.id.freya!,createBotMemory(7),{activity:1,reportVerification:'normal'});
    expect(priority).toEqual({type:'skill',skill:'scan',target:t.id.reindila,name:'reindila'});
    expect(normal).toMatchObject({type:'skill',skill:'truth_gem'});
    expect(t.act('freya',normal!).ok).toBe(true);
  });
  it('위장/미확인 및 적 발신자의 보고는 신뢰하지 않는다',()=>{
    for(const sender of ['kanulla','satoshi']){
      const t=scenario(sender);if(sender==='kanulla')delete t.state.revealed[t.id.kanulla!];
      const m=createBotMemory(3);smartBotAction(t.state,t.id.deka!,m,{activity:1,reportVerification:'normal'});
      const k=botKnowledge(t.state,t.id.deka!,undefined,m);
      expect(trustedIntel(viewFor(t.state,t.id.deka!),k,m).size).toBe(0);
    }
  });
  it('확정 아군 동맹/확정 적 동맹 파기를 유지하고 대화는 주 행동과 별개다',()=>{
    const t=scenario();t.p('deka').skills=modeTable('troll',TROLL_ORDER).p('deka').skills;
    const m=createBotMemory(2),a=smartBotAction(t.state,t.id.deka!,m,{activity:1,reportVerification:'normal'});
    expect(a).toEqual({type:'skill',skill:'ally',target:t.id.kanulla});
    expect(t.act('deka',a!).ok).toBe(true);
    t.state.revealed[t.id.hachi!]='hachi';t.p('deka').allies.push(t.id.hachi!);
    expect(smartBotAction(t.state,t.id.deka!,m,{activity:1,reportVerification:'normal'})).toEqual({type:'skill',skill:'break_ally',target:t.id.hachi});
    smartBotAction(t.state,t.id.deka!,m,{activity:0,reportVerification:'normal'});
    expect(botCommunicationAction(t.state,t.id.deka!,m)).toBeNull();
  });
  it('남의 숨은 배정·마나 변경은 자기 행동/기억을 바꾸지 않는다',()=>{
    const t=scenario(),other=structuredClone(t.state),a=other.players.find(p=>p.id===t.id.hachi)!,b=other.players.find(p=>p.id===t.id.tokra)!;
    [a.character,b.character]=[b.character,a.character];a.mana=0;b.mana=1;
    const m=createBotMemory(5),n=createBotMemory(5),opts={activity:1,reportVerification:'normal' as const};
    expect(smartBotAction(t.state,t.id.deka!,m,opts)).toEqual(smartBotAction(other,t.id.deka!,n,opts));
    expect(m).toEqual(n);
  });
});
