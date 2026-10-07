# VM에서 지연 원인 측정하기

`deploy/audit-bot-load.sh`는 별도 임시 체크아웃을 받아 의존성을 설치하고, 로컬 임의 포트의 진단 서버를 실행한다. 기본 실행은 12봇1방/12봇씩4방/고빈도4방 조건별30초(계측 약90초, 다운로드/설치 시간 별도)다. 운영 서비스·버전·방화벽·`/opt/gst/.env`를 변경하거나 읽지 않으며 sudo가 필요하지 않다. 같은 VM의 운영 서비스와 자원 경합은 수치에 포함된다.

VM 직접 접속 도구는 없다. 사용자가 두 차례 실행한 콘솔 요약은 받았으며 상세는 `docs/BOT_BELIEF_OPTIMIZATION.md`에 기록했다. 원자료 압축과 소스 커밋은 직접 대조하지 않았다. 원인 추적 배경은 `docs/BOT_SERVER_LAG_CAUSES.md`에 있다.

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

전체355개 테스트(규칙332 + 서버23), 타입 검사, 서버·클라이언트 빌드 통과. cgroup v1에서도 스케줄러 기록이 보존되는 회귀와, cgroup v2에서 본인 그룹/누락 필드 처리를 확인하는 회귀2개를 추가했다. 스크립트 셸 구문과 로컬 Node24 x64의 조건별1.5초 기능 실행을 확인했고, 결과/소스 해시·세 조건·HTTP/WS 오류0·압축 구성도 대조했다. 이 짧은 실행은 VM 성능이나 Node22 ARM 호환성 실측 자료가 아니다. 최초 다운로드·설치를 포함한 사용자 VM 실행 콘솔은 이후 수신했다. 아래 반복 비교 실행기의 다운로드 경로는 별도 검증 대상이다.

기존 로컬 지연 자료는 이전 계측 소스의 고정 결과로 유지한다. VM용 계측 수정은 봇 정책과 운영 서버 번들에 영향을 주지 않는다.

## 수정 전후 반복 비교

`deploy/compare-bot-load.sh`는 고정된 수정 전 `2c48c2552da872a0804a99ac28d453d5fa02f7f2`와 수정 후 `bf9ed3b6312ce20214f802ca5f74fd345c7e9ffc`를 각각 한 번 준비하고, 기존 부하 runner를 순차 실행한다. 기본 3쌍의 순서는 AB / BA / AB다. 각 실행의 세 조건은 기존과 같은 고정 순서다. 조건 순서 효과까지 제거한 무작위 실험은 아니다. 기본 조건별30초×세 조건×6실행으로 계측 약9분이며 다운로드·설치·빌드 시간은 별도다.

```bash
curl -fsSL https://raw.githubusercontent.com/Cjsarts0509/Guardian-Spirits-Tactics/feat/bot-bounded-attack-search/deploy/compare-bot-load.sh | bash
```

실행기 버전 고정은 URL 브랜치를 실행기 커밋 SHA로 바꾼다. 비교 대상은 스크립트 안의 고정 SHA이므로 URL 변경으로 바뀌지 않는다. 다른 정책 비교는 `GST_COMPARE_BASE_REF`와 `GST_COMPARE_CURRENT_REF`에 서로 다른 전체 SHA를 지정한다. `GST_COMPARE_PAIRS=1`–`6`, `GST_AUDIT_DURATION_MS=1000`–`120000`을 지원한다. 로컬에서 설치를 생략하려면 `GST_COMPARE_BASE_SOURCE`/`GST_COMPARE_CURRENT_SOURCE`를 지정하며 HEAD가 지정 SHA와 같고 추적 파일이 수정되지 않았는지 확인한다.

요약은 조건별 실행 p95·최대·루프 최대·발화 간격 최대의 **실행 간 중앙값**과 같은 쌍의 차이를 표시한다. 전체 틱을 합쳐 다시 계산한 p95가 아니다. 3쌍으로 유의성이나 인과관계를 확정하지 않으며, 기본4방의 증가가 쌍마다 반복되는지 먼저 본다. HTTP/WS 오류와 처리250ms 초과도 실행별로 보존한다.

집계 전에 커밋·dirtySource=false·결과 SHA-256·Node/CPU 환경·조건 수·기간·활성 틱 표본·원자료와 요약 수치를 대조한다. 불일치 시 비교를 중단한다. 실패한 실행은 건너뛰지 않는다. 압축은 `comparison.json`과 `runs/` 아래 각 실행의 원자료·요약·콘솔만 포함하며 소스 체크아웃은 제외한다. 원시 실행기 결과의 OS/GC 기록도 그대로 남는다. 운영 서비스와의 자원 경합은 포함되고 운영 서비스를 중단하지 않는다.

반복 실행기 준비 검증: 로컬 Node24.19.0 x64의 설치된 두 고정 체크아웃에서 조건별1.5초·3쌍(6실행)을 완료했다. AB/BA/AB 실행 순서, 세 조건, 결과 해시, 중앙값·쌍별 차이, 압축에 원자료/요약/콘솔만 포함되는 것을 대조했다. 커밋 불일치·dirtySource·결과 해시 불일치·실행 환경 불일치·요약 수치 불일치 다섯 변조 입력을 모두 거절했다. 원자료는 `/tmp/gst-compare.Wp0ZGg`에 보존했고 재현 메타데이터는 `docs/evaluations/vm-comparison-runner-check.json`에 있다. 짧은 6틱 기능 검증이므로 그 비용 수치로 성능을 판단하지 않는다. 새 실행기의 최초 두 체크아웃 다운로드와 Node22 ARM 반복 실측은 VM 사용자 실행이 남아 있다. 전체355테스트·타입 검사·서버/클라이언트 빌드도 통과했다.
