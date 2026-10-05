import { describe, expect, it } from 'vitest';
import { eventsFor, viewFor } from '../src/index.js';
import { civilTable, fill, lastText } from './helpers.js';

describe('공표', () => {
  it('마나 +5, 쿨 40초, 전체 공지, 이전 이름 표시', () => {
    const t = civilTable();
    const r = t.publish('kai', 'tuma');
    expect(r.ok).toBe(true);
    expect(t.p('kai').mana).toBe(125);
    expect(t.p('kai').published).toBe('tuma');
    expect(r.events.find((e) => e.kind === 'publish')!.vis).toEqual({ to: 'all' });
    expect(t.publish('kai', 'kai', 39_999).ok).toBe(false);
    const r2 = t.publish('kai', 'kai', 40_000);
    expect(r2.ok).toBe(true);
    expect(lastText(r2)).toContain('투마 -> 카이로');
  });

  it('게임에 없는 캐릭터 이름으로는 공표할 수 없다', () => {
    const t = civilTable(['dantes', 'mertz', 'kelhu', 'freya', 'soen', 'kai', 'arin', 'krate']);
    expect(t.publish('kai', 'sephy').ok).toBe(false);
    expect(t.publish('kai', 'dantes').ok).toBe(true);
  });
});

describe('동맹', () => {
  it('단방향 설정, 본인·대상에게만 알림, 중복·미동맹 파기는 비용 없이 거절', () => {
    const t = civilTable();
    const r = t.skill('arin', 'ally', 'kai');
    expect(r.ok).toBe(true);
    expect(t.p('arin').allies).toEqual([t.id.kai]);
    expect(t.p('kai').allies).toEqual([]);
    expect(r.events.every((e) => e.vis.to === 'players')).toBe(true);
    const mana = t.p('arin').mana;
    const dup = t.skill('arin', 'ally', 'kai', undefined, 20_000);
    expect(dup.ok).toBe(false);
    expect(t.p('arin').mana).toBe(mana);
    expect(t.skill('kai', 'break_ally', 'arin').ok).toBe(false);
    expect(t.skill('arin', 'break_ally', 'kai').ok).toBe(true);
    expect(t.p('arin').allies).toEqual([]);
  });

  it('동맹 채팅은 내가 동맹을 건 사람만 본다', () => {
    const t = civilTable();
    t.skill('arin', 'ally', 'kai');
    t.act('arin', { type: 'chat', channel: 'ally', text: '나 아린' });
    const saw = (c: string) => eventsFor(t.state, t.id[c]!).some((e) => e.kind === 'chat.ally');
    expect(saw('arin')).toBe(true);
    expect(saw('kai')).toBe(true);
    expect(saw('dantes')).toBe(false);
  });
});

