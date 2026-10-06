import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { advance, botKnowledge, createBotMemory, viewFor } from '../src/index.js';
import { boundedSequenceSearch } from '../src/bot-sequence.js';
import { fixtures, prepareMatch } from './league-runner.js';
const baselinePath = process.argv[2];
if (!baselinePath) throw new Error('이전 고정 bot-sequence.ts의 절대 경로 필요');
const prior: typeof boundedSequenceSearch = (await import(pathToFileURL(baselinePath).href)).boundedSequenceSearch;
const times = { prior: [] as number[], extended: [] as number[] };
let positions = 0, evaluations = 0, cacheHits = 0, maxSimulations = 0, changedActions = 0;
for (const mode of ['civil_war', 'primordial', 'lidellut', 'troll'] as const) {
  for (let i = 0; i < 5; i++) {
    const { state } = prepareMatch(fixtures(mode, 53000 + i, 8 + i)[0]!);
    advance(state, 440_000);
    for (const p of state.players) p.published = p.character;
    for (const mana of [60, 100]) for (const p of state.players) {
      p.mana = mana;
      const view = viewFor(state, p.id), memory = createBotMemory(i + 1);
      const knowledge = botKnowledge(state, p.id, view, memory);
      const before = structuredClone(view), perception = structuredClone(memory.perception), rng = memory.rng;
      let old: ReturnType<typeof prior>, current: ReturnType<typeof boundedSequenceSearch>;
      // 같은 위치에서 측정 순서를 번갈아 사용한다.
      for (const key of positions % 2 ? ['extended', 'prior'] as const : ['prior', 'extended'] as const) {
        const clone = structuredClone(memory), started = performance.now();
        const result = (key === 'prior' ? prior : boundedSequenceSearch)(view, knowledge, clone, undefined, true, key === 'extended');
        times[key].push(performance.now() - started);
        if (key === 'prior') old = result; else current = result;
        if (JSON.stringify(view) !== JSON.stringify(before) || clone.rng !== rng ||
          JSON.stringify(clone.perception, (_, x) => x instanceof Map ? [...x] : x instanceof Set ? [...x] : x) !==
          JSON.stringify(perception, (_, x) => x instanceof Map ? [...x] : x instanceof Set ? [...x] : x)) throw new Error('관찰/RNG 변경');
      }
      if (JSON.stringify(old!?.action) !== JSON.stringify(current!?.action)) changedActions++;
      if (current! && current.simulations > 128) throw new Error('수순 상한 초과');
      positions++;
      if (current!) { evaluations += current.followupEvaluations; cacheHits += current.followupCacheHits; maxSimulations = Math.max(maxSimulations, current.simulations); }
    }
  }
}
const stats = (xs: number[]) => { xs.sort((a, b) => a - b); return { samples: xs.length, median: xs[Math.floor(xs.length * .5)], p95: xs[Math.floor(xs.length * .95)], max: xs.at(-1) }; };
console.log(JSON.stringify({ format: 1, scope: 'paired synthetic 400-position local audit; next turn in 10s, truth claims and private identities; not VM latency', positions,
  changedActions, baseline: 'b7c56ee 25-role sequence policy', extended: true, evaluations, cacheHits, maxSimulations, latencyMs: { prior: stats(times.prior), extended: stats(times.extended) },
  hashes: { baselineSource: createHash('sha256').update(readFileSync(baselinePath)).digest('hex'), ...Object.fromEntries(['../src/bot-sequence.ts', '../src/bot-growth.ts', '../src/bot.ts', './sequence-extended-cost-audit.ts'].map((p) =>
    [p, createHash('sha256').update(readFileSync(new URL(p, import.meta.url))).digest('hex')])) } }, null, 2));
