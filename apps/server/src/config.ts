// 서버 설정 (환경변수). 예시는 apps/server/.env.example
export interface ServerConfig {
  port: number;
  host: string;
  /** 게스트(로그인 없이 닉네임만) 허용 */
  allowGuests: boolean;
  /** 방장이 봇으로 빈자리 채우기 허용 (개발·테스트용) */
  allowBots: boolean;
  /** WebSocket Origin 허용 목록. 비우면 검사 안 함 */
  allowedOrigins: string[];
  /** 진행 중 연결이 끊긴 플레이어를 사망 처리하기까지 대기 (초) */
  reconnectGraceSeconds: number;
  tickMs: number;
  /** 게임 시계 배속 (테스트·개발용, 운영은 1) */
  timeScale: number;
  /** 봇이 틱마다 행동할 확률 */
  botActivity: number;
  supabaseUrl: string | null;
  /** HS256 레거시 JWT 시크릿 (JWKS 를 못 쓰는 경우) */
  supabaseJwtSecret: string | null;
  /** 판 기록 저장용 secret 키 (sb_secret_… 또는 레거시 service_role). 서버 전용, 절대 클라이언트에 노출 금지 */
  supabaseSecretKey: string | null;
  /** 연결 유지 ping 주기. Cloudflare 는 100초 동안 오가는 게 없으면 WebSocket 을 끊는다 */
  heartbeatMs: number;
}

const bool = (v: string | undefined, d: boolean) => (v === undefined ? d : ['1', 'true', 'yes'].includes(v.toLowerCase()));

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  return {
    port: Number(env.PORT ?? 8787),
    host: env.HOST ?? '0.0.0.0',
    allowGuests: bool(env.ALLOW_GUESTS, true),
    allowBots: bool(env.ALLOW_BOTS, true),
    allowedOrigins: (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    reconnectGraceSeconds: Number(env.RECONNECT_GRACE_SECONDS ?? 60),
    tickMs: Number(env.TICK_MS ?? 250),
    timeScale: Number(env.TIME_SCALE ?? 1),
    botActivity: Number(env.BOT_ACTIVITY ?? 0.012),
    supabaseUrl: env.SUPABASE_URL || null,
    supabaseJwtSecret: env.SUPABASE_JWT_SECRET || null,
    supabaseSecretKey: env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || null,
    heartbeatMs: Number(env.HEARTBEAT_MS ?? 30_000),
  };
}
