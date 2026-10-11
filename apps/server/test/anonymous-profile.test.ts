import {expect,it} from 'vitest';
import {once} from 'node:events';
import WebSocket from 'ws';
import type {ServerMessage} from '@gst/protocol';
import {createGameServer} from '../src/server.js';
import {loadConfig} from '../src/config.js';
it('실제 WebSocket: 익명 경기 상대 전적은 차단하고 자신의 정보는 허용',async()=>{
 const server=createGameServer({...loadConfig({}),host:'127.0.0.1',port:0,botActivity:0},()=>{});const sockets:WebSocket[]=[];
 try{
  const port=await server.listen();
  async function peer(name:string){const ws=new WebSocket(`ws://127.0.0.1:${port}`);sockets.push(ws);const inbox:ServerMessage[]=[];ws.on('message',data=>inbox.push(JSON.parse(String(data))));await once(ws,'open');const send=(m:unknown)=>ws.send(JSON.stringify(m));const wait=async(type:ServerMessage['type'])=>{await expect.poll(()=>inbox.find(m=>m.type===type&&(m.type!=='room'||m.room!==null))).toBeTruthy();return inbox.find(m=>m.type===type&&(m.type!=='room'||m.room!==null))!;};send({type:'hello',protocol:1,nickname:name});const welcome=await wait('welcome');if(welcome.type!=='welcome')throw Error('welcome');return {send,wait,inbox,id:welcome.userId};}
  const host=await peer('Host'),guest=await peer('Guest');host.send({type:'room.create',name:'원탁',mode:'civil_war',capacity:8,turnSeconds:90});const joined=await host.wait('room');if(joined.type!=='room'||!joined.room)throw Error('room');guest.send({type:'room.join',roomId:joined.room.id});await guest.wait('room');const room=server.rooms.rooms.get(joined.room.id)!;for(let i=2;i<8;i++)room.setSlot(host.id,i,'ai');room.stage='assignment';room.status='playing';room.setAnonymous(host.id,true);room.assign(host.id,Date.now());guest.send({type:'profile.get',userId:host.id});const error=await guest.wait('error');if(error.type==='error')expect(error.message).toContain('익명');host.send({type:'profile.get'});const own=await host.wait('profile');if(own.type==='profile')expect(own.profile).toMatchObject({guest:true,nickname:'Host',modes:[]});
 }finally{for(const ws of sockets)ws.terminate();await server.close();}
});
