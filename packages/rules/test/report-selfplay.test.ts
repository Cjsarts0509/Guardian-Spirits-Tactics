import {describe,it,expect} from 'vitest';
import {playReportSelfplay} from '../scripts/report-selfplay.js';
import {playGuardSelfplay} from '../scripts/guard-selfplay.js';
import {DEFAULT_SETTINGS} from '../scripts/league-runner.js';
const fixture={mode:'primordial' as const,seed:27,count:12,reversed:false,currentSide:1 as const};
describe('동일 보고 공격 정책 양측 평가',()=>{
 it('OFF는 기존 동일 연구 정책과 전체 경기·실제 행동이 같다',()=>{
  const a=playReportSelfplay(fixture,'cooperative'),b=playGuardSelfplay(fixture,'cooperative');
  expect(a.result.game).toEqual(b.result.game);expect(a.result.actions).toEqual(b.result.actions);expect(a.roles).toEqual(b.roles);
 });
 it('ON은 양 진영을 관측하고 실제 보고 접수와 관측ON/OFF가 일치한다',()=>{
  const a=playReportSelfplay(fixture,'reportedSupreme'),b=playReportSelfplay(fixture,'reportedSupreme',DEFAULT_SETTINGS,false);
  expect(a.result.game).toEqual(b.result.game);expect(b.result.actions).toEqual([]);
  expect(new Set(a.result.supremeDecisions!.map(x=>x.side))).toEqual(new Set([1,2]));
  expect(a.result.supremeActiveDecisions).toBe(a.result.supremeDecisions!.length);
  const selected=a.result.supremeDecisions!.filter(x=>x.selected);expect(selected.length).toBeGreaterThan(0);
  expect(selected.every(x=>x.receipt?.accepted&&x.knowledgeUnchanged)).toBe(true);
  expect(a.result.actions.length).toBe(a.result.game.stats.current.attempted+a.result.game.stats.reference.attempted);
 });
 it('제어 이름 교환은 양측 정책·행동·자원·자기 관측을 바꾸지 않는다',()=>{
  const a=playReportSelfplay(fixture,'reportedSupreme'),b=playReportSelfplay({...fixture,currentSide:2},'reportedSupreme');
  expect(a.result.actions).toEqual(b.result.actions);expect(a.result.resources).toEqual(b.result.resources);expect(a.result.supremeDecisions).toEqual(b.result.supremeDecisions);
  expect(a.result.game.winner).toBe(b.result.game.winner);expect(a.result.game.stats.current).toEqual(b.result.game.stats.reference);
 });
 it('범위 밖 정책과 다른 모드는 같은 정책 태초 평가로 실행하지 않는다',()=>{
  expect(()=>playReportSelfplay({...fixture,mode:'troll'},'reportedSupreme')).toThrow();
 });
});
