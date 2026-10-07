import { describe, expect, it } from 'vitest';
import { botKnowledge, createBotMemory, eventsFor, smartBotAction, updateBotKnowledge, viewFor } from '../src/index.js';
import { CIVIL_ORDER, PRIMORDIAL_ORDER, TROLL_ORDER, civilTable, fill, modeTable } from './helpers.js';

describe('변장 가능한 관찰', () => {
  it('일회성 전투 이력 생략도 변장·개인 facts·공표의 정체 지식을 그대로 반영한다', () => {
    const t = civilTable(), full = createBotMemory(3), once = createBotMemory(3);
    t.publish('soen', 'arin');
    t.skill('kai', 'ally_check', 'soen');
    const compare = () => {
      const view = viewFor(t.state, t.id.kai!);
      const normal = updateBotKnowledge(view, t.state.log, full);
      const lightweight = updateBotKnowledge(view, t.state.log, once, { recordBattle: false });
      expect(lightweight).toEqual(normal);
      const { battle: fullBattle, ...fullPerception } = full.perception!;
      const { battle: onceBattle, ...oncePerception } = once.perception!;
      expect(oncePerception).toEqual(fullPerception);
      expect(onceBattle.timings.size).toBe(0);
      expect(fullBattle.timings.size).toBeGreaterThan(0);
      return lightweight;
    };
    expect(compare().candidates.get(t.id.soen!)).toEqual(['soen', 'arin']);
    t.p('kai').gem = 2; fill(t, 'kai');
    t.skill('kai', 'truth_gem', 'soen');
    expect(compare().known.get(t.id.soen!)).toBe('soen');
  });

  it('일회성 기억에도 남의 비공개 정체 facts는 들어오지 않는다', () => {
    const t = civilTable(); t.publish('soen', 'arin'); t.skill('kai', 'ally_check', 'soen');
    const memory = createBotMemory(3);
    const knowledge = updateBotKnowledge(viewFor(t.state, t.id.dantes!), t.state.log, memory, { recordBattle: false });
    expect(knowledge.known.has(t.id.soen!)).toBe(false);
    expect(knowledge.candidates.get(t.id.soen!)!.length).toBeGreaterThan(2);
  });

  it.each(['ally_check', 'advanced_scan'])('%s: 진명과 변장의 수신 이벤트가 같고, 정체를 확정하지 않는다', (skill) => {
    const fake = civilTable();
    const genuine = civilTable(CIVIL_ORDER.map((c) => c === 'soen' ? 'arin' : c === 'arin' ? 'soen' : c));
    const actor = skill === 'ally_check' ? 'kai' : 'krate';
    expect(fake.publish('soen', 'arin').ok).toBe(true);
    expect(genuine.publish('arin', 'arin').ok).toBe(true);
    const f = fake.skill(actor, skill, 'soen', skill === 'advanced_scan' ? 'arin' : undefined);
    const g = genuine.skill(actor, skill, 'arin', skill === 'advanced_scan' ? 'arin' : undefined);
    expect(f.ok && g.ok).toBe(true);
    expect(f.events).toEqual(g.events);
    expect(f.events.find((e) => e.kind === 'inspect.result')!.facts).toEqual([
      { player: fake.id.soen, character: null, oneOf: ['arin', 'soen'] },
    ]);
    const memory = createBotMemory(1);
    const k = botKnowledge(fake.state, fake.id[actor]!, undefined, memory);
    expect(k.known.has(fake.id.soen!)).toBe(false);
    expect(k.candidates.get(fake.id.soen!)).toEqual(['soen', 'arin']);
    // 다른 플레이어의 아린 후보를 거짓 확정으로 지우지 않는다.
    expect(k.candidates.get(fake.id.arin!)).toContain('arin');

    // 변장에 속지 않는 정보로 나중에 확정할 수 있다.
    fake.p(actor).gem = 2;
    fill(fake, actor);
    expect(fake.skill(actor, 'truth_gem', 'soen').ok).toBe(true);
    const confirmed = botKnowledge(fake.state, fake.id[actor]!, undefined, memory);
    expect(confirmed.known.get(fake.id.soen!)).toBe('soen');
    expect(confirmed.candidates.get(fake.id.soen!)).toEqual(['soen']);
  });

  it('트롤 위장도 진짜 아군 확인과 같은 후보를 남긴다', () => {
    const t = modeTable('troll', TROLL_ORDER);
    expect(t.publish('neonis', 'satoshi').ok).toBe(true);
    expect(t.skill('uldian', 'ally_check', 'neonis').ok).toBe(true);
    const k = botKnowledge(t.state, t.id.uldian!);
    expect(k.known.has(t.id.neonis!)).toBe(false);
    expect(k.candidates.get(t.id.neonis!)).toEqual(['satoshi', 'neonis']);
  });

  it('변장할 수 없는 공표 상태의 스캔 성공은 확정 정보다', () => {
    const t = civilTable();
    t.publish('arin', 'tuma');
    expect(t.skill('krate', 'advanced_scan', 'arin', 'arin').ok).toBe(true);
    expect(botKnowledge(t.state, t.id.krate!).known.get(t.id.arin!)).toBe('arin');
  });

  it('변장 캐릭터가 공개 사망하면 남은 후보를 정체로 추론한다', () => {
    const t = civilTable();
    t.publish('arin', 'arin');
    t.skill('kai', 'ally_check', 'arin');
    const memory = createBotMemory(3);
    expect(botKnowledge(t.state, t.id.kai!, undefined, memory).known.has(t.id.arin!)).toBe(false);
    expect(t.skill('kaspa', 'attack', 'soen', 'soen').ok).toBe(true);
    const k = botKnowledge(t.state, t.id.kai!, undefined, memory);
    expect(k.known.get(t.id.arin!)).toBe('arin');
    expect(k.candidates.get(t.id.arin!)).toEqual(['arin']);
  });
});

