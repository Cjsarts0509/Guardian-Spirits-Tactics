#!/usr/bin/env bash
# 가택 게임 서버 설치·갱신 (여러 번 돌려도 안전). 오라클 서버에서 root 로 실행된다.
#   보통은 deploy/bootstrap.sh 가 최신 빌드를 내려받아 이 스크립트를 실행한다.
#   직접 쓸 때: sudo bash install.sh <파일 폴더>
#   폴더 내용: server.mjs, gst-server.service (필수) / public/ (화면), VERSION, gst.env (선택)
#   gst.env 가 있으면 /opt/gst/.env 를 통째로 교체, 없으면 기존 .env 를 유지한다.
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

# 3) 서버 코드·화면·설정 (.env 는 systemd 가 root 로 읽으므로 root 전용 600)
install -o root -g root -m 644 "$SRC/server.mjs" "$GST_HOME/server.mjs"
if [[ -d "$SRC/public" ]]; then
  rm -rf "$GST_HOME/public.new"
  cp -r "$SRC/public" "$GST_HOME/public.new"
  chown -R root:root "$GST_HOME/public.new" && chmod -R u=rwX,go=rX "$GST_HOME/public.new"
  rm -rf "$GST_HOME/public" && mv "$GST_HOME/public.new" "$GST_HOME/public"
fi
[[ -f "$SRC/VERSION" ]] && install -o root -g root -m 644 "$SRC/VERSION" "$GST_HOME/VERSION"
if [[ -f "$SRC/gst.env" ]]; then
  install -o root -g root -m 600 "$SRC/gst.env" "$GST_HOME/.env"
elif [[ ! -f "$GST_HOME/.env" ]]; then
  # 첫 설치 기본값: 도메인 없이 http://<서버IP>:8787 로 화면 + 게임 서버를 같이 연다
  cat > "$GST_HOME/.env" <<ENV
PORT=8787
HOST=0.0.0.0
STATIC_DIR=$GST_HOME/public
RECORDS_DIR=$GST_HOME/records
STRICT_ORIGIN=true
ALLOW_GUESTS=true
ALLOW_BOTS=true
TIME_SCALE=1
# Supabase 판 기록 (선택). 값을 넣고 저장한 뒤: sudo systemctl restart gst-server
# SUPABASE_URL=
# SUPABASE_SECRET_KEY=
ENV
  chmod 600 "$GST_HOME/.env"
  echo "[install] 기본 설정 생성: $GST_HOME/.env"
fi
# 판 기록 폴더 (서버 프로세스가 쓴다). 기존 .env 에 RECORDS_DIR 이 없으면 추가
install -d -o gst -g gst -m 750 "$GST_HOME/records"
grep -qE '^RECORDS_DIR=' "$GST_HOME/.env" || echo "RECORDS_DIR=$GST_HOME/records" >> "$GST_HOME/.env"
install -o root -g root -m 644 "$SRC/gst-server.service" /etc/systemd/system/gst-server.service
envval() { grep -E "^$1=" "$GST_HOME/.env" | tail -n1 | cut -d= -f2-; }
port="$(envval PORT)"; port="${port:-8787}"
host="$(envval HOST)"; host="${host:-0.0.0.0}"

# 4) 서버 자체 방화벽 (오라클 Ubuntu 이미지는 22번 외 인바운드를 막아 둔다). 오라클 콘솔의 보안 목록은 따로 열어야 한다
if [[ "$host" == "0.0.0.0" && "${SKIP_FIREWALL:-0}" != 1 ]]; then
  if command -v ufw >/dev/null && ufw status 2>/dev/null | grep -q "Status: active"; then
    ufw allow "$port/tcp" >/dev/null && echo "[install] ufw: $port/tcp 허용"
  elif command -v iptables >/dev/null; then
    rule=(INPUT -p tcp --dport "$port" -m conntrack --ctstate NEW -j ACCEPT)
    if ! iptables -C "${rule[@]}" 2>/dev/null; then
      iptables -I "${rule[@]}"
      echo "[install] iptables: $port/tcp 허용"
      if command -v netfilter-persistent >/dev/null; then netfilter-persistent save >/dev/null 2>&1 || true
      elif [[ -d /etc/iptables ]]; then iptables-save > /etc/iptables/rules.v4; fi
    fi
  fi
fi

# 5) 재시작 + 상태 확인
[[ "${SKIP_SYSTEMD:-0}" == 1 ]] && { echo "[install] SKIP_SYSTEMD=1 — 서비스 재시작 생략"; exit 0; }
systemctl daemon-reload
systemctl enable gst-server >/dev/null 2>&1
systemctl restart gst-server
for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${port}/health" >/dev/null 2>&1; then
    echo "[install] 완료 — 버전 $(cat "$GST_HOME/VERSION" 2>/dev/null || echo '?')"
    if [[ "$host" == "0.0.0.0" ]]; then
      ip="$(curl -fsS -m 5 https://checkip.amazonaws.com 2>/dev/null || true)"
      echo "[install] 접속 주소: http://${ip:-<서버 공인 IP>}:${port}"
    fi
    exit 0
  fi
  sleep 0.5
done
echo "[install] 서버가 응답하지 않음. 최근 로그:" >&2
journalctl -u gst-server -n 40 --no-pager >&2
exit 1
