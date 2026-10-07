// 네트워크 부하가 아니라 고정 판의 체크포인트 구성 바이트만 확인한다.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createGame, createBotMemory, tickHost, encodeHostDelta, readHostWire, type HostSnapshot } from '@gst/rules';
const root=resolve(import.meta.dirname,'../../..');
const bytes=(value:unknown)=>Buffer.byteLength(JSON.stringify(value));
const stats=(v:number[])=>({samples:v.length,mean:v.reduce((a,b)=>a+b,0)/v.length,max:Math.max(...v)});
const results=[];
for(const mode of ['civil_war','primordial','lidellut','troll'] as const)for(const activity of [.012,1])for(const seed of [123,456]) {
  let snapshot:HostSnapshot,game=0,tick=0;
  const start=()=>{
    const {state}=createGame({mode,players:Array.from({length:12},(_,i)=>({id:`bot-${i}`,nickname:`봇${i}`})),seed:seed+game,now:1000});
    snapshot={version:1,state,memories:new Map(state.players.map((p,i)=>[p.id,createBotMemory(seed+i+game)])),handled:0,records:[],results:[]};
    tick=0;game++;
  };
  start();
  const checkpoint:number[]=[],transport:number[]=[],memory:number[]=[],state:number[]=[],records:number[]=[],ambiguous:number[]=[],allMemoryInner:number[]=[];
  for(let sample=0;sample<120;sample++) {
    if(snapshot!.state.phase==='ended')start();
    const prior={state:{...snapshot!.state,log:snapshot!.state.log.slice()},records:snapshot!.records.slice()};
    tickHost(snapshot!,snapshot!.state.players.map(p=>({id:p.id,bot:true,automate:true})),1000+(++tick)*15000,{activity,botKind:'smart'});
    snapshot!.state.now=Math.max(snapshot!.state.now,1000+tick*15000);
    const encoded=encodeHostDelta(snapshot!,prior.state.log.length,prior.records.length),raw=JSON.parse(encoded),wire=readHostWire(encoded,prior);
    if(JSON.stringify(wire.snapshot.state)!==JSON.stringify(snapshot!.state)||JSON.stringify(wire.snapshot.records)!==JSON.stringify(snapshot!.records))throw Error('기록 증분 복구 불일치');
    checkpoint.push(Buffer.byteLength(encoded));transport.push(bytes({type:'host.frame',epoch:1,frame:sample+1,checkpoint:encoded}));
    memory.push(bytes(raw.memories));state.push(bytes(raw.state));records.push(bytes(raw.records));
    const memories=(typeof raw.memories==='string'?JSON.parse(raw.memories):raw.memories).$gstMap;
    allMemoryInner.push(typeof raw.memories==='string'?Buffer.byteLength(raw.memories):bytes(raw.memories));
    ambiguous.push(memories.reduce((n:number,p:any[])=>n+bytes(p[1].perception?.battle?.ambiguous??[]),0));
  }
  const total=checkpoint.reduce((a,b)=>a+b,0);
  results.push({mode,activity,seed,gamesStarted:game,checkpointBytes:stats(checkpoint),transportJsonBytes:stats(transport),
    fieldValueBytes:{memories:stats(memory),state:stats(state),newRecords:stats(records)},
    memoryValueShareOfCheckpoint:memory.reduce((a,b)=>a+b,0)/total,
    innerMemoryBytes:stats(allMemoryInner),innerAmbiguousBytes:stats(ambiguous),
    ambiguousShareOfInnerMemory:ambiguous.reduce((a,b)=>a+b,0)/allMemoryInner.reduce((a,b)=>a+b,0)});
}
const paths=['apps/server/scripts/host-payload-audit.ts','packages/rules/src/host-runtime.ts','packages/rules/src/bot-memory.ts','packages/rules/src/bot-tactics.ts','packages/rules/src/bot.ts'];
console.log(JSON.stringify({format:1,runtime:{node:process.version,arch:process.arch},scope:'로컬 고정2시드×4모드×2activity, 각120틱. 논리 틱15000ms(timeScale60×250ms), 종료 시 새 판. 실제 서버/VM/회선/CPU 측정이 아니며 VM 전송 구성의 직접 증거가 아니다. 각 필드 값 JSON 바이트로 키/구분자 제외. ambiguous 비율은 외부 이스케이프 전 AI 기억 내부 바이트 기준. 전체 로그/행동 기록의 증분 복구를 매 틱 대조.',results,
 hashes:Object.fromEntries(await Promise.all(paths.map(async p=>[p,createHash('sha256').update(await readFile(resolve(root,p))).digest('hex')])))},null,2));
