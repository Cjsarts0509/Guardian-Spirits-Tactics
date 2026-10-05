import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChatChannel, GameEvent, PlayerView, SkillView } from '@gst/rules';
import type { ClientAction, RoomDetail } from '@gst/protocol';
import { net } from './net.js';
import { gemIcon, portrait, skillIcon } from './icons.js';

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
  const nameOf = (k: string | null) => (k ? (roster.find((r) => r.key === k)?.name ?? k) : '—');
  const sideOf = (k: string | null) => (k ? roster.find((r) => r.key === k)?.side : undefined);

  const knowledge = useMemo(() => buildKnowledge(events, myId), [events, myId]);
  const me = view.me;
  const targetPlayer = view.players.find((p) => p.id === target) ?? null;

  const useSkill = (s: SkillView) => {
    if (s.passive || s.blocked) return;
    if (s.target !== 'none' && !target) return alertToast('먼저 대상 플레이어를 선택하세요.');
    if (s.nameOptions) return setPicking(s);
    act({ type: 'skill', skill: s.key, ...(s.target !== 'none' && target ? { target } : {}) });
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
            <div>
              <div className={`side s${me.side}`}>{view.sideNames[me.side]}</div>
              <h2>
                {me.characterName} <span className="muted">{me.title}</span>
              </h2>
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

        <main>
          <section className="players">
            {view.players.map((p) => {
              const k = knowledge.get(p.id);
              const isMe = p.id === myId;
              return (
                <button
                  key={p.id}
                  className={`pcard ${!p.alive ? 'dead' : ''} ${target === p.id ? 'selected' : ''} ${isMe ? 'mine' : ''}`}
                  onClick={() => !isMe && setTarget(target === p.id ? null : p.id)}
                >
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
                  </div>
                </button>
              );
            })}
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
                    title={`${s.description}${s.blocked ? `\n\n사용 불가: ${s.blocked}` : ''}`}
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
                    {!s.passive && (
                      <span className="sk-meta">
                        {s.mana > 0 && `마나 ${s.mana}`}
                        {s.usesLeft !== null && ` · ${s.usesLeft}회`}
                      </span>
                    )}
                    {s.passive && <span className="sk-meta">패시브</span>}
                  </button>
                );
              })}
            </div>
          </section>

          <Log events={events} myId={myId} />
          <Chat view={view} target={target} />
        </main>
      </div>

      {picking && (
        <NamePicker
          skill={picking}
          roster={roster}
          targetLabel={targetPlayer ? `[${targetPlayer.seat}] ${targetPlayer.nickname}` : ''}
          onClose={() => setPicking(null)}
          onPick={(name) => {
            act({ type: 'skill', skill: picking.key, name, ...(picking.target !== 'none' && target ? { target } : {}) });
            setPicking(null);
          }}
        />
      )}
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
