// 배경음악 컨트롤 (음소거 토글 + 볼륨)
import { useEffect, useState } from 'react';
import { bgm, TRACK_NAMES } from './bgm.js';

export function BgmControl({ compact = false }: { compact?: boolean }) {
  const [, tick] = useState(0);
  useEffect(() => bgm.on(() => tick((n) => n + 1)), []);
  const id = bgm.playingId;
  const off = bgm.muted || bgm.volume === 0;
  return (
    <span className={`bgm ${compact ? 'compact' : ''}`} title={id ? `BGM · ${TRACK_NAMES[id]}` : 'BGM'}>
      <button type="button" className="ghost bgm-btn" onClick={() => bgm.toggleMute()} aria-label={off ? '음악 켜기' : '음악 끄기'}>
        {off ? '🔇' : '🔊'}
      </button>
      <input type="range" min={0} max={1} step={0.05} value={bgm.muted ? 0 : bgm.volume} onChange={(e) => bgm.setVolume(Number(e.target.value))} aria-label="음악 볼륨" />
      {!compact && id && <span className="muted small bgm-name">{TRACK_NAMES[id]}</span>}
    </span>
  );
}
