import type { CharKey, GameEvent, PlayerId } from './types.js';
import type { PlayerView } from './engine/view.js';

export interface Knowledge {
  /** 확정 정체. 변장 가능한 확인 결과는 포함하지 않는다. */
  known: Map<PlayerId, CharKey>;
  candidates: Map<PlayerId, CharKey[]>;
}

export interface BotPerception {
  playerId: PlayerId;
  mode: string;
  character: CharKey;
  lastElapsedMs: number;
  lastSeq: number;
  known: Map<PlayerId, CharKey>;
  excluded: Map<PlayerId, Set<CharKey>>;
  alternatives: Map<PlayerId, Set<CharKey>>;
  commanders: Set<PlayerId>;
  baptized: Set<CharKey>;
  chiefProtected: boolean;
  madnessPurged: boolean;
  lastAttackFailure: Map<PlayerId, number>;
}

/** 한 판의 한 플레이어 전용. 서버 상태나 다른 봇의 기억을 보관하지 않는다. */
export interface BotMemory {
  rng: number;
  perception?: BotPerception;
}

export function createBotMemory(seed: number): BotMemory {
  return { rng: seed | 0 };
}

/** 시점 뷰와 해당 플레이어에게 보이는 이벤트만 받는 기억 갱신 경계 */
export function updateBotKnowledge(view: PlayerView, events: readonly GameEvent[], memory: BotMemory): Knowledge {
  let p = memory.perception;
  if (!p || p.playerId !== view.me.id || p.mode !== view.mode || p.character !== view.me.character || view.elapsedMs < p.lastElapsedMs) {
    p = memory.perception = {
      playerId: view.me.id, mode: view.mode, character: view.me.character,
      lastElapsedMs: view.elapsedMs, lastSeq: 0,
      known: new Map(), excluded: new Map(), alternatives: new Map(), commanders: new Set(),
      baptized: new Set(), chiefProtected: false, madnessPurged: false, lastAttackFailure: new Map(),
    };
  }
  for (const e of events) {
    if (e.seq <= p.lastSeq || !(e.vis.to === 'all' || (e.vis.to === 'players' && e.vis.ids.includes(view.me.id)))) continue;
    for (const f of e.facts ?? []) {
      if (f.player === view.me.id) continue;
      if (f.character) p.known.set(f.player, f.character);
      if (f.not) {
        const excluded = p.excluded.get(f.player) ?? new Set<CharKey>();
        excluded.add(f.not);
        p.excluded.set(f.player, excluded);
      }
      if (f.oneOf) {
        const previous = p.alternatives.get(f.player);
        p.alternatives.set(f.player, new Set(f.oneOf.filter((c) => !previous || previous.has(c))));
      }
      if (f.commander) p.commanders.add(f.player);
    }
    if (e.kind === 'skill.angel_baptism' && typeof e.data?.character === 'string') p.baptized.add(e.data.character);
    if (e.kind === 'skill.chief_protection') p.chiefProtected = true;
    if (e.kind === 'skill.holy_binding.purge') p.madnessPurged = true;
    if (e.kind === 'skill.destroyer_guidance.madness') p.madnessPurged = false;
    if (e.kind === 'attack.fail.self' && typeof e.data?.target === 'string') p.lastAttackFailure.set(e.data.target, e.at);
    p.lastSeq = e.seq;
  }
  p.lastElapsedMs = view.elapsedMs;
  for (const other of view.players) if (other.revealed && other.id !== view.me.id) p.known.set(other.id, other.revealed);

  const roster = view.roster.filter((r) => r.inGame);
  const known = new Map(p.known);
  const candidates = new Map<PlayerId, CharKey[]>();
  // 확정 제약과 한 사람당 한 역할이라는 규칙으로 후보가 하나면 정체를 추론한다.
  // 원래 관찰과 분리해서 계산하므로 과거의 추론을 다시 증거로 사용하지 않는다.
  let changed: boolean;
  do {
    changed = false;
    const taken = new Set<CharKey>([view.me.character, ...known.values()]);
    for (const other of view.players) {
      if (other.id === view.me.id) continue;
      const identity = known.get(other.id);
      if (identity) {
        candidates.set(other.id, [identity]);
        continue;
      }
      const excluded = p.excluded.get(other.id);
      const alternatives = p.alternatives.get(other.id);
      const remaining = roster.filter((r) =>
        !taken.has(r.key) && !excluded?.has(r.key) && (!alternatives || alternatives.has(r.key)) && (!p.commanders.has(other.id) || r.commander),
      ).map((r) => r.key);
      candidates.set(other.id, remaining);
      if (remaining.length === 1) {
        known.set(other.id, remaining[0]!);
        taken.add(remaining[0]!);
        changed = true;
      }
    }
  } while (changed);
  return { known, candidates };
}
