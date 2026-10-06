// pnpm --filter @gst/rules exec tsx scripts/claim-audit.ts [시드 수] [시작 시드]
// 합성 진짜 정체는 외부 채점에만 사용한다. 평가 기억은 행동 기억과 분리한다.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { assignmentBelief, beliefBrier, botKnowledge, createBotMemory, smartBotAction, viewFor } from '../src/index.js';
import { claimOpponent, type ClaimStyle } from './claim-opponents.js';
import { fixtures, playMatch, summarize } from './league-runner.js';

const args = process.argv.slice(2).filter((a) => a !== '--');
const seeds = Number(args[0] ?? 100), startSeed = Number(args[1] ?? 7000);
if (!Number.isSafeInteger(seeds) || seeds <= 0 || !Number.isSafeInteger(startSeed)) throw new Error('시드 설정 오류');
const styles: ClaimStyle[] = ['truthful', 'bluff', 'skill-aware-bluff'];
const checkpoints = [60_000, 180_000, 360_000];
const output: Record<string, unknown> = {};
for (const mode of ['civil_war', 'primordial', 'lidellut', 'troll'] as const) {
  const opponents: Record<string, unknown> = {};
  for (const style of styles) {
    const results = [];
    const samples = Object.fromEntries(checkpoints.map((at) => [at, { games: 0, observers: 0, targets: 0, weightedSum: 0, neutralSum: 0 }]));
    let acceptedClaims = 0, trueClaims = 0;
    for (let i = 0; i < seeds; i++) {
      for (const fixture of fixtures(mode, startSeed + i, 8 + i % 5)) {
        const seen = new Set<number>();
        const memories = new Map<string, ReturnType<typeof createBotMemory>>();
        results.push(playMatch(fixture, { current: smartBotAction, reference: claimOpponent(style) }, undefined, (state, id, action, result) => {
          // 스킬 효과의 성공이 아니라 접수된 공표만 집계한다.
          if (result.ok && action.type === 'skill' && action.skill === 'publish') {
            const actor = state.players.find((p) => p.id === id)!;
            if (actor.side !== fixture.currentSide) { acceptedClaims++; trueClaims += Number(action.name === actor.character); }
          }
          // 종료 후 전체 로그가 공개되는 복기 지식은 경기 중 정확도에 포함하지 않는다.
          if (state.phase !== 'running') return;
          for (const at of checkpoints) {
            if (state.now < at || seen.has(at)) continue;
            seen.add(at);
            const values: { weighted: number; neutral: number; targets: number }[] = [];
            for (const observer of state.players.filter((p) => p.alive && p.side === fixture.currentSide)) {
              const view = viewFor(state, observer.id);
              const memory = memories.get(observer.id) ?? createBotMemory(1);
              memories.set(observer.id, memory);
              const knowledge = botKnowledge(state, observer.id, view, memory);
              const targets = view.players.filter((p) => p.alive && p.id !== observer.id && !p.revealed &&
                (knowledge.candidates.get(p.id)?.length ?? 0) > 1).map((p) => p.id);
              if (!targets.length) continue;
              const weighted = assignmentBelief(view, knowledge, memory);
              const neutralView = { ...view, players: view.players.map((p) => ({ ...p, published: null })) };
              const neutral = assignmentBelief(neutralView, knowledge, memory);
              // 믿음 계산이 끝난 뒤 합성 정체로 점수만 계산한다.
              const truths = new Map(state.players.map((p) => [p.id, p.character]));
              const w = beliefBrier(weighted, truths, targets), n = beliefBrier(neutral, truths, targets);
              if (w !== null && n !== null) values.push({ weighted: w, neutral: n, targets: targets.length });
            }
            if (values.length) {
              const sample = samples[at]!;
              sample.games++; sample.observers += values.length; sample.targets += values.reduce((s, v) => s + v.targets, 0);
              // 한 판의 여러 관측자를 먼저 평균해 관측자 수가 많은 판의 과대 가중을 피한다.
              sample.weightedSum += values.reduce((s, v) => s + v.weighted, 0) / values.length;
              sample.neutralSum += values.reduce((s, v) => s + v.neutral, 0) / values.length;
            }
          }
        }));
      }
      if ((i + 1) % 25 === 0 || i + 1 === seeds) process.stderr.write(`[claims] ${mode}/${style}: ${i + 1}/${seeds}\n`);
    }
    opponents[style] = { league: summarize(results), acceptedClaims, trueClaims,
      calibration: Object.fromEntries(checkpoints.map((at) => {
        const s = samples[at]!;
        return [at / 60_000, { sampledGames: s.games, observers: s.observers, targets: s.targets,
          weightedBrier: s.games ? s.weightedSum / s.games : null,
          neutralBrier: s.games ? s.neutralSum / s.games : null }];
      })) };
  }
  output[mode] = opponents;
}
console.log(JSON.stringify({ format: 1, seeds, startSeed, checkpointsMs: checkpoints,
  hashes: Object.fromEntries(['../src/bot.ts', '../src/bot-claims.ts', './claim-opponents.ts', './claim-audit.ts'].map((p) =>
    [p, createHash('sha256').update(readFileSync(new URL(p, import.meta.url))).digest('hex')])), modes: output }, null, 2));
