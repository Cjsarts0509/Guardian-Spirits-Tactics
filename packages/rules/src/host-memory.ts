/** JSON으로 직렬화된 AI 기억만 다룬다. Map/Set 복원이나 정책 실행은 하지 않는다. */
export type HostJson = null | boolean | number | string | HostJson[] | { [key: string]: HostJson };
export type HostMemoryWire = { $gstMap: HostJson[][] };
export type HostMemoryPatch =
  | { op: 'set'; value: HostJson }
  | { op: 'object'; changes: Record<string, HostMemoryPatch>; remove: string[] }
  | { op: 'array'; length: number; offset?: number; changes: [number, HostMemoryPatch][] };
const object = (v: unknown): v is Record<string, HostJson> => !!v && typeof v === 'object' && !Array.isArray(v);
export function checkHostMemoryJson(value: unknown, maxDepth=64, maxNodes=1000000): number {
  const stack: {value:unknown;depth:number}[]=[{value,depth:0}];let nodes=0;
  while(stack.length) {
    const item=stack.pop()!;
    if(item.depth>maxDepth||++nodes>maxNodes)throw Error('기억 JSON 한도 초과');
    const v=item.value;
    if(v===null||typeof v==='string'||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v))continue;
    if(!Array.isArray(v)&&!object(v))throw Error('잘못된 기억 JSON');
    for(const child of Object.values(v))stack.push({value:child,depth:item.depth+1});
  }
  return nodes;
}

export function diffHostMemory(before: HostJson | undefined, after: HostJson): HostMemoryPatch | null {
  if (before === after) return null;
  if (Array.isArray(before) && Array.isArray(after)) {
    // 최근64개 관측은 앞에서 밀린다. seq로 재사용 위치를 찾고 모든 값 차이는 아래에서 확인한다.
    const first=after[0];
    const found=object(first)&&typeof first.seq==='number'?before.findIndex(v=>object(v)&&v.seq===first.seq):0;
    const offset=found>0?found:0,source=offset?before.slice(offset):before;
    const changes: [number, HostMemoryPatch][] = [];
    for (let i=0;i<after.length;i++) { const patch=diffHostMemory(source[i],after[i]!);if(patch)changes.push([i,patch]); }
    return changes.length || source.length!==after.length || offset ? {op:'array',length:after.length,changes,...(offset?{offset}:{})} : null;
  }
  if (object(before) && object(after)) {
    const changes: [string, HostMemoryPatch][] = [];
    for (const key of Object.keys(after)) { const patch=diffHostMemory(Object.hasOwn(before,key)?before[key]:undefined,after[key]!);if(patch)changes.push([key,patch]); }
    const remove=Object.keys(before).filter(key=>!Object.hasOwn(after,key));
    return changes.length || remove.length ? {op:'object',changes:Object.fromEntries(changes),remove} : null;
  }
  return {op:'set',value:after};
}

/** 적용은 순수 함수다. 잘못된 변경분이 확정 기억을 부분 수정하지 못한다. */
export function applyHostMemoryPatch(before: HostJson, patch: unknown): HostJson {
  let nodes=0;
  const apply=(base:HostJson|undefined,p:any,depth:number):HostJson=>{
    if(depth>64 || ++nodes>1000000)throw Error('기억 변경분 한도 초과');
    if(p===null && base!==undefined)return base;
    if(!object(p as unknown))throw Error('잘못된 기억 변경분');
    const keys=Object.keys(p).sort().join(',');
    if(p.op==='set' && keys==='op,value' && p.value!==undefined) {
      nodes+=checkHostMemoryJson(p.value,64-depth,1000000-nodes);return p.value as HostJson;
    }
    if(p.op==='object' && keys==='changes,op,remove' && object(base) && object(p.changes) && Array.isArray(p.remove)) {
      const entries=new Map(Object.entries(base)),removed=new Set<string>();
      for(const key of p.remove) {
        if(typeof key!=='string'||!Object.hasOwn(base,key)||removed.has(key)||Object.hasOwn(p.changes,key))throw Error('잘못된 기억 삭제');
        removed.add(key);entries.delete(key);
      }
      for(const key of Object.keys(p.changes))entries.set(key,apply(Object.hasOwn(base,key)?base[key]:undefined,p.changes[key],depth+1));
      // __proto__ 같은 키도 자체 데이터 속성이며 전역 프로토타입을 수정하지 않는다.
      return Object.fromEntries(entries);
    }
    if(p.op==='array' && ['changes,length,op','changes,length,offset,op'].includes(keys) && Array.isArray(base) && Number.isSafeInteger(p.length)
      && p.length>=0 && p.length<=1000000 && Array.isArray(p.changes)) {
      const offset=Object.hasOwn(p,'offset')?p.offset:0;
      if(!Number.isSafeInteger(offset)||offset<0||offset>base.length)throw Error('잘못된 기억 배열 이동');
      const source=offset?base.slice(offset):base;
      if(p.length>source.length+p.changes.length)throw Error('기억 배열 누락');
      const result=source.slice(0,p.length),changed=new Set<number>();
      for(const entry of p.changes) {
        if(!Array.isArray(entry)||entry.length!==2||!Number.isSafeInteger(entry[0])||entry[0]<0||entry[0]>=p.length||changed.has(entry[0]))throw Error('잘못된 기억 배열 변경');
        changed.add(entry[0]);result[entry[0]]=apply(source[entry[0]],entry[1],depth+1);
      }
      for(let i=source.length;i<p.length;i++)if(!changed.has(i))throw Error('기억 배열 누락');
      return result;
    }
    throw Error('기억 변경분 형식 불일치');
  };
  return apply(before,patch,0);
}

export function isHostMemoryWire(value: unknown): value is HostMemoryWire {
  if(!object(value)||Object.keys(value).length!==1||!Array.isArray(value.$gstMap))return false;
  const ids=new Set<string>();
  return value.$gstMap.every(entry=>{
    if(!Array.isArray(entry)||entry.length!==2||typeof entry[0]!=='string'||ids.has(entry[0])||!object(entry[1])||!Number.isSafeInteger(entry[1].rng))return false;
    ids.add(entry[0]);return true;
  });
}
