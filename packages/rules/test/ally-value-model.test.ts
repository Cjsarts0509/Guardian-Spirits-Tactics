import {describe,it,expect} from 'vitest';
import {allyCell,fitAllyValue,chooseAllyWait,type Observation} from '../scripts/ally-value-model.js';
import {viewFor} from '../src/index.js';
import {civilTable} from './helpers.js';
const examples=(n:number,wait:boolean,reward:number):Observation[]=>Array.from({length:n},()=>({cell:'early-low',wait,reward}));
describe('동맹 행동 가치 오프라인 학습',()=>{
 it('최종 보상 차이로 기다림을 학습하며 반대 데이터에서는 실행한다',()=>{
  const rows=[...examples(40,false,0),...examples(40,true,1)];
  const model=fitAllyValue(rows);
  expect(model.cells['early-low'].act.value).toBeCloseTo(2/44);
  expect(model.cells['early-low'].wait.value).toBeCloseTo(42/44);
  expect(chooseAllyWait(model,'early-low')).toBe(true);
  expect(chooseAllyWait(fitAllyValue(rows.map(r=>({...r,reward:1-r.reward}))),'early-low')).toBe(false);
 });
 it('표본 부족/동점/미관측 셀에서는 기존 행동을 유지한다',()=>{
  expect(chooseAllyWait(fitAllyValue([...examples(31,false,0),...examples(40,true,1)]),'early-low')).toBe(false);
  const model=fitAllyValue([...examples(40,false,0.5),...examples(40,true,0.5)]);
  expect(Object.values(model.cells).every(c=>!c.chooseWait)).toBe(true);
 });
 it('자기 마나와 경과 시간만 사용하며 다른 행동은 제외한다',()=>{
  const t=civilTable(),v=viewFor(t.state,t.state.players[0]!.id),a={type:'skill' as const,skill:'ally',target:'p2'};
  v.me.mana=59;v.elapsedMs=359999;expect(allyCell(v,a)).toBe('early-low');
  v.me.mana=60;expect(allyCell(v,a)).toBe('early-high');
  v.elapsedMs=360000;expect(allyCell(v,a)).toBe('late-high');
  v.me.mana=59;expect(allyCell(v,a)).toBe('late-low');
  const changed=structuredClone(v);changed.me.character='other';changed.me.side=changed.me.side===1?2:1;changed.players=[];
  expect(allyCell(changed,a)).toBe(allyCell(v,a));
  expect(allyCell(v,{...a,skill:'attack'})).toBeNull();expect(allyCell(v,null)).toBeNull();
  expect(allyCell(v,{type:'skill',skill:'ally'})).toBeNull();
 });
 it('학습 순서와 저장/복원에 무관하며 잘못된 보상·설정을 거절한다',()=>{
  const rows=[...examples(40,false,0.5),...examples(40,true,1)];
  expect(fitAllyValue(rows)).toEqual(fitAllyValue([...rows].reverse()));
  expect(chooseAllyWait(JSON.parse(JSON.stringify(fitAllyValue(rows))),'early-low')).toBe(true);
  expect(()=>fitAllyValue([{cell:'early-low',wait:true,reward:NaN}])).toThrow();
  expect(()=>fitAllyValue(rows,0)).toThrow();expect(()=>fitAllyValue(rows,32,-1)).toThrow();
 });
});
