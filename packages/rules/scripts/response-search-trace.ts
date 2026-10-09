import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { smartBotAction, viewFor } from '../src/index.js';
import { fixtures, playMatch, DEFAULT_SETTINGS } from './league-runner.js';

// 기존 정책을 별도 메모리 복사에서 비교한다. 기록은 실행 정책에 전달하지 않는다.
const cases = [{ mode: 'lidellut' as const, seed: 34009 }, { mode: 'troll' as const, seed: 34046 }];
const records: unknown[] = [], games: unknown[] = [];
const counts = { changedTargetOrSkill: 0, attackToWait: 0, other: 0 };
for (const { mode, seed } of cases) for (const fixture of fixtures(mode, seed, 8 + (seed - 34000) % 5)) {
  const game = playMatch(fixture, {
    current: (state, id, memory, options) => {
      const copy = structuredClone(memory);
      const actual = smartBotAction(state, id, memory, { ...options, attackSearch: true, attackResponse: true });
      const baseline = smartBotAction(state, id, copy, { ...options, attackSearch: false });
      if (JSON.stringify(actual) !== JSON.stringify(baseline)) {
        const kind = baseline?.type === 'skill' && !actual ? 'attackToWait' :
          baseline?.type === 'skill' && actual?.type === 'skill' ? 'changedTargetOrSkill' : 'other';
        counts[kind]++;
        if (records.length < 100) {
          const view = viewFor(state, id);
          records.push({ fixture, elapsedMs: view.elapsedMs, self: id, character: view.me.character,
            mana: view.me.mana, actual, baseline, kind });
        }
      }
      return actual;
    },
    reference: (state, id, memory, options) => smartBotAction(state, id, memory, { ...options, attackSearch: false }),
  }, DEFAULT_SETTINGS);
  games.push({ fixture, winnerPolicy: game.winnerPolicy, elapsedMs: game.elapsedMs });
}
console.log(JSON.stringify({ format: 1, scope: 'post-validation diagnostics only; no subsequent policy tuning; first 100 divergences',
  counts, games, records, hashes: Object.fromEntries(['../src/bot.ts', '../src/bot-rollout.ts', '../src/bot-response.ts', './response-search-trace.ts'].map((p) =>
    [p, createHash('sha256').update(readFileSync(new URL(p, import.meta.url))).digest('hex')])) }, null, 2));
