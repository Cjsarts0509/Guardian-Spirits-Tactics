import { performance } from 'node:perf_hooks';
import { isDeepStrictEqual } from 'node:util';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { advance, createBotMemory, smartBotAction, botKnowledge, viewFor } from '../src/index.js';
import { boundedSequenceSearch } from '../src/bot-sequence.js';
import { fixtures, prepareMatch } from './league-runner.js';
const baselinePath = process.argv[2];
if (!baselinePath) throw new Error('수정 전 34398ab 고정 bot.ts 경로 필요');
const baseline = await import(pathToFileURL(baselinePath).href);
const prior: typeof smartBotAction = baseline.smartBotAction;
const priorSearch: typeof boundedSequenceSearch = (await import(pathToFileURL(resolve(dirname(baselinePath), 'bot-sequence.ts')).href)).boundedSequenceSearch;
const groups: Record<string, { positions: number; rounds: { prior: number[]; current: number[] }[] }> = {};
let total = 0, fullSearchChecks = 0, decisionChecks = 0;
const configurations = [];
for (const mode of ['civil_war', 'primordial', 'lidellut', 'troll'] as const) for (let i = 0; i < 5; i++)
  for (const elapsed of [400_000, 440_000]) for (const revealed of [false, true]) {
    const { state } = prepareMatch(fixtures(mode, 65000 + i, 8 + i)[0]!);
    advance(state, elapsed);
    for (const p of state.players) { p.published = p.character; p.mana = 100; if (revealed) state.revealed[p.id] = p.character; }
    configurations.push({ state, i, group: `${revealed ? 'identities-public' : 'identities-private'}/${elapsed === 400_000 ? 'turn-in-50s' : 'turn-in-10s'}` });
  }
// 내부 결과 비교는 측정 단계 뒤에 분리한다. 측정 중에는 상태를 변경하지 않는다.
for (let round = 0; round < 3; round++) for (const { state, i, group: key } of configurations) {
  const group = groups[key] ??= { positions: 0, rounds: Array.from({ length: 3 }, () => ({ prior: [], current: [] })) };
  for (const p of state.players) {
    const initial = structuredClone(state), memory = createBotMemory(i + 1);
    let oldAction: unknown, newAction: unknown, oldMemory: unknown, newMemory: unknown;
    for (const version of (total + round) % 2 ? ['current', 'prior'] as const : ['prior', 'current'] as const) {
      const clone = structuredClone(memory), started = performance.now();
      const action = (version === 'prior' ? prior : smartBotAction)(state, p.id, clone,
        { activity: 1, sequenceSearch: true, sequenceSkills: true, sequenceExtended: true });
      group.rounds[round]![version].push(performance.now() - started);
      if (version === 'prior') { oldAction = action; oldMemory = clone; } else { newAction = action; newMemory = clone; }
      if (!isDeepStrictEqual(state, initial)) throw new Error('정책이 상태를 변경');
    }
    if (!isDeepStrictEqual(oldAction, newAction) || !isDeepStrictEqual(oldMemory, newMemory)) throw new Error(`행동/지속 기억 차이: ${key}/${p.character}`);
    decisionChecks++; if (round === 0) group.positions++; total++;
  }
}
for (const { state, i } of configurations) for (const p of state.players) {
  const view = viewFor(state, p.id), oldMemory = createBotMemory(i + 1), memory = createBotMemory(i + 1);
  const oldKnowledge = baseline.botKnowledge(state, p.id, view, oldMemory);
  const knowledge = botKnowledge(state, p.id, view, memory);
  const initial = structuredClone(state), perception = structuredClone(memory.perception), oldPerception = structuredClone(oldMemory.perception);
  const before = priorSearch(view, oldKnowledge, oldMemory, undefined, true, true);
  const after = boundedSequenceSearch(view, knowledge, memory, undefined, true, true);
  if (!isDeepStrictEqual(before, after)) throw new Error(`수순 점수/후속 캐시 결과 차이: ${state.mode}/${p.character}`);
  if (!isDeepStrictEqual(state, initial) || !isDeepStrictEqual(memory.perception, perception) || !isDeepStrictEqual(oldMemory.perception, oldPerception))
    throw new Error('수순 탐색이 입력/관찰 기억을 변경');
  fullSearchChecks++;
}
const stats = (xs: number[]) => { const sorted = [...xs].sort((a, b) => a - b); return { median: sorted[Math.floor(sorted.length * .5)], p95: sorted[Math.floor(sorted.length * .95)], max: sorted.at(-1) }; };
const hash = (p: string | URL) => createHash('sha256').update(readFileSync(p)).digest('hex');
const files = readdirSync(new URL('../src/', import.meta.url)).filter((p) => /^bot(?:-.*)?\.ts$/.test(p)).sort();
console.log(JSON.stringify({ format: 1, positions: total / 3, rounds: 3, decisionChecks, fullSearchChecks, exactMatch: true,
  baselineLocalCommit: '34398ab', baselineRemoteCommit: '778a6f8e36f869176ba5fdd51d8b7cea4da64b04', runtime: process.version,
  startSeed: 65000, seeds: 5, scope: 'idle local paired full-policy timings with alternating order, three rounds of the same 800 synthetic positions; no excluded warmup; not VM/live load; internal results checked after timing',
  groups: Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, { positions: v.positions,
    rounds: v.rounds.map((r) => ({ prior: stats(r.prior), current: stats(r.current) })),
    pooled: { prior: stats(v.rounds.flatMap((r) => r.prior)), current: stats(v.rounds.flatMap((r) => r.current)) } }])),
  baselineHashes: Object.fromEntries(files.map((p) => [p, hash(resolve(dirname(baselinePath), p))])),
  hashes: Object.fromEntries([...files.map((p) => [`../src/${p}`, hash(new URL(`../src/${p}`, import.meta.url))]),
    ...['sequence-latency-cost.ts', 'league-runner.ts'].map((p) => [p, hash(new URL(p, import.meta.url))])]) }, null, 2));
