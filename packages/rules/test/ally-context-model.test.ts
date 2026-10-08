import {describe,it,expect} from 'vitest';
import {context,fit,select,type Row} from '../scripts/ally-context-model.js';
import {botKnowledge,viewFor,createBotMemory,applyAction} from '../src/index.js';
import {civilTable} from './helpers.js';
const rows=(cell:string,arm:Row['arm'],reward:number,n=40):Row[]=>Array.from({length:n},()=>({cell,arm,reward}));
describe('동맹 필요도와 대체 정보 행동 학습',()=>{
 it('표본이 충분한 최선의 대안을 학습하며 미관측 셀은 실행을 유지한다',()=>{
  const m=fit([...rows('none-uncertain-info','act',0),...rows('none-uncertain-info','wait',0.5),...rows('none-uncertain-info','information',1)]);
  expect(m['none-uncertain-info']!.choice).toBe('information');
  expect(m['some-known-noinfo']!.choice).toBe('act');
  expect(fit([...rows('none-uncertain-info','act',0),...rows('none-uncertain-info','wait',1,31)])['none-uncertain-info']!.choice).toBe('act');
  expect(()=>fit(rows('some-known-noinfo','information',1))).toThrow();
 });
 it('자기 동맹·확정 지식·공개 보호만으로 특징을 만들며 입력을 변경하지 않는다',()=>{
  const t=civilTable(),id=t.id.kai!,v=viewFor(t.state,id),m=createBotMemory(2),k=botKnowledge(t.state,id,v,m);
  v.me.skills=[];const a={type:'skill' as const,skill:'ally',target:t.id.arin!};
  const before=structuredClone({v,k});expect(context(v,k,a)?.cell).toBe('none-uncertain-noinfo');
  expect({v,k}).toEqual(before);v.me.allies=[t.id.arin!];k.known.set(t.id.arin!,'arin');
  expect(context(v,k,a)?.cell).toBe('some-known-noinfo');
  v.players.find(p=>p.id===t.id.arin)!.alive=false;expect(context(v,k,a)?.cell).toBe('none-known-noinfo');
 });
 it('실제 자기 뷰에서 만든 대안은 엔진이 허용하며 공개 보호 대상을 제외한다',()=>{
  const t=civilTable();t.tick(360000);let checked=false;
  for(const self of t.state.players){
   self.mana=150;const v=viewFor(t.state,self.id),k=botKnowledge(t.state,self.id,v,createBotMemory(1));
   const a={type:'skill' as const,skill:'ally',target:t.state.players.find(p=>p.id!==self.id)!.id};
   const c=context(v,k,a);if(!c?.alternative)continue;
   expect(applyAction(structuredClone(t.state),self.id,c.alternative,t.state.now).ok).toBe(true);
   for(const p of v.players)p.statuses.push({kind:'invulnerable',source:'test',remainingMs:10000});
   expect(context(v,k,a)?.alternative).toBeNull();checked=true;break;
  }
  expect(checked).toBe(true);
 });
 it('선택한 대안을 반환하고 대안 누락은 원래 행동으로 복귀한다',()=>{
  const a={type:'skill' as const,skill:'ally',target:'x'},alternative={type:'skill' as const,skill:'scan',target:'y',name:'kai'};
  const c={cell:'none-uncertain-info',alternative,allies:0,knownFriend:false};
  expect(select(a,c,'act')).toEqual(a);expect(select(a,c,'wait')).toBeNull();expect(select(a,c,'information')).toEqual(alternative);
  expect(select(a,{...c,alternative:null},'information')).toEqual(a);
 });
});
