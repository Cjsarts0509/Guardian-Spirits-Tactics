import { useState } from 'react';
import type { RoomDetail, RoomSummary } from '@gst/protocol';
import { net } from './net.js';

export function Lobby({ rooms }: { rooms: RoomSummary[] }) {
  const [name, setName] = useState('가택 한 판');
  const [turn, setTurn] = useState<60 | 90 | 120>(90);
  return (
    <div className="lobby">
      <section className="card">
        <h2>방 만들기</h2>
        <div className="row">
          <input value={name} maxLength={30} onChange={(e) => setName(e.target.value)} />
          <select value={turn} onChange={(e) => setTurn(Number(e.target.value) as 60 | 90 | 120)}>
            <option value={60}>턴 60초</option>
            <option value={90}>턴 90초 (원본)</option>
            <option value={120}>턴 120초</option>
          </select>
          <button onClick={() => net.send({ type: 'room.create', name: name.trim() || '가택', mode: 'civil_war', turnSeconds: turn })}>만들기</button>
        </div>
      </section>
      <section className="card">
        <div className="row spread">
          <h2>열린 방</h2>
          <button className="ghost" onClick={() => net.send({ type: 'room.list' })}>새로고침</button>
        </div>
        {rooms.length === 0 && <p className="muted">열린 방이 없습니다.</p>}
        <ul className="rooms">
          {rooms.map((r) => (
            <li key={r.id}>
              <span>
                <b>{r.name}</b> <span className="muted">· {r.modeName}</span>
              </span>
              <span className="muted">
                {r.players}/{r.maxPlayers} · {r.status === 'lobby' ? '대기 중' : '진행 중'}
              </span>
              <button disabled={r.status !== 'lobby'} onClick={() => net.send({ type: 'room.join', roomId: r.id })}>
                입장
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function RoomPanel({ room, myId }: { room: RoomDetail; myId: string }) {
  const isHost = room.hostId === myId;
  const missing = Math.max(0, room.minPlayers - room.members.length);
  return (
    <div className="lobby">
      <section className="card">
        <div className="row spread">
          <h2>
            {room.name} <span className="muted">· {room.modeName} · 턴 {room.turnSeconds}초</span>
          </h2>
          <button className="ghost" onClick={() => net.send({ type: 'room.leave' })}>나가기</button>
        </div>
        <ol className="members">
          {room.members.map((m) => (
            <li key={m.id}>
              {m.nickname} {m.bot && <span className="tag">봇</span>} {m.id === room.hostId && <span className="tag">방장</span>}{' '}
              {!m.connected && <span className="tag warn">연결 끊김</span>}
            </li>
          ))}
        </ol>
        <p className="muted">
          {room.members.length}/{room.maxPlayers}명 · {missing > 0 ? `시작까지 ${missing}명 더 필요` : '시작 가능'}
        </p>
        {isHost && (
          <div className="row">
            {room.botsAllowed && (
              <>
                <button className="ghost" disabled={room.members.length >= room.maxPlayers} onClick={() => net.send({ type: 'room.addBots', count: Math.max(1, missing) })}>
                  봇으로 채우기 (+{Math.max(1, missing)})
                </button>
                <button className="ghost" onClick={() => net.send({ type: 'room.addBots', count: 12 - room.members.length || 1 })}>
                  봇 12인까지
                </button>
                <button className="ghost" onClick={() => net.send({ type: 'room.removeBots' })}>봇 제거</button>
              </>
            )}
            <button disabled={missing > 0} onClick={() => net.send({ type: 'room.start' })}>
              시작
            </button>
            {room.botsAllowed && (
              <button className="ghost" title="사람은 모두 관전, 봇 12명이 플레이 (테스트용)" onClick={() => net.send({ type: 'room.start', aiOnly: true })}>
                AI만 돌리기 (관전)
              </button>
            )}
          </div>
        )}
        {!isHost && <p className="muted">방장이 시작하기를 기다리는 중…</p>}
      </section>
    </div>
  );
}
