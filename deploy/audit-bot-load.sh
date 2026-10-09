#!/usr/bin/env bash
# 별도 임시 체크아웃/로컬 임의 포트에서 실행하는 VM 진단. sudo 불필요.
set -euo pipefail
if [[ -x /opt/gst/node/bin/node ]]; then export PATH="/opt/gst/node/bin:$PATH"; fi
for command in node git tar; do command -v "$command" >/dev/null || { echo "[audit] $command 필요" >&2; exit 1; }; done
node -e 'if (Number(process.versions.node.split(".")[0]) < 22) throw Error("Node 22 이상 필요")'
duration="${GST_AUDIT_DURATION_MS:-30000}"
[[ "$duration" =~ ^[0-9]+$ ]] && (( duration >= 1000 && duration <= 120000 )) || { echo '[audit] 측정 기간은 1000–120000ms' >&2; exit 1; }
audit_dir="$(mktemp -d /tmp/gst-audit.XXXXXX)"
trap 'echo "[audit] 파일 위치: $audit_dir" >&2' EXIT
if [[ -n "${GST_AUDIT_SOURCE:-}" ]]; then
  source_dir="$(cd "$GST_AUDIT_SOURCE" && pwd)"
else
  command -v npx >/dev/null || { echo '[audit] npx 필요' >&2; exit 1; }
  ref="${GST_AUDIT_REF:-feat/bot-bounded-attack-search}"
  [[ "$ref" =~ ^[a-zA-Z0-9][a-zA-Z0-9./_-]*$ ]] || { echo '[audit] 잘못된 소스 ref' >&2; exit 1; }
  source_dir="$audit_dir/source"
  git init -q "$source_dir"
  git -C "$source_dir" fetch --quiet --depth 1 https://github.com/Cjsarts0509/Guardian-Spirits-Tactics.git "$ref"
  git -C "$source_dir" checkout --quiet --detach FETCH_HEAD
  (cd "$source_dir" && npx --yes pnpm@10.28.0 install --frozen-lockfile)
fi
cd "$source_dir"
source_commit="$(git rev-parse HEAD)"
export GST_AUDIT_COMMIT="$source_commit" GST_AUDIT_OUTPUT="$audit_dir" GST_AUDIT_DURATION_MS="$duration"
echo "[audit] 소스 $source_commit / $(node --version) / 조건별 ${duration}ms"
apps/server/node_modules/.bin/esbuild apps/server/scripts/bot-load-audit.ts \
  --bundle --platform=node --target=node22 --format=esm --outfile="$audit_dir/audit.mjs" \
  --external:bufferutil --external:utf-8-validate \
  --alias:@gst/rules=./packages/rules/src/index.ts --alias:@gst/protocol=./packages/protocol/src/index.ts \
  --banner:js="import { createRequire } from 'module'; const require = createRequire(import.meta.url);"
node "$audit_dir/audit.mjs" "$duration" trace > "$audit_dir/results.json"
node --input-type=module <<'NODE'
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = process.env.GST_AUDIT_OUTPUT;
const bytes = readFileSync(`${root}/results.json`), result = JSON.parse(bytes);
const summary = { commit: process.env.GST_AUDIT_COMMIT, runtime: result.runtime,
  dirtySource: !!execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).trim(),
  resultsSha256: createHash('sha256').update(bytes).digest('hex'),
  cases: result.results.map((r) => ({ name: r.name, tickP95Ms: r.tickMs.p95, tickMaxMs: r.tickMs.max,
    tickIntervalMaxMs: Math.max(0, ...r.lagTrace.ticks.map((t) => t.intervalMs)),
    loopMaxMs: r.eventLoopMs.max, ticksOver250ms: r.ticksOver250ms,
    healthErrors: r.healthErrors, wsErrors: r.wsErrors, osAvailability: r.lagTrace.osAvailability,
    largestGaps: r.lagTrace.gaps.slice().sort((a,b) => b.intervalMs - a.intervalMs).slice(0, 3).map((g) => ({
      intervalMs: g.intervalMs, cpuMs: g.cpuMs, schedulerRunMs: g.schedulerRunMs,
      schedulerWaitMs: g.schedulerWaitMs, throttledMs: g.throttledMs,
      gcMs: g.overlappingGc.reduce((n, e) => n + e.durationMs, 0),
      spans: g.overlappingSpans.map((s) => ({ name: s.name, wallMs: s.wallMs, cpuMs: s.cpuMs })) })) })) };
const text = JSON.stringify(summary, null, 2);
writeFileSync(`${root}/summary.json`, text + '\n');
const ms = (value) => value === null ? 'unknown' : value.toFixed(2);
console.log(`[audit] ${summary.runtime.node} ${summary.runtime.arch}, dirtySource=${summary.dirtySource}`);
for (const c of summary.cases) {
  console.log(`[audit] ${c.name}: tick p95/max=${ms(c.tickP95Ms)}/${ms(c.tickMaxMs)}ms, interval max=${ms(c.tickIntervalMaxMs)}ms, loop max=${ms(c.loopMaxMs)}ms, over250=${c.ticksOver250ms}, HTTP/WS errors=${c.healthErrors}/${c.wsErrors}`);
  console.log(`[audit] cgroup=${c.osAvailability.cgroupPath ?? 'unknown'}, scheduler=${c.osAvailability.runNs !== null && c.osAvailability.runNs > 0 ? 'available' : 'unknown'}`);
  for (const g of c.largestGaps) console.log(`[audit] gap=${ms(g.intervalMs)}ms, CPU=${ms(g.cpuMs)}ms, scheduler wait=${ms(g.schedulerWaitMs)}ms, throttle=${ms(g.throttledMs)}ms, GC=${ms(g.gcMs)}ms`);
}
NODE
tar -czf "$audit_dir/gst-audit-results.tar.gz" -C "$audit_dir" results.json summary.json
echo "[audit] 결과 묶음: $audit_dir/gst-audit-results.tar.gz"
