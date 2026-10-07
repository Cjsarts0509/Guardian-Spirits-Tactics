# VM에서 지연 원인 측정하기

`deploy/audit-bot-load.sh`는 별도 임시 체크아웃을 받아 의존성을 설치하고, 로컬 임의 포트의 진단 서버를 실행한다. 기본 실행은 12봇1방/12봇씩4방/고빈도4방 조건별30초(계측 약90초, 다운로드/설치 시간 별도)다. 운영 서비스·버전·방화벽·`/opt/gst/.env`를 변경하거나 읽지 않으며 sudo가 필요하지 않다. 같은 VM의 운영 서비스와 자원 경합은 수치에 포함된다.

VM 직접 접속 도구가 없어 이번 단계에서는 VM 측정 완료를 주장하지 않는다. 실행 준비와 로컬 기능 검증을 완료했다. 원인 추적 배경은 `docs/BOT_SERVER_LAG_CAUSES.md`에 있다.

## 실행

PR #9의 브랜치에서 실행한다. 배포용 bootstrap 명령과 다르며 운영 빌드를 교체하지 않는다. 재현 버전을 고정할 때는 아래 URL의 브랜치 이름과 `GST_AUDIT_REF`를 같은 커밋 SHA로 바꾼다.

```bash
curl -fsSL https://raw.githubusercontent.com/Cjsarts0509/Guardian-Spirits-Tactics/feat/bot-bounded-attack-search/deploy/audit-bot-load.sh \
  | GST_AUDIT_REF=feat/bot-bounded-attack-search bash
```

Node22 이상, git, tar, npx와 GitHub/npm 다운로드 연결이 필요하다. 기존 `/opt/gst/node/bin/node`가 있으면 그 Node를 우선 사용한다. 환경 변수 `GST_AUDIT_DURATION_MS`로 조건별1000–120000ms를 지정할 수 있다. 의존성 설치는 임시 소스 디렉터리에서 고정된 pnpm10.28.0으로 한다. 이미 설치된 로컬 체크아웃에서는 `GST_AUDIT_SOURCE=/absolute/path`로 다운로드/설치를 생략할 수 있다.

## 결과

콘솔에는 소스 커밋, Node/아키텍처, 틱 p95/최대, 실제 틱 발화 간격 최대, 이벤트 루프 최대, HTTP/WS 오류, 가장 긴3개 구간의 CPU·스케줄러 대기·throttling·GC를 출력한다. 사용 불가능한 OS 정보는 `unknown`이다. cgroup v1에서는 throttling을 알 수 없지만 `/proc` 메인 스레드 대기는 독립적으로 읽는다. cgroup v2에서는 `/proc/self/cgroup`의 본인 그룹을 찾아 읽으며 누락/잘못된 필드를0으로 바꾸지 않는다.

끝에 출력되는 `/tmp/gst-audit.XXXXXX/gst-audit-results.tar.gz`에는 `results.json`과 `summary.json`만 들어간다. 원시 시계열·소스 SHA-256·실행 소스 커밋·수정 여부·결과 해시를 보존한다. 임시 파일은 분석을 위해 자동 삭제하지 않는다. 콘솔 요약 또는 압축 결과를 전달하면 로컬 결과와 비교할 수 있다.

## 준비 검증

전체355개 테스트(규칙332 + 서버23), 타입 검사, 서버·클라이언트 빌드 통과. cgroup v1에서도 스케줄러 기록이 보존되는 회귀와, cgroup v2에서 본인 그룹/누락 필드 처리를 확인하는 회귀2개를 추가했다. 스크립트 셸 구문과 로컬 Node24 x64의 조건별1.5초 기능 실행을 확인했고, 결과/소스 해시·세 조건·HTTP/WS 오류0·압축 구성도 대조했다. 이 짧은 실행은 VM 성능이나 Node22 ARM 호환성 실측 자료가 아니다. GitHub/npm을 통한 VM의 최초 다운로드·설치는 아직 VM에서 실행하지 않았다.

기존 로컬 지연 자료는 이전 계측 소스의 고정 결과로 유지한다. VM용 계측 수정은 봇 정책과 운영 서버 번들에 영향을 주지 않는다.