describe('공격', () => {
  it('정답이면 살해·정체 공개, 공격자 영웅명은 공개되지만 플레이어는 아니다', () => {
    const t = civilTable();
    const r = t.skill('kaspa', 'attack', 'freya', 'freya');
    expect(r.ok).toBe(true);
    expect(t.p('freya').alive).toBe(false);
    expect(t.state.revealed[t.id.freya!]).toBe('freya');
    expect(t.state.revealed[t.id.kaspa!]).toBeUndefined();
    expect(lastText(r)).toContain('카스파가 프레이아를 공격하여 살해했습니다');
    expect(t.p('kaspa').mana).toBe(120); // 120 - 50 + 50(정기 흡수)
  });

  it('오답이면 일반 공격자는 사망, 대상은 누가 공격했는지(영웅명) 비공개로 안다', () => {
    const t = civilTable();
    const r = t.skill('kaspa', 'attack', 'freya', 'soen');
    expect(t.p('kaspa').alive).toBe(false);
    expect(t.p('freya').alive).toBe(true);
    const toFreya = r.events.find((e) => e.kind === 'attack.fail.target')!;
    expect(toFreya.vis).toEqual({ to: 'players', ids: [t.id.freya] });
    expect(toFreya.text).toContain('카스파');
  });

  it('상급 공격: 첫 실패는 경고, 두 번째 실패는 사망', () => {
    const t = civilTable();
    fill(t, 'kai');
    t.skill('kai', 'advanced_attack', 'freya', 'soen');
    expect(t.p('kai').alive).toBe(true);
    expect(t.p('kai').skills.find((s) => s.key === 'advanced_attack')!.level).toBe(2);
    t.p('kai').mana = 150;
    t.skill('kai', 'advanced_attack', 'freya', 'soen', 60_000);
    expect(t.p('kai').alive).toBe(false);
  });

  it('켈후는 3번, 투마는 2번 맞아야 죽는다', () => {
    const t = civilTable();
    fill(t, 'kaspa', 'arin');
    t.skill('kaspa', 'attack', 'kelhu', 'kelhu');
    t.skill('arin', 'attack', 'kelhu', 'kelhu');
    expect(t.p('kelhu').alive).toBe(true);
    expect(t.p('kelhu').extraLives).toBe(0);
    t.p('kaspa').mana = 150;
    t.skill('kaspa', 'attack', 'kelhu', 'kelhu', 60_000);
    expect(t.p('kelhu').alive).toBe(false);

    fill(t, 'mertz');
    t.skill('mertz', 'advanced_attack', 'tuma', 'tuma');
    expect(t.p('tuma').alive).toBe(true);
    t.p('mertz').mana = 150;
    t.skill('mertz', 'advanced_attack', 'tuma', 'tuma', 120_000);
    expect(t.p('tuma').alive).toBe(false);
  });

  it('아린이 살아 있으면 카이를 정답으로 공격해도 공격자가 실패 처리된다', () => {
    const t = civilTable();
    t.skill('dantes', 'attack', 'kai', 'kai');
    expect(t.p('kai').alive).toBe(true);
    expect(t.p('dantes').alive).toBe(false);
  });

  it('아린이 죽으면 카이를 공격으로 잡을 수 있고 단테스측이 승리한다', () => {
    const t = civilTable();
    t.skill('mertz', 'advanced_attack', 'arin', 'arin');
    expect(t.p('arin').alive).toBe(false);
    t.skill('dantes', 'attack', 'kai', 'kai');
    expect(t.p('kai').alive).toBe(false);
    expect(t.state.phase).toBe('ended');
    expect(t.state.winner).toBe(1);
  });

  it('공격 이름 선택지는 상대 진영 이름뿐이다', () => {
    const t = civilTable();
    expect(t.skill('kaspa', 'attack', 'freya', 'tuma').ok).toBe(false);
    const opts = viewFor(t.state, t.id.kaspa!).me.skills.find((s) => s.key === 'attack')!.nameOptions!;
    expect(opts.sort()).toEqual(['dantes', 'freya', 'kelhu', 'mertz', 'reindila', 'sephy', 'soen'].sort());
  });

  it('아군 이름으로는 공격할 수 없다 (같은 편 살해 경로 없음 → 정기 흡수는 적 살해에만, A9)', () => {
    const t = civilTable();
    const r = t.skill('kaspa', 'attack', 'tuma', 'tuma');
    expect(r.ok).toBe(false);
    expect(t.p('kaspa').mana).toBe(120);
    expect(t.p('tuma').alive).toBe(true);
  });

  it('마나 부족·쿨다운·행동불능·사망 상태에서는 비용 없이 거절', () => {
    const t = civilTable();
    t.p('kaspa').mana = 49;
    expect(t.skill('kaspa', 'attack', 'freya', 'freya').ok).toBe(false);
    expect(t.p('kaspa').mana).toBe(49);
    expect(t.p('freya').alive).toBe(true);

    t.skill('krate', 'nightmare', 'kaspa');
    t.p('kaspa').mana = 150;
    const r = t.skill('kaspa', 'attack', 'freya', 'freya');
    expect(r.ok).toBe(false);
    expect(r.error).toContain('행동 불능');
    expect(t.p('kaspa').mana).toBe(150);
  });

  it('무적 대상은 지정할 수 없다', () => {
    const t = civilTable();
    t.skill('arin', 'rune_protection', 'kaspa');
    const r = t.skill('dantes', 'attack', 'kaspa', 'kaspa');
    expect(r.ok).toBe(false);
    expect(r.error).toContain('보호');
    t.tick(45_000);
    expect(t.skill('dantes', 'attack', 'kaspa', 'kaspa').ok).toBe(true);
  });
});

