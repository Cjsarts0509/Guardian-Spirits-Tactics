// 평가 전용. 배정·진영 조회는 참가 정책을 정하는 주최자에서만 하고 봇 메모리에 넣지 않는다.
import { advance, applyAction, createBotMemory, createGame, type Action, type BotMemory, type GameState, type ModeId } from '../src/index.js';
import { nextRandom } from '../src/rng.js';
import type { BotOptions } from '../src/bot.js';

export type Policy = (state: GameState, player: string, memory: BotMemory, options: BotOptions) => Action | null;
export type Controller = 'current' | 'reference';
export interface Fixture { mode: ModeId; seed: number; count: number; reversed: boolean; currentSide: 1 | 2 }
export interface Settings { tickMs: number; activity: number; limitMs: number }
export const DEFAULT_SETTINGS: Settings = { tickMs: 250, activity: 0.012, limitMs: 90 * 60_000 };
export interface PolicyStats {
  attempted: number;
  accepted: number;
  rejected: number;
  earlyAttackFailures: number;
  rejectedSkills: Record<string, number>;
}
export interface MatchResult {
  fixture: Fixture;
  winner: 1 | 2 | null;
  winnerPolicy: Controller | null;
  elapsedMs: number;
  reason: string;
  stats: Record<Controller, PolicyStats>;
  survivors: { character: string; controller: Controller; alive: boolean }[];
}
const newStats = (): PolicyStats => ({ attempted: 0, accepted: 0, rejected: 0, earlyAttackFailures: 0, rejectedSkills: {} });

export function fixtures(mode: ModeId, seed: number, count: number): Fixture[] {
  return [false, true].flatMap((reversed) => ([1, 2] as const).map((currentSide) => ({ mode, seed, count, reversed, currentSide })));
}

/** 4대결 모두 같은 역할→ID 배정. 순서만 역전하고 봇 난수는 역할 슬롯에 고정한다. */
export function prepareMatch(fixture: Fixture) {
  const players = Array.from({ length: fixture.count }, (_, i) => ({ id: `p${i + 1}`, nickname: `봇${i + 1}` }));
  const original = createGame({ mode: fixture.mode, players, seed: fixture.seed, now: 0 }).state;
  const assignment = Object.fromEntries(original.players.map((p) => [p.id, p.character]));
  const state = createGame({ mode: fixture.mode, players: fixture.reversed ? players.slice().reverse() : players,
    seed: fixture.seed, now: 0, assignment }).state;
  const controllers = new Map(state.players.map((p) => [p.id, p.side === fixture.currentSide ? 'current' as const : 'reference' as const]));
  const memories = new Map(state.players.map((p) => [p.id, createBotMemory((fixture.seed * 8191 + p.slot * 997 + 77) | 0)]));
  return { state, controllers, memories };
}

export function playMatch(fixture: Fixture, policies: Record<Controller, Policy>, settings: Settings = DEFAULT_SETTINGS): MatchResult {
  if (!(settings.tickMs > 0 && settings.limitMs > 0 && settings.activity >= 0 && settings.activity <= 1)) throw new Error('리그 시간·활동 설정 오류');
  const { state, controllers, memories } = prepareMatch(fixture);
  const stats = { current: newStats(), reference: newStats() };
  const byRole = new Map(state.players.map((p) => [p.character, controllers.get(p.id)!]));
  for (let now = settings.tickMs; state.phase === 'running' && now <= settings.limitMs; now += settings.tickMs) {
    advance(state, now);
    for (const p of state.players) {
      if (state.phase !== 'running') break;
      if (!p.alive) continue;
      const controller = controllers.get(p.id)!;
      const action = policies[controller](state, p.id, memories.get(p.id)!, { activity: settings.activity });
      if (!action) continue;
      const result = applyAction(state, p.id, action, now);
      const s = stats[controller];
      s.attempted++;
      if (result.ok) s.accepted++;
      else { s.rejected++; const key = action.type === 'skill' ? action.skill : action.type; s.rejectedSkills[key] = (s.rejectedSkills[key] ?? 0) + 1; }
    }
  }
  for (const event of state.log) {
    if (event.at >= 4 * 60_000 || !['attack.fail', 'attack.fail.death'].includes(event.kind) || typeof event.data?.attacker !== 'string') continue;
    const controller = byRole.get(event.data.attacker);
    if (controller) stats[controller].earlyAttackFailures++;
  }
  return { fixture, winner: state.winner, winnerPolicy: state.winner === null ? null : state.winner === fixture.currentSide ? 'current' : 'reference',
    elapsedMs: state.now, reason: state.endReason ?? '시간 제한', stats,
    survivors: state.players.map((p) => ({ character: p.character, controller: controllers.get(p.id)!, alive: p.alive })) };
}

