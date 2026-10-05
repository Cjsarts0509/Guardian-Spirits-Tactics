# 배포 순서 (도메인 없이, 오라클 서버 IP 로)

## 전체 그림

```
GitHub main 에 push ──▶ Actions "Release" 가 서버+화면을 빌드해서 릴리스 "latest" 에 올림 (자동)

오라클 서버 (SSH 로 한 줄 실행) ──▶ 최신 빌드를 받아 설치·재시작
                                  │
친구 브라우저 ── http://<서버IP>:8787 ──┘  화면과 게임 서버가 같은 주소
```

- 게임 서버가 화면까지 같이 준다. 주소 하나(`http://<서버IP>:8787`)로 끝.
- 게임 서버는 `/opt/gst` 에 따로 깔리고, 전용 Node(`/opt/gst/node`)를 쓴다. n8n 이 쓰는 시스템 Node 는 건드리지 않는다.
- GitHub 에 비밀값을 넣을 필요가 없다. Supabase secret 키는 서버 설정 파일에만 넣는다.

| 단계 | 하는 곳 | 한 번만? |
|---|---|---|
| 1. 오라클 보안 목록에 8787 포트 열기 | 오라클 클라우드 콘솔 | 한 번 |
| 2. 설치 | SSH | 한 번 (업데이트도 같은 명령) |
| 3. Supabase 기록 켜기 (선택) | SSH | 한 번 |
| 4. 첫 판 테스트 | 브라우저 | — |

---

## 1. 오라클 보안 목록에 8787 포트 열기

서버 자체 방화벽(iptables/ufw)은 2단계 설치 스크립트가 자동으로 연다. 오라클 클라우드 쪽 방화벽은 콘솔에서 직접 열어야 한다.

1. 오라클 클라우드 콘솔 → **Compute → Instances** → 해당 서버
2. **Primary VNIC** 의 **Subnet** 링크 → **Security Lists** (또는 Security 탭) → 쓰고 있는 목록 (보통 Default Security List)
3. **Add Ingress Rules**
   - Source CIDR: `0.0.0.0/0`
   - IP Protocol: `TCP`
   - Destination Port Range: `8787`
4. 저장

인스턴스에 **Network Security Group** 을 붙여 쓰고 있다면 같은 규칙을 그 NSG 에 넣는다.

## 2. 설치 (SSH 로 서버에 접속해서)

```bash
curl -fsSL https://raw.githubusercontent.com/Cjsarts0509/Guardian-Spirits-Tactics/main/deploy/bootstrap.sh | sudo bash
```

하는 일: 최신 빌드 내려받기(체크섬 확인) → 전용 Node 22 설치 → `gst` 계정·`/opt/gst` → 서버 방화벽 8787 허용 → systemd 서비스 등록·시작

끝에 이렇게 나오면 성공:

```
[install] 완료 — 버전 1a2b3c4 2026-10-05T12:00Z
[install] 접속 주소: http://<서버IP>:8787
```

확인 (서버에서):

```bash
systemctl status gst-server --no-pager
curl -s http://127.0.0.1:8787/health
```

## 3. Supabase 판 기록 켜기 (선택)

```bash
sudo nano /opt/gst/.env
```

맨 아래 두 줄의 `#` 를 지우고 값을 넣는다:

```
SUPABASE_URL=https://mnejsqmtgwosbjpnfgho.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
```

- secret 키 위치: Supabase → Project Settings → **API Keys** → Secret keys (없으면 새로 만든다)
- 이 키는 채팅·깃에 붙이지 않는다. 이 파일은 root 만 읽을 수 있다.

저장(Ctrl+O, Enter, Ctrl+X) 후:

```bash
sudo systemctl restart gst-server
sudo journalctl -u gst-server -n 5 --no-pager
```

시작 로그에 `persist=true` 가 보이면 켜진 것.

## 4. 첫 판 테스트

