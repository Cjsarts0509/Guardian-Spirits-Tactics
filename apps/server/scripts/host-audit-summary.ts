import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const HOST_AUDIT_PATHS = ['apps/server/src/rooms.ts', 'apps/server/src/server.ts', 'apps/server/src/host-state.ts',
  'packages/rules/src/host-runtime.ts', 'packages/rules/src/host-memory.ts', 'apps/client/src/host.worker.ts',
  'apps/server/scripts/host-load-audit.ts', 'apps/server/scripts/host-load-client.ts'];
const names = ['one-room-default', 'four-rooms-default', 'four-rooms-high-activity'];
const median = (values: number[]) => { const v = [...values].sort((a,b)=>a-b), i = Math.floor(v.length/2); return v.length%2 ? v[i]! : (v[i-1]!+v[i]!)/2; };
const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
function requireValue(ok: unknown, message: string): asserts ok { if (!ok) throw Error(message); }
function finite(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value) && value >= 0; }
function count(value: unknown): value is number { return finite(value) && Number.isSafeInteger(value); }
function stat(value: any, active: boolean): void {
  requireValue(value && count(value.samples) && (active ? value.samples > 0 : value.samples === 0), '활성 표본 수 불일치');
  if (!active) { requireValue(value.median === null && value.p95 === null && value.max === null, '빈 통계 불일치'); return; }
  requireValue([value.median,value.p95,value.max].every(finite) && value.median <= value.p95 && value.p95 <= value.max, '통계 값 불일치');
}
export function summarizeHostRuns(options: { directory: string; source: string; commit: string; runs: number; duration: number; runnerSha256: string }) {
  const { directory, source, commit, runs, duration, runnerSha256 } = options;
  requireValue(/^[a-f0-9]{40}$/.test(commit) && Number.isInteger(runs) && runs>=1 && runs<=6
    && Number.isInteger(duration) && duration>=1000 && duration<=120000 && /^[a-f0-9]{64}$/.test(runnerSha256), '집계 옵션 불일치');
  const sourceHashes = Object.fromEntries(HOST_AUDIT_PATHS.map(p=>[p,hash(readFileSync(resolve(source,p)))]));
  const loaded: { run: number; order: string; resultsSha256: string; cases: any[] }[] = [];
  let runtime: any;
  for(let run=1;run<=runs;run++) {
    const bytes=readFileSync(resolve(directory,`runs/${run}/results.json`)), raw=JSON.parse(bytes.toString());
    const order=run%2?'server-first':'player-first', hosts=run%2?['server','player']:['player','server'];
    requireValue(raw.format===1 && raw.sourceCommit===commit && raw.order===order, `실행 출처/순서 불일치: ${run}`);
    requireValue(raw.runtime && typeof raw.runtime.node==='string' && Number(raw.runtime.node.match(/^v(\d+)/)?.[1])>=22
      && typeof raw.runtime.arch==='string' && typeof raw.runtime.cpu==='string', '실행 환경 누락');
    if(runtime===undefined)runtime=raw.runtime;
    requireValue(JSON.stringify(raw.runtime)===JSON.stringify(runtime), '실행 환경 불일치');
    requireValue(raw.hashes && Object.entries(sourceHashes).every(([p,h])=>raw.hashes[p]===h), '소스 해시 불일치');
    requireValue(Array.isArray(raw.results) && raw.results.length===6, '조건 수 불일치');
    const cases=raw.results.map((r:any,index:number)=>{
      const scenario=Math.floor(index/2), player=r.hosting==='player', rooms=scenario===0?1:4;
      requireValue(r.name===names[scenario] && r.hosting===hosts[index%2] && r.rooms===rooms
        && r.activity===(scenario===2?1:.012) && r.timeScale===60 && r.requestedMs===duration
        && finite(r.measuredMs) && r.measuredMs>=duration-5, '조건/기간 불일치');
      requireValue(r.healthErrors===0 && r.hostErrors===0 && r.processErrors===0, '측정 오류 발생');
      requireValue(finite(r.mainProcessCpuMs) && finite(r.mainProcessCpuOneCorePercent)
        && Math.abs(r.mainProcessCpuOneCorePercent-r.mainProcessCpuMs/(r.measuredMs*10)*1000)<1e-6, 'CPU 계산 불일치');
      for(const key of ['managerTickMs','activeBots','healthRttMs','mainRssBytes','clientsRssBytes'])stat(r[key],true);
      stat(r.hostCommitMs,player);stat(r.checkpointBytes,player);
      requireValue(finite(r.eventLoopMs?.p95) && finite(r.eventLoopMs?.max) && r.eventLoopMs.p95<=r.eventLoopMs.max, '루프 측정 누락');
      requireValue(Array.isArray(r.traffic) && r.traffic.length===rooms && r.traffic.every((t:any)=>count(t.sentBytes)
        && count(t.receivedBytes) && count(t.frames)), '통신 계수 불일치');
      requireValue(!player || r.traffic.every((t:any)=>t.frames>0), '호스트 확정 표본 없음');
      const total=(key:string)=>r.traffic.reduce((n:number,t:any)=>n+t[key],0);
      return {name:r.name,hosting:r.hosting,metrics:{cpuPercent:r.mainProcessCpuOneCorePercent,
        tickP95Ms:r.managerTickMs.p95,tickMaxMs:r.managerTickMs.max,commitP95Ms:r.hostCommitMs.p95,
        loopMaxMs:r.eventLoopMs.max,healthP95Ms:r.healthRttMs.p95,
        uploadKiBps:total('sentBytes')/1024/(r.measuredMs/1000),downloadKiBps:total('receivedBytes')/1024/(r.measuredMs/1000),
        checkpointMaxKiB:player?r.checkpointBytes.max/1024:null,activeBotsMedian:r.activeBots.median,
        mainRssMaxMiB:r.mainRssBytes.max/1048576,clientsRssMaxMiB:r.clientsRssBytes.max/1048576}};
    });
    loaded.push({run,order,resultsSha256:hash(bytes),cases});
  }
  const cases=names.map(name=>({name,byHosting:Object.fromEntries(['server','player'].map(hosting=>{
    const values=loaded.map(r=>r.cases.find(c=>c.name===name&&c.hosting===hosting)!.metrics);
    return [hosting,Object.fromEntries(Object.keys(values[0]).map(metric=>{
      const samples=values.map(v=>v[metric]);
      return [metric,{values:samples,median:samples.every(v=>v!==null)?median(samples):null}];
    }))];
  }))}));
  return {format:1,commit,runs,durationMs:duration,runtime,runnerSha256,sourceHashes,cases,rawRuns:loaded,
    scope:'같은 소스의 server/player 반복 순차 비교. 실행 순서 AB/BA를 교대하지만 모드 조건 순서는 고정이고 매번 새 무작위 판이다. 실행별 통계의 중앙값으로 통합 p95·동일 행동 비교·통계적 유의성·VM 수용량 보장 아님. 운영 서비스와 호스트 자식 프로세스의 자원 경합 포함. RSS는 250ms 표본 최대이며 main은 진단 드라이버 포함, clients는 공유 페이지 중복 가능한 프로세스 합.'};
}

