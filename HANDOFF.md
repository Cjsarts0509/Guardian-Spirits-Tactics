# HANDOFF — 가디언 스피리츠 택틱스 웹 리메이크 (세션 인계 문서)

새 세션은 이 파일 → `CLAUDE.md` → `docs/spec/DECISIONS.md` 순서로 읽으면 바로 이어서 작업할 수 있다.
최종 갱신: 2026-10-06 · 기준 커밋: 이 파일을 추가한 커밋 (`git log -1 -- HANDOFF.md`)

---

## 0. 한 줄 요약

워크래프트3 유즈맵 **가디언 스피리츠 택틱스 v1.33**(4rum)을 웹 실시간 멀티플레이 게임으로 리메이크. 4개 모드 규칙 엔진·권한 서버·클라이언트·봇·배포·로그인·BGM·아트까지 동작하는 상태로 운영 중. 다음 큰 작업은 **카드형 정식 UI(아트 대기 중)** 와 **봇 AI 고도화(믿음 엔진)**.

| 항목 | 값 |
|---|---|
| 저장소 | https://github.com/Cjsarts0509/Guardian-Spirits-Tactics (public) |
| 운영 주소 | http://168.110.104.214:8787 (오라클 ARM 서버 `bookpulse-arm-2`, 도메인 없음) |
| 운영자 | 4rumarts (4rumarts@gmail.com) — 원작 4rum 제작진 |
| Supabase | 프로젝트 `mnejsqmtgwosbjpnfgho` (사용자의 별도 계정 — MCP 로는 접근 불가, SQL 은 사용자가 대시보드에서 실행) |
| 건드리면 안 되는 것 | Supabase `owakkzcksskilgzamvnq` (사용자의 다른 운영 서비스 벼리/WBS) |

---

## 1. 저장소 구조

```
packages/rules      규칙 엔진 (순수 TS, 결정적·시드 기반). 4개 모드, 봇, 테스트 190개
packages/protocol   클라↔서버 WebSocket 메시지 (zod)
apps/server         권한 서버 (ws + 정적 파일). 방·재접속·자리비움·봇 대행·판 기록. 테스트 19개
apps/client         React/Vite 클라이언트 (현재 플레이테스트 UI, 카드형 정식 UI 로 교체 예정)
supabase/migrations 프로필·판 기록·이벤트·채팅·신고 스키마 (RLS)
deploy/             bootstrap.sh(한 줄 설치) · install.sh · systemd 유닛
tools/              아트·오디오 파이프라인 스크립트
docs/spec           원본 역분석 명세(md/json) + DECISIONS(웹판 결정) + source/(복원 스크립트·오브젝트 데이터)
docs/art            Gemini 프롬프트 가이드 3종, 아이콘 매니페스트, 원작 설정
.github/workflows   CI(타입체크·테스트·빌드) / Release(main push → GitHub 릴리스 latest 에 서버+화면 tar.gz)
```

명령:
```bash
corepack enable && pnpm install
pnpm typecheck && pnpm test
pnpm dev:server            # ws://localhost:8787
pnpm dev:client            # http://localhost:5173
pnpm --filter @gst/rules exec tsx scripts/simulate.ts 300 0 smart troll   # 봇 시뮬 (판수 인원 smart|random 모드)
```

---

## 2. 규칙 엔진 (`packages/rules`)

