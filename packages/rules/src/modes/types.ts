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
  /** 공통 검증(생존·행동불능·쿨·마나·대상) 이후 스킬 고유 사전 조건. 문자열을 돌려주면 비용 없이 거절. 뷰의 blocked 계산 때는 target=null 로도 불리므로 대상 조건은 null 이면 통과시킬 것 */
  precheck?(c: SkillCtx): string | null;
  /** 효과 처리. 비용은 이미 지불됨 */
  resolve?(c: SkillCtx): void;
  /** 비용이 상태에 따라 달라지는 경우 (진실의 보석) */
  manaFor?(actor: PlayerState): number;
  /** 스킬 인스턴스 대신 별도 쿨다운/보유 판정을 쓰는 아이템형 스킬 */
  item?: boolean;
  /** 무적(마법 면역) 대상에게도 쓸 수 있는 해제 계열 (DECISIONS D) */
  ignoresInvulnerable?: boolean;
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
  /** 시간 해금 (게임 시작 후 초) — 해금 시점에 살아 있어야 받는다. requires: 그 스킬을 아직 갖고 있을 때만, replaces: 해금 시 제거 */
  unlocks?: { at: number; skill: SkillKey; requires?: SkillKey; replaces?: SkillKey }[];
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
  /** '-전체' 방송 권한. anonymous: 캐릭터 이름도 숨긴다 (태초·황야·트롤의 비공개형 A025) */
  globalChat: { characters: CharKey[]; mana: number; anonymous?: boolean };
  disguises: DisguiseRule[];
  /** 확인·스캔이 항상 실패하는 캐릭터 (트롤 하치 하이드) */
  hiddenFromChecks: CharKey[];
  /** 스캔 이름 목록에서 빠지는 캐릭터. 없으면 지휘관 전원 */
  scanExcludes?: CharKey[];
  /** 정답 공격이어도 공격자 실패 처리되는 '절대 보디가드' (원본 Rn) */
  isAbsolutelyGuarded(g: Game, target: PlayerState): boolean;
  /** 승리 판정. 종료 시 g.endGame 호출 */
  checkVictory(g: Game): void;
  /** 게임 시작 직후 (역할 안내 뒤). 시작 동맹 등 */
  onStart?(g: Game): void;
  /** 정답 공격을 횟수제로 막는 보디가드 (태초 2회 방어 등). 막았으면 메시지를 돌려준다 (이미 공지했으면 '') */
  chargedGuard?(g: Game, attacker: PlayerState, target: PlayerState): string | null;
  /** 이름 공격으로 살해가 확정됐을 때 (살해 처리 직전) */
  onAttackKill?(g: Game, attacker: PlayerState, target: PlayerState): void;
  /** 모드 고유 예약 작업 (g.schedule(at, 'mode', payload)) */
  onTask?(g: Game, payload: Record<string, unknown>): void;
  /** 적군 확인류가 실행되기 전 가로채기 (황야 미명의 안개). true 면 확인이 무산된 것 */
  beforeEnemyCheck?(g: Game, actor: PlayerState, target: PlayerState, skill: SkillKey): boolean;
}
