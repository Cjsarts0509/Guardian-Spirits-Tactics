import {describe,it,expect} from 'vitest';
import {createBotMemory,smartBotAction,viewFor,eventsFor} from '../src/index.js';
import {reportAttackOpportunity,playReportedSupremeAudit} from '../scripts/reported-supreme-audit.js';
import {playGuardSelfplay} from '../scripts/guard-selfplay.js';
import {DEFAULT_SETTINGS} from '../scripts/league-runner.js';
import {modeTable,fill,PRIMORDIAL_ORDER} from './helpers.js';
function setup(name='rael'){
 const t=modeTable('primordial',PRIMORDIAL_ORDER);t.tick(240000);fill(t,'eltas');t.state.revealed[t.id.drakan!]='drakan';
 t.p('eltas').skills=t.p('eltas').skills.filter(s=>s.key==='supreme_attack');
 const label=viewFor(t.state,t.id.eltas!).roster.find(r=>r.key===name)!.name;
 expect(t.act('drakan',{type:'chat',channel:'whisper',to:t.id.eltas,text:`확인 정보: [${t.p('rael').seat}] ${label}`}).ok).toBe(true);
 return t;
}
const observe=(t:ReturnType<typeof setup>,m=createBotMemory(7))=>reportAttackOpportunity(viewFor(t.state,t.id.eltas!),eventsFor(t.state,t.id.eltas!),m);
describe('최상급 보고 공격의 같은 순간 관측',()=>{
 it('실제 수신 보고에서만 대기→공격이 되고 사실을 추가하지 않는다',()=>{
  const t=setup(),m=createBotMemory(7),before=structuredClone(m),state=structuredClone(t.state),d=observe(t,m);
  expect(d.targets[0]).toMatchObject({name:'rael',known:false,reason:'eligible'});expect(m).toEqual(before);expect(t.state).toEqual(state);
  expect(smartBotAction(t.state,t.id.eltas!,createBotMemory(7),{activity:1})).toBeNull();
  const on=smartBotAction(t.state,t.id.eltas!,m,{activity:1,reportedSupreme:true});expect(on).toEqual(d.suggestion);expect(m.perception?.known.has(t.id.rael!)).toBe(false);
  const r=t.act('eltas',on!);expect(r.ok).toBe(true);expect(r.events.some(e=>e.kind==='attack.kill')).toBe(true);
 });
 it('일관된 거짓 보고도 실패할 수 있으며 실제 자기 실패 후 재시도는 차단된다',()=>{
  const t=setup('kane'),m=createBotMemory(7),d=observe(t,m);expect(d.targets[0]?.known).toBe(false);
  const a=smartBotAction(t.state,t.id.eltas!,m,{activity:1,reportedSupreme:true});expect(a).toEqual(d.suggestion);
  const r=t.act('eltas',a!);expect(r.ok).toBe(true);expect(r.events.some(e=>e.kind==='attack.fail.self')).toBe(true);expect(t.p('eltas').alive).toBe(true);
  fill(t,'eltas');t.p('eltas').skills[0]!.cooldownUntil=0;
  const after=observe(t,m);expect(after.targets[0]).toMatchObject({known:false,ownSameNameFailure:true,reason:'own_same_name_failure'});expect(after.suggestion).toBeNull();
 });
 it('공개 무적·시간·마나와 쿨다운 차단을 구분한다',()=>{
  for(const reason of ['public_invulnerable','before_four_minutes','reserve_mana','skill_blocked']){
   const t=setup();if(reason==='public_invulnerable')t.p('rael').effects.push({id:99,kind:'invulnerable',source:'rune_protection',until:t.now+100000,announced:true});
   if(reason==='reserve_mana')t.p('eltas').mana=99;
   if(reason==='skill_blocked')t.p('eltas').skills[0]!.cooldownUntil=t.now+10000;
   const v=viewFor(t.state,t.id.eltas!);if(reason==='before_four_minutes')v.elapsedMs=239999;
   const d=reportAttackOpportunity(v,eventsFor(t.state,t.id.eltas!),createBotMemory(7));expect(d.targets[0]?.reason).toBe(reason);expect(d.suggestion).toBeNull();
  }
 });
 it('미확인·상충 발신자와 타인의 비수신 보고는 적격이 아니다',()=>{
  const t=setup();delete t.state.revealed[t.id.drakan!];expect(observe(t).targets).toEqual([]);
  t.state.revealed[t.id.drakan!]='drakan';t.state.revealed[t.id.hermilly!]='hermilly';
  expect(t.act('hermilly',{type:'chat',channel:'whisper',to:t.id.eltas,text:`확인 정보: [${t.p('rael').seat}] 케인`}).ok).toBe(true);expect(observe(t).targets).toEqual([]);
  const u=setup();u.state.log=u.state.log.map(e=>e.kind==='chat.whisper'?{...e,vis:{to:'players' as const,ids:[u.id.drakan!,u.id.consume!]}}:e);expect(observe(u).targets).toEqual([]);
 });
 it('숨은 정체와 비수신 사실 변경이 제안·자기 관측을 바꾸지 않는다',()=>{
  const t=setup(),s=structuredClone(t.state),a=s.players.find(p=>p.id===t.id.rael)!,b=s.players.find(p=>p.id===t.id.kane)!;
  [a.character,b.character]=[b.character,a.character];s.log.push({seq:++s.seq,at:t.now,kind:'private.test',text:'private',vis:{to:'players',ids:[a.id]},facts:[{player:b.id,character:'rael'}]});
  expect(reportAttackOpportunity(viewFor(s,t.id.eltas!),eventsFor(s,t.id.eltas!),createBotMemory(7))).toEqual(observe(t));
 });
 it('관측ON/OFF와 원본의 전체 경기 및 실제 행동이 같고 가상 행동만 분리한다',()=>{
  const f={mode:'primordial' as const,seed:27,count:12,reversed:false,currentSide:1 as const},variant='cooperative';
  const on=playReportedSupremeAudit(f,variant),off=playReportedSupremeAudit(f,variant,DEFAULT_SETTINGS,false),original=playGuardSelfplay(f,variant);
  expect(on.game).toEqual(off.game);expect(on.game).toEqual(original.result.game);expect(off.decisions).toEqual([]);
  expect(on.actions).toEqual(original.result.actions.map(t=>({player:t.player,at:t.at,action:t.action,accepted:t.accepted,error:t.error,beforeMana:t.beforeMana,afterMana:t.afterMana,nominalMana:t.nominalMana,character:t.character,side:t.side,receiptKinds:t.receiptKinds})));
  expect(on.decisions.every(d=>d.knowledgeUnchanged&&d.changed===!!d.hypothetical)).toBe(true);
  expect(on.decisions.filter(d=>d.changed)).toHaveLength(4);expect(on.decisions.filter(d=>d.changed).every(d=>d.hypothetical?.accepted)).toBe(true);
 });
});
