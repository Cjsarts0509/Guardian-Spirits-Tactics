// Supabase 액세스 토큰 검증.
// - SUPABASE_URL 이 있으면 JWKS(비대칭 서명 키, 신규 프로젝트 기본)로 검증
// - 아니면 SUPABASE_JWT_SECRET(HS256 레거시)로 검증
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type { ServerConfig } from './config.js';

export interface AuthUser {
  userId: string;
  nickname: string | null;
}

export type Verifier = (token: string) => Promise<AuthUser>;

export function createVerifier(cfg: ServerConfig): Verifier | null {
  if (cfg.supabaseUrl) {
    const base = cfg.supabaseUrl.replace(/\/$/, '');
    const jwks = createRemoteJWKSet(new URL(`${base}/auth/v1/.well-known/jwks.json`));
    return async (token) => toUser((await jwtVerify(token, jwks, { issuer: `${base}/auth/v1` })).payload);
  }
  if (cfg.supabaseJwtSecret) {
    const key = new TextEncoder().encode(cfg.supabaseJwtSecret);
    return async (token) => toUser((await jwtVerify(token, key)).payload);
  }
  return null;
}

function toUser(p: JWTPayload): AuthUser {
  if (!p.sub) throw new Error('sub 없음');
  const meta = (p as { user_metadata?: Record<string, unknown> }).user_metadata ?? {};
  const nick = (meta.nickname ?? meta.name ?? meta.full_name ?? null) as string | null;
  return { userId: p.sub, nickname: nick ? String(nick).slice(0, 16) : null };
}
