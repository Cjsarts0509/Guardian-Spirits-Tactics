import {describe,it,expect} from 'vitest';
import {createBotMemory,smartBotAction,updateBotKnowledge,viewFor,encodeHostSnapshot,decodeHostSnapshot} from '../src/index.js';
import {filterProtectionRetry,observeBotActionResult,PROTECTION_RETRY_MS} from '../src/bot-retry.js';
import type {Action} from '../src/types.js';
import {civilTable,modeTable,LIDELLUT_ORDER} from './helpers.js';
const action:Action={type:'skill',skill:'ally',target:'p2'};
const rejected={ok:false,error:'대상이 보호받고 있어 지정할 수 없습니다.'};
describe('본인 보호 거절 응답 재시도 실험',()=>{
 it('동일 행동만 10초 동안 미루고 다른 스킬·대상·이름을 허용한다',()=>{
  const m=createBotMemory(1);expect(filterProtectionRetry(m,action,0)).toEqual(action);
  observeBotActionResult(m,action,rejected,100);expect(filterProtectionRetry(m,action,10099)).toBeNull();
  for(const other of [{...action,target:'p3'},{...action,skill:'attack'},{...action,name:'kai'}] as Action[])
   expect(filterProtectionRetry(m,other,10099)).toEqual(other);
  expect(filterProtectionRetry(m,action,100+PROTECTION_RETRY_MS)).toEqual(action);
 });
 it('비활성 기억, 다른 오류, 성공은 보호 거절로 학습하지 않는다',()=>{
  const m=createBotMemory(1);observeBotActionResult(m,action,rejected,0);expect(m).toEqual(createBotMemory(1));
  filterProtectionRetry(m,action,0);observeBotActionResult(m,action,{ok:false,error:'마나 부족'},0);
  expect(filterProtectionRetry(m,action,1)).toEqual(action);
  observeBotActionResult(m,action,rejected,1);observeBotActionResult(m,action,{ok:true},2);
  expect(filterProtectionRetry(m,action,3)).toEqual(action);
 });
 it('호스트 스냅샷 이동 후 지연을 보존하고 시간 되감기는 제거한다',()=>{
  const t=civilTable(),m=createBotMemory(2);filterProtectionRetry(m,action,0);observeBotActionResult(m,action,rejected,100);
  const snapshot={version:1 as const,state:t.state,memories:new Map([['p1',m]]),records:[],handled:0,results:[]};
  const restored=decodeHostSnapshot(encodeHostSnapshot(snapshot)).memories.get('p1')!;
  expect(filterProtectionRetry(restored,action,200)).toBeNull();expect(filterProtectionRetry(restored,action,0)).toEqual(action);
 });
 it('관측 주체가 바뀌면 거절 기억을 재사용하지 않는다',()=>{
  const t=civilTable(),m=createBotMemory(2),ids=t.state.players.map(p=>p.id);
  updateBotKnowledge(viewFor(t.state,ids[0]!),[],m);filterProtectionRetry(m,action,0);observeBotActionResult(m,action,rejected,0);
  updateBotKnowledge(viewFor(t.state,ids[1]!),[],m);expect(m.protectionRetries).toBeUndefined();
 });
 it('실제 스마트 정책이 응답을 받은 뒤 같은 제안을 억제한다',()=>{
  const t=modeTable('lidellut',LIDELLUT_ORDER);
  for(const p of t.state.players){p.mana=150;t.publish(p.character,p.character);}
  const self=t.p('shining');self.skills=self.skills.filter(s=>s.key==='ally');self.gem=0;self.mana=150;
  let checked=false;
  for(let seed=1;seed<=128;seed++){
   const m=createBotMemory(seed*8191),rng=m.rng;
   const proposal=smartBotAction(t.state,self.id,m,{activity:1,claimEvidenceScale:4,protectionRetryBackoff:true});
   if(!proposal||proposal.type!=='skill'||!proposal.target)continue;
   observeBotActionResult(m,proposal,rejected,t.state.now-t.state.startedAt);m.rng=rng;
   expect(smartBotAction(t.state,self.id,m,{activity:1,claimEvidenceScale:4,protectionRetryBackoff:true})).toBeNull();
   checked=true;break;
  }
  expect(checked).toBe(true);
 });
 it('옵션 비활성 정책은 기존 행동/RNG/기억을 유지한다',()=>{
  const t=civilTable(),id=t.state.players[0]!.id,a=createBotMemory(7),b=createBotMemory(7);
  filterProtectionRetry(b,action,0);observeBotActionResult(b,action,rejected,0);
  expect(smartBotAction(t.state,id,b,{activity:1})).toEqual(smartBotAction(t.state,id,a,{activity:1}));expect(b).toEqual(a);
 });
});
