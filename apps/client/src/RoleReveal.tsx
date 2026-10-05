// 게임 시작 직후: 역할 배분 연출 (초상 셔플 → 내 캐릭터 공개)
import { useEffect, useState } from 'react';
import type { PlayerView } from '@gst/rules';
import { portrait } from './icons.js';

const SHUFFLE_MS = 2200;
const AUTO_CLOSE_MS = 14000;

export function RoleReveal({ view, onClose }: { view: PlayerView; onClose: () => void }) {
  const me = view.me;
  const roster = view.roster.filter((r) => r.inGame);
  const [phase, setPhase] = useState<'shuffle' | 'reveal'>('shuffle');
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t0 = Date.now();
    const tick = setInterval(() => {
      setIdx((i) => (i + 1) % roster.length);
      if (Date.now() - t0 >= SHUFFLE_MS) {
        clearInterval(tick);
        setPhase('reveal');
      }
    }, 90);
    return () => clearInterval(tick);
  }, [roster.length]);
  useEffect(() => {
    if (phase !== 'reveal') return;
    const t = setTimeout(onClose, AUTO_CLOSE_MS);
    return () => clearTimeout(t);
  }, [phase, onClose]);

  const shown = phase === 'shuffle' ? roster[idx] : null;
  const src = phase === 'shuffle' ? portrait(shown?.key ?? null, 256) : portrait(me.character, 256);
  return (
    <div className={`reveal ${phase}`} onClick={phase === 'reveal' ? onClose : undefined}>
      <div className="reveal-body" onClick={(e) => e.stopPropagation()}>
        <div className="reveal-kicker">{phase === 'shuffle' ? '역할을 배분하는 중…' : `당신의 역할 · ${view.sideNames[me.side]}`}</div>
        <div className={`reveal-face s${phase === 'reveal' ? me.side : 0}`}>{src ? <img src={src} alt="" /> : <span>?</span>}</div>
        {phase === 'shuffle' ? (
          <div className="reveal-name muted">{shown?.name ?? ''}</div>
        ) : (
          <>
            <div className="reveal-title muted">{me.title}</div>
            <div className={`reveal-name s${me.side}`}>{me.characterName}</div>
            <p className="reveal-objective">{me.objective}</p>
            <div className="reveal-skills">
              {me.skills
                .filter((s) => !['publish', 'ally', 'break_ally'].includes(s.key))
                .map((s) => (
                  <span key={s.key} className={`tag ${s.passive ? '' : 'ready'}`}>
                    {s.name}
                  </span>
                ))}
            </div>
            <button onClick={onClose}>게임 시작</button>
            <div className="muted small">클릭하거나 잠시 뒤 자동으로 닫힙니다 · 역할은 왼쪽 패널에서 언제든 다시 볼 수 있습니다</div>
          </>
        )}
      </div>
    </div>
  );
}
