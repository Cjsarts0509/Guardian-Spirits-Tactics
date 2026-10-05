import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { ChatChannel, GameEvent, PlayerView, SkillView, SpectatorView } from '@gst/rules';
import type { ClientAction, RoomDetail } from '@gst/protocol';
import { net } from './net.js';
import { gemIcon, portrait, skillIcon } from './icons.js';
import { fxFor, type Fx } from './fx.js';

type Roster = PlayerView['roster'];

function useNow(ms = 250) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

let refSeq = 0;
function act(action: ClientAction) {
  net.send({ type: 'game.action', action, ref: ++refSeq });
}

export function SpectatorScreen({ view, events, room }: { view: SpectatorView; events: GameEvent[]; room: RoomDetail }) {
  const now = useNow();
  const receivedAt = useRef(Date.now());
  const lastView = useRef(view);
  if (lastView.current !== view) {
    lastView.current = view;
    receivedAt.current = Date.now();
  }
  const sinceView = now - receivedAt.current;
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [events.length]);
  const label = (id: string) => {
    const p = view.players.find((x) => x.id === id);
    return p ? `[${p.seat}]` : id;
  };
  return (
    <div className="game">
      <header className="topbar">
        <div>
          <b>{view.modeName}</b> <span className="muted">· {room.name} · 관전 (AI 전용)</span>
        </div>
        {view.phase === 'running' ? (
          <div className="turn">
            턴 {view.turn} · 다음 턴 <b>{fmt(view.nextTurnInMs - sinceView)}</b> · 경과 {fmt(view.elapsedMs + sinceView)}
          </div>
        ) : (
          <div className="turn end">
            게임 종료 — <b>{view.winner ? view.sideNames[view.winner] : ''}</b> 승리
          </div>
        )}
        <button className="ghost" onClick={() => net.send({ type: 'room.leave' })}>
          나가기
        </button>
      </header>
      <div className="layout spectate">
        <section className="center">
          <section className="log card">
            <div className="tabs">
              <span className="muted small" style={{ padding: '4px 6px' }}>전체 로그 (비공개 이벤트는 받는 사람 표시)</span>
            </div>
            <div className="entries" ref={box}>
              {events.map((e) => (
                <div key={e.seq} className={`entry ${e.vis.to !== 'all' ? 'private' : ''} k-${e.kind.split('.')[0]}`}>
                  <span className="time">{fmt(e.at)}</span>
                  <span className="text">
                    {e.vis.to === 'players' && <span className="tag">{e.vis.ids.map(label).join(' ')}</span>}
                    {e.vis.to === 'dead' && <span className="tag">사망자</span>} {e.text}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </section>
        <main>
          <section className="players" style={{ gridTemplateColumns: `repeat(${Math.ceil(view.players.length / 2)}, minmax(0, 1fr))` }}>
            {view.players.map((p) => (
              <div key={p.id} className={`pcard spec ${!p.alive ? 'dead' : ''}`}>
                <Face character={p.character} size="sm" dead={!p.alive} />
                <div className="pc-body">
                  <div className="pc-top">
                    <span className="seat">[{p.seat}]</span> {p.nickname}
                  </div>
                  <div className={`pc-rev s${p.side}`}>
                    {p.characterName} <span className="muted">· {view.sideNames[p.side]}</span>
                  </div>
                  <div className="pc-pub">공표: {p.published ? (view.roster.find((r) => r.key === p.published)?.name ?? p.published) : '—'}</div>
                  <div className="muted small">
                    마나 {p.mana} · 보석 {p.gem} · 목숨 +{p.extraLives} · 동맹 {p.allies.map(label).join(' ') || '없음'}
                  </div>
                  <div className="pc-tags">
                    {p.skills
                      .filter((sk) => !sk.passive)
                      .map((sk) => {
                        const cd = Math.max(0, sk.cooldownRemainingMs - sinceView);
                        return (
                          <span key={sk.key} className={`tag ${cd > 0 ? '' : 'ready'}`}>
                            {sk.name}
                            {sk.usesLeft !== null ? ` ${sk.usesLeft}회` : ''}
                            {cd > 0 ? ` ${Math.ceil(cd / 1000)}s` : ''}
                          </span>
                        );
                      })}
                    {p.statuses.map((st, i) => (
                      <span key={i} className="tag warn">
                        {st.kind === 'incapacitated' ? '행동불능' : '무적'}
                      </span>
                    ))}
                    {!p.alive && <span className="tag">사망</span>}
                  </div>
                </div>
              </div>
            ))}
          </section>
        </main>
      </div>
    </div>
  );
}

export function GameScreen({ view, events, room, myId }: { view: PlayerView; events: GameEvent[]; room: RoomDetail; myId: string }) {
  const now = useNow();
  const receivedAt = useRef(Date.now());
  const lastView = useRef(view);
  if (lastView.current !== view) {
    lastView.current = view;
    receivedAt.current = Date.now();
  }
  const sinceView = now - receivedAt.current;

  const [target, setTarget] = useState<string | null>(null);
  const [picking, setPicking] = useState<SkillView | null>(null);
  const roster = view.roster;
  const lastAction = useRef<{ skill: string; target?: string; at: number } | null>(null);
  const sendSkill = (skill: string, t?: string, name?: string) => {
    lastAction.current = { skill, ...(t ? { target: t } : {}), at: Date.now() };
    act({ type: 'skill', skill, ...(t ? { target: t } : {}), ...(name ? { name } : {}) });
  };
  const nameOf = (k: string | null) => (k ? (roster.find((r) => r.key === k)?.name ?? k) : '—');
  const sideOf = (k: string | null) => (k ? roster.find((r) => r.key === k)?.side : undefined);

  const knowledge = useMemo(() => buildKnowledge(events, myId), [events, myId]);
  // 플레이어별 메모 (내 브라우저에만 저장, 방 단위)
  const memoKey = `gst.memo.${room.id}`;
  const [memos, setMemos] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem(memoKey) ?? '{}') as Record<string, string>;
    } catch {
      return {};
    }
  });
  const [editingMemo, setEditingMemo] = useState<string | null>(null);
  const setMemo = (pid: string, text: string) => {
    setMemos((m) => {
      const next = { ...m, [pid]: text };
      if (!text) delete next[pid];
      try {
        localStorage.setItem(memoKey, JSON.stringify(next));
      } catch {
        /* 저장 불가 환경 */
      }
      return next;
    });
  };
  const me = view.me;
  const targetPlayer = view.players.find((p) => p.id === target) ?? null;

  // 화면 효과: 새 이벤트마다 fx 를 만들고 잠시 뒤 지운다
  const [fx, setFx] = useState<Fx[]>([]);
  const fxSeq = useRef(0);
  useEffect(() => {
    const fresh = events.filter((e) => e.seq > fxSeq.current);
    if (fresh.length === 0) return;
    fxSeq.current = events[events.length - 1]!.seq;
    if (fresh.length > 12) return; // 재접속·복기처럼 한꺼번에 오면 효과 생략
    const playerOf = (c: string) => {
      const pub = view.players.find((p) => p.revealed === c);
      if (pub) return pub.id;
      for (const [pid, k] of knowledge) if (k.character === c) return pid;
      return c === me.character ? myId : null;
    };
    const items = fresh.flatMap((e) => fxFor(e, { myId, lastAction: lastAction.current, playerOf, view }));
    if (items.length === 0) return;
    setFx((cur) => [...cur, ...items]);
    const ids = new Set(items.map((i) => i.id));
    setTimeout(() => setFx((cur) => cur.filter((i) => !ids.has(i.id))), 2600);
  }, [events, view, knowledge, me.character, myId]);

  const useSkill = (s: SkillView) => {
    if (s.passive || s.blocked) return;
    if (s.target !== 'none' && !target) return alertToast('먼저 대상 플레이어를 선택하세요.');
    if (s.nameOptions) return setPicking(s);
    sendSkill(s.key, s.target !== 'none' && target ? target : undefined);
  };

  return (
    <div className="game">
      <header className="topbar">
        <div>
          <b>{view.modeName}</b> <span className="muted">· {room.name}</span>
        </div>
        {view.phase === 'running' ? (
          <div className="turn">
            턴 {view.turn} · 다음 턴 <b>{fmt(view.nextTurnInMs - sinceView)}</b> · 경과 {fmt(view.elapsedMs + sinceView)}
          </div>
        ) : (
          <div className="turn end">
            게임 종료 — <b>{view.winner ? view.sideNames[view.winner] : ''}</b> 승리
          </div>
        )}
        <button className="ghost" onClick={() => confirm('방에서 나갈까요? 진행 중이면 사망 처리됩니다.') && net.send({ type: 'room.leave' })}>
          나가기
        </button>
      </header>

      <div className="layout">
        <aside className="me card">
          <div className="me-head">
            <Face character={me.character} size="lg" dead={!me.alive} />
            <div className="me-title">
              <div className={`side s${me.side}`}>{view.sideNames[me.side]}</div>
              <div className="muted title">{me.title}</div>
              <h2>{me.characterName}</h2>
            </div>
          </div>
          {!me.alive && <div className="dead-banner">사망</div>}
          <p className="objective">{me.objective}</p>
          <div className="bar">
            <div className="fill" style={{ width: `${(me.mana / me.maxMana) * 100}%` }} />
            <span>
              마나 {me.mana}/{me.maxMana}
            </span>
          </div>
          <dl>
            <dt>공표</dt>
            <dd className={me.trueName ? 'truename' : ''}>
              {nameOf(me.published)} {me.trueName && '(진명)'}
            </dd>
            <dt>진실의 보석</dt>
            <dd className="gem">
              {gemIcon(me.gem) && <img src={gemIcon(me.gem)!} alt="" />}
              {['없음', '조각 1/3', '조각 2/3', '완성'][me.gem]}
            </dd>
            <dt>추가 목숨</dt>
            <dd>{me.extraLives}</dd>
            <dt>다음 턴 마나</dt>
            <dd>+{me.nextTurnManaPreview}</dd>
            <dt>나에게 동맹</dt>
            <dd>{me.alliedBy.map((id) => label(view, id)).join(', ') || '없음'}</dd>
            <dt>내가 건 동맹</dt>
            <dd>{me.allies.map((id) => label(view, id)).join(', ') || '없음'}</dd>
            {me.effects.length > 0 && (
              <>
                <dt>상태</dt>
                <dd>{me.effects.map((e) => `${e.kind === 'incapacitated' ? '행동불능' : '무적'} ${fmt(e.remainingMs - sinceView)}`).join(', ')}</dd>
              </>
            )}
          </dl>
        </aside>

        <section className="center">
          <Log events={events} myId={myId} />
          <Chat view={view} target={target} />
        </section>

        <main>
          <section className="players-wrap">
          <FxLayer fx={fx} />
          <section className="players" style={{ gridTemplateColumns: `repeat(${Math.ceil(view.players.length / 2)}, minmax(0, 1fr))` }}>
            {view.players.map((p) => {
              const k = knowledge.get(p.id);
              const isMe = p.id === myId;
              const hit = fx.find((f): f is Extract<Fx, { type: 'pulse' }> => f.type === 'pulse' && f.to === p.id);
              return (
                <div
                  key={p.id}
                  data-player={p.id}
                  role="button"
                  tabIndex={0}
                  className={`pcard ${!p.alive ? 'dead' : ''} ${target === p.id ? 'selected' : ''} ${isMe ? 'mine' : ''} ${hit ? `hit hit-${hit.color} ${hit.big ? 'big' : ''}` : ''}`}
                  onClick={() => !isMe && setTarget(target === p.id ? null : p.id)}
                >
                  {hit?.label && <span className={`fx-label c-${hit.color}`} key={hit.id}>{hit.label}</span>}
                  <Face character={p.revealed ?? k?.character ?? null} size="sm" dead={!p.alive} />
                  <div className="pc-body">
                  <div className="pc-top">
                    <span className="seat">[{p.seat}]</span> {p.nickname} {isMe && <span className="tag">나</span>}
                  </div>
                  <div className={`pc-pub s${sideOf(p.published) ?? 0}`}>공표: {nameOf(p.published)}</div>
                  {p.revealed && <div className={`pc-rev s${p.revealedSide}`}>정체: {nameOf(p.revealed)}</div>}
                  {!p.revealed && k?.character && <div className="pc-known">확인: {nameOf(k.character)}</div>}
                  {!p.revealed && k?.commander && <div className="pc-known">확인: 지휘관</div>}
                  {!p.revealed && k && k.not.length > 0 && <div className="pc-not">아님: {k.not.map(nameOf).join(', ')}</div>}
                  <div className="pc-tags">
                    {me.alliedBy.includes(p.id) && <span className="tag">→나</span>}
                    {me.allies.includes(p.id) && <span className="tag">나→</span>}
                    {p.statuses.map((s, i) => (
                      <span key={i} className="tag warn">
                        {s.kind === 'incapacitated' ? '행동불능' : '무적'}
                      </span>
                    ))}
                    {!p.alive && <span className="tag">사망</span>}
                    {p.left && <span className="tag">이탈</span>}
                  </div>
                  {!isMe && (
                    <div className="memo" onClick={(e) => e.stopPropagation()}>
                      {editingMemo === p.id ? (
                        <input
                          autoFocus
                          maxLength={40}
                          defaultValue={memos[p.id] ?? ''}
                          placeholder="메모 (나만 봄)"
                          onBlur={(e) => (setMemo(p.id, e.target.value.trim()), setEditingMemo(null))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                            if (e.key === 'Escape') setEditingMemo(null);
                          }}
                        />
                      ) : (
                        <span className={`memo-text ${memos[p.id] ? '' : 'empty'}`} onClick={() => setEditingMemo(p.id)} title="클릭해서 메모">
                          {memos[p.id] ? `✎ ${memos[p.id]}` : '✎ 메모'}
                        </span>
                      )}
                    </div>
                  )}
                  </div>
                </div>
              );
            })}
          </section>
          </section>

          <section className="skills card">
            <div className="muted small">
              대상: <b>{targetPlayer ? `[${targetPlayer.seat}] ${targetPlayer.nickname}` : '없음'}</b> (카드를 눌러 선택)
            </div>
            <div className="skillbar">
              {me.skills.map((s) => {
                const cd = Math.max(0, s.cooldownRemainingMs - sinceView);
                const icon = skillIcon(s.key, me.gem);
                return (
                  <button
                    key={s.key}
                    className={`skill ${s.passive ? 'passive' : ''}`}
                    disabled={!s.passive && (!!s.blocked && !(s.blocked.startsWith('재사용') && cd <= 0))}
                    onClick={() => useSkill(s)}
                  >
                    <span className="sk-icon">
                      {icon ? <img src={icon} alt="" /> : <span className="sk-noicon">{s.name.slice(0, 1)}</span>}
                      {cd > 0 && s.cooldown > 0 && (
                        <span className="sk-cd" style={{ ['--p' as string]: `${Math.min(1, cd / (s.cooldown * 1000)) * 360}deg` }}>
                          {Math.ceil(cd / 1000)}
                        </span>
                      )}
                    </span>
                    <span className="sk-name">
                      {s.hotkey && <kbd>{s.hotkey}</kbd>} {s.name}
                      {s.key === 'advanced_attack' && s.level === 2 && <span className="tag warn">경고</span>}
                    </span>
                    <span className="sk-meta">
                      {s.passive ? (
                        <span className="sk-stat">패시브</span>
                      ) : (
                        <>
                          <span className="sk-stat">마나 {s.mana}</span>
                          <span className="sk-stat">쿨 {s.cooldown > 0 ? `${s.cooldown}초` : '없음'}</span>
                          <span className="sk-stat">{s.usesLeft !== null ? `${s.usesLeft}회` : '무한'}</span>
                        </>
                      )}
                    </span>
                    <span className="sk-desc">{s.description}</span>
                    <span className="sk-blocked">{s.blocked ?? ''}</span>
                  </button>
                );
              })}
            </div>
          </section>

        </main>
      </div>

      {picking && (
        <NamePicker
          skill={picking}
          roster={roster}
          targetLabel={targetPlayer ? `[${targetPlayer.seat}] ${targetPlayer.nickname}` : ''}
          onClose={() => setPicking(null)}
          onPick={(name) => {
            sendSkill(picking.key, picking.target !== 'none' && target ? target : undefined, name);
            setPicking(null);
          }}
        />
      )}
    </div>
  );
}

