import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {verifiedLiveDelayed060,liveDelayed060} from '../scripts/delayed-memory-live.js';
const sample=()=>JSON.parse(gunzipSync(readFileSync(new URL('../scripts/baselines/round060-own-receipt-sample.json.gz',import.meta.url))).toString());
it('060 real policy consumes own receipts/results and observer ON/OFF preserves original complete game/actions/resources',()=>{
  const {record,settings}=sample(),r=verifiedLiveDelayed060(record,settings);
  expect(r.episodes.length).toBeGreaterThan(0);expect(r.episodes.every(e=>e.firstReceiptSeen)).toBe(true);
  expect(r.episodes.some(e=>e.firstResultSeen)).toBe(true);expect(r.primaryCompared).toBeGreaterThan(0);expect(r.chatCompared).toBeGreaterThan(0);
},30000);
it('060 replay refuses changed original command/resource evidence',()=>{
  const {record,settings}=sample();record.actions[0].beforeMana+=1;
  expect(()=>liveDelayed060(record,settings,false)).toThrow();
},30000);