### 핵심 개념
- **상태(GameState)** 는 순수 데이터, `Game` 클래스가 조작 헬퍼. 모든 시간은 ms, 시드 RNG → 리플레이 재현.
- `createGame` → `applyAction(state, playerId, action, now)` → `advance(state, now)` (예약 작업 큐: 턴·해금·효과 종료·지연 공개·모드 작업).
- **이벤트**: `g.toAll / g.toPlayer / g.toPlayers` → `vis` 로 수신자 지정. `eventsFor(state, id)` 가 그 사람이 볼 수 있는 것만 돌려줌.
- **facts**: 비공개 이벤트에 붙는 확정 제약 `{player, character|null, not?, oneOf?, commander?}`. 변장 가능한 성공은 `oneOf` 후보로 표현하고, 구별 불가능한 공격 실패 원인은 보내지 않는다.
- **뷰**: `viewFor(state, id)` = 내 시점(남의 정체·마나·슬롯 없음). `spectatorView` 는 AI 전용 판 관전자만.
- **공격 판정** (`engine/attack.ts`): 이름 틀림 → 실패 / `isAbsolutelyGuarded`(절대 보디가드) → 실패 / `chargedGuard`(횟수제 보디가드·블러디 매드니스) → 막힘 / 목숨 감소 / 살해. 상급 공격은 1회 유예, 최상급은 페널티 없음.
- **확인·스캔** (`engine/checks.ts`): 변장(`disguises`)·하이드(`hiddenFromChecks`)·`beforeEnemyCheck`(미명의 안개) 훅.
- **스킬 정의** (`modes/types.ts` `SkillDef`): mana/cooldown/uses/target(`none|player|player+name`)/`precheck`/`resolve`/`nameOptions`/`passive`. `precheck` 는 뷰 계산 때 **target=null 로도 호출** — 대상 조건은 null 이면 통과시킬 것.
- **ModeDef 훅**: `checkVictory`, `isAbsolutelyGuarded`, `chargedGuard`, `onAttackKill`, `onTask`, `onStart`(시작 동맹), `beforeEnemyCheck`, `scanExcludes`, `globalChat{characters,mana,anonymous}`, `masks`(인원별 슬롯), 캐릭터별 `unlocks[{at, skill, requires?, replaces?}]`, `skillCodes`(원본 어빌리티 코드 추적).

### 모드 (모두 구현·테스트 완료)
| 모드 | 파일 | 진영 | 특징 |
|---|---|---|---|
| 왕자들의 내전 | civil_war.ts | 단테스 / 카이 | 후계자, 변장, 백스탭·연쇄살인, 아린·켈후 보디가드 |
| 태초의 전쟁 | primordial.ts | 지상 연합 / 다크니스 | 2회 방어 보디가드, 리더쉽, 카사노바, 컨슘 진화, 익명 전체채팅 |
| 리델루트 황야 | lidellut.ts | 다크니스 / 가디언 | 합류·전략 포인트·매스 텔레포트, 기사도·천사의 세례(기사당 1회, 수프라 목숨 상한 3), 위대한 의지 특수 승리 |
| 트롤 부족의 반란 | troll.ts | 얼음 부족 / 트롤 반란자 | 보디가드 OR(사토시·즈윈라), 하이드, 블러디 매드니스, 위장, 혼돈/정화의 주술, 무모한 돌진·족장 보호, 시작 동맹 |

명세와의 일치는 `test/modes.data.test.ts` 가 `docs/spec/*.json` + 원본 오브젝트(`source/abilities.json`, `units.json`)로 자동 검증. 웹판 의도적 변경은 `WEB_OVERRIDES`·`BASE_DEFAULTS` 표.

### 봇 (`src/bot.ts`)
- `randomBotAction`: 퍼즈 테스트용.
- `bot-memory.ts`: 플레이어별 관찰 기억, seq 기반 증분 갱신, 후보 1개일 때 정체 추론, 공격 실패 이력. 갱신 입력은 자기 뷰와 수신 가능한 이벤트뿐이다. 서버·시뮬레이터도 봇별 난수·기억을 분리한다.
- `smartBotAction`: **자기가 정당하게 아는 것만** 사용(`botKnowledge` = facts + 공개 정체 → 후보 소거). 모드별 표(`GUARDS`, `NEEDS_COMMON/NEEDS_MODE`, `PROBES`, `EXECUTES`, `SUICIDES`, `DISRUPT`, `INFO`, `SUPPORT`, `SELF_SKILLS`, `PRECIOUS`)로 규칙 기반 판단, 시간 지날수록 추측 공격 범위 확대.
- 지표(기반 정비 후 각 300판): 내전 158/142·10.3분 / 태초 171/129·12.7분 / 황야 139/161·9.2분 / 트롤 87/212·12분(미종료 1판, seed 1201). 초반 4분 공격 실패 0건. 상세와 남은 정체 사례: `docs/BOT_FOUNDATION.md`.
- 테스트: `bot.test.ts`(4모드 80판 완주·거절률<2%·초반 자살 0·지식 정당성), `leak.test.ts`(공개 data 로 미공개 정체 추론 불가).

