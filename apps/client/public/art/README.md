# art/ — 생성 이미지 넣는 곳 (없으면 화면은 글자/그라데이션으로 대체)

| 파일 | 만드는 법 | 쓰이는 곳 |
|---|---|---|
| key_visual.webp | `python tools/build_key_visual.py 그림.png` | 메인 화면 왼쪽 |
| logo_emblem_512/128.webp, favicon.png, apple-touch-icon.png | `python tools/build_logo.py 엠블럼.png [워드마크.png]` | 메인 로고, 상단바, 로비, 탭 아이콘 |
| logo_wordmark.webp | 위 명령의 두 번째 인자 | 메인 로고 영문 워드마크 |

엠블럼·워드마크 원본은 마젠타(#FF00FF) 배경으로 생성하면 도구가 투명 처리한다.
