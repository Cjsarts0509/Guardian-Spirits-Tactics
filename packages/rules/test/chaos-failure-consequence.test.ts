import {describe,it,expect} from 'vitest';
import {failureConsequence,successConsequence} from '../scripts/chaos-failure-consequence.js';

describe('exact chaos failure does not retarget purify hex',()=>{
 it.each([false,true])('preserves an absent/existing marker (%s), including actual purify consequences',existing=>{
  const on=failureConsequence(existing),off=failureConsequence(existing,false);
  expect(on.fullStateSHA256).toBe(off.fullStateSHA256);
  expect(on.engineLogSHA256).toBe(off.engineLogSHA256);
  expect(on.failureReceipts).toHaveLength(2);
  expect(on.failedTargetPurify.targetAlive).toBe(true);
  expect(on.priorTargetPurify.targetAlive).toBe(!existing);
  expect(on.points.every(p=>p.unrelatedReaderPrivateChaosEvents===0&&p.observerUnchanged)).toBe(true);
 });
 it('positive control changes the marker on success at due time, not request time',()=>{
  const r=successConsequence();expect(r.first).not.toBe(r.second);
  expect(r.result?.data).toEqual({target:r.second,success:true});
 });
});
