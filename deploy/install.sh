#!/usr/bin/env bash
# 가택 게임 서버 설치·갱신 (여러 번 돌려도 안전). 오라클 서버에서 root 로 실행된다.
#   사용: sudo bash install.sh <파일 폴더>
#   폴더 내용: server.mjs (필수), gst-server.service (필수), gst.env (있으면 /opt/gst/.env 교체)
# 보통은 GitHub Actions "Deploy server" 가 파일을 올리고 이 스크립트를 실행한다.
set -euo pipefail

SRC="${1:-$(cd "$(dirname "$0")" && pwd)}"
GST_HOME="${GST_HOME:-/opt/gst}"
NODE_MAJOR=22
NODE_DIST="${NODE_DIST:-https://nodejs.org/dist/latest-v${NODE_MAJOR}.x}"

case "$(uname -m)" in
  x86_64) ARCH=x64 ;;
  aarch64 | arm64) ARCH=arm64 ;;
  *) echo "지원하지 않는 CPU: $(uname -m)" >&2; exit 1 ;;
esac

# 1) 서비스 계정·폴더
id gst >/dev/null 2>&1 || useradd --system --home "$GST_HOME" --shell /usr/sbin/nologin gst
install -d -o root -g root -m 755 "$GST_HOME"

# 2) 게임 서버 전용 Node — 시스템 node(n8n 등)와 분리해서 /opt/gst/node 에 둔다
if [[ ! -x "$GST_HOME/node/bin/node" ]] || [[ "$("$GST_HOME/node/bin/node" -v)" != v${NODE_MAJOR}.* ]]; then
  echo "[install] Node ${NODE_MAJOR} (${ARCH}) 내려받는 중"
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT
  curl -fsSL "$NODE_DIST/SHASUMS256.txt" -o "$tmp/SHASUMS256.txt"
  file="$(grep -oE "node-v${NODE_MAJOR}\.[0-9]+\.[0-9]+-linux-${ARCH}\.tar\.xz" "$tmp/SHASUMS256.txt" | head -n1)"
  [[ -n "$file" ]] || { echo "Node 배포 파일을 찾지 못함" >&2; exit 1; }
  curl -fsSL "$NODE_DIST/$file" -o "$tmp/$file"
  (cd "$tmp" && grep "  $file\$" SHASUMS256.txt | sha256sum -c --quiet -)
  rm -rf "$GST_HOME/node.new" && mkdir -p "$GST_HOME/node.new"
  tar -xJf "$tmp/$file" -C "$GST_HOME/node.new" --strip-components=1
  rm -rf "$GST_HOME/node" && mv "$GST_HOME/node.new" "$GST_HOME/node"
fi
echo "[install] node $("$GST_HOME/node/bin/node" -v)"

# 3) 서버 코드·설정 (.env 는 systemd 가 root 로 읽으므로 root 전용 600)
install -o root -g root -m 644 "$SRC/server.mjs" "$GST_HOME/server.mjs"
if [[ -f "$SRC/gst.env" ]]; then
  install -o root -g root -m 600 "$SRC/gst.env" "$GST_HOME/.env"
elif [[ ! -f "$GST_HOME/.env" ]]; then
  printf 'PORT=8787\nHOST=127.0.0.1\n' > "$GST_HOME/.env" && chmod 600 "$GST_HOME/.env"
fi
install -o root -g root -m 644 "$SRC/gst-server.service" /etc/systemd/system/gst-server.service

# 4) 재시작 + 상태 확인
[[ "${SKIP_SYSTEMD:-0}" == 1 ]] && { echo "[install] SKIP_SYSTEMD=1 — 서비스 재시작 생략"; exit 0; }
systemctl daemon-reload
systemctl enable gst-server >/dev/null 2>&1
systemctl restart gst-server
port="$(grep -E '^PORT=' "$GST_HOME/.env" | tail -n1 | cut -d= -f2)"
for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${port:-8787}/health"; then echo; echo "[install] 완료"; exit 0; fi
  sleep 0.5
done
echo "[install] 서버가 응답하지 않음. 최근 로그:" >&2
journalctl -u gst-server -n 40 --no-pager >&2
exit 1
