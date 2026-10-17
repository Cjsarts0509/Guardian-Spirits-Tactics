import {describe,it,expect} from 'vitest';
import {viewFor} from '../src/index.js';
import {prepareMatch,DEFAULT_SETTINGS} from '../scripts/league-runner.js';
import {playReportSelfplay} from '../scripts/report-selfplay.js';
import {inspectOwnGuard,guardWitness,verifiedGuardWitness} from '../scripts/own-guard-witness.js';
const fixture={mode:'primordial' as const,seed:27,count:12,reversed:false,currentSide:1 as const};
describe('본인 보호 선택 관측',()=>{
 it('공표/보고만으로 확정 보호 제안을 만들지 않는다',()=>{
  const {state:s}=prepareMatch(fixture),p=s.players.find(p=>p.character==='consume')!,target=s.players.find(p=>p.character==='eltas')!;p.mana=90;target.published='eltas';
  const v=viewFor(s,p.id),k={known:new Map([[p.id,'consume']]),candidates:new Map<string,string[]>()};
  expect(inspectOwnGuard(v,k)!.reason).toBe('identity_unconfirmed');k.known.set(target.id,'eltas');expect(inspectOwnGuard(v,k)!.reason).toBe('own_guard_ready');
 });
 it('자기 확정 공격 예약 비용과 대상 보호를 분리한다',()=>{
  const {state:s}=prepareMatch(fixture),p=s.players.find(p=>p.character==='consume')!,target=s.players.find(p=>p.character==='eltas')!,enemy=s.players.find(p=>p.character==='rael')!;p.mana=90;p.skills.find(x=>x.key==='attack')!.cooldownUntil=10000;
  const k={known:new Map([[p.id,'consume'],[target.id,'eltas'],[enemy.id,'rael']]),candidates:new Map<string,string[]>()},v=viewFor(s,p.id);
  expect(inspectOwnGuard(v,k)!.reason).toBe('attack_reserve');v.players.find(x=>x.id===target.id)!.statuses.push({kind:'invulnerable',source:'test',remainingMs:1000});expect(inspectOwnGuard(v,k)!.reason).toBe('known_target_protected');
 });
 it('ON 전체 원본 재현·모든 실제 영수증 및 관측ON/OFF가 같다',()=>{
  const original=playReportSelfplay(fixture,'reportedSupreme'),on=verifiedGuardWitness(original,DEFAULT_SETTINGS),off=guardWitness(original,DEFAULT_SETTINGS,false);
  expect(on.game).toEqual(off.game);expect(on.actionsSHA256).toBe(off.actionsSHA256);expect(on.activeCalls).toBe(on.decisions.length);expect(on.guardCalls).toBe(on.activeCalls+on.inactiveCalls);
  expect(on.decisions.every(d=>d.memoryUnchanged&&d.engineUnchanged&&d.events.every(e=>e.vis.to==='all'||e.vis.to==='players'&&e.vis.ids.includes(d.player)))).toBe(true);expect(off.decisions).toEqual([]);
 });
 it('OFF도 전체 원래 실제 행동/자원 영수증과 일치한다',()=>{
  const r=playReportSelfplay(fixture,'cooperative'),w=verifiedGuardWitness(r,DEFAULT_SETTINGS);expect(w.wholeGameAndAllActionsMatched).toBe(true);expect(w.matchedActions).toBe(r.result.actions.length);
 });
});
