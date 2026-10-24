import {describe,it,expect} from 'vitest';
import {applyAction,botCommunicationAction,botKnowledge,createBotMemory,smartBotAction,viewFor,assignmentBelief} from '../src/index.js';
import {shareIntel,trustedIntel,verifyIntel} from '../src/bot-intel.js';
import {strategicClaimName} from '../src/bot-claim-policy.js';
import {civilTable,fill,modeTable,TROLL_ORDER,PRIMORDIAL_ORDER} from './helpers.js';

describe('확정 관계와 실제 대화 기반 협력',()=>{
 it('확정 아군은 정보 스킬보다 먼저 동맹을 걸고 반복하지 않는다',()=>{
  const t=civilTable();fill(t,'dantes');t.publish('dantes','freya');t.state.revealed[t.id.kelhu!]='kelhu';
  const memory=createBotMemory(3);
  const action=smartBotAction(t.state,t.id.dantes!,memory,{activity:1,claimStrategy:'current'});
  expect(action).toEqual({type:'skill',skill:'ally',target:t.id.kelhu});
  expect(applyAction(t.state,t.id.dantes!,action!,t.now).ok).toBe(true);
  expect(smartBotAction(t.state,t.id.dantes!,memory,{activity:1,claimStrategy:'current'})).not.toEqual(action);
 });
 it('확정 적에게 걸어 둔 동맹은 공격이나 정보 공유 전에 파기한다',()=>{
  const t=civilTable();fill(t,'dantes');t.skill('dantes','ally','arin');t.state.revealed[t.id.arin!]='arin';
  expect(smartBotAction(t.state,t.id.dantes!,createBotMemory(3),{activity:1})).toEqual({type:'skill',skill:'break_ally',target:t.id.arin});
 });
 it('아군 공표·동맹 접근과 변장 확인만으로 확정 아군 동맹을 실행하지 않는다',()=>{
  const t=civilTable();t.publish('soen','arin');t.skill('soen','ally','kai');t.skill('kai','ally_check','soen');
  const memory=createBotMemory(3),v=viewFor(t.state,t.id.kai!);const k=botKnowledge(t.state,t.id.kai!,v,memory);
  expect(k.known.has(t.id.soen!)).toBe(false);expect(k.candidates.get(t.id.soen!)).toContain('soen');
  const action=smartBotAction(t.state,t.id.kai!,memory,{activity:1});
  expect(action).not.toEqual({type:'skill',skill:'ally',target:t.id.soen});
 });
 it('B가 직접 확인한 C를 A에게 귓속말로 공유하고 A는 검증을 우선한다',()=>{
  const t=civilTable();fill(t,'kelhu','freya');
  for(const [actor,target] of [['kelhu','freya'],['kelhu','reindila'],['freya','kelhu']] as const){
   t.p(actor).gem=2;t.p(actor).gemCooldownUntil=0;expect(t.skill(actor,'truth_gem',target).ok).toBe(true);
  }
  t.skill('kelhu','ally','freya');
  const b=createBotMemory(3),a=createBotMemory(4),outsider=createBotMemory(5);
  const bv=viewFor(t.state,t.id.kelhu!),bk=botKnowledge(t.state,t.id.kelhu!,bv,b);
  const report=shareIntel(bv,bk,b)!;expect(report).toMatchObject({type:'chat',channel:'whisper',to:t.id.freya});
  expect(report.type==='chat'&&report.text).toContain('레인딜라');
  expect(applyAction(t.state,t.id.kelhu!,report,t.now).ok).toBe(true);
  botKnowledge(t.state,t.id.kelhu!,undefined,b);expect(shareIntel(viewFor(t.state,t.id.kelhu!),bk,b)).toBeNull();
  const av=viewFor(t.state,t.id.freya!),ak=botKnowledge(t.state,t.id.freya!,av,a);
  expect(trustedIntel(av,ak,a).get(t.id.reindila!)).toBe('reindila');
  expect(ak.known.has(t.id.reindila!)).toBe(false); // 보고는 직접 확인과 구분
  const knowledgeBefore={...ak};const belief=assignmentBelief(av,ak,a);
  const baseline=assignmentBelief(av,knowledgeBefore,{...a,perception:{...a.perception!,intel:undefined},beliefCache:undefined});
  expect(belief.probabilities.get(t.id.reindila!)!.get('reindila')).toBeGreaterThan(baseline.probabilities.get(t.id.reindila!)!.get('reindila')!);
  const base=av.me.skills.find(s=>s.key==='scan')??av.me.skills.find(s=>!!s.nameOptions&&s.target==='player')!;
  const scan={...base,key:'advanced_scan',nameOptions:['reindila'],blocked:null};
  expect(verifyIntel(av,ak,a,new Map([['advanced_scan',scan]]))).toMatchObject({target:t.id.reindila,name:'reindila'});
  botKnowledge(t.state,t.id.kai!,undefined,outsider);expect(outsider.perception?.intel?.reports.size??0).toBe(0);
  expect(shareIntel(av,ak,a)).toBeNull(); // 근거 없이 전달받은 말을 다른 아군에게 재전파하지 않음
 });
 it('위장한 적의 보고는 저장해도 신뢰하지 않고 직접 확인과 충돌하는 말은 폐기한다',()=>{
  const t=civilTable();t.publish('soen','arin');
  const v=viewFor(t.state,t.id.kai!),name=v.roster.find(r=>r.key==='dantes')!.name;
  t.act('soen',{type:'chat',channel:'whisper',to:t.id.kai,text:`확인 정보: [${t.p('arin').seat}] ${name}`});
  const m=createBotMemory(3);let k=botKnowledge(t.state,t.id.kai!,undefined,m);
  expect(trustedIntel(viewFor(t.state,t.id.kai!),k,m).size).toBe(0);
  t.state.revealed[t.id.soen!]='soen';k=botKnowledge(t.state,t.id.kai!,undefined,m);
  expect(trustedIntel(viewFor(t.state,t.id.kai!),k,m).size).toBe(0);
  t.act('krate',{type:'chat',channel:'whisper',to:t.id.kai,text:`확인 정보: [${t.p('arin').seat}] ${name}`});
  t.state.revealed[t.id.krate!]='krate';t.state.revealed[t.id.arin!]='arin';k=botKnowledge(t.state,t.id.kai!,undefined,m);
  expect(k.known.get(t.id.arin!)).toBe('arin');expect(trustedIntel(viewFor(t.state,t.id.kai!),k,m).size).toBe(0);
 });
 it('전투 행동과 보고를 같은 판단에서 수행하고 비활동 판단은 대화하지 않는다',()=>{
  const t=civilTable();fill(t,'kelhu');t.publish('kelhu','kelhu');
  t.state.revealed[t.id.freya!]='freya';t.state.revealed[t.id.reindila!]='reindila';
  t.skill('kelhu','ally','freya');t.p('kelhu').skills.find(s=>s.key==='ally')!.cooldownUntil=0;
  const m=createBotMemory(2),action=smartBotAction(t.state,t.id.kelhu!,m,{activity:1});
  expect(action).toEqual({type:'skill',skill:'ally',target:t.id.reindila});expect(t.act('kelhu',action!).ok).toBe(true);
  const chat=botCommunicationAction(t.state,t.id.kelhu!,m);expect(chat).toMatchObject({type:'chat',channel:'whisper'});expect(chat&&chat.type==='chat'&&[t.id.freya,t.id.reindila].includes(chat.to)).toBe(true);
  expect(t.act('kelhu',chat!).ok).toBe(true);expect(botCommunicationAction(t.state,t.id.kelhu!,m)).toBeNull();
  smartBotAction(t.state,t.id.kelhu!,m,{activity:0});expect(botCommunicationAction(t.state,t.id.kelhu!,m)).toBeNull();
 });
 it('변장 후보가 남는 대상에게는 공표 확률만으로 동맹을 걸지 않는다',()=>{
  const t=civilTable();t.publish('soen','arin');t.skill('kai','ally_check','soen');
  t.p('kai').skills=t.p('kai').skills.filter(s=>s.key==='ally');
  for(let seed=1;seed<=100;seed++)expect(smartBotAction(t.state,t.id.kai!,createBotMemory(seed),{activity:1})).toBeNull();
 });
 it('다른 봇의 비공개 기억이나 실제 숨은 배정을 바꿔도 자기 행동은 같다',()=>{
  const t=civilTable(),s=structuredClone(t.state);const a=t.id.arin!,b=t.id.kaspa!;
  const x=s.players.find(p=>p.id===a)!,y=s.players.find(p=>p.id===b)!;[x.character,y.character]=[y.character,x.character];
  for(const options of [{activity:1},{activity:1,teamworkBudget:true,verifyIncomingAllies:true,claimGemGoal:3 as const},
    {activity:1,teamworkBudget:true,verifyIncomingAllies:'useful-report' as const,claimGemGoal:3 as const},
    {activity:1,claimGemGoal:3 as const,claimCommanderGrowth:'all' as const}])
   expect(smartBotAction(t.state,t.id.dantes!,createBotMemory(5),options)).toEqual(smartBotAction(s,t.id.dantes!,createBotMemory(5),options));
 });
});

