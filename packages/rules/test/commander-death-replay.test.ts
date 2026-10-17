import {describe,it,expect} from 'vitest';
import {applyAction,advance,primordial,type Action} from '../src/index.js';
import {Game} from '../src/engine/game.js';
import {prepareMatch,DEFAULT_SETTINGS} from '../scripts/league-runner.js';
import {playReportSelfplay} from '../scripts/report-selfplay.js';
import {commanderSnapshot,traceCommanderTransition,replayCommands,replayDeathRecord} from '../scripts/commander-death-replay.js';
const fixture={mode:'primordial' as const,seed:27,count:12,reversed:false,currentSide:1 as const};
function setup(){const {state}=prepareMatch(fixture);for(const p of state.players)p.mana=150;return state;}
function exercise(action:(s:ReturnType<typeof setup>)=>{id:string;a:Action}){
 const s=setup(),x=action(s),before=commanderSnapshot(s),seq=s.seq,r=applyAction(s,x.id,x.a,250);
 expect(r.ok).toBe(true);const events=s.log.filter(e=>e.seq>seq);
 return {s,before,events,row:traceCommanderTransition(before,commanderSnapshot(s,false),events,{kind:'action',at:250,actionIndex:0,actor:x.id,action:x.a})};
}
describe('실제 엔진 지휘관 사망 추적',()=>{
 it('이름 공격 살해와 피해자의 자기 방어 뷰를 연결한다',()=>{
  const x=exercise(s=>{const a=s.players.find(p=>p.character==='rael')!,t=s.players.find(p=>p.character==='eltas')!;t.extraLives=0;return {id:a.id,a:{type:'skill',skill:'attack',target:t.id,name:'eltas'}};});
  expect(x.row.deaths.map(d=>d.cause)).toEqual(['attack']);expect(x.row.deaths[0]!.before.ownDefense!.character).toBe('eltas');
  expect(x.row.deaths[0]!.before.ownDefense!.skills.some(s=>s.key==='supreme_attack')).toBe(true);
 });
 it('비명명 울프스 슬러쉬의 살해 원인을 이름 공격으로 바꾸지 않는다',()=>{
  const x=exercise(s=>{const a=s.players.find(p=>p.character==='kane')!,t=s.players.find(p=>p.character==='eltas')!;t.extraLives=0;return {id:a.id,a:{type:'skill',skill:'kane_wolfs_slash',target:t.id}};});
  expect(x.row.deaths.map(d=>d.cause)).toEqual(['wolfs_slash']);expect(x.row.deaths[0]!.boundary.action!.type).toBe('skill');
 });
 it('비명명 명중은 사망 없이 여분 목숨 감소로 보존한다',()=>{
  const x=exercise(s=>({id:s.players.find(p=>p.character==='kane')!.id,a:{type:'skill',skill:'kane_wolfs_slash',target:s.players.find(p=>p.character==='eltas')!.id}}));
  expect(x.row.deaths).toEqual([]);expect(x.row.transition!.after.find(p=>p.character==='eltas')!.extraLives).toBe(1);
 });
 it('마스터의 권능은 남은 목숨과 횟수제 보호가 있어도 실제로 살해한다',()=>{
  const x=exercise(s=>{const g=new Game(s,primordial),a=s.players.find(p=>p.character==='rael')!,t=s.players.find(p=>p.character==='eltas')!,guard=s.players.find(p=>p.character==='consume')!;
   g.grantSkill(a,'rael_master_power');g.grantSkill(guard,'consume_bodyguard');guard.flags.guardCharges=2;
   return {id:a.id,a:{type:'skill',skill:'rael_master_power',target:t.id}};});
  const d=x.row.deaths[0]!;expect(d.cause).toBe('master_power');expect(d.before.extraLives).toBe(2);expect(d.before.externalProtection!.charges).toBe(2);
  expect(d.after.externalProtection!.charges).toBe(2);expect(d.before.externalProtection!.scope).toBe('evaluator_only');
 });
 it('실패 페널티로 시전자가 사망하면 대상의 죽음으로 오귀속하지 않는다',()=>{
  const x=exercise(s=>{const a=s.players.find(p=>p.character==='eltas')!,t=s.players.find(p=>p.character==='rael')!;new Game(s,primordial).grantSkill(a,'attack');return {id:a.id,a:{type:'skill',skill:'attack',target:t.id,name:'kane'}};});
  expect(x.row.deaths.map(d=>[d.character,d.cause])).toEqual([['eltas','attack-fail']]);
 });
 it('시간 진행으로 효과가 풀린 경계를 직전 행동에 귀속하지 않는다',()=>{
  const s=setup(),p=s.players.find(p=>p.character==='eltas')!;new Game(s,primordial).addEffect(p,'invulnerable',1,'test',true);
  const before=commanderSnapshot(s),seq=s.seq;advance(s,1000);
  const r=traceCommanderTransition(before,commanderSnapshot(s,false),s.log.filter(e=>e.seq>seq),{kind:'advance',at:1000,actionIndex:null,actor:null,action:null});
  expect(r.deaths).toEqual([]);expect(r.transition!.boundary.actor).toBe(null);expect(r.transition!.after.find(x=>x.id===p.id)!.effects).toEqual([]);
 });
 it('실제 사망 영수증이 누락·중복·다른 이름이면 거절한다',()=>{
  const x=exercise(s=>{const a=s.players.find(p=>p.character==='kane')!,t=s.players.find(p=>p.character==='eltas')!;t.extraLives=0;return {id:a.id,a:{type:'skill',skill:'kane_wolfs_slash',target:t.id}};});
  const after=commanderSnapshot(x.s,false),b=x.row.deaths[0]!.boundary;
  expect(()=>traceCommanderTransition(x.before,after,x.events.filter(e=>e.kind!=='death'),b)).toThrow();
  expect(()=>traceCommanderTransition(x.before,after,[...x.events,x.events.find(e=>e.kind==='death')!],b)).toThrow();
  const wrong=structuredClone(x.events);wrong.find(e=>e.kind==='death')!.data!.character='rael';expect(()=>traceCommanderTransition(x.before,after,wrong,b)).toThrow();
 });
 it('전체 ON 정책/행동/자원 재현과 관측ON/OFF 엔진 상태·사건이 같다',()=>{
  const original=playReportSelfplay(fixture,'reportedSupreme'),r=replayDeathRecord(original,DEFAULT_SETTINGS),off=replayCommands(original,DEFAULT_SETTINGS,false);
  expect(r.originalPolicyMatched).toBe(true);expect(r.receipts).toBe(original.result.actions.length);
  expect(r.fullStateSHA256).toBe(off.fullStateSHA256);expect(r.engineLogSHA256).toBe(off.engineLogSHA256);expect(off.deaths).toEqual([]);
 });
 it('자원 영수증 변조와 행동 삭제를 원래 승패가 같아도 거절한다',()=>{
  const original=playReportSelfplay(fixture,'cooperative'),wrong=structuredClone(original);wrong.result.actions[0]!.afterMana++;
  expect(()=>replayCommands(wrong,DEFAULT_SETTINGS)).toThrow();const missing=structuredClone(original);missing.result.actions.splice(0,1);
  expect(()=>replayCommands(missing,DEFAULT_SETTINGS)).toThrow();
 });
});
