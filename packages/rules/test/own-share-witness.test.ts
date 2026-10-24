import {describe,it,expect} from 'vitest';
import {viewFor,createBotMemory,botKnowledge} from '../src/index.js';
import {prepareMatch,DEFAULT_SETTINGS} from '../scripts/league-runner.js';
import {playReportSelfplay} from '../scripts/report-selfplay.js';
import {inspectOwnShare,shareWitness,verifiedShareWitness} from '../scripts/own-share-witness.js';
const fixture={mode:'primordial' as const,seed:27,count:12,reversed:false,currentSide:1 as const};
describe('발신자 본인 정보 경로 관측',()=>{
 it('공표·숨은 역할·동맹만으로 보고 친구를 만들지 않는다',()=>{
  const {state:s}=prepareMatch(fixture),p=s.players.find(p=>p.character==='kilder')!,g=s.players.find(p=>p.character==='consume')!,t=s.players.find(p=>p.character==='eltas')!;p.allies.push(g.id);g.published='consume';
  const v=viewFor(s,p.id),m=createBotMemory(1),k=botKnowledge(s,p.id,v,m);k.known.set(t.id,'eltas');
  expect(inspectOwnShare(v,k,m).peers.find(x=>x.id===g.id)!.reason).toBe('identity_unconfirmed');expect(inspectOwnShare(v,k,m).proposal).toBeNull();
  k.known.set(g.id,'consume');expect(inspectOwnShare(v,k,m).proposal).toMatchObject({type:'chat',to:g.id});
 });
 it('본인 발송 기억·12초 간격과 수신 보고의 비확정성을 유지한다',()=>{
  const {state:s}=prepareMatch(fixture),p=s.players.find(p=>p.character==='kilder')!,g=s.players.find(p=>p.character==='consume')!,t=s.players.find(p=>p.character==='eltas')!;p.allies.push(g.id);
  const v=viewFor(s,p.id),m=createBotMemory(1),k=botKnowledge(s,p.id,v,m);k.known.set(g.id,'consume');m.perception!.intel={lastSentAt:-12000,sent:new Map(),reports:new Map([[t.id,new Map([[g.id,{character:'eltas',seq:1,at:0}]])]])};
  expect(inspectOwnShare(v,k,m).targets.some(x=>x.id===t.id)).toBe(false);k.known.set(t.id,'eltas');m.perception!.intel.lastSentAt=0;
  expect(inspectOwnShare(v,k,m).cooldownRemainingMs).toBe(12000);m.perception!.intel.lastSentAt=-12000;m.perception!.intel.sent.set(g.id,new Map([[t.id,'eltas']]));
  expect(inspectOwnShare(v,k,m).proposal).toBeNull();
 });
 it('ON 원본 전체·실제명령 일치,관측 ON/OFF 경기·자원/RNG 경로 동일',()=>{
  const original=playReportSelfplay(fixture,'reportedSupreme'),on=verifiedShareWitness(original,DEFAULT_SETTINGS),off=shareWitness(original,DEFAULT_SETTINGS,false);
  expect(on.game).toEqual(off.game);expect(on.actionsSHA256).toBe(off.actionsSHA256);expect(on.activeCalls).toBe(on.decisions.length);expect(on.senderCalls).toBe(on.activeCalls+on.inactiveCalls);expect(off.decisions).toEqual([]);
  expect(on.decisions.every(d=>d.memoryUnchanged&&d.engineUnchanged&&(d.chosenCommunication===null||d.chosenCommunication.type==='chat'))).toBe(true);
  for(const d of on.decisions){expect(d.events.every(e=>e.vis.to==='all'||e.vis.to==='players'&&e.vis.ids.includes(d.player))).toBe(true);expect(d.view.players.every(p=>!('mana' in p)&&!('character' in p))).toBe(true);}
 });
 it('OFF 원래 수집기 전체/모든 접수·자원 영수증 일치',()=>{
  const original=playReportSelfplay(fixture,'cooperative'),r=verifiedShareWitness(original,DEFAULT_SETTINGS);expect(r.wholeGameAndAllActionsMatched).toBe(true);expect(r.matchedActions).toBe(original.result.actions.length);
 });
});
