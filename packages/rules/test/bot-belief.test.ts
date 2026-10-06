import { describe, expect, it } from 'vitest';
import { assignmentBelief, beliefBrier, botKnowledge, checkInformation, createBotMemory, probabilityOf, smartBotAction, viewFor } from '../src/index.js';
import { claimCheckSucceeds, claimWeight, TRUE_NAME_SKILLS, wantsTrueName } from '../src/bot-claims.js';
import { CIVIL_ORDER, LIDELLUT_ORDER, PRIMORDIAL_ORDER, TROLL_ORDER, civilTable, fill, modeTable } from './helpers.js';

describe('전체 배정 믿음', () => {
  it('각 사람·각 역할의 확률 합은 1이며 관찰이 없으면 균등하다', () => {
    const t = civilTable();
    const view = viewFor(t.state, t.id.kai!);
    const mem = createBotMemory(1);
    const k = botKnowledge(t.state, t.id.kai!, view, mem);
    const b = assignmentBelief(view, k, mem);
    expect(b.consistent).toBe(true);
    for (const p of view.players) {
      expect([...b.probabilities.get(p.id)!.values()].reduce((s, x) => s + x, 0)).toBeCloseTo(1, 10);
      if (p.id !== t.id.kai) expect(probabilityOf(b, p.id, 'soen')).toBeCloseTo(1 / 11, 10);
    }
    for (const c of view.roster) expect(view.players.reduce((s, p) => s + probabilityOf(b, p.id, c.key), 0)).toBeCloseTo(1, 10);
    expect(assignmentBelief(view, k, mem)).toBe(b);
    expect(beliefBrier(b, new Map([[t.id.soen!, 'soen']]), [t.id.soen!])).toBeCloseTo(10 / 11);
  });

  it('부분집합 DP는 작은 순열을 직접 열거한 가중 확률과 일치한다', () => {
    const t = civilTable();
    const view = viewFor(t.state, t.id.kai!);
    const ids = [t.id.soen!, t.id.arin!, t.id.sephy!];
    const chars = ['soen', 'arin', 'sephy'];
    view.players = view.players.filter((p) => p.id === t.id.kai || ids.includes(p.id));
    view.roster = view.roster.filter((r) => r.key === 'kai' || chars.includes(r.key));
    view.players.find((p) => p.id === ids[0])!.published = 'arin';
    view.players.find((p) => p.id === ids[1])!.published = 'sephy';
    const k = { known: new Map<string, string>(), candidates: new Map(ids.map((id) => [id, chars])) };
    const b = assignmentBelief(view, k, createBotMemory(1));
    const worlds = chars.flatMap((a) => chars.filter((c) => c !== a).map((c) => [a, c, chars.find((d) => d !== a && d !== c)!]));
    const weights = worlds.map((w) => w.reduce((s, c, i) => s * claimWeight(view, c, view.players.find((p) => p.id === ids[i])!.published), 1));
    const total = weights.reduce((a, c) => a + c, 0);
    ids.forEach((id, i) => chars.forEach((c) => expect(probabilityOf(b, id, c)).toBeCloseTo(worlds.reduce((s, w, j) => s + (w[i] === c ? weights[j]! : 0), 0) / total, 10)));
  });

  it('변장 가능한 성공을 유지하고 다른 사람의 확률도 함께 갱신한다', () => {
    const t = civilTable();
    t.publish('soen', 'arin');
    t.skill('kai', 'ally_check', 'soen');
    const mem = createBotMemory(2);
    const view = viewFor(t.state, t.id.kai!);
    const k = botKnowledge(t.state, t.id.kai!, view, mem);
    const b = assignmentBelief(view, k, mem);
    expect(probabilityOf(b, t.id.soen!, 'soen')).toBeGreaterThan(0);
    expect(probabilityOf(b, t.id.soen!, 'arin')).toBeGreaterThan(0);
    expect(probabilityOf(b, t.id.soen!, 'sephy')).toBe(0);
    expect(probabilityOf(b, t.id.arin!, 'arin')).toBeLessThan(1 / 11);
    expect(k.known.has(t.id.soen!)).toBe(false);
    expect(checkInformation(view, b, t.id.soen!, 'ally_check')).toBe(0);
  });

  it('자동 공표는 약한 성향 증거로도 사용하지 않는다', () => {
    const t = civilTable();
    t.tick(120_000);
    const mem = createBotMemory(3);
    const view = viewFor(t.state, t.id.kai!);
    const k = botKnowledge(t.state, t.id.kai!, view, mem);
    expect(mem.perception!.automaticClaims.size).toBe(12);
    const b = assignmentBelief(view, k, mem);
    expect(probabilityOf(b, t.id.soen!, 'soen')).toBeCloseTo(1 / 11);
    t.publish('soen', 'arin');
    const nextView = viewFor(t.state, t.id.kai!);
    const next = assignmentBelief(nextView, botKnowledge(t.state, t.id.kai!, nextView, mem), mem);
    expect(mem.perception!.automaticClaims.has(t.id.soen!)).toBe(false);
    expect(next).not.toBe(b);
  });

  it('가능한 배정이 없는 모순은 균등한 믿음으로 위장하지 않는다', () => {
    const t = civilTable();
    const view = viewFor(t.state, t.id.kai!);
    const mem = createBotMemory(4);
    const k = botKnowledge(t.state, t.id.kai!, view, mem);
    k.candidates.set(t.id.soen!, ['arin']);
    k.candidates.set(t.id.sephy!, ['arin']);
    const b = assignmentBelief(view, k, mem);
    expect(b.consistent).toBe(false);
    expect(beliefBrier(b, new Map(), [t.id.soen!])).toBeNull();
  });

  it('같은 관찰은 숨은 배정과 관계없이 같은 확률을 만든다', () => {
    const a = civilTable();
    const b = civilTable(CIVIL_ORDER.map((c) => c === 'soen' ? 'arin' : c === 'arin' ? 'soen' : c));
    a.publish('soen', 'arin'); b.publish('arin', 'arin');
    a.skill('kai', 'ally_check', 'soen'); b.skill('kai', 'ally_check', 'arin');
    const read = (t: typeof a) => {
      const mem = createBotMemory(1);
      const view = viewFor(t.state, t.id.kai!);
      return assignmentBelief(view, botKnowledge(t.state, t.id.kai!, view, mem), mem);
    };
    expect(read(a)).toEqual(read(b));
  });
});

