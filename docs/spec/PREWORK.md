# 웹게임 제작 사전작업 & 아키텍처

보유 인프라: Oracle Cloud(Ubuntu), Supabase Pro, Cloudflare, .xyz 도메인, GitHub

---

## 1. 아키텍처

```
[브라우저] ──HTTPS──> Cloudflare Pages (game.도메인.xyz)  : React/Vite 정적 클라이언트
    │
    ├─WSS──> Cloudflare 프록시 ──> Oracle VM (ws.도메인.xyz)  : Node.js 게임 서버 (권한 서버)
    │                                   │
    └─HTTPS─> Supabase (Auth)           └── service_role ──> Supabase Postgres (전적·리플레이·신고)
```

| 구성요소 | 역할 | 이유 |
|---|---|---|
| **Oracle VM** | 게임 서버. 방 상태를 메모리에 들고 모든 판정·타이머를 서버에서 계산 | 추리 게임은 정체가 핵심 비밀이라 클라이언트에 상태를 주면 안 됨. 90초 턴·쿨다운·지연 결과(8초, 60초 등)도 서버 시계로 |
| **Cloudflare Pages** | 클라이언트 호스팅 | GitHub 푸시 시 자동 배포, 무료 |
| **Cloudflare DNS/Proxy** | 도메인, TLS, WebSocket 프록시, Oracle IP 숨김 | Cloudflare 프록시는 WebSocket 지원. 오리진은 Cloudflare IP만 허용 |
| **Supabase Auth** | 로그인 (Google/Discord/Kakao 등) | 클라이언트가 받은 JWT를 WS 접속 시 게임 서버가 검증 |
| **Supabase Postgres** | 유저 프로필, 전적, 판 기록(이벤트 로그), 신고/제재 | 게임 진행 중 상태는 DB에 안 씀. 판 종료 시 한 번 저장 |
| **GitHub** | 모노레포 + Actions (서버 SSH 배포, 규칙엔진 테스트) | |

**Supabase Realtime을 게임 상태 동기화에 쓰지 않는 이유**: 브로드캐스트 구조라 "플레이어별로 다른 정보"를 강제하기 어렵고, 서버 타이머 판정이 필요하다. 로비 목록 정도만 쓸 수 있으나 게임 서버가 같이 처리하는 게 단순.

### 서버 스택 제안
- Node.js 22 LTS + TypeScript, `ws` (또는 Colyseus — 방/재접속 기본 제공)
- 규칙 엔진은 **순수 함수 패키지로 분리**: `applyAction(state, action, now) → {state, events[]}`, `tick(state, now)`. 네트워크·DB 의존 없음 → 단위 테스트로 명세 검증
- 이벤트마다 `visibility`(all / players[] / side / self) 필드 → 서버가 플레이어별로 필터링해서 전송
- 프로세스 관리: systemd 또는 PM2, 리버스 프록시: Caddy(자동 TLS) 또는 Cloudflare Origin Certificate + nginx

### 레포 구조 제안
```
gst-web/
  packages/
    rules/        # 규칙 엔진 (spec JSON 로드, 판정 로직, 테스트)
    protocol/     # 클라↔서버 메시지 타입 (zod 스키마)
  apps/
    server/       # WS 게임 서버 (Oracle)
    client/       # React 클라이언트 (Cloudflare Pages)
  data/           # 이 패키지의 *.json (모드·캐릭터·스킬)
  supabase/       # migrations (profiles, matches, match_events, reports)
```

---

## 2. 사전작업 체크리스트

> 인프라 구성(1장, 2-3)은 검토 중 — 확정 전 초안

### 2-1. 기획·권리 (코드 짜기 전에)
- [x] **원작 권리**: 4rum 제작진 본인 프로젝트 — 캐릭터명·세계관 그대로 사용
- [ ] **원본 리소스 사용 불가**: 맵의 모델·아이콘·초상화는 블리자드 에셋 → 웹판 아트는 새로 제작 (캐릭터 48명분 초상화/아이콘, 스킬 아이콘 약 150개)
- [x] 버그 재현 안 함 (`DECISIONS.md` A~E 확정)
- [ ] `DECISIONS.md` G(의도 확인 6건) 결정
- [ ] 첫 출시 범위: **왕자들의 내전 단일 모드**로 시작 권장 (규칙이 가장 단순·완결적, 8~12인). 나머지 3개 모드는 같은 엔진에 데이터+고유 스킬만 추가

