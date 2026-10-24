import {describe,it,expect} from 'vitest';
import {smartBotAction,botCommunicationAction,botKnowledge,viewFor,createBotMemory,applyAction,type ModeId} from '../src/index.js';
import {hasUnresolvedCommanderReport,trustedIntel} from '../src/bot-intel.js';
import {smartBotAction as frozenBot,botCommunicationAction as frozenChat} from '../scripts/baselines/pre-round053.js';
import {prepareMatch,playMatch,DEFAULT_SETTINGS,type Policy} from '../scripts/league-runner.js';
import {civilTable,fill} from './helpers.js';
function setup(){
 const {state:s}=prepareMatch({mode:'primordial',seed:27,count:12,reversed:false,currentSide:1}),p=s.players.find(p=>p.character==='drakan')!,sender=s.players.find(p=>p.character==='kilder')!,other=s.players.find(p=>p.character==='hermilly')!,target=s.players.find(p=>p.character==='eltas')!,known=s.players.find(p=>p.character==='eoril')!;
 p.skills=[];p.mana=130;p.gem=2;p.gemCooldownUntil=0;
 expect(applyAction(s,p.id,{type:'skill',skill:'truth_gem',target:known.id},s.now).ok).toBe(true);p.gem=2;p.gemCooldownUntil=0;p.mana=130;
 sender.allies.push(p.id);other.allies.push(p.id);
 const seat=(id:string)=>s.players.find(p=>p.id===id)!.seat;
 expect(applyAction(s,sender.id,{type:'chat',channel:'whisper',to:p.id,text:`확인 정보: [${seat(target.id)}] 엘타스`},s.now).ok).toBe(true);
 expect(applyAction(s,other.id,{type:'chat',channel:'whisper',to:p.id,text:`확인 정보: [${seat(known.id)}] 에오릴`},s.now).ok).toBe(true);
 // Explicit synthetic ordering: an already-resolved report sender precedes the commander report sender.
 s.players=[other,...s.players.filter(x=>x.id!==other.id)];
 const m=createBotMemory(19),v=viewFor(s,p.id),k=botKnowledge(s,p.id,v,m);
 return {s,p,sender,other,target,known,m,v,k};
}
describe('미확정 지휘관 보고 발신자 확인 — 기본OFF',()=>{
 it('실제 수신 보고만으로 좁히고 대상/발신자를 사실로 확정하지 않는다',()=>{
  const {sender,other,target,m,v,k}=setup(),before=structuredClone(m);
  expect(hasUnresolvedCommanderReport(v,k,m,sender.id)).toBe(true);expect(hasUnresolvedCommanderReport(v,k,m,other.id)).toBe(false);
  expect(k.known.has(sender.id)).toBe(false);expect(k.known.has(target.id)).toBe(false);expect(trustedIntel(v,k,m).size).toBe(0);expect(m).toEqual(before);
 });
 it('기존 포괄 확인 대신 미확정 지휘관 보고 발신자를 실제 보석으로 확인한다',()=>{
  const {s,p,sender,other,target,m}=setup();
  expect(smartBotAction(s,p.id,structuredClone(m),{activity:1,verifyIncomingAllies:'useful-report'})).toEqual({type:'skill',skill:'truth_gem',target:other.id});
  const action=smartBotAction(s,p.id,m,{activity:1,verifyIncomingAllies:'commander-report'});expect(action).toEqual({type:'skill',skill:'truth_gem',target:sender.id});
  expect(m.perception!.known.has(sender.id)).toBe(false);expect(m.perception!.known.has(target.id)).toBe(false);
  expect(applyAction(s,p.id,action!,s.now).ok).toBe(true);const v=viewFor(s,p.id),k=botKnowledge(s,p.id,v,m);
  expect(k.known.get(sender.id)).toBe('kilder');expect(k.known.has(target.id)).toBe(false);expect(trustedIntel(v,k,m).get(target.id)).toBe('eltas');
 });
 it('미수신/비호환/사망/이미확정/자기대상/비요청자 보고를 제외한다',()=>{
  const {sender,target,m,v,k}=setup();
  for(const mutate of [
   (x:typeof m,y:typeof v,z:typeof k)=>{x.perception!.intel!.reports.clear();},
   (x:typeof m,y:typeof v,z:typeof k)=>{z.candidates.set(target.id,['rael']);},
   (x:typeof m,y:typeof v,z:typeof k)=>{y.players.find(p=>p.id===target.id)!.alive=false;},
   (x:typeof m,y:typeof v,z:typeof k)=>{z.known.set(target.id,'eltas');},
   (x:typeof m,y:typeof v,z:typeof k)=>{y.players.find(p=>p.id===sender.id)!.alive=false;},
   (x:typeof m,y:typeof v,z:typeof k)=>{z.known.set(sender.id,'kilder');},
   (x:typeof m,y:typeof v,z:typeof k)=>{y.me.alliedBy=[];},
   (x:typeof m,y:typeof v,z:typeof k)=>{x.perception!.intel!.reports.clear();x.perception!.intel!.reports.set(y.me.id,new Map([[sender.id,{character:'eltas',at:0,seq:1}]]));z.candidates.set(y.me.id,['eltas']);},
   (x:typeof m,y:typeof v,z:typeof k)=>{x.perception!.intel!.reports.get(target.id)!.get(sender.id)!.character='eoril';z.candidates.set(target.id,['eoril']);},
  ]){const x=structuredClone(m),y=structuredClone(v),z=structuredClone(k);mutate(x,y,z);expect(hasUnresolvedCommanderReport(y,z,x,sender.id)).toBe(false);}
 });
 it('위장한 동맹 요청자를 확인해도 아군/보고 대상을 확정하지 않는다',()=>{
  const t=civilTable();t.publish('kai','kai');t.publish('soen','arin');fill(t,'soen','kai');t.skill('soen','ally','kai');
  t.act('soen',{type:'chat',channel:'whisper',to:t.id.kai,text:`확인 정보: [${t.p('dantes').seat}] 단테스`});
  t.p('kai').skills=t.p('kai').skills.filter(s=>['ally','ally_check'].includes(s.key));
  const m=createBotMemory(5),a=smartBotAction(t.state,t.id.kai!,m,{activity:1,verifyIncomingAllies:'commander-report'});expect(a).toEqual({type:'skill',skill:'ally_check',target:t.id.soen});expect(t.act('kai',a!).ok).toBe(true);
  const v=viewFor(t.state,t.id.kai!),k=botKnowledge(t.state,t.id.kai!,v,m);expect(k.known.has(t.id.soen!)).toBe(false);expect(k.candidates.get(t.id.soen!)).toContain('soen');expect(k.known.has(t.id.dantes!)).toBe(false);expect(trustedIntel(v,k,m).size).toBe(0);
 });
 it('상충 보고는 확인 동기일 뿐 사실·단일 지휘관 확정이 아니다',()=>{
  const {sender,other,target,m,v,k}=setup();m.perception!.intel!.reports.get(target.id)!.set(other.id,{character:'rael',at:0,seq:999});
  expect(hasUnresolvedCommanderReport(v,k,m,sender.id)).toBe(true);expect(hasUnresolvedCommanderReport(v,k,m,other.id)).toBe(true);expect(k.known.has(target.id)).toBe(false);
  k.known.set(sender.id,'kilder');k.known.set(other.id,'hermilly');expect(trustedIntel(v,k,m).has(target.id)).toBe(false);
 });
 it('미확정 지휘관 보고가 없으면 새 모드는 기본 행동·전체 기억/RNG를 바꾸지 않는다',()=>{
  const {s,p,m}=setup();m.perception!.intel!.reports.clear();
  for(let seed=1;seed<=20;seed++){const a=structuredClone(m),b=structuredClone(m);a.rng=b.rng=seed;expect(smartBotAction(s,p.id,a,{activity:1,verifyIncomingAllies:'commander-report'})).toEqual(smartBotAction(s,p.id,b,{activity:1}));expect(a).toEqual(b);}
 });
 it('상위 확정 공격을 새 확인보다 보존하고 보호/마나 부족 수단을 강제하지 않는다',()=>{
  const {s,p,sender,m}=setup(),enemy=s.players.find(p=>p.character==='rael')!;m.perception!.known.set(enemy.id,'rael');p.skills.push({key:'supreme_attack',level:1,cooldownUntil:0,usesLeft:null});
  const a=smartBotAction(s,p.id,m,{activity:1,verifyIncomingAllies:'commander-report'});expect(a).toEqual({type:'skill',skill:'supreme_attack',target:enemy.id,name:'rael'});
  const second=setup();second.p.mana=0;expect(smartBotAction(second.s,second.p.id,second.m,{activity:1,verifyIncomingAllies:'commander-report'})).toBeNull();
  const third=setup();third.sender.effects.push({id:99999,kind:'invulnerable',source:'unit',until:1000,announced:true});expect(smartBotAction(third.s,third.p.id,third.m,{activity:1,verifyIncomingAllies:'commander-report'})).not.toEqual({type:'skill',skill:'truth_gem',target:third.sender.id});
 });
 it('기본OFF와 기존 true/useful-report는 고정052 정책의 행동·전체 기억/RNG와 같다',()=>{
  for(const mode of ['civil_war','primordial','lidellut','troll'] as ModeId[]){
   const variants=mode==='primordial'?[undefined,false,true,'useful-report' as const]:[undefined];
   for(const verifyIncomingAllies of variants){
    const policy:Policy=(s,id,m,o)=>{const before=structuredClone(m),expected=frozenBot(s,id,before,{...o,verifyIncomingAllies}),a=smartBotAction(s,id,m,{...o,verifyIncomingAllies});expect(a).toEqual(expected);expect(m).toEqual(before);return a;};
    const chat:Policy=(s,id,m,o)=>{const before=structuredClone(m),expected=frozenChat(s,id,before,{...o,verifyIncomingAllies}),a=botCommunicationAction(s,id,m,{...o,verifyIncomingAllies});expect(a).toEqual(expected);expect(m).toEqual(before);return a;};
    playMatch({mode,seed:41,count:12,reversed:false,currentSide:1},{current:policy,reference:policy},{...DEFAULT_SETTINGS,limitMs:240000},undefined,{current:chat,reference:chat});
   }
  }
 },120000);
});
