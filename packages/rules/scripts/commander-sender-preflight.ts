import {writeFileSync} from 'node:fs';
import {playReportSelfplay} from './report-selfplay.js';
import {verifiedCommanderSenderWitness} from './commander-sender-witness.js';
import {DEFAULT_SETTINGS} from './league-runner.js';
const prefix=process.argv[2];if(!prefix)throw Error('temporary prefix');
const f={mode:'primordial' as const,seed:27,count:12,reversed:false,currentSide:1 as const};
const records=(['cooperative','reportedSupreme'] as const).map(variant=>playReportSelfplay(f,variant));
writeFileSync(prefix+'-originals.json',JSON.stringify({records}));writeFileSync(prefix+'-witness.json',JSON.stringify({records:records.map(o=>verifiedCommanderSenderWitness(o,DEFAULT_SETTINGS))}));console.log('synthetic unique games2; original collector2+witness2 passes; research0');
