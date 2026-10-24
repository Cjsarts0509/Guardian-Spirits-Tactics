import {describe,it,expect} from 'vitest';
import {playFailureDevelopment} from '../scripts/failure-development.js';
import {playFailureSelfplay} from '../scripts/failure-selfplay.js';
import {failureReportOrdinals,replayFailureReportReception} from '../scripts/failure-report-reception.js';
import type {GameEvent} from '../src/types.js';

describe('read-only failure report reception replay',()=>{
 it('replays the prior real-engine positive path exactly and keeps an unconfirmed sender report out of facts',()=>{
  const original=playFailureDevelopment({mode:'troll',seed:152000,count:8,reversed:true,currentSide:2},'truthful','candidate');
  const selected=failureReportOrdinals(original);expect(selected).toEqual([42]);
  const result=replayFailureReportReception(original,selected),report=result.reports[0]!;
  expect(result.matchedActions).toBe(48);expect(result.memoryTraceSHA256).toBe(original.memoryTraceSHA256);
  const first=report.firstConsumed as any;
  expect(first.at).toBe(246250);expect(first.after.storedReport.character).toBe('chis');
  expect(first.after.storedKnownTarget).toBeNull();expect(first.after.workingKnownTarget).toBeNull();
  expect(first.after.workingKnownSender).toBeNull();expect(first.after.trustedName).toBeNull();
  expect(report.actions).toEqual([{ordinal:47,at:258750,action:{type:'skill',skill:'reckless_charge',target:'p6'},accepted:true,
   receiptKinds:['skill.reckless_charge','death.self','death','game.end'],relation:'reported-target',knownAtChoice:'chis'}]);
  for(const t of report.transitions){expect(t.view.phase).toBe('running');expect(t.view.me.alive).toBe(true);
   expect(t.events.every((e:GameEvent)=>e.vis.to==='all'||e.vis.to==='players'&&e.vis.ids.includes(report.recipient))).toBe(true);}
  // Control clone differences are not actual learned identities or report provenance.
  expect(failureReportOrdinals({...original,variant:'control'})).toEqual([]);
  expect(()=>replayFailureReportReception(original,[0])).toThrow('selected command');
  expect(()=>replayFailureReportReception(original,[42,42])).toThrow('ordered unique');
 },90000);
 it('preserves the identical-policy path including both factions and every actual memory/RNG update',()=>{
  const row=playFailureSelfplay({mode:'troll',seed:900366,count:11,reversed:false,currentSide:1},'candidate');
  const ordinals=row.actions.flatMap((a,i)=>a.accepted&&a.reportTarget&&a.action.type==='chat'&&a.action.channel==='whisper'?[i]:[]);
  expect(ordinals.length).toBeGreaterThan(0);
  const result=replayFailureReportReception({...row,style:'truthful'},ordinals,undefined,true);
  expect(result.reports.length).toBe(ordinals.length);expect(result.wholeGameMatched).toBe(true);
  expect(result.memoryTraceSHA256).toBe(row.memoryTraceSHA256);
 },120000);
});
