import { describe, expect, it } from 'vitest';
import { botKnowledge, createBotMemory, estimatedHits, smartBotAction, viewFor } from '../src/index.js';
import { PRIMORDIAL_ORDER, fill, modeTable } from './helpers.js';

describe('태초 지휘관 정책', () => {
  it('조기 리더쉽은 진명을 먼저 공표하고 대기 정책은 가짜 이름으로 숨긴다', () => {
    const t = modeTable('primordial', PRIMORDIAL_ORDER);
    const early = smartBotAction(t.state, t.id.rael!, createBotMemory(1), { activity: 1, primordialLeadership: 'early' });
    const hidden = smartBotAction(t.state, t.id.rael!, createBotMemory(1), { activity: 1, primordialLeadership: 'after-six-minutes' });
    expect(early).toEqual({ type: 'skill', skill: 'publish', name: 'rael' });
    expect(hidden?.type).toBe('skill');
    expect(hidden && 'skill' in hidden && hidden.skill).toBe('publish');
    expect(hidden && 'name' in hidden && hidden.name).not.toBe('rael');
  });

  it('6분 상급 리더쉽은 진명을 공표하지 않고 사용할 수 있다', () => {
    const t = modeTable('primordial', PRIMORDIAL_ORDER);
    t.publish('rael', 'nukelius'); t.tick(360_000); fill(t, 'rael');
    t.p('rael').skills = t.p('rael').skills.filter((s) => s.key.includes('leadership'));
    const action = smartBotAction(t.state, t.id.rael!, createBotMemory(2), { activity: 1, primordialLeadership: 'after-six-minutes' });
    expect(action && 'skill' in action && action.skill).toBe('rael_adv_leadership');
    expect(t.act('rael', action!).ok).toBe(true);
    expect(t.p('rael').published).toBe('nukelius');
  });

  it('정체가 숨겨진 케인은 세 목숨인 엘타스에게 공개 슬러쉬 대신 이름 공격을 한다', () => {
    const t = modeTable('primordial', PRIMORDIAL_ORDER);
    fill(t, 'kane'); t.state.revealed[t.id.eltas!] = 'eltas';
    t.p('kane').skills = t.p('kane').skills.filter((s) => ['attack', 'kane_wolfs_slash'].includes(s.key));
    const action = smartBotAction(t.state, t.id.kane!, createBotMemory(3), { activity: 1, primordialSlash: 'finish-or-revealed' });
    expect(action).toEqual({ type: 'skill', skill: 'attack', target: t.id.eltas, name: 'eltas' });
  });

  it('공개 잔여 목숨이 하나면 보디가드 횟수와 무관하게 슬러쉬로 처치할 수 있다', () => {
    const t = modeTable('primordial', PRIMORDIAL_ORDER);
    fill(t, 'kane', 'sasint', 'consume');
    expect(t.skill('consume', 'consume_master_guard', 'eltas').ok).toBe(true);
    t.state.revealed[t.id.eltas!] = 'eltas';
    // 실제 목숨 감소에 대한 공개 관찰만 케인에게 준다.
    t.state.log.push({ seq: ++t.state.seq, at: 0, kind: 'attack.lives', vis: { to: 'all' }, text: '엘타스는 1회 더 공격받으면 사망합니다.', data: { target: 'eltas', remaining: 1 } });
    t.p('eltas').extraLives = 0;
    const m = createBotMemory(4); const v = viewFor(t.state, t.id.kane!); botKnowledge(t.state, t.id.kane!, v, m);
    expect(estimatedHits(v, m.perception!.battle, 'eltas')).toBe(3);
    expect(estimatedHits(v, m.perception!.battle, 'eltas', false)).toBe(1);
    const action = smartBotAction(t.state, t.id.kane!, m, { activity: 1, primordialSlash: 'finish-or-revealed' });
    expect(action && 'skill' in action && action.skill).toBe('kane_wolfs_slash');
    expect(t.act('kane', action!).ok).toBe(true);
    expect(t.p('eltas').alive).toBe(false);
  });

  it('이미 케인이 공개됐으면 슬러쉬로 다중 목숨을 깎는다', () => {
    const t = modeTable('primordial', PRIMORDIAL_ORDER); fill(t, 'kane');
    t.state.revealed[t.id.kane!] = 'kane'; t.state.revealed[t.id.eltas!] = 'eltas';
    const action = smartBotAction(t.state, t.id.kane!, createBotMemory(5), { activity: 1, primordialSlash: 'finish-or-revealed' });
    expect(action && 'skill' in action && action.skill).toBe('kane_wolfs_slash');
  });
});
