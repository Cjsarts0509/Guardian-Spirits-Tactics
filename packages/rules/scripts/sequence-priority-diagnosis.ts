import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { smartBotAction, viewFor, botKnowledge, type Action } from '../src/index.js';
import { sequenceFollowup } from '../src/bot-sequence.js';
import { growthCandidates } from '../src/bot-growth.js';
import { NAME_ATTACKS } from '../src/bot-tactics.js';
import { fixtures, playMatch, summarize, DEFAULT_SETTINGS } from './league-runner.js';

const key = (a: Action | null | undefined) => a?.type === 'skill' ? a.skill : a?.type ?? 'wait';
const attacks = new Set([...NAME_ATTACKS, 'dantes_command', 'soul_reaver', 'rael_master_power', 'kilder_master_power',
  'consume_slaughter', 'backstab', 'eoril_phoenix_flame', 'kane_wolfs_slash', 'reckless_charge', 'mass_teleport', 'greater_mass_teleport']);
const changes: Record<string, number> = {}, followupChanges: Record<string, number> = {};
const examples: unknown[] = [], modes: Record<string, ReturnType<typeof summarize>> = {};
const matches: unknown[] = [];
let calls = 0, actions = 0, switches = 0, attackDelayed = 0, delayedWithoutGrowth = 0, growthOverridesAttack = 0;
for (const mode of ['civil_war', 'primordial', 'lidellut', 'troll'] as const) {
  const games = [];
  for (let i = 0; i < 2; i++) for (const f of fixtures(mode, 55000 + i, 10 + i)) {
    let delays = 0;
    const game = playMatch(f, { current: (s, id, m, o) => {
      const shadow = structuredClone(m);
      const action = smartBotAction(s, id, m, { ...o, sequenceSearch: true, sequenceSkills: true, sequenceExtended: true });
      const baseline = smartBotAction(s, id, shadow, { ...o, sequenceSearch: true, sequenceSkills: true, sequenceExtended: false });
      calls++; if (action) actions++;
      if (JSON.stringify(action) !== JSON.stringify(baseline)) {
        switches++;
        const label = `${key(baseline)} -> ${key(action)}`; changes[label] = (changes[label] ?? 0) + 1;
        if (baseline?.type === 'skill' && attacks.has(baseline.skill) && !attacks.has(key(action))) {
          attackDelayed++; delays++;
          const view = viewFor(s, id), clone = structuredClone(m), knowledge = botKnowledge(s, id, view, clone);
          const growth = growthCandidates(view, knowledge, clone);
          if (!growth.length) delayedWithoutGrowth++;
          if (examples.length < 16) examples.push({ mode, fixture: f, elapsedMs: view.elapsedMs,
            role: view.me.character, mana: view.me.mana, baseline, selected: action, growth });
        }
      }
      if (action) {
        const view = viewFor(s, id), clone = structuredClone(m), knowledge = botKnowledge(s, id, view, clone);
        const plain = sequenceFollowup(view, knowledge, clone, true, false)?.action;
        const extended = sequenceFollowup(view, knowledge, clone, true, true)?.action;
        if (JSON.stringify(plain) !== JSON.stringify(extended)) {
          const label = `${key(plain)} -> ${key(extended)}`; followupChanges[label] = (followupChanges[label] ?? 0) + 1;
          if (attacks.has(key(plain)) && !attacks.has(key(extended))) growthOverridesAttack++;
        }
      }
      return action;
    }, reference: (s, id, m, o) => smartBotAction(s, id, m, { ...o, sequenceSearch: true, sequenceSkills: true }) }, DEFAULT_SETTINGS);
    games.push(game); matches.push({ fixture: f, winnerPolicy: game.winnerPolicy, delays, elapsedMs: game.elapsedMs });
  }
  modes[mode] = summarize(games);
}
console.log(JSON.stringify({ format: 1, sourcePolicy: '68de00c / local 85038b9', startSeed: 55000, seeds: 2,
  scope: '32 development diagnostic games; same-position shadow decisions, not causal attribution of individual losses or independent performance evidence',
  calls, actions, switches, attackDelayed, delayedWithoutGrowth, growthOverridesAttack, changes, followupChanges, examples, matches, modes,
  hashes: Object.fromEntries(['../src/bot.ts', '../src/bot-sequence.ts', '../src/bot-growth.ts', '../src/bot-followup.ts',
    './sequence-priority-diagnosis.ts', './league-runner.ts'].map((p) =>
    [p, createHash('sha256').update(readFileSync(new URL(p, import.meta.url))).digest('hex')])) }, null, 2));
