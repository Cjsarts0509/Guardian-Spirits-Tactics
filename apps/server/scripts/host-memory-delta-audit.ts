import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import assert from 'node:assert/strict';
import { createGame,createBotMemory,tickHost,encodeHostSnapshot,decodeHostSnapshot,encodeHostFrame,readHostWire,
  type HostSnapshot,type HostWireSnapshot } from '@gst/rules';
import { encodeLegacyHostDelta,readLegacyHostWire } from './host-memory-baseline.js';
const root=resolve(import.meta.dirname,'../../..'),results=[];
const bytes=(s:string)=>Buffer.byteLength(s),stats=(values:number[])=>{
  const v=[...values].sort((a,b)=>a-b);return{samples:v.length,mean:v.reduce((a,b)=>a+b,0)/v.length,p95:v[Math.floor(v.length*.95)],max:v.at(-1)};
};
for(const mode of ['civil_war','primordial','lidellut','troll'] as const)for(const activity of [.012,1])for(const seed of [123,456]) {
  let snapshot:HostSnapshot,prior:HostWireSnapshot,game=0,tick=0,frame=0;
  const start=()=>{
    const {state}=createGame({mode,players:Array.from({length:12},(_,i)=>({id:`bot-${i}`,nickname:`봇${i}`})),seed:seed+game,now:1000});
    snapshot={version:1,state,memories:new Map(state.players.map((p,i)=>[p.id,createBotMemory(seed+i+game)])),handled:0,records:[],results:[]};
    prior=readHostWire(encodeHostSnapshot(snapshot)).snapshot;game++;tick=0;frame=0;
  };start();
  const beforeBytes:number[]=[],afterBytes:number[]=[],beforeWire:number[]=[],afterWire:number[]=[],beforeEncode:number[]=[],afterEncode:number[]=[],beforeRead:number[]=[],afterRead:number[]=[];
  let memoryDeltaFrames=0;
  for(let sample=0;sample<120;sample++) {
    if(snapshot!.state.phase==='ended')start();
    tickHost(snapshot!,snapshot!.state.players.map(p=>({id:p.id,bot:true,automate:true})),1000+(++tick)*15000,{activity,botKind:'smart'});
    snapshot!.state.now=Math.max(snapshot!.state.now,1000+tick*15000);
    let begin=performance.now();const legacy=encodeLegacyHostDelta(snapshot!,prior!.state.log.length,prior!.records.length);beforeEncode.push(performance.now()-begin);
    begin=performance.now();const sent=encodeHostFrame(snapshot!,prior!.state.log.length,prior!.records.length,prior!.memories,frame);afterEncode.push(performance.now()-begin);
    begin=performance.now();const old=readLegacyHostWire(legacy,prior!);beforeRead.push(performance.now()-begin);
    begin=performance.now();const current=readHostWire(sent.checkpoint,{...prior!,frame}).snapshot;afterRead.push(performance.now()-begin);
    assert.deepStrictEqual(current.state,old.state);assert.deepStrictEqual(current.records,old.records);
    assert.deepStrictEqual(current.memories,JSON.parse(old.memories));
    assert.deepStrictEqual(decodeHostSnapshot(JSON.stringify(current)).memories,decodeHostSnapshot(JSON.stringify(old)).memories);
    if(Object.hasOwn(JSON.parse(sent.checkpoint),'memoryDelta'))memoryDeltaFrames++;
    beforeBytes.push(bytes(legacy));afterBytes.push(bytes(sent.checkpoint));
    beforeWire.push(bytes(JSON.stringify({type:'host.frame',epoch:1,frame:frame+1,checkpoint:legacy})));
    afterWire.push(bytes(JSON.stringify({type:'host.frame',epoch:1,frame:frame+1,checkpoint:sent.checkpoint})));
    prior=current;frame++;
  }
  const ratio=afterWire.reduce((a,b)=>a+b,0)/beforeWire.reduce((a,b)=>a+b,0);
  results.push({mode,activity,seed,gamesStarted:game,memoryDeltaFrames,checkpointBytes:{before:stats(beforeBytes),after:stats(afterBytes)},transportJsonBytes:{before:stats(beforeWire),after:stats(afterWire),ratio},
    encodeMs:{before:stats(beforeEncode),after:stats(afterEncode)},readMs:{before:stats(beforeRead),after:stats(afterRead)}});
  process.stderr.write(`[memory-delta] ${mode}/${activity}/${seed} 완료\n`);
}
const paths=['apps/server/scripts/host-memory-baseline.ts','apps/server/scripts/host-memory-delta-audit.ts','packages/rules/src/host-runtime.ts','packages/rules/src/host-memory.ts','apps/client/src/host.worker.ts','apps/server/src/rooms.ts'];
console.log(JSON.stringify({format:1,runtime:{node:process.version,arch:process.arch},baselineRef:'17f8073c10b2557873e8e045cd969936b1163a01',
 scope:'같은 고정 판1920프레임을 기존 전체기억 문자열 방식과 새 변경분 방식으로 인코딩·복구. 실제 WS JSON 바이트(헤더 제외), 상태/기록/원본 기억/Map·Set 복원 동등성 대조. 논리틱15초·12봇·종료 시 새 판. 로컬1회 순서 before→after, JIT/GC/순서 효과 포함. read는 Room 전체 확정/스키마/뷰·서버 CPU가 아니며 encode는 호스트 비용. VM/원격 회선/통계적 유의성 결과 아님.',results,
 hashes:Object.fromEntries(await Promise.all(paths.map(async p=>[p,createHash('sha256').update(await readFile(resolve(root,p))).digest('hex')])))},null,2));
