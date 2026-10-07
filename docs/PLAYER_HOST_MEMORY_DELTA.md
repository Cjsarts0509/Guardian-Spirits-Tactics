# AI 기억 변경분 전송

방장 Worker가 마지막 서버 ACK 프레임의 JSON 기억을 기준으로 변경분을 생성한다. 서버는 프레임 번호가 같은 확정 기억에만 순수 함수로 적용하고, 상태 검증까지 성공한 뒤 확정한다. 틀린 기준·누락·중복 배열 변경·잘못된 삭제·과도한 깊이/노드는 거절하며 기존 확정 기억을 부분 수정하지 않는다.

변경분이 전체 기억보다 충분히 작지 않으면 전체 기억을 보낸다. 최근64개 관측 이력은 seq로 앞에서 밀린 위치를 찾고 남은 값도 모두 비교한다. 이력 개수·AI 정책·스킬/쿨다운 기억을 유지한다. 호스트 이전은 합쳐진 전체 기억과 RNG를 복원한다. 이전 문자열 기억 체크포인트도 읽을 수 있다.

## 동일 프레임 비교

4모드×2activity×2고정시드×120틱, 총1920프레임의 상태·기록·기억·Map/Set 복원이 이전 방식과 일치했다. 비교용 이전 인코더는 역사적 커밋17f8073의 원본과40프레임 문자열/바이트 및 복구 객체가 일치하는지 별도로 확인했다. 네 모드의 복원 후 다음 행동·RNG·기억 일치도 회귀 테스트로 확인한다.

| 고빈도 모드 | WebSocket 전송 JSON 바이트 감소(두 시드) |
|---|---:|
| civil_war | 81.5–84.9% |
| primordial | 86.9–87.3% |
| lidellut | 79.7–86.8% |
| troll | 83.4–83.9% |

기본activity 감소는30.7–54.4%다. JSON 바이트는 WebSocket/TCP 헤더를 제외한다. 호스트의 변경분 인코딩 비용은 증가했고 고빈도 인코딩 p95는3.27–6.54ms였다. 로컬 Node24 x64 한 번의 before→after 비교이므로 JIT/GC/순서 영향이 있으며 ARM VM/원격 회선/통계적 유의성 결과가 아니다.

## 실제 경로 검증

기억 변경분의 실제 WebSocket 제출과 해당 프레임 ACK, 두 독립 Chromium153 프로필의 새로고침·탭 종료·자리 비움·모든 호스트 이탈 후 복귀·채팅1회 확정·AI 관전자 호스팅 등8개 검사에서 수집 오류0건이다. 원자료의 소스 SHA256이 현재 코드와 일치한다.

별도 로컬15초×6조건에서 메인 CPU server/player는 기본1방2.58/1.85%, 기본4방2.42/3.30%, 고빈도4방10.36/4.94%다. 고빈도 player 업로드 합계는 약631KiB/s다. 기본4방 CPU는 여전히 player 방식이 높다. 각 조건은 새 무작위 판이며 호스트 계산은 자식 프로세스에서 실행해 메인 CPU에 제외된다. 전체 머신 CPU·안정성·수용량 개선으로 해석하지 않는다.

## 자료와 재현

- `evaluations/host-memory-baseline-check.json`: 역사적 비교용 인코더 대조.
- `evaluations/host-memory-delta-audit.json`: 동일1920프레임 비교와 코드 해시.
- `evaluations/host-load-memory-delta.json`: 새 로컬 부하6조건.
- `evaluations/host-browser-audit.json`: 실제 변경분 경로와 이전8검사.
- `evaluations/host-browser-before-memory-delta.json`: 변경 전 기록 보존.

```bash
cd apps/server
node --import tsx scripts/host-memory-delta-audit.ts > /tmp/gst-host-memory-delta.json
```

다음은 새 커밋으로 [ARM VM 반복 진단](PLAYER_HOST_VM_AUDIT.md)을 수행한다. 이전 ARM 수치는 변경 전 결과이며 새 성능 결과로 대체하지 않는다. 실제 외부 회선·모바일·절전/백그라운드·장기 판 검증도 남는다. main·운영 릴리즈·VM은 변경하지 않았다.
