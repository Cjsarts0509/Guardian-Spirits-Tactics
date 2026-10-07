import { build } from 'esbuild';
import { fork, type ChildProcess } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir, cpus } from 'node:os';
import { resolve } from 'node:path';
import { performance, monitorEventLoopDelay } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { createGameServer } from '../src/server.js';
import { loadConfig } from '../src/config.js';
import type { ModeId } from '@gst/rules';
const duration=Number(process.argv[2]??15000);
if(!Number.isSafeInteger(duration)||duration<1000||duration>120000)throw Error('조건별 1000–120000ms');
const root=resolve(import.meta.dirname,'../../..'),folder=await mkdtemp(`${tmpdir()}/gst-host-load.`);
await build({entryPoints:[`${root}/apps/client/src/host.worker.ts`],bundle:true,platform:'browser',format:'esm',outfile:`${folder}/worker.mjs`,alias:{'@gst/rules':`${root}/packages/rules/src/index.ts`}});
await build({entryPoints:[`${root}/apps/server/scripts/host-load-client.ts`],bundle:true,platform:'node',format:'esm',outfile:`${folder}/client.mjs`,
  external:['bufferutil','utf-8-validate'],banner:{js:"import { createRequire } from 'node:module';const require=createRequire(import.meta.url);"}});
