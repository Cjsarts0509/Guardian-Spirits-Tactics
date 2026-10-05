import { describe, expect, it } from 'vitest';
import { viewFor } from '../src/index.js';
import { civilTable, fill, lastText } from './helpers.js';

describe('단테스', () => {
  it('마황자의 명령: 카이를 맞히면 보디가드 무시하고 처형 → 단테스측 승리', () => {
    const t = civilTable();
    const r = t.skill('dantes', 'dantes_command', 'kai');
    expect(r.ok).toBe(true);
    expect(t.p('kai').alive).toBe(false);
    expect(t.state.winner).toBe(1);
  });

  it('마황자의 명령: 카이가 아니면 단테스가 죽고, 후계자가 없으면 카이측 승리', () => {
    const t = civilTable();
    t.skill('dantes', 'dantes_command', 'arin');
    expect(t.p('dantes').alive).toBe(false);
    expect(t.state.winner).toBe(2);
  });

  it('마황자의 명령 실패로 단테스가 죽어도 후계자가 있으면 게임은 계속된다', () => {
    const t = civilTable();
    t.skill('dantes', 'dantes_successor', 'mertz');
    t.skill('dantes', 'dantes_command', 'arin');
    expect(t.p('dantes').alive).toBe(false);
    expect(t.state.phase).toBe('running');
    expect(t.state.log.some((e) => e.kind === 'succession')).toBe(true);
  });

  it('후계자 임명: 성공 시 전체 공지(누가인지는 비공개), 실패해도 스킬 소멸', () => {
    const t = civilTable();
    const r = t.skill('dantes', 'dantes_successor', 'mertz');
    expect(r.events.find((e) => e.kind === 'skill.successor')!.vis).toEqual({ to: 'all' });
    expect(t.p('mertz').skills.some((s) => s.key === 'successor')).toBe(true);
    const t2 = civilTable();
    t2.skill('dantes', 'dantes_successor', 'kelhu');
    expect(t2.p('dantes').skills.some((s) => s.key === 'dantes_successor')).toBe(false);
    expect(t2.p('kelhu').skills.some((s) => s.key === 'successor')).toBe(false);
  });
});

describe('후계자 승계 (승리 판정 순서)', () => {
  it('후계자가 있으면 단테스가 죽어도 계속, 승계 공지는 1번만', () => {
    const t = civilTable();
    t.skill('dantes', 'dantes_successor', 'mertz');
    t.skill('kai', 'soul_reaver', 'dantes');
    expect(t.p('dantes').alive).toBe(false);
    expect(t.state.phase).toBe('running');
    t.tick(90_000);
    t.tick(90_000);
    const n = t.state.log.filter((e) => e.kind === 'succession').length;
    expect(n).toBe(1);
  });

  it('후계자까지 죽으면 카이측 승리', () => {
    const t = civilTable();
    t.skill('dantes', 'dantes_successor', 'mertz');
    t.skill('kai', 'soul_reaver', 'dantes');
    t.skill('arin', 'attack', 'mertz', 'mertz');
    expect(t.state.winner).toBe(2);
  });

  it('후계자가 먼저 죽고 단테스가 죽어도 카이측 승리', () => {
    const t = civilTable();
    t.skill('dantes', 'dantes_successor', 'mertz');
    t.skill('arin', 'attack', 'mertz', 'mertz');
    expect(t.state.phase).toBe('running');
    t.skill('kai', 'soul_reaver', 'dantes');
    expect(t.state.winner).toBe(2);
  });

  it('카이 사망 판정이 먼저다', () => {
    const t = civilTable();
    t.skill('dantes', 'dantes_command', 'kai');
    expect(t.state.winner).toBe(1);
  });
});

