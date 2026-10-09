#!/usr/bin/env bash
# 운영 서비스와 별도 임시 서버에서 고정 소스 두 개를 AB/BA 순서로 비교한다.
set -euo pipefail
if [[ -x /opt/gst/node/bin/node ]]; then export PATH="/opt/gst/node/bin:$PATH"; fi
for command in node git tar; do command -v "$command" >/dev/null || { echo "[compare] $command 필요" >&2; exit 1; }; done
node -e 'if (Number(process.versions.node.split(".")[0]) < 22) throw Error("Node 22 이상 필요")'
baseline="${GST_COMPARE_BASE_REF:-2c48c2552da872a0804a99ac28d453d5fa02f7f2}"
current="${GST_COMPARE_CURRENT_REF:-bf9ed3b6312ce20214f802ca5f74fd345c7e9ffc}"
pairs="${GST_COMPARE_PAIRS:-3}"
duration="${GST_AUDIT_DURATION_MS:-30000}"
[[ "$baseline" =~ ^[a-f0-9]{40}$ && "$current" =~ ^[a-f0-9]{40}$ && "$baseline" != "$current" ]] || { echo '[compare] 서로 다른 전체 커밋 SHA 필요' >&2; exit 1; }
[[ "$pairs" =~ ^[1-6]$ ]] || { echo '[compare] 반복 쌍은 1–6' >&2; exit 1; }
[[ "$duration" =~ ^[0-9]+$ ]] && (( duration >= 1000 && duration <= 120000 )) || { echo '[compare] 조건별 기간은 1000–120000ms' >&2; exit 1; }
compare_dir="$(mktemp -d /tmp/gst-compare.XXXXXX)"
trap 'echo "[compare] 파일 위치: $compare_dir" >&2' EXIT
for version in baseline current; do
  if [[ "$version" == baseline ]]; then ref="$baseline"; supplied="${GST_COMPARE_BASE_SOURCE:-}";
  else ref="$current"; supplied="${GST_COMPARE_CURRENT_SOURCE:-}"; fi
  if [[ -n "$supplied" ]]; then
    source_dir="$(cd "$supplied" && pwd)"
  else
    command -v npx >/dev/null || { echo '[compare] npx 필요' >&2; exit 1; }
    source_dir="$compare_dir/source-$version"
    git init -q "$source_dir"
    git -C "$source_dir" fetch --quiet --depth 1 https://github.com/Cjsarts0509/Guardian-Spirits-Tactics.git "$ref"
    git -C "$source_dir" checkout --quiet --detach FETCH_HEAD
    (cd "$source_dir" && npx --yes pnpm@10.28.0 install --frozen-lockfile)
  fi
  [[ "$(git -C "$source_dir" rev-parse HEAD)" == "$ref" ]] || { echo "[compare] $version 소스 SHA 불일치" >&2; exit 1; }
  [[ -z "$(git -C "$source_dir" status --porcelain --untracked-files=no)" ]] || { echo "[compare] $version 소스 수정됨" >&2; exit 1; }
  if [[ "$version" == baseline ]]; then base_source="$source_dir"; else current_source="$source_dir"; fi
done
mkdir "$compare_dir/runs"
echo "[compare] 준비 완료: $pairs 쌍, 조건별 ${duration}ms, 계측 약 $(( pairs * 6 * duration / 1000 ))초"
for ((pair=1; pair<=pairs; pair++)); do
  if (( pair % 2 )); then order=(baseline current); else order=(current baseline); fi
  for version in "${order[@]}"; do
    if [[ "$version" == baseline ]]; then source_dir="$base_source"; else source_dir="$current_source"; fi
    run_dir="$compare_dir/runs/$pair-$version"
    mkdir "$run_dir"
    echo "[compare] pair=$pair version=$version"
    GST_AUDIT_SOURCE="$source_dir" GST_AUDIT_DURATION_MS="$duration" bash "$source_dir/deploy/audit-bot-load.sh" 2>&1 | tee "$run_dir/console.log"
    artifact="$(sed -n 's/^\[audit\] 결과 묶음: //p' "$run_dir/console.log")"
    [[ -f "$artifact" ]] || { echo '[compare] 결과 묶음 누락' >&2; exit 1; }
    cp "$(dirname "$artifact")/results.json" "$(dirname "$artifact")/summary.json" "$run_dir/"
  done
