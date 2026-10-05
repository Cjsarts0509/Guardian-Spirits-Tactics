import { useEffect, useState } from 'react';
import type { GameEvent, PlayerView, SpectatorView } from '@gst/rules';
import type { RoomDetail, RoomSummary, ServerMessage } from '@gst/protocol';
import { net, type NetStatus } from './net.js';
import { Lobby, RoomPanel } from './Lobby.js';
import { GameScreen, SpectatorScreen } from './Game.js';

export interface Toast {
  id: number;
  text: string;
}

export function App() {
  const [status, setStatus] = useState<NetStatus>(net.status);
  const [me, setMe] = useState<{ userId: string; nickname: string } | null>(null);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [view, setView] = useState<PlayerView | SpectatorView | null>(null);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [nick, setNick] = useState(net.savedNickname());

  useEffect(() => net.onStatus(setStatus), []);
  // 새로고침: 이 탭의 세션이 남아 있으면 바로 재접속해서 같은 자리로 복귀
  useEffect(() => {
    const saved = net.savedNickname();
    if (saved && net.hasSession() && net.status === 'idle') net.connect(saved);
  }, []);
  useEffect(
    () =>
      net.on((m: ServerMessage) => {
        switch (m.type) {
          case 'welcome':
            setMe({ userId: m.userId, nickname: m.nickname });
            net.send({ type: 'room.list' });
            break;
          case 'rooms':
            setRooms(m.rooms);
            break;
          case 'room':
            setRoom(m.room);
            if (!m.room) {
              setView(null);
              setEvents([]);
              net.send({ type: 'room.list' });
            }
            break;
          case 'game':
            setView(m.view);
            setEvents((prev) => {
              // 재접속 시 전체 로그가 다시 오므로 seq 기준으로 병합
              const seen = new Set(prev.map((e) => e.seq));
              const merged = prev.concat(m.events.filter((e) => !seen.has(e.seq)));
              return merged.sort((a, b) => a.seq - b.seq);
            });
            break;
          case 'error':
          case 'action.result':
            if (m.type === 'error' || !m.ok) {
              const text = m.type === 'error' ? m.message : (m.error ?? '실패');
              const id = Date.now() + Math.random();
              setToasts((t) => [...t, { id, text }]);
              setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
            }
            break;
        }
      }),
    [],
  );

  // 방 목록 주기 갱신
  useEffect(() => {
    if (!me || room) return;
    const t = setInterval(() => net.send({ type: 'room.list' }), 4000);
    return () => clearInterval(t);
  }, [me, room]);

  let body;
  if (!me) {
    body = (
      <div className="connect">
        <h1>가디언 스피리츠 택틱스</h1>
        <p className="muted">플레이테스트 클라이언트 · 왕자들의 내전</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (nick.trim()) net.connect(nick.trim());
          }}
        >
          <input value={nick} maxLength={16} placeholder="닉네임" onChange={(e) => setNick(e.target.value)} autoFocus />
          <button disabled={!nick.trim() || status === 'connecting'}>{status === 'connecting' ? '연결 중…' : '입장'}</button>
        </form>
      </div>
    );
  } else if (view && room && room.status !== 'lobby') {
    body = 'spectator' in view ? <SpectatorScreen view={view} events={events} room={room} /> : <GameScreen view={view} events={events} room={room} myId={me.userId} />;
  } else if (room) {
    body = <RoomPanel room={room} myId={me.userId} />;
  } else {
    body = <Lobby rooms={rooms} />;
  }

  return (
    <div className="app">
      {status !== 'open' && me && <div className="banner">서버 연결이 끊겼습니다. 재연결 중…</div>}
      {body}
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}
