#!/usr/bin/env bash
# Oracle Cloud Ubuntu (22.04/24.04, ARM/x86) 게임 서버 초기 설정 — 초안
# 사용: sudo bash setup-oracle.sh
set -euo pipefail

# 1) Node.js 22
if ! command -v node >/dev/null || [[ "$(node -v)" != v22* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

# 2) Caddy (리버스 프록시 + TLS)
if ! command -v caddy >/dev/null; then
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl gnupg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update && apt-get install -y caddy
fi

# 3) 서비스 계정·디렉터리
id gst >/dev/null 2>&1 || useradd --system --home /opt/gst --shell /usr/sbin/nologin gst
install -d -o gst -g gst /opt/gst
[[ -f /opt/gst/.env ]] || install -o gst -g gst -m 600 /dev/null /opt/gst/.env

# 4) Oracle Ubuntu 이미지 기본 iptables 는 22번 외 인바운드를 REJECT 한다 → 80/443 허용
#    (VCN Security List 에도 TCP 80/443 인바운드 규칙 별도 추가 필요)
for port in 80 443; do
  iptables -C INPUT -p tcp --dport "$port" -j ACCEPT 2>/dev/null || iptables -I INPUT 5 -m state --state NEW -p tcp --dport "$port" -j ACCEPT
done
apt-get install -y iptables-persistent
netfilter-persistent save

# 5) systemd 유닛
install -m 644 "$(dirname "$0")/gst-server.service" /etc/systemd/system/gst-server.service
systemctl daemon-reload
systemctl enable gst-server

echo "완료. 다음:"
echo " - /opt/gst/.env 작성 (apps/server/.env.example 참고)"
echo " - /opt/gst/server.mjs 업로드 (pnpm --filter @gst/server build → apps/server/dist/index.js)"
echo " - /etc/caddy/Caddyfile, Cloudflare Origin 인증서 배치 후 systemctl reload caddy"
echo " - systemctl start gst-server && curl http://127.0.0.1:8787/health"
