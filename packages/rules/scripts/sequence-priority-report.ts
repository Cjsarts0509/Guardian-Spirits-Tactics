import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pairedInterval, type summarize } from './league-runner.js';
const modes = ['civil_war', 'primordial', 'lidellut', 'troll'] as const;
const baselinePath = process.argv[2];
if (!baselinePath) throw new Error('고정 수정 전 bot.ts 경로 필요');
const comparisons = Object.fromEntries(['extended', 'roles'].map((comparator) => {
  const results = modes.map((mode) => {
    const file = `../../../docs/evaluations/sequence-priority-heldout-${comparator}-${mode}-100.json`;
    const data = JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8')) as {
      seeds: number; startSeed: number; hashes: Record<string, string>; modes: Record<string, ReturnType<typeof summarize>>;
    };
    if (data.seeds !== 100 || data.startSeed !== (comparator === 'extended' ? 57000 : 58000)) throw new Error('최종 시드 설정 불일치');
    for (const [path, hash] of Object.entries(data.hashes)) {
      const input = path === 'frozenBaselineBot' ? baselinePath : new URL(path, import.meta.url);
      if (createHash('sha256').update(readFileSync(input)).digest('hex') !== hash) throw new Error(`소스 변경: ${path}`);
    }
    return { mode, file, data, value: data.modes[mode]! };
  });
  const first = results[0]!.data;
  if (results.some((r) => JSON.stringify(r.data.hashes) !== JSON.stringify(first.hashes))) throw new Error('모드간 소스 차이');
  const scores = Array.from({ length: 100 }, (_, i) => results.reduce((sum, r) => sum + r.value.pairedScores[i]!.score, 0) / 4);
  return [comparator, { seeds: 100, startSeed: first.startSeed,
    modes: Object.fromEntries(results.map((r) => [r.mode, { source: r.file, games: r.value.games, wins: r.value.wins,
      score: r.value.currentScore, seedBootstrap95: r.value.seedBootstrap95, stats: r.value.stats }])),
    overall: { games: results.reduce((n, r) => n + r.value.games, 0),
      wins: results.reduce((n, r) => n + r.value.wins.current, 0), losses: results.reduce((n, r) => n + r.value.wins.reference, 0),
      unfinished: results.reduce((n, r) => n + r.value.wins.unfinished, 0),
      score: scores.reduce((n, x) => n + x, 0) / 100, seedBootstrap95: pairedInterval(scores), seedScores: scores },
    hashes: first.hashes }];
}));
console.log(JSON.stringify({ format: 1, policyRemoteCommit: '890edc85e6d88ba35fe4e33dd5fa92c13d4a4211',
  comparisons, scope: 'two separately seeded independent comparisons; development seeds excluded; not human skill rating' }, null, 2));
