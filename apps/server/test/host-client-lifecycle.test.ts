import { expect, it } from 'vitest';
import { build } from 'esbuild';
import { fork, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createGameServer } from '../src/server.js';
import { loadConfig } from '../src/config.js';

it('진단 부모의 IPC가 끊기면 실행 중 호스트/Worker도 정상 종료', async () => {
  const root=resolve(import.meta.dirname,'../../..'),folder=await mkdtemp(`${tmpdir()}/gst-host-lifecycle.`);
  const server=createGameServer({...loadConfig({}),host:'127.0.0.1',port:0},()=>{});
  let child:ChildProcess|undefined;
  try {
    await build({entryPoints:[`${root}/apps/client/src/host.worker.ts`],bundle:true,platform:'browser',format:'esm',outfile:`${folder}/worker.mjs`,alias:{'@gst/rules':`${root}/packages/rules/src/index.ts`}});
    await build({entryPoints:[`${root}/apps/server/scripts/host-load-client.ts`],bundle:true,platform:'node',format:'esm',outfile:`${folder}/client.mjs`,external:['bufferutil','utf-8-validate'],banner:{js:"import { createRequire } from 'node:module';const require=createRequire(import.meta.url);"}});
    const port=await server.listen();
    child=fork(`${folder}/client.mjs`,[String(port),'civil_war','player',pathToFileURL(`${folder}/worker.mjs`).href],{execArgv:[],stdio:['ignore','ignore','ignore','ipc']});
    const host=child;
    await new Promise<void>((done,fail)=>{
      const timer=setTimeout(()=>{cleanup();fail(Error('진단 호스트 시작 시간 초과'));},7000);
      const exited=()=>{cleanup();fail(Error('진단 호스트가 먼저 종료'));};
      const message=(m:any)=>{if(m.frames>0){cleanup();if(m.errors)fail(Error('진단 호스트 오류'));else done();}};
      const cleanup=()=>{clearTimeout(timer);host.off('exit',exited);host.off('message',message);};
      host.once('exit',exited);host.on('message',message);
    });
    const exit=await new Promise<{code:number|null;signal:string|null}>((done,fail)=>{
      const timer=setTimeout(()=>fail(Error('IPC 이탈 후 호스트 종료 시간 초과')),4000);
      host.once('exit',(code,signal)=>{clearTimeout(timer);done({code,signal});});
      host.disconnect();
    });
    expect(exit).toEqual({code:0,signal:null});
  } finally {
    if(child&&child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');
    await server.close();await rm(folder,{recursive:true,force:true});
  }
},15000);
