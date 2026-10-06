// 가택 규칙 엔진 공용 타입.
// 상태는 전부 JSON 직렬화 가능한 평범한 객체/배열로 유지한다 (리플레이·저장·전송용).

export type ModeId = 'civil_war' | 'primordial' | 'lidellut' | 'troll';
export const MODE_IDS: ModeId[] = ['civil_war', 'primordial', 'lidellut', 'troll'];
export type Side = 1 | 2;
export type PlayerId = string;
export type CharKey = string;
export type SkillKey = string;

/** 플레이어가 보유한 스킬 1개의 런타임 상태 */
export interface SkillInstance {
  key: SkillKey;
  /** 이 시각(ms) 전에는 재사용 불가 */
  cooldownUntil: number;
  /** null = 무제한 */
  usesLeft: number | null;
  /** 상급 공격 실패 단계 등 스킬별 단계값 (기본 1) */
  level: number;
}

export type EffectKind = 'incapacitated' | 'invulnerable';

/** 지속 효과. 효과마다 독립적으로 만료된다 (원본 Pause 중첩 버그 수정, DECISIONS A6) */
export interface Effect {
  id: number;
  kind: EffectKind;
  until: number;
  source: SkillKey;
  /** 전체 공지된 효과인지 (다른 플레이어 화면에 상태 표시 여부) */
  announced: boolean;
}

export interface PlayerState {
  id: PlayerId;
  nickname: string;
  /** 1..N 입장 순번. 화면 표기 "[seat] 닉네임" (원본 H[p]) */
  seat: number;
  /** 모드의 캐릭터 슬롯 (1..12) */
  slot: number;
  character: CharKey;
  side: Side;
  alive: boolean;
  diedAt: number | null;
  left: boolean;
  mana: number;
  /** 현재 공표 이름. null = 한 번도 공표 안 함 */
  published: CharKey | null;
  /** 내가 동맹을 건 플레이어 (단방향) */
  allies: PlayerId[];
  /** 진실의 보석 단계: 0 없음, 1 = 1/3, 2 = 2/3, 3 = 완성 */
  gem: 0 | 1 | 2 | 3;
  gemCooldownUntil: number;
  skills: SkillInstance[];
  /** 사망 전에 더 버티는 일반 공격 명중 횟수 (원본 j[slot]) */
  extraLives: number;
  effects: Effect[];
  /** 모드별 플래그: successor, calmness, soulWall, soulRecoveryUntil 등 */
  flags: Record<string, boolean | number>;
}

export type Visibility =
  | { to: 'all' }
  | { to: 'players'; ids: PlayerId[] }
  | { to: 'dead' };

/** 개인 로그 자동 정리용 확정 제약. 변장에 속을 수 있는 관찰은 oneOf 로 표현한다. */
export interface Fact {
  player: PlayerId;
  character: CharKey | null;
  /** character 가 null 이면 '이 캐릭터가 아니다' 같은 부정 정보 */
  not?: CharKey;
  /** 이 이름들 중 하나. 관찰만으로 진명과 변장을 구별할 수 없는 경우 */
  oneOf?: CharKey[];
  /** 지휘관 여부만 확정된 경우 */
  commander?: boolean;
}

export interface GameEvent {
  seq: number;
  /** 게임 시작 후 경과 ms */
  at: number;
  kind: string;
  vis: Visibility;
  text: string;
  data?: Record<string, unknown>;
  /** 이 이벤트를 볼 수 있는 플레이어에게만 의미 있는 확정 정보 */
  facts?: Fact[];
}

export interface ScheduledTask {
  id: number;
  at: number;
  kind: 'turn' | 'unlock' | 'reveal' | 'effectEnd' | 'flagEnd' | 'mode';
  payload: Record<string, unknown>;
}

export interface GameState {
  version: 1;
  mode: ModeId;
  seed: number;
  rng: number;
  startedAt: number;
  now: number;
  phase: 'running' | 'ended';
  winner: Side | null;
  endReason: string | null;
  players: PlayerState[];
  turn: number;
  turnMs: number;
  nextTurnAt: number;
  queue: ScheduledTask[];
  /** 전체에 공개된 정체 */
  revealed: Record<PlayerId, CharKey>;
  log: GameEvent[];
  seq: number;
  taskSeq: number;
  effectSeq: number;
  modeState: Record<string, boolean | number | string>;
}

export type ChatChannel = 'all' | 'ally' | 'whisper' | 'global' | 'dead';

export type Action =
  | { type: 'skill'; skill: SkillKey; target?: PlayerId; name?: CharKey }
  | { type: 'chat'; channel: ChatChannel; text: string; to?: PlayerId };

export interface ActionResult {
  ok: boolean;
  /** 사용 불가 사유 (비용 소모 없음) */
  error?: string;
  events: GameEvent[];
}

export interface PlayerSeat {
  id: PlayerId;
  nickname: string;
}

export interface CreateGameOptions {
  mode: ModeId;
  players: PlayerSeat[];
  seed: number;
  now: number;
  /** 턴 길이(초). 기본 90 */
  turnSeconds?: number;
  /** 테스트용 강제 배정 (playerId → 캐릭터) */
  assignment?: Record<PlayerId, CharKey>;
}
