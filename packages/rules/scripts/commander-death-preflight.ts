/** Small synthetic cross-language verifier fixture; not research data. */
import {writeFileSync} from 'node:fs';
import {playReportSelfplay} from './report-selfplay.js';
import {replayDeathRecord} from './commander-death-replay.js';
import {DEFAULT_SETTINGS} from './league-runner.js';
const out=process.argv[2];if(!out)throw Error('temporary output prefix required');
const records=[27,28].flatMap(seed=>(['cooperative','reportedSupreme'] as const).map(variant=>playReportSelfplay({mode:'primordial',seed,count:12,reversed:false,currentSide:1},variant)));
writeFileSync(out+'-original.json',JSON.stringify({records}));
writeFileSync(out+'-trace.json',JSON.stringify({records:records.map(r=>replayDeathRecord(r,DEFAULT_SETTINGS))}));
console.log(JSON.stringify({syntheticUniqueGames:records.length,policyReplayPasses:records.length,commandReplayPasses:records.length,newResearchExecutions:0}));
