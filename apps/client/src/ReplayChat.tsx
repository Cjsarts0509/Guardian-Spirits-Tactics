import {useRef,useState} from 'react';
import type {RoomDetail} from '@gst/protocol';
import {RoomChat} from './Lobby.js';
export function ReplayChat({room,onClose}:{room:RoomDetail;onClose:()=>void}) {
 const [pos,setPos]=useState({x:Math.max(8,innerWidth-340),y:Math.max(8,innerHeight-330)}),[opacity,setOpacity]=useState(.95);const drag=useRef<{x:number;y:number;px:number;py:number}|null>(null);
 return <div className="replay-chat" style={{left:pos.x,top:pos.y,opacity}}><div className="replay-chat-handle" onPointerDown={e=>{if((e.target as HTMLElement).closest('button,input'))return;drag.current={x:e.clientX,y:e.clientY,px:pos.x,py:pos.y};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(!drag.current)return;setPos({x:Math.max(8,Math.min(innerWidth-Math.min(320,innerWidth-16)-8,drag.current.px+e.clientX-drag.current.x)),y:Math.max(8,Math.min(innerHeight-Math.min(300,innerHeight-16)-8,drag.current.py+e.clientY-drag.current.y))});}} onPointerUp={()=>{drag.current=null;}}><b>채팅 · 이동</b><input aria-label="채팅창 불투명도" type="range" min={.3} max={1} step={.05} value={opacity} onChange={e=>setOpacity(Number(e.target.value))}/><button className="ghost" onClick={onClose}>✕</button></div><RoomChat room={room}/></div>;
}
