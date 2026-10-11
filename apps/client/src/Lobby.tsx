import {skillIcon} from './icons.js';
import { useEffect, useState } from 'react';
import type { RoomDetail, RoomSummary } from '@gst/protocol';
import {sfx} from './sfx.js';
import { net } from './net.js';
import { SmallLogo } from './Logo.js';
import {ChatPanel} from './ChatPanel.js';
import type { ModeId, PlayerView } from '@gst/rules';
import { RoleReveal } from './RoleReveal.js';
import { CharacterCard } from './art.js';
import { Profile } from './Profile.js';

export const MODES: { id: ModeId; name: string; subtitle: string; image: string }[] = [
  { id: 'civil_war', name: '왕자들의 내전', subtitle: '부서진 왕관, 두 명의 후계자', image: '01' },
  { id: 'primordial', name: '태초의 전쟁', subtitle: '지상 연합과 태초의 어둠', image: '02' },
  { id: 'lidellut', name: '리델루트 황야', subtitle: '황야에 남은 마지막 맹세', image: '03' },
  { id: 'troll', name: '트롤 부족의 반란', subtitle: '얼음 왕좌를 뒤흔드는 반란', image: '04' },
];
const BASE = import.meta.env.BASE_URL;
export function Countdown({ end }: { end: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 100); return () => clearInterval(t); }, []);
  const seconds=Math.max(0,Math.ceil((end-now-net.wallClockOffset)/1000));
  useEffect(()=>{sfx.play(seconds>0?'countdown_tick':'countdown_start');},[seconds]);
  return <span className="countdown" role="timer" aria-label="시작까지 남은 초">{Math.max(0, Math.ceil((end - now - net.wallClockOffset) / 1000))}</span>;
}

export function Lobby({ rooms }: { rooms: RoomSummary[] }) {
  const [name, setName] = useState('가택 한 판');
  const [turn, setTurn] = useState<60 | 90 | 120>(90);
  const [mode, setMode] = useState<ModeId>('civil_war');
  const [capacity, setCapacity] = useState(12);
  const [create, setCreate] = useState(false);
  const [profile, setProfile] = useState(false);
  const [targetProfile,setTargetProfile]=useState<string|null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const visible = rooms.filter(r => r.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()) && (filter === 'all' || r.mode === filter));
  return <div className="lobby palace-lobby">
    <header className="lobby-head"><SmallLogo text="가디언 스피리츠 택틱스" /><div className="row"><button className="ghost" onClick={() => setProfile(true)}>내 정보 · 설정</button><button className="ghost" onClick={() => { net.disconnect(); location.reload(); }}>메인화면으로</button></div></header>
    <div className="lobby-heading"><span className="eyebrow">THE COUNCIL HALL</span><h1>전쟁의 서막</h1><p>동료를 모으고, 정체를 감춘 채 운명을 선택하세요.</p></div>
    <div className="lobby-columns"><section className="hall-panel room-list-panel">
      <div className="row spread"><div><h2>대기실</h2><span className="muted">{visible.length}개의 방</span></div><button className="primary" onClick={() => setCreate(true)}>＋ 방 만들기</button></div>
      <div className="room-filters"><label>방제 검색<input value={search} onChange={e => setSearch(e.target.value)} placeholder="찾고 싶은 방 제목" /></label><label>모드<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">모든 모드</option>{MODES.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label><button className="ghost" onClick={() => net.send({ type: 'room.list' })}>새로고침</button></div>
      <div className="room-table"><div className="room-table-head"><span>방 제목 / 모드</span><span>방장</span><span>플레이어 / AI</span><span>상태</span><span /></div>
      {visible.map(r => <div className="room-row" key={r.id}><div><b>{r.name}</b><small>{r.modeName}</small></div><span onContextMenu={e=>{e.preventDefault();if(r.hostUserId)setTargetProfile(r.hostUserId);}}>{r.hostName ?? '—'}</span><span>플레이어 {r.humans ?? r.players} · AI {r.bots ?? 0}<small>전체 {r.players}/{r.maxPlayers}</small></span><span className={`status-dot ${r.status}`}>{r.status === 'lobby' ? '대기 중' : '진행 중'}</span><button disabled={!r.rejoinable && (r.status !== 'lobby' || r.players >= r.maxPlayers)} onClick={() => net.send({ type: 'room.join', roomId: r.id })}>{r.rejoinable ? '재입장' : '참가하기'}</button></div>)}
      {!visible.length && <div className="empty-hall"><b>{search || filter !== 'all' ? '조건에 맞는 방이 없습니다.' : '아직 소집된 원정대가 없습니다.'}</b><p>새로운 방을 만들어 첫 전쟁을 시작하세요.</p></div>}</div>
    </section><ChatPanel/></div>
    {targetProfile&&<Profile userId={targetProfile} onClose={()=>setTargetProfile(null)}/>}
    {create && <div className="modal-backdrop"><section className="create-room hall-panel" role="dialog" aria-modal="true" aria-label="방 만들기" onClick={e => e.stopPropagation()}><div className="row spread"><h2>어떤 전쟁에 참여하시겠습니까?</h2><button className="ghost" aria-label="닫기" onClick={() => setCreate(false)}>✕</button></div><div className="mode-gallery">{MODES.map(m => <button key={m.id} className={`mode-choice ${mode === m.id ? 'chosen' : ''}`} aria-pressed={mode === m.id} onClick={() => setMode(m.id)}><img src={`${BASE}ui/mode-${m.image}.webp`} alt="" /><strong>{m.name}</strong><small>{m.subtitle}</small></button>)}</div><form onSubmit={e => { e.preventDefault(); net.send({ type: 'room.create', name: name.trim(), mode, capacity, turnSeconds: turn, hosting: 'server' }); setCreate(false); }}><div className="room-filters"><label>방 제목<input required maxLength={30} value={name} onChange={e => setName(e.target.value)} /></label><label>최대 인원<select aria-label="최대 인원" value={capacity} onChange={e => setCapacity(Number(e.target.value))}>{[8,9,10,11,12].map(n => <option key={n} value={n}>{n}명</option>)}</select></label><label>턴 길이<select aria-label="턴 길이" value={turn} onChange={e => setTurn(Number(e.target.value) as 60|90|120)}>{[60,90,120].map(n => <option key={n} value={n}>{n}초</option>)}</select></label></div><div className="row end"><button type="button" className="ghost" onClick={() => setCreate(false)}>취소</button><button disabled={!name.trim()}>방 만들기</button></div></form></section></div>}
    {profile && <Profile onClose={() => setProfile(false)} />}
  </div>;
}

