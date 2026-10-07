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

현재 작업 우선순위 정리(2026-10-07): 호스팅 수동 두PC/외부회선/절전 시험은 사용자 결정으로 생략하며 필수 게이트로 요구하지 않는다. 미검증으로 기록. PR9(main 기준 AI 연구 초안)→PR10(PR9 기준 호스팅 초안) 의존 관계 유지, 병합/배포 미실행. AI 고도화는 아직 완료가 아니다. 기억/배정추론/수순탐색·독립리그는 구현, 탐색옵션은 기본OFF, 데이터 기반 가중치 자동학습·게임간 학습은 미구현. 다음 AI 재개 지점과 근거는 docs/AI_PROGRESS.md.

후속 ARM 콘솔395e761 수신: 고빈도 player 메인CPU5.48%·업로드600.56KiB/s, 이전 대비58.0/85.1% 감소 관측; 기본4방server/player2.24/3.54%로 부담 잔존. 18조건오류0 보고, 원자료 미수신. docs/evaluations/host-vm-memory-delta-console.json. WS/Worker 통합시험에 프레임 보류·ACK누락을 추가해 실제8초무응답 이전/미확정입력1회확정/구호스트지연프레임거절 확인. 실제외부회선/절전은 미검증. deploy/preview-player-host.sh와 docs/PLAYER_HOST_REMOTE_CHECK.md로 격리된 localhost 게스트서버+두PC SSH터널 시험 준비.

AI 기억 변경분 전송 완료: docs/PLAYER_HOST_MEMORY_DELTA.md. ACK 프레임 기준 순수 JSON 변경 적용·전체 기억 fallback·최근64관측 seq 이동 재사용, 정책/기억 유지. 같은1920프레임 복구 일치·고빈도 전송 JSON79.7–87.3% 감소, 호스트 인코딩 비용 증가. 역사적 인코더40프레임 대조, 네 모드 다음 행동/RNG/기억 일치, 실제 브라우저8검사 오류0. 원자료 코드해시 일치. 로컬 새15초6조건 main CPU server/player 기본4방2.42/3.30%, 고빈도4방10.36/4.94%, 업로드약631KiB/s; 무작위판1회로 인과/ARM결과 아님. 전체402테스트·타입·빌드 확인. 다음은 새SHA ARM 반복 진단, 외부회선/실제백그라운드/장기시험. 운영main/VM변경없음.

호스트 전송 구성 후속 로컬 진단: docs/PLAYER_HOST_TRANSPORT_FINDINGS.md, host-payload-audit.ts. 4모드×2activity×고정2시드 각120틱/1920프레임에서 추가분 로그/행동 복구 대조. 고빈도8조건 AI 기억92.4–95.4%/체크포인트, 그 기억 내부 battle.ambiguous 71.2–77.5%. 로컬 직렬화 구성이고 VM 실제프레임/CPU 병목을 직접측정한 것은 아님. 다음은 기억을 삭제하지 않고 ACK기준 변경분만전송하는 방식 검토/복구·실브라우저·새VM측정. 현재AI정책/지속기억/호스트프로토콜 변경없음.

VM 호스팅 ARM 사용자 콘솔 수신: source1c7e878, Node22.23.3 arm64, 30초×6조건×3회/ABBAAB, dirtySource=false·HTTP/host/process오류0 보고. 메인 CPU server/player 기본1방2.56/1.92%, 기본4방2.70/3.57%, 고빈도4방13.43/13.05%; player 확정p95 2.14/1.31/6.72ms, 업로드92.36/436.23/4033.64KiB/s. 기본4방/고빈도4방 메인RSS 증가, 전체CPU/안정성개선으로해석하지않음. 준비/설치는109패키지 캐시재사용으로완료, esbuild scripts경고 후18조건정상완료. docs/evaluations/host-vm-user-console.json 전사. 사용자VM압축경로 /tmp/gst-host-audit.gP9Ggh/gst-host-audit-results.tar.gz, 원자료 미수신이라 실행별값·해시·자식RSS 등 독립대조미완료. 운영main/VM업데이트없음.

VM 호스팅 반복 진단 준비: `deploy/audit-player-host.sh`, `docs/PLAYER_HOST_VM_AUDIT.md`. 같은 소스에서 server/player 3조건×기본3회(AB/BA/AB), 조건별30초로 약9분. 운영서비스·방화벽·비밀키를 읽거나 변경하지 않고 임시 체크아웃/임의 로컬 포트. 메인 CPU·프레임 확정·통신량에 RSS 250ms 표본(진단 드라이버 포함 메인/Worker 포함 자식 합)을 추가했고 비정상 자식 종료는 성공처리하지 않음. 결과는 커밋·소스해시·실행순서·환경·조건·기간·오류·CPU 계산·활성표본을 검증한 뒤 실행별 중앙값 집계, 압축은 원자료/요약/콘솔만. 새 집계 회귀12개 및 부모IPC끊김 시 실제호스트/Worker 정상종료 통합 회귀1개 추가, 전체382테스트(338+44). 로컬1.5초×6조건×3회/18조건 오류0·순서/해시/압축 구성 검증 완료, docs/evaluations/host-vm-runner-check.json 및 하위 폴더에 원자료 보존. 이 짧은 숫자는 성능 판단에 사용하지 않음. 기존15초 로컬 표는201d080 측정 당시 자료로 보존하며 드라이버 확장 후 새 성능결과로 해석하지 않음. 실제 Node22 ARM 반복 결과 및 최초다운로드/설치·원격회선/백그라운드 시험은 사용자 실행 대기. main/운영VM변경없음.

