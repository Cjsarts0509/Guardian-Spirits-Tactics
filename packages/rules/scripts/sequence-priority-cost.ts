import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { advance, createBotMemory, smartBotAction, viewFor } from '../src/index.js';
import { fixtures, prepareMatch } from './league-runner.js';
const baselinePath = process.argv[2];
if (!baselinePath) throw new Error('이전 고정 bot.ts 경로 필요');
const prior: typeof smartBotAction = (await import(pathToFileURL(baselinePath).href)).smartBotAction;
const groups: Record<string, { prior: number[]; current: number[]; changed: number; positions: number }> = {};
let total = 0;
for (const mode of ['civil_war', 'primordial', 'lidellut', 'troll'] as const) for (let i = 0; i < 5; i++)
  for (const elapsed of [400_000, 440_000]) for (const revealed of [false, true]) {
    const { state } = prepareMatch(fixtures(mode, 59000 + i, 8 + i)[0]!);
    advance(state, elapsed);
    for (const p of state.players) { p.published = p.character; p.mana = 100; if (revealed) state.revealed[p.id] = p.character; }
    const groupKey = `${revealed ? 'identities-public' : 'identities-private'}/${elapsed === 400_000 ? 'turn-in-50s' : 'turn-in-10s'}`;
    const group = groups[groupKey] ??= { prior: [], current: [], changed: 0, positions: 0 };
    for (const p of state.players) {
      const initial = JSON.stringify(state), ownView = JSON.stringify(viewFor(state, p.id));
      const memory = createBotMemory(i + 1);
      let oldAction: unknown, newAction: unknown;
      for (const key of total % 2 ? ['current', 'prior'] as const : ['prior', 'current'] as const) {
        const clone = structuredClone(memory), started = performance.now();
        const action = (key === 'prior' ? prior : smartBotAction)(state, p.id, clone,
          { activity: 1, sequenceSearch: true, sequenceSkills: true, sequenceExtended: true });
        group[key].push(performance.now() - started);
        if (key === 'prior') oldAction = action; else newAction = action;
        if (JSON.stringify(state) !== initial || JSON.stringify(viewFor(state, p.id)) !== ownView) throw new Error('정책이 상태/관찰을 변경');
      }
      if (JSON.stringify(oldAction) !== JSON.stringify(newAction)) group.changed++;
      group.positions++; total++;
    }
  }
const stats = (xs: number[]) => { xs.sort((a, b) => a - b); return { median: xs[Math.floor(xs.length * .5)], p95: xs[Math.floor(xs.length * .95)], max: xs.at(-1) }; };
console.log(JSON.stringify({ format: 1, total, scope: 'paired full-policy synthetic local timings, alternating execution order; not VM/live latency distribution',
  groups: Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, { positions: v.positions, changed: v.changed, prior: stats(v.prior), current: stats(v.current) }])),
  hashes: { frozenBaselineBot: createHash('sha256').update(readFileSync(baselinePath)).digest('hex'),
    ...Object.fromEntries(['../src/bot.ts', '../src/bot-sequence.ts', '../src/bot-growth.ts', './sequence-priority-cost.ts'].map((p) =>
      [p, createHash('sha256').update(readFileSync(new URL(p, import.meta.url))).digest('hex')])) } }, null, 2));