describe('메르츠키엘 / 레인딜라', () => {
  it('배우자: 맞히면 본인에게만 알려주고 스킬 소멸, 틀리면 유지', () => {
    const t = civilTable();
    const miss = t.skill('mertz', 'mertz_spouse', 'sephy');
    expect(miss.events.every((e) => e.vis.to === 'players')).toBe(true);
    expect(t.p('mertz').skills.some((s) => s.key === 'mertz_spouse')).toBe(true);
    const hit = t.skill('mertz', 'mertz_spouse', 'reindila', undefined, 40_000);
    expect(hit.events[0]!.facts).toEqual([{ player: t.id.reindila, character: 'reindila' }]);
    expect(t.p('mertz').skills.some((s) => s.key === 'mertz_spouse')).toBe(false);
  });

  it('쉐도우 자일: 45초 행동불능+무적, 시전자 캐릭터 공개, 효과는 독립적으로 끝난다 (A6)', () => {
    const t = civilTable();
    t.skill('mertz', 'shadow_jail', 'kai');
    expect(t.skill('kai', 'ally_check', 'arin').ok).toBe(false);
    expect(t.skill('dantes', 'attack', 'kai', 'kai').error).toContain('보호');
    // 30초 후 교란이 겹쳐 걸릴 수는 없다 (무적). 대신 다른 대상 확인
    t.tick(45_000);
    expect(t.skill('kai', 'ally_check', 'arin').ok).toBe(true);
  });

  it('행동불능 중첩: 먼저 끝난 효과가 나머지를 풀지 않는다 (A6)', () => {
    const t = civilTable();
    t.skill('krate', 'nightmare', 'freya');
    t.tick(20_000);
    t.skill('sephy', 'confusion', 'freya');
    t.tick(25_000); // 나이트메어 종료
    expect(t.skill('freya', 'scan', 'tuma', 'tuma').error).toContain('행동 불능');
    t.tick(20_000); // 교란 종료
    expect(t.skill('freya', 'scan', 'tuma', 'tuma').ok).toBe(true);
  });

  it('리비도의 여사제: 진명이 아니면 비용 없이 거절, 진명이면 프레이아 정체', () => {
    const t = civilTable();
    const r = t.skill('reindila', 'libido_priestess');
    expect(r.ok).toBe(false);
    expect(t.p('reindila').mana).toBe(120);
    t.publish('reindila', 'reindila');
    const ok = t.skill('reindila', 'libido_priestess');
    expect(ok.ok).toBe(true);
    expect(ok.events[0]!.facts).toEqual([{ player: t.id.freya, character: 'freya' }]);
    expect(t.p('reindila').skills.some((s) => s.key === 'libido_priestess')).toBe(false);
  });

  it('영혼의 회복: 60초 동안 공격 실패 페널티 없음', () => {
    const t = civilTable();
    t.skill('reindila', 'soul_recovery', 'dantes');
    const r = t.skill('dantes', 'attack', 'kaspa', 'tuma');
    expect(t.p('dantes').alive).toBe(true);
    expect(lastText(r)).toContain('영혼의 회복으로 인해');
    t.tick(60_000);
    fill(t, 'dantes');
    t.skill('dantes', 'attack', 'kaspa', 'tuma');
    expect(t.p('dantes').alive).toBe(false);
  });

  it('영혼의 벽: 레인딜라가 죽고, 대상은 소울 리버에 죽지 않는다', () => {
    const t = civilTable();
    t.skill('reindila', 'soul_wall', 'dantes');
    expect(t.p('reindila').alive).toBe(false);
    const r = t.skill('kai', 'soul_reaver', 'dantes');
    expect(r.ok).toBe(true);
    expect(t.p('dantes').alive).toBe(true);
    expect(lastText(r)).toContain('영혼의 벽');
  });
});

