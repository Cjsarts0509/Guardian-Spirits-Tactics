import {describe,it,expect} from 'vitest';
import {botKnowledge,createBotMemory,smartBotAction,viewFor} from '../src/index.js';
import {reportedFirstWarningAttack,trustedIntel,shareIntel} from '../src/bot-intel.js';
import {modeTable,fill,TROLL_ORDER} from './helpers.js';
import {playCommitmentMatch} from '../scripts/cooperative-commitment-match.js';
import {DEFAULT_SETTINGS} from '../scripts/league-runner.js';

function scenario(sender='kanulla',name='hachi',recipient='kazrow') {
  const t=modeTable('troll',TROLL_ORDER);t.tick(4*60_000);fill(t,'kazrow');
  t.state.revealed[t.id[sender]!]=sender;
  expect(t.act(sender,{type:'chat',channel:'whisper',to:t.id[recipient],text:`확인 정보: [${t.p('hachi').seat}] ${viewFor(t.state,t.id.kazrow!).roster.find(r=>r.key===name)!.name}`}).ok).toBe(true);
  t.p('kazrow').skills=t.p('kazrow').skills.filter(s=>s.key==='advanced_attack');
  const m=createBotMemory(7),v=viewFor(t.state,t.id.kazrow!),k=botKnowledge(t.state,t.id.kazrow!,v,m);
  const skills=new Map(v.me.skills.filter(s=>s.blocked===null&&!s.passive).map(s=>[s.key,s]));
  return {t,m,v,k,skills,choose:()=>reportedFirstWarningAttack(v,k,m,skills,c=>v.roster.find(r=>r.key===c)?.side!==v.me.side)};
}