describe('아군/적군 확인, 스캔', () => {
  it('아군 확인: 같은 진영이고 진명이면 성공. 시전 사실은 대상과 함께 전체 공지', () => {
    const t = civilTable();
    t.publish('freya', 'freya');
    const r = t.skill('dantes', 'ally_check', 'freya');
    const pub = r.events.find((e) => e.kind === 'inspect')!;
    expect(pub.vis).toEqual({ to: 'all' });
    const res = r.events.find((e) => e.kind === 'inspect.result')!;
    expect(res.vis).toEqual({ to: 'players', ids: [t.id.dantes] });
    expect(res.data!.success).toBe(true);
    expect(res.facts).toEqual([{ player: t.id.freya, character: 'freya' }]);
  });

  it('아군 확인: 진명이어도 다른 진영이면 실패, 진명이 아니면 실패', () => {
    const t = civilTable();
    t.publish('kaspa', 'kaspa');
    expect(t.skill('dantes', 'ally_check', 'kaspa').events.find((e) => e.kind === 'inspect.result')!.data!.success).toBe(false);
    t.publish('freya', 'soen');
    expect(t.skill('sephy', 'ally_check', 'freya').events.find((e) => e.kind === 'inspect.result')!.data!.success).toBe(false);
  });

  it('적군 확인: 다른 진영이고 진명이면 성공', () => {
    const t = civilTable();
    t.publish('kai', 'kai');
    const r = t.skill('soen', 'enemy_check', 'kai');
    expect(r.events.find((e) => e.kind === 'inspect.result')!.data).toMatchObject({ success: true, character: 'kai' });
  });

  it('스캔: 이름의 주인이 대상이면 성공, 지휘관 이름은 고를 수 없다', () => {
    const t = civilTable();
    expect(t.skill('freya', 'scan', 'kai', 'kai').ok).toBe(false);
    const r = t.skill('freya', 'scan', 'tuma', 'tuma');
    expect(r.events.find((e) => e.kind === 'inspect.result')!.data!.success).toBe(true);
    const r2 = t.skill('krate', 'advanced_scan', 'freya', 'soen');
    expect(r2.events.find((e) => e.kind === 'inspect.result')!.data!.success).toBe(false);
  });

  it('소엔 변장: 카이측 이름으로 공표하면 카이측 아군 확인·스캔에 그 이름으로 "성공" 한 줄만 보인다 (A1)', () => {
    const t = civilTable();
    t.publish('soen', 'arin');
    const r = t.skill('kai', 'ally_check', 'soen');
    const res = r.events.filter((e) => e.kind === 'inspect.result');
    expect(res).toHaveLength(1);
    expect(res[0]!.data).toMatchObject({ success: true, character: 'arin' });

    const s = t.skill('krate', 'advanced_scan', 'soen', 'arin');
    const sres = s.events.filter((e) => e.kind === 'inspect.result');
    expect(sres).toHaveLength(1);
    expect(sres[0]!.data).toMatchObject({ success: true, character: 'arin' });
  });

  it('변장은 단테스측의 확인에는 통하지 않는다', () => {
    const t = civilTable();
    t.publish('soen', 'arin');
    const r = t.skill('dantes', 'ally_check', 'soen');
    expect(r.events.find((e) => e.kind === 'inspect.result')!.data!.success).toBe(false);
  });
});

describe('진실의 보석', () => {
  it('2/3 조각: 마나 50, 1회 사용 후 소멸, 지휘관은 지휘관으로만', () => {
    const t = civilTable();
    t.publish('freya', 'freya');
    t.tick(180_000);
    expect(t.p('freya').gem).toBe(2);
    const view = viewFor(t.state, t.id.freya!);
    expect(view.me.skills.find((s) => s.key === 'truth_gem')!.mana).toBe(50);
    t.p('freya').mana = 100;
    const r = t.skill('freya', 'truth_gem', 'kai');
    expect(r.ok).toBe(true);
    expect(t.p('freya').mana).toBe(50);
    expect(t.p('freya').gem).toBe(0);
    const res = r.events.find((e) => e.kind === 'gem.result')!;
    expect(res.text).toContain('지휘관');
    expect(res.facts).toEqual([{ player: t.id.kai, character: null, commander: true }]);
    expect(r.events.find((e) => e.kind === 'gem.use')!.vis).toEqual({ to: 'all' });
  });

  it('완성된 보석: 마나 75, 무제한, 쿨 240초', () => {
    const t = civilTable();
    t.publish('freya', 'freya');
    t.tick(270_000);
    expect(t.p('freya').gem).toBe(3);
    fill(t, 'freya');
    expect(t.skill('freya', 'truth_gem', 'tuma').ok).toBe(true);
    expect(t.p('freya').gem).toBe(3);
    expect(t.p('freya').mana).toBe(75);
    fill(t, 'freya');
    expect(t.skill('freya', 'truth_gem', 'tuma', undefined, t.now + 239_000).ok).toBe(false);
    expect(t.skill('freya', 'truth_gem', 'tuma', undefined, t.now + 1_000).ok).toBe(true);
  });
});

describe('채팅', () => {
  it('전체 방송은 단테스·카이만, 마나 35, 캐릭터 이름으로 표시', () => {
    const t = civilTable();
    expect(t.act('tuma', { type: 'chat', channel: 'global', text: 'x' }).ok).toBe(false);
    const r = t.act('dantes', { type: 'chat', channel: 'global', text: '카이를 찾아라' });
    expect(r.ok).toBe(true);
    expect(t.p('dantes').mana).toBe(85);
    expect(r.events[0]!.text).toBe('단테스: 카이를 찾아라');
    expect(r.events[0]!.vis).toEqual({ to: 'all' });
  });

  it('귓속말은 두 사람만, 사망자는 사망자 채널만', () => {
    const t = civilTable();
    t.act('arin', { type: 'chat', channel: 'whisper', text: '비밀', to: t.id.kai! });
    expect(eventsFor(t.state, t.id.kai!).some((e) => e.kind === 'chat.whisper')).toBe(true);
    expect(eventsFor(t.state, t.id.dantes!).some((e) => e.kind === 'chat.whisper')).toBe(false);

    t.skill('kaspa', 'attack', 'freya', 'freya');
    expect(t.act('freya', { type: 'chat', channel: 'all', text: '억울' }).ok).toBe(false);
    expect(t.act('freya', { type: 'chat', channel: 'dead', text: '억울' }).ok).toBe(true);
    expect(eventsFor(t.state, t.id.kai!).some((e) => e.kind === 'chat.dead')).toBe(false);
  });
});
