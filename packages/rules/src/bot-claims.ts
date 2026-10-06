import { getMode } from './modes/index.js';
import type { CharKey, ModeId } from './types.js';
import type { PlayerView } from './engine/view.js';

/** 공개 규칙만으로 구성한 공표 의존성. 실제 보유 스킬은 자기 뷰에서만 읽는다. */
export const TRUE_NAME_SKILLS: Record<string, readonly string[]> = {
  civil_war: ['curse', 'libido_priestess'],
  primordial: ['rael_leadership', 'eltas_leadership'],
  lidellut: ['religious_alliance'],
  troll: ['spirit_hex', 'chief_search', 'wild_path', 'hunters_mark', 'chaos_hex', 'berserk_kazrow', 'berserk_seirow'],
};
export const KNIGHT_NAMES = ['yui', 'loneris', 'supra'];

/** 공표를 진실의 증거로 확정하지 않는다. 미학습의 약한 사전 가중치다. */
export function claimWeight(view: PlayerView, character: CharKey, claim: CharKey | null): number {
  if (!claim) return 1;
  const mode = getMode(view.mode as ModeId);
  const role = mode.characters.find((r) => r.key === character)!;
  const shown = mode.characters.find((r) => r.key === claim);
  const skills = [...role.skills, ...(role.unlocks ?? []).filter((u) => u.at * 1000 <= view.elapsedMs).map((u) => u.skill)];
  if (claim === character) {
    // 마나·보석의 공통 이익과 진명 스킬/패시브의 이익. 지휘관의 노출 위험도 남긴다.
    const incentive = skills.some((s) => TRUE_NAME_SKILLS[view.mode]?.includes(s) || s === 'chivalry' || s === 'eoril_queens_eye');
    return (role.commander ? 1.1 : 1.5) + (incentive ? 0.5 : 0);
  }
  if (mode.disguises.some((r) => r.character === character && shown?.side === r.fooledSide)) return 1.8;
  return shown?.side === role.side ? 1.1 : 1;
}

/** 상대가 진명을 내었는지, 변장으로 같은 성공이 가능한지 세계별로 판정한다. */
export function claimCheckSucceeds(view: PlayerView, skill: string, character: CharKey, published: CharKey | null, name?: CharKey): boolean {
  const mode = getMode(view.mode as ModeId);
  const role = view.roster.find((r) => r.key === character)!;
  const trueName = published === character;
  if (skill === 'chivalry') return KNIGHT_NAMES.includes(character) && (view.me.trueName || trueName);
  const disguised = published !== null && mode.disguises.some((r) =>
    r.character === character && r.fooledSide === view.me.side && role.side !== view.me.side &&
    view.roster.find((c) => c.key === published)?.side === view.me.side,
  );
  if (skill.includes('scan')) {
    return !!name && !mode.hiddenFromChecks.includes(name) &&
      (name === character || (disguised && name === published));
  }
  if (mode.hiddenFromChecks.includes(character)) return false;
  if (skill === 'ally_check' || skill === 'advanced_ally_check') return disguised || (trueName && role.side === view.me.side);
  if (skill === 'enemy_check' || skill === 'advanced_enemy_check') {
    // 황야 미명의 안개는 별도 숨은 자원/시간 상태가 있어 여기서 성공을 보장하지 않는다.
    return trueName && role.side !== view.me.side;
  }
  return false;
}

export function wantsTrueName(view: PlayerView): boolean {
  return view.me.skills.some((s) =>
    s.usesLeft !== 0 && (TRUE_NAME_SKILLS[view.mode]?.includes(s.key) || s.key === 'chivalry' || s.key === 'eoril_queens_eye'),
  );
}
