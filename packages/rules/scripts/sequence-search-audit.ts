import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { advance, botKnowledge, createBotMemory, viewFor } from '../src/index.js';
import { boundedSequenceSearch } from '../src/bot-sequence.js';
import { fixtures, prepareMatch } from './league-runner.js';

// 정체는 미공개이고 각자 진명을 공표한 합성 스트레스 위치. 실제 게임의 호출 분포/VM 지연이 아니다.
const durations: number[] = [];
const modes: Record<string, { positions: number; confirmation: number; publication: number; unavailable: number; maxSimulations: number }> = {};
for (const mode of ['civil_war', 'primordial', 'lidellut', 'troll'] as const) {
  const result = modes[mode] = { positions: 0, confirmation: 0, publication: 0, unavailable: 0, maxSimulations: 0 };
  for (let i = 0; i < 5; i++) {
    const { state } = prepareMatch(fixtures(mode, 44000 + i, 8 + i % 5)[0]!);
    advance(state, 400_000);
    for (const p of state.players) p.published = p.character;
    for (const mana of [60, 100]) for (const p of state.players) {
      p.mana = mana;
      const view = viewFor(state, p.id), memory = createBotMemory(i + 1);
      const knowledge = botKnowledge(state, p.id, view, memory);
      const before = JSON.stringify(view), rng = memory.rng;
      const started = performance.now(), plan = boundedSequenceSearch(view, knowledge, memory);
      durations.push(performance.now() - started);
      if (JSON.stringify(view) !== before || memory.rng !== rng) throw new Error('관측/RNG 변경');
      result.positions++;
      if (!plan) result.unavailable++;
      else {
        result.maxSimulations = Math.max(result.maxSimulations, plan.simulations);
        if (plan.action.type === 'skill' && plan.action.skill === 'publish') result.publication++; else result.confirmation++;
        if (plan.simulations > 128) throw new Error('탐색 상한 초과');
      }
    }
  }
}
durations.sort((a, b) => a - b);
console.log(JSON.stringify({ format: 1, startSeed: 44000, seeds: 5, manaLevels: [60, 100], modes,
  scope: 'synthetic identities-private truthful-claims positions; local runtime, not VM or live-game latency',
  latencyMs: { samples: durations.length, median: durations[Math.floor(durations.length * .5)],
    p95: durations[Math.floor(durations.length * .95)], max: durations.at(-1) },
  hashes: Object.fromEntries(['../src/bot-sequence.ts', '../src/bot-confirmation.ts', '../src/bot-rollout.ts', '../src/bot-response.ts', '../src/bot-hypothesis.ts', './sequence-search-audit.ts'].map((p) =>
    [p, createHash('sha256').update(readFileSync(new URL(p, import.meta.url))).digest('hex')])) }, null, 2));
