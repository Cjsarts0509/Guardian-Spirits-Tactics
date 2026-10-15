// Emits aggregate evidence only; never copies nicknames, whispers or hidden assignments into reports.
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {auditMatchRecord} from '../src/record-audit.js';
const input=process.argv[2];if(!input)throw Error('Usage: node --import tsx scripts/audit-human-records.ts <record.json[.gz] or directory>');
const files=(p:string):string[]=>statSync(p).isDirectory()?readdirSync(p).flatMap(n=>files(join(p,n))):/\.json(\.gz)?$/.test(p)?[p]:[];
const records=files(resolve(input)).map(path=>{try{const b=readFileSync(path),d=JSON.parse((path.endsWith('.gz')?gunzipSync(b):b).toString());return auditMatchRecord(d);}catch{return {replayVerified:false,humanOpponentWinRateEvidence:false,reason:'invalid_record_file'};}});
console.log(JSON.stringify({format:1,kind:'factual-match-audit',records,verified:records.filter(x=>x.replayVerified).length,actualHumanWinRate:null,
 limitation:'Input provenance does not attest real human participation. Factual replay does not validate counterfactual bot win rates. Legacy/lifecycle/version mismatches are excluded.'},null,2));
if(records.some(x=>!x.replayVerified))process.exitCode=1;
