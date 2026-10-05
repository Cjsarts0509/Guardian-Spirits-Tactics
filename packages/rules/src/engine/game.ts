import { MAX_MANA } from '../constants.js';
import { josa } from '../text.js';
import type {
  CharKey,
  Effect,
  EffectKind,
  Fact,
  GameEvent,
  GameState,
  PlayerId,
  PlayerState,
  ScheduledTask,
  Side,
  SkillInstance,
  SkillKey,
  Visibility,
} from '../types.js';
import type { CharacterDef, ModeDef, SkillDef } from '../modes/types.js';
import { skillRegistry } from '../skills/registry.js';

/**
 * 한 번의 처리(액션 1개, 시간 진행 1회) 동안 상태와 모드를 묶어 다루는 래퍼.
 * 상태는 제자리에서 변경되고, 이번 처리에서 발생한 이벤트는 `events` 에 모인다.
 */
export class Game {
  readonly events: GameEvent[] = [];

  constructor(
    readonly state: GameState,
    readonly mode: ModeDef,
  ) {}

  get now(): number {
    return this.state.now;
  }

  get ended(): boolean {
    return this.state.phase === 'ended';
  }

  // ───────────── 조회 ─────────────

  player(id: PlayerId): PlayerState | undefined {
    return this.state.players.find((p) => p.id === id);
  }

  mustPlayer(id: PlayerId): PlayerState {
    const p = this.player(id);
    if (!p) throw new Error(`unknown player ${id}`);
    return p;
  }

  /** 해당 캐릭터를 맡은 플레이어 (생사 무관). 인원 부족으로 빠진 캐릭터면 undefined */
  byChar(key: CharKey): PlayerState | undefined {
    return this.state.players.find((p) => p.character === key);
  }

  charInGame(key: CharKey): boolean {
    return this.byChar(key) !== undefined;
  }

  /** 빠진 캐릭터는 사망으로 취급 (DECISIONS G2) */
  charAlive(key: CharKey): boolean {
    const p = this.byChar(key);
    return !!p && p.alive;
  }

  charDef(key: CharKey): CharacterDef {
    const c = this.mode.characters.find((x) => x.key === key);
    if (!c) throw new Error(`unknown character ${key}`);
    return c;
  }

  charName(key: CharKey): string {
    return this.charDef(key).name;
  }

  isCommander(key: CharKey): boolean {
    return this.charDef(key).commander;
  }

  /** 이번 판에 배정된 캐릭터 (슬롯 순) */
  rosterInGame(): CharacterDef[] {
    return this.mode.characters.filter((c) => this.charInGame(c.key));
  }

  sideRoster(side: Side): CharacterDef[] {
    return this.rosterInGame().filter((c) => c.side === side);
  }

  commandersInGame(): CharKey[] {
    return this.rosterInGame()
      .filter((c) => c.commander)
      .map((c) => c.key);
  }

  /** 화면 표기 "[seat] 닉네임" (원본 H[p]) */
  label(p: PlayerState): string {
    return `[${p.seat}] ${p.nickname}`;
  }

  alivePlayers(): PlayerState[] {
    return this.state.players.filter((p) => p.alive);
  }

  // ───────────── 스킬 ─────────────

  skillDef(key: SkillKey): SkillDef {
    const def = this.mode.skills[key] ?? skillRegistry[key];
    if (!def) throw new Error(`unknown skill ${key}`);
    return def;
  }

  skill(p: PlayerState, key: SkillKey): SkillInstance | undefined {
    return p.skills.find((s) => s.key === key);
  }

  hasSkill(p: PlayerState, key: SkillKey): boolean {
    return this.skill(p, key) !== undefined;
  }

  grantSkill(p: PlayerState, key: SkillKey): void {
    if (this.hasSkill(p, key)) return;
    const def = this.skillDef(key);
    p.skills.push({ key, cooldownUntil: 0, usesLeft: def.uses, level: 1 });
  }

  removeSkill(p: PlayerState, key: SkillKey): void {
    p.skills = p.skills.filter((s) => s.key !== key);
  }

  // ───────────── 마나 ─────────────

  addMana(p: PlayerState, amount: number): void {
    p.mana = Math.max(0, Math.min(MAX_MANA, p.mana + amount));
  }

  // ───────────── 동맹 ─────────────

  /** a 가 b 에게 동맹을 걸었는가 */
  isAllied(a: PlayerState, b: PlayerState): boolean {
    return a.allies.includes(b.id);
  }

