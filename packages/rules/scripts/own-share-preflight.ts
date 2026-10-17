/** Tiny synthetic corpus to exercise independent verification, never research count. */
import {writeFileSync} from 'node:fs';
import {playReportSelfplay} from './report-selfplay.js';
import {verifiedShareWitness} from './own-share-witness.js';
import {DEFAULT_SETTINGS} from './league-runner.js';
const [prefix]=process.argv.slice(2);if(!prefix)throw Error('output prefix');
const f={mode:'primordial' as const,seed:27,count:12,reversed:false,currentSide:1 as const};
const originals=(['cooperative','reportedSupreme'] as const).map(v=>playReportSelfplay(f,v));
const records=originals.map(o=>verifiedShareWitness(o,DEFAULT_SETTINGS));
writeFileSync(prefix+'-originals.json',JSON.stringify({records:originals}));writeFileSync(prefix+'-witness.json',JSON.stringify({records}));
console.log(JSON.stringify({syntheticUniqueGames:2,records:records.length,matchedActions:records.reduce((n,r)=>n+r.matchedActions,0)}));
