import { DEFAULT_TURN_SECONDS, MAX_PLAYERS, MIN_PLAYERS, START_MANA } from '../constants.js';
import { getMode } from '../modes/index.js';
import { shuffle } from '../rng.js';
import { josa } from '../text.js';
import type { CharKey, CreateGameOptions, GameEvent, GameState, PlayerState } from '../types.js';
import { Game } from './game.js';

export interface CreateResult {
  state: GameState;
  events: GameEvent[];
}

export function createGame(opts: CreateGameOptions): CreateResult {
  const mode = getMode(opts.mode);
  const n = opts.players.length;
  if (n < MIN_PLAYERS || n > MAX_PLAYERS) {
    throw new Error(`인원은 ${MIN_PLAYERS}~${MAX_PLAYERS}명이어야 합니다 (현재 ${n}명)`);
  }
  const ids = new Set(opts.players.map((p) => p.id));
  if (ids.size !== n) throw new Error('플레이어 id 가 중복되었습니다');

  const mask = mode.masks[n];
  if (!mask) throw new Error(`${n}명 배정 규칙이 없습니다`);
  const usedChars = mode.characters.filter((c) => mask[c.slot - 1] === '1');

  const state: GameState = {
    version: 1,
    mode: opts.mode,
    seed: opts.seed,
    rng: opts.seed | 0,
    startedAt: opts.now,
    now: opts.now,
    phase: 'running',
    winner: null,
    endReason: null,
    players: [],
    turn: 1,
    turnMs: (opts.turnSeconds ?? DEFAULT_TURN_SECONDS) * 1000,
    nextTurnAt: 0,
    queue: [],
    revealed: {},
    log: [],
    seq: 0,
    taskSeq: 0,
    effectSeq: 0,
    modeState: {},
  };

  // 배정: 원본 Ei 는 슬롯 순서대로 남은 인원 중 무작위 1명 → 균등 무작위 순열과 같다
  let assignment: Map<string, CharKey>;
  if (opts.assignment) {
    const given = Object.entries(opts.assignment);
    const chars = new Set(given.map(([, c]) => c));
    const want = new Set(usedChars.map((c) => c.key));
    if (given.length !== n || chars.size !== n || [...chars].some((c) => !want.has(c)) || given.some(([id]) => !ids.has(id))) {
      throw new Error(`강제 배정이 ${n}인 규칙(${[...want].join(',')})과 맞지 않습니다`);
    }
    assignment = new Map(given);
  } else {
    const order = shuffle(state, opts.players.map((p) => p.id));
    assignment = new Map(order.map((id, i) => [id, (usedChars[i] as { key: CharKey }).key]));
  }

  opts.players.forEach((seat, i) => {
    const key = assignment.get(seat.id) as CharKey;
    const def = mode.characters.find((c) => c.key === key);
    if (!def) throw new Error(`unknown character ${key}`);
    const p: PlayerState = {
      id: seat.id,
      nickname: seat.nickname,
      seat: i + 1,
      slot: def.slot,
      character: def.key,
      side: def.side,
      alive: true,
      diedAt: null,
      left: false,
      mana: START_MANA,
      published: null,
      allies: [],
      gem: 0,
      gemCooldownUntil: 0,
      skills: [],
      extraLives: def.extraLives,
      effects: [],
      flags: {},
    };
    state.players.push(p);
  });

  const g = new Game(state, mode);
  for (const p of state.players) {
    for (const k of g.charDef(p.character).skills) g.grantSkill(p, k);
  }

  g.toAll('game.start', `모드 - ${mode.displayName}`, {
    mode: mode.id,
    roster: g.rosterInGame().map((c) => c.key),
    excluded: mode.characters.filter((c) => !g.charInGame(c.key)).map((c) => c.key),
  });
  for (const p of state.players) {
    const def = g.charDef(p.character);
    g.toPlayer(p, 'role', `당신은 ${josa(def.name, '이다/다')}.\n${def.objective}`, { character: p.character, side: p.side }, [
      { player: p.id, character: p.character },
    ]);
  }
  g.toAll('game.begin', '그러면, 게임을 시작합니다.');

  state.nextTurnAt = state.now + state.turnMs;
  g.schedule(state.nextTurnAt, 'turn', {});
  for (const p of state.players) {
    for (const u of g.charDef(p.character).unlocks ?? []) {
      g.schedule(state.now + u.at * 1000, 'unlock', { player: p.id, skill: u.skill });
    }
  }
  return { state, events: g.events };
}
