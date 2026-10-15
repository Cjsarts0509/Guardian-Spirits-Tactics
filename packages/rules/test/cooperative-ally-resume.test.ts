import {it,expect} from 'vitest';
import {mkdtempSync,readFileSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

it('resumes real paired journals without rewriting partial snapshots for cached pairs',()=>{
  const dir=mkdtempSync(join(tmpdir(),'gst-ally-resume-'));
  try {
    const out=join(dir,'pairs.json'),journal=join(dir,'pairs.journal.ndjson'),writes=join(dir,'writes.ndjson'),hook=join(dir,'hook.mjs');
    writeFileSync(hook,`import fs from 'node:fs';import {syncBuiltinESMExports} from 'node:module';
const original=fs.writeFileSync;fs.writeFileSync=function(path,data,...args){if(String(path)===process.env.GST_TEST_OUTPUT)fs.appendFileSync(process.env.GST_TEST_WRITES,JSON.stringify({complete:JSON.parse(String(data)).complete})+'\\n');return original.call(this,path,data,...args);};syncBuiltinESMExports();`);
    const run=(batch:number)=>{
      const r=spawnSync(process.execPath,['--import','tsx','--import',hook,'scripts/cooperative-ally-pairs.ts','1','23',out,String(batch)],{
        cwd:new URL('../',import.meta.url),encoding:'utf8',timeout:90000,
        env:{...process.env,GST_TEST_OUTPUT:out,GST_TEST_WRITES:writes},
      });
      expect(r.error,r.stderr).toBeUndefined();expect(r.status,r.stderr).toBe(0);return r.stderr;
    };
    run(8);const prefix=readFileSync(journal,'utf8');
    expect(JSON.parse(readFileSync(out,'utf8')).executions).toBe(8);
    rmSync(writes);run(8);
    expect(readFileSync(journal,'utf8').startsWith(prefix)).toBe(true);
    expect(readFileSync(writes,'utf8').trim().split('\n')).toHaveLength(2);
    run(0);const completed=readFileSync(journal,'utf8');
    expect(JSON.parse(readFileSync(out,'utf8')).complete).toBe(true);
    expect(JSON.parse(readFileSync(out,'utf8')).executions).toBe(96);
    rmSync(writes);expect(run(8)).toContain(' 신규0');
    expect(readFileSync(journal,'utf8')).toBe(completed);
    expect(readFileSync(writes,'utf8').trim().split('\n').map(x=>JSON.parse(x))).toEqual([{complete:true}]);
    expect(existsSync(out)).toBe(true);
  } finally {rmSync(dir,{recursive:true,force:true});}
},120000);
