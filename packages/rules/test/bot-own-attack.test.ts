import {describe,it,expect} from 'vitest';
import {botKnowledge,createBotMemory,observeBotActionResult,updateBotKnowledge,viewFor,eventsFor,smartBotAction,botCommunicationAction,encodeHostSnapshot,decodeHostSnapshot} from '../src/index.js';
import {prepareOwnAttack} from '../src/bot-own-attack.js';
import {playCommitmentMatch} from '../scripts/cooperative-commitment-match.js';
import {DEFAULT_SETTINGS} from '../scripts/league-runner.js';
import {shareIntel} from '../src/bot-intel.js';
import type {Action,GameEvent} from '../src/types.js';
import {modeTable,TROLL_ORDER,PRIMORDIAL_ORDER,civilTable,fill} from './helpers.js';
const enabled={learnOwnAttackOutcome:true};
function setup(){
 const t=modeTable('troll',TROLL_ORDER);t.tick(60000);fill(t,'kazrow');const id=t.id.kazrow!,target=t.id.zwinra!,m=createBotMemory(7);
 const k=botKnowledge(t.state,id,undefined,m,enabled);expect(k.known.has(target)).toBe(false);
 const action:Action={type:'skill',skill:'advanced_attack',target,name:'zwinra'};return {t,id,target,m,action};
}
function hit(){const x=setup();prepareOwnAttack(x.m,x.action,x.t.now);const result=x.t.act('kazrow',x.action);expect(result.ok).toBe(true);expect(result.events.some(e=>e.kind==='attack.hit')).toBe(true);observeBotActionResult(x.m,x.action,result,x.t.now);return {...x,result};}
describe('자기 명명 공격 결과와 대상 정체 기억',()=>{
 it('실제 명중 후 대상ID 정체를 기억하고 수신자만 아는 사실은 공개하지 않는다',()=>{
  const {t,id,target,m}=hit();const k=botKnowledge(t.state,id,undefined,m,enabled);
  expect(k.known.get(target)).toBe('zwinra');expect(m.perception!.known.has(target)).toBe(false);expect(t.state.revealed[target]).toBeUndefined();
  const observer=createBotMemory(8);expect(botKnowledge(t.state,t.id.deka!,undefined,observer,enabled).known.has(target)).toBe(false);
  expect(m.perception!.ownAttacks!.proofs.get(target)?.kind).toBe('attack.hit');
  expect(eventsFor(t.state,id).some(e=>e.kind==='attack.hit'&&e.facts?.some(f=>f.player===target))).toBe(false);
 });
 it('명중으로 얻은 적 정체를 확인된 아군에게 실제 귓속말로 공유한다',()=>{
  const {t,id,target,m}=hit();m.perception!.known.set(t.id.deka!,'deka');t.p('kazrow').allies=[t.id.deka!];const k=botKnowledge(t.state,id,undefined,m,enabled);
  const chat=shareIntel(viewFor(t.state,id),k,m);expect(chat).toEqual({type:'chat',channel:'whisper',to:t.id.deka,text:'확인 정보: [3] 즈윈라'});
  expect(t.act('kazrow',chat!).ok).toBe(true);expect(eventsFor(t.state,t.id.deka!).some(e=>e.kind==='chat.whisper')).toBe(true);
  expect(eventsFor(t.state,t.id.chis!).some(e=>e.kind==='chat.whisper')).toBe(false);expect(k.known.get(target)).toBe('zwinra');
 });
 it('실제 횟수제 보디가드 성공은 기억하지만 절대 보호 실패·이름 오류는 확정하지 않는다',()=>{
  const t=modeTable('primordial',PRIMORDIAL_ORDER);t.tick(60000);fill(t,'kilder','kumarin');expect(t.skill('kumarin','kumarin_commander_guard','rael').ok).toBe(true);const id=t.id.kilder!,m=createBotMemory(1);
  botKnowledge(t.state,id,undefined,m,enabled);const a:Action={type:'skill',skill:'attack',target:t.id.rael,name:'rael'};
  prepareOwnAttack(m,a,t.now);const r=t.act('kilder',a);expect(r.ok).toBe(true);expect(r.events.some(e=>e.kind==='attack.guarded')).toBe(true);observeBotActionResult(m,a,r,t.now);
  expect(botKnowledge(t.state,id,undefined,m,enabled).known.get(t.id.rael!)).toBe('rael');
  for(const name of ['dantes','mertz']){const c=civilTable();c.tick(60000);fill(c,'kai');const cm=createBotMemory(1),cid=c.id.kai!,target=c.id.dantes!;
   botKnowledge(c.state,cid,undefined,cm,enabled);const bad:Action={type:'skill',skill:'advanced_attack',target,name};prepareOwnAttack(cm,bad,c.now);const rr=c.act('kai',bad);expect(rr.ok).toBe(true);expect(rr.events.some(e=>e.kind==='attack.fail.self')).toBe(true);observeBotActionResult(cm,bad,rr,c.now);
   const ck=botKnowledge(c.state,cid,undefined,cm,enabled);expect(ck.known.has(target)).toBe(false);expect(ck.candidates.get(target)).toContain('dantes');expect(cm.perception!.ownAttacks!.proofs.size).toBe(0);
  }
 });
 it('비활성·거절·응답 미수신·다른 명령의 성공에는 학습하지 않는다',()=>{
  for(const type of ['disabled','rejected','unacknowledged','different'] as const){const x=setup();if(type==='disabled')botKnowledge(x.t.state,x.id,undefined,x.m,{learnOwnAttackOutcome:false});
   prepareOwnAttack(x.m,x.action,x.t.now);const r=x.t.act('kazrow',x.action);
   if(type!=='unacknowledged')observeBotActionResult(x.m,type==='different'?{...x.action,target:x.t.id.satoshi}:x.action,type==='rejected'?{ok:false,error:'마나 부족'}:r,x.t.now);
   expect(botKnowledge(x.t.state,x.id,undefined,x.m).known.has(x.target)).toBe(false);
  }
 });
 it('다른 수신자·시점·이름·시전자·중복 결과는 배제한다',()=>{
  for(const change of ['private','time','name','actor','duplicate','oldseq'] as const){const x=hit(),event=structuredClone(x.result.events.find(e=>e.kind==='attack.hit')!);let list:GameEvent[]=[event];
   if(change==='private')event.vis={to:'players',ids:[x.t.id.deka!]};if(change==='time')event.at--;if(change==='name')event.data!.target='satoshi';if(change==='actor')event.data!.attacker='deka';if(change==='oldseq')event.seq=x.m.perception!.ownAttacks!.pending!.afterSeq;if(change==='duplicate')list.push({...event,seq:event.seq+1});
   expect(updateBotKnowledge(viewFor(x.t.state,x.id),list,x.m,enabled).known.has(x.target)).toBe(false);
  }
 });
 it('동일 시각 복수 응답을 모호한 것으로 버리고 활동 없는 호출은 미소비 응답을 보존한다',()=>{
  const x=hit();observeBotActionResult(x.m,x.action,{ok:true},x.t.now);expect(botKnowledge(x.t.state,x.id,undefined,x.m,enabled).known.has(x.target)).toBe(false);
  const y=hit();expect(smartBotAction(y.t.state,y.id,y.m,{...enabled,activity:0})).toBeNull();expect(botKnowledge(y.t.state,y.id,undefined,y.m,enabled).known.get(y.target)).toBe('zwinra');
 });
 it('호스트 이전 뒤 기억과 미소비 결과를 복원하며 다른 주체·새 판에는 제거한다',()=>{
  const x=hit();const snapshot={version:1 as const,state:x.t.state,memories:new Map([[x.id,x.m]]),records:[],handled:0,results:[]};
  const restored=decodeHostSnapshot(encodeHostSnapshot(snapshot));const m=restored.memories.get(x.id)!;expect(botKnowledge(restored.state,x.id,undefined,m,enabled).known.get(x.target)).toBe('zwinra');
  expect(botKnowledge(restored.state,x.t.id.deka!,undefined,m,enabled).known.has(x.target)).toBe(false);
  const fresh=modeTable('troll',TROLL_ORDER);expect(botKnowledge(fresh.state,x.id,undefined,x.m,enabled).known.has(x.target)).toBe(false);
 });
 it('자기 관측이 같으면 숨은 배정이 달라도 기억과 선택이 같다',()=>{
  const x=hit(),other=structuredClone(x.t.state),a=other.players.find(p=>p.id===x.target)!,b=other.players.find(p=>p.id===x.t.id.satoshi)!;[a.character,b.character]=[b.character,a.character];
  expect(viewFor(other,x.id)).toEqual(viewFor(x.t.state,x.id));const left=structuredClone(x.m),right=structuredClone(x.m);
  expect(smartBotAction(other,x.id,right,{...enabled,activity:1})).toEqual(smartBotAction(x.t.state,x.id,left,{...enabled,activity:1}));expect(right).toEqual(left);
 });
 it('실제 스마트 정책의 추측→명중→기억→다음 확정 공격 흐름을 연결한다',()=>{
  const x=setup();x.target=x.t.id.satoshi!;x.t.tick(30*60000);fill(x.t,'kazrow');x.t.p('kazrow').skills=x.t.p('kazrow').skills.filter(s=>s.key==='advanced_attack');x.t.p('zwinra').published='zwinra';
  for(const p of x.t.state.players){if(!['kazrow','zwinra','satoshi'].includes(p.character))x.t.state.revealed[p.id]=p.character;if(!['kazrow','satoshi'].includes(p.character))p.effects.push({id:999,kind:'invulnerable',source:'test',until:x.t.now+999999,announced:true});}
  let chosen:Action|null=null;
  for(let seed=1;seed<1000;seed++){const m=createBotMemory(seed);const a=smartBotAction(x.t.state,x.id,m,{...enabled,activity:1});if(a?.type==='skill'&&a.target===x.target&&a.name==='satoshi'){Object.assign(x.m,m);chosen=a;break;}}
  expect(chosen).not.toBeNull();const r=x.t.act('kazrow',chosen!);expect(r.events.some(e=>e.kind==='attack.hit')).toBe(true);observeBotActionResult(x.m,chosen!,r,x.t.now);
  botCommunicationAction(x.t.state,x.id,x.m,enabled);expect(botKnowledge(x.t.state,x.id,undefined,x.m,enabled).known.get(x.target)).toBe('satoshi');
  x.t.tick(61000);fill(x.t,'kazrow');const next=smartBotAction(x.t.state,x.id,x.m,{...enabled,activity:1});expect(next).toEqual(chosen);
 });
 it('평가 관측을 켜고 꺼도 실제 경기·자원 결과가 같고 옵션OFF는 기존 기억을 만든다',()=>{
  const f={mode:'troll' as const,seed:23,count:11,reversed:false,currentSide:2 as const};
  const on=playCommitmentMatch(f,'bluff','learnOwnAttackOutcome'),off=playCommitmentMatch(f,'bluff','learnOwnAttackOutcome',DEFAULT_SETTINGS,false);
  expect(on.game).toEqual(off.game);
  const t=civilTable(),a=createBotMemory(7),b=createBotMemory(7),id=t.id.kai!;
  expect(smartBotAction(t.state,id,a,{activity:1})).toEqual(smartBotAction(t.state,id,b,{activity:1,learnOwnAttackOutcome:false}));expect(a).toEqual(b);expect(a.perception?.ownAttacks).toBeUndefined();
 });

});
