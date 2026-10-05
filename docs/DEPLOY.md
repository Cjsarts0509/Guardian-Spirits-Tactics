# 배포 순서

`<도메인>` 은 실제 도메인(예: `gst.xyz`)으로 바꿔 읽는다.

## 전체 그림

```
브라우저 ── https://play.<도메인> ──▶ Cloudflare Workers (화면, main 에 push 하면 자동 배포)
   │
   └──── wss://ws.<도메인> ──▶ Cloudflare Tunnel ──▶ 오라클 서버 127.0.0.1:8787 (게임 서버)
                                                          │
                                                          └──▶ Supabase (판 기록)
```

- 게임 서버는 오라클 서버 안에서만 열린다. Cloudflare Tunnel 이 바깥쪽 연결을 대신 받아 준다.
  → 포트 개방·보안 목록·인증서가 필요 없고, 이미 돌고 있는 n8n 과 부딪히지 않는다.
- 게임 서버는 `/opt/gst/node` 에 전용 Node 를 따로 깔아 쓴다. 시스템 Node(n8n 이 쓰는 것)는 건드리지 않는다.
- 비밀값(터널 토큰, Supabase secret 키, SSH 개인키)은 서버나 GitHub 설정에 직접 넣는다. 채팅에 붙이지 않는다.

| 단계 | 하는 곳 | 시간 |
|---|---|---|
| 1. 도메인을 Cloudflare 에 연결 | Cloudflare, 도메인 구입처 | 10분 + 반영 대기 |
| 2. 터널 설치 | Cloudflare, 오라클 서버 | 10분 |
| 3. GitHub 배포 설정 | 오라클 서버, GitHub | 10분 |
| 4. 게임 서버 배포 | GitHub Actions | 3분 |
| 5. 화면 배포 | Cloudflare | 10분 |
| 6. 첫 판 테스트 | 브라우저 | — |

---

## 1. 도메인을 Cloudflare 에 연결

이미 Cloudflare 대시보드에서 도메인 상태가 **Active** 면 건너뛴다.

1. Cloudflare 대시보드 → 도메인 추가 → 도메인 입력 → **Free** 플랜
2. 안내되는 네임서버 2개를 도메인 구입처(.xyz 를 산 곳)의 네임서버 설정에 넣는다
3. 대시보드에서 상태가 **Active** 가 될 때까지 기다린다 (보통 몇 분~몇 시간)

## 2. 오라클 서버에 Cloudflare Tunnel 설치

먼저 서버에 이미 터널이 있는지 본다 (n8n 을 터널로 열어 뒀을 수도 있다):

```bash
uname -m; systemctl is-active cloudflared
```

- `active` 가 나오면 **새 터널을 만들지 말고** 대시보드의 기존 터널에 2-4 의 경로만 추가한다.
- `uname -m` 결과가 `aarch64` 면 arm64, `x86_64` 면 amd64.

1. Cloudflare 대시보드 → **Networking → Tunnels** → **Create Tunnel**
2. 이름: `gst` → 만들기
3. 운영체제 **Debian**, 아키텍처는 위 결과대로 고르면 설치 명령이 나온다. 서버에 그대로 붙여넣어 실행한다.
   (명령 안에 토큰이 들어 있다. 채팅이나 깃에 붙이지 말 것)
4. 터널 상태가 **Healthy** 가 되면 계속 → **Routes → Add route → Published application**
   - Hostname: `ws.<도메인>`
   - Service URL: `http://127.0.0.1:8787`
   - 이미 `ws` DNS 레코드가 있으면 충돌하니 먼저 지운다

확인: 아직 게임 서버가 없으니 브라우저에서 `https://ws.<도메인>/health` 를 열면 502 오류가 나는 게 정상.

## 3. GitHub 배포 설정 (한 번만)

### 3-1. 배포용 SSH 키 만들기 (오라클 서버에서)

```bash
ssh-keygen -t ed25519 -f ~/gst_deploy -N "" -C gst-deploy
cat ~/gst_deploy.pub >> ~/.ssh/authorized_keys
cat ~/gst_deploy
```

마지막 명령이 출력한 개인키 **전체** (`-----BEGIN OPENSSH PRIVATE KEY-----` 부터 `-----END OPENSSH PRIVATE KEY-----` 까지)를 복사해 두고, GitHub 에 넣은 뒤 서버에서 지운다:

```bash
rm ~/gst_deploy ~/gst_deploy.pub
```

### 3-2. Supabase 값 확인

- **Project URL**: `https://mnejsqmtgwosbjpnfgho.supabase.co`
- **Secret key**: Supabase → Project Settings → **API Keys** → Secret keys 의 `sb_secret_…` (없으면 새로 만든다)

### 3-3. GitHub 에 넣기

레포 → **Settings → Secrets and variables → Actions**

**Secrets** 탭 → New repository secret:

| 이름 | 값 |
|---|---|
| `ORACLE_HOST` | 오라클 서버 공인 IP |
| `ORACLE_USER` | SSH 사용자 (오라클 Ubuntu 이미지는 보통 `ubuntu`) |
| `ORACLE_SSH_KEY` | 3-1 에서 복사한 개인키 전체 |
| `SUPABASE_SECRET_KEY` | `sb_secret_…` |

