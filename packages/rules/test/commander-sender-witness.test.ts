import {describe,it,expect} from 'vitest';
import {playReportSelfplay} from '../scripts/report-selfplay.js';
import {DEFAULT_SETTINGS} from '../scripts/league-runner.js';
import {verifiedCommanderSenderWitness,commanderSenderWitness} from '../scripts/commander-sender-witness.js';
const fixture={mode:'primordial' as const,seed:27,count:12,reversed:false,currentSide:1 as const};
describe('지휘관 보고 발신자 후보의 비개입 관측',()=>{
 it('원래ON 전체 결과/행동/자원 일치,관측OFF와 전체 기억/RNG 경로 동일',()=>{
  const o=playReportSelfplay(fixture,'reportedSupreme'),on=verifiedCommanderSenderWitness(o,DEFAULT_SETTINGS),off=commanderSenderWitness(o,DEFAULT_SETTINGS,false);
  expect(on.game).toEqual(off.game);expect(on.actionsSHA256).toBe(off.actionsSHA256);expect(on.activeCalls).toBe(on.decisions.length);expect(off.decisions).toEqual([]);
  for(const d of on.decisions){expect(d.memoryUnchanged&&d.engineUnchanged&&d.actualMemoryMatchesBaseline).toBe(true);if(d.changed){expect(d.proposalMatchesAlternative).toBe(true);expect(d.probe?.accepted).toBe(true);expect(d.diagnostic.senders.find(s=>s.id===(d.alternative?.type==='skill'?d.alternative.target:undefined))?.commanderReport).toBe(true);}}
 });
 it('원래OFF 모든 실제 명령/자원·기회도 일치한다',()=>{const o=playReportSelfplay(fixture,'cooperative'),r=verifiedCommanderSenderWitness(o,DEFAULT_SETTINGS);expect(r.wholeGameAndAllActionsMatched).toBe(true);expect(r.matchedActions).toBe(o.result.actions.length);});
});
