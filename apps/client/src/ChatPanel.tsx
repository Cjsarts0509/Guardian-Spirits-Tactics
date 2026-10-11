import {useEffect,useRef,useState} from 'react';
import type {LobbyChatLine,RoomDetail} from '@gst/protocol';
import {net} from './net.js';
import {Profile} from './Profile.js';
export function ChatPanel({room}:{room?:RoomDetail}) {
 const [lines,setLines]=useState<LobbyChatLine[]>([]),[text,setText]=useState(''),[target,setTarget]=useState<string|null>(null);const log=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(room)return;const off=net.on(m=>{if(m.type==='lobby.chat')setLines(m.lines);});net.send({type:'lobby.chat.get'});return off;},[room?.id]);
 const shown=(room?.chat??lines).slice(-50);
 useEffect(()=>{log.current?.scrollTo({top:log.current.scrollHeight});},[shown.at(-1)?.seq]);
 return <section className="room-chat"><h3>{room?'원탁의 대화':'대기실 채팅'}</h3><div className="room-chat-log" role="log" ref={log}>{shown.map(m=><p key={m.seq}><b onContextMenu={e=>{if(room?.anonymous)return;e.preventDefault();const id='userId' in m?m.userId:room?.members.find(p=>p.nickname===m.nickname)?.id;if(id)setTarget(String(id));}}>{m.nickname}</b> {m.text}</p>)}{!shown.length&&<p className="muted">참가자들과 자유롭게 대화하세요.</p>}</div><form className="chat-input" onSubmit={e=>{e.preventDefault();if(text.trim())net.send(room?{type:'room.chat',text:text.trim()}:{type:'lobby.chat',text:text.trim()});setText('');}}><input aria-label="채팅 메시지" value={text} onChange={e=>setText(Array.from(e.target.value).slice(0,50).join(''))} placeholder="메시지 · 최대 50자"/><button aria-label="전송" disabled={!text.trim()}>↵</button></form>{target&&<Profile userId={target} onClose={()=>setTarget(null)}/>}</section>;
}
