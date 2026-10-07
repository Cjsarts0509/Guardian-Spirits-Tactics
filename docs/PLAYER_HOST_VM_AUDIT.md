# VM에서 방장 호스팅 부하 확인

`deploy/audit-player-host.sh`는 같은 소스에서 서버 계산과 방장 계산을 각각 기본1방/기본4방/고빈도4방으로 측정한다. 기본3회 반복의 계산 순서는 AB/BA/AB로 교대하고 각 회의 모드 조건 순서는 고정한다. 조건마다30초, 계측 약9분이며 다운로드/설치/준비 시간은 별도다. 매번 새 무작위 판이므로 동일 행동에 대한 인과적 비교는 아니다.

운영 서비스·버전·방화벽·`/opt/gst/.env`를 읽거나 변경하지 않는다. sudo 없이 임시 체크아웃과 임의 localhost 포트를 사용한다. 운영 중인 게임과 같은 CPU/메모리를 사용하므로 자원 경합은 결과에 포함된다. `/opt/gst/node/bin/node`가 있으면 그 실행 파일을 우선한다. Node22 이상, git, tar, npx, GitHub/npm 연결이 필요하다.

## 실행

PR10 브랜치에서 실행기를 파일로 내려받는다. 원자료에 실제 실행기 파일의 SHA256을 보존하므로 `curl | bash` 대신 다음 명령을 사용한다. 운영 bootstrap과 별개다.

```bash
gst_host_audit_script="$(mktemp /tmp/gst-host-audit-runner.XXXXXX.sh)"
curl -fsSL https://raw.githubusercontent.com/Cjsarts0509/Guardian-Spirits-Tactics/feat/player-host-migration/deploy/audit-player-host.sh -o "$gst_host_audit_script"
GST_HOST_AUDIT_REF=feat/player-host-migration bash "$gst_host_audit_script"
```

버전 고정 시 URL의 브랜치 이름과 `GST_HOST_AUDIT_REF`를 같은 전체 커밋 SHA로 바꾼다. `GST_HOST_AUDIT_RUNS=1`이면 계측 약3분의 예비 진단이다. `GST_HOST_AUDIT_DURATION_MS=1000`–`120000`, `GST_HOST_AUDIT_RUNS=1`–`6`을 지원한다. 설치된 로컬 소스는 `GST_HOST_AUDIT_SOURCE=/absolute/path`로 다운로드를 생략할 수 있으며 해당 HEAD가 ref와 일치하고 추적 파일이 수정되지 않아야 한다.

## 결과

콘솔에 실제 소스 SHA·Node/아키텍처, 조건별 실행 간 중앙값을 표시한다.

- 메인 프로세스 CPU:1코어100% 기준. 게임 서버와 진단 드라이버를 포함하고 호스트 자식의 AI 계산은 제외한다.
- 서버 틱 p95와 호스트 프레임 확정 p95: 서로 다른 경로의 비용이므로 서버 틱만 보고 개선을 판단하지 않는다.
- 업로드: 호스트→서버 JSON 바이트 합/측정 시간. WebSocket/TCP 헤더 제외. 시작·종료 계수를 IPC 응답으로 확인하며 경계는 IPC 응답 지연만큼 어긋날 수 있다.
- 메인 RSS와 자식 RSS:250ms 표본 최대의 실행 간 중앙값. 메인은 진단 드라이버/빌드 준비 후 메모리를 포함하고 자식은 Worker를 포함한 프로세스 RSS 합이다. 공유 페이지를 중복 계산할 수 있어 정확한 물리 메모리 합이나 순간 최고값이 아니다. 짧은 반복으로 장기 누수를 판단하지 않는다.
- HTTP/호스트/프로세스 오류: 하나라도 발생하면 중단하고 성공 요약을 만들지 않는다.

서버 계산에도 진단 클라이언트가 있고 방장 AI는 같은 VM의 별도 Node 프로세스에서 브라우저 Worker 번들을 어댑터로 실행한다. 실제 외부 브라우저의 CPU·회선 부담이나 실제 백그라운드 제한을 재현하지 않는다. 기본activity0.012/고빈도1, timeScale60으로 운영 시간과 다른 합성 부하다. VM 최대 수용 방 수를 보장하는 시험이 아니다.

집계 전에 커밋·실행 순서·소스 SHA256·Node/CPU 환경·6조건·측정 기간·활성 표본·오류·CPU 환산·통신 계수·메모리 통계를 검증한다. 결과가 없거나 서로 다르면 중단하며 실패 회차를 건너뛰지 않는다. 중앙값은 실행별 p95/최대값/CPU 비율의 중앙값이지 전체 원시 틱을 합친 p95가 아니다. 실행별 값은 요약 JSON에 모두 남긴다.

끝에 출력되는 `/tmp/gst-host-audit.XXXXXX/gst-host-audit-results.tar.gz`에는 `summary.json`과 각 회차의 `results.json`/`console.log`만 포함한다. 임시 소스·의존성·운영 설정은 압축하지 않는다. 파일은 분석을 위해 남긴다. 콘솔 결과와 압축 원자료를 전달하면 소스/결과 해시를 대조해 로컬 관측과 비교한다.

## 준비 검증과 남은 확인

소스 불일치·순서·실행 환경·기간·오류·CPU 계산·호스트 확정/메모리 누락 등 집계 회귀12개(정상 집계1개·불일치 거절11개)를 포함한 전체382개 테스트와 타입/빌드를 통과했다. 로컬의 짧은 반복 실행 검증은 기능 확인이며 VM 성능 결과가 아니다. 진단 부모 IPC가 끊겼을 때 실행 중 실제 호스트/Worker가 정상 종료하는 통합 회귀도 추가했다. 로컬 조건별1.5초×6조건×3회(18조건)에서 순서·소스/결과/실행기 해시·압축 구성과 오류0을 확인했다. 실행 검증 원자료는 `docs/evaluations/host-vm-runner-check.json`과 `docs/evaluations/host-vm-runner-check/`에 기록했다.

VM 직접 접속 도구가 없으므로 실제 Node22 ARM 실행과 최초 GitHub/npm 다운로드 경로는 사용자 VM에서 확인해야 한다. 이후에는 서로 다른 회선의 실제 브라우저 두 개, 모바일/절전/백그라운드 탭, 긴 판의 상태·기록 증가를 확인한다. main과 운영 릴리즈는 변경하지 않았다.
