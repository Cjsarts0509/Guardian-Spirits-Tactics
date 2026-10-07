import {describe,it,expect} from 'vitest';
import {assignmentBelief,botKnowledge,createBotMemory,viewFor,smartBotAction,sampleAssignments} from '../src/index.js';
import {civilTable} from './helpers.js';

describe('공표 가중치 학습 실험 경계',()=>{
 it('기본/명시1 행동·난수·기억 동일',()=>{
  const t=civilTable();t.publish('soen','arin');
  const a=createBotMemory(22),b=createBotMemory(22);
  for(let i=0;i<20;i++)expect(smartBotAction(t.state,t.id.kai!,a,{activity:1})).toEqual(smartBotAction(t.state,t.id.kai!,b,{activity:1,claimEvidenceScale:1}));
  expect(a).toEqual(b);
 });
 it('배율0도 확정 제약을 유지하고 캐시가 다른 배율에 섞이지 않음',()=>{
  const t=civilTable();t.publish('soen','arin');
  const view=viewFor(t.state,t.id.kai!),mem=createBotMemory(4),k=botKnowledge(t.state,t.id.kai!,view,mem);
  const first=assignmentBelief(view,k,mem,1),neutral=assignmentBelief(view,k,mem,0);
  expect(neutral.probabilities).not.toEqual(first.probabilities);
  for(const [id,probs] of neutral.probabilities){
   expect([...probs.values()].reduce((a,b)=>a+b,0)).toBeCloseTo(1);
   if(id!==view.me.id)for(const [c,p] of probs)if(!k.candidates.get(id)?.includes(c))expect(p).toBe(0);
  }
  expect(assignmentBelief(view,k,mem,1)).toEqual(first);
  assignmentBelief(view,k,mem,4);
  const fresh=createBotMemory(4);fresh.perception=structuredClone(mem.perception);
  expect(sampleAssignments(view,k,mem,{rng:42},8)).toEqual(sampleAssignments(view,k,fresh,{rng:42},8));
 });
 it('입력 밖 실제 배정 변경은 같은 관찰의 확률을 바꾸지 않음',()=>{
  const t=civilTable();const view=viewFor(t.state,t.id.kai!),m=createBotMemory(5),k=botKnowledge(t.state,t.id.kai!,view,m);
  const before=assignmentBelief(view,k,m,.25);
  const others=t.state.players.filter(p=>p.id!==t.id.kai);
  [others[0]!.character,others[1]!.character]=[others[1]!.character,others[0]!.character];
  expect(assignmentBelief(view,k,createBotMemory(5),.25)).toEqual(before);
 });
 it('유한하지 않은 값·음수·과도한 학습값 거절',()=>{
  const t=civilTable(),view=viewFor(t.state,t.id.kai!),m=createBotMemory(5),k=botKnowledge(t.state,t.id.kai!,view,m);
  for(const scale of [NaN,Infinity,-1,4.1])expect(()=>assignmentBelief(view,k,m,scale)).toThrow();
 });
});
