# 아이콘

- `manifest.csv` — 원작 v1.33 의 모드·캐릭터·스킬별 아이콘 경로와 툴팁·설명 원문 (custom = 맵 임포트, standard = 워3 기본)
- `icons.csv` — 아이콘 1개당 1행, 그 아이콘을 쓰는 오브젝트와 설명 원문
- `GEMINI_가이드.md` — 아이콘 제작 방식(다크 판타지), 시트 프롬프트 12장 (내전 스킬 + 4개 모드 캐릭터 42명), 캐릭터 설정 요약
- `캐릭터_원작설정.md` — 가디언 스피리츠2 v1.55 영웅 설명 원문 (캐릭터 프롬프트 근거)
- `gemini_prompts.csv` — 웹판 아이콘 185종 목록과 개별 프롬프트. `file` 열 이름으로 `apps/client/public/icons/` 에 넣는다
- `standard_icons.txt` — 원작이 쓰던 워3 기본 아이콘 114종 경로

원작 이미지 파일은 레포에 넣지 않는다 (블리자드·외부 출처 아트 포함). 웹판은 새로 만든 아이콘만 쓴다.
비활성 상태는 CSS 흑백 처리라 별도 이미지가 필요 없다.

## 웹 반영
1. Gemini 시트(마젠타 줄)를 칸별로 자르고 `gemini_prompts.csv` 의 `file` 이름으로 저장한 마스터 PNG 폴더를 준비
2. `python3 tools/build_web_icons.py <마스터 폴더>` → `apps/client/public/icons/{128,256}/*.webp` 와 `apps/client/src/icons.gen.ts` 생성
3. 없는 아이콘은 클라이언트에서 글자로 대체 (다른 모드 스킬은 아직 그림 없음)

마스터 PNG(원본 해상도)는 용량 때문에 레포에 넣지 않는다.
