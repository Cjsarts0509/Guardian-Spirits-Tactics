// 표본 생성이 실제 정책을 바꾸지 않는지 대결로 검증하고 생성 비용을 별도로 측정한다.
import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { botKnowledge, createBotMemory, sampleAssignments, smartBotAction, viewFor } from '../src/index.js';
import { fixtures, playMatch, prepareMatch, summarize, DEFAULT_SETTINGS } from './league-runner.js';

const seeds = Number(process.argv[2] ?? 20), startSeed = Number(process.argv[3] ?? 27000);
if (!Number.isSafeInteger(seeds) || seeds < 1 || !Number.isSafeInteger(startSeed)) throw new Error('시드 설정 오류');
const modes: Record<string, ReturnType<typeof summarize>> = {};
let sampledWorlds = 0;
for (const mode of ['civil_war', 'primordial', 'lidellut', 'troll'] as const) {
  const games = [];
  for (let i = 0; i < seeds; i++) for (const fixture of fixtures(mode, startSeed + i, 8 + i % 5)) {
    const rngs = new Map<string, { rng: number }>();
    games.push(playMatch(fixture, { current: (state, id, memory, options) => {
      const action = smartBotAction(state, id, memory, options);
      if (action) {
        const view = viewFor(state, id), knowledge = botKnowledge(state, id, view, memory);
        let rng = rngs.get(id);
        if (!rng) { rng = { rng: fixture.seed ^ view.me.seat * 997 }; rngs.set(id, rng); }
        const worlds = sampleAssignments(view, knowledge, memory, rng);
        sampledWorlds += worlds.length;
        for (const world of worlds) {
          if (world.size !== view.players.length || new Set(world.values()).size !== world.size || world.get(id) !== view.me.character) throw new Error('유효하지 않은 전체 배정');
          for (const [player, role] of world) if (player !== id && !knowledge.candidates.get(player)?.includes(role)) throw new Error('확인 제약 위반');
        }
      }
      return action;
    }, reference: smartBotAction }, DEFAULT_SETTINGS));
  }
  modes[mode] = summarize(games);
  process.stderr.write(`[assignment-sampling] ${mode}: ${seeds} 시드\n`);
}

const { state } = prepareMatch(fixtures('civil_war', startSeed, 12)[0]!);
const view = viewFor(state, 'p1'), memory = createBotMemory(5), rng = { rng: 77 };
const knowledge = botKnowledge(state, 'p1', view, memory);
const coldStart = performance.now();
sampleAssignments(view, knowledge, memory, rng);
const coldMs = performance.now() - coldStart;
const times = [];
for (let i = 0; i < 1000; i++) {
  const start = performance.now(); sampleAssignments(view, knowledge, memory, rng); times.push(performance.now() - start);
}
times.sort((a, b) => a - b);
console.log(JSON.stringify({ format: 1, reference: 'same production 8be1574 policy without sampling', seeds, startSeed,
  settings: DEFAULT_SETTINGS, modes, sampledWorlds,
  timing: { fixture: 'civil_war / 12 players / 32 worlds / no observations', coldMs,
    warmMedianMs: times[500], warmP95Ms: times[950], warmMaxMs: times[999], repetitions: times.length,
    note: 'local microbenchmark, not VM latency or a universal timing limit' },
  hashes: Object.fromEntries(['../src/bot-belief.ts', '../src/bot.ts', '../src/bot-memory.ts', './assignment-sampling.ts', './league-runner.ts'].map((p) =>
    [p, createHash('sha256').update(readFileSync(new URL(p, import.meta.url))).digest('hex')])) }, null, 2));
