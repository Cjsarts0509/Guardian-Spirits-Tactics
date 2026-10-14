import {describe,it,expect} from 'vitest';
import {botKnowledge,createBotMemory,smartBotAction,viewFor} from '../src/index.js';
import {strategicClaimName} from '../src/bot-claim-policy.js';
import {modeTable,fill,LIDELLUT_ORDER,TROLL_ORDER} from './helpers.js';

describe('지휘관 성장 기간의 진명/위장 개발 후보',()=>{
 it('샤이닝은 실제 공표와 턴으로 보석을 완성한 뒤 다시 위장한다',()=>{
  const t=modeTable('lidellut',LIDELLUT_ORDER);t.p('shining').skills=t.p('shining').skills.filter(s=>s.key==='publish');t.p('shining').gem=2;fill(t,'shining');
  const m=createBotMemory(2),options={activity:1,claimGemGoal:3 as const,claimCommanderGrowth:'shining' as const};
  const initial=smartBotAction(t.state,t.id.shining!,m,options);expect(initial).toEqual({type:'skill',skill:'publish',name:'shining'});expect(t.act('shining',initial!).ok).toBe(true);
  t.tick(t.state.nextTurnAt-t.now);expect(t.p('shining').gem).toBe(3);
  const hidden=smartBotAction(t.state,t.id.shining!,m,options);expect(hidden).toMatchObject({type:'skill',skill:'publish'});expect(hidden?.type==='skill'&&hidden.name).not.toBe('shining');
  t.state.revealed[t.id.shining!]='shining';const v=viewFor(t.state,t.id.shining!),k=botKnowledge(t.state,t.id.shining!,v,m);expect(strategicClaimName(v,k,m,3,'shining')).toBe('shining');
 });
 it('샤이닝 한정은 카이에 적용되지 않고 전체 성장도 변장 인물을 노출하지 않는다',()=>{
  const t=modeTable('lidellut',LIDELLUT_ORDER);t.p('kai').gem=2;fill(t,'kai');
  const m=createBotMemory(2),v=viewFor(t.state,t.id.kai!),k=botKnowledge(t.state,t.id.kai!,v,m);
  expect(strategicClaimName(v,k,m,3,'shining')).not.toBe('kai');expect(strategicClaimName(v,k,m,3,'all')).toBe('kai');
  const troll=modeTable('troll',TROLL_ORDER),n=createBotMemory(3),nv=viewFor(troll.state,troll.id.neonis!),nk=botKnowledge(troll.state,troll.id.neonis!,nv,n);
  expect(strategicClaimName(nv,nk,n,3,'all')).not.toBe('neonis');
 });
});
