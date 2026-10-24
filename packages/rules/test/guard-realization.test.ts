import {describe,it,expect} from 'vitest';
import {playGuardRealization} from '../scripts/guard-realization.js';
import {playGuardSelfplay} from '../scripts/guard-selfplay.js';
import {DEFAULT_SETTINGS} from '../scripts/league-runner.js';
describe('보호 실효 외부 관측 재생',()=>{
 it('실제 보호 시전과 횟수를 기록해도 양측 경기와 전체 영수증을 바꾸지 않는다',()=>{
  const f={mode:'primordial' as const,seed:30,count:12,reversed:false,currentSide:1 as const},variant='knownCommanderGuardBeforeAlly' as const;
  const a=playGuardRealization(f,variant),b=playGuardRealization(f,variant,DEFAULT_SETTINGS,false),original=playGuardSelfplay(f,variant);
  expect(a.game).toEqual(b.game);expect(a.game).toEqual(original.result.game);expect(b.transitions).toHaveLength(0);expect(b.finalGuardians).toHaveLength(0);
  expect(a.actions).toEqual(original.result.actions.map(t=>({player:t.player,at:t.at,action:t.action,accepted:t.accepted,error:t.error,beforeMana:t.beforeMana,afterMana:t.afterMana,nominalMana:t.nominalMana,character:t.character,side:t.side,receiptKinds:t.receiptKinds})));
  expect(a.transitions.some(t=>t.events.some(e=>e.kind==='skill.consume_master_guard')&&t.after.some(p=>p.role==='consume'&&p.charges===2&&p.hasSkill))).toBe(true);
 });
});
