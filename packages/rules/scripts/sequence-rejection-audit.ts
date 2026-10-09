// 진단 전용 관측자. 거절 결과·숨은 보호 상태는 정책/봇 기억에 전달하지 않는다.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { smartBotAction } from '../src/bot.js';
import { viewFor, type PlayerView } from '../src/index.js';
import { fixtures, playMatch, DEFAULT_SETTINGS, type Policy } from './league-runner.js';

const seeds = Number(process.argv[2] ?? 10), startSeed = Number(process.argv[3] ?? 66000);
if (!Number.isSafeInteger(seeds) || seeds <= 0 || !Number.isSafeInteger(startSeed) || startSeed < 0) throw new Error('시드 설정 오류');
const rejected: unknown[] = [], games = [];
const errors: Record<string, number> = {};
let attempted = 0, hiddenProtection = 0, observableProtection = 0, other = 0;
for (const mode of ['civil_war', 'primordial', 'lidellut', 'troll'] as const) {
  for (let i = 0; i < seeds; i++) {
    for (const fixture of fixtures(mode, startSeed + i, 8 + i % 5)) {
      let before: PlayerView | undefined;
      const policy: Policy = (state, id, memory, options) => {
        const action = smartBotAction(state, id, memory, { ...options,
          sequenceSearch: true, sequenceSkills: true, sequenceExtended: true });
        if (action) before = viewFor(state, id);
        return action;
      };
      games.push(playMatch(fixture, { current: policy, reference: policy }, DEFAULT_SETTINGS, (state, id, action, result) => {
        attempted++;
        if (result.ok) return;
        if (!before || before.me.id !== id) throw new Error('행동 직전 관찰 누락');
        const target = action.type === 'skill' ? before.players.find((p) => p.id === action.target) : undefined;
        const actualTarget = target && state.players.find((p) => p.id === target.id);
        const protection = actualTarget?.effects.filter((e) => e.kind === 'invulnerable' && e.until > state.now) ?? [];
        const publicProtection = target?.statuses.some((e) => e.kind === 'invulnerable') ?? false;
        const classification = result.error === '대상이 보호받고 있어 지정할 수 없습니다.' && protection.length
          ? publicProtection ? 'observable-protection' : 'hidden-protection' : 'other';
        if (classification === 'hidden-protection') hiddenProtection++;
        else if (classification === 'observable-protection') observableProtection++;
        else other++;
        errors[result.error ?? 'unknown'] = (errors[result.error ?? 'unknown'] ?? 0) + 1;
        rejected.push({ fixture, at: state.now, actor: id, action, error: result.error, classification,
          observation: { target, ownAllies: before.me.allies,
            skill: action.type === 'skill' ? before.me.skills.find((s) => s.key === action.skill) : undefined },
          evaluatorOnly: { protection } });
      }));
    }
    if ((i + 1) % 5 === 0) process.stderr.write(`[rejection-audit] ${mode}: ${i + 1}/${seeds}\n`);
  }
}
const files = [...readdirSync(new URL('../src/', import.meta.url)).filter((p) => /^bot.*\.ts$/.test(p)).map((p) => `../src/${p}`),
  'league-runner.ts', 'sequence-rejection-audit.ts'];
console.log(JSON.stringify({ format: 1, seeds, startSeed, settings: DEFAULT_SETTINGS,
  scope: '동일 실험 정책 간 합성 대전. 행동 직전 자기 뷰와 거절 뒤 평가자 전용 보호 상태를 분리 기록. 승률/인간 실력 평가 아님.',
  totals: { games: games.length, ended: games.filter((g) => g.winner !== null).length, attempted,
    rejected: rejected.length, hiddenProtection, observableProtection, other,
    earlyAttackFailures: games.reduce((n, g) => n + g.stats.current.earlyAttackFailures + g.stats.reference.earlyAttackFailures, 0) },
  errors, rejected, games,
  hashes: Object.fromEntries(files.map((p) => [p, createHash('sha256').update(readFileSync(new URL(p, import.meta.url))).digest('hex')])) }, null, 2));
