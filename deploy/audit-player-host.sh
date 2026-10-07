#!/usr/bin/env bash
# 운영 서비스와 분리된 로컬 진단 서버. Node 호스트 어댑터이며 브라우저/WAN 시험은 아니다.
set -euo pipefail
[[ -f "${BASH_SOURCE[0]:-}" ]] || { echo '[host-audit] 실행기를 파일로 내려받은 뒤 bash로 실행하세요.' >&2; exit 1; }
if [[ -x /opt/gst/node/bin/node ]]; then export PATH="/opt/gst/node/bin:$PATH"; fi
for command in node git tar; do command -v "$command" >/dev/null || { echo "[host-audit] $command 필요" >&2; exit 1; }; done
node -e 'if (Number(process.versions.node.split(".")[0]) < 22) throw Error("Node 22 이상 필요")'
duration="${GST_HOST_AUDIT_DURATION_MS:-30000}"
runs="${GST_HOST_AUDIT_RUNS:-3}"
[[ "$duration" =~ ^[0-9]+$ ]] && (( duration >= 1000 && duration <= 120000 )) || { echo '[host-audit] 조건별 1000–120000ms 필요' >&2; exit 1; }
[[ "$runs" =~ ^[1-6]$ ]] || { echo '[host-audit] 반복 1–6회 필요' >&2; exit 1; }
ref="${GST_HOST_AUDIT_REF:-feat/player-host-migration}"
[[ "$ref" =~ ^[a-zA-Z0-9][a-zA-Z0-9./_-]*$ && "$ref" != *..* ]] || { echo '[host-audit] 잘못된 소스 ref' >&2; exit 1; }
audit_dir="$(mktemp -d /tmp/gst-host-audit.XXXXXX)"
trap 'echo "[host-audit] 파일 위치: $audit_dir" >&2' EXIT
if [[ -n "${GST_HOST_AUDIT_SOURCE:-}" ]]; then
  source_dir="$(cd "$GST_HOST_AUDIT_SOURCE" && pwd)"
else
  command -v npx >/dev/null || { echo '[host-audit] npx 필요' >&2; exit 1; }
  source_dir="$audit_dir/source"
  git init -q "$source_dir"
  git -C "$source_dir" fetch --quiet --depth 1 https://github.com/Cjsarts0509/Guardian-Spirits-Tactics.git "$ref"
  git -C "$source_dir" checkout --quiet --detach FETCH_HEAD
  (cd "$source_dir" && npx --yes pnpm@10.28.0 install --frozen-lockfile)
fi
source_commit="$(git -C "$source_dir" rev-parse HEAD)"
if [[ -n "${GST_HOST_AUDIT_SOURCE:-}" ]]; then expected_commit="$(git -C "$source_dir" rev-parse "$ref^{commit}")";
elif [[ "$ref" =~ ^[a-f0-9]{40}$ ]]; then expected_commit="$ref";
else expected_commit="$(git -C "$source_dir" rev-parse FETCH_HEAD)"; fi
[[ "$expected_commit" == "$source_commit" ]] || { echo '[host-audit] 소스 ref/HEAD 불일치' >&2; exit 1; }
[[ -z "$(git -C "$source_dir" status --porcelain --untracked-files=no)" ]] || { echo '[host-audit] 추적 소스가 수정됨' >&2; exit 1; }
export GST_HOST_AUDIT_OUTPUT="$audit_dir" GST_HOST_AUDIT_SOURCE="$source_dir" GST_HOST_AUDIT_COMMIT="$source_commit"
export GST_HOST_AUDIT_DURATION_MS="$duration" GST_HOST_AUDIT_RUNS="$runs"
GST_HOST_AUDIT_RUNNER_SHA256="$(node -e 'const fs=require("node:fs"),crypto=require("node:crypto");console.log(crypto.createHash("sha256").update(fs.readFileSync(process.argv[1])).digest("hex"))' "${BASH_SOURCE[0]}")"
export GST_HOST_AUDIT_RUNNER_SHA256
mkdir "$audit_dir/runs"
echo "[host-audit] 소스 $source_commit / $(node --version), $runs 회 ×6조건 ×${duration}ms (계측 약 $(( runs * 6 * duration / 1000 ))초)"
cd "$source_dir/apps/server"
for ((run=1;run<=runs;run++)); do
  order=server-first; if (( run % 2 == 0 )); then order=player-first; fi
  mkdir "$audit_dir/runs/$run"
  echo "[host-audit] run=$run order=$order"
  node --import tsx scripts/host-load-audit.ts "$duration" "$order" > "$audit_dir/runs/$run/results.json" 2> >(tee "$audit_dir/runs/$run/console.log" >&2)
done
[[ "$(git -C "$source_dir" rev-parse HEAD)" == "$source_commit" && -z "$(git -C "$source_dir" status --porcelain --untracked-files=no)" ]] || { echo '[host-audit] 실행 중 소스 변경됨' >&2; exit 1; }
node --import tsx scripts/host-audit-summary.ts
# 소스/의존성/운영 설정을 압축하지 않는다.
tar -czf "$audit_dir/gst-host-audit-results.tar.gz" -C "$audit_dir" summary.json runs
echo "[host-audit] 결과 묶음: $audit_dir/gst-host-audit-results.tar.gz"
