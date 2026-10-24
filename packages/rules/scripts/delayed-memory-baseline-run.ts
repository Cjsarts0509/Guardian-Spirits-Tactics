import {writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {regression059} from './delayed-memory-regression.js';
writeFileSync(process.argv[2]!,JSON.stringify({sourceRef:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  options:{mode:'all four',seed:41,count:12,limitMs:240000,rememberOwnDelayedCheck:'absent'},
  rows:regression059().map(r=>r.core)},null,2)+'\n');
