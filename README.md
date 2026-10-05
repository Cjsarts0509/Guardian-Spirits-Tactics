# gst-web — 가디언 스피리츠 택틱스 웹 리메이크

워크래프트3 유즈맵 **가디언 스피리츠 택틱스 v1.33**(4rum)을 웹게임으로 옮기는 모노레포.
규칙은 원본 맵 스크립트·오브젝트 데이터를 역분석한 명세(`docs/spec`)를 기준으로 하고, 원본 버그는 재현하지 않는다(`docs/spec/DECISIONS.md`).

현재 구현 범위: **왕자들의 내전** 규칙 엔진 전체 + 게임 서버 + 플레이테스트용 클라이언트.

## 구조

```
packages/rules      규칙 엔진 (순수 TS, 네트워크·DB 의존 없음) + 테스트 + 봇
packages/protocol   클라이언트↔서버 WebSocket 메시지 스키마 (zod)
apps/server         게임 서버 (권한 서버, ws). 방·재접속·봇 채우기·플레이어별 시점 전송
apps/client         플레이테스트 클라이언트 (React/Vite). 정식 UI는 DESIGN_MODERN 기준 별도 제작
supabase/migrations 프로필·판 기록·리플레이·신고 스키마
deploy/             Oracle VM 설정 스크립트, systemd 유닛, Caddyfile (초안)
docs/spec           역분석 명세 원본 (md/json) + source/ (복원 스크립트·오브젝트 데이터)
```

## 빠른 시작 (로컬)

```bash
corepack enable
pnpm install
pnpm test                 # 규칙 엔진 85개 + 서버 통합 4개
pnpm dev:server           # ws://localhost:8787
pnpm dev:client           # http://localhost:5173
```

브라우저에서 닉네임 입력 → 방 만들기 → **봇 12인까지** → 시작. 탭을 여러 개 열면 각각 다른 플레이어로 들어간다(탭마다 세션 분리).

봇만으로 대량 시뮬레이션:

```bash
pnpm sim -- 500           # 500판, 인원 8~12 순환
pnpm sim -- 200 12        # 12인 200판
```

## 규칙 엔진 개요 (`packages/rules`)

```ts
import { createGame, applyAction, advance, viewFor, eventsFor } from '@gst/rules';

const { state } = createGame({ mode: 'civil_war', players, seed, now: Date.now() });
applyAction(state, playerId, { type: 'skill', skill: 'attack', target, name: 'kai' }, Date.now());
advance(state, Date.now());            // 턴·해금·지연 효과 처리
viewFor(state, playerId);              // 그 플레이어가 알아도 되는 정보만
eventsFor(state, playerId, lastSeq);   // 그 플레이어가 볼 수 있는 새 이벤트
```

- 상태는 JSON 직렬화 가능한 객체 1개. 같은 시드 + 같은 입력 = 같은 결과 (리플레이 재현).
- 모든 이벤트에 `vis`(전체/특정 플레이어/사망자)가 붙고, 서버는 이걸로 걸러서 보낸다.
- 개인 확정 정보는 이벤트 `facts`로 같이 나온다 → 추리 보드 자동 체크용.
- 검증 실패(마나·쿨·대상·진명 조건 등)는 **비용 없이 거절** (`DECISIONS.md` A12).
- `test/data.spec.test.ts` 가 캐릭터·스킬 수치를 `docs/spec` 명세와 원본 오브젝트 데이터(`source/abilities.json`, `units.json`)에 직접 대조한다.

### 모드 추가 방법
`packages/rules/src/modes/<mode>.ts` 에 `ModeDef`(캐릭터·마스크·고유 스킬·승리 판정·보디가드)를 만들고 `modes/index.ts` 에 등록한다. 공통 스킬(공격/확인/스캔/보석 등)은 `skills/common.ts` 를 그대로 쓴다. 다음 순서 권장: 태초 → 황야 → 트롤 (`docs/spec/*.md`).

## 서버 (`apps/server`)

환경변수는 `apps/server/.env.example` 참고. 요약:

| 변수 | 기본 | 설명 |
|---|---|---|
| `PORT` | 8787 | |
| `ALLOW_GUESTS` | true | 로그인 없이 닉네임 입장 |
| `ALLOW_BOTS` | true | 방장이 봇으로 채우기 |
| `ALLOWED_ORIGINS` | (없음) | 운영 시 클라이언트 도메인만 허용 |
| `RECONNECT_GRACE_SECONDS` | 60 | 진행 중 끊긴 플레이어 사망 처리까지 유예 |
| `SUPABASE_URL` | — | 설정 시 JWKS로 로그인 토큰 검증 |
| `SUPABASE_SERVICE_ROLE_KEY` | — | 설정 시 판 종료 기록 저장 (서버 전용) |

빌드 결과물은 의존성까지 묶인 단일 파일: `pnpm --filter @gst/server build` → `apps/server/dist/index.js` (node 22 로 바로 실행).

## 배포 (초안 — 인프라 확정 후)

- **클라이언트**: Cloudflare Pages ← GitHub 연결. 빌드 명령 `pnpm install && pnpm --filter @gst/client build`, 출력 `apps/client/dist`, 환경변수 `VITE_SERVER_URL=wss://ws.<도메인>.xyz`
- **서버**: Oracle VM 에서 `sudo bash deploy/setup-oracle.sh` → `.env` 작성 → `server.mjs` 업로드. 이후 GitHub Actions `Deploy server`(수동 실행)로 갱신
- **DNS**: Cloudflare 에 도메인 연결, `game.` → Pages, `ws.` → Oracle 공인 IP (프록시 ON), SSL Full(strict) + Origin 인증서(`deploy/Caddyfile`)
- **Supabase**: `supabase/migrations/*.sql` 적용

## 문서
- `docs/spec/DECISIONS.md` — 원본과 달라지는 규칙(버그 수정)과 근거
- `docs/spec/DESIGN_MODERN.md` — 정식 UI 재설계안
- `docs/spec/PREWORK.md` — 사전작업 체크리스트
- `docs/spec/civil_war.md` 외 — 모드별 원본 규칙 명세
