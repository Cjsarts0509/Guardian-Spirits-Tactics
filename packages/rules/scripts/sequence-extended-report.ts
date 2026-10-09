import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pairedInterval, type summarize } from './league-runner.js';

const modes = ['civil_war', 'primordial', 'lidellut', 'troll'] as const;
const results = modes.map((mode) => {
  const file = `../../../docs/evaluations/sequence-extended-heldout-${mode}-25.json`;
  const data = JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8')) as {
    seeds: number; startSeed: number; hashes: Record<string, string>; modes: Record<string, ReturnType<typeof summarize>>;
  };
  if (data.seeds !== 25 || data.startSeed !== 54000) throw new Error('최종 시드 설정 불일치');
  for (const [path, hash] of Object.entries(data.hashes)) {
    const actual = createHash('sha256').update(readFileSync(new URL(path, import.meta.url))).digest('hex');
    if (actual !== hash) throw new Error(`정책 소스 변경: ${path}`);
  }
  return { mode, file, data, value: data.modes[mode]! };
});
const scores = Array.from({ length: 25 }, (_, i) => results.reduce((sum, r) => sum + r.value.pairedScores[i]!.score, 0) / 4);
console.log(JSON.stringify({ format: 1, policyRemoteCommit: '936c5f439254e209ea4b0c2ee5bea1a57a336266',
  comparator: 'b7c56ee 25-role sequence policy, extended option disabled', startSeed: 54000, seeds: 25,
  modes: Object.fromEntries(results.map((r) => [r.mode, { source: r.file, games: r.value.games,
    wins: r.value.wins, score: r.value.currentScore, seedBootstrap95: r.value.seedBootstrap95, stats: r.value.stats }])),
  overall: { games: results.reduce((n, r) => n + r.value.games, 0),
    wins: results.reduce((n, r) => n + r.value.wins.current, 0),
    losses: results.reduce((n, r) => n + r.value.wins.reference, 0),
    unfinished: results.reduce((n, r) => n + r.value.wins.unfinished, 0),
    score: scores.reduce((n, x) => n + x, 0) / 25, seedBootstrap95: pairedInterval(scores), seedScores: scores },
  hashes: results[0]!.data.hashes,
}, null, 2));