### 정보 은닉 원칙 (중요)
- 서버는 각자에게 **내 시점 뷰 + 내가 볼 수 있는 이벤트만** 보낸다. 공개 이벤트 `data` 에 "플레이어 id + 미공개 정체"를 같이 넣지 말 것 (leak.test 가 잡음).
- 시전자 정보가 비공개인 스킬은 공개 이벤트에 `source`/actor id 를 넣지 말 것.
- 봇/LLM 에는 `botKnowledge`·자기 뷰만 넣는다. 서버 상태 직접 참조 금지.

---

## 3. 서버 (`apps/server`)

- `server.ts`: HTTP(`/health`, `/config.json`, 정적 파일) + WS. hello(게스트 닉네임 / Supabase 토큰 / resume 세션) → welcome. 메시지 레이트 리밋, ping/pong 하트비트, `STRICT_ORIGIN`.
- `rooms.ts`: 방 생명주기. **시작 시 8명 미만이면 봇 자동 충원**. 나가기 `mode: away`(자리 유지·봇 대행·재입장 가능) / `quit`(사망·명단 제거). 연결 끊김 유예(`RECONNECT_GRACE_SECONDS`, 기본 60) 후 사망 대신 봇 대행. 모든 행동 기록(`actions`).
- `records.ts`: 판 종료 시 `RECORDS_DIR/<YYYY-MM>/<시작시각>_<모드>_<방>.json` (설정·참가자·봇 여부·**모든 행동(거절 포함)**·전체 이벤트·최종 상태) — **AI 개량용 데이터**.
- `persist.ts`: Supabase 에 matches / match_players / match_events / match_chat 저장 (비밀 키 있을 때).
- `auth.ts`: Supabase JWKS 로 토큰 검증 (`auth=jwks`).
- `config.ts` 환경변수: `PORT HOST STATIC_DIR STRICT_ORIGIN ALLOW_GUESTS ALLOW_BOTS TIME_SCALE TICK_MS BOT_ACTIVITY BOT_KIND RECONNECT_GRACE_SECONDS HEARTBEAT_MS RECORDS_DIR SUPABASE_URL SUPABASE_SECRET_KEY SUPABASE_PUBLISHABLE_KEY`.

---

## 4. 클라이언트 (`apps/client/src`)

| 파일 | 역할 |
|---|---|
| App.tsx | 라우팅(메인→로비→방→게임), 서버 메시지 처리, BGM 곡 전환 |
| Welcome.tsx | 메인: 키 비주얼 + 로고 + 게스트/로그인/가입 탭 |
| auth.ts | Supabase GoTrue REST 직접 호출 (가입·로그인·갱신·로그아웃·profiles 보장) |
| net.ts | WS 연결·자동 재접속·세션 토큰(localStorage — 탭 닫아도 복귀)·액세스 토큰 공급자 |
| Lobby.tsx | 방 목록(재입장 표시)·방 만들기·방 패널(봇·게임 시작·AI 관전) |
| Game.tsx | 게임 화면: 내 정보 / 채팅(채팅만) + 알림 카드 / 플레이어 카드(메모·추리) + 스킬 카드(단축키 QWE/ASD/ZXC…) / 나가기 모달 / 관전 화면 |
| Feed.tsx | 알림 카드: 공개 행동 탭 / 내 정보(비공개 결과) 탭 |
| RoleReveal.tsx | 시작 시 역할 배분 연출 (방당 1회) |
| fx.ts | 이벤트 → 화면 효과 (카드 위 아이콘 5초, 라벨 4.5초, 사망·살해 중앙 대형 배너 8초) |
| bgm.ts / BgmControl.tsx | Web Audio 무한 반복·크로스페이드·볼륨 저장 |
| icons.ts / icons.gen.ts | 아이콘 경로, 캐릭터·스킬 별칭, 리마스터 목록(GEN_ONLY) |
| Logo.tsx | BigLogo(메인 워드마크) / SmallLogo / SubLogo |

