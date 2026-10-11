// 게임 시작 직후: 역할 배분 연출 (초상 셔플 → 내 캐릭터 공개)
import { useEffect, useState } from 'react';
import type { PlayerView } from '@gst/rules';
import { CharacterCard } from './art.js';
import { SubLogo } from './Logo.js';

const SHUFFLE_MS = 2200;


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


  void idx;
  const backs: Record<string,string> = {civil_war:'MODE01_CIVIL_WAR',primordial:'MODE02_WAR_OF_BEGINNING',lidellut:'MODE03_LIDELLUT_WASTES',troll:'MODE04_TROLL_REBELLION'};
  return (
    <div className={`reveal ${phase}`}>
      <div className="reveal-body" onClick={(e) => e.stopPropagation()}>
        <SubLogo className="reveal-logo" />
        <div className="reveal-kicker">{phase === 'shuffle' ? '역할을 배분하는 중…' : `당신의 역할 · ${view.sideNames[me.side]}`}</div>
        <div className="reveal-card">{phase === 'shuffle' ? <div className="card-shuffle">{[0,1,2].map(i => <img key={i} src={`${import.meta.env.BASE_URL}ui/GST_CARD_BACK_${backs[view.mode]}_v2.webp`} alt="카드 뒷면" />)}</div> : <CharacterCard character={me.character} name={me.characterName} title={me.title}/>}</div>
        {phase === 'shuffle' ? (
          <div className="reveal-name muted">비밀의 운명이 섞이고 있습니다</div>
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
            <button onClick={onClose}>역할 확인</button>
            <div className="muted small">역할 확인을 누르면 전투 준비 화면으로 돌아갑니다</div>
          </>
        )}
      </div>
    </div>
  );
}
