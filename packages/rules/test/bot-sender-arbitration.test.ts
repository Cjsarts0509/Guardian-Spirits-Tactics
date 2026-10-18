import {describe,it,expect} from 'vitest';
import {smartBotAction,botCommunicationAction,botKnowledge,viewFor,createBotMemory,applyAction,type ModeId} from '../src/index.js';
import {trustedIntel,verifyIntel} from '../src/bot-intel.js';
import {smartBotAction as frozenBot,botCommunicationAction as frozenChat} from '../scripts/baselines/pre-round054.js';
import {prepareMatch,playMatch,DEFAULT_SETTINGS,type Policy} from '../scripts/league-runner.js';
import {civilTable,fill} from './helpers.js';
const mode='commander-report-first' as const;
function setup(){
 const {state:s}=prepareMatch({mode:'primordial',seed:27,count:12,reversed:false,currentSide:1});
 const p=s.players.find(p=>p.character==='drakan')!,sender=s.players.find(p=>p.character==='kilder')!,ordinary=s.players.find(p=>p.character==='hermilly')!,target=s.players.find(p=>p.character==='eltas')!,peer=s.players.find(p=>p.character==='consume')!;
 p.skills=[];p.mana=130;p.gem=2;p.gemCooldownUntil=0;
 expect(applyAction(s,p.id,{type:'skill',skill:'truth_gem',target:peer.id},s.now).ok).toBe(true);
 p.gem=2;p.gemCooldownUntil=0;p.mana=130;p.allies.push(peer.id);sender.allies.push(p.id);
 const report=(from:string,to:string,name:string)=>expect(applyAction(s,from,{type:'chat',channel:'whisper',to:p.id,text:`확인 정보: [${s.players.find(p=>p.id===to)!.seat}] ${name}`},s.now).ok).toBe(true);
 report(sender.id,target.id,'엘타스');report(peer.id,ordinary.id,'허밀리');
 const m=createBotMemory(19),v=viewFor(s,p.id),k=botKnowledge(s,p.id,v,m);
 return {s,p,sender,ordinary,target,peer,m,v,k,report};
}
describe('같은 정보 단계에서만 지휘관 보고 발신자 먼저 — 기본OFF',()=>{
 it('신뢰 일반 보고 확인 대신 미확정 발신자를 직접 확인하되 지휘관은 보고로만 둔다',()=>{
  const {s,p,sender,ordinary,target,m,v,k}=setup(),usable=new Map(v.me.skills.filter(s=>s.blocked===null).map(s=>[s.key,s]));
  expect(verifyIntel(v,k,m,usable)).toEqual({type:'skill',skill:'truth_gem',target:ordinary.id});
  expect(smartBotAction(s,p.id,structuredClone(m),{activity:1,verifyIncomingAllies:'commander-report'})).toEqual({type:'skill',skill:'truth_gem',target:ordinary.id});
  const a=smartBotAction(s,p.id,m,{activity:1,verifyIncomingAllies:mode});expect(a).toEqual({type:'skill',skill:'truth_gem',target:sender.id});
  expect(m.perception!.known.has(sender.id)).toBe(false);expect(m.perception!.known.has(target.id)).toBe(false);
  expect(applyAction(s,p.id,a!,s.now).ok).toBe(true);const after=viewFor(s,p.id),ak=botKnowledge(s,p.id,after,m);
  expect(ak.known.get(sender.id)).toBe('kilder');expect(ak.known.has(target.id)).toBe(false);expect(trustedIntel(after,ak,m).get(target.id)).toBe('eltas');
 });
 it('실제로 선택 불가능한 지휘관 스캔을 만들어내지 않는다',()=>{
  const {s,p,peer,m,report}=setup(),enemy=s.players.find(p=>p.character==='rael')!;
  report(peer.id,enemy.id,'라엘');p.skills.push({key:'scan',level:1,cooldownUntil:0,usesLeft:null});
  const a=smartBotAction(s,p.id,m,{activity:1,verifyIncomingAllies:mode});
  expect(viewFor(s,p.id).me.skills.find(s=>s.key==='scan')!.nameOptions).not.toContain('rael');
  expect(a).toMatchObject({type:'skill',skill:'scan',target:s.players.find(p=>p.character==='kilder')!.id});expect(applyAction(s,p.id,a!,s.now).ok).toBe(true);
 });
 it('후보가 없거나 사망/확정/공개 무적/비호환이면 기존 행동과 기억을 보존한다',()=>{
  for(const mutate of [
   (t:ReturnType<typeof setup>)=>{t.m.perception!.intel!.reports.delete(t.target.id);},
   (t:ReturnType<typeof setup>)=>{t.sender.alive=false;},
   (t:ReturnType<typeof setup>)=>{t.m.perception!.known.set(t.sender.id,'kilder');t.p.allies.push(t.sender.id);},
   (t:ReturnType<typeof setup>)=>{t.sender.effects.push({id:99999,kind:'invulnerable',source:'unit',until:1000,announced:true});},
   (t:ReturnType<typeof setup>)=>{t.m.perception!.known.set(t.target.id,'rael');},
  ]){
   const t=setup();mutate(t);const a=structuredClone(t.m),b=structuredClone(t.m);
   expect(smartBotAction(t.s,t.p.id,a,{activity:1,verifyIncomingAllies:mode})).toEqual(smartBotAction(t.s,t.p.id,b,{activity:1,verifyIncomingAllies:'commander-report'}));expect(a).toEqual(b);
  }
 });
 it('공격/공격 예약/지원/새 동맹을 넘지 않는다',()=>{
  const t=setup(),enemy=t.s.players.find(p=>p.character==='rael')!;t.m.perception!.known.set(enemy.id,'rael');
  t.p.skills.push({key:'supreme_attack',level:1,cooldownUntil:0,usesLeft:null});
  expect(smartBotAction(t.s,t.p.id,t.m,{activity:1,verifyIncomingAllies:mode})).toEqual({type:'skill',skill:'supreme_attack',target:enemy.id,name:'rael'});
  const r=setup();r.m.perception!.known.set(enemy.id,'rael');r.p.mana=50;r.p.skills.push({key:'supreme_attack',level:1,cooldownUntil:10000,usesLeft:null});
  const rm=structuredClone(r.m),a=smartBotAction(r.s,r.p.id,r.m,{activity:1,verifyIncomingAllies:mode}),b=smartBotAction(r.s,r.p.id,rm,{activity:1,verifyIncomingAllies:'commander-report'});expect(a).toEqual(b);expect(a).not.toMatchObject({skill:'truth_gem'});expect(r.m).toEqual(rm);
  const ally=setup();ally.p.allies=[];ally.p.skills.push({key:'ally',level:1,cooldownUntil:0,usesLeft:null});
  expect(smartBotAction(ally.s,ally.p.id,ally.m,{activity:1,verifyIncomingAllies:mode})).toEqual({type:'skill',skill:'ally',target:ally.peer.id});
  const support=setup();support.p.skills.push({key:'drakan_enchant_muscle',level:1,cooldownUntil:0,usesLeft:null});
  expect(smartBotAction(support.s,support.p.id,support.m,{activity:1,verifyIncomingAllies:mode})).toEqual({type:'skill',skill:'drakan_enchant_muscle',target:support.peer.id});
 });
 it('위장한 요청자를 확인한 뒤에도 보고/발신자를 확정 사실로 올리지 않는다',()=>{
  const t=civilTable();t.publish('kai','kai');t.publish('soen','arin');fill(t,'soen','kai');t.skill('soen','ally','kai');
  t.act('soen',{type:'chat',channel:'whisper',to:t.id.kai,text:`확인 정보: [${t.p('dantes').seat}] 단테스`});
  t.p('kai').skills=t.p('kai').skills.filter(s=>['ally','ally_check'].includes(s.key));t.p('kai').gem=2;
  const m=createBotMemory(5),v=viewFor(t.state,t.id.kai!),k=botKnowledge(t.state,t.id.kai!,v,m);m.perception!.known.set(t.id.krate!,'krate');t.p('kai').allies.push(t.id.krate!);
  t.act('krate',{type:'chat',channel:'whisper',to:t.id.kai,text:`확인 정보: [${t.p('kaspa').seat}] 카스파`});
  const a=smartBotAction(t.state,t.id.kai!,m,{activity:1,verifyIncomingAllies:mode});expect(a).toEqual({type:'skill',skill:'ally_check',target:t.id.soen});expect(t.act('kai',a!).ok).toBe(true);
  const after=viewFor(t.state,t.id.kai!),ak=botKnowledge(t.state,t.id.kai!,after,m);expect(ak.known.has(t.id.soen!)).toBe(false);expect(ak.known.has(t.id.dantes!)).toBe(false);expect(ak.candidates.get(t.id.soen!)).toContain('soen');expect(trustedIntel(after,ak,m).has(t.id.dantes!)).toBe(false);
 });
 it('상충 지휘관 보고는 확인 동기일 뿐, 확인 후에도 대상 확정이 아니다',()=>{
  const t=setup();t.m.perception!.intel!.reports.get(t.target.id)!.set(t.peer.id,{character:'rael',at:0,seq:999});
  const a=smartBotAction(t.s,t.p.id,t.m,{activity:1,verifyIncomingAllies:mode});expect(a).toEqual({type:'skill',skill:'truth_gem',target:t.sender.id});
  expect(applyAction(t.s,t.p.id,a!,t.s.now).ok).toBe(true);const v=viewFor(t.s,t.p.id),k=botKnowledge(t.s,t.p.id,v,t.m);expect(k.known.has(t.target.id)).toBe(false);expect(trustedIntel(v,k,t.m).has(t.target.id)).toBe(false);
 });
 it('타인의 숨은 자원/flags/스킬은 같은 자기 입력의 행동에 영향을 주지 않는다',()=>{
  const t=setup(),s=structuredClone(t.s),m=structuredClone(t.m);
  for(const p of s.players)if(p.id!==t.p.id){p.mana=0;p.skills=[];p.flags={};p.extraLives=90;}
  expect(viewFor(s,t.p.id)).toEqual(viewFor(t.s,t.p.id));expect(smartBotAction(s,t.p.id,m,{activity:1,verifyIncomingAllies:mode})).toEqual(smartBotAction(t.s,t.p.id,t.m,{activity:1,verifyIncomingAllies:mode}));expect(m).toEqual(t.m);
 });
 it('기본값·기존 모든 발신자 옵션의 행동·전체 기억/RNG·대화가 고정053과 같다',()=>{
  for(const mode of ['civil_war','primordial','lidellut','troll'] as ModeId[]){
   for(const verifyIncomingAllies of mode==='primordial'?[undefined,false,true,'useful-report' as const,'commander-report' as const]:[undefined]){
    const policy:Policy=(s,id,m,o)=>{const before=structuredClone(m),expected=frozenBot(s,id,before,{...o,verifyIncomingAllies}),a=smartBotAction(s,id,m,{...o,verifyIncomingAllies});expect(a).toEqual(expected);expect(m).toEqual(before);return a;};
    const chat:Policy=(s,id,m,o)=>{const before=structuredClone(m),expected=frozenChat(s,id,before,{...o,verifyIncomingAllies}),a=botCommunicationAction(s,id,m,{...o,verifyIncomingAllies});expect(a).toEqual(expected);expect(m).toEqual(before);return a;};
    playMatch({mode,seed:41,count:12,reversed:false,currentSide:1},{current:policy,reference:policy},{...DEFAULT_SETTINGS,limitMs:240000},undefined,{current:chat,reference:chat});
   }
  }
 },120000);
});
