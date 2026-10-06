# CLAUDE.md — 이 저장소에서 작업할 때

먼저 `HANDOFF.md`(현재 상태·구조·다음 할 일)를 읽는다.

## 필수 규칙
- 응답은 한국어, 간결하게. 명령은 그대로 복사해 실행 가능한 형태.
- 규칙 엔진 변경은 명세(`docs/spec/*.md|json`)와 `docs/spec/DECISIONS.md` 기준. 원본 버그는 재현하지 않는다.
- 정보 은닉: 공개 이벤트 data 에 미공개 정체를 넣지 않는다. 봇·LLM 에는 `botKnowledge`/자기 뷰만. `test/leak.test.ts` 통과 필수.
- `SkillDef.precheck` 는 target=null 로도 호출된다 (뷰의 사용 불가 사유 계산).
- 비밀 키(`SUPABASE_SECRET_KEY`)는 서버 `/opt/gst/.env` 에만. 클라·깃·채팅 금지. Supabase `owakkzcksskilgzamvnq` 는 건드리지 않는다.
- 원본 맵·블리자드 아트를 공개 저장소에 올리거나 이미지 생성 입력으로 쓰지 않는다.
- 오디오는 MP3 (AAC 금지 — 오픈소스 Chromium 디코드 불가).

## 확인 절차
```bash
pnpm typecheck && pnpm test
pnpm --filter @gst/server build && pnpm --filter @gst/client build
```
UI 변경은 빌드 후 `PORT=8799 STATIC_DIR=$PWD/apps/client/dist node apps/server/dist/index.js` 띄우고 Playwright(`/opt/pw-browsers/chromium`)로 스크린샷 확인.

## 커밋
`git -c user.name=4rumarts -c user.email=4rumarts@gmail.com commit -m "..."` — 메시지 끝에 세션이 지시하는 Co-Authored-By / Claude-Session 줄. main 에 push 하면 Release 워크플로가 운영 빌드를 만든다 (서버 반영은 사용자가 bootstrap 한 줄 실행).
