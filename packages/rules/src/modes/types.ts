import type { CharKey, Side, SkillKey } from '../types.js';
import type { Game } from '../engine/game.js';
import type { PlayerState } from '../types.js';

export type TargetKind = 'none' | 'player' | 'player+name';

export interface SkillCtx {
  g: Game;
  actor: PlayerState;
  target: PlayerState | null;
  name: CharKey | null;
  skill: SkillDef;
}

export interface SkillDef {
  key: SkillKey;
  name: string;
  /** 원본 어빌리티 코드 (추적용). 모드마다 다르면 캐릭터 정의의 skillCodes 로 덮어쓴다 */
  code: string;
  hotkey?: string;
  mana: number;
  /** 초 */
  cooldown: number;
  /** 사용 가능 횟수. null = 무제한 */
  uses: number | null;
  target: TargetKind;
  passive?: boolean;
  /** 설명 (웹판 실제 수치 기준) */
  description: string;
  /** player+name 스킬의 이름 선택지 */
  nameOptions?(g: Game, actor: PlayerState): CharKey[];
  /** 공통 검증(생존·행동불능·쿨·마나·대상) 이후 스킬 고유 사전 조건. 문자열을 돌려주면 비용 없이 거절 */
  precheck?(c: SkillCtx): string | null;
  /** 효과 처리. 비용은 이미 지불됨 */
  resolve?(c: SkillCtx): void;
  /** 비용이 상태에 따라 달라지는 경우 (진실의 보석) */
  manaFor?(actor: PlayerState): number;
  /** 스킬 인스턴스 대신 별도 쿨다운/보유 판정을 쓰는 아이템형 스킬 */
  item?: boolean;
}

export interface CharacterDef {
  key: CharKey;
  name: string;
  title: string;
  /** 원본 유닛 ID */
  unitId: string;
  slot: number;
  side: Side;
  commander: boolean;
  /** 원본 j[slot] */
  extraLives: number;
  /** 시작 보유 스킬 (패시브 포함) */
  skills: SkillKey[];
  /** 공통 스킬의 모드별 원본 코드 */
  skillCodes?: Record<SkillKey, string>;
  /** 시간 해금 (게임 시작 후 초) — 해금 시점에 살아 있어야 받는다 */
  unlocks?: { at: number; skill: SkillKey }[];
  /** 게임 시작 시 본인에게 보여주는 목표 */
  objective: string;
}

export interface DisguiseRule {
  /** 변장 능력을 가진 캐릭터 */
  character: CharKey;
  /** 속는 쪽 진영 (확인/스캔 시전자의 진영) */
  fooledSide: Side;
}

export interface ModeDef {
  id: string;
  displayName: string;
  sideNames: Record<Side, string>;
  characters: CharacterDef[];
  /** 인원수별 사용 슬롯 마스크 (원본 Ei). 문자 i 번째가 슬롯 i+1 */
  masks: Record<number, string>;
  /** 모드 고유 스킬 */
  skills: Record<SkillKey, SkillDef>;
  /** '-전체' 익명 방송 권한 */
  globalChat: { characters: CharKey[]; mana: number };
  disguises: DisguiseRule[];
  /** 확인·스캔이 항상 실패하는 캐릭터 (트롤 하치 하이드) */
  hiddenFromChecks: CharKey[];
  /** 정답 공격이어도 공격자 실패 처리되는 '절대 보디가드' (원본 Rn) */
  isAbsolutelyGuarded(g: Game, target: PlayerState): boolean;
  /** 승리 판정. 종료 시 g.endGame 호출 */
  checkVictory(g: Game): void;
}
