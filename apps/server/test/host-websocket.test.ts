import { afterEach, expect, it } from 'vitest';
import { build } from 'esbuild';
import { Worker } from 'node:worker_threads';
import WebSocket from 'ws';
import type { ServerMessage } from '@gst/protocol';
import { createGameServer, type GameServer } from '../src/server.js';
import { loadConfig } from '../src/config.js';

let server: GameServer;
const clients: WebSocket[] = [], workers: Worker[] = [];
afterEach(async () => { clients.forEach(c=>c.terminate()); await Promise.all(workers.map(w=>w.terminate())); if(server) await server.close(); clients.length=0;workers.length=0; });

it('실제 WS와 브라우저 워커 번들: 방장 종료→다음 접속자 복구→행동 확정', async () => {
  // 브라우저 워커의 실제 번들을 Node worker의 메시지 API 어댑터에서 실행한다. DOM/화면 테스트는 별도다.
  const output = await build({ entryPoints: ['../client/src/host.worker.ts'], bundle: true, platform: 'browser', format: 'esm', write: false,
    alias: { '@gst/rules': '../../packages/rules/src/index.ts' } });
  const workerUrl = `data:text/javascript;base64,${Buffer.from(output.outputFiles![0]!.text).toString('base64')}`;
  server=createGameServer({...loadConfig({}),port:0,host:'127.0.0.1',tickMs:100,botActivity:0.2},()=>{});
  const port=await server.listen();
  async function connect(name: string) {
    const ws=new WebSocket(`ws://127.0.0.1:${port}`);clients.push(ws);
    const inbox: ServerMessage[]=[], errors: string[]=[];
    let hostWorker: Worker | null=null;
    ws.on('message',buf=>{
      const message=JSON.parse(buf.toString()) as ServerMessage;inbox.push(message);
      if(message.type==='host.grant') {
        if(hostWorker) void hostWorker.terminate();
        const w=new Worker(`const {parentPort}=require('node:worker_threads');globalThis.postMessage=m=>parentPort.postMessage(m);import(${JSON.stringify(workerUrl)}).then(()=>{parentPort.on('message',data=>globalThis.onmessage({data}));parentPort.postMessage({type:'ready'});});`,{eval:true});
        workers.push(w);hostWorker=w;
        w.on('error',e=>errors.push(e.message));
        w.postMessage(message);
        w.on('message',m=>{if(m.type==='ready')return;else if(m.type==='host.failed')errors.push(m.message);else if(ws.readyState===ws.OPEN)ws.send(JSON.stringify(m));});
      } else if(['host.members','host.command','host.ack'].includes(message.type)) hostWorker?.postMessage(message);
    });
    await new Promise<void>(resolve=>ws.once('open',resolve));
    ws.send(JSON.stringify({type:'hello',protocol:1,nickname:name,hostCapable:true}));
    const wait=async (predicate:(m:ServerMessage)=>boolean) => {
      const deadline=Date.now()+10000;
      while(Date.now()<deadline) { const hit=inbox.find(predicate);if(hit)return hit;await new Promise(r=>setTimeout(r,20)); }
      throw Error(`timeout ${name}: ${inbox.map(m=>m.type==='error'?m.message:m.type).join(',')} / ${errors}`);
    };
    const welcome=await wait(m=>m.type==='welcome') as Extract<ServerMessage,{type:'welcome'}>;
    return {ws,inbox,wait,welcome,errors, stop:()=>{hostWorker?.terminate();ws.terminate();}};
  }
  const a=await connect('첫 방장'),b=await connect('다음 방장');
  a.ws.send(JSON.stringify({type:'room.create',name:'호스트 시험',mode:'civil_war',hosting:'player',turnSeconds:90}));
  const lobby=await a.wait(m=>m.type==='room' && !!m.room) as Extract<ServerMessage,{type:'room'}>;
  b.ws.send(JSON.stringify({type:'room.join',roomId:lobby.room!.id}));await b.wait(m=>m.type==='room' && !!m.room);
  a.ws.send(JSON.stringify({type:'room.start'}));
  const first=await a.wait(m=>m.type==='host.grant') as Extract<ServerMessage,{type:'host.grant'}>;
  await a.wait(m=>m.type==='host.ack');
  const room=server.rooms.rooms.get(lobby.room!.id)!;
  const seq=room.state!.seq;
  a.stop();
  const next=await b.wait(m=>m.type==='host.grant') as Extract<ServerMessage,{type:'host.grant'}>;
  expect(next.epoch).toBeGreaterThan(first.epoch);
  expect(room.hostId).toBe(b.welcome.userId);
  b.ws.send(JSON.stringify({type:'game.action',action:{type:'chat',channel:'all',text:'이전 완료'},ref:99}));
  const result=await b.wait(m=>m.type==='action.result' && m.ref===99) as Extract<ServerMessage,{type:'action.result'}>;
  expect(result.ok).toBe(true);
  await b.wait(m=>m.type==='game' && m.events.some(e=>e.text.includes('이전 완료')));
  expect(room.state!.seq).toBeGreaterThan(seq);
  expect(b.inbox.filter(m=>m.type==='action.result' && m.ref===99)).toHaveLength(1);
  expect(a.errors.concat(b.errors)).toEqual([]);
  expect(b.inbox.filter(m=>m.type==='error')).toEqual([]);
},20000);
