# 실제 서버의 12봇·다중 방 부하 점검

현재 PR 소스의 운영 기본 옵션을 실제 HTTP/WebSocket 서버에서 측정했다. 정책은 `abc0d78` / 원격 `9d240358`과 같으며 실험 수순 탐색은 계속 기본 비활성화다. 진단 스크립트와 서버 tsconfig의 스크립트 검사 범위만 추가했다. 운영 서버·정책·릴리즈는 변경하지 않았다.

## 측정 방법

별도 로컬 서버를 `127.0.0.1`의 임의 포트에 띄우고 관전 WebSocket으로 방을 만들었다. 각 방은 12봇으로 시작한다. 실제 서버 타이머는 250ms, 게임 시계는 60배, 턴은 60초다. 기본 행동 확률 0.012와 고빈도 1을 구분했다. 판이 종료되면 같은 관전자가 새 12봇 판을 시작한다. 사망하면서 동시 생존 봇 수는 줄어든다.

타입 검사·351개 테스트·빌드 프로세스가 종료된 뒤 세 조건을 차례로 20초씩 측정했다. 실제 `RoomManager.tick` 전체 처리(시간 진행, 봇 판단, 행동 적용, 기록, 뷰/이벤트 구성, 전송 요청, 방 정리)를 감싼다. 진행 판의 생존자가 있는 틱만 처리 표본으로 기록한다. WebSocket의 실제 수신/파싱과 100ms 간격 HTTP `/health` 요청은 같은 프로세스에서 실행한다. CPU와 이벤트 루프 지연에는 이 클라이언트 비용도 들어간다. 실제 원격 네트워크 지연은 아니다.

HTTP 초기화 1회와 방 생성/첫 시작은 측정 전이다. 이후 재시작 비용은 CPU·이벤트 루프·응답 지연에 포함되며 서버 틱 외에서 실행되는 부분은 틱 처리 시간에 포함되지 않는다. 판의 총 행동 집계는 시작부터의 기록이다. 난수 배정·봇 기억 초기화는 실제 서버 경로를 사용하며 시드를 기록했다. 같은 궤적 재생이나 이전 버전과의 인과 비교가 아니다.

## 결과

로컬 Linux x64, Node v24.19.0, Intel Xeon Platinum 8573C. 표시된 논리 CPU 수는 9이며 VM ARM의 할당 자원과 같다고 가정하지 않는다.

| 조건 | 활성 틱 수 | 틱 p95 / 최대 | health p95 / 최대 | 이벤트 루프 최대 |
| --- | ---: | ---: | ---: | ---: |
| 12봇 1방, 기본 빈도 | 80 | 4.30 / 12.51ms | 3.21 / 9.01ms | 22.72ms |
| 12봇씩 4방, 기본 빈도 | 79 | 6.45 / 10.24ms | 3.99 / 21.25ms | **192.94ms** |
| 12봇씩 4방, 고빈도 | 80 | 35.67 / 57.94ms | 2.85 / 30.95ms | 62.29ms |

세 조건 모두 틱 처리 250ms 초과 0, HTTP 실패 0, WebSocket 오류 0이었다. 동시 생존 봇 중앙값은 각각 12 / 48 / 35, 최대는 12 / 48 / 48이다. 고빈도 조건은 계속 48명이 살아 있는 조건이 아니다. 기본 4방은 내전·태초·황야·트롤 한 방씩이다.

평균 CPU는 한 코어 기준 3.86% / 4.43% / 14.17%, 관측 RSS 최대는 79.76 / 95.51 / 178.64MiB다. 같은 프로세스에서 조건을 이어 실행했고 강제 GC는 하지 않았다. 진단 코드가 종료된 판의 기록을 보존하므로 이 RSS를 운영 서버의 순수 메모리 사용량이나 누수 증거로 해석하지 않는다. 20초 측정은 장기 메모리 안정성 검증이 아니다.

행동은 12 / 33 / 1,324회, 엔진 거절은 0 / 0 / 5회였다. 엔진의 대상 조건 거절과 HTTP/WebSocket 전송 실패는 구분한다. 원자료에 거절 오류 문자열과 종료·진행 상태, 난수 시드, 각 판의 생존자 수를 보존했다.

