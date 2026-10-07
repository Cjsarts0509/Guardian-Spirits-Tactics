// 부하 측정용 독립 호스트 프로세스. 실제 브라우저 워커를 메시지 어댑터에서 실행한다.
import WebSocket from 'ws';
import { Worker } from 'node:worker_threads';
import type { ServerMessage } from '@gst/protocol';
const [port, mode, hosting, workerPath] = process.argv.slice(2);
const ws = new WebSocket(`ws://127.0.0.1:${port}`);
let worker: Worker | null = null, epoch = 0, sentBytes = 0, receivedBytes = 0, frames = 0, errors = 0, roomId = '', startedRoom = '';
const send = (message: unknown) => { const text=JSON.stringify(message);sentBytes+=Buffer.byteLength(text);if(ws.readyState===ws.OPEN)ws.send(text); };
const stop = () => { const old=worker;worker=null;epoch=0;if(old)void old.terminate(); };
const create = () => send({type:'room.create',name:`load-${mode}`,mode,hosting,turnSeconds:90});
ws.on('open',()=>send({type:'hello',protocol:1,nickname:`load-${mode}`,hostCapable:true}));
ws.on('error',()=>{errors++;});
ws.on('message',data=>{
  const bytes=Buffer.isBuffer(data)?data:Array.isArray(data)?Buffer.concat(data):Buffer.from(data);
  receivedBytes+=bytes.byteLength;
  const message=JSON.parse(bytes.toString()) as ServerMessage;
  if(message.type==='welcome')create();
  else if(message.type==='room'&&message.room){
    roomId=message.room.id;
    if(message.room.status==='lobby'&&startedRoom!==roomId){startedRoom=roomId;send({type:'room.start',aiOnly:true});}
    else if(message.room.status==='ended'){stop();send({type:'room.leave'});}
    else if(message.room.hostPaused)stop();
  }else if(message.type==='room'&&!message.room&&roomId){roomId='';create();}
  else if(message.type==='host.grant'){
    stop();epoch=message.epoch;
    const w=new Worker(`const {parentPort}=require('node:worker_threads');globalThis.postMessage=m=>parentPort.postMessage(m);import(${JSON.stringify(workerPath)}).then(()=>parentPort.on('message',data=>globalThis.onmessage({data})));`,{eval:true});
    worker=w;w.postMessage(message);
    w.on('error',()=>errors++);
    w.on('message',m=>{if(worker!==w)return;if(m.type==='host.failed')errors++;else send(m);});
  }else if(message.type==='host.ack'){
    frames++;if(message.epoch===epoch)worker?.postMessage(message);
  }else if(message.type==='host.members'||message.type==='host.command'){
    if(message.epoch===epoch)worker?.postMessage(message);
  }else if(message.type==='error')errors++;
});
const report = (sampleId?:number) => process.send?.({ roomId,sentBytes,receivedBytes,frames,errors,rssBytes:process.memoryUsage.rss(),sampleId });
const timer=setInterval(()=>report(),250);
process.on('message',m=>{
  if(m&&typeof m==='object'&&'sampleId' in m&&typeof m.sampleId==='number')report(m.sampleId);
  if(m==='stop'){report();clearInterval(timer);stop();ws.terminate();process.exit(0);}
});
// 진단 부모가 중단되면 임시 호스트/Worker도 남기지 않는다.
process.on('disconnect',()=>{clearInterval(timer);stop();ws.terminate();process.exit(0);});
