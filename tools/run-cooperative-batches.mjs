// A batch supervisor may release only its own already-exited child, never an unknown writer.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
const [count,start,outArg,steps,sourceRef,candidate='enemyBreakRepair']=process.argv.slice(2);
if(!outArg||!/^\d+$/.test(steps)||!/^\d+$/.test(count)||!/^\d+$/.test(start)||!sourceRef)throw Error('Usage: node tools/run-cooperative-batches.mjs <count> <start> <out.json> <steps> <immutable-source-ref> [candidate]');
const out=path.resolve(outArg),root=path.resolve(import.meta.dirname,'..'),lock=out+'.store/WRITER.lock',summary=out.replace(/\.json$/,'.verified.json');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex'),runnerSHA256=hash(fs.readFileSync(import.meta.filename));
for(let i=0;i<Number(steps);i++){
 if(fs.existsSync(lock))throw Error('Existing writer lock: explicit verified expiry/owner recovery required');
 const child=spawnSync(process.execPath,['--import',path.join(root,'packages/rules/node_modules/tsx/dist/loader.mjs'),path.join(root,'packages/rules/scripts/cooperative-claim-commitment.ts'),count,start,out,'96','development',candidate],{cwd:root,encoding:'utf8'});
 process.stderr.write(child.stderr??'');if(child.error||child.status!==0)throw Error('Collector failed; preserving writer lock and raw data');
 const verified=spawnSync('python',['tools/verify-claim-commitment.py',out,'--source-ref',sourceRef,'--journal-path',out.replace(/\.json$/,'.journal.ndjson'),'--allow-partial'],{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024});
 if(verified.error||verified.status!==0){process.stderr.write(verified.stderr??'');throw Error('Independent verification failed; no lock recovery');}
 const result=JSON.parse(verified.stdout);fs.writeFileSync(summary,verified.stdout);
 let releasedOwnExitedChild=false;
 if(fs.existsSync(lock)){
  const raw=fs.readFileSync(lock,'utf8'),owner=JSON.parse(raw);
  if(owner.pid!==child.pid||typeof owner.owner!=='string'||fs.readFileSync(lock,'utf8')!==raw)throw Error('Writer does not belong to this successfully exited child');
  fs.unlinkSync(lock);const d=fs.openSync(path.dirname(lock),'r');try{fs.fsyncSync(d);}finally{fs.closeSync(d);}
  if(fs.existsSync(lock))throw Error('Writer release readback failed');releasedOwnExitedChild=true;
 }
 console.log(JSON.stringify({at:new Date().toISOString(),sourceRef,runnerSHA256,childPID:child.pid,childExit:child.status,executions:result.executions,publicationVerified:result.publicationVerified,complete:result.complete,releasedOwnExitedChild}));
 if(result.complete)break;
}
