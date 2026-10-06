import type { CharKey, GameEvent, PlayerId } from './types.js';
import type { PlayerView } from './engine/view.js';
import type { AssignmentBelief } from './bot-belief.js';
import { createBattleMemory, observeBattle, type BattleMemory, type SkillPlan } from './bot-tactics.js';

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
  /** 실패는 이름 오류/보디가드 여부를 확정하지 않고 시도 순서에만 사용한다. */
  lastAttackNameFailure: Map<PlayerId, Map<CharKey, number>>;
  automaticClaims: Set<PlayerId>;
  manualClaims: Map<PlayerId, { name: CharKey; at: number }>;
  trueNameUntil: number;
  battle: BattleMemory;
  lastBurn?: { target: PlayerId; at: number };
}

/** 한 판의 한 플레이어 전용. 서버 상태나 다른 봇의 기억을 보관하지 않는다. */
export interface BotMemory {
  rng: number;
  perception?: BotPerception;
  beliefCache?: { signature: string; value: AssignmentBelief };
  plan?: SkillPlan;
}

export function createBotMemory(seed: number): BotMemory {
  return { rng: seed | 0 };
}

/** 시점 뷰와 해당 플레이어에게 보이는 이벤트만 받는 기억 갱신 경계 */
export function updateBotKnowledge(view: PlayerView, events: readonly GameEvent[], memory: BotMemory): Knowledge {
  let p = memory.perception;
  if (!p || p.playerId !== view.me.id || p.mode !== view.mode || p.character !== view.me.character || view.elapsedMs < p.lastElapsedMs) {
    memory.plan = undefined;
    p = memory.perception = {
      playerId: view.me.id, mode: view.mode, character: view.me.character,
      lastElapsedMs: view.elapsedMs, lastSeq: 0,
      known: new Map(), excluded: new Map(), alternatives: new Map(), commanders: new Set(),
      baptized: new Set(), chiefProtected: false, madnessPurged: false, lastAttackFailure: new Map(), lastAttackNameFailure: new Map(),
      automaticClaims: new Set(), manualClaims: new Map(), trueNameUntil: 0,
      battle: createBattleMemory(),
    };
  }
  for (const e of events) {
    if (e.seq <= p.lastSeq || !(e.vis.to === 'all' || (e.vis.to === 'players' && e.vis.ids.includes(view.me.id)))) continue;
    observeBattle(view, e, p.battle);
    if (e.kind === 'skill.burning_magic.self' && typeof e.data?.target === 'string') p.lastBurn = { target: e.data.target, at: e.at };
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
    if (e.kind === 'attack.fail.self' && typeof e.data?.target === 'string') {
      p.lastAttackFailure.set(e.data.target, e.at);
      if (typeof e.data.name === 'string') {
        const names = p.lastAttackNameFailure.get(e.data.target) ?? new Map<CharKey, number>();
        names.set(e.data.name, e.at);
        p.lastAttackNameFailure.set(e.data.target, names);
      }
    }
    if ((e.kind === 'publish' || e.kind === 'publish.auto') && typeof e.data?.player === 'string') {
      if (e.kind === 'publish.auto') { p.automaticClaims.add(e.data.player); p.manualClaims.delete(e.data.player); }
      else {
        p.automaticClaims.delete(e.data.player);
        if (typeof e.data.name === 'string') p.manualClaims.set(e.data.player, { name: e.data.name, at: e.at });
      }
    }
    // 재접속 때도 안전하게 유지하도록 관찰 시점부터 최소 20초를 확보한다.
    if (e.kind === 'skill.wild_path.self') p.trueNameUntil = view.elapsedMs + 20_000;
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
