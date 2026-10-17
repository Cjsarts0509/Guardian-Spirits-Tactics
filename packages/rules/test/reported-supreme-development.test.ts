import {describe,it,expect} from 'vitest';
import {createBotMemory,eventsFor,viewFor} from '../src/index.js';
import {supremeReportOpportunity} from '../scripts/reported-supreme-opportunities.js';
import {playCommitmentMatch} from '../scripts/cooperative-commitment-match.js';
import {modeTable,fill,TROLL_ORDER} from './helpers.js';

describe('기존 최상급 보고 옵션의 완전 경로 관측',()=>{
 it('필수 수호자 생존은 자기 공개 사망 정보로만 차단하고 보고를 사실로 올리지 않는다',()=>{
  const t=modeTable('troll',TROLL_ORDER);t.tick(240000);fill(t,'deka');t.state.revealed[t.id.kanulla!]='kanulla';
  expect(t.act('kanulla',{type:'chat',channel:'whisper',to:t.id.deka,text:`확인 정보: [${t.p('chis').seat}] ${viewFor(t.state,t.id.deka!).roster.find(r=>r.key==='chis')!.name}`}).ok).toBe(true);
  const m=createBotMemory(7),before=structuredClone(m),v=viewFor(t.state,t.id.deka!),events=eventsFor(t.state,t.id.deka!);
  const a=supremeReportOpportunity(v,events,m);expect(a.targets[0]).toMatchObject({reason:'mandatory_guard_alive',guardsAlive:['satoshi','zwinra'],known:false});expect(a.suggestion).toBeNull();expect(m).toEqual(before);
  for(const p of v.players)if(p.id===t.id.satoshi||p.id===t.id.zwinra){p.alive=false;p.revealed=p.id===t.id.satoshi?'satoshi':'zwinra';}
  const b=supremeReportOpportunity(v,events,m);expect(b.targets[0]).toMatchObject({reason:'eligible',guardsAlive:[],known:false});expect(b.suggestion?.type).toBe('skill');expect(m).toEqual(before);
 });
 it.each(['civil_war','primordial','lidellut','troll'] as const)('%s 실제 전체 경기 관측 ON/OFF가 동일하다',mode=>{
  const f={mode,seed:27,count:12,reversed:false,currentSide:2 as const};
  const on=playCommitmentMatch(f,'truthful','reportedSupreme'),off=playCommitmentMatch(f,'truthful','reportedSupreme',undefined,false);
  expect(on.game).toEqual(off.game);expect(off.supremeDecisions).toEqual([]);expect(on.supremeActiveDecisions).toBe(on.supremeDecisions!.length);
  expect(on.supremeDecisions!.every(d=>d.knowledgeUnchanged&&(!d.changed||d.selected)&&d.selected===!!d.receipt)).toBe(true);
  if(mode==='primordial'){const changed=on.supremeDecisions!.filter(d=>d.changed);expect(changed).toHaveLength(1);expect(changed[0]!.receipt?.accepted).toBe(true);}
 });
});