describe('상황별 공표',()=>{
 it('기본 지휘관은 진명이 강제되지 않는다',()=>{const t=civilTable();t.p('dantes').skills=t.p('dantes').skills.filter(s=>s.key==='publish');expect(smartBotAction(t.state,t.id.dantes!,createBotMemory(1),{activity:1})).not.toEqual({type:'skill',skill:'publish',name:'dantes'});});
 it('진명 필수 스킬, 공개 정체, 보석 성장과 턴 직전은 자원을 유지한다',()=>{
  const t=modeTable('primordial',PRIMORDIAL_ORDER),m=createBotMemory(1),v=viewFor(t.state,t.id.rael!),k=botKnowledge(t.state,t.id.rael!,v,m);
  expect(strategicClaimName(v,k,m)).toBe('rael');
  const c=civilTable();c.p('mertz').skills=c.p('mertz').skills.filter(s=>['publish','attack'].includes(s.key));
  const mm=createBotMemory(2);let cv=viewFor(c.state,c.id.mertz!),ck=botKnowledge(c.state,c.id.mertz!,cv,mm);
  expect(strategicClaimName(cv,ck,mm)).toBe('mertz');
  c.p('mertz').gem=2;fill(c,'mertz');c.state.revealed[c.id.arin!]='arin';ck=botKnowledge(c.state,c.id.mertz!,undefined,mm);cv=viewFor(c.state,c.id.mertz!);expect(strategicClaimName(cv,ck,mm)).not.toBe('mertz');
  expect(strategicClaimName({...cv,nextTurnInMs:40_000,me:{...cv.me,mana:20}},ck,mm)).toBe('mertz');
  c.state.revealed[c.id.mertz!]='mertz';expect(strategicClaimName(viewFor(c.state,c.id.mertz!),ck,mm)).toBe('mertz');
 });
 it('변장 인물은 상대 진영 일반 인물의 이름을 유지한다',()=>{
  const t=modeTable('troll',TROLL_ORDER),v=viewFor(t.state,t.id.neonis!),m=createBotMemory(2),k=botKnowledge(t.state,t.id.neonis!,v,m);
  const name=strategicClaimName(v,k,m);expect(name).not.toBe('neonis');expect(v.roster.find(r=>r.key===name)?.side).not.toBe(v.me.side);
 });
});
