import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const [profilePath, runPath] = process.argv.slice(2);
if (!profilePath || !runPath) throw new Error('usage: node summarize-cpu-profile.mjs profile.cpuprofile run.json');
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const bytes = readFileSync(profilePath), profile = JSON.parse(bytes), run = readFileSync(runPath);
if (profile.samples.length !== profile.timeDeltas.length) throw new Error('sample/delta length mismatch');
const nodes = new Map(profile.nodes.map((n) => [n.id, n]));
const weights = new Map();
profile.samples.forEach((id, i) => {
  const name = nodes.get(id).callFrame.functionName || '(anonymous)';
  weights.set(name, (weights.get(name) ?? 0) + profile.timeDeltas[i] / 1000);
});
console.log(JSON.stringify({ format: 1, profileSha256: sha(bytes), profileRunSha256: sha(run),
  summaryScriptSha256: sha(readFileSync(new URL(import.meta.url))),
  durationMs: (profile.endTime - profile.startTime) / 1000, samples: profile.samples.length,
  weightMeaning: 'CPU profiler time deltas are wall-time sampling weights grouped by function name, not measured CPU durations. Includes idle/setup/cleanup and profiling overhead.',
  topSelfSamples: [...weights].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([name, weight]) => ({ function: name, sampledMs: weight })) }, null, 2));