**Variables** 탭 → New repository variable:

| 이름 | 값 |
|---|---|
| `GST_ALLOWED_ORIGINS` | `https://play.<도메인>` |
| `SUPABASE_URL` | `https://mnejsqmtgwosbjpnfgho.supabase.co` |

5단계에서 `*.workers.dev` 주소로 먼저 테스트하고 싶으면 `GST_ALLOWED_ORIGINS` 에 쉼표로 같이 넣는다:
`https://play.<도메인>,https://gst-client.<계정>.workers.dev`

> 오라클 VCN 보안 목록에서 SSH(22번)를 내 IP 로만 열어 뒀다면 GitHub 에서 접속하지 못한다. 그 경우 22번을 열거나 알려주면 다른 방식으로 바꾼다.

## 4. 게임 서버 배포

1. GitHub 레포 → **Actions** → 왼쪽 **Deploy server** → **Run workflow**
2. 끝에 `{"ok":true,...}` 와 `[install] 완료` 가 나오면 성공

이 작업이 하는 일: 테스트 → 서버 빌드 → 오라클 서버에 업로드 → `deploy/install.sh` 실행
(전용 Node 설치, `gst` 계정, `/opt/gst` 에 코드·설정, systemd 서비스 등록·재시작)

확인:
- 브라우저에서 `https://ws.<도메인>/health` → `{"ok":true,"rooms":0,"sessions":0}`
- 서버 로그 (오라클 서버에서): `sudo journalctl -u gst-server -f`

시작 로그에 `persist=true` 가 보이면 Supabase 기록이 켜진 것이다.

## 5. 화면 배포 (Cloudflare Workers)

1. Cloudflare 대시보드 → **Workers & Pages** → **Create** → 저장소 가져오기(Import a repository) → GitHub 연결 승인 → `Guardian-Spirits-Tactics` 선택
2. 설정 (메뉴 이름은 조금 다를 수 있음):

| 항목 | 값 |
|---|---|
| Project / Worker name | `gst-client` (레포의 `wrangler.jsonc` 이름과 같아야 함) |
| Build command | `pnpm --filter @gst/client build` |
| Deploy command | `npx wrangler deploy` |
| Root directory | 비워 둠 (레포 최상위) |
| Build variables | `VITE_SERVER_URL` = `wss://ws.<도메인>` |

3. 배포 → 끝나면 만들어진 Worker → **Settings → Domains & Routes → Add → Custom domain** → `play.<도메인>`

이후 main 에 push 하면 화면은 자동으로 다시 배포된다.

`VITE_SERVER_URL` 은 빌드할 때 화면 코드에 박히는 값이라 **런타임 변수가 아니라 빌드 변수**에 넣어야 한다. 바꾼 뒤에는 다시 배포해야 반영된다.

## 6. 첫 판 테스트

1. `https://play.<도메인>` → 닉네임 입장 → 방 만들기 → **봇 12인까지** → 시작
2. 친구는 같은 주소로 들어와서 방 목록에서 입장 (8명 이상이면 봇 없이도 시작 가능)
3. 판이 끝나면 Supabase → Table Editor → `matches` 에 한 줄, `match_players` 에 인원수만큼 생기는지 확인

## 문제가 생기면

| 증상 | 볼 곳 |
|---|---|
| 화면에 "서버 연결이 끊겼습니다" 가 계속 뜸 | `https://ws.<도메인>/health` 가 되는지 → 안 되면 터널 상태(Healthy)와 `systemctl status gst-server` |
| health 는 되는데 화면에서 접속 실패 | `GST_ALLOWED_ORIGINS` 에 화면 주소가 정확히 들어갔는지 (https 포함, 끝에 `/` 없음) → 고친 뒤 Deploy server 다시 실행 |
| 화면이 `ws://...:8787` 로 접속하려 함 | 5단계 빌드 변수 `VITE_SERVER_URL` 누락 → 넣고 다시 배포 |
| Deploy server 가 SSH 단계에서 실패 | `ORACLE_HOST`/`ORACLE_USER`/`ORACLE_SSH_KEY` 값, 보안 목록의 22번 포트 |
| 판이 끝나도 `matches` 가 비어 있음 | 서버 로그의 `[persist] 실패` 메시지, `SUPABASE_URL`/`SUPABASE_SECRET_KEY` |

로그는 오라클 서버에서 `sudo journalctl -u gst-server -n 100 --no-pager` 로 보고, 그대로 붙여주면 원인을 찾아 준다.

## 업데이트

- **화면**: main 에 push 하면 자동
- **게임 서버**: Actions → Deploy server → Run workflow. 진행 중인 판은 끊기니 아무도 안 할 때
- **서버 설정 변경** (`GST_ALLOWED_ORIGINS`, Supabase 값 등): GitHub Settings 에서 바꾸고 Deploy server 다시 실행. 서버의 `/opt/gst/.env` 는 배포할 때마다 GitHub 값으로 덮어써진다