export function RoomChat({room}:{room:RoomDetail}) {return <ChatPanel room={room}/>;}

export function RoomPanel({ room, myId }: { room: RoomDetail; myId: string }) {
  const [targetProfile,setTargetProfile]=useState<string|null>(null);
  const isHost = room.hostId === myId;
  const me = room.members.find(m => m.id === myId);
  const ready = room.members.length === room.maxPlayers && room.members.every(m => m.bot || (m.ready && m.connected));
  return <div className="lobby palace-lobby"><header className="lobby-head"><SmallLogo text={room.modeName} /><button className="ghost" onClick={() => net.send({type:'room.leave'})}>방 나가기</button></header><div className="room-columns"><aside className="setup-mode"><img src={`${BASE}ui/mode-${MODES.find(m=>m.id===room.mode)?.image}.webp`} alt={room.modeName}/><h2>{room.modeName}</h2></aside><section className="hall-panel room-setup"><div className="row spread"><div><span className="eyebrow">WAR COUNCIL</span><h1>{room.name}</h1><p>{room.modeName} · 턴 {room.turnSeconds}초</p></div><label>참가 인원<select aria-label="참가 인원" disabled={!isHost} value={room.maxPlayers} onChange={e => net.send({type:'room.capacity',capacity:Number(e.target.value)})}>{(room.allowedCapacities ?? [8,9,10,11,12]).map(n => <option key={n} value={n}>{n}명</option>)}</select></label></div><div className="slot-grid">{Array.from({length:12},(_,i) => {const m=room.members.find(x=>x.slot===i) ?? (!room.slots ? room.members[i] : undefined);return <div className={`room-slot ${m?.ready?'ready':''} ${m?.bot?'ai-slot':'human-slot'}`} key={i}><span className="slot-number">{String(i+1).padStart(2,'0')}</span><div><b onContextMenu={e=>{if(!m||m.bot||room.anonymous)return;e.preventDefault();setTargetProfile(m.id);}}>{m?.nickname ?? (i>=room.maxPlayers?'비활성 슬롯':'플레이어 대기 중')}</b><small>{m?.id===room.hostId?'방장 · ':''}{m?.bot?'AI · 준비 완료':m?.ready?'준비 완료':m?'준비 중':'빈 슬롯'}</small></div>{isHost && i<room.maxPlayers && (!m || m.bot) && <select aria-label={`${i+1}번 슬롯 종류`} value={m?.bot?'ai':'player'} onChange={e=>net.send({type:'room.slot',slot:i,kind:e.target.value as 'ai'|'player'})}><option value="player">플레이어</option>{room.botsAllowed&&<option value="ai">AI</option>}</select>}{isHost&&m&&!m.bot&&m.id!==myId&&<button className="ghost small" onClick={()=>net.send({type:'room.kick',userId:m.id})}>강퇴</button>}</div>;})}</div><div className="row spread room-actions"><p>플레이어 {room.humans} · AI {room.bots} / {room.maxPlayers}명</p><div className="row"><button className={me?.ready?'ghost':''} onClick={()=>net.send({type:'room.ready',ready:!me?.ready})}>{me?.ready?'준비 취소':'준비'}</button>{isHost&&<button disabled={!ready||room.stage==='countdown'} onClick={()=>net.send({type:'room.start'})}>게임 시작</button>}</div></div>{room.stage==='countdown'&&<div className="countdown-strip">게임 준비 화면으로 이동합니다 <Countdown end={room.countdownEndsAt!}/></div>}</section><RoomChat room={room}/></div>{targetProfile&&<Profile userId={targetProfile} onClose={()=>setTargetProfile(null)}/>}</div>;
}

