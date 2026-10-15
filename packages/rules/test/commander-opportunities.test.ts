import {describe,it,expect} from 'vitest';
import {createBotMemory,smartBotAction,viewFor,eventsFor} from '../src/index.js';
import {commanderChoice,playCommanderOpportunities} from '../scripts/commander-opportunities.js';
import {playGuardSelfplay} from '../scripts/guard-selfplay.js';
import {DEFAULT_SETTINGS} from '../scripts/league-runner.js';
import {modeTable,fill,PRIMORDIAL_ORDER} from './helpers.js';
function setup(){const t=modeTable('primordial',PRIMORDIAL_ORDER);t.tick(60000);fill(t,'kilder');t.p('kilder').skills=t.p('kilder').skills.filter(s=>['attack','ally','break_ally'].includes(s.key));return t;}
const record=(t:ReturnType<typeof setup>)=>{const m=createBotMemory(2),a=smartBotAction(t.state,t.id.kilder!,m,{activity:1});const before=structuredClone(m);const d=commanderChoice(viewFor(t.state,t.id.kilder!),eventsFor(t.state,t.id.kilder!),m,a);expect(m).toEqual(before);return d;};
describe('자기 정보에만 근거한 지휘관 공격 기회 관측',()=>{
 it('양 적 지휘관을 기록하고 준비된 명명 공격은 실제 엔진에서 성공한다',()=>{
  const t=setup();t.state.revealed[t.id.kane!]='kane';const d=record(t);
  expect(d.targets.map(x=>x.role)).toEqual(['rael','kane']);expect(d.targets.find(x=>x.role==='rael')).toMatchObject({id:null,status:'unknown'});
  expect(d.targets.find(x=>x.role==='kane')).toMatchObject({id:t.id.kane,status:'ready',available:['attack'],provenance:'public_reveal'});
  expect(d.action).toEqual({type:'skill',skill:'attack',target:t.id.kane,name:'kane'});const r=t.act('kilder',d.action!);expect(r.ok).toBe(true);expect(r.events.some(e=>e.kind==='attack.hit')).toBe(true);
 });
 it('동맹 파기는 공격 가능 기회와 별도 선택으로 남긴다',()=>{
  const t=setup();t.state.revealed[t.id.kane!]='kane';t.p('kilder').allies.push(t.id.kane!);const d=record(t);
  expect(d.targets.find(x=>x.role==='kane')?.status).toBe('ready');expect(d.selectedKind).toBe('break_ally');expect(t.act('kilder',d.action!).ok).toBe(true);
 });
 it('공개 무적·부족 마나·쿨다운·스킬 부재·사망을 분모에서 분리한다',()=>{
  for(const condition of ['invulnerable','mana','cooldown','absent','dead']){
   const t=setup();t.state.revealed[t.id.kane!]='kane';
   if(condition==='invulnerable')t.p('kane').effects.push({id:99,kind:'invulnerable',source:'rune_protection',until:t.now+100000,announced:true});
   if(condition==='mana')t.p('kilder').mana=49;
   if(condition==='cooldown')t.p('kilder').skills.find(s=>s.key==='attack')!.cooldownUntil=t.now+10000;
   if(condition==='absent')t.p('kilder').skills=[];
   if(condition==='dead')t.p('kane').alive=false;
   const target=record(t).targets.find(x=>x.role==='kane')!;
   expect(target.status).toBe(({invulnerable:'known_invulnerable',mana:'named_blocked',cooldown:'named_blocked',absent:'no_named_skill',dead:'known_dead'} as Record<string,string>)[condition]);expect(target.available).toEqual([]);
  }
 });
 it('실제 아군 보고·공표를 확정으로 올리지 않고 위장 발신자와 상충 보고를 보류한다',()=>{
  const t=setup();t.state.revealed[t.id.drakan!]='drakan';t.state.revealed[t.id.hermilly!]='hermilly';fill(t,'kane');expect(t.publish('kane','rael').ok).toBe(true);
  const tell=(sender:string,target:string,name:string)=>expect(t.act(sender,{type:'chat',channel:'whisper',to:t.id.kilder,text:`확인 정보: [${t.p(target).seat}] ${name}`}).ok).toBe(true);
  tell('drakan','rael','라엘');tell('kane','kane','라엘');let q=record(t).targets.find(x=>x.role==='rael')!;
  expect(q.status).toBe('unknown');expect(q.trustedReportIds).toEqual([t.id.rael]);expect(q.claimIds).toContain(t.id.kane);expect(q.reports).toHaveLength(2);
  tell('hermilly','rael','케인');q=record(t).targets.find(x=>x.role==='rael')!;expect(q.trustedReportIds).toEqual([]);expect(q.status).toBe('unknown');
 });
 it('직접 수신 사실·제약 소거 추론·공개 정체의 출처를 구분한다',()=>{
  const t=setup();fill(t,'kane','drakan');expect(t.publish('kane','kane').ok).toBe(true);expect(t.skill('drakan','enemy_check','kane').ok).toBe(true);
  const own=commanderChoice(viewFor(t.state,t.id.drakan!),eventsFor(t.state,t.id.drakan!),createBotMemory(2),null);
  expect(own.targets.find(x=>x.role==='kane')).toMatchObject({id:t.id.kane,provenance:'received_fact'});
  for(const p of t.state.players)if(!['kilder','rael'].includes(p.character))t.state.revealed[p.id]=p.character;
  expect(record(t).targets.find(x=>x.role==='rael')).toMatchObject({id:t.id.rael,provenance:'constraint_inference'});
 });
 it('숨은 배정·타인 마나·비수신 사건 변화가 자기 관측과 선택을 바꾸지 않는다',()=>{
  const t=setup(),other=structuredClone(t.state),a=other.players.find(p=>p.id===t.id.rael)!,b=other.players.find(p=>p.id===t.id.kane)!;
  [a.character,b.character]=[b.character,a.character];a.mana=1;b.mana=149;other.log.push({seq:++other.seq,at:t.now,kind:'private.test',text:'private',vis:{to:'players',ids:[a.id]},facts:[{player:b.id,character:'rael'}]});
  const rows=[t.state,other].map(s=>{const m=createBotMemory(2),a=smartBotAction(s,t.id.kilder!,m,{activity:1});return commanderChoice(viewFor(s,t.id.kilder!),eventsFor(s,t.id.kilder!),m,a);});expect(rows[0]).toEqual(rows[1]);
 });
 it('실제 활성 선택만 수집하며 관측ON/OFF와 원본의 전체 경기·행동 영수증이 일치한다',()=>{
  const f={mode:'primordial' as const,seed:30,count:12,reversed:false,currentSide:1 as const},v='knownCommanderGuardBeforeAlly';
  const on=playCommanderOpportunities(f,v),off=playCommanderOpportunities(f,v,DEFAULT_SETTINGS,false),original=playGuardSelfplay(f,v);
  expect(on.game).toEqual(off.game);expect(on.game).toEqual(original.result.game);expect(off.decisions).toEqual([]);expect(on.decisions.length).toBeGreaterThan(0);
  expect(on.actions).toEqual(original.result.actions.map(t=>({player:t.player,at:t.at,action:t.action,accepted:t.accepted,error:t.error,beforeMana:t.beforeMana,afterMana:t.afterMana,nominalMana:t.nominalMana,character:t.character,side:t.side,receiptKinds:t.receiptKinds})));
  expect(on.decisions.every(d=>d.grading.knownWrong===0)).toBe(true);expect(on.decisions.filter(d=>d.action).length).toBe(on.actions.filter(a=>a.action.type==='skill').length);
 });
});
