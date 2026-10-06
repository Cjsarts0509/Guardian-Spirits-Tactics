import type { CharKey, ModeId, PlayerId, Side } from './types.js';
import type { PlayerView } from './engine/view.js';
import type { Knowledge } from './bot-memory.js';
import { MAX_MANA } from './constants.js';
import { getMode } from './modes/index.js';
import { skillRegistry } from './skills/registry.js';
import { roleSkills, skillTiming, type BattleMemory } from './bot-tactics.js';

export type Interval = readonly [number, number];
export interface HypothesisSkill {
  key: string;
  passive: boolean;
  present: Interval;
  mana: Interval;
  cooldownRemainingMs: Interval;
  usesLeft: Interval | null;
  blocked: string | null | undefined;
}
export interface HypothesisPlayer {
  id: PlayerId;
  character: CharKey;
  side: Side;
  alive: boolean;
  trueName: boolean;
  mana: Interval;
  lives: Interval;
  guardCharges: Interval;
  statuses: { kind: string; source: string; remainingMs: number }[];
  skills: HypothesisSkill[];
  ownFlags?: Record<string, boolean | number>;
}
export interface HypothesisWorld {
  elapsedMs: number;
  nextTurnInMs: number;
  players: Map<PlayerId, HypothesisPlayer>;
  /** 확인 사실과 구분한 가설. 이 배정을 정체 확정 기억으로 되돌려 쓰면 안 된다. */
  hypothetical: true;
}

/** 실제 상태를 복제하지 않고 자기 관찰과 역할 가설로 자원 범위를 구성한다. */
export function hypothesisWorld(view: PlayerView, knowledge: Knowledge, battle: BattleMemory,
  assignment: ReadonlyMap<PlayerId, CharKey>): HypothesisWorld {
  const roles = view.roster.filter((r) => r.inGame);
  if (assignment.size !== view.players.length || new Set(assignment.values()).size !== assignment.size ||
    assignment.get(view.me.id) !== view.me.character || roles.length !== assignment.size ||
    [...assignment.values()].some((c) => !roles.some((r) => r.key === c))) throw new Error('가설 배정이 자기 관찰과 맞지 않습니다.');
  const mode = getMode(view.mode as ModeId), players = new Map<PlayerId, HypothesisPlayer>();
  for (const p of view.players) {
    const character = assignment.get(p.id);
    if (!character || (p.id !== view.me.id && (!knowledge.candidates.get(p.id)?.includes(character) ||
      (knowledge.known.has(p.id) && knowledge.known.get(p.id) !== character)))) throw new Error('가설 배정이 확인 제약을 위반했습니다.');
    const def = mode.characters.find((r) => r.key === character)!;
    const own = p.id === view.me.id;
    const maxLives = Math.max(def.extraLives + 1, view.mode === 'lidellut' && character === 'supra' ? 4 :
      view.mode === 'primordial' && character === 'consume' ? 3 : view.mode === 'troll' && character === 'seirow' ? 2 : 1);
    const skills: HypothesisSkill[] = own ? view.me.skills.map((s) => ({ key: s.key, passive: s.passive,
      present: [1, 1], mana: [s.mana, s.mana], cooldownRemainingMs: [s.cooldownRemainingMs, s.cooldownRemainingMs],
      usesLeft: s.usesLeft === null ? null : [s.usesLeft, s.usesLeft], blocked: s.blocked })) : roleSkills(view, battle, character, true).map((key) => {
      const skill = mode.skills[key] ?? skillRegistry[key];
      if (!skill) throw new Error(`가설 스킬 정의가 없습니다: ${key}`);
      const timing = skillTiming(battle, character, key);
      // 카즈로우의 미관측 초기화 가능성 때문에 과거 사용으로 하한을 고정하지 않는다.
      const lower = view.mode === 'troll' && character === 'kazrow' ? 0 : Math.max(0, (timing?.readyEarliest ?? 0) - view.elapsedMs);
      return { key, passive: !!skill.passive, present: [0, 1],
        mana: skill.manaFor ? [0, MAX_MANA] : [skill.mana, skill.mana],
        cooldownRemainingMs: skill.passive ? [0, 0] : [lower, Math.max(lower, skill.cooldown * 1000)],
        usesLeft: skill.uses === null ? null : [0, Math.max(0, skill.uses - (timing?.usedMin ?? 0))], blocked: undefined };
    });
    players.set(p.id, { id: p.id, character, side: def.side, alive: p.alive,
      trueName: own ? view.me.trueName : p.published === character,
      mana: own ? [view.me.mana, view.me.mana] : [0, MAX_MANA],
      lives: !p.alive ? [0, 0] : own ? [view.me.extraLives + 1, view.me.extraLives + 1] : [1, maxLives],
      guardCharges: own ? [Number(view.me.flags.guardCharges ?? 0), Number(view.me.flags.guardCharges ?? 0)] :
        view.mode === 'primordial' && ['kumarin', 'consume'].includes(character) ?
          [0, Math.min(2, battle.guardCharges.get(character === 'kumarin' ? 'rael' : 'eltas') ?? 2)] : [0, 0],
      ownFlags: own ? { ...view.me.flags } : undefined,
      statuses: own ? view.me.effects.map((e) => ({ ...e })) : p.statuses.map((s) => ({ ...s })), skills });
  }
  return { elapsedMs: view.elapsedMs, nextTurnInMs: view.nextTurnInMs, players, hypothetical: true };
}

export interface HypothesisScenario {
  assumption: 'opponents-strong' | 'opponents-weak';
  /** 범위 끝점의 스트레스 시나리오. 확률이나 실제 상태가 아니다. */
  players: Map<PlayerId, Omit<HypothesisPlayer, 'mana' | 'lives' | 'guardCharges' | 'skills'> & {
    mana: number; lives: number; guardCharges: number;
    skills: { key: string; passive: boolean; present: boolean; mana: number; cooldownRemainingMs: number; usesLeft: number | null; blocked: string | null | undefined }[];
  }>;
}

/** 같은 배정을 상대 자원이 강한/약한 두 가지 범위 끝점으로 구체화한다. */
export function hypothesisScenarios(world: HypothesisWorld, self: PlayerId): HypothesisScenario[] {
  if (!world.players.has(self)) throw new Error('자기 플레이어가 가설 상태에 없습니다.');
  const selfSide = world.players.get(self)!.side;
  return ([true, false] as const).map((strong) => ({ assumption: strong ? 'opponents-strong' : 'opponents-weak',
    players: new Map([...world.players].map(([id, p]) => {
      const high = id !== self && (strong ? p.side !== selfSide : p.side === selfSide);
      const index: 0 | 1 = high ? 1 : 0, inverse: 0 | 1 = high ? 0 : 1;
      return [id, { ...p, statuses: p.statuses.map((s) => ({ ...s })), ownFlags: p.ownFlags ? { ...p.ownFlags } : undefined, mana: p.mana[index],
        lives: p.lives[index], guardCharges: p.guardCharges[index], skills: p.skills.map((s) => ({
          key: s.key, passive: s.passive, present: s.present[index] === 1,
          mana: s.mana[inverse], cooldownRemainingMs: s.cooldownRemainingMs[inverse],
          usesLeft: s.usesLeft === null ? null : s.usesLeft[index], blocked: s.blocked,
        })) }];
    })),
  }));
}
