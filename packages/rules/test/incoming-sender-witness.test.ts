import {describe,it,expect} from 'vitest';
import {viewFor,botKnowledge,createBotMemory} from '../src/index.js';
import {prepareMatch,DEFAULT_SETTINGS} from '../scripts/league-runner.js';
import {playReportSelfplay} from '../scripts/report-selfplay.js';
import {inspectIncomingSender,incomingSenderWitness,verifiedIncomingWitness} from '../scripts/incoming-sender-witness.js';
const fixture={mode:'primordial' as const,seed:27,count:12,reversed:false,currentSide:1 as const};
function setup(){
 const {state:s}=prepareMatch(fixture),p=s.players.find(p=>p.character==='drakan')!,sender=s.players.find(p=>p.character==='kilder')!,target=s.players.find(p=>p.character==='eltas')!;sender.allies.push(p.id);p.gem=2;p.gemCooldownUntil=0;p.mana=120;
 const v=viewFor(s,p.id),m=createBotMemory(3),k=botKnowledge(s,p.id,v,m);m.perception!.intel={lastSentAt:-12000,sent:new Map(),reports:new Map([[target.id,new Map([[sender.id,{character:'eltas',at:0,seq:1}]])]])};
 return {s,p,sender,target,v,m,k};
}
describe('주행동 직전 미확정 발신자 확인 관측',()=>{
 it('보고·동맹 요청·공표는 발신자나 대상 정체를 확정하지 않는다',()=>{
  const {sender,target,v,m,k}=setup();v.players.find(p=>p.id===sender.id)!.published='kilder';const d=inspectIncomingSender(v,k,m);
  expect(k.known.has(sender.id)).toBe(false);expect(k.known.has(target.id)).toBe(false);expect(d.senders[0]).toMatchObject({id:sender.id,known:null,incomingAlly:true,useful:true});expect(d.incoming).toContain(sender.id);
 });
 it('자기 보고만으로 친구 검증의 사실을 만들지 않으며 보호된 요청자는 제외한다',()=>{
  const {sender,v,m,k}=setup();v.players.find(p=>p.id===sender.id)!.statuses.push({kind:'invulnerable',source:'test',remainingMs:1000});expect(inspectIncomingSender(v,k,m).incoming).not.toContain(sender.id);expect(inspectIncomingSender(v,k,m).proposal).toBeNull();
 });
 it('주행동 이전 마나 부족·확정 공격 예약으로 보석 확인을 배제한다',()=>{
  const {v,m,k,s}=setup(),enemy=s.players.find(p=>p.character==='rael')!;expect(inspectIncomingSender(v,k,m).usableKeys).toContain('truth_gem');k.known.set(enemy.id,'rael');v.me.mana=55;
  // Synthetic own-view boundary: Drakan does NOT start with this attack.
  v.me.skills.push({...v.me.skills[0]!,key:'attack',passive:false,blocked:null,usesLeft:null,mana:50,cooldownRemainingMs:10000,nameOptions:['rael']});
  const d=inspectIncomingSender(v,k,m);expect(d.reserve).toBe(50);expect(d.usableKeys).not.toContain('truth_gem');expect(d.gemCandidates).toEqual([]);
 });
 it('타인 숨은 자원/flags는 자기 뷰와 진단에 영향이 없다',()=>{
  const {s,p,sender,m,k}=setup(),before=viewFor(s,p.id),d=inspectIncomingSender(before,k,structuredClone(m));sender.mana=999;sender.flags.privateAudit=true;const after=viewFor(s,p.id);expect(after).toEqual(before);expect(inspectIncomingSender(after,k,structuredClone(m))).toEqual(d);
 });
 it('ON 원본 전체와 관측ON/OFF의 경기·모든 자원 영수증·자기기억이 같다',()=>{
  const o=playReportSelfplay(fixture,'reportedSupreme'),on=verifiedIncomingWitness(o,DEFAULT_SETTINGS),off=incomingSenderWitness(o,DEFAULT_SETTINGS,false);
  expect(on.game).toEqual(off.game);expect(on.actionsSHA256).toBe(off.actionsSHA256);expect(on.activeCalls).toBe(on.decisions.length);expect(on.observedRoleCalls).toBe(on.activeCalls+on.inactiveCalls);expect(off.decisions).toEqual([]);
  for(const d of on.decisions){expect(d.memoryUnchanged&&d.engineUnchanged&&d.actualMemoryMatchesBaseline).toBe(true);expect(d.events.every(e=>e.vis.to==='all'||e.vis.to==='players'&&e.vis.ids.includes(d.player))).toBe(true);if(d.changed){expect(d.proposalMatchesAlternative).toBe(true);expect(d.probe?.accepted).toBe(true);}}
 });
 it('OFF 원본 전체/실제 접수·자원·기회도 일치한다',()=>{
  const o=playReportSelfplay(fixture,'cooperative'),r=verifiedIncomingWitness(o,DEFAULT_SETTINGS);expect(r.wholeGameAndAllActionsMatched).toBe(true);expect(r.matchedActions).toBe(o.result.actions.length);
 });
});
