import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { smartBotAction, type Action } from '../src/index.js';
import { fixtures, playMatch, summarize, DEFAULT_SETTINGS } from './league-runner.js';
const durations: number[] = [], changed: Record<string, number> = {}, byRole: Record<string, number> = {};
let calls = 0, actions = 0, switches = 0, rejects = 0;
const key = (a: Action | null) => a?.type === 'skill' ? a.skill : a?.type ?? 'wait';
const modes: Record<string, ReturnType<typeof summarize>> = {};
for (const mode of ['civil_war', 'primordial', 'lidellut', 'troll'] as const) {
  const games = [];
  for (let i = 0; i < 2; i++) for (const f of fixtures(mode, 48005 + i, 8 + i % 5)) {
    games.push(playMatch(f, { current: (s, id, m, o) => {
      const clone = structuredClone(m);
      const started = performance.now();
      const action = smartBotAction(s, id, m, { ...o, sequenceSearch: true, sequenceSkills: true });
      const duration = performance.now() - started;
      calls++;
      if (action) { actions++; durations.push(duration); }
      const baseline = smartBotAction(s, id, clone, { ...o, sequenceSearch: true, sequenceSkills: false });
      if (JSON.stringify(action) !== JSON.stringify(baseline)) {
        switches++;
        const label = `${key(baseline)} -> ${key(action)}`;
        changed[label] = (changed[label] ?? 0) + 1;
        const role = s.players.find((p) => p.id === id)!.character;
        byRole[role] = (byRole[role] ?? 0) + 1;
      }
      return action;
    }, reference: (s, id, m, o) => smartBotAction(s, id, m, { ...o, sequenceSearch: false }) }, DEFAULT_SETTINGS));
  }
  modes[mode] = summarize(games);
  rejects += modes[mode].stats.current.rejected;
}
durations.sort((a, b) => a - b);
console.log(JSON.stringify({ format: 1, scope: '32 development diagnostic games; role-skill vs plain-search shadow choices; not independent evidence or VM latency',
  startSeed: 48005, seeds: 2, settings: DEFAULT_SETTINGS, calls, actions, switches, rejects, changed, byRole,
  actionDecisionMs: { median: durations[Math.floor(durations.length * .5)], p95: durations[Math.floor(durations.length * .95)], max: durations.at(-1) },
  hashes: Object.fromEntries(['../src/bot.ts', '../src/bot-followup.ts', '../src/bot-sequence.ts', '../src/bot-confirmation.ts', './sequence-skills-decisions.ts', './league-runner.ts'].map((p) =>
    [p, createHash('sha256').update(readFileSync(new URL(p, import.meta.url))).digest('hex')])) }, null, 2));
