import { MAX_MANA } from '../constants.js';
import { getMode } from '../modes/index.js';
import type { TargetKind } from '../modes/types.js';
import type { CharKey, GameEvent, GameState, PlayerId, PlayerState, Side, SkillKey } from '../types.js';
import { skillBlocker } from './actions.js';
import { Game } from './game.js';

export interface SkillView {
  key: SkillKey;
  name: string;
  hotkey: string | null;
  description: string;
  passive: boolean;
  mana: number;
  cooldown: number;
  cooldownRemainingMs: number;
  usesLeft: number | null;
  level: number;
  target: TargetKind;
  /** 무적 대상 지정이 허용되는 해제 계열 */
  ignoresInvulnerable: boolean;
  nameOptions: CharKey[] | null;
  /** 지금 쓸 수 없는 이유 (null 이면 사용 가능) */
  blocked: string | null;
}

export interface OtherPlayerView {
  id: PlayerId;
  seat: number;
  nickname: string;
  alive: boolean;
  left: boolean;
  published: CharKey | null;
  /** 전체 공개된 정체 */
  revealed: CharKey | null;
  revealedSide: Side | null;
  /** 공지된 상태 효과 */
  statuses: { kind: string; source: SkillKey; remainingMs: number }[];
}

export interface PlayerView {
  mode: string;
  modeName: string;
  phase: 'running' | 'ended';
  winner: Side | null;
  endReason: string | null;
  elapsedMs: number;
  turn: number;
  nextTurnInMs: number;
  sideNames: Record<Side, string>;
  roster: { key: CharKey; name: string; title: string; side: Side; commander: boolean; inGame: boolean }[];
  me: {
    id: PlayerId;
    seat: number;
    nickname: string;
    character: CharKey;
    characterName: string;
    title: string;
    side: Side;
    commander: boolean;
    objective: string;
    alive: boolean;
    mana: number;
    maxMana: number;
    published: CharKey | null;
    trueName: boolean;
    gem: 0 | 1 | 2 | 3;
    gemCooldownRemainingMs: number;
    extraLives: number;
    allies: PlayerId[];
    alliedBy: PlayerId[];
    effects: { kind: string; source: SkillKey; remainingMs: number }[];
    flags: Record<string, boolean | number>;
    skills: SkillView[];
    nextTurnManaPreview: number;
  };
  players: OtherPlayerView[];
}

export function canSee(state: GameState, ev: GameEvent, playerId: PlayerId): boolean {
  if (state.phase === 'ended') return true; // 종료 후에는 전체 로그 공개 (복기)
  const v = ev.vis;
  if (v.to === 'all') return true;
  if (v.to === 'players') return v.ids.includes(playerId);
  const p = state.players.find((x) => x.id === playerId);
  return !!p && !p.alive;
}

/** 이 플레이어가 볼 수 있는 이벤트 (afterSeq 이후) */
export function eventsFor(state: GameState, playerId: PlayerId, afterSeq = 0): GameEvent[] {
  let lo = 0;
  let hi = state.log.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (state.log[mid]!.seq <= afterSeq) lo = mid + 1;
    else hi = mid;
  }
  return state.log.slice(lo).filter((e) => canSee(state, e, playerId));
}

