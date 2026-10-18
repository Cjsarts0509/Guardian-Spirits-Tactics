import {describe,it,expect} from 'vitest';
import {playSenderDevelopment,SENDER_OPTIONS,senderPublicRules} from '../scripts/sender-development.js';
import {playCommitmentMatch} from '../scripts/cooperative-commitment-match.js';
import {DEFAULT_SETTINGS} from '../scripts/league-runner.js';
const short={...DEFAULT_SETTINGS,limitMs:180000};
describe('새 발신자 개발 수집기 비개입/실제 엔진',()=>{
 it('4모드 후보 관측ON/OFF 전체경기/명령/자원이 일치한다',()=>{
  for(const mode of ['civil_war','primordial','lidellut','troll'] as const){
   const f={mode,seed:900055,count:12,reversed:false,currentSide:1 as const};
   const on=playSenderDevelopment(f,'truthful','candidate',short),off=playSenderDevelopment(f,'truthful','candidate',short,false);
   expect(on.game).toEqual(off.game);expect(on.actions).toEqual(off.actions);expect(on.resources).toEqual(off.resources);expect(on.counters.wrongKnownEntries).toBe(0);
   for(const d of on.decisions){expect(d.memoryUnchanged).toBe(true);if(d.changed)expect(d.selected).toBe(true);}
  }
 },60000);
 it('기존 기준/control의 전체경기·실제명령도 원수집기와 같다',()=>{
  for(const variant of ['baseline','control'] as const){
   const f={mode:'primordial' as const,seed:900056,count:12,reversed:true,currentSide:2 as const};
   const r=playSenderDevelopment(f,'skill-aware-bluff',variant,short),old=playCommitmentMatch(f,'skill-aware-bluff',variant,short);
   expect(r.game).toEqual(old.game);
   expect(r.actions.filter(a=>a.side===f.currentSide).map(a=>({player:a.player,at:a.at,action:a.action,accepted:a.accepted,beforeMana:a.beforeMana,afterMana:a.afterMana}))).toEqual(old.actions.map(a=>({player:a.player,at:a.at,action:a.action,accepted:a.accepted,beforeMana:a.beforeMana,afterMana:a.afterMana})));
  }
 },30000);
 it('고정 단일옵션과 공개 규칙만 기록한다',()=>{expect(SENDER_OPTIONS).toEqual({verifyIncomingAllies:'commander-report-first'});const r=senderPublicRules();expect(Object.keys(r)).toHaveLength(4);for(const x of Object.values(r))expect(Object.keys(x).sort()).toEqual(['disguises','guards','hiddenFromChecks']);});
});