### 2-2. UX 설계 → `DESIGN_MODERN.md` 참고
- [ ] 대상 지정: 원본은 "유닛 클릭 → 이름 다이얼로그(6초)". 웹은 **플레이어 카드 선택 → 이름 선택 모달**로
- [ ] 정보 표시: 비공개 메시지 로그, 전체 로그, 동맹 채팅, 귓말(-숫자)
- [ ] 개인 메모 기능 (원본 u000 메모 유닛 A011~A014 대체 → 플레이어별 추측 메모판)
- [ ] 쿨다운·마나·턴 타이머·진실의 보석 단계 UI
- [ ] 모바일 대응 (12인 카드 + 스킬바 + 채팅을 한 화면)
- [ ] 사망자 관전 시 정보 범위 결정 (원본은 관전자 전환)

### 2-3. 인프라 준비
- [ ] **Oracle VM**: Ampere A1 인스턴스 생성(용량 부족 에러 시 재시도/다른 AD). Ubuntu 기본 iptables에 443 허용 규칙 추가 + VCN Security List 인바운드 443(가능하면 Cloudflare IP 대역만)
- [ ] 무료 인스턴스 유휴 회수 정책 확인 (CPU·네트워크·메모리 사용률 낮으면 회수 대상). Pay-As-You-Go 업그레이드 여부 결정
- [ ] **도메인 → Cloudflare 네임서버 이전**, 서브도메인 `game.`(Pages), `ws.`(Oracle, 프록시 ON), SSL 모드 Full(strict) + Origin Certificate
- [ ] **Supabase**: 프로젝트 생성(리전 서울), Auth 프로바이더 설정, 테이블 마이그레이션, service_role 키는 서버 환경변수에만
- [ ] **GitHub**: 레포, Actions 시크릿(SSH 키, Supabase 키), Pages 연결
- [ ] 서버 JWT 검증: Supabase JWT secret 또는 JWKS로 WS 핸드셰이크 시 검증

### 2-4. 개발 순서
1. `packages/rules` — core.json + civil_war.json 로드, 판정 함수, **명세 기반 단위 테스트** (각 md의 판정 순서를 테스트 케이스로)
2. 봇 플레이어(랜덤 행동)로 12인 자동 대전 시뮬레이션 → 예외·교착 탐지
3. WS 서버: 방 생성/입장, 방장 모드 선택(15초), 배정, 턴 루프, 이벤트 가시성 필터
4. 클라이언트: 로비 → 대기실 → 게임 화면
5. 재접속(같은 유저 ID면 슬롯 복귀, 일정 시간 미복귀 시 원본처럼 사망 처리), AFK
6. 판 종료 시 Supabase 저장(전적, 이벤트 로그 → 리플레이)
7. 나머지 모드 추가

### 2-5. 운영
- [ ] 채팅 필터·신고·차단 (전체채팅/귓말이 핵심 기능이라 필수)
- [ ] 서버 재시작 시 진행 중인 판 처리 방침 (메모리 상태라 날아감 → 배포는 빈 시간에, 또는 판 종료 대기 후 재시작)
- [ ] 로그/모니터링 (pm2 logs 또는 Grafana Cloud 무료)

---

## 3. 데이터 모델 초안 (Supabase)

```sql
create table profiles (id uuid primary key references auth.users, nickname text unique not null, created_at timestamptz default now());
create table matches (id uuid primary key default gen_random_uuid(), mode text not null, player_count int not null,
  winner_side text, started_at timestamptz, ended_at timestamptz, version text not null);
create table match_players (match_id uuid references matches on delete cascade, user_id uuid references profiles,
  slot int, character_key text, side text, died_at_sec int, won boolean, primary key (match_id, user_id));
create table match_events (match_id uuid references matches on delete cascade, seq int, t_ms int, payload jsonb,
  primary key (match_id, seq));
create table reports (id bigserial primary key, match_id uuid, reporter uuid, target uuid, reason text, created_at timestamptz default now());
```
RLS: 본인 전적 읽기, 종료된 판 공개 읽기, 쓰기는 서버(service_role)만.

---

## 4. 규모 감각
- 방 1개 = 8~12명, 초당 메시지 수 건 → Oracle A1 1 OCPU로 동시 수백 판 가능. 병목은 서버가 아니라 동시 접속자 모집.
- Supabase Pro 한도 내에서 판 기록 저장은 충분 (판당 이벤트 수백 건).
