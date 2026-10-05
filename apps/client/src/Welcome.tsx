// 메인 화면: 키 비주얼 + 게스트 입장 / 로그인 / 가입
import { useEffect, useState, type FormEvent } from 'react';
import { currentToken, loadConfig, savedSession, signIn, signOut, signUp, type AuthSession, type ClientConfig } from './auth.js';
import { net, type NetStatus } from './net.js';
import { BigLogo } from './Logo.js';
import { BgmControl } from './BgmControl.js';

const BASE = (import.meta.env.BASE_URL as string | undefined) ?? '/';
type Tab = 'guest' | 'login' | 'signup';

/** 로그인 사용자로 서버에 접속 (토큰은 접속 때마다 갱신해서 보낸다) */
export function connectAs(cfg: ClientConfig, s: AuthSession): void {
  net.connect(s.nickname, async () => (await currentToken(cfg.auth))?.accessToken ?? null);
}

export function MainScreen({ status, nick, setNick }: { status: NetStatus; nick: string; setNick: (v: string) => void }) {
  const [cfg, setCfg] = useState<ClientConfig | null>(null);
  const [tab, setTab] = useState<Tab>('guest');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [session, setSession] = useState<AuthSession | null>(savedSession());
  const [art, setArt] = useState(true);

  useEffect(() => {
    loadConfig().then((c) => {
      setCfg(c);
      if (!c.auth) return;
      // 저장된 로그인이 있으면 바로 그 계정으로
      currentToken(c.auth).then((s) => setSession(s));
      if (!c.allowGuests) setTab('login');
    });
  }, []);

  const connecting = status === 'connecting';
  const auth = cfg?.auth ?? null;

  const guest = (e: FormEvent) => {
    e.preventDefault();
    if (nick.trim()) net.connect(nick.trim());
  };

  const login = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth || !cfg) return;
    setBusy(true);
    setMsg(null);
    try {
      const s = await signIn(auth, email.trim(), password);
      setSession(s);
      connectAs(cfg, s);
    } catch (err) {
      setMsg({ kind: 'err', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const signup = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth || !cfg) return;
    const n = nickname.trim();
    if (n.length < 1 || n.length > 16) return setMsg({ kind: 'err', text: '닉네임은 1~16자입니다.' });
    if (password.length < 6) return setMsg({ kind: 'err', text: '비밀번호는 6자 이상이어야 합니다.' });
    setBusy(true);
    setMsg(null);
    try {
      const s = await signUp(auth, email.trim(), password, n);
      if (s) {
        setSession(s);
        connectAs(cfg, s);
      } else {
        setMsg({ kind: 'ok', text: '가입 확인 메일을 보냈습니다. 메일의 링크를 누른 뒤 로그인하세요.' });
        setTab('login');
      }
    } catch (err) {
      setMsg({ kind: 'err', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="main">
      <div className="main-art">
        {art && <img src={`${BASE}art/key_visual.webp`} alt="" onError={() => setArt(false)} />}
        <div className="main-art-fade" />
      </div>
      <div className="main-panel">
        <div className="main-title">
          <BigLogo />
          <p className="muted">정체를 숨기고, 추리하고, 처단하라 — 12인 심리전</p>
        </div>

        {session && auth ? (
          <div className="main-form card">
            <div className="main-me">
              <b>{session.nickname}</b> <span className="muted small">{session.email}</span>
            </div>
            <button disabled={connecting} onClick={() => cfg && connectAs(cfg, session)}>
              {connecting ? '연결 중…' : '입장'}
            </button>
            <button
              className="ghost"
              onClick={async () => {
                await signOut(auth);
                setSession(null);
              }}
            >
              로그아웃
            </button>
          </div>
        ) : (
          <div className="main-form card">
            {auth && (
              <div className="tabs main-tabs">
                {cfg?.allowGuests && (
                  <button className={tab === 'guest' ? 'on' : ''} onClick={() => setTab('guest')}>
                    게스트
                  </button>
                )}
                <button className={tab === 'login' ? 'on' : ''} onClick={() => setTab('login')}>
                  로그인
                </button>
                <button className={tab === 'signup' ? 'on' : ''} onClick={() => setTab('signup')}>
                  가입
                </button>
              </div>
            )}
            {(!auth || tab === 'guest') && (
              <form onSubmit={guest}>
                <input value={nick} maxLength={16} placeholder="닉네임" onChange={(e) => setNick(e.target.value)} autoFocus />
                <button disabled={!nick.trim() || connecting}>{connecting ? '연결 중…' : '게스트로 입장'}</button>
                {auth && <p className="muted small">게스트는 전적이 남지 않습니다.</p>}
              </form>
            )}
            {auth && tab === 'login' && (
              <form onSubmit={login}>
                <input type="email" value={email} placeholder="이메일" autoComplete="email" onChange={(e) => setEmail(e.target.value)} autoFocus />
                <input type="password" value={password} placeholder="비밀번호" autoComplete="current-password" onChange={(e) => setPassword(e.target.value)} />
                <button disabled={busy || connecting || !email || !password}>{busy || connecting ? '잠시만…' : '로그인'}</button>
              </form>
            )}
            {auth && tab === 'signup' && (
              <form onSubmit={signup}>
                <input value={nickname} maxLength={16} placeholder="닉네임 (게임에서 보이는 이름)" onChange={(e) => setNickname(e.target.value)} autoFocus />
                <input type="email" value={email} placeholder="이메일" autoComplete="email" onChange={(e) => setEmail(e.target.value)} />
                <input type="password" value={password} placeholder="비밀번호 (6자 이상)" autoComplete="new-password" onChange={(e) => setPassword(e.target.value)} />
                <button disabled={busy || connecting || !email || !password || !nickname.trim()}>{busy ? '가입 중…' : '가입하고 입장'}</button>
              </form>
            )}
            {msg && <p className={`main-msg ${msg.kind}`}>{msg.text}</p>}
          </div>
        )}
        <div className="main-foot row spread">
          <span className="muted small">4rum · 워크래프트3 유즈맵 리메이크 · 플레이테스트</span>
          <BgmControl compact />
        </div>
      </div>
    </div>
  );
}
