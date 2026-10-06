import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { advance, botKnowledge, createBotMemory, hypothesisScenarios, hypothesisWorld, sampleAssignments, viewFor } from '../src/index.js';
import { fixtures, prepareMatch } from './league-runner.js';

let worlds = 0, scenarios = 0;
const modes: Record<string, number> = {};
for (const mode of ['civil_war', 'primordial', 'lidellut', 'troll'] as const) {
  modes[mode] = 0;
  for (let i = 0; i < 20; i++) {
    const { state } = prepareMatch(fixtures(mode, 30000 + i, 8 + i % 5)[0]!);
    const memory = createBotMemory(9), rng = { rng: i + 99 };
    for (const at of [0, 120_000, 400_000, 800_000]) {
      advance(state, at);
      const view = viewFor(state, 'p1'), knowledge = botKnowledge(state, 'p1', view, memory);
      for (const assignment of sampleAssignments(view, knowledge, memory, rng)) {
        const world = hypothesisWorld(view, knowledge, memory.perception!.battle, assignment);
        worlds++; modes[mode]!++;
        for (const player of world.players.values()) {
          const ranges = [player.mana, player.lives, player.guardCharges, ...player.skills.flatMap((s) =>
            [s.present, s.mana, s.cooldownRemainingMs, ...(s.usesLeft ? [s.usesLeft] : [])])];
          if (ranges.some(([low, high]) => !Number.isFinite(low) || !Number.isFinite(high) || low < 0 || low > high)) throw new Error('유효하지 않은 가설 범위');
        }
        const endpoints = hypothesisScenarios(world, 'p1'); scenarios += endpoints.length;
        if (JSON.stringify(endpoints[0]!.players.get('p1')) !== JSON.stringify(endpoints[1]!.players.get('p1'))) throw new Error('자기 상태가 시나리오마다 변했습니다.');
      }
    }
  }
}
console.log(JSON.stringify({ format: 1, startSeed: 30000, seeds: 20, counts: [8, 9, 10, 11, 12],
  times: [0, 120_000, 400_000, 800_000], worlds, scenarios, modes,
  scope: 'schema and range validation only; not combat rollouts or performance improvement',
  hashes: Object.fromEntries(['../src/bot-hypothesis.ts', '../src/bot-belief.ts', '../src/bot-tactics.ts', './hypothesis-audit.ts'].map((p) =>
    [p, createHash('sha256').update(readFileSync(new URL(p, import.meta.url))).digest('hex')])) }, null, 2));
