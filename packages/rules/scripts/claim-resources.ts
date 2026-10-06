// pnpm --filter @gst/rules exec tsx scripts/claim-resources.ts [시드 수] [시작 시드] [truthful|adaptive|adaptive-resources|all] [primordial|all]
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { smartBotAction, viewFor } from '../src/index.js';
import { smartBotAction as previous } from './baselines/pre-adaptive.js';
import { opponentClaim, type ClaimStyle } from './claim-opponents.js';
import { fixtures, playMatch, summarize, DEFAULT_SETTINGS, type Policy } from './league-runner.js';

const args = process.argv.slice(2).filter((a) => a !== '--');
const seeds = Number(args[0] ?? 25), startSeed = Number(args[1] ?? 9000), selected = args[2] ?? 'all';
const strategies = ['truthful', 'adaptive', 'adaptive-resources'] as const;
const modeFilter = args[3] ?? 'all';
if (!Number.isSafeInteger(seeds) || seeds <= 0 || !Number.isSafeInteger(startSeed) ||
  !['primordial', 'all'].includes(modeFilter) ||
  !(selected === 'all' || strategies.some((s) => s === selected))) throw new Error('평가 설정 오류');
const output: Record<string, unknown> = {};
for (const strategy of strategies.filter((s) => selected === 'all' || s === selected)) {
  const modes: Record<string, unknown> = {};
  const current: Policy = (s, id, m, o) => smartBotAction(s, id, m, { ...o, claimStrategy: strategy });
  for (const mode of ['civil_war', 'primordial', 'lidellut', 'troll'] as const) {
    if (modeFilter !== 'all' && mode !== modeFilter) continue;
    const opponents: Record<string, unknown> = {};
    for (const style of ['previous', 'truthful', 'bluff', 'skill-aware-bluff'] as const) {
      const reference: Policy = (s, id, m, o) => {
        const action = previous(s, id, m, { activity: o.activity });
        if (style === 'previous' || action?.type !== 'skill' || action.skill !== 'publish') return action;
        return { ...action, name: opponentClaim(viewFor(s, id), m, style as ClaimStyle, action.name) };
      };
      const results = [];
      const claims = { trueName: 0, decoy: 0, changedToDecoy: 0 };
      const byRole: Record<string, { decoy: number; incompleteGem: number; manaBelowAttackCost: number }> = {};
      for (let i = 0; i < seeds; i++) for (const f of fixtures(mode, startSeed + i, 8 + i % 5)) {
        results.push(playMatch(f, { current, reference }, DEFAULT_SETTINGS, (state, id, action, result) => {
          if (!result.ok || action.type !== 'skill' || action.skill !== 'publish') return;
          const p = state.players.find((p) => p.id === id)!;
          if (p.side !== f.currentSide) return;
          if (action.name === p.character) claims.trueName++;
          else {
            claims.decoy++;
            const role = byRole[p.character] ??= { decoy: 0, incompleteGem: 0, manaBelowAttackCost: 0 };
            role.decoy++;
            role.incompleteGem += Number(p.gem < 3);
            const view = viewFor(state, id);
            role.manaBelowAttackCost += Number(view.me.skills.some((s) => ['attack', 'advanced_attack', 'supreme_attack', 'soen_chain_murder'].includes(s.key) && s.usesLeft !== 0 && s.cooldownRemainingMs <= view.nextTurnInMs && p.mana < s.mana));
            const event = state.log.filter((e) => e.kind === 'publish' && e.data?.player === id).pop();
            if (event?.data?.prev === p.character) claims.changedToDecoy++;
          }
        }));
      }
      opponents[style] = { ...summarize(results), claims, byRole };
      process.stderr.write(`[strategy] ${strategy}/${mode}/${style}: ${seeds} 시드\n`);
    }
    modes[mode] = opponents;
  }
  output[strategy] = modes;
}
console.log(JSON.stringify({ format: 1, seeds, startSeed, selected, modeFilter, settings: DEFAULT_SETTINGS,
  referenceSource: 'f0e58d1 / c505d4b:packages/rules/src/bot.ts',
  hashes: Object.fromEntries(['../src/bot.ts', '../src/bot-memory.ts', '../src/bot-claim-policy.ts', './baselines/pre-adaptive.ts', './claim-opponents.ts', './claim-resources.ts'].map((p) =>
    [p, createHash('sha256').update(readFileSync(new URL(p, import.meta.url))).digest('hex')])), strategies: output }, null, 2));
