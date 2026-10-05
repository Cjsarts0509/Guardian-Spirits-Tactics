// 원본 오브젝트 데이터 기준 상수 (w3u umpi/umpm/umpr, 턴 타이머 e)

export const START_MANA = 120;
export const MAX_MANA = 150;
export const DEFAULT_TURN_SECONDS = 90;

/** 매 턴 기본 마나 (원본: ForceEnumAllies 에 자기 자신이 포함되어 10 + 10) */
export const TURN_BASE_MANA = 20;
/** 나에게 동맹을 건 생존 플레이어 1명당 (DECISIONS A11) */
export const TURN_MANA_PER_ALLY = 10;
/** 진명 공표 상태로 턴을 넘기면 */
export const TURN_TRUE_NAME_MANA = 10;
/** 공표 시 */
export const PUBLISH_MANA = 5;

export const MIN_PLAYERS = 8;
export const MAX_PLAYERS = 12;

export const CHAT_MAX_LENGTH = 200;