describe('켈후 / 소엔', () => {
  it('충복: 단테스면 알아낸다', () => {
    const t = civilTable();
    const r = t.skill('kelhu', 'kelhu_loyal', 'dantes');
    expect(r.events[0]!.facts).toEqual([{ player: t.id.dantes, character: 'dantes' }]);
  });

  it('전사의 후각: 상급/최상급 공격 보유 여부로 판정 (투마도 상급 전사, A13)', () => {
    const t = civilTable();
    fill(t, 'kelhu');
    expect(t.skill('kelhu', 'warrior_scent', 'tuma').events[0]!.data!.result).toBe(true);
    const t2 = civilTable();
    expect(t2.skill('kelhu', 'warrior_scent', 'arin').events[0]!.data!.result).toBe(false);
    expect(t2.skill('tuma', 'warrior_scent', 'kai').events[0]!.data!.result).toBe(true);
  });

  it('전사의 후각: 투마/켈후 이름을 공표한 대상에게는 비용 없이 거절', () => {
    const t = civilTable();
    t.publish('kai', 'tuma');
    const r = t.skill('kelhu', 'warrior_scent', 'kai');
    expect(r.ok).toBe(false);
    expect(t.p('kelhu').mana).toBe(120);
  });

  it('조언: 켈후면 냉정함·상호 동맹·켈후에게 소엔 공개, 성공 여부와 관계없이 소멸', () => {
    const t = civilTable();
    t.skill('soen', 'advice', 'kelhu');
    expect(t.p('kelhu').skills.some((s) => s.key === 'calmness')).toBe(true);
    expect(t.p('soen').allies).toContain(t.id.kelhu);
    expect(t.p('kelhu').allies).toContain(t.id.soen);
    expect(t.p('soen').skills.some((s) => s.key === 'advice')).toBe(false);
  });

  it('백스탭: 소엔에게 동맹을 건 대상은 진영 무관 즉사(목숨 무시) + 연쇄살인 획득 (G6)', () => {
    const t = civilTable();
    const no = t.skill('soen', 'backstab', 'tuma');
    expect(no.ok).toBe(false);
    expect(t.p('soen').mana).toBe(120);
    t.skill('tuma', 'ally', 'soen');
    t.skill('soen', 'backstab', 'tuma');
    expect(t.p('tuma').alive).toBe(false);
    expect(t.p('soen').skills.some((s) => s.key === 'soen_chain_murder')).toBe(true);
    // 같은 편이어도 동맹을 걸었으면 죽는다
    t.skill('freya', 'ally', 'soen');
    t.skill('soen', 'backstab', 'freya', undefined, 2_000);
    expect(t.p('freya').alive).toBe(false);
  });

  it('연쇄살인: 정답 살해 시 유지, 실패해도 소엔은 안 죽고 스킬만 잃음', () => {
    const t = civilTable();
    t.skill('tuma', 'ally', 'soen');
    t.skill('soen', 'backstab', 'tuma');
    fill(t, 'soen');
    t.skill('soen', 'soen_chain_murder', 'kaspa', 'kaspa', 10_000);
    expect(t.p('kaspa').alive).toBe(false);
    expect(t.p('soen').skills.some((s) => s.key === 'soen_chain_murder')).toBe(true);
    t.skill('soen', 'soen_chain_murder', 'krate', 'arin', 20_000);
    expect(t.p('soen').alive).toBe(true);
    expect(t.p('krate').alive).toBe(true);
    expect(t.p('soen').skills.some((s) => s.key === 'soen_chain_murder')).toBe(false);
  });

  it('연쇄살인: 아린이 살아 있으면 카이 정답도 실패', () => {
    const t = civilTable();
    t.skill('tuma', 'ally', 'soen');
    t.skill('soen', 'backstab', 'tuma');
    t.skill('soen', 'soen_chain_murder', 'kai', 'kai', 10_000);
    expect(t.p('kai').alive).toBe(true);
    expect(t.p('soen').skills.some((s) => s.key === 'soen_chain_murder')).toBe(false);
  });
});

describe('세피 / 크레이트', () => {
  it('버닝 매직: 대상 마나 -70, 대상은 공개되지 않음', () => {
    const t = civilTable();
    const r = t.skill('sephy', 'burning_magic', 'kai');
    expect(t.p('kai').mana).toBe(50);
    expect(r.events.find((e) => e.vis.to === 'all')!.text).not.toContain(t.p('kai').nickname);
  });

  it('저주: 진명 필요, 대상 마나 50 이하면 정체 (지휘관은 지휘관으로만)', () => {
    const t = civilTable();
    expect(t.skill('sephy', 'curse', 'tuma').ok).toBe(false);
    t.publish('sephy', 'sephy');
    t.p('tuma').mana = 80;
    expect(t.skill('sephy', 'curse', 'tuma').events[0]!.data!.success).toBe(false);
    t.tick(200_000);
    t.p('tuma').mana = 50;
    fill(t, 'sephy');
    const r = t.skill('sephy', 'curse', 'tuma');
    expect(r.events.find((e) => e.kind === 'skill.curse')!.facts).toEqual([{ player: t.id.tuma, character: 'tuma' }]);
  });

  it('교란·나이트메어: 문구가 같아 시전자를 구분할 수 없다', () => {
    const t = civilTable();
    const a = t.skill('sephy', 'confusion', 'kai').events.find((e) => e.kind === 'status.incapacitated')!.text;
    const b = t.skill('krate', 'nightmare', 'arin').events.find((e) => e.kind === 'status.incapacitated')!.text;
    expect(a.replace(t.p('kai').nickname, 'X').replace('[8]', '[n]')).toBe(b.replace(t.p('arin').nickname, 'X').replace('[9]', '[n]'));
  });
});

