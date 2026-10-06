import { describe, expect, it } from 'vitest';
import { assignmentBelief, botKnowledge, createBotMemory, sampleAssignments, smartBotAction, viewFor } from '../src/index.js';
import { claimWeight } from '../src/bot-claims.js';
import { fixtures, prepareMatch } from '../scripts/league-runner.js';
import { civilTable } from './helpers.js';

describe('전체 정체 배정 표본', () => {
  it('실제 숨겨진 배정을 바꿔도 같은 자기 관찰에서는 같은 표본을 만든다', () => {
    const t = civilTable(), id = t.id.kai!, altered = structuredClone(t.state);
    const a = altered.players.find((p) => p.id === t.id.mertz)!, b = altered.players.find((p) => p.id === t.id.arin)!;
    [a.character, b.character] = [b.character, a.character];
    [a.side, b.side] = [b.side, a.side];
    const view = viewFor(t.state, id), otherView = viewFor(altered, id);
    expect(otherView).toEqual(view);
    const first = createBotMemory(7), second = createBotMemory(7);
    expect(sampleAssignments(view, botKnowledge(t.state, id, view, first), first, { rng: 99 })).toEqual(
      sampleAssignments(otherView, botKnowledge(altered, id, otherView, second), second, { rng: 99 }));
  });

  it('새 확인 제약은 이전 표본 캐시를 무효화한다', () => {
    const t = civilTable(), view = viewFor(t.state, t.id.kai!), memory = createBotMemory(7);
    const knowledge = botKnowledge(t.state, view.me.id, view, memory), rng = { rng: 99 };
    sampleAssignments(view, knowledge, memory, rng);
    const previous = assignmentBelief(view, knowledge, memory);
    knowledge.candidates.set(t.id.mertz!, ['mertz']);
    const worlds = sampleAssignments(view, knowledge, memory, rng);
    expect(worlds).toHaveLength(32);
    expect(worlds.every((w) => w.get(t.id.mertz!) === 'mertz')).toBe(true);
    expect(assignmentBelief(view, knowledge, memory)).not.toBe(previous);
  });

  it('모든 모드에서 한 사람당 한 역할이며 확인 제약과 자기 정체를 보존한다', () => {
    for (const mode of ['civil_war', 'primordial', 'lidellut', 'troll'] as const) {
      const { state } = prepareMatch(fixtures(mode, 27000, 12)[0]!);
      const view = viewFor(state, 'p1'), memory = createBotMemory(8);
      const knowledge = botKnowledge(state, 'p1', view, memory);
      const target = view.players.find((p) => p.id !== 'p1')!.id;
      knowledge.candidates.set(target, knowledge.candidates.get(target)!.slice(0, 2));
      const before = assignmentBelief(view, knowledge, memory);
      const worlds = sampleAssignments(view, knowledge, memory, { rng: 99 }, 256);
      expect(worlds).toHaveLength(256);
      for (const world of worlds) {
        expect(world.size).toBe(12);
        expect(new Set(world.values()).size).toBe(12);
        expect(world.get('p1')).toBe(view.me.character);
        for (const [id, role] of world) if (id !== 'p1') expect(knowledge.candidates.get(id)).toContain(role);
      }
      expect(assignmentBelief(view, knowledge, memory)).toBe(before);
      expect(memory.rng).toBe(8);
    }
  });

  it('작은 배정의 결합 빈도는 전체 순열의 직접 가중합과 일치한다', () => {
    const t = civilTable(), view = viewFor(t.state, t.id.kai!), memory = createBotMemory(5);
    const ids = [t.id.soen!, t.id.arin!, t.id.sephy!], roles = ['soen', 'arin', 'sephy'];
    view.players = view.players.filter((p) => p.id === view.me.id || ids.includes(p.id));
    view.roster = view.roster.filter((r) => r.key === 'kai' || roles.includes(r.key));
    view.players.find((p) => p.id === ids[0])!.published = 'arin';
    view.players.find((p) => p.id === ids[1])!.published = 'sephy';
    const knowledge = { known: new Map<string, string>(), candidates: new Map(ids.map((id) => [id, roles])) };
    const permutations = roles.flatMap((a) => roles.filter((b) => b !== a).map((b) => [a, b, roles.find((c) => c !== a && c !== b)!]));
    const weights = permutations.map((w) => w.reduce((product, c, i) => product * claimWeight(view, c,
      view.players.find((p) => p.id === ids[i])!.published), 1));
    const total = weights.reduce((s, w) => s + w, 0), counts = new Map<string, number>(), rng = { rng: 77 };
    const samples = 256 * 64;
    for (let batch = 0; batch < 64; batch++) for (const world of sampleAssignments(view, knowledge, memory, rng, 256)) {
      const key = ids.map((id) => world.get(id)).join(',');
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    expect(counts.size).toBe(6);
    permutations.forEach((world, i) => {
      const p = weights[i]! / total;
      // 고정 RNG에서 결합 분포를 검사한다. 허용 오차는 표본의 6 표준오차다.
      expect(Math.abs((counts.get(world.join(',')) ?? 0) / samples - p)).toBeLessThan(6 * Math.sqrt(p * (1 - p) / samples));
    });
  });

  it('모순된 후보에는 표본을 만들지 않고 숨은 정답으로 대체하지 않는다', () => {
    const t = civilTable(), view = viewFor(t.state, t.id.kai!), memory = createBotMemory(1), rng = { rng: 123 };
    const knowledge = botKnowledge(t.state, view.me.id, view, memory);
    knowledge.candidates.set(t.id.mertz!, ['soen']);
    knowledge.candidates.set(t.id.arin!, ['soen']);
    expect(sampleAssignments(view, knowledge, memory, rng)).toEqual([]);
    expect(rng.rng).toBe(123);
    for (const count of [-1, 1.5, 257, NaN]) expect(() => sampleAssignments(view, knowledge, memory, rng, count)).toThrow(RangeError);
    expect(sampleAssignments(view, knowledge, memory, rng, 0)).toEqual([]);
    expect(() => sampleAssignments(view, knowledge, memory, memory)).toThrow('행동 RNG');
  });

  it('같은 관찰에서는 재현 가능하며 표본 수정이 확인 기억과 실제 행동을 바꾸지 않는다', () => {
    const t = civilTable(), id = t.id.kai!, view = viewFor(t.state, id);
    const sampled = createBotMemory(5), plain = createBotMemory(5);
    const k = botKnowledge(t.state, id, view, sampled);
    const a = sampleAssignments(view, k, sampled, { rng: 99 });
    const b = sampleAssignments(view, k, sampled, { rng: 99 });
    expect(a).toEqual(b);
    a[0]!.clear();
    expect(b[0]!.size).toBe(12);
    for (let i = 0; i < 100; i++) {
      expect(smartBotAction(t.state, id, sampled, { activity: 1 })).toEqual(smartBotAction(t.state, id, plain, { activity: 1 }));
      expect(sampled.rng).toBe(plain.rng);
    }
    expect(sampled.perception!.known).toEqual(plain.perception!.known);
    expect(sampled.perception!.excluded).toEqual(plain.perception!.excluded);
  });
});