/** 독립 단위는 판이 아니라 시드 블록(교환한 4판). 제한 미종료는 0.5로 따로 보고한다. */
export function pairedInterval(scores: readonly number[], resamples = 2000): [number, number] {
  if (!scores.length) throw new Error('시드 표본 없음');
  if (!Number.isSafeInteger(resamples) || resamples <= 0 || scores.some((s) => !Number.isFinite(s) || s < 0 || s > 1)) throw new Error('점수·재표본 설정 오류');
  if (scores.length === 1) return [scores[0]!, scores[0]!];
  const rng = { rng: 0x475354 };
  const means = Array.from({ length: resamples }, () => {
    let total = 0;
    for (let i = 0; i < scores.length; i++) total += scores[Math.floor(nextRandom(rng) * scores.length)]!;
    return total / scores.length;
  }).sort((a, b) => a - b);
  return [means[Math.floor(resamples * 0.025)]!, means[Math.min(resamples - 1, Math.floor(resamples * 0.975))]!];
}

export function summarize(results: readonly MatchResult[]) {
  if (!results.length) throw new Error('리그 결과 없음');
  const seen = new Set<string>();
  const counts = new Map<number, number>();
  for (const r of results) {
    const f = r.fixture, key = `${f.seed}:${f.reversed}:${f.currentSide}`;
    if (seen.has(key) || f.mode !== results[0]!.fixture.mode || (counts.has(f.seed) && counts.get(f.seed) !== f.count)) throw new Error('중복 대결 또는 서로 다른 실험 조건');
    seen.add(key); counts.set(f.seed, f.count);
  }
  const seedScores = new Map<number, { seed: number; count: number; score: number; games: number }>();
  const wins = { current: 0, reference: 0, unfinished: 0 };
  const sideWins = { 1: 0, 2: 0 };
  const byCurrentSide = { 1: { games: 0, wins: 0, unfinished: 0 }, 2: { games: 0, wins: 0, unfinished: 0 } };
  const byOrder = { forward: { games: 0, wins: 0, unfinished: 0 }, reversed: { games: 0, wins: 0, unfinished: 0 } };
  const stats = { current: newStats(), reference: newStats() };
  const survival: Record<string, Record<Controller, { games: number; alive: number }>> = {};
  for (const r of results) {
    if (r.winnerPolicy) { wins[r.winnerPolicy]++; sideWins[r.winner!]++; } else wins.unfinished++;
    const s = seedScores.get(r.fixture.seed) ?? { seed: r.fixture.seed, count: r.fixture.count, score: 0, games: 0 };
    s.score += r.winnerPolicy === 'current' ? 1 : r.winnerPolicy === 'reference' ? 0 : 0.5;
    s.games++; seedScores.set(r.fixture.seed, s);
    for (const bucket of [byCurrentSide[r.fixture.currentSide], byOrder[r.fixture.reversed ? 'reversed' : 'forward']]) {
      bucket.games++; bucket.wins += Number(r.winnerPolicy === 'current'); bucket.unfinished += Number(r.winnerPolicy === null);
    }
    for (const controller of ['current', 'reference'] as const) {
      const source = r.stats[controller], target = stats[controller];
      for (const key of ['attempted', 'accepted', 'rejected', 'earlyAttackFailures'] as const) target[key] += source[key];
      for (const [key, n] of Object.entries(source.rejectedSkills)) target.rejectedSkills[key] = (target.rejectedSkills[key] ?? 0) + n;
    }
    for (const p of r.survivors) {
      const role = survival[p.character] ??= { current: { games: 0, alive: 0 }, reference: { games: 0, alive: 0 } };
      role[p.controller].games++; role[p.controller].alive += Number(p.alive);
    }
  }
  const paired = [...seedScores.values()].map((s) => ({ seed: s.seed, count: s.count, score: s.score / s.games }));
  if ([...seedScores.values()].some((s) => s.games !== 4)) throw new Error('시드마다 자리·진영 교환 4판이 필요합니다');
  const times = results.map((r) => r.elapsedMs / 60_000).sort((a, b) => a - b);
  const q = (p: number) => +times[Math.min(times.length - 1, Math.floor(p * times.length))]!.toFixed(2);
  return { games: results.length, seeds: paired.length, wins, sideWins, currentScore: paired.reduce((s, p) => s + p.score, 0) / paired.length,
    seedBootstrap95: pairedInterval(paired.map((p) => p.score)), byCurrentSide, byOrder, stats, survival,
    minutes: { median: q(0.5), p90: q(0.9), max: q(1) },
    unfinished: results.filter((r) => r.winner === null).map((r) => r.fixture), pairedScores: paired };
}