describe('공표 스킬 조건', () => {
  it('기사 이름 공표만으로는 실제로 알려진 기사의 진명 조건을 만족하지 않는다', () => {
    const t = modeTable('lidellut', LIDELLUT_ORDER);
    const view = viewFor(t.state, t.id.yui!);
    expect(claimCheckSucceeds(view, 'chivalry', 'supra', 'loneris')).toBe(false);
    expect(claimCheckSucceeds(view, 'chivalry', 'supra', 'supra')).toBe(true);
    view.me.trueName = true;
    expect(claimCheckSucceeds(view, 'chivalry', 'supra', 'loneris')).toBe(true);
    expect(claimCheckSucceeds(view, 'chivalry', 'tuma', 'tuma')).toBe(false);
  });

  it('아군 확인은 변장으로 성공할 수 있고 적군 확인은 진명일 때만 성공한다', () => {
    const t = civilTable();
    const view = viewFor(t.state, t.id.kai!);
    expect(claimCheckSucceeds(view, 'ally_check', 'soen', 'arin')).toBe(true);
    expect(claimCheckSucceeds(view, 'enemy_check', 'soen', 'arin')).toBe(false);
    expect(claimCheckSucceeds(view, 'enemy_check', 'soen', 'soen')).toBe(true);
    expect(claimCheckSucceeds(view, 'advanced_scan', 'soen', 'arin', 'arin')).toBe(true);
    const troll = modeTable('troll', TROLL_ORDER);
    expect(claimCheckSucceeds(viewFor(troll.state, troll.id.chis!), 'ally_check', 'hachi', 'hachi')).toBe(false);
  });

  it.each([
    ['civil_war', CIVIL_ORDER, 'sephy', 'curse'],
    ['civil_war', CIVIL_ORDER, 'reindila', 'libido_priestess'],
    ['primordial', PRIMORDIAL_ORDER, 'rael', 'rael_leadership'],
    ['primordial', PRIMORDIAL_ORDER, 'eltas', 'eltas_leadership'],
    ['lidellut', LIDELLUT_ORDER, 'kaspa', 'religious_alliance'],
    ['troll', TROLL_ORDER, 'uldian', 'wild_path'],
  ] as const)('%s %s %s: 진명 의존 스킬이 있으면 먼저 진명을 공표한다', (mode, order, actor, skill) => {
    const t = modeTable(mode, [...order]);
    fill(t, actor);
    expect(TRUE_NAME_SKILLS[mode]).toContain(skill);
    const action = smartBotAction(t.state, t.id[actor]!, createBotMemory(7), { activity: 1 });
    expect(action).toEqual({ type: 'skill', skill: 'publish', name: actor });
    expect(t.act(actor, action!).ok).toBe(true);
    expect(viewFor(t.state, t.id[actor]!).me.skills.find((s) => s.key === skill)!.blocked).toBeNull();
  });

  it('황야 저주와 고대의 주술에는 내전 진명 조건을 붙이지 않는다', () => {
    const t = modeTable('lidellut', LIDELLUT_ORDER);
    expect(wantsTrueName(viewFor(t.state, t.id.sepi!))).toBe(false);
    const view = viewFor(t.state, t.id.kamikaze!);
    view.me.skills = view.me.skills.filter((s) => s.key === 'ancient_sorcery');
    expect(wantsTrueName(view)).toBe(false);
  });

  it('야생의 길을 사용하면 지연 결과 전까지 진명 유지 의도를 기억한다', () => {
    const t = modeTable('troll', TROLL_ORDER);
    t.publish('uldian', 'uldian');
    fill(t, 'uldian');
    expect(t.skill('uldian', 'wild_path').ok).toBe(true);
    const mem = createBotMemory(2);
    botKnowledge(t.state, t.id.uldian!, undefined, mem);
    expect(mem.perception!.trueNameUntil).toBe(20_000);
    const deadline = mem.perception!.trueNameUntil;
    t.tick(10_000);
    botKnowledge(t.state, t.id.uldian!, undefined, mem);
    expect(mem.perception!.trueNameUntil).toBe(deadline);
    expect(t.p('uldian').published).toBe('uldian');
    t.tick(10_000);
    expect(botKnowledge(t.state, t.id.uldian!, undefined, mem).known.get(t.id.chis!)).toBe('chis');
  });

  it('변장 성공만 받은 상대에게 동맹을 걸어 백스탭 조건을 열지 않는다', () => {
    const t = civilTable();
    t.publish('soen', 'arin');
    t.skill('kai', 'ally_check', 'soen');
    t.p('kai').skills = t.p('kai').skills.filter((s) => s.key === 'ally');
    const mem = createBotMemory(3);
    for (let i = 0; i < 100; i++) {
      const action = smartBotAction(t.state, t.id.kai!, mem, { activity: 1 });
      expect(action).not.toEqual({ type: 'skill', skill: 'ally', target: t.id.soen });
    }
  });
});
