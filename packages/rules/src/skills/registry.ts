import type { SkillDef } from '../modes/types.js';
import { commonSkills } from './common.js';

/** 모드와 무관한 공통 스킬. 모드 고유 스킬은 ModeDef.skills 에서 먼저 찾는다 */
export const skillRegistry: Record<string, SkillDef> = { ...commonSkills };
