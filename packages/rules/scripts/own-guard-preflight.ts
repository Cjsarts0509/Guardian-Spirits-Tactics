import {writeFileSync} from 'node:fs';
import {playReportSelfplay} from './report-selfplay.js';
import {verifiedGuardWitness} from './own-guard-witness.js';
import {DEFAULT_SETTINGS} from './league-runner.js';
const prefix=process.argv[2];if(!prefix)throw Error('temporary prefix');
const records=(['cooperative','reportedSupreme'] as const).map(variant=>playReportSelfplay({mode:'primordial',seed:27,count:12,reversed:false,currentSide:1},variant));
writeFileSync(prefix+'-original.json',JSON.stringify({records}));writeFileSync(prefix+'-witness.json',JSON.stringify({records:records.map(r=>verifiedGuardWitness(r,DEFAULT_SETTINGS))}));console.log('synthetic unique games2; original collector2+witness2 passes; research0');