## 판단과 남은 범위

이 표본에서는 기본·고빈도 네 방의 **틱 처리 비용**이 250ms 예산을 넘지 않았다. 그러나 기본 네 방에서 이벤트 루프 최대 192.94ms가 기록됐다. 틱의 순수 처리 최대는 10.24ms이므로 이를 봇 판단만의 지연으로 단정할 수 없고, 스케줄링·GC 등 어느 원인인지 특정하지 못했다. 유리한 수치를 얻기 위한 반복으로 이 표본을 버리지 않았다. 이벤트 루프 측정 해상도는 10ms이므로 약 10ms의 p95를 정책 비용으로 해석하지 않는다.

따라서 운영 성능 문제 없음이나 최대 수용 방 수를 보장하지 않는다. VM ARM Node 22의 같은 부하 실측, 타이머의 실제 발화 간격, 더 긴 관찰 및 GC/CPU 프로파일이 다음 검증 범위다. 실험 수순 탐색 활성화 시 다중 방 비용, 실제 인간의 동시 입력, 원격 네트워크·DB 영속화·12개 인간 연결은 이번 측정에 포함하지 않았다. 방마다 관전 연결은 한 개다.

전체 351 테스트·타입·서버/클라이언트 빌드 통과. 최종 드라이버 타입 검사와 실제 반복 판 재시작도 확인했다. 별도 검사로 원자료의 소스 해시, p95/최대, 틱 표본 수와 250ms 초과 집계를 대조했다. 서버 기능 수정이나 운영 배포가 필요한 변경은 없다.

## 재현

저장소 루트에서 의존성을 설치한 후 실행한다. 번들은 Node 22 대상이며 결과는 해당 실행 환경의 수치다. 측정 중 다른 빌드/테스트를 실행하지 않는다.

```bash
apps/server/node_modules/.bin/esbuild apps/server/scripts/bot-load-audit.ts \
  --bundle --platform=node --target=node22 --format=esm \
  --outfile=/tmp/gst-bot-load-audit.mjs \
  --external:bufferutil --external:utf-8-validate \
  --alias:@gst/rules=./packages/rules/src/index.ts \
  --alias:@gst/protocol=./packages/protocol/src/index.ts \
  --banner:js="import { createRequire } from 'module'; const require = createRequire(import.meta.url);"
node /tmp/gst-bot-load-audit.mjs 20000 > docs/evaluations/server-bot-load-audit.json
```

운영 서비스 업데이트 대신 VM에서 별도 측정하려면 다음과 같이 임시 체크아웃을 사용한다. 서비스·`/opt/gst/.env`를 바꾸지 않고 임의 로컬 포트에 별도 서버를 띄운다. 기존 운영 서비스와 같은 호스트에서 실행하면 자원 경합도 수치에 포함된다. 결과의 소스 해시로 측정 버전을 확인한다.

```bash
export PATH="/opt/gst/node/bin:$PATH"
gst_load_dir="$(mktemp -d /tmp/gst-load-audit.XXXXXX)"
git clone --depth 1 --branch feat/bot-bounded-attack-search \
  https://github.com/Cjsarts0509/Guardian-Spirits-Tactics.git "$gst_load_dir"
cd "$gst_load_dir"
npx --yes pnpm@10.28.0 install --frozen-lockfile
apps/server/node_modules/.bin/esbuild apps/server/scripts/bot-load-audit.ts \
  --bundle --platform=node --target=node22 --format=esm \
  --outfile="$gst_load_dir/bot-load-audit.mjs" \
  --external:bufferutil --external:utf-8-validate \
  --alias:@gst/rules=./packages/rules/src/index.ts \
  --alias:@gst/protocol=./packages/protocol/src/index.ts \
  --banner:js="import { createRequire } from 'module'; const require = createRequire(import.meta.url);"
node "$gst_load_dir/bot-load-audit.mjs" 20000 > "$gst_load_dir/results.json"
cat "$gst_load_dir/results.json"
```

원자료: `docs/evaluations/server-bot-load-audit.json`. 원시 틱/생존자 수/HTTP 표본과 소스 SHA-256을 포함한다.
