// 스킬 사용 알림 카드. 전체 공개(vis.to === 'all') 이벤트만 쓴다 — 비공개 정보는 절대 섞지 않는다.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameEvent, PlayerView, SpectatorView } from '@gst/rules';
import { gemIcon, portrait, skillIcon } from './icons.js';

type AnyView = PlayerView | SpectatorView;

interface Card {
  seq: number;
  at: number;
  title: string;
  text: string;
  icon: string | null;
  /** 관련 캐릭터 초상 (공개된 것만) */
  faces: string[];
  tone: 'info' | 'danger' | 'gold' | 'muted' | 'violet';
}

const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);

/** 카드로 보여주지 않는 이벤트 */
const SKIP = new Set(['game.start', 'game.begin', 'turn']);

function toCard(e: GameEvent, names: Record<string, string>, charName: (k: string | null) => string): Card | null {
  if (SKIP.has(e.kind) || e.kind.startsWith('chat.')) return null;
  const d = e.data ?? {};
  const text = e.text.replace(/^-/, '');
  const [head, sub] = e.kind.split('.');
  const faces: string[] = [];
  const pushFace = (c: unknown) => {
    const k = str(c);
    if (k && !faces.includes(k)) faces.push(k);
  };
  let title = '';
  let icon: string | null = null;
  let tone: Card['tone'] = 'info';

  switch (head) {
    case 'publish':
      title = '공표';
      icon = skillIcon('publish');
      tone = 'gold';
      break;
    case 'inspect':
      title = sub === 'result' ? (d.success ? '확인 성공' : '확인 실패') : '확인·스캔';
      icon = skillIcon('scan');
      tone = sub === 'result' ? (d.success ? 'info' : 'muted') : 'muted';
      break;
    case 'gem':
      title = sub === 'result' ? '보석 결과' : '진실의 보석';
      icon = gemIcon(3);
      tone = 'gold';
      break;
    case 'attack': {
      title = sub === 'kill' ? '공격 · 살해' : sub === 'hit' ? '공격 · 명중' : sub === 'guarded' ? '공격 · 방어' : sub === 'lives' ? '남은 목숨' : '공격 · 실패';
      icon = skillIcon('attack');
      tone = sub === 'kill' || sub === 'fail.death' ? 'danger' : sub === 'fail' || sub === 'guarded' ? 'muted' : 'info';
      pushFace(d.attacker);
      pushFace(d.target);
      break;
    }
    case 'death':
      title = '사망';
      icon = portrait(str(d.character));
      tone = 'danger';
      pushFace(d.character);
      break;
    case 'reveal':
      title = '정체 공개';
      icon = portrait(str(d.character));
      tone = 'gold';
      pushFace(d.character);
      break;
    case 'status':
      title = '행동 불능';
      icon = skillIcon('confusion');
      tone = 'violet';
      break;
    case 'skill': {
      const key = sub ?? '';
      title = names[key] ?? key;
      icon = skillIcon(key);
      const kill = /살해|사망|정화합니다/.test(text);
      const fail = /실패|아닙니다/.test(text);
      tone = kill ? 'danger' : fail ? 'muted' : 'info';
      pushFace(d.character);
      pushFace(d.attacker);
      break;
    }
    case 'game':
      title = '게임 종료';
      tone = 'gold';
      break;
    case 'role':
      title = '내 역할';
      icon = portrait(str(d.character));
      tone = 'gold';
      break;
    case 'probe':
      title = '탐색 결과';
      icon = skillIcon('scan');
      tone = d.success ? 'info' : 'muted';
      break;
    case 'ally':
      title = sub?.includes('unset') ? '동맹 파기' : '동맹';
      icon = skillIcon(sub?.includes('unset') ? 'break_ally' : 'ally');
      tone = sub?.includes('unset') ? 'muted' : 'info';
      break;
    default:
      title = head ?? '';
  }
  // 초상은 '캐릭터 이름'이 공개된 것이므로 그대로 보여줘도 된다 (플레이어와의 연결은 텍스트에 있는 것만)
  return { seq: e.seq, at: e.at, title: title || charName(null), text, icon, faces, tone };
}

export function Feed({ view, events, myId }: { view: AnyView; events: GameEvent[]; myId?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<'public' | 'mine'>('public');
  const names = useMemo(() => {
    const start = events.find((e) => e.kind === 'game.start');
    const n = start?.data?.skillNames;
    return (n && typeof n === 'object' ? (n as Record<string, string>) : {}) as Record<string, string>;
  }, [events]);
  const charName = (k: string | null) => (k ? (view.roster.find((r) => r.key === k)?.name ?? k) : '');
  // 공개 탭: 전체 공개 이벤트. 내 정보 탭: 나한테만 온 비공개 결과 (게임 끝난 뒤 공개되는 남의 비공개는 '복기')
  const cards = useMemo(() => {
    const out: (Card & { replay?: boolean })[] = [];
    for (const e of events) {
      const pub = e.vis.to === 'all';
      if (tab === 'public' ? !pub : pub) continue;
      if (tab === 'mine' && !myId) continue;
      const c = toCard(e, names, charName);
      if (!c) continue;
      const replay = tab === 'mine' && ((e.vis.to === 'players' && !e.vis.ids.includes(myId!)) || e.vis.to === 'dead');
      out.push(replay ? { ...c, replay } : c);
    }
    return out;
  }, [events, names, tab, myId]); // eslint-disable-line react-hooks/exhaustive-deps
  const myCount = useMemo(() => (myId ? events.filter((e) => e.vis.to === 'players' && e.vis.ids.includes(myId) && !e.kind.startsWith('chat.')).length : 0), [events, myId]);
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [cards.length, tab]);
  return (
    <section className="feed card">
      <div className="feed-head">
        {myId ? (
          <div className="tabs feed-tabs">
            <button className={tab === 'public' ? 'on' : ''} onClick={() => setTab('public')}>
              공개 행동
            </button>
            <button className={tab === 'mine' ? 'on' : ''} onClick={() => setTab('mine')}>
              내 정보 <span className="muted small">{myCount}</span>
            </button>
          </div>
        ) : (
          <>
            <b>알림</b> <span className="muted small">공개된 행동만</span>
          </>
        )}
      </div>
      <div className="feed-list" ref={box}>
        {cards.length === 0 && <div className="muted small">{tab === 'mine' ? '아직 받은 비공개 정보가 없습니다.' : '아직 공개된 행동이 없습니다.'}</div>}
        {cards.map((c) => (
          <div key={c.seq} className={`ncard t-${c.tone} ${tab === 'mine' ? 'mine' : ''} ${c.replay ? 'replay' : ''}`}>
            <span className="n-icon">{c.icon ? <img src={c.icon} alt="" /> : <span className="n-noicon">{c.title.slice(0, 1)}</span>}</span>
            <div className="n-body">
              <div className="n-top">
                <b>{c.title}</b>
                <span className="n-time">{fmt(c.at)}</span>
              </div>
              <div className="n-text">
                {c.replay && <span className="tag">복기</span>} {c.text}
              </div>
              {c.faces.length > 0 && (
                <div className="n-faces">
                  {c.faces.map((k) => {
                    const p = portrait(k);
                    return (
                      <span key={k} className="n-face" title={charName(k)}>
                        {p ? <img src={p} alt="" /> : null} {charName(k)}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