export function viewFor(state: GameState, playerId: PlayerId): PlayerView {
  const mode = getMode(state.mode);
  const g = new Game(state, mode);
  const me = g.mustPlayer(playerId);
  const def = g.charDef(me.character);
  const now = state.now;
  const remaining = (until: number) => Math.max(0, until - now);

  const skills: SkillView[] = [];
  const pushSkill = (key: SkillKey, inst?: { cooldownUntil: number; usesLeft: number | null; level: number }) => {
    const d = g.skillDef(key);
    skills.push({
      key,
      name: d.name,
      hotkey: d.hotkey ?? null,
      description: d.description,
      passive: !!d.passive,
      mana: d.manaFor ? d.manaFor(me) : d.mana,
      cooldown: d.cooldown,
      cooldownRemainingMs: d.item ? remaining(me.gemCooldownUntil) : remaining(inst?.cooldownUntil ?? 0),
      usesLeft: inst ? inst.usesLeft : d.item ? (me.gem === 2 ? 1 : null) : null,
      level: inst?.level ?? 1,
      target: d.target,
      ignoresInvulnerable: !!d.ignoresInvulnerable,
      nameOptions: d.nameOptions ? d.nameOptions(g, me) : null,
      blocked: d.passive ? null : skillBlocker(g, me, key),
    });
  };
  for (const s of me.skills) pushSkill(s.key, s);
  if (me.gem >= 2) pushSkill('truth_gem');

  const allies = g.alliedBy(me);
  const effectsOf = (p: PlayerState, onlyAnnounced: boolean) =>
    g
      .activeEffects(p)
      .filter((e) => !onlyAnnounced || e.announced)
      .map((e) => ({ kind: e.kind, source: e.source, remainingMs: remaining(e.until) }));

  return {
    mode: state.mode,
    modeName: mode.displayName,
    phase: state.phase,
    winner: state.winner,
    endReason: state.endReason,
    elapsedMs: now - state.startedAt,
    turn: state.turn,
    nextTurnInMs: state.phase === 'running' ? remaining(state.nextTurnAt) : 0,
    sideNames: mode.sideNames,
    roster: mode.characters.map((c) => ({
      key: c.key,
      name: c.name,
      title: c.title,
      side: c.side,
      commander: c.commander,
      inGame: g.charInGame(c.key),
    })),
    me: {
      id: me.id,
      seat: me.seat,
      nickname: me.nickname,
      character: me.character,
      characterName: def.name,
      title: def.title,
      side: me.side,
      commander: def.commander,
      objective: def.objective,
      alive: me.alive,
      mana: me.mana,
      maxMana: MAX_MANA,
      published: me.published,
      trueName: me.published === me.character,
      gem: me.gem,
      gemCooldownRemainingMs: remaining(me.gemCooldownUntil),
      extraLives: me.extraLives,
      allies: me.allies.slice(),
      alliedBy: allies.map((p) => p.id),
      effects: effectsOf(me, false),
      flags: { ...me.flags },
      skills,
      nextTurnManaPreview: Math.min(
        MAX_MANA - me.mana,
        20 + allies.length * 10 + (me.published === me.character ? 10 : 0),
      ),
    },
    players: state.players.map((p) => {
      const rev = state.revealed[p.id] ?? null;
      return {
        id: p.id,
        seat: p.seat,
        nickname: p.nickname,
        alive: p.alive,
        left: p.left,
        published: p.published,
        revealed: rev,
        revealedSide: rev ? g.charDef(rev).side : null,
        statuses: p.alive ? effectsOf(p, true) : [],
      };
    }),
  };
}

/** 관전(테스트용) 시점: 전원 정체·마나·스킬이 보인다 */
export interface SpectatorView {
  spectator: true;
  mode: string;
  modeName: string;
  phase: 'running' | 'ended';
  winner: Side | null;
  endReason: string | null;
  elapsedMs: number;
  turn: number;
  nextTurnInMs: number;
  sideNames: Record<Side, string>;
  roster: PlayerView['roster'];
  players: (OtherPlayerView & {
    character: CharKey;
    characterName: string;
    side: Side;
    mana: number;
    gem: number;
    extraLives: number;
    allies: PlayerId[];
    skills: { key: SkillKey; name: string; cooldownRemainingMs: number; usesLeft: number | null; passive: boolean }[];
  })[];
}

export function spectatorView(state: GameState): SpectatorView {
  const mode = getMode(state.mode);
  const g = new Game(state, mode);
  const now = state.now;
  const remaining = (until: number) => Math.max(0, until - now);
  return {
    spectator: true,
    mode: state.mode,
    modeName: mode.displayName,
    phase: state.phase,
    winner: state.winner,
    endReason: state.endReason,
    elapsedMs: now - state.startedAt,
    turn: state.turn,
    nextTurnInMs: state.phase === 'running' ? remaining(state.nextTurnAt) : 0,
    sideNames: mode.sideNames,
    roster: mode.characters.map((c) => ({ key: c.key, name: c.name, title: c.title, side: c.side, commander: c.commander, inGame: g.charInGame(c.key) })),
    players: state.players.map((p) => ({
      id: p.id,
      seat: p.seat,
      nickname: p.nickname,
      alive: p.alive,
      left: p.left,
      published: p.published,
      revealed: p.character,
      revealedSide: p.side,
      statuses: g.activeEffects(p).map((e) => ({ kind: e.kind, source: e.source, remainingMs: remaining(e.until) })),
      character: p.character,
      characterName: g.charName(p.character),
      side: p.side,
      mana: p.mana,
      gem: p.gem,
      extraLives: p.extraLives,
      allies: p.allies.slice(),
      skills: p.skills.map((s) => {
        const d = g.skillDef(s.key);
        return { key: s.key, name: d.name, cooldownRemainingMs: remaining(s.cooldownUntil), usesLeft: s.usesLeft, passive: !!d.passive };
      }),
    })),
  };
}