방장 호스팅 실브라우저 검증 및 전송 개선 완료: `feat/player-host-migration`, PR10(AI PR9 기준의 별도 초안), `docs/PLAYER_HOSTING.md`, `docs/PLAYER_HOSTING_VALIDATION.md`. Chromium153 headless 독립2프로필에서 실제 웹 빌드/Worker로 새로고침·탭 종료·자리 비움·전체 이탈 후 복구·채팅1회 확정·AI 관전자 호스팅7검사/오류0, 두 화면 캡처 검토. 전체369테스트(338+31)·타입·서버/클라이언트 빌드 통과. 초기 부하에서 전체 기록/AI 캐시 전송 및 서버의 Map/Set 복원 비용 발견, ACK 기준 로그/행동 기록 추가분 전송·파생 믿음 캐시 제외·AI 기억 JSON 보관·이전 때만 전체 체크포인트 생성으로 수정. 잘못된 기준 거절/전체 기록 이전 회귀2개 추가. 로컬6조건 CPU/통신량 원자료 전후 별도 보존; 매 조건 무작위 판1회라 동일 부하의 인과 효과나 VM 수용량으로 해석하지 않음. 직접WebRTC P2P는 미구현, 서버 중계/필터 의존·casual 신뢰호스트모델·서버재시작복구 미지원. VM ARM/실제 서로 다른 회선/모바일/백그라운드 제한/장기검증은 다음 단계. main/운영VM변경없음.

VM 반복 비교 실행기 준비 완료: `deploy/compare-bot-load.sh`, `docs/BOT_VM_AUDIT_RUNNER.md`. 고정 전2c48c255/후bf9ed3b6을 AB/BA/AB 세쌍 순차 측정(기본 약9분)해 실행별p95 중앙값·쌍별변화·오류를 집계하며 출처/해시/환경/원자료 일치 검증 실패시 중단한다. 로컬1.5초×3조건×6실행과5가지 변조 거절, 압축/순서/계산 대조·전체355테스트·타입·빌드 통과. 새 정책 변경없음. VM 새 반복 실측과 최초 다운로드 경로는 사용자 실행이 남음.

두 번째 VM 사용자 콘솔 수신: 각120틱, 기본1/4방·고빈도4방 틱p95 6.61/6.69/34.09ms, 최대10.73/19.27/75.78ms, 루프최대16.64/30.82/83.76ms, 처리250ms초과/HTTP/WS오류0. 고빈도는 개선됐지만 기본4방 증가, 최장고빈도 구간 scheduler wait28.41ms. 소스SHA 첫줄·압축 원자료는 미수신. 코드 효과 확정은 보류하고 반복 비교 진행. 원자료 위치 사용자출력 `/tmp/gst-audit.AIBAO1/gst-audit-results.tar.gz`.

정체 배정 DP 비용 개선 완료: `docs/BOT_BELIEF_OPTIMIZATION.md`. 양의 후보 비트만 순회하고 크기별 순수 조합표만 공유하며 유효 항 덧셈 순서·공표 가중치·관찰 경계를 유지했다. 차가운 배정 p95 약49–69% 감소, 기본 전체 정책 p95 약25–42% 감소(로컬 Node24 x64 합성). 비공개 확장 p95는 약4–6% 감소에 그쳤고 일부 최대값 증가를 보고했다. 확률/기억3000회·표본/RNG1000위치·전체 행동/기억4800회·내부수순800위치·전체대전320실행/10060행동 일치, 전체355테스트·타입·빌드 통과. 기본 옵션·main·운영릴리즈 그대로. 최신 변경의 VM 재측정이 다음 단계다.

VM 사용자 실행 요약 수신: Node22.23.3 arm64 기본1/4방·고빈도4방 틱p95 6.59/5.07/35.94ms, 최대10.93/10.78/82.03ms, 처리250ms초과/HTTP/WS오류0. 고빈도 루프최대90.77ms. CPU활동과 겹치며 throttling unknown. 사용자 콘솔만 확인했고 원자료압축/소스SHA 직접대조는 하지 않았다. 이전 “VM 실행대기”는 runner 준비 당시의 역사적 상태다. 새 최적화의 VM실측은 아직 없다.

