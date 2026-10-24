import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {verifiedLiveDelayed060} from '../scripts/delayed-memory-live.js';
import {verifiedFailureProbe061} from '../scripts/failure-faction-probe.js';
it('061 first consumed-failure real game: same-moment candidate probes cannot alter original game or own memory',()=>{
  const {record,settings}=JSON.parse(gunzipSync(readFileSync(new URL('../scripts/baselines/round061-first-failure-sample.json.gz',import.meta.url))).toString());
  const prior=verifiedLiveDelayed060(record,settings),r=verifiedFailureProbe061(record,settings,prior);
  expect(r.expectedFailedResults).toBeGreaterThan(0);expect(r.rows.flatMap(x=>x.receipts)).toHaveLength(r.expectedFailedResults);
  expect(r.rows.every(x=>x.actualMemoryRngAndEngineUnchanged)).toBe(true);expect(r.observerOnOffMatched).toBe(true);
},30000);
