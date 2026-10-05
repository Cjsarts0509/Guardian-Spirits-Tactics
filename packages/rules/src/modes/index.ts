import type { ModeId } from '../types.js';
import { civilWar } from './civil_war.js';
import type { ModeDef } from './types.js';

export const modes: Record<ModeId, ModeDef> = {
  civil_war: civilWar,
};

export function getMode(id: ModeId): ModeDef {
  const m = modes[id];
  if (!m) throw new Error(`unknown mode ${id}`);
  return m;
}

export { civilWar };
export type { ModeDef, CharacterDef, SkillDef, SkillCtx, TargetKind, DisguiseRule } from './types.js';
