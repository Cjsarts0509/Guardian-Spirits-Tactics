#!/usr/bin/env bash
# 오라클 서버에서 한 줄로 설치·업데이트 (최신 빌드를 GitHub 릴리스에서 받아 install.sh 실행):
#   curl -fsSL https://raw.githubusercontent.com/Cjsarts0509/Guardian-Spirits-Tactics/main/deploy/bootstrap.sh | sudo bash
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "sudo 로 실행하세요" >&2; exit 1; }
REPO="${GST_REPO:-Cjsarts0509/Guardian-Spirits-Tactics}"
BASE="${GST_RELEASE_URL:-https://github.com/$REPO/releases/download/latest}"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
echo "[bootstrap] 최신 빌드 내려받는 중"
curl -fsSL "$BASE/gst-release.tar.gz" -o "$tmp/gst-release.tar.gz"
curl -fsSL "$BASE/gst-release.tar.gz.sha256" -o "$tmp/gst-release.tar.gz.sha256"
(cd "$tmp" && sha256sum -c --quiet gst-release.tar.gz.sha256)
mkdir "$tmp/pkg"
tar -xzf "$tmp/gst-release.tar.gz" -C "$tmp/pkg"
echo "[bootstrap] 버전 $(cat "$tmp/pkg/VERSION" 2>/dev/null || echo '?')"
bash "$tmp/pkg/install.sh" "$tmp/pkg"
