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

사용자 VM에서 Node22.23.3 ARM64 반복3회 및 준비/설치가 완료된 콘솔을 수신했다. 아래 실측 절을 참고한다. VM 직접 접속 도구는 없고 압축 원자료는 아직 받지 않았다. 이후에는 서로 다른 회선의 실제 브라우저 두 개, 모바일/절전/백그라운드 탭, 긴 판의 상태·기록 증가를 확인한다. main과 운영 릴리즈는 변경하지 않았다.

## 사용자 ARM VM 결과 수신

소스 `1c7e8782fc6a980990389e3d1cb3d7fc66a250e4`, Node22.23.3 arm64, 30초×6조건×3회(AB/BA/AB). 사용자 콘솔상 dirtySource=false, 모든 조건 HTTP/호스트/프로세스 오류0이다. 준비 과정의 pnpm 설치도 완료됐다(109패키지, 다운로드0/캐시 재사용). esbuild 빌드 스크립트 경고가 표시됐지만 이후 워커 빌드 및18조건 실행이 완료됐다. 이 수신은 설치 스크립트 승인 설정을 변경한 결과가 아니다.

| 조건 | 메인 CPU server/player % | 서버 틱 p95 server/player ms | 호스트 확정 p95 ms | player 업로드 KiB/s | 메인 RSS server/player MiB |
|---|---:|---:|---:|---:|---:|
| 기본1방 | 2.56 / 1.92 | 6.26 / 0.05 | 2.14 | 92.36 | 111.64 / 109.52 |
| 기본4방 | 2.70 / 3.57 | 6.07 / 0.05 | 1.31 | 436.23 | 118.90 / 131.89 |
| 고빈도4방 | 13.43 / 13.05 | 31.29 / 0.05 | 6.72 | 4033.64 | 224.44 / 238.75 |

기본1방 CPU 감소, 기본4방 CPU 증가, 고빈도4방은 비슷하다. 기본4방·고빈도4방은 메인 RSS도 증가했다. 따라서 이 콘솔만으로 전체 자원 부담/안정성 개선을 확정하지 않는다. player 서버 틱0.05ms는 게임/AI 계산이 빠진 경로만의 수치이며 프레임 수신/확정 비용을 대신하지 않는다. 고빈도4방 업로드는 합계 약3.94MiB/s로 전송 비용의 추가 점검이 필요하다. 같은 VM의 자식 호스트와 운영서비스 자원 경합, timeScale60·새 무작위 판 조건을 유지해 해석한다.

[콘솔 전사](evaluations/host-vm-user-console.json)에 수치를 보존했다. `/tmp/gst-host-audit.gP9Ggh/gst-host-audit-results.tar.gz`는 사용자의 VM 경로이며 이 환경에서 읽은 파일이 아니다. 실행별 값/결과·소스 해시/자식 RSS/루프/활성 봇 수를 독립 대조하려면 원자료가 필요하다. 다음 확인은 전송 구성의 로컬 진단과 실제 원격 브라우저/백그라운드 시험이다.

로컬 전송 구성의 후속 진단은 [PLAYER_HOST_TRANSPORT_FINDINGS.md](PLAYER_HOST_TRANSPORT_FINDINGS.md)에 있다. VM의 실제 프레임 구성과 같은 것으로 해석하지 않는다.

후속으로 AI 기억 변경분 전송을 구현했다. 위 ARM 콘솔은1c7e878의 변경 전 결과이며 새 소스의 VM 성능 결과가 아니다. [변경분 전송 검증](PLAYER_HOST_MEMORY_DELTA.md)을 참고하고 재측정 시 실행기 URL과 `GST_HOST_AUDIT_REF`를 같은 새 커밋 SHA로 고정한다.

## 변경분 적용 후 ARM 콘솔

395e761, Node22.23.3 arm64, 30초×6조건×3회, dirtySource=false, 오류0 보고. [콘솔 전사](evaluations/host-vm-memory-delta-console.json). 고빈도4방 메인 CPU server/player13.66/5.48%, player 업로드600.56KiB/s. 이전 player13.05%/4033.64KiB/s 대비 각각58.0%/85.1% 감소 관측. 기본4방은 server/player2.24/3.54%로 중계 비용이 더 높다. 메인CPU는 자식 호스트 계산을 제외하며 무작위판 간 비교다. 전체VM/브라우저CPU·수용량·통계적 유의성 보장이 아니다. 새 원자료는 사용자VM `/tmp/gst-host-audit.kWmAdn/gst-host-audit-results.tar.gz`에 있으며 독립 대조 미완료.
