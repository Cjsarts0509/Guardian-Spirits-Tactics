import {describe,it,expect} from 'vitest';
import {context,fit,select,type Row} from '../scripts/information-target-model.js';
import {createBotMemory,botKnowledge,viewFor,applyAction} from '../src/index.js';
import {civilTable} from './helpers.js';
const rows=(arm:Row['arm'],reward:number,n=40):Row[]=>Array.from({length:n},()=>({cell:'check-early',arm,reward}));
describe('정보수집 대상 선택 학습',()=>{
 it('보상에 따라 대상교체를 학습하고 부족 표본과 다른 셀은 유지한다',()=>{
  const m=fit([...rows('act',0),...rows('information',1)]);expect(m['check-early']!.choice).toBe('information');expect(m['scan-late']!.choice).toBe('act');
  expect(fit([...rows('act',0),...rows('information',1,31)])['check-early']!.choice).toBe('act');
  expect(fit([...rows('act',1),...rows('information',0)])['check-early']!.choice).toBe('act');
 });
 it('잘못된 학습값을 거절한다',()=>{
  expect(()=>fit([{cell:'unknown',arm:'act',reward:1}])).toThrow();expect(()=>fit(rows('act',NaN))).toThrow();
 });
 it('동맹·공격·대상없는 행동은 교체하지 않는다',()=>{
  const t=civilTable(),id=t.id.kai!,v=viewFor(t.state,id),k=botKnowledge(t.state,id,v,createBotMemory(1));
  for(const skill of ['ally','attack','publish'])expect(context(v,k,{type:'skill',skill,target:t.id.arin})).toBeNull();expect(context(v,k,null)).toBeNull();
 });
 it('실제 뷰에서 대상만 바꾸고 정보량/적확률 조건·입력불변성을 지킨다',()=>{
  const t=civilTable();for(const p of t.state.players){p.mana=150;t.publish(p.character,p.character);}t.tick(360000);
  let checked=false;
  outer:for(const self of t.state.players){
   self.mana=150;const v=viewFor(t.state,self.id),k=botKnowledge(t.state,self.id,v,createBotMemory(2));
   for(const skill of v.me.skills)for(const p of v.players){
    const a={type:'skill' as const,skill:skill.key,target:p.id,...(skill.nameOptions?.length?{name:skill.nameOptions[0]}:{})};
    const before=structuredClone({v,k}),c=context(v,k,a);if(!c)continue;
    expect({v,k}).toEqual(before);expect(c.alternative).toEqual({...a,target:c.alternative.type==='skill'?c.alternative.target:undefined});
    expect(c.alternativeInfo).toBeGreaterThanOrEqual(c.originalInfo*.5);expect(c.alternativeEnemy).toBeGreaterThan(c.originalEnemy);
    expect(select(a,c,'act')).toEqual(a);expect(select(a,c,'information')).toEqual(c.alternative);
    expect(applyAction(structuredClone(t.state),self.id,c.alternative,t.state.now).ok).toBe(true);
    for(const target of v.players)target.statuses.push({kind:'invulnerable',source:'test',remainingMs:10000});expect(context(v,k,a)).toBeNull();
    checked=true;break outer;
   }
  }
  expect(checked).toBe(true);
 });
});
