import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { HOST_AUDIT_PATHS, summarizeHostRuns } from '../scripts/host-audit-summary.js';
const folders:string[]=[];
afterEach(()=>{for(const f of folders)rmSync(f,{recursive:true,force:true});folders.length=0;});
const stats=(n:number,samples=4)=>({samples,median:samples?n:null,p95:samples?n:null,max:samples?n:null});
function fixture() {
  const directory=mkdtempSync(`${tmpdir()}/gst-host-summary-test.`),source=resolve(directory,'source');folders.push(directory);
  const commit='a'.repeat(40),hashes:Record<string,string>={};
  for(const p of HOST_AUDIT_PATHS){const path=resolve(source,p);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,p);hashes[p]=createHash('sha256').update(p).digest('hex');}
  for(let run=1;run<=3;run++) {
    const hosts=run%2?['server','player']:['player','server'];
    const results=['one-room-default','four-rooms-default','four-rooms-high-activity'].flatMap((name,i)=>hosts.map(hosting=>{
      const player=hosting==='player',rooms=i===0?1:4,cpuMs=run*10+(player?5:0);
      return{name,hosting,rooms,activity:i===2?1:.012,timeScale:60,requestedMs:1000,measuredMs:1000,
        healthErrors:0,hostErrors:0,processErrors:0,mainProcessCpuMs:cpuMs,mainProcessCpuOneCorePercent:cpuMs/10,
        managerTickMs:stats(run),activeBots:stats(rooms*12),healthRttMs:stats(1),
        mainRssBytes:stats(64*1048576),clientsRssBytes:stats(rooms*32*1048576),
        hostCommitMs:stats(2,player?4:0),checkpointBytes:stats(1024,player?4:0),eventLoopMs:{p95:2,max:3},
        traffic:Array.from({length:rooms},()=>({sentBytes:1024,receivedBytes:2048,frames:player?4:0}))};
    }));
    const path=resolve(directory,`runs/${run}/results.json`);mkdirSync(dirname(path),{recursive:true});
    writeFileSync(path,JSON.stringify({format:1,sourceCommit:commit,order:run%2?'server-first':'player-first',runtime:{node:'v22.23.3',arch:'arm64',cpu:'test'},hashes,results}));
  }
  return{directory,source,commit,runs:3,duration:1000,runnerSha256:'b'.repeat(64)};
}
describe('VM 호스팅 반복 결과 집계',()=>{
  it('AB/BA/AB 출처 검증·실행별 중앙값·통신 환산과 원자료 해시 보존',()=>{
    const input=fixture(),result=summarizeHostRuns(input);
    expect(result.rawRuns.map(r=>r.order)).toEqual(['server-first','player-first','server-first']);
    const c=result.cases[0]!.byHosting;
    expect(c.server!.cpuPercent).toEqual({values:[1,2,3],median:2});
    expect(c.player!.cpuPercent).toEqual({values:[1.5,2.5,3.5],median:2.5});
    expect(c.player!.uploadKiBps!.median).toBe(1);expect(c.server!.commitP95Ms!.median).toBeNull();
    expect(c.player!.mainRssMaxMiB!.median).toBe(64);
    expect(result.rawRuns[0]!.resultsSha256).toBe(createHash('sha256').update(readFileSync(resolve(input.directory,'runs/1/results.json'))).digest('hex'));
    expect(summarizeHostRuns({...input,runs:2}).cases[0]!.byHosting.server!.cpuPercent!.median).toBe(1.5);
  });
  it.each([
    ['커밋',(r:any)=>{r.sourceCommit='c'.repeat(40);}],
    ['순서',(r:any)=>{r.order='server-first';}],
    ['소스 해시',(r:any)=>{r.hashes[HOST_AUDIT_PATHS[0]!]='0'.repeat(64);}],
    ['실행 환경',(r:any)=>{r.runtime.arch='x64';}],
    ['조건 수',(r:any)=>{r.results.pop();}],
    ['기간',(r:any)=>{r.results[0].requestedMs=2000;}],
    ['HTTP 오류',(r:any)=>{r.results[0].healthErrors=1;}],
    ['프로세스 종료',(r:any)=>{r.results[0].processErrors=1;}],
    ['CPU 계산',(r:any)=>{r.results[0].mainProcessCpuOneCorePercent=999;}],
    ['호스트 확정 없음',(r:any)=>{r.results[0].traffic[0].frames=0;}],
    ['메모리 누락',(r:any)=>{delete r.results[0].mainRssBytes;}],
  ])('%s 불일치 결과를 성공으로 집계하지 않음',(_label,mutate)=>{
    const input=fixture(),path=resolve(input.directory,'runs/2/results.json'),raw=JSON.parse(readFileSync(path,'utf8'));
    mutate(raw);writeFileSync(path,JSON.stringify(raw));expect(()=>summarizeHostRuns(input)).toThrow();
  });
});