/** 카드 사이를 날아가는 아이콘과 중앙 배너 */
function FxLayer({ fx }: { fx: Fx[] }) {
  const layer = useRef<HTMLDivElement>(null);
  const flies = fx.filter((f): f is Extract<Fx, { type: 'fly' }> => f.type === 'fly');
  const banners = fx.filter((f): f is Extract<Fx, { type: 'banner' }> => f.type === 'banner');
  return (
    <div className="fx-layer" ref={layer}>
      {flies.map((f) => (
        <Projectile key={f.id} fx={f} layer={layer} />
      ))}
      {banners.map((b, i) => (
        <div key={b.id} className={`fx-banner c-${b.color}`} style={{ top: `${12 + i * 56}px` }}>
          {b.left && <img src={b.left} alt="" />}
          <span>{b.text}</span>
          {b.right && <img src={b.right} alt="" />}
        </div>
      ))}
    </div>
  );
}

function Projectile({ fx, layer }: { fx: Extract<Fx, { type: 'fly' }>; layer: RefObject<HTMLDivElement | null> }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = layer.current;
    const node = el.current;
    if (!box || !node) return;
    const base = box.getBoundingClientRect();
    const center = (id: string | null) => {
      const card = id ? box.parentElement?.querySelector<HTMLElement>(`[data-player="${CSS.escape(id)}"]`) : null;
      if (!card) return { x: base.width / 2, y: -40 }; // 출처 불명: 위쪽 중앙에서
      const r = card.getBoundingClientRect();
      return { x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height / 2 };
    };
    const a = center(fx.from);
    const b = center(fx.to);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    const dur = Math.min(900, 350 + dist * 0.9);
    node.style.left = `${a.x}px`;
    node.style.top = `${a.y}px`;
    node.animate(
      [
        { transform: 'translate(-50%,-50%) scale(0.4)', opacity: 0, offset: 0 },
        { transform: 'translate(-50%,-50%) scale(1.15)', opacity: 1, offset: 0.12 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1)`, opacity: 1, offset: 0.9 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1.6)`, opacity: 0, offset: 1 },
      ],
      { duration: dur, easing: 'cubic-bezier(.3,.1,.3,1)', fill: 'forwards' },
    );
  }, [fx, layer]);
  return (
    <div ref={el} className={`fx-fly c-${fx.color}`}>
      {fx.icon ? <img src={fx.icon} alt="" /> : <span>?</span>}
      {fx.label && <em>{fx.label}</em>}
    </div>
  );
}