describe('카이측', () => {
  it('소울 리버: 즉사(목숨 무시), 20초 뒤 카이 정체 공개, 1회용', () => {
    const t = civilTable();
    t.skill('kai', 'soul_reaver', 'kelhu');
    expect(t.p('kelhu').alive).toBe(false);
    expect(t.state.revealed[t.id.kai!]).toBeUndefined();
    const evs = t.tick(20_000);
    expect(evs.some((e) => e.kind === 'reveal')).toBe(true);
    expect(t.state.revealed[t.id.kai!]).toBe('kai');
    expect(t.p('kai').skills.some((s) => s.key === 'soul_reaver')).toBe(false);
  });

  it('충복(아린/카스파): 카이면 알아낸다', () => {
    const t = civilTable();
    expect(t.skill('kaspa', 'kai_loyal', 'kai').events[0]!.data!.success).toBe(true);
    expect(t.skill('arin', 'kai_loyal', 'tuma').events[0]!.data!.success).toBe(false);
  });

  it('용맹한 돌진: 냉정함 없는 켈후 즉사, 카이·투마 상호 동맹 및 정체 교환', () => {
    const t = civilTable();
    t.skill('tuma', 'valiant_charge', 'kelhu');
    expect(t.p('kelhu').alive).toBe(false);
    expect(t.p('kai').allies).toContain(t.id.tuma);
    expect(t.p('tuma').allies).toContain(t.id.kai);
    expect(t.p('tuma').skills.some((s) => s.key === 'valiant_charge')).toBe(false);
  });

  it('용맹한 돌진: 냉정함이 있으면 실패하고 스킬 소멸', () => {
    const t = civilTable();
    t.skill('soen', 'advice', 'kelhu');
    t.skill('tuma', 'valiant_charge', 'kelhu');
    expect(t.p('kelhu').alive).toBe(true);
    expect(t.p('tuma').skills.some((s) => s.key === 'valiant_charge')).toBe(false);
  });

  it('신탁: 대상의 보석 단계', () => {
    const t = civilTable();
    t.publish('kai', 'kai');
    t.tick(180_000);
    const r = t.skill('freya', 'oracle', 'kai');
    expect(r.events[0]!.data!.gem).toBe(2);
  });

  it('그림자의 눈: 조각이 없으면 비용 없이 거절, 있으면 소모하고 정확한 정체(지휘관 포함)', () => {
    const t = civilTable();
    t.tick(300_000);
    expect(t.skill('kaspa', 'shadow_eye', 'dantes').ok).toBe(false);
    t.publish('kaspa', 'kaspa');
    t.tick(90_000);
    const r = t.skill('kaspa', 'shadow_eye', 'dantes');
    expect(r.ok).toBe(true);
    expect(r.events[0]!.facts).toEqual([{ player: t.id.dantes, character: 'dantes' }]);
    expect(t.p('kaspa').gem).toBe(0);
  });

  it('룬 프로텍션은 공지되지 않는다', () => {
    const t = civilTable();
    const r = t.skill('arin', 'rune_protection', 'kai');
    expect(r.events.every((e) => e.vis.to === 'players')).toBe(true);
    const others = viewFor(t.state, t.id.dantes!).players.find((p) => p.id === t.id.kai)!;
    expect(others.statuses).toEqual([]);
  });
});
