import { useEffect, useState } from 'react';
import type { GameEvent, PlayerView, SpectatorView } from '@gst/rules';
import type { RoomDetail, RoomSummary, ServerMessage } from '@gst/protocol';
import { net, type NetStatus } from './net.js';
import { Lobby, RoomPanel } from './Lobby.js';
import { GameScreen, SpectatorScreen } from './Game.js';
import { MainScreen, connectAs } from './Welcome.js';
import { currentToken, loadConfig, savedSession } from './auth.js';
import { bgm, type TrackId } from './bgm.js';

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
    if (!net.hasSession() || net.status !== 'idle') return;
    const login = savedSession();
    if (login) {
      loadConfig().then(async (c) => {
        const s = await currentToken(c.auth);
        if (s) connectAs(c, s);
      });
      return;
    }
    const saved = net.savedNickname();
    if (saved) net.connect(saved);
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

  // 배경음악: 게임 중엔 모드 곡, 그 외엔 메인 테마
  useEffect(() => {
    const inGame = !!(view && room && room.status !== 'lobby');
    const modes: string[] = ['civil_war', 'primordial', 'lidellut', 'troll'];
    const id: TrackId = inGame && view && modes.includes(view.mode) ? (view.mode as TrackId) : 'main';
    void bgm.play(id);
  }, [view, room]);

  // 방 목록 주기 갱신
  useEffect(() => {
    if (!me || room) return;
    const t = setInterval(() => net.send({ type: 'room.list' }), 4000);
    return () => clearInterval(t);
  }, [me, room]);

  let body;
  if (!me) {
    body = <MainScreen status={status} nick={nick} setNick={setNick} />;
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
      {room?.hosting === 'player' && room.status === 'playing' && <div className="banner">{room.hostPaused ? '방장 연결을 기다리고 있습니다. 게임은 잠시 멈춥니다.' : `방장: ${room.members.find(m => m.id === room.hostId)?.nickname ?? '연결 중'}`}</div>}
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
