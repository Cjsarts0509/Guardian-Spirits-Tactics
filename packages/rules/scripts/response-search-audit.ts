import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { advance, botKnowledge, createBotMemory, viewFor } from '../src/index.js';
import { boundedAttackSearch } from '../src/bot-rollout.js';
import { fixtures, prepareMatch } from './league-runner.js';

// 공개 정체를 전부 제공한 합성 스트레스 위치. 실제 게임의 호출 분포/VM 지연이 아니다.
const durations: number[] = [];
const modes: Record<string, { positions: number; attack: number; wait: number; unavailable: number; maxSimulations: number }> = {};
for (const mode of ['civil_war', 'primordial', 'lidellut', 'troll'] as const) {
  const result = modes[mode] = { positions: 0, attack: 0, wait: 0, unavailable: 0, maxSimulations: 0 };
  for (let i = 0; i < 20; i++) {
    const { state } = prepareMatch(fixtures(mode, 33000 + i, 8 + i % 5)[0]!);
    advance(state, 400_000);
    for (const p of state.players) state.revealed[p.id] = p.character;
    for (const mana of [60, 100, 150]) for (const p of state.players) {
      p.mana = mana;
      const view = viewFor(state, p.id), memory = createBotMemory(i + 1);
      const knowledge = botKnowledge(state, p.id, view, memory);
      const before = JSON.stringify(view), rng = memory.rng;
      const started = performance.now(), plan = boundedAttackSearch(view, knowledge, memory, true);
      durations.push(performance.now() - started);
      if (JSON.stringify(view) !== before || memory.rng !== rng) throw new Error('관측/RNG 변경');
      result.positions++;
      if (!plan) result.unavailable++;
      else {
        result.maxSimulations = Math.max(result.maxSimulations, plan.simulations);
        if (plan.action) result.attack++; else result.wait++;
        if (plan.simulations > 128) throw new Error('탐색 상한 초과');
      }
    }
  }
}
durations.sort((a, b) => a - b);
console.log(JSON.stringify({ format: 1, startSeed: 33000, seeds: 20, manaLevels: [60, 100, 150], modes,
  scope: 'synthetic all-identities-public positions; local runtime, not VM or live-game latency',
  latencyMs: { samples: durations.length, median: durations[Math.floor(durations.length * .5)],
    p95: durations[Math.floor(durations.length * .95)], max: durations.at(-1) },
  hashes: Object.fromEntries(['../src/bot-rollout.ts', '../src/bot-response.ts', '../src/bot-hypothesis.ts', './response-search-audit.ts'].map((p) =>
    [p, createHash('sha256').update(readFileSync(new URL(p, import.meta.url))).digest('hex')])) }, null, 2));
