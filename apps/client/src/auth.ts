// Supabase 이메일/비밀번호 로그인 (GoTrue REST 직접 호출, 별도 SDK 없음).
// 서버의 /config.json 이 auth 를 주면 켜지고, 없으면 게스트만 가능하다.
export interface AuthConfig {
  supabaseUrl: string;
  supabasePublishableKey: string;
}
export interface ClientConfig {
  auth: AuthConfig | null;
  allowGuests: boolean;
}
export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  /** epoch ms */
  expiresAt: number;
  userId: string;
  email: string;
  nickname: string;
}

const KEY = 'gst.auth';
let config: ClientConfig | null = null;

export async function loadConfig(): Promise<ClientConfig> {
  if (config) return config;
  try {
    const base = (import.meta.env.VITE_SERVER_URL as string | undefined)?.replace(/^ws/, 'http') ?? (import.meta.env.DEV ? `http://${location.hostname}:8787` : '');
    const r = await fetch(`${base}/config.json`, { cache: 'no-store' });
    config = r.ok ? ((await r.json()) as ClientConfig) : { auth: null, allowGuests: true };
  } catch {
    config = { auth: null, allowGuests: true };
  }
  return config;
}

export function savedSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

function store(s: AuthSession | null): void {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {
    /* 저장 불가 환경 */
  }
}

class AuthError extends Error {}

async function gotrue(auth: AuthConfig, path: string, body: unknown, token?: string): Promise<Record<string, unknown>> {
  const r = await fetch(`${auth.supabaseUrl.replace(/\/$/, '')}/auth/v1/${path}`, {
    method: 'POST',
    headers: { apikey: auth.supabasePublishableKey, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const data = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok) throw new AuthError(friendly(String(data.msg ?? data.error_description ?? data.message ?? data.error_code ?? r.status)));
  return data;
}

function friendly(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid_credentials')) return '이메일 또는 비밀번호가 틀립니다.';
  if (m.includes('already registered') || m.includes('user_already_exists')) return '이미 가입된 이메일입니다.';
  if (m.includes('password') && m.includes('6')) return '비밀번호는 6자 이상이어야 합니다.';
  if (m.includes('email not confirmed') || m.includes('email_not_confirmed')) return '이메일 확인이 아직 안 됐습니다. 받은 메일의 링크를 눌러 주세요.';
  if (m.includes('rate') || m.includes('429')) return '요청이 너무 잦습니다. 잠시 후 다시 시도하세요.';
  if (m.includes('invalid') && m.includes('email')) return '이메일 형식이 올바르지 않습니다.';
  return `로그인 서버 오류: ${msg}`;
}

function toSession(d: Record<string, unknown>, fallbackNick: string): AuthSession | null {
  const user = d.user as { id?: string; email?: string; user_metadata?: { nickname?: string } } | undefined;
  if (!d.access_token || !user?.id) return null;
  return {
    accessToken: String(d.access_token),
    refreshToken: String(d.refresh_token ?? ''),
    expiresAt: Date.now() + Number(d.expires_in ?? 3600) * 1000,
    userId: user.id,
    email: user.email ?? '',
    nickname: (user.user_metadata?.nickname ?? fallbackNick).slice(0, 16),
  };
}

/** 닉네임이 비어 있는지 (profiles 는 누구나 조회 가능) */
export async function nicknameTaken(auth: AuthConfig, nickname: string): Promise<boolean> {
  const r = await fetch(`${auth.supabaseUrl.replace(/\/$/, '')}/rest/v1/profiles?select=id&nickname=eq.${encodeURIComponent(nickname)}&limit=1`, {
    headers: { apikey: auth.supabasePublishableKey },
  });
  if (!r.ok) return false;
  const rows = (await r.json()) as unknown[];
  return rows.length > 0;
}

/** 프로필 행 보장 (본인만 insert 가능). 이미 있으면 무시 */
async function ensureProfile(auth: AuthConfig, s: AuthSession): Promise<void> {
  await fetch(`${auth.supabaseUrl.replace(/\/$/, '')}/rest/v1/profiles`, {
    method: 'POST',
    headers: { apikey: auth.supabasePublishableKey, Authorization: `Bearer ${s.accessToken}`, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify({ id: s.userId, nickname: s.nickname }),
  }).catch(() => undefined);
}

/** 가입. 이메일 확인이 켜진 프로젝트면 세션 없이 null 을 돌려준다 (확인 메일 안내) */
export async function signUp(auth: AuthConfig, email: string, password: string, nickname: string): Promise<AuthSession | null> {
  if (await nicknameTaken(auth, nickname)) throw new AuthError('이미 사용 중인 닉네임입니다.');
  const d = await gotrue(auth, 'signup', { email, password, data: { nickname } });
  const s = toSession(d, nickname);
  if (!s) return null;
  await ensureProfile(auth, s);
  store(s);
  return s;
}

export async function signIn(auth: AuthConfig, email: string, password: string): Promise<AuthSession> {
  const d = await gotrue(auth, 'token?grant_type=password', { email, password });
  const s = toSession(d, email.split('@')[0] ?? '플레이어');
  if (!s) throw new AuthError('로그인 응답이 올바르지 않습니다.');
  await ensureProfile(auth, s);
  store(s);
  return s;
}

export async function signOut(auth: AuthConfig | null): Promise<void> {
  const s = savedSession();
  store(null);
  if (auth && s) await gotrue(auth, 'logout', {}, s.accessToken).catch(() => undefined);
}

/** 유효한 액세스 토큰 (만료 1분 전이면 갱신). 실패하면 null + 저장된 세션 제거 */
export async function currentToken(auth: AuthConfig | null): Promise<AuthSession | null> {
  const s = savedSession();
  if (!s || !auth) return null;
  if (s.expiresAt - Date.now() > 60_000) return s;
  try {
    const d = await gotrue(auth, 'token?grant_type=refresh_token', { refresh_token: s.refreshToken });
    const n = toSession(d, s.nickname);
    if (!n) throw new AuthError('갱신 실패');
    store(n);
    return n;
  } catch {
    store(null);
    return null;
  }
}