describe('공격 실패 정보 은닉', () => {
  it('이름 오류와 보디가드 실패는 공격자에게 같은 이벤트를 보낸다', () => {
    const wrong = civilTable();
    const guarded = civilTable(CIVIL_ORDER.map((c) => c === 'soen' ? 'dantes' : c === 'dantes' ? 'soen' : c));
    const r = wrong.skill('tuma', 'advanced_attack', 'soen', 'dantes');
    const g = guarded.skill('tuma', 'advanced_attack', 'dantes', 'dantes');
    expect(r.ok && g.ok).toBe(true);
    const visible = (events: typeof r.events, id: string) => events.filter((e) => e.vis.to === 'all' || (e.vis.to === 'players' && e.vis.ids.includes(id)));
    expect(visible(r.events, wrong.id.tuma!)).toEqual(visible(g.events, guarded.id.tuma!));
    expect(r.events.find((e) => e.kind === 'attack.fail.self')!.facts).toBeUndefined();
    expect(botKnowledge(wrong.state, wrong.id.tuma!).candidates.get(wrong.id.soen!)).toContain('dantes');
  });
});

describe('봇별 증분 기억', () => {
  it('불확실한 공격이 실패하면 동률인 다른 대상을 먼저 시도한다', () => {
    const t = modeTable('troll', TROLL_ORDER);
    for (const p of t.state.players) {
      if (['chis', 'satoshi', 'deka'].includes(p.character)) continue;
      p.alive = false;
      t.state.revealed[p.id] = p.character;
    }
    t.p('deka').skills = t.p('deka').skills.filter((s) => s.key === 'supreme_attack');
    t.tick(31 * 60_000);
    fill(t, 'deka');
    const memory = createBotMemory(7);
    const choose = () => {
      for (let i = 0; i < 20; i++) {
        const a = smartBotAction(t.state, t.id.deka!, memory, { activity: 1 });
        if (a) return a;
      }
      throw new Error('no action');
    };
    const first = choose();
    expect(first).toEqual({ type: 'skill', skill: 'supreme_attack', target: t.id.chis, name: 'satoshi' });
    expect(t.act('deka', first).ok).toBe(true);
    t.tick(60_000);
    fill(t, 'deka');
    expect(choose()).toEqual({ type: 'skill', skill: 'supreme_attack', target: t.id.satoshi, name: 'satoshi' });
    expect(memory.perception!.lastAttackFailure.get(t.id.chis!)).toBe(31 * 60_000);
  });

  it('새 이벤트 갱신과 전체 재계산의 결과가 같고, 재접속 뒤 밀린 이벤트도 처리한다', () => {
    const t = civilTable();
    const memory = createBotMemory(2);
    const read = () => botKnowledge(t.state, t.id.kai!, undefined, memory);
    read();
    t.publish('soen', 'arin');
    t.skill('kai', 'ally_check', 'soen');
    const incremental = read();
    expect(incremental).toEqual(botKnowledge(t.state, t.id.kai!));
    const previous = memory.perception;
    const cursor = previous!.lastSeq;
    expect(read()).toEqual(incremental);
    expect(memory.perception).toBe(previous);
    expect(memory.perception!.lastSeq).toBe(cursor);

    t.publish('kaspa', 'kaspa');
    t.tick(120_000);
    fill(t, 'kai');
    t.p('kai').gem = 2;
    expect(t.skill('kai', 'truth_gem', 'kaspa').ok).toBe(true);
    expect(read()).toEqual(botKnowledge(t.state, t.id.kai!));
    expect(memory.perception!.known.get(t.id.kaspa!)).toBe('kaspa');
    expect(memory.perception!.lastSeq).toBeGreaterThan(cursor);
  });

  it('다른 봇의 비공개 결과를 받지 않고, 새 판에는 별도 기억을 사용한다', () => {
    const t = civilTable();
    t.publish('freya', 'freya');
    t.skill('dantes', 'ally_check', 'freya');
    const dantes = createBotMemory(1);
    const mertz = createBotMemory(2);
    // 입력에 전체 로그를 잘못 넣어도 수신자 검사를 통과한 이벤트만 처리한다.
    const dk = updateBotKnowledge(viewFor(t.state, t.id.dantes!), t.state.log, dantes);
    const mk = updateBotKnowledge(viewFor(t.state, t.id.mertz!), t.state.log, mertz);
    expect(dk.known.get(t.id.freya!)).toBe('freya');
    expect(mk.known.has(t.id.freya!)).toBe(false);
    expect(dantes.perception).not.toBe(mertz.perception);
    const next = civilTable();
    expect(botKnowledge(next.state, next.id.dantes!, undefined, createBotMemory(1)).known.size).toBe(0);
  });

  it('공개·개인 이벤트의 커서 조회는 수신자 필터를 유지한다', () => {
    const t = civilTable();
    t.publish('freya', 'freya');
    t.skill('dantes', 'ally_check', 'freya');
    t.act('kai', { type: 'chat', channel: 'whisper', to: t.id.arin!, text: '비밀' });
    for (let cursor = 0; cursor <= t.state.seq + 1; cursor++) {
      expect(eventsFor(t.state, t.id.dantes!, cursor)).toEqual(t.seen('dantes').filter((e) => e.seq > cursor));
    }
  });

  it('같은 관찰이면 다른 숨겨진 배정에서도 같은 지식과 행동을 만든다', () => {
    const a = civilTable();
    const b = civilTable(CIVIL_ORDER.map((c) => c === 'soen' ? 'arin' : c === 'arin' ? 'soen' : c));
    const am = createBotMemory(7);
    const bm = createBotMemory(7);
    expect(viewFor(a.state, a.id.kai!)).toEqual(viewFor(b.state, b.id.kai!));
    expect(botKnowledge(a.state, a.id.kai!, undefined, am)).toEqual(botKnowledge(b.state, b.id.kai!, undefined, bm));
    expect(smartBotAction(a.state, a.id.kai!, am, { activity: 1 })).toEqual(smartBotAction(b.state, b.id.kai!, bm, { activity: 1 }));
  });
});

describe('스킬별 대상 선택', () => {
  it('중화의 주술로 무적과 행동불능이 함께 걸린 아군을 해제한다', () => {
    const t = modeTable('primordial', PRIMORDIAL_ORDER);
    t.publish('kumarin', 'kumarin');
    t.skill('eoril', 'eoril_flame_shackle', 'kumarin');
    t.skill('hermilly', 'hermilly_seeing_libido', 'kumarin');
    fill(t, 'tachin');
    const s = viewFor(t.state, t.id.tachin!).me.skills.find((x) => x.key === 'tachin_neutralize')!;
    expect(s.ignoresInvulnerable).toBe(true);
    const action = smartBotAction(t.state, t.id.tachin!, createBotMemory(8), { activity: 1 });
    expect(action).toEqual({ type: 'skill', skill: 'tachin_neutralize', target: t.id.kumarin });
    expect(t.act('tachin', action!).ok).toBe(true);
    expect(t.p('kumarin').effects).toHaveLength(0);
  });
});
