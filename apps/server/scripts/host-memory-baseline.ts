// 17f8073 이전 VM 측정 코드의 전체 기억 문자열 전송/수신을 비교용으로 고정한다.
// 운영 코드에서 import하지 않는다. AI 정책은 실행하지 않는다.
import type { HostSnapshot, GameState } from '@gst/rules';
export const encodeLegacyHostDelta=(snapshot:HostSnapshot,logBase:number,recordBase:number)=>JSON.stringify({
  ...snapshot,memories:JSON.stringify(snapshot.memories,(key,value)=>key==='beliefCache'?undefined
    :value instanceof Map?{$gstMap:[...value]}:value instanceof Set?{$gstSet:[...value]}:value),
  delta:1,logBase,recordBase,state:{...snapshot.state,log:snapshot.state.log.slice(logBase)},records:snapshot.records.slice(recordBase),
});
export function readLegacyHostWire(text:string,prior:{state:GameState;records:HostSnapshot['records']}) {
  const raw=JSON.parse(text);
  if(raw.version!==1||typeof raw.memories!=='string'||!Array.isArray(JSON.parse(raw.memories).$gstMap)
    ||!Array.isArray(raw.records)||!Array.isArray(raw.results)||!Number.isSafeInteger(raw.handled)||raw.handled<0)throw Error('잘못된 호스트 와이어');
  if(raw.delta!==undefined) {
    if(raw.delta!==1||raw.logBase!==prior.state.log.length||raw.recordBase!==prior.records.length||!Array.isArray(raw.state?.log))throw Error('확정 기록 기준 불일치');
    return {version:1 as const,state:{...raw.state,log:prior.state.log.concat(raw.state.log)} as GameState,
      records:prior.records.concat(raw.records),memories:raw.memories,handled:raw.handled,results:raw.results};
  }
  return raw;
}
