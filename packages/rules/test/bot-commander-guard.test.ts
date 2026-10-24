import {describe,it,expect} from 'vitest';
import {createBotMemory,smartBotAction,botKnowledge,viewFor} from '../src/index.js';
import {playCommitmentMatch} from '../scripts/cooperative-commitment-match.js';
import {DEFAULT_SETTINGS} from '../scripts/league-runner.js';
import {modeTable,fill,PRIMORDIAL_ORDER} from './helpers.js';
const enabled={activity:1,knownCommanderGuardBeforeAlly:true};
function setup(role:'consume'|'kumarin'='consume',confirmed=true){
 const t=modeTable('primordial',PRIMORDIAL_ORDER);t.tick(60000);const target=role==='consume'?'eltas':'rael',guard=role==='consume'?'consume_master_guard':'kumarin_commander_guard',probe=role==='consume'?'consume_slave_instinct':'ally_check';
 t.p(role).skills=t.p(role).skills.filter(s=>['ally','attack','break_ally',guard,probe].includes(s.key));fill(t,role);
 if(confirmed){if(role==='kumarin')expect(t.publish('rael','rael').ok).toBe(true);const r=t.skill(role,probe,target);expect(r.ok).toBe(true);expect(r.events.some(e=>e.facts?.some(f=>f.player===t.id[target]&&f.character===target))).toBe(true);}
 fill(t,role);return {t,role,target,guard,id:t.id[role]!,memory:createBotMemory(2)};
}
describe('확정 지휘관 보호를 새 동맹보다 우선 — 기본OFF',()=>{
 it('컨슘의 실제 비공개 확인 뒤 ON만 보호하고 명중을 막은 뒤 동맹을 잇는다',()=>{
  const x=setup(),off=createBotMemory(2),explicit=createBotMemory(2);
  expect(smartBotAction(x.t.state,x.id,off,{activity:1})).toEqual({type:'skill',skill:'ally',target:x.t.id.eltas});
  expect(smartBotAction(x.t.state,x.id,explicit,{activity:1,knownCommanderGuardBeforeAlly:false})).toEqual({type:'skill',skill:'ally',target:x.t.id.eltas});expect(off).toEqual(explicit);
  const action=smartBotAction(x.t.state,x.id,x.memory,enabled);expect(action).toEqual({type:'skill',skill:x.guard,target:x.t.id.eltas});
  expect(x.memory).toEqual(off);const before=x.t.p('consume').mana;const result=x.t.act('consume',action!);expect(result.ok).toBe(true);expect(x.t.p('consume').mana).toBe(before-50);expect(x.t.p('consume').flags.guardCharges).toBe(2);
  fill(x.t,'rael');const hit=x.t.skill('rael','attack','eltas','eltas');expect(hit.ok).toBe(true);expect(x.t.p('eltas').alive).toBe(true);expect(x.t.p('consume').flags.guardCharges).toBe(1);
  expect(smartBotAction(x.t.state,x.id,x.memory,enabled)).toEqual({type:'skill',skill:'ally',target:x.t.id.eltas});
 });
 it('쿠마린도 실제 확인된 라엘을 정확히 보호한다',()=>{
  const x=setup('kumarin'),action=smartBotAction(x.t.state,x.id,x.memory,enabled);expect(action).toEqual({type:'skill',skill:x.guard,target:x.t.id.rael});
  expect(x.t.act('kumarin',action!).ok).toBe(true);expect(x.t.p('kumarin').flags.guardCharges).toBe(2);expect(x.t.state.revealed[x.t.id.rael!]).toBeUndefined();
 });
 it('마나 부족·사용 완료·행동 불능·대상 보호는 조기 보호하지 않는다',()=>{
  for(const condition of ['mana','used','incapacitated','invulnerable'] as const){const x=setup();
   if(condition==='mana')x.t.p('consume').mana=49;
   if(condition==='used'){expect(x.t.skill('consume',x.guard,'eltas').ok).toBe(true);fill(x.t,'consume');}
   if(condition==='incapacitated')x.t.p('consume').effects.push({id:99,kind:'incapacitated',source:'eoril_flame_shackle',until:x.t.now+100000,announced:true});
   if(condition==='invulnerable')x.t.p('eltas').effects.push({id:99,kind:'invulnerable',source:'rune_protection',until:x.t.now+100000,announced:true});
   expect(smartBotAction(x.t.state,x.id,x.memory,enabled)).not.toMatchObject({skill:x.guard});
  }
 });
 it('확정 적 공격·적 동맹 파기와 곧 가능한 공격의 마나 예약을 보존한다',()=>{
  const x=setup();x.t.state.revealed[x.t.id.kane!]='kane';
  expect(smartBotAction(x.t.state,x.id,createBotMemory(2),enabled)).toEqual({type:'skill',skill:'attack',target:x.t.id.kane,name:'kane'});
  x.t.p('consume').allies.push(x.t.id.kane!);expect(smartBotAction(x.t.state,x.id,createBotMemory(2),enabled)).toEqual({type:'skill',skill:'break_ally',target:x.t.id.kane});
  x.t.p('consume').allies=[];x.t.p('consume').mana=50;x.t.p('consume').skills.find(s=>s.key==='attack')!.cooldownUntil=x.t.now+10000;
  expect(smartBotAction(x.t.state,x.id,createBotMemory(2),enabled)).not.toMatchObject({skill:x.guard});
 });
 it('미확정 진명·가짜 공표·위장 발신자의 상충 보고만으로 조기 보호하지 않는다',()=>{
  for(const fake of [false,true]){const x=setup('consume',false);x.t.state.revealed[x.t.id.drakan!]='drakan';const sender=fake?'kane':'eltas';
   expect(x.t.publish(sender,'eltas').ok).toBe(true);
   x.t.act('kane',{type:'chat',channel:'whisper',to:x.id,text:`확인 정보: [${x.t.p(sender).seat}] 엘타스`});
   x.t.act('kilder',{type:'chat',channel:'whisper',to:x.id,text:`확인 정보: [${x.t.p(sender).seat}] 라엘`});
   const a=smartBotAction(x.t.state,x.id,x.memory,enabled);expect(a).toEqual({type:'skill',skill:'ally',target:x.t.id.drakan});expect(botKnowledge(x.t.state,x.id,undefined,x.memory).known.has(x.t.id[sender]!)).toBe(false);
  }
 });
 it('새 동맹이 없으면 옵션ON/OFF의 원래 선택을 그대로 유지한다',()=>{
  const x=setup();x.t.p('consume').allies.push(x.t.id.eltas!);const a=createBotMemory(2),b=createBotMemory(2);
  expect(smartBotAction(x.t.state,x.id,a,enabled)).toEqual(smartBotAction(x.t.state,x.id,b,{activity:1}));expect(a).toEqual(b);
 });
 it('동일 자기 뷰에서 숨은 배정·타인 마나·비수신 사건을 바꿔도 선택과 기억이 같다',()=>{
  const x=setup(),other=structuredClone(x.t.state),a=other.players.find(p=>p.id===x.t.id.kilder)!,b=other.players.find(p=>p.id===x.t.id.drakan)!;
  [a.character,b.character]=[b.character,a.character];a.mana=1;b.mana=149;other.log.push({seq:++other.seq,at:x.t.now,kind:'private.test',text:'타인 비공개',vis:{to:'players',ids:[a.id]},data:{secret:'kilder'}});
  expect(viewFor(other,x.id)).toEqual(viewFor(x.t.state,x.id));const left=createBotMemory(2),right=createBotMemory(2);
  expect(smartBotAction(other,x.id,left,enabled)).toEqual(smartBotAction(x.t.state,x.id,right,enabled));expect(left).toEqual(right);
 });
 it('실제 평가 관측ON/OFF에서 경기 전체가 같으며 분모와 실제 보호를 기록한다',()=>{
  const f={mode:'primordial' as const,seed:29,count:11,reversed:false,currentSide:1 as const};
  const on=playCommitmentMatch(f,'truthful','knownCommanderGuardBeforeAlly'),off=playCommitmentMatch(f,'truthful','knownCommanderGuardBeforeAlly',DEFAULT_SETTINGS,false);
  expect(on.game).toEqual(off.game);expect(on.guardDecisions.filter(d=>d.eligible).length).toBeGreaterThan(0);
  for(const d of on.guardDecisions.filter(d=>d.eligible)){expect(d.originalAction).toMatchObject({skill:'ally'});expect(d.selectedGuard&&d.accepted&&d.success).toBe(true);expect(d.ownMemoryEqual&&d.ownRngEqual).toBe(true);}
 });
});
