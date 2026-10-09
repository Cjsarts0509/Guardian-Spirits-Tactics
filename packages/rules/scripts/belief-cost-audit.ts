import { performance } from 'node:perf_hooks';
import { isDeepStrictEqual } from 'node:util';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assignmentBelief, sampleAssignments } from '../src/bot-belief.js';
import { advance, createBotMemory, smartBotAction, botKnowledge, viewFor } from '../src/index.js';
import { fixtures, prepareMatch } from './league-runner.js';
const path = process.argv[2];
if (!path) throw new Error('73a7e26 고정 bot.ts 경로 필요');
const prior = await import(pathToFileURL(path).href);
const oldBelief = await import(pathToFileURL(resolve(dirname(path), 'bot-belief.ts')).href);
const groups: Record<string, { old: number[]; current: number[] }> = {};
const positions = [];
for (const mode of ['civil_war', 'primordial', 'lidellut', 'troll'] as const) for (let i = 0; i < 5; i++) {
  const { state } = prepareMatch(fixtures(mode, 68000 + i, 8 + i)[0]!);
  advance(state, 440_000);
  for (const p of state.players) { p.published = p.character; p.mana = 100; }
  for (const p of state.players) {
    for (const kind of ['broad-unpublished', 'broad-published', 'half-confirmed', 'all-confirmed', 'contradictory']) {
      const view = viewFor(state, p.id), memory = createBotMemory(i + 1);
      if (kind === 'broad-unpublished') for (const row of view.players) row.published = null;
      const knowledge = botKnowledge(state, p.id, view, memory), others = state.players.filter((r) => r.id !== p.id);
      if (kind === 'half-confirmed' || kind === 'all-confirmed') {
        for (const r of others.slice(0, kind === 'all-confirmed' ? others.length : Math.floor(others.length / 2)))
          knowledge.candidates.set(r.id, [r.character]);
      }
      if (kind === 'contradictory') for (const r of others.slice(0, 2)) knowledge.candidates.set(r.id, [others[0]!.character]);
      positions.push({ view, knowledge, memory, kind });
    }
  }
}
let beliefChecks = 0, samplingChecks = 0, policyChecks = 0;
for (let round = 0; round < 3; round++) for (const [i, position] of positions.entries()) {
  const values: unknown[] = [], memories: unknown[] = [];
  const group = groups[position.kind] ??= { old: [], current: [] };
  for (const version of (i + round) % 2 ? ['current', 'old'] : ['old', 'current']) {
    const memory = structuredClone(position.memory), begin = performance.now();
    const value = (version === 'old' ? oldBelief.assignmentBelief : assignmentBelief)(position.view, position.knowledge, memory);
    group[version as 'old' | 'current'].push(performance.now() - begin);
    values[version === 'old' ? 0 : 1] = value; memories[version === 'old' ? 0 : 1] = memory;
  }
  if (!isDeepStrictEqual(values[0], values[1]) || !isDeepStrictEqual(memories[0], memories[1])) throw new Error('확률/캐시 기억 차이');
  beliefChecks++;
}
// 표본 및 실제 정책 검증은 비용 측정 뒤에 분리한다.
for (const position of positions) {
  const first = structuredClone(position.memory), second = structuredClone(position.memory), a = { rng: 917 }, b = { rng: 917 };
  const before = oldBelief.sampleAssignments(position.view, position.knowledge, first, a, 16);
  const after = sampleAssignments(position.view, position.knowledge, second, b, 16);
  if (!isDeepStrictEqual(before, after) || !isDeepStrictEqual(a, b) || !isDeepStrictEqual(first, second)) throw new Error('표본/RNG/기억 차이');
  samplingChecks++;
}
for (const mode of ['civil_war', 'primordial', 'lidellut', 'troll'] as const) for (let i = 0; i < 5; i++) {
  const { state } = prepareMatch(fixtures(mode, 69000 + i, 8 + i)[0]!); advance(state, 440_000);
  for (const p of state.players) { p.published = p.character; p.mana = 100; }
  const initial = structuredClone(state);
  for (const p of state.players) for (const extended of [false, true]) {
    const a = createBotMemory(i + 1), b = createBotMemory(i + 1);
    const options = { activity: 1, sequenceSearch: extended, sequenceSkills: extended, sequenceExtended: extended };
    const before = prior.smartBotAction(state, p.id, a, options), after = smartBotAction(state, p.id, b, options);
    if (!isDeepStrictEqual(before, after) || !isDeepStrictEqual(a, b) || !isDeepStrictEqual(state, initial)) throw new Error('정책/기억/입력 차이');
    policyChecks++;
  }
}
const stats = (xs: number[]) => { const s = xs.slice().sort((a,b) => a-b); return { samples: s.length, median: s[Math.floor(s.length*.5)], p95: s[Math.floor(s.length*.95)], max: s.at(-1) }; };
const hash = (p: string | URL) => createHash('sha256').update(readFileSync(p)).digest('hex');
const files = readdirSync(new URL('../src/', import.meta.url)).filter((p) => /^bot.*\.ts$/.test(p));
console.log(JSON.stringify({ format: 1, baselineLocalCommit: '73a7e26', baselineRemoteCommit: '2c48c2552da872a0804a99ac28d453d5fa02f7f2',
  runtime: process.version, positions: positions.length, rounds: 3, beliefChecks, samplingChecks, policyChecks,
  scope: '같은 합성 위치의 차가운 배정 확률 계산, 3회 순서 교차. 후보 제한은 평가용 합성 관찰. VM/전체 틱 비용/승률 자료 아님.',
  groups: Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,{ old:stats(v.old), current:stats(v.current) }])),
  baselineHashes: Object.fromEntries(files.map(p=>[p,hash(resolve(dirname(path),p))])),
  hashes: Object.fromEntries([...files.map(p=>[`../src/${p}`,hash(new URL(`../src/${p}`,import.meta.url))]),
    ...['belief-cost-audit.ts','league-runner.ts'].map(p=>[p,hash(new URL(p,import.meta.url))])]) }, null, 2));