/** 초상화. 모르는 캐릭터면 물음표 실루엣 */
function Face({ character, size, dead = false }: { character: string | null; size: 'sm' | 'lg'; dead?: boolean }) {
  const src = portrait(character, size === 'lg' ? 256 : 128);
  return (
    <span className={`face ${size} ${dead ? 'dead' : ''} ${src ? '' : 'unknown'}`}>{src ? <img src={src} alt="" /> : '?'}</span>
  );
}

function label(view: PlayerView, id: string) {
  const p = view.players.find((x) => x.id === id);
  return p ? `[${p.seat}] ${p.nickname}` : id;
}

function alertToast(text: string) {
  alert(text);
}

function NamePicker({
  skill,
  roster,
  targetLabel,
  onPick,
  onClose,
}: {
  skill: SkillView;
  roster: Roster;
  targetLabel: string;
  onPick: (k: string) => void;
  onClose: () => void;
}) {
  const options = (skill.nameOptions ?? []).map((k) => roster.find((r) => r.key === k)!).filter(Boolean);
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-body card" onClick={(e) => e.stopPropagation()}>
        <h3>
          {skill.name} {targetLabel && <span className="muted">→ {targetLabel}</span>}
        </h3>
        <div className="names">
          {options.map((r) => (
            <button key={r.key} className={`name s${r.side}`} onClick={() => onPick(r.key)}>
              <Face character={r.key} size="sm" />
              <span className="name-text">
                {r.name}
                <span className="muted small">{r.title}</span>
              </span>
            </button>
          ))}
        </div>
        <button className="ghost" onClick={onClose}>
          취소
        </button>
      </div>
    </div>
  );
}

