// 태초의 지휘관 공표 시점·리더쉽 대상 비교. 진짜 역할은 평가 집계에만 사용한다.
// pnpm --filter @gst/rules exec tsx scripts/primordial-audit.ts [시드 수] [시작 시드]
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { smartBotAction, type GameState } from '../src/index.js';
import type { BotOptions } from '../src/bot.js';
import { DEFAULT_SETTINGS, pairedInterval, playMatch, type Fixture, type Policy } from './league-runner.js';

const args = process.argv.slice(2).filter((a) => a !== '--');
const seeds = Number(args[0] ?? 100), startSeed = Number(args[1] ?? 4000);
if (!Number.isSafeInteger(seeds) || seeds <= 0 || !Number.isSafeInteger(startSeed)) throw new Error('시드 설정 오류');
const variants: Record<string, BotOptions> = {
  early_random: { primordialLeadership: 'early', primordialPriorities: false, primordialSlash: 'early' },
  early_priority: { primordialLeadership: 'early', primordialPriorities: true, primordialSlash: 'early' },
  hidden_random: { primordialLeadership: 'after-six-minutes', primordialPriorities: false, primordialSlash: 'early' },
  hidden_priority: { primordialLeadership: 'after-six-minutes', primordialPriorities: true, primordialSlash: 'early' },
  early_finish: { primordialLeadership: 'early', primordialPriorities: false, primordialSlash: 'finish-or-revealed' },
  hidden_finish: { primordialLeadership: 'after-six-minutes', primordialPriorities: false, primordialSlash: 'finish-or-revealed' },
};
const median = (xs: number[]) => xs.length ? +xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)]!.toFixed(2) : null;
const output: Record<string, unknown> = {};
for (const [name, options] of Object.entries(variants)) {
  const wins = { earth: 0, darkness: 0, unfinished: 0 };
  const cast: Record<string, { games: number; accepted: number; minutes: number[]; targets: Record<string, number> }> = {};
  const deaths: Record<string, { games: number; died: number; minutes: number[]; causes: Record<string, number> }> = {};
  const firstTrueName: Record<string, number[]> = {};
  const earthScores: number[] = [];
  const unfinished: Fixture[] = [];
  let rejected = 0, attempted = 0, earlyFails = 0;
  for (let i = 0; i < seeds; i++) {
    let seedWins = 0;
    for (const reversed of [false, true]) {
      const fixture: Fixture = { mode: 'primordial', seed: startSeed + i, count: 8 + i % 5, reversed, currentSide: 1 };
      const policy: Policy = (s, id, m, o) => smartBotAction(s, id, m, { ...o, ...options });
      let final: GameState | undefined;
      const perGame = new Set<string>();
      const result = playMatch(fixture, { current: policy, reference: policy }, DEFAULT_SETTINGS, (s, id, a, r) => {
        final = s;
        if (!r.ok || a.type !== 'skill') return;
        const role = s.players.find((p) => p.id === id)!.character;
        const key = `${role}:${a.skill}`;
        const entry = cast[key] ??= { games: 0, accepted: 0, minutes: [], targets: {} };
        entry.accepted++; entry.minutes.push(s.now / 60_000);
        if (!perGame.has(key)) { entry.games++; perGame.add(key); }
        const target = a.name ?? s.players.find((p) => p.id === a.target)?.character;
        if (target) entry.targets[target] = (entry.targets[target] ?? 0) + 1;
      });
      if (!final) throw new Error('행동 없는 평가 판');
      if (result.winner === 1) { wins.earth++; seedWins++; }
      else if (result.winner === 2) wins.darkness++;
      else { wins.unfinished++; seedWins += 0.5; unfinished.push(fixture); }
      for (const s of Object.values(result.stats)) { rejected += s.rejected; attempted += s.attempted; earlyFails += s.earlyAttackFailures; }
      for (const role of ['rael', 'kane', 'eltas', 'eoril', 'consume']) {
        const p = final.players.find((p) => p.character === role);
        if (!p) continue;
        const d = deaths[role] ??= { games: 0, died: 0, minutes: [], causes: {} };
        d.games++;
        const death = final.log.find((e) => e.kind === 'death' && e.data?.player === p.id);
        if (death) {
          d.died++; d.minutes.push(death.at / 60_000);
          const cause = String(death.data?.cause ?? 'unknown'); d.causes[cause] = (d.causes[cause] ?? 0) + 1;
        }
        const first = final.log.find((e) => e.kind === 'publish' && e.data?.player === p.id && e.data?.name === role);
        if (first) (firstTrueName[role] ??= []).push(first.at / 60_000);
      }
    }
    earthScores.push(seedWins / 2);
    if ((i + 1) % 25 === 0 || i + 1 === seeds) process.stderr.write(`[audit] ${name}: ${i + 1}/${seeds}\n`);
  }
  output[name] = { options, games: seeds * 2, wins, earthScore: earthScores.reduce((s, x) => s + x, 0) / seeds,
    earthSeedBootstrap95: pairedInterval(earthScores), attempted, rejected, earlyFails, unfinished,
    deaths: Object.fromEntries(Object.entries(deaths).map(([k, x]) => [k, { ...x, minutes: undefined, medianDeathMinute: median(x.minutes) }])),
    firstTrueName: Object.fromEntries(Object.entries(firstTrueName).map(([k, x]) => [k, { games: x.length, medianMinute: median(x) }])),
    skills: Object.fromEntries(Object.entries(cast).filter(([k]) => !/:(publish|ally|break_ally|truth_gem)$/.test(k))
      .map(([k, x]) => [k, { ...x, minutes: undefined, medianMinute: median(x.minutes) }])) };
}
console.log(JSON.stringify({ format: 1, startSeed, seeds, settings: DEFAULT_SETTINGS,
  policySha256: createHash('sha256').update(readFileSync(new URL('../src/bot.ts', import.meta.url))).digest('hex'), variants: output }, null, 2));