  setAlly(a: PlayerState, b: PlayerState, on: boolean): void {
    if (on) {
      if (!a.allies.includes(b.id)) a.allies.push(b.id);
    } else {
      a.allies = a.allies.filter((id) => id !== b.id);
    }
  }

  /** 나에게 동맹을 건 생존 플레이어 */
  alliedBy(p: PlayerState): PlayerState[] {
    return this.state.players.filter((q) => q.alive && q.id !== p.id && q.allies.includes(p.id));
  }

  // ───────────── 효과 ─────────────

  addEffect(p: PlayerState, kind: EffectKind, seconds: number, source: SkillKey, announced: boolean): Effect {
    const e: Effect = {
      id: ++this.state.effectSeq,
      kind,
      until: this.now + seconds * 1000,
      source,
      announced,
    };
    p.effects.push(e);
    this.schedule(e.until, 'effectEnd', { player: p.id, effect: e.id });
    return e;
  }

  activeEffects(p: PlayerState): Effect[] {
    return p.effects.filter((e) => e.until > this.now);
  }

  isIncapacitated(p: PlayerState): boolean {
    return this.activeEffects(p).some((e) => e.kind === 'incapacitated');
  }

  isInvulnerable(p: PlayerState): boolean {
    return this.activeEffects(p).some((e) => e.kind === 'invulnerable');
  }

  // ───────────── 일정 ─────────────

  schedule(at: number, kind: ScheduledTask['kind'], payload: Record<string, unknown>): void {
    const task: ScheduledTask = { id: ++this.state.taskSeq, at, kind, payload };
    const q = this.state.queue;
    let i = q.length;
    while (i > 0 && (q[i - 1] as ScheduledTask).at > at) i--;
    q.splice(i, 0, task);
  }

  // ───────────── 이벤트 ─────────────

  emit(vis: Visibility, kind: string, text: string, data?: Record<string, unknown>, facts?: Fact[]): GameEvent {
    const ev: GameEvent = {
      seq: ++this.state.seq,
      at: this.now - this.state.startedAt,
      kind,
      vis,
      text,
    };
    if (data) ev.data = data;
    if (facts && facts.length) ev.facts = facts;
    this.state.log.push(ev);
    this.events.push(ev);
    return ev;
  }

  toAll(kind: string, text: string, data?: Record<string, unknown>): GameEvent {
    return this.emit({ to: 'all' }, kind, text, data);
  }

  toPlayers(players: PlayerState[], kind: string, text: string, data?: Record<string, unknown>, facts?: Fact[]): GameEvent {
    return this.emit({ to: 'players', ids: players.map((p) => p.id) }, kind, text, data, facts);
  }

  toPlayer(p: PlayerState, kind: string, text: string, data?: Record<string, unknown>, facts?: Fact[]): GameEvent {
    return this.toPlayers([p], kind, text, data, facts);
  }

  // ───────────── 공개·사망·종료 ─────────────

  revealPublic(p: PlayerState): void {
    this.state.revealed[p.id] = p.character;
  }

  /**
   * 사망 처리 (원본 Lr). 목숨·보디가드와 무관한 '확정 사망'.
   * 메시지는 호출 측이 사망 원인을 먼저 알리고, 여기서 정체 공개를 1회 알린다 (원본 중복 출력 정리).
   */
  kill(p: PlayerState, cause: string): void {
    if (!p.alive) return;
    p.alive = false;
    p.diedAt = this.now;
    p.allies = [];
    p.effects = [];
    this.revealPublic(p);
    const name = this.charName(p.character);
    this.toPlayer(p, 'death.self', '당신은 사망했습니다.');
    this.toAll('death', `-사망한 ${josa(name, '은/는')} ${this.label(p)}입니다!`, {
      player: p.id,
      character: p.character,
      cause,
    });
    this.mode.checkVictory(this);
  }

  endGame(winner: Side, text: string): void {
    if (this.ended) return;
    this.state.phase = 'ended';
    this.state.winner = winner;
    this.state.endReason = text;
    this.state.queue = [];
    for (const p of this.state.players) this.revealPublic(p);
    this.toAll('game.end', text, {
      winner,
      sideName: this.mode.sideNames[winner],
      players: this.state.players.map((p) => ({
        id: p.id,
        seat: p.seat,
        nickname: p.nickname,
        character: p.character,
        side: p.side,
        alive: p.alive,
      })),
    });
  }
}