정적 자산: `public/icons/{128,256}/*.webp`(186종, 87 리마스터 + 99 원본 대체), `public/bgm/*.mp3`(메인+모드 4곡), `public/art/`(키 비주얼·워드마크·서브 엠블럼·파비콘).

---

## 5. 배포·운영

- main 에 push → GitHub Actions `Release` 가 `latest` 릴리스에 빌드 업로드.
- 서버 업데이트(설치도 같은 명령):
  ```bash
  curl -fsSL https://raw.githubusercontent.com/Cjsarts0509/Guardian-Spirits-Tactics/main/deploy/bootstrap.sh | sudo bash
  ```
- 설정: `/opt/gst/.env` (root 600, systemd 가 읽음). 판 기록: `/opt/gst/records`. 로그: `sudo journalctl -u gst-server -n 30 --no-pager`.
- 현재 운영 서버 `.env` 에 SUPABASE_URL / SECRET_KEY / PUBLISHABLE_KEY 설정됨 (`auth=jwks persist=true` 확인). 키 값은 서버에만 있음 — **채팅·깃·클라이언트에 비밀 키를 절대 넣지 않는다.**
- Supabase 쪽 남은 설정: Authentication → Email → **Confirm email 끄기** (사용자가 하기로 함, 미확인).
- 상세: `docs/DEPLOY.md`.

---

## 6. 아트·오디오 파이프라인

| 단계 | 도구 | 비고 |
|---|---|---|
| 스킬 아이콘 1차(87) | Gemini 시트 S1~S5, C1~C7 → `tools/split_sheets.py` → `tools/build_web_icons.py` | 완료·적용 |
| 스킬 아이콘 2차(81) | `docs/art/GEMINI_가이드_2차.md` S6~S14 | **사용자 생성 대기**. 같은 개념 15종은 `skill_icon_aliases.json` 로 공유 |
| UI 아트(89) | `docs/art/GEMINI_UI_가이드.md` U1~U7, P1~P7 → `tools/split_ui_sheets.py` → `apps/client/public/ui/` | **사용자 생성 대기**. 프레임은 비워서(마젠타 창) 생성 |
| 키 비주얼·로고 | `tools/build_key_visual.py`, `tools/build_logo.py` | 적용 완료 (단테스 vs 카이 회의장, 메인/서브 엠블럼) |
| BGM | `tools/build_bgm.sh <id> <원곡>` (무음 제거·-16 LUFS·페이드·MP3 128k) | 메인+4모드 적용. **AAC 쓰지 말 것**(오픈소스 Chromium 디코드 불가) |
| 승패 BGM 8곡 | 프롬프트 제공됨 (`<mode>_win/_lose`) | **사용자 생성 대기**. 결과 화면 재생 로직 미구현 |

원칙: 원본 블리자드/외부 아트를 Gemini 입력으로 넣지 않는다(파생물 위험). 텍스트 컨셉 + 우리 확정본만 레퍼런스.
원본 분석 자료·시트 원본은 저장소 밖(인계 패키지 `gst_handoff_assets.zip`) — 맵 원본은 공개 저장소에 올리지 않는다.

---

## 7. 결정 사항 (요약 — 전체는 docs/spec/DECISIONS.md)

- 원본 버그는 재현하지 않는다. 의도 판단 근거: 코드 명시 분기 > 퀘스트·툴팁·오브젝트 > 위키.
- 수치는 실제 플레이된 값(오브젝트·코드). 미확정 수치 0건 (베이스 어빌리티 기본값으로 확정).
- 조건 미달 스킬은 서버 사전 검증으로 소모 없이 거절 (A12).
- 트롤 보디가드는 OR(G1), 인원 부족으로 빠진 슬롯은 승리 판정에서 사망 취급(G2), 세례 기사당 1회(A8), 마나 보너스는 적 대상만(A9).

---

## 8. 진행 중 / 다음 할 일 (우선순위)