done
GST_COMPARE_DIR="$compare_dir" GST_COMPARE_BASELINE="$baseline" GST_COMPARE_CURRENT="$current" GST_COMPARE_PAIRS="$pairs" GST_COMPARE_DURATION="$duration" node --input-type=module <<'NODE'
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = process.env.GST_COMPARE_DIR, pairs = Number(process.env.GST_COMPARE_PAIRS), durationMs = Number(process.env.GST_COMPARE_DURATION);
const refs = { baseline: process.env.GST_COMPARE_BASELINE, current: process.env.GST_COMPARE_CURRENT };
const names = ['one-room-default', 'four-rooms-default', 'four-rooms-high-activity'];
const metrics = ['tickP95Ms', 'tickMaxMs', 'loopMaxMs', 'tickIntervalMaxMs'];
const runs = [];
let runtime;
for (let pair = 1; pair <= pairs; pair++) for (const version of ['baseline', 'current']) {
  const path = `${pair}-${version}`, bytes = readFileSync(`${root}/runs/${path}/results.json`);
  const raw = JSON.parse(bytes), summary = JSON.parse(readFileSync(`${root}/runs/${path}/summary.json`, 'utf8'));
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (summary.commit !== refs[version] || summary.dirtySource !== false || summary.resultsSha256 !== hash)
    throw Error(`출처 검증 실패: ${path}`);
  const identity = JSON.stringify(summary.runtime);
  if (runtime === undefined) runtime = identity;
  if (identity !== runtime || JSON.stringify(raw.runtime) !== identity) throw Error(`실행 환경 불일치: ${path}`);
  if (summary.cases.length !== names.length || new Set(summary.cases.map(c => c.name)).size !== names.length)
    throw Error(`조건 수 불일치: ${path}`);
  for (const name of names) {
    const c = summary.cases.find(c => c.name === name);
    if (!c || metrics.some(k => !Number.isFinite(c[k]) || c[k] < 0)) throw Error(`측정값 누락: ${path}/${name}`);
    const r = raw.results.find(r => r.name === name);
    if (!r || r.requestedMs !== durationMs || !r.samples.tickMs.length || !r.lagTrace?.ticks.length)
      throw Error(`기간/활성 표본 불일치: ${path}/${name}`);
    const expected = { tickP95Ms: r.tickMs.p95, tickMaxMs: r.tickMs.max, loopMaxMs: r.eventLoopMs.max,
      tickIntervalMaxMs: Math.max(0, ...r.lagTrace.ticks.map(t => t.intervalMs)),
      ticksOver250ms: r.ticksOver250ms, healthErrors: r.healthErrors, wsErrors: r.wsErrors };
    if (Object.entries(expected).some(([k,v]) => c[k] !== v)) throw Error(`원자료/요약 불일치: ${path}/${name}`);
  }
  runs.push({ pair, version, commit: summary.commit, resultsSha256: hash, cases: summary.cases });
}
const median = values => { const v = [...values].sort((a,b) => a-b), m = Math.floor(v.length/2); return v.length%2 ? v[m] : (v[m-1]+v[m])/2; };
const cases = names.map(name => {
  const byVersion = version => runs.filter(r => r.version === version).map(r => r.cases.find(c => c.name === name));
  const before = byVersion('baseline'), after = byVersion('current');
  const comparison = Object.fromEntries(metrics.map(k => {
    const baseline = before.map(c => c[k]), current = after.map(c => c[k]);
    const deltas = current.map((v,i) => v-baseline[i]);
    return [k, { baseline, current, baselineMedian: median(baseline), currentMedian: median(current),
      pairDeltas: deltas, medianPairDelta: median(deltas), lowerPairs: deltas.filter(d=>d<0).length,
      higherPairs: deltas.filter(d=>d>0).length }];
  }));
  return { name, comparison, errors: Object.fromEntries(['baseline','current'].map(version => [version,
    Object.fromEntries(['ticksOver250ms','healthErrors','wsErrors'].map(k => [k, byVersion(version).map(c=>c[k])]))])) };
});
const result = { format: 1, refs, pairs, durationMs, order: Array.from({length:pairs}, (_,i) => i%2 ? ['current','baseline'] : ['baseline','current']),
  runtime: JSON.parse(runtime), scope: '같은 VM 순차 AB/BA 비교. 실행별 p95의 중앙값이며 전체 tick 통합 p95가 아니다. 짧은 소수 반복의 기술 통계로 유의성·인과관계를 단정하지 않는다.', cases, runs };
// 소수 반복의 기술 통계만 표시한다. 이 수치로 배포 판정을 자동화하지 않는다.
writeFileSync(`${root}/comparison.json`, JSON.stringify(result, null, 2) + '\n');
const ms = n => n.toFixed(2);
for (const c of cases) {
  console.log(`[compare] ${c.name}`);
  for (const [name, m] of Object.entries(c.comparison)) console.log(`[compare] ${name}: 중앙값 ${ms(m.baselineMedian)} -> ${ms(m.currentMedian)}ms, 쌍별 변화 ${m.pairDeltas.map(ms).join('/')}ms, 감소 ${m.lowerPairs}/${pairs}`);
  console.log(`[compare] errors=${JSON.stringify(c.errors)}`);
}
NODE
tar -czf "$compare_dir/gst-compare-results.tar.gz" -C "$compare_dir" comparison.json runs
echo "[compare] 결과 묶음: $compare_dir/gst-compare-results.tar.gz"