const modes: ModeId[]=['civil_war','primordial','lidellut','troll'];
const scenarios=[{name:'one-room-default',modes:modes.slice(0,1),activity:.012},{name:'four-rooms-default',modes,activity:.012},{name:'four-rooms-high-activity',modes,activity:1}];
const stats=(values:number[])=>{const v=[...values].sort((a,b)=>a-b);return{samples:v.length,median:v[Math.floor(v.length*.5)]??null,p95:v[Math.floor(v.length*.95)]??null,max:v.at(-1)??null};};
type Meter={roomId:string;sentBytes:number;receivedBytes:number;frames:number;errors:number};
const results=[];
for(const scenario of scenarios)for(const hosting of ['server','player'] as const){
  const server=createGameServer({...loadConfig({}),host:'127.0.0.1',port:0,timeScale:60,botActivity:scenario.activity},()=>{});
  let measuring=false,healthErrors=0;
  const children:ChildProcess[]=[],meters=new Map<ChildProcess,Meter>(),initial=new Map<ChildProcess,Meter>();
  const tick:number[]=[],commit:number[]=[],checkpoints:number[]=[],alive:number[]=[],health:number[]=[];
  const originalCreate=server.rooms.create.bind(server.rooms);
  server.rooms.create=(...args)=>{
    const room=originalCreate(...args),original=room.commitHost.bind(room);
    room.commitHost=(...args)=>{const begin=performance.now();const r=original(...args);if(measuring){commit.push(performance.now()-begin);checkpoints.push(Buffer.byteLength(args[3]));}return r;};return room;
  };
  const originalTick=server.rooms.tick.bind(server.rooms);
  server.rooms.tick=now=>{const begin=performance.now();originalTick(now);if(measuring){tick.push(performance.now()-begin);alive.push([...server.rooms.rooms.values()].reduce((n,r)=>n+(r.status==='playing'?r.state!.players.filter(p=>p.alive).length:0),0));}};
  const loop=monitorEventLoopDelay({resolution:10});let probe:ReturnType<typeof setInterval>|undefined,probeBusy=false;
  try{
    const port=await server.listen();
    for(const mode of scenario.modes){
      const child=fork(`${folder}/client.mjs`,[String(port),mode,hosting,pathToFileURL(`${folder}/worker.mjs`).href],{execArgv:[],stdio:['ignore','ignore','pipe','ipc']});
      children.push(child);child.on('message',m=>meters.set(child,m as Meter));child.stderr?.on('data',b=>process.stderr.write(b));
    }
    const deadline=Date.now()+15000;
    while(Date.now()<deadline&&!(meters.size===children.length&&[...meters.values()].every(m=>m.roomId&&(hosting==='server'||m.frames>0))))await new Promise(r=>setTimeout(r,30));
    if(meters.size!==children.length||[...meters.values()].some(m=>!m.roomId||(hosting==='player'&&!m.frames)))throw Error('호스트 시작 실패');
    for(const [child,m]of meters)initial.set(child,{...m});
    probe=setInterval(async()=>{if(probeBusy)return;probeBusy=true;const begin=performance.now();try{const r=await fetch(`http://127.0.0.1:${port}/health`);if(!r.ok)healthErrors++;health.push(performance.now()-begin);}catch{healthErrors++;}finally{probeBusy=false;}},250);
    loop.enable();const cpu=process.cpuUsage(),begin=performance.now();measuring=true;
    await new Promise(r=>setTimeout(r,duration));
    measuring=false;const measuredMs=performance.now()-begin,usage=process.cpuUsage(cpu);loop.disable();clearInterval(probe);
    if(!tick.length||!health.length||hosting==='player'&&!commit.length)throw Error('활성 표본 없음');
    const errors=[...meters.values()].reduce((n,m)=>n+m.errors,0);
    if(errors||healthErrors)throw Error(`오류 발생 ${errors}/${healthErrors}`);
    results.push({name:scenario.name,hosting,requestedMs:duration,measuredMs,rooms:scenario.modes.length,activity:scenario.activity,timeScale:60,
      mainProcessCpuMs:(usage.user+usage.system)/1000,mainProcessCpuOneCorePercent:(usage.user+usage.system)/(measuredMs*10),
      managerTickMs:stats(tick),hostCommitMs:stats(commit),checkpointBytes:stats(checkpoints),activeBots:stats(alive),healthRttMs:stats(health),
      eventLoopMs:{p95:loop.percentile(95)/1e6,max:loop.max/1e6},healthErrors,hostErrors:errors,
      traffic:[...meters.entries()].map(([child,m])=>({sentBytes:m.sentBytes-initial.get(child)!.sentBytes,receivedBytes:m.receivedBytes-initial.get(child)!.receivedBytes,frames:m.frames-initial.get(child)!.frames})),
      completedRooms:[...server.rooms.rooms.values()].filter(r=>r.status==='ended').length});
    process.stderr.write(`[host-load] ${scenario.name}/${hosting} 완료\n`);
  }finally{
    await Promise.all(children.map(child=>new Promise<void>(done=>{
      if(child.exitCode!==null||child.signalCode!==null){done();return;}
      const timeout=setTimeout(()=>child.kill('SIGKILL'),3000);
      child.once('exit',()=>{clearTimeout(timeout);done();});
      if(child.connected)child.send('stop');else child.kill();
    })));
    await server.close();
  }
}
const paths=['apps/server/src/rooms.ts','apps/server/src/server.ts','apps/server/src/host-state.ts','packages/rules/src/host-runtime.ts','apps/client/src/host.worker.ts','apps/server/scripts/host-load-audit.ts','apps/server/scripts/host-load-client.ts'];
console.log(JSON.stringify({format:1,runtime:{node:process.version,arch:process.arch,cpu:cpus()[0]?.model},
  scope:'로컬 순차 server/player 각3조건. 매 조건 새 무작위 판, 각1회로 행동·부하가 같지 않음. AI 호스트는 별도 자식 프로세스여서 main CPU에 제외되지만 같은 머신의 CPU 경합은 포함. 실제 브라우저/VM/원격 네트워크/수용량 보장 아님. 준비는 측정 밖. 통신 계수는 250ms 간격 IPC 보고로 측정 경계가 약250ms 어긋날 수 있음.',
  results,hashes:Object.fromEntries(await Promise.all(paths.map(async p=>[p,createHash('sha256').update(await readFile(`${root}/${p}`)).digest('hex')])))},null,2));
