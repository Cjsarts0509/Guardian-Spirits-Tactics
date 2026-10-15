import {describe,it,expect} from 'vitest';
import {botKnowledge,createBotMemory,smartBotAction,viewFor,applyAction} from '../src/index.js';
import {forecastAttackBudget} from '../src/bot-attack-budget.js';
import {smartBotAction as priorPR} from '../scripts/baselines/pre-round024.js';
import {civilTable} from './helpers.js';

function setup(){
  const t=civilTable(),p=t.p('mertz');t.publish('mertz','mertz');p.skills=p.skills.filter(s=>['ally','advanced_attack'].includes(s.key));
  t.tick(t.state.nextTurnAt-t.now-10_000);p.mana=25;t.state.revealed[t.id.kelhu!]='kelhu';t.state.revealed[t.id.kaspa!]='kaspa';
  p.skills.find(s=>s.key==='advanced_attack')!.cooldownUntil=t.now+15_000;
  const m=createBotMemory(2),v=viewFor(t.state,p.id),k=botKnowledge(t.state,p.id,v,m);return {t,p,m,v,k};
}
describe('다음 자기 턴 직후 확정 공격의 제한 예산',()=>{
  it('공격50-예상수입30=현재20만 남기며 입력/기억/RNG를 바꾸지 않는다',()=>{
    const {v,k,m}=setup(),before=structuredClone({v,k,m});
    expect(forecastAttackBudget(v,k)).toMatchObject({skill:'advanced_attack',cost:50,manaToKeep:20,cooldownRemainingMs:15000});
    expect({v,k,m}).toEqual(before);
  });
  it('기본OFF/명시false는 같은 동맹, ON은 제한 보류 뒤 실제 공격과 동맹을 이어간다',()=>{
    const {t,p}=setup(),action=(on?:boolean)=>smartBotAction(t.state,p.id,createBotMemory(2),{activity:1,forecastAttackBudget:on});
    expect(action()).toEqual(action(false));expect(action()).toEqual({type:'skill',skill:'ally',target:t.id.kelhu});expect(action(true)).toBeNull();
    const m=createBotMemory(2);expect(smartBotAction(t.state,p.id,m,{activity:1,forecastAttackBudget:true})).toBeNull();
    t.tick(10000);expect(p.mana).toBe(55);expect(smartBotAction(t.state,p.id,m,{activity:1,forecastAttackBudget:true})).toBeNull();
    t.tick(5000);const attack=smartBotAction(t.state,p.id,m,{activity:1,forecastAttackBudget:true});expect(attack).toEqual({type:'skill',skill:'advanced_attack',target:t.id.kaspa,name:'kaspa'});
    expect(applyAction(t.state,p.id,attack!,t.now).ok).toBe(true);t.tick(t.state.nextTurnAt-t.now);
    expect(smartBotAction(t.state,p.id,m,{activity:1,forecastAttackBudget:true})).toEqual({type:'skill',skill:'ally',target:t.id.kelhu});
  });
  it('공격 예산을 깨지 않는 여유 마나는 동맹에 쓴다',()=>{
    const {t,p}=setup();p.mana=30;
    expect(smartBotAction(t.state,p.id,createBotMemory(2),{activity:1,forecastAttackBudget:true})).toEqual({type:'skill',skill:'ally',target:t.id.kelhu});
  });
  it('확정 적 동맹 파기는 예산 부족분보다 먼저 실행한다',()=>{
    const {t,p}=setup();p.skills.push({key:'break_ally',cooldownUntil:0,usesLeft:null,level:1});p.allies.push(t.id.kaspa!);
    const a=smartBotAction(t.state,p.id,createBotMemory(2),{activity:1,forecastAttackBudget:true});
    expect(a).toEqual({type:'skill',skill:'break_ally',target:t.id.kaspa});expect(t.act('mertz',a!).ok).toBe(true);expect(p.allies).not.toContain(t.id.kaspa);
  });
  it('기본 정책에서도 충분한 현재 마나를 예약할 때 확정 적 동맹을 파기한다',()=>{
    const {t,p}=setup();p.mana=50;p.skills.push({key:'break_ally',cooldownUntil:0,usesLeft:null,level:1});p.allies.push(t.id.kaspa!);
    expect(priorPR(t.state,p.id,createBotMemory(2),{activity:1})).toBeNull();
    const a=smartBotAction(t.state,p.id,createBotMemory(2),{activity:1});
    expect(a).toEqual({type:'skill',skill:'break_ally',target:t.id.kaspa});expect(t.act('mertz',a!).ok).toBe(true);expect(p.allies).not.toContain(t.id.kaspa);
  });
  it('현재 이미 충분하거나 미리보기로도 부족하거나 다음 턴이 비용 전부를 주면 추가 예약이 없다',()=>{
    for(const [mana,preview] of [[50,30],[10,30],[25,50]] as const){const {v,k}=setup();v.me.mana=mana;v.me.nextTurnManaPreview=preview;expect(forecastAttackBudget(v,k)).toBeNull();}
  });
  it('공격 준비가 턴보다 빠르거나20초 밖이거나 이미 준비됐으면 새 예약을 만들지 않는다',()=>{
    for(const cooldown of [0,9999,20001]){const {v,k}=setup();v.me.skills.find(s=>s.key==='advanced_attack')!.cooldownRemainingMs=cooldown;expect(forecastAttackBudget(v,k)).toBeNull();}
    const {v,k}=setup();v.nextTurnInMs=0;expect(forecastAttackBudget(v,k)).toBeNull();
  });
  it('수입이 줄거나 상한이 낮으면 즉시 예약을 풀어 미래 수입을 보장하지 않는다',()=>{
    const {v,k}=setup();expect(forecastAttackBudget(v,k)).not.toBeNull();v.me.nextTurnManaPreview=20;expect(forecastAttackBudget(v,k)).toBeNull();
    v.me.nextTurnManaPreview=30;v.me.maxMana=49;expect(forecastAttackBudget(v,k)).toBeNull();
  });
  it('보고/공표만으로 확정되지 않은 정체에는 예약하지 않는다',()=>{
    const {v,k}=setup();k.known.delete(v.players.find(p=>p.revealed==='kaspa')!.id);expect(forecastAttackBudget(v,k)).toBeNull();
  });
  it('자기 행동 불능·종료·사망·소진 스킬·공개 보호와 살아 있는 보디가드에는 예약하지 않는다',()=>{
    for(const mutate of [(v:any)=>v.me.effects.push({kind:'incapacitated'}),(v:any)=>v.phase='ended',(v:any)=>v.me.alive=false,
      (v:any)=>v.me.skills.find((s:any)=>s.key==='advanced_attack').usesLeft=0,(v:any)=>v.players.find((p:any)=>p.revealed==='kaspa').statuses.push({kind:'invulnerable'})]){
      const {v,k}=setup();mutate(v);expect(forecastAttackBudget(v,k)).toBeNull();
    }
    const {v,k}=setup();const target=v.players.find(p=>p.revealed==='kaspa')!;k.known.set(target.id,'kai');expect(forecastAttackBudget(v,k)).toBeNull();
  });
  it('비활동에는 예약·대화를 만들지 않고 이미 준비된 확정 공격을 보류하지 않는다',()=>{
    const {t,p,m}=setup();expect(smartBotAction(t.state,p.id,m,{activity:0,forecastAttackBudget:true})).toBeNull();expect(m.communicationAt).toBeUndefined();
    p.mana=50;p.skills.find(s=>s.key==='advanced_attack')!.cooldownUntil=0;
    expect(smartBotAction(t.state,p.id,createBotMemory(2),{activity:1,forecastAttackBudget:true})).toMatchObject({type:'skill',skill:'advanced_attack'});
  });
  it('숨은 타인 배정·마나·비수신 이벤트를 바꿔도 같은 자기 뷰/행동이다',()=>{
    const {t,p}=setup(),s=structuredClone(t.state),a=s.players.find(x=>x.character==='freya')!,b=s.players.find(x=>x.character==='reindila')!;
    [a.character,b.character]=[b.character,a.character];a.mana=0;b.mana=149;
    s.log.push({seq:++s.seq,at:s.now,kind:'private.fake',text:'비공개',vis:{to:'players',ids:[a.id]},data:{name:'kai'}});
    expect(viewFor(s,p.id)).toEqual(viewFor(t.state,p.id));
    expect(smartBotAction(s,p.id,createBotMemory(2),{activity:1,forecastAttackBudget:true})).toEqual(smartBotAction(t.state,p.id,createBotMemory(2),{activity:1,forecastAttackBudget:true}));
  });
});