VM 진단 실행 준비 완료: `docs/BOT_VM_AUDIT_RUNNER.md`, `deploy/audit-bot-load.sh`. sudo 없이 임시 체크아웃/임의 로컬 포트에서3조건 각30초 trace와 짧은 콘솔 요약/결과압축 제공. cgroup 미지원시 /proc 기록까지 버리던 호환 문제 수정, 본인v2경로/누락null 회귀2개 추가. 전체355테스트·타입·빌드 및Node24 x64 3조건 기능smoke·해시·압축 구성 확인. VM 직접접속도구없어실측은사용자실행대기, 운영서비스·릴리즈변경없음.

긴 이벤트루프 원인 추적 완료: `docs/BOT_SERVER_LAG_CAUSES.md`. 각30초 새 계측에서 기본4방145.47ms 간격 중 메인스레드 런큐 대기121.47ms/CPU0.08ms/GC0/throttling0 확인. 별도 기본1방은GC154.39ms, 고빈도는전체틱67.79ms와 겹침. 틱 실제 발화 간격도 기록(기본4방 최대328.38ms). 원래192.94ms는발생시각이없어단일원인소급확정불가. 별도CPU프로파일의큰게임함수computeAssignmentBelief 확인. 선택적trace와CPU/비CPU양성대조2회귀 추가, 전체353테스트·타입·빌드 통과. 정책·운영번들변경없음, VM실측/GC할당원인은미완료. PR9 반영.

실제 서버 부하 점검 완료: `docs/BOT_SERVER_LOAD_AUDIT.md`. 기본옵션 12봇1방/12봇씩4방/고빈도4방 각20초, 종료판은 새판으로 이어감. 틱 p95 4.30/6.45/35.67ms, 250ms 초과0·HTTP/WS 오류0. 기본4방 이벤트루프 최대192.94ms는 원인 미특정으로 남김. Node24 x64 로컬 자료이며 VM ARM·장기메모리·활성 실험수순·인간12연결은 범위 밖. 351테스트·타입·빌드 통과. PR9에 측정드라이버/원자료/VM 별도 측정 명령 반영, 운영 정책·릴리즈·VM은 유지.

조건부 거절 진단 완료: `docs/BOT_REJECTION_AUDIT.md`. 현재 정책 그대로 새 160판 전부 종료, 10,318회 시도 중 거절 14회(보석8·상급스캔4·전사감각2)는 전부 자기 뷰에 없는 비공개 룬 보호였다. 공개 보호/기타 오류·초반 공격 실패 0. 이 표본에서 예방 가능한 선택 오류는 발견하지 못해 정책은 변경하지 않았다. 전체 351 테스트·타입·빌드 통과, 진단 드라이버/원자료를 PR #9 초안에 반영. 운영 배포 대상 정책 변경 없음.

판단 지연 개선도 완료: `docs/BOT_LATENCY_OPTIMIZATION.md`. 이벤트 안의 역할 목록 반복 계산을 줄이고, 일회성 가설 상대 기억에서 사용하지 않는 전투 이력만 생략했다. 실제 봇의 지속 스킬/쿨다운 기억은 유지한다. 160조건(320회 실행)/10,328회 행동 기록·결과가 일치, 2,400회 정책/지속 기억과 800위치 내부 수순 반환값 일치. 동일 새 800위치 3회 로컬 측정에서 비공개·턴 직전 p95 51.53→29.97ms(약 42% 감소). 전체 351개 테스트·타입·빌드 통과. PR #9 초안에 반영하며 기본 탐색 false·운영 릴리즈·VM은 유지한다.

후속 독립 평가도 완료: `docs/BOT_POST_AUDIT_VALIDATION.md`. 수정 전 AI와 새 800판 50%(95% 49–51%), 운영 설정 AI와 별도 새 800판 53.125%(50.875–55.25%). 1,600판 전부 종료·초반 공격 실패 0. 운영 소스 기본 정책과 32조건/2,218회 행동 기록 일치. 로컬 합성 800위치 비용은 대체로 비슷하고 정체 비공개·턴 직전 p95 54.40ms, 최대 75.67ms의 꼬리 지연이 남는다. 정책은 `1b83ade`에 고정했고 기본 활성화·릴리즈·VM 반영은 하지 않았다.

후속 스킬의 자기 대상 선택과 가설 복원에서 비공개 효과의 공개 전환을 수정했다. 상세는 `docs/BOT_ERROR_AUDIT.md`, 재현/대전 원자료는 `docs/evaluations/sequence-error-audit.json`. 전체 348개 테스트와 빌드 통과. 이전 승률 자료는 수정 전 고정 정책의 역사적 결과다. 탐색 기본값과 운영 릴리즈는 그대로이며 PR #9 초안에 반영한다.