describe('검증된 아군 보고의 첫 경고 이전 상급 공격 실험',()=>{
 it('관측용 자기 기억 복제가 실제 경기 결과/통계를 바꾸지 않는다',()=>{
  const f={mode:'troll' as const,seed:25,count:8,reversed:false,currentSide:2 as const};
  const on=playCommitmentMatch(f,'truthful','reportedFirstWarning'),off=playCommitmentMatch(f,'truthful','reportedFirstWarning',DEFAULT_SETTINGS,false);
  expect(on.game).toEqual(off.game);
  for(const r of on.reportedAttacks){expect(r.level).toBe(1);expect(r.knownName).toBeNull();expect(r.senders.every(s=>s.side===r.ownSide&&s.alive)).toBe(true);}
 });
 it('실제 비공개 보고를 사용하되 facts와 재전파는 변경하지 않는다',()=>{
  const s=scenario(),a=s.choose();expect(a).toEqual({type:'skill',skill:'advanced_attack',target:s.t.id.hachi,name:'hachi'});
  expect(s.k.known.has(s.t.id.hachi!)).toBe(false);expect(shareIntel(s.v,s.k,s.m)).not.toMatchObject({type:'chat',text:`확인 정보: [${s.t.p('hachi').seat}] ${s.v.roster.find(r=>r.key==='hachi')!.name}`});
  expect(smartBotAction(s.t.state,s.t.id.kazrow!,s.m,{activity:1,reportedFirstWarning:true})).toEqual(a);
  expect(smartBotAction(s.t.state,s.t.id.kazrow!,createBotMemory(7),{activity:1})).toBeNull();
 });
 it('확인된 아군도 거짓 보고할 수 있다: 오답 실패는 생존하며 같은 이름 재시도는 막는다',()=>{
  const s=scenario('kanulla','tokra'),a=s.choose();expect(a).not.toBeNull();
  expect(s.t.act('kazrow',a!).ok).toBe(true);expect(s.t.p('kazrow').alive).toBe(true);expect(s.t.p('kazrow').skills.find(x=>x.key==='advanced_attack')!.level).toBe(2);
  s.t.p('kazrow').skills.find(x=>x.key==='advanced_attack')!.cooldownUntil=0;fill(s.t,'kazrow');
  const v=viewFor(s.t.state,s.t.id.kazrow!),k=botKnowledge(s.t.state,s.t.id.kazrow!,v,s.m);
  expect(k.known.has(s.t.id.hachi!)).toBe(false);expect(k.candidates.get(s.t.id.hachi!)).toContain('tokra');
  expect(reportedFirstWarningAttack(v,k,s.m,new Map(v.me.skills.map(x=>[x.key,x])),()=>true)).toBeNull();
 });
 it('미확인·적 발신자와 아군끼리 상충한 보고는 사용하지 않는다',()=>{
  const s=scenario('satoshi');expect(s.choose()).toBeNull();
  const u=scenario();delete u.t.state.revealed[u.t.id.kanulla!];const m=createBotMemory(8),v=viewFor(u.t.state,u.t.id.kazrow!),k=botKnowledge(u.t.state,u.t.id.kazrow!,v,m);
  expect(reportedFirstWarningAttack(v,k,m,u.skills,()=>true)).toBeNull();
  const c=scenario();c.t.state.revealed[c.t.id.neonis!]='neonis';
  expect(c.t.act('neonis',{type:'chat',channel:'whisper',to:c.t.id.kazrow,text:`확인 정보: [${c.t.p('hachi').seat}] ${c.v.roster.find(r=>r.key==='tokra')!.name}`}).ok).toBe(true);
  const ck=botKnowledge(c.t.state,c.t.id.kazrow!,undefined,c.m);expect(trustedIntel(viewFor(c.t.state,c.t.id.kazrow!),ck,c.m).size).toBe(0);
 });
 it('직접 증거와 충돌하거나 아군 이름이면 공격하지 않는다',()=>{
  const s=scenario();s.k.candidates.set(s.t.id.hachi!,['tokra']);expect(s.choose()).toBeNull();
  expect(scenario('kanulla','neonis').choose()).toBeNull();
 });
 it('일반·최상급·경고 이후 상급 공격, 마나 부족, 초기 4분, 무적, 공개 보호에는 적용하지 않는다',()=>{
  const s=scenario();expect(reportedFirstWarningAttack(s.v,s.k,s.m,new Map(),()=>true)).toBeNull();
  const warned=new Map(s.skills);warned.set('advanced_attack',{...warned.get('advanced_attack')!,level:2});expect(reportedFirstWarningAttack(s.v,s.k,s.m,warned,()=>true)).toBeNull();
  expect(reportedFirstWarningAttack({...s.v,me:{...s.v.me,mana:99}},s.k,s.m,s.skills,()=>true)).toBeNull();
  expect(reportedFirstWarningAttack({...s.v,elapsedMs:239999},s.k,s.m,s.skills,()=>true)).toBeNull();
  expect(reportedFirstWarningAttack(s.v,s.k,s.m,s.skills,()=>false)).toBeNull();
  const inv={...s.v,players:s.v.players.map(p=>p.id===s.t.id.hachi?{...p,statuses:[{kind:'invulnerable',source:'test',remainingMs:1000}]}:p)};
  expect(reportedFirstWarningAttack(inv,s.k,s.m,s.skills,()=>true)).toBeNull();
 });
 it('다른 수신자에게만 도착한 실제 비공개 대화는 자기 보고로 읽지 않는다',()=>{const s=scenario('kanulla','hachi','seirow');expect(s.choose()).toBeNull();expect(trustedIntel(s.v,s.k,s.m).size).toBe(0);});
 it('다른 숨은 배정 변경은 자기 판단에 영향을 주지 않는다',()=>{
  const s=scenario(),other=structuredClone(s.t.state),x=other.players.find(p=>p.id===s.t.id.hachi)!,y=other.players.find(p=>p.id===s.t.id.tokra)!;
  [x.character,y.character]=[y.character,x.character];
  expect(smartBotAction(other,s.t.id.kazrow!,createBotMemory(7),{activity:1,reportedFirstWarning:true})).toEqual(smartBotAction(s.t.state,s.t.id.kazrow!,createBotMemory(7),{activity:1,reportedFirstWarning:true}));
 });
});