1. **카드형 정식 UI** — UI 아트 시트(U1~U7, P1~P7)가 오면: `split_ui_sheets.py` 로 자르고
   - 스킬: 세로 5:7 카드 (그림 창=스킬 아이콘, 이름 띠, 설명칸, 좌상단 마나·우상단 쿨다운·하단 횟수). 계열 분류: 기본/정보/관계/살해/제압/보호/패시브/1회.
   - 플레이어: 미확인 = 모드별 카드 뒷면 → 확인·공개 시 진영 프레임 + 반신상(지휘관은 지휘관 프레임). 선택 = 선택 테두리.
   - 로비 모드 선택 = 모드 카드, 로그인 = 로그인 패널, 패널·모달·버튼·입력 = UI 키트 9-slice.
2. **스킬 아이콘 2차** 시트(S6~S14) 오면 `split_sheets.py` + `build_web_icons.py`.
3. **봇 AI 고도화** (관찰 오류 수정·봇별 증분 기억 기반 정비 완료, 확률 믿음 엔진은 다음 단계):
   - 1단계 믿음 엔진: 확정 사실에 맞는 배정 샘플링(파티클) + 판 기록에서 학습한 약한 증거(공표 성향·동맹·확인 대상 선택) 가중치. Brier 점수로 보정 측정.
   - 2단계 결정화 시뮬레이션(ISMCTS류): 믿음에서 세계 30~50개 샘플 → 현 봇을 롤아웃 정책으로 행동별 승률. 워커 스레드.
   - 3단계 공표 전략만 작게 추상화해서 regret matching(CFR 경량)으로 블러핑 비율 학습.
   - 4단계 채팅(CICERO 구조): LLM 으로 사람 채팅 → 구조화 주장, 의도 → 문장 생성. 봇은 자기 지식만 입력(누출 테스트 필수).
   - 공통: 봇 버전 리그·Elo, 회귀 기준(초반 자살 0, 판 길이, 진영 밸런스). 참고 자료: CICERO(Science 2022), AIWolf, Hoodwinked, Avalon-LLM.
4. 승패 BGM 8곡 적용 + 결과 화면(내 진영 기준 승/패 곡, 끝나면 메인 테마).
5. 트롤 밸런스(봇 기준 반란 65%) — 사람 플레이 데이터 보고 판단.
6. 비밀번호 재설정(외부 SMTP 필요), 도메인/HTTPS(나중에 Cloudflare Tunnel 권장).

---

## 9. 작업 규칙 (사용자 선호)

- 한국어, 간결하게. 명령은 복사해서 바로 실행 가능한 완전한 형태로.
- 데이터로 검증한 구현만 (추측으로 데이터 구조 가정 금지) — 명세·원본 오브젝트와 자동 대조 테스트 유지.
- 파일을 줄 땐 일부가 아니라 전체 세트로.
- 커밋: `git -c user.name=4rumarts -c user.email=4rumarts@gmail.com commit`, 메시지 끝에 세션 지시의 Co-Authored-By / Claude-Session 줄.
- 변경 후: `pnpm typecheck && pnpm test`, UI 변경은 Playwright 스크린샷으로 확인(Chromium: `/opt/pw-browsers/chromium`).
# 최근 AI 오류 점검

후속 독립 평가도 완료: `docs/BOT_POST_AUDIT_VALIDATION.md`. 수정 전 AI와 새 800판 50%(95% 49–51%), 운영 설정 AI와 별도 새 800판 53.125%(50.875–55.25%). 1,600판 전부 종료·초반 공격 실패 0. 운영 소스 기본 정책과 32조건/2,218회 행동 기록 일치. 로컬 합성 800위치 비용은 대체로 비슷하고 정체 비공개·턴 직전 p95 54.40ms, 최대 75.67ms의 꼬리 지연이 남는다. 정책은 `1b83ade`에 고정했고 기본 활성화·릴리즈·VM 반영은 하지 않았다.

후속 스킬의 자기 대상 선택과 가설 복원에서 비공개 효과의 공개 전환을 수정했다. 상세는 `docs/BOT_ERROR_AUDIT.md`, 재현/대전 원자료는 `docs/evaluations/sequence-error-audit.json`. 전체 348개 테스트와 빌드 통과. 이전 승률 자료는 수정 전 고정 정책의 역사적 결과다. 탐색 기본값과 운영 릴리즈는 그대로이며 PR #9 초안에 반영한다.
