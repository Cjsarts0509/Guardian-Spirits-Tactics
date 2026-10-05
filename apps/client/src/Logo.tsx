// 로고: public/art/ 에 파일이 있으면 그림, 없으면 글자 (tools/build_logo.py 로 생성)
import { useState, type ReactNode } from 'react';

const BASE = (import.meta.env.BASE_URL as string | undefined) ?? '/';
const missing = new Set<string>();

function Img({ name, className, alt, fallback = null }: { name: string; className: string; alt: string; fallback?: ReactNode }) {
  const [ok, setOk] = useState(!missing.has(name));
  if (!ok) return fallback;
  return (
    <img
      className={className}
      src={`${BASE}art/${name}`}
      alt={alt}
      onError={() => {
        missing.add(name);
        setOk(false);
      }}
    />
  );
}

/** 엠블럼(심볼). size: px */
export function Emblem({ size = 24, className = '' }: { size?: number; className?: string }) {
  return <Img name={size > 128 ? 'logo_emblem_512.webp' : 'logo_emblem_128.webp'} className={`logo-emblem ${className}`} alt="" />;
}

/** 메인 화면용 큰 로고: 엠블럼 + 영문 워드마크(그림) + 한글 제목(글자) */
export function BigLogo() {
  return (
    <div className="biglogo">
      <Emblem size={512} className="biglogo-emblem" />
      <Img
        name="logo_wordmark.webp"
        className="biglogo-wordmark"
        alt="GUARDIAN SPIRITS TACTICS"
        fallback={
          <span className="biglogo-wordmark-text">
            <span>Guardian Spirits</span>
            <small>Tactics</small>
          </span>
        }
      />
      <h1 className="biglogo-title">가디언 스피리츠 택틱스</h1>
    </div>
  );
}

/** 상단바용 작은 로고 */
export function SmallLogo({ text }: { text?: string }) {
  return (
    <span className="smalllogo">
      <Emblem size={24} />
      {text && <b>{text}</b>}
    </span>
  );
}
