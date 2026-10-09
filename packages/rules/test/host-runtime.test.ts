import { describe, expect, it } from 'vitest';
import { createGame, createBotMemory, encodeHostSnapshot, decodeHostSnapshot, encodeHostDelta, encodeHostFrame, serializeHostMemories, readHostWire, applyHostInputs, tickHost, type HostSnapshot } from '../src/index.js';

describe('호스트 상태 복원', () => {
  for (const mode of ['civil_war', 'primordial', 'lidellut', 'troll'] as const) it(`${mode}: 변경분 전송·반복 호스트 복원 후 전체 전송과 행동/기억 일치`, () => {
    const {state}=createGame({mode,players:Array.from({length:12},(_,i)=>({id:`p${i}`,nickname:`P${i}`})),seed:123,now:1000});
    let candidate:HostSnapshot={version:1,state,memories:new Map(state.players.map((p,i)=>[p.id,createBotMemory(i+1)])),handled:0,records:[],results:[]};
    const control=decodeHostSnapshot(encodeHostSnapshot(candidate)),members=state.players.map(p=>({id:p.id,bot:true,automate:true}));
    let committed=readHostWire(encodeHostSnapshot(candidate)).snapshot,base=committed.memories,deltas=0;
    for(let frame=1;frame<=40;frame++) {
      const now=1000+frame*15000;
      tickHost(control,members,now,{activity:1,botKind:'smart'});tickHost(candidate,members,now,{activity:1,botKind:'smart'});
      const sent=encodeHostFrame(candidate,committed.state.log.length,committed.records.length,base,frame-1);
      if('memoryDelta' in JSON.parse(sent.checkpoint))deltas++;
      committed=readHostWire(sent.checkpoint,{...committed,frame:frame-1}).snapshot;base=sent.memories;
      const restored=decodeHostSnapshot(JSON.stringify(committed));
      expect(restored.state).toEqual(control.state);expect(restored.records).toEqual(control.records);
      expect(restored.memories).toEqual(decodeHostSnapshot(encodeHostSnapshot(control)).memories);
      if(frame%10===0){candidate=restored;base=serializeHostMemories(candidate.memories);}
    }
    expect(deltas).toBeGreaterThan(0);
  },20000);

  it('이전 문자열 기억도 읽고 잘못된 기억 기준/중복 필드는 거절',()=>{
    const {state}=createGame({mode:'civil_war',players:Array.from({length:8},(_,i)=>({id:`p${i}`,nickname:`P${i}`})),seed:1,now:1000});
    const snapshot:HostSnapshot={version:1,state,memories:new Map([['p0',createBotMemory(1)]]),handled:0,records:[],results:[]};
    const raw=JSON.parse(encodeHostSnapshot(snapshot));raw.memories=JSON.stringify(raw.memories);
    const prior=readHostWire(JSON.stringify(raw)).snapshot;
    expect(decodeHostSnapshot(JSON.stringify(prior)).memories).toEqual(snapshot.memories);
    const delta={...raw,memories:undefined,memoryDelta:null,memoryBase:3};
    expect(()=>readHostWire(JSON.stringify(delta),{...prior,frame:2})).toThrow('기준 불일치');
    expect(()=>readHostWire(JSON.stringify({...delta,memories:raw.memories}),{...prior,frame:3})).toThrow('기준 불일치');
    expect(readHostWire(JSON.stringify(delta),{...prior,frame:3}).snapshot.memories).toBe(prior.memories);
  });

  it('기록 추가분을 합쳐 전체 복구하고 잘못된 기준은 거절', () => {
    const { state } = createGame({ mode: 'civil_war', players: Array.from({length:8}, (_,i)=>({id:`p${i}`,nickname:`P${i}`})), seed: 1, now: 1000 });
    const snapshot: HostSnapshot = { version: 1, state, memories: new Map([['p0', createBotMemory(1)]]), handled: 0, records: [], results: [] };
    applyHostInputs(snapshot, [{id:1,kind:'action',player:'p0',action:{type:'chat',channel:'all',text:'기존'}}],1100);
    const prior = structuredClone(snapshot), logBase=state.log.length, recordBase=snapshot.records.length;
    snapshot.results=[];
    applyHostInputs(snapshot, [{id:2,kind:'action',player:'p0',action:{type:'chat',channel:'all',text:'추가'}}],1200);
    const delta=encodeHostDelta(snapshot,logBase,recordBase), wire=readHostWire(delta,{state:prior.state,records:prior.records});
    expect(wire.validationState.log).toEqual(snapshot.state.log.slice(logBase));
    expect(decodeHostSnapshot(JSON.stringify(wire.snapshot))).toEqual(decodeHostSnapshot(encodeHostSnapshot(snapshot)));
    expect(() => readHostWire(delta,{state: snapshot.state,records: snapshot.records})).toThrow('기준 불일치');
    expect(() => readHostWire(delta)).toThrow('기준 불일치');
    expect(prior.state.log).toHaveLength(logBase);
  });
  for (const mode of ['civil_war', 'primordial', 'lidellut', 'troll'] as const) it(`${mode}: 이전 후 RNG·상태·스킬 기억과 다음 행동 일치`, () => {
    const { state } = createGame({ mode, players: Array.from({ length: 12 }, (_, i) => ({ id: `p${i}`, nickname: `P${i}` })), seed: 123, now: 1000 });
    const snapshot: HostSnapshot = { version: 1, state, memories: new Map(state.players.map((p,i) => [p.id, createBotMemory(i+1)])), handled: 0, records: [], results: [] };
    const members = state.players.map(p => ({ id: p.id, bot: true, automate: true }));
    for (let i=0; i<12; i++) tickHost(snapshot, members, 301000+i*250, { activity: 1, botKind: 'smart' });
    const migrated = decodeHostSnapshot(encodeHostSnapshot(snapshot));
    for (let i=0; i<20; i++) {
      const now = 304000+i*250;
      tickHost(snapshot, members, now, { activity: 1, botKind: 'smart' });
      tickHost(migrated, members, now, { activity: 1, botKind: 'smart' });
      expect(migrated.state).toEqual(snapshot.state);
      expect(migrated.records).toEqual(snapshot.records);
      // WeakMap 표본 모델을 포함한 파생 믿음 캐시는 복원 때 다시 만든다.
      expect(decodeHostSnapshot(encodeHostSnapshot(migrated)).memories).toEqual(decodeHostSnapshot(encodeHostSnapshot(snapshot)).memories);
    }
  });

  it('재전송 행동은 한 번만 적용하고 입력 누락은 거절', () => {
    const { state } = createGame({ mode: 'civil_war', players: Array.from({length:8}, (_,i)=>({id:`p${i}`,nickname:`P${i}`})), seed: 1, now: 1000 });
    const snapshot: HostSnapshot = { version: 1, state, memories: new Map(), handled: 0, records: [], results: [] };
    const command = { id: 1, kind: 'action' as const, player: 'p0', action: { type: 'chat' as const, channel: 'all' as const, text: '한 번' } };
    applyHostInputs(snapshot, [command], 1100);
    const first = structuredClone(snapshot);
    applyHostInputs(snapshot, [command], 1100);
    expect(snapshot).toEqual(first);
    expect(snapshot.results).toHaveLength(1);
    expect(() => applyHostInputs(snapshot, [{...command,id:3}], 1200)).toThrow('순서 누락');
  });
});
