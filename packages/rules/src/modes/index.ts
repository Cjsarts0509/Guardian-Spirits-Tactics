import type { ModeId } from '../types.js';
import { civilWar } from './civil_war.js';
import { primordial } from './primordial.js';
import { lidellut } from './lidellut.js';
import { troll } from './troll.js';
import type { ModeDef } from './types.js';

export const modes: Partial<Record<ModeId, ModeDef>> = {
  civil_war: civilWar,
  primordial,
  lidellut,
  troll,
};

export function getMode(id: ModeId): ModeDef {
  const m = modes[id];
  if (!m) throw new Error(`unknown mode ${id}`);
  return m;
}

export { civilWar, primordial, lidellut, troll };
export type { ModeDef, CharacterDef, SkillDef, SkillCtx, TargetKind, DisguiseRule } from './types.js';