1. 브라우저에서 `http://<서버IP>:8787` → 닉네임 입장 → 방 만들기 → **봇 12인까지** → 시작
2. 친구는 같은 주소로 들어와서 방 목록에서 입장 (8명 이상이면 봇 없이 시작 가능)
3. 3단계를 했으면 판이 끝난 뒤 Supabase → Table Editor → `matches` 에 한 줄, `match_players` 에 인원수만큼 생기는지 확인

## 업데이트

1. 코드가 main 에 push 되면 GitHub **Actions → Release** 가 자동으로 돈다 (3분 정도). 초록 체크가 뜨면 준비 완료
2. 서버에서 2단계와 **같은 명령**을 다시 실행한다

```bash
curl -fsSL https://raw.githubusercontent.com/Cjsarts0509/Guardian-Spirits-Tactics/main/deploy/bootstrap.sh | sudo bash
```

- 설정 파일(`/opt/gst/.env`)은 그대로 유지된다
- 진행 중인 판은 재시작하면 끊기니 아무도 안 할 때

## 문제가 생기면

| 증상 | 볼 곳 |
|---|---|
| 브라우저에서 주소가 안 열림 | 1단계 보안 목록 8787 규칙 → 서버에서 `curl -s http://127.0.0.1:8787/health` 가 되는지 |
| 서버 안에서는 health 가 되는데 밖에서 안 됨 | 오라클 보안 목록/NSG. 서버 방화벽은 `sudo iptables -L INPUT -n --line-numbers \| grep 8787` 로 확인 |
| 화면에 "서버 연결이 끊겼습니다" 가 계속 뜸 | `systemctl status gst-server`, 로그 `sudo journalctl -u gst-server -n 100 --no-pager` |
| 설치 명령이 "최신 빌드 내려받는 중" 에서 실패 | GitHub **Actions → Release** 가 성공했는지 (실패했으면 알려줘) |
| 판이 끝나도 `matches` 가 비어 있음 | 로그의 `[persist] 실패` 메시지, `.env` 의 Supabase 두 값 |

로그를 그대로 붙여주면 원인을 찾아 준다.

## 알아둘 것

- 지금은 `http://` 라서 브라우저 주소창에 "주의 요함" 이 뜬다. 게스트 닉네임만 쓰는 플레이테스트에는 문제없지만, **로그인(Supabase Auth)을 붙일 때는 https 가 필요**하다 → 그때 도메인을 연결한다.
- 서버를 재부팅해도 게임 서버는 자동으로 다시 뜬다 (systemd).
- 삭제: `sudo systemctl disable --now gst-server && sudo rm -rf /opt/gst /etc/systemd/system/gst-server.service`

## 나중에 도메인을 쓸 때

Cloudflare Tunnel 로 `https://play.<도메인>` 하나만 이 서버(`http://127.0.0.1:8787`)에 연결하면 된다. 화면과 게임 서버가 같은 주소라 다른 설정은 필요 없다.

1. Cloudflare → **Networking → Tunnels** → 터널 만들기 → 나오는 설치 명령을 서버에서 실행
2. Routes → **Published application**: `play.<도메인>` → `http://127.0.0.1:8787`
3. `/opt/gst/.env` 에서 `HOST=127.0.0.1` 로 바꾸고 재시작 (IP 직접 접속 차단), 보안 목록의 8787 규칙 삭제

도메인을 다른 곳에서 이미 쓰고 있어도, DNS 가 이미 Cloudflare 에 있으면 `play` 같은 새 서브도메인을 추가하는 건 기존 사이트에 영향이 없다. DNS 가 다른 곳(도메인 구입처, Vercel 등)에 있으면 터널을 쓰려면 네임서버를 Cloudflare 로 옮겨야 하고, 그때 기존 레코드를 빠짐없이 옮기지 않으면 기존 사이트가 끊긴다 → 그 단계에서 같이 확인한다.