if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const result=summarizeHostRuns({directory:process.env.GST_HOST_AUDIT_OUTPUT!,source:process.env.GST_HOST_AUDIT_SOURCE!,
    commit:process.env.GST_HOST_AUDIT_COMMIT!,runs:Number(process.env.GST_HOST_AUDIT_RUNS),
    duration:Number(process.env.GST_HOST_AUDIT_DURATION_MS),runnerSha256:process.env.GST_HOST_AUDIT_RUNNER_SHA256!});
  writeFileSync(resolve(process.env.GST_HOST_AUDIT_OUTPUT!,'summary.json'),JSON.stringify(result,null,2)+'\n');
  const n=(v:any)=>v===null?'—':v.toFixed(2);
  console.log(`[host-audit] ${result.runtime.node} ${result.runtime.arch}, source=${result.commit}, runs=${result.runs}, dirtySource=false`);
  for(const c of result.cases) {
    const s=c.byHosting.server!,p=c.byHosting.player!;
    console.log(`[host-audit] ${c.name}: CPU server/player=${n(s.cpuPercent!.median)}/${n(p.cpuPercent!.median)}%, tick p95=${n(s.tickP95Ms!.median)}/${n(p.tickP95Ms!.median)}ms, host commit p95=${n(p.commitP95Ms!.median)}ms`);
    console.log(`[host-audit] ${c.name}: upload server/player=${n(s.uploadKiBps!.median)}/${n(p.uploadKiBps!.median)}KiB/s, main RSS=${n(s.mainRssMaxMiB!.median)}/${n(p.mainRssMaxMiB!.median)}MiB, HTTP/host/process errors=0/0/0`);
  }
}
