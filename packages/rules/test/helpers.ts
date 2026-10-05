import { applyAction, advance, createGame, eventsFor } from '../src/index.js';
import type { Action, ActionResult, CharKey, GameEvent, GameState, PlayerState } from '../src/index.js';

/** 내전 슬롯 순서 */
export const CIVIL_ORDER: CharKey[] = [
  'dantes', 'mertz', 'kelhu', 'freya', 'soen', 'reindila', 'sephy',
  'kai', 'arin', 'tuma', 'krate', 'kaspa',
];

export interface Table {
  state: GameState;
  now: number;
  /** 캐릭터 키 → 플레이어 id */
  id: Record<CharKey, string>;
  p(char: CharKey): PlayerState;
  act(char: CharKey, action: Action, at?: number): ActionResult;
  skill(char: CharKey, skill: string, target?: CharKey, name?: CharKey, at?: number): ActionResult;
  publish(char: CharKey, name: CharKey, at?: number): ActionResult;
  tick(ms: number): GameEvent[];
  seen(char: CharKey): GameEvent[];
  texts(events: GameEvent[]): string[];
}

/** 캐릭터를 플레이어 id 로 고정 배정한 내전 테이블. chars 를 생략하면 12인 전원 */
export function civilTable(chars: CharKey[] = CIVIL_ORDER, seed = 1): Table {
  const players = chars.map((_c, i) => ({ id: `u${i + 1}`, nickname: `플레이어${i + 1}` }));
  const assignment: Record<string, CharKey> = {};
  const id: Record<CharKey, string> = {};
  chars.forEach((c, i) => {
    assignment[`u${i + 1}`] = c;
    id[c] = `u${i + 1}`;
  });
  const { state } = createGame({ mode: 'civil_war', players, seed, now: 0, assignment });
  const t: Table = {
    state,
    now: 0,
    id,
    p: (c) => {
      const p = state.players.find((x) => x.character === c);
      if (!p) throw new Error(`no ${c}`);
      return p;
    },
    act(c, action, at) {
      if (at !== undefined) t.now = at;
      return applyAction(state, id[c] as string, action, t.now);
    },
    skill(c, skill, target, name, at) {
      const a: Action = { type: 'skill', skill };
      if (target) a.target = id[target] as string;
      if (name) a.name = name;
      return t.act(c, a, at);
    },
    publish: (c, name, at) => t.skill(c, 'publish', undefined, name, at),
    tick(ms) {
      t.now += ms;
      return advance(state, t.now);
    },
    seen: (c) => eventsFor(state, id[c] as string),
    texts: (evs) => evs.map((e) => e.text),
  };
  return t;
}

/** 마나를 넉넉히 채운다 (테스트 편의) */
export function fill(t: Table, ...chars: CharKey[]): void {
  for (const c of chars) t.p(c).mana = 150;
}

export function lastText(r: ActionResult): string {
  return r.events.map((e) => e.text).join('\n');
}
