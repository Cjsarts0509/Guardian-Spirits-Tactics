import { describe, expect, it } from 'vitest';
import { diffHostMemory, applyHostMemoryPatch, type HostJson } from '../src/index.js';
describe('확정 기억 변경분',()=>{
  it('추가·수정·삭제·배열 추가/축소·Map/Set 순서를 손실 없이 복구',()=>{
    let prior:HostJson=JSON.parse('{"rng":1,"nullable":null,"old":true,"map":{"$gstMap":[["a",1],["b",2]]},"array":[1,2]}');
    const values:HostJson[]=[
      {rng:2,nullable:false,map:{$gstMap:[['a',3],['b',2],['c',4]]},array:[1,2,{new:true}]},
      {rng:3,nullable:null,map:{$gstMap:[['b',2],['a',3]]},array:[null],set:{$gstSet:['x','y']}},
      {rng:4,nullable:null,map:{$gstMap:[]},array:[],set:{$gstSet:['y','x']}},
    ];
    for(const next of values){const frozen=structuredClone(prior);const restored=applyHostMemoryPatch(prior,diffHostMemory(prior,next));expect(restored).toEqual(next);expect(prior).toEqual(frozen);prior=restored;}
    expect(applyHostMemoryPatch(prior,diffHostMemory(prior,structuredClone(prior)))).toBe(prior);
  });
  it('특수 속성 이름을 데이터로 복구하며 전역 프로토타입을 변경하지 않음',()=>{
    const prior=JSON.parse('{"__proto__":{"a":1},"constructor":1}'),next=JSON.parse('{"__proto__":{"a":2},"constructor":2}');
    expect(applyHostMemoryPatch(prior,diffHostMemory(prior,next))).toEqual(next);
    expect(({} as any).a).toBeUndefined();
  });
  it.each([
    {op:'array',length:1000000000,changes:[]},
    {op:'array',length:4,changes:[[3,{op:'set',value:4}]]},
    {op:'array',length:2,changes:[[0,{op:'set',value:1}],[0,{op:'set',value:2}]]},
    {op:'array',length:2,changes:[[2,{op:'set',value:3}]]},
    {op:'object',changes:{},remove:[]},
    {op:'set',value:1,extra:true},
    {op:'array',length:2,offset:-1,changes:[]},
    {op:'array',length:2,offset:3,changes:[]},
  ])('잘못된 배열/연산을 거절하고 확정 원본 보존 %#',patch=>{
    const prior:HostJson=[1,2];expect(()=>applyHostMemoryPatch(prior,patch)).toThrow();expect(prior).toEqual([1,2]);
  });
  it('깊은 변경분은 순환 없이 한도에서 거절',()=>{
    let base:HostJson=1,patch:any={op:'set',value:2};
    for(let i=0;i<66;i++){base={a:base};patch={op:'object',remove:[],changes:{a:patch}};}
    expect(()=>applyHostMemoryPatch(base,patch)).toThrow('한도');
  });
  it('앞 변경이 유효해도 뒤 변경 실패 시 확정 원본 보존',()=>{
    const prior:HostJson=[{a:1},{b:2}];
    expect(()=>applyHostMemoryPatch(prior,{op:'array',length:2,changes:[[0,{op:'set',value:{a:9}}],[1,{op:'invalid'}]]})).toThrow();
    expect(prior).toEqual([{a:1},{b:2}]);
  });
  it('최근64개 이력의 앞 이동은 기존 항목을 재사용하며 새 항목만 전송',()=>{
    const before:HostJson[]=Array.from({length:64},(_,seq)=>({seq,at:seq*100,options:['x'.repeat(500)]}));
    const after=[...before.slice(4),...Array.from({length:4},(_,i)=>({seq:64+i,at:(64+i)*100,options:['y'.repeat(500)]}))];
    const patch=diffHostMemory(before,after);
    expect(patch?.op).toBe('array');if(patch?.op==='array')expect(patch.offset).toBe(4);
    expect(applyHostMemoryPatch(before,patch)).toEqual(after);
    expect(JSON.stringify(patch).length).toBeLessThan(JSON.stringify(after).length*.1);
    expect(before).toHaveLength(64);
  });
  it('새 값에 숨긴 깊은 구조도 전체 복구 직렬화 전에 거절',()=>{
    let value:HostJson=1;for(let i=0;i<66;i++)value={a:value};
    expect(()=>applyHostMemoryPatch(1,{op:'set',value})).toThrow('한도');
  });
});
