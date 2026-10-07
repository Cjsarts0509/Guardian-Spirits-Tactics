#!/usr/bin/env bash
# 두 기기의 SSH 터널로 접속하는 임시 게스트 서버. 운영 서비스 설정은 사용하지 않는다.
set -euo pipefail
if [[ -x /opt/gst/node/bin/node ]]; then export PATH="/opt/gst/node/bin:$PATH"; fi
for tool in node git; do command -v "$tool" >/dev/null || { echo "[host-preview] $tool 필요" >&2; exit 1; }; done
node -e 'if (+process.versions.node.split(".")[0]<22) throw Error("Node22 이상 필요")'
ref="${GST_PREVIEW_REF:-395e761cb8313c2dc6c15e5efb535493eb2b1a10}"
port="${GST_PREVIEW_PORT:-18787}"
[[ "$ref" =~ ^[a-f0-9]{40}$ ]] || { echo '[host-preview] 전체 커밋 SHA 필요' >&2; exit 1; }
[[ "$port" =~ ^[0-9]{4,5}$ ]] && ((10#$port>=1024 && 10#$port<=65535)) || { echo '[host-preview] 포트 범위 1024–65535' >&2; exit 1; }
preview_dir="$(mktemp -d /tmp/gst-host-preview.XXXXXX)"
if [[ -n "${GST_PREVIEW_SOURCE:-}" ]]; then
  source_dir="$(cd "$GST_PREVIEW_SOURCE" && pwd)"
else
  command -v npx >/dev/null
  source_dir="$preview_dir/source"
  git init -q "$source_dir"
  git -C "$source_dir" fetch --quiet --depth 1 https://github.com/Cjsarts0509/Guardian-Spirits-Tactics.git "$ref"
  git -C "$source_dir" checkout --quiet --detach FETCH_HEAD
  (cd "$source_dir" && npx --yes pnpm@10.28.0 install --frozen-lockfile)
fi
[[ "$(git -C "$source_dir" rev-parse HEAD)" == "$ref" && -z "$(git -C "$source_dir" status --porcelain --untracked-files=no)" ]] || { echo '[host-preview] 소스 커밋/상태 불일치' >&2; exit 1; }
# 빌드에도 외부 VITE/Supabase 설정을 상속하지 않는다.
env -i PATH="$PATH" node --input-type=module - "$source_dir" <<'JS'
import {readFileSync} from 'node:fs';
import {execSync} from 'node:child_process';
import {join} from 'node:path';
const root=process.argv[2];
for(const part of ['apps/server','apps/client']) {
 const cwd=join(root,part),script=JSON.parse(readFileSync(join(cwd,'package.json'),'utf8')).scripts.build;
 execSync(script,{cwd,stdio:'inherit',env:{PATH:join(cwd,'node_modules/.bin')+':'+process.env.PATH}});
}
JS
printf '[host-preview] 소스 %s / 포트 %s / 로그 %s/server.log\n' "$ref" "$port" "$preview_dir"
printf '[host-preview] 각 PC에서 SSH 터널: ssh -N -L %s:127.0.0.1:%s ubuntu@<VM의 SSH 주소>\n' "$port" "$port"
printf '[host-preview] 각 PC 브라우저: http://127.0.0.1:%s / 종료 Ctrl+C\n' "$port"
cd "$source_dir"
env -i PATH="$PATH" HOST=127.0.0.1 PORT="$port" STRICT_ORIGIN=true ALLOW_GUESTS=true ALLOW_BOTS=true TIME_SCALE=1 STATIC_DIR="$source_dir/apps/client/dist" node apps/server/dist/index.js 2>&1 | tee "$preview_dir/server.log"
