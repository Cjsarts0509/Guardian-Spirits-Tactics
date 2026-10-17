import {describe,it,expect} from 'vitest';
import {playGuardSelfplay} from '../scripts/guard-selfplay.js';
import {playSelfplay} from '../scripts/selfplay-balance.js';
import {DEFAULT_SETTINGS} from '../scripts/league-runner.js';
const fixture={mode:'primordial' as const,seed:147004,count:12,reversed:true,currentSide:1 as const};
describe('동일 보호 우선 정책 양측 평가',()=>{
 it('기존 동일 cooperative 경기와 양측 관측 결과가 일치한다',()=>{
  const a=playGuardSelfplay(fixture,'cooperative'),b=playSelfplay(fixture,'cooperative');
  expect(a.result.game).toEqual(b.game);expect(a.roles).toEqual(b.roles);
  expect(a.result.actions.length).toBe(a.result.game.stats.current.attempted+a.result.game.stats.reference.attempted);
  expect(new Set(a.result.actions.map(t=>t.side))).toEqual(new Set([1,2]));
 });
 it('실제 개입 기회가 있고 관측ON/OFF의 경기 전체가 같다',()=>{
  const on=playGuardSelfplay(fixture,'knownCommanderGuardBeforeAlly'),off=playGuardSelfplay(fixture,'knownCommanderGuardBeforeAlly',DEFAULT_SETTINGS,false);
  expect(on.result.game).toEqual(off.result.game);
  const eligible=on.result.guardDecisions.filter(t=>t.eligible);expect(eligible.length).toBeGreaterThan(0);
  for(const t of eligible)expect([t.selectedGuard,t.accepted,t.success,t.ownMemoryEqual,t.ownRngEqual]).toEqual([true,true,true,true,true]);
  expect(off.result.actions).toHaveLength(0);
 });
 it('제어 주체 이름 교환은 같은 경기이며 양측에 동일 옵션을 적용한다',()=>{
  const a=playGuardSelfplay(fixture,'knownCommanderGuardBeforeAlly'),b=playGuardSelfplay({...fixture,currentSide:2},'knownCommanderGuardBeforeAlly');
  expect(a.result.actions).toEqual(b.result.actions);expect(a.result.resources).toEqual(b.result.resources);expect(a.result.guardDecisions).toEqual(b.result.guardDecisions);
  expect(a.result.game.winner).toBe(b.result.game.winner);expect(a.result.game.elapsedMs).toBe(b.result.game.elapsedMs);
  expect(a.result.game.stats.current).toEqual(b.result.game.stats.reference);
 });
});