export function StagingScreen({room,myId,view}:{room:RoomDetail;myId:string;view:PlayerView|null}) {
 const [reveal,setReveal]=useState(false),[confirmed,setConfirmed]=useState(false);
 useEffect(()=>{if(view){const done=!!sessionStorage.getItem(`gst.confirm.${room.id}`);setConfirmed(done);setReveal(!done);}else{setConfirmed(false);setReveal(false);}},[!!view,room.id]);
 const host=room.hostId===myId;
 return <div className={`staging game-board mode-${room.mode}`}><header className="topbar"><SmallLogo text={room.modeName}/><span>{room.name}</span><button className="ghost" onClick={()=>net.send({type:'room.leave'})}>방 나가기</button></header><div className="staging-columns"><div className="staging-content hall-panel"><span className="eyebrow">BEFORE THE BATTLE</span><h1>{confirmed?'당신의 운명이 정해졌습니다':'운명의 카드를 기다리며'}</h1><p>전투가 시작되기 전까지 자유롭게 대화할 수 있습니다.</p><div className="briefing-layout">{view&&confirmed?<><div className="staging-role"><CharacterCard character={view.me.character} name={view.me.characterName} title={view.me.title}/><h2>{view.sideNames[view.me.side]}</h2><p>{view.me.objective}</p></div><div className="briefing-skills">{view.me.skills.map(s=><article key={s.key}><h3><img className="briefing-skill-icon" src={skillIcon(s.key,view.me.gem)??undefined} alt=""/>{s.name}</h3><p>{s.description}</p><small>{s.passive?'패시브':`마나 ${s.mana} · 재사용 ${s.cooldown}초 · ${s.usesLeft??'무제한'}회`}</small></article>)}</div></>:<img className="waiting-card" src={`${BASE}ui/GST_CARD_BACK_COMMON_v2.webp`} alt="배분 전 카드 뒷면"/>}</div>{host&&room.stage==='assignment'&&<div className="assignment-controls"><label>플레이어 이름<select aria-label="플레이어 이름" value={room.anonymous?'anonymous':'nickname'} onChange={e=>net.send({type:'room.anonymous',enabled:e.target.value==='anonymous'})}><option value="nickname">닉네임 사용</option><option value="anonymous">익명 색상 이름 · 자리 섞기</option></select></label><button onClick={()=>net.send({type:'game.assign'})}>역할 랜덤 배분</button></div>}{host&&room.stage==='briefing'&&<button disabled={!confirmed} onClick={()=>net.send({type:'game.begin'})}>전투 준비</button>}{!host&&<p className="muted">방장의 {view?'전투 시작':'역할 배분'}을 기다립니다.</p>}{room.stage==='battleCountdown'&&<div className="countdown-strip">전투 시작 <Countdown end={room.countdownEndsAt!}/></div>}</div><RoomChat room={room}/></div>{reveal&&view&&<RoleReveal view={view} onClose={()=>{setReveal(false);setConfirmed(true);sessionStorage.setItem(`gst.confirm.${room.id}`,'1');}}/>}</div>;
}