function Log({ events, myId }: { events: GameEvent[]; myId: string }) {
  const [tab, setTab] = useState<'all' | 'private' | 'chat'>('all');
  const box = useRef<HTMLDivElement>(null);
  const filtered = events.filter((e) => {
    const chat = e.kind.startsWith('chat.');
    if (tab === 'chat') return chat;
    if (tab === 'private') return !chat && e.vis.to === 'players' && e.vis.ids.includes(myId);
    return true;
  });
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [filtered.length, tab]);
  return (
    <section className="log card">
      <div className="tabs">
        {(['all', 'private', 'chat'] as const).map((t) => (
          <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
            {{ all: '전체', private: '내 정보', chat: '채팅' }[t]}
          </button>
        ))}
      </div>
      <div className="entries" ref={box}>
        {filtered.map((e) => {
          // 게임 종료 후 공개된 남의 비공개 이벤트는 '복기' 표시
          const replay = (e.vis.to === 'players' && !e.vis.ids.includes(myId)) || e.vis.to === 'dead';
          return (
            <div key={e.seq} className={`entry ${e.vis.to !== 'all' ? 'private' : ''} ${replay ? 'replay' : ''} k-${e.kind.split('.')[0]}`}>
              <span className="time">{fmt(e.at)}</span>
              <span className="text">
                {replay && <span className="tag">복기</span>} {e.text}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Chat({ view, target }: { view: PlayerView; target: string | null }) {
  const [text, setText] = useState('');
  const canGlobal = view.me.skills.some((s) => s.key === 'global_chat');
  const [channel, setChannel] = useState<ChatChannel>('all');
  const effective: ChatChannel = !view.me.alive ? 'dead' : channel;
  return (
    <form
      className="chat"
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        if (effective === 'whisper' && !target) return alert('귓속말 대상을 카드에서 선택하세요.');
        act({ type: 'chat', channel: effective, text: text.trim(), ...(effective === 'whisper' && target ? { to: target } : {}) });
        setText('');
      }}
    >
      <select value={effective} disabled={!view.me.alive} onChange={(e) => setChannel(e.target.value as ChatChannel)}>
        <option value="all">전체</option>
        <option value="ally">동맹</option>
        <option value="whisper">귓속말(선택 대상)</option>
        {canGlobal && <option value="global">전체 방송(마나 35)</option>}
        {!view.me.alive && <option value="dead">사망자</option>}
      </select>
      <input value={text} maxLength={200} onChange={(e) => setText(e.target.value)} placeholder="메시지" />
      <button>보내기</button>
    </form>
  );
}

/** 내가 볼 수 있는 이벤트의 확정 정보(facts)로 플레이어별 추리 상태를 만든다 */
function buildKnowledge(events: GameEvent[], myId: string) {
  const m = new Map<string, { character: string | null; commander: boolean; not: string[] }>();
  for (const e of events) {
    if (e.vis.to !== 'players' || !e.vis.ids.includes(myId)) continue;
    for (const f of e.facts ?? []) {
      const cur = m.get(f.player) ?? { character: null, commander: false, not: [] };
      if (f.character) cur.character = f.character;
      if (f.commander) cur.commander = true;
      if (f.not && !cur.not.includes(f.not)) cur.not.push(f.not);
      m.set(f.player, cur);
    }
  }
  return m;
}
