# GST 음원 파일명

파일 형식은 MP3이며 파일명 대소문자를 유지합니다. 파일을 추가한 뒤 화면 빌드를 다시 해야 반영됩니다. 효과음 후보는 더 이상 사용하지 않습니다. 볼륨과 음소거는 소리 설정에서 조절하며 로그인 계정에 저장됩니다.

## 효과음

저장 위치: `apps/client/public/sfx/`

| 파일명 | 재생 시점 |
| --- | --- |
| ui_click.mp3 | 버튼 클릭 |
| countdown_tick.mp3 | 카운트다운의 각 초 |
| countdown_start.mp3 | 카운트다운 종료, 전투 시작 |
| attack_hit.mp3 | 공격 성공 |
| attack_fail.mp3 | 공격 실패·방어 |
| death.mp3 | 사망·카드 파손 |

짧은 효과음 권장. 없는 파일은 재생하지 않습니다.

## 진영별 승패 효과음

저장 위치: `apps/client/public/sfx/`. 결과 연출은 5초이므로 각 음원도 5초 이내로 준비합니다.

| 진영 | 승리 | 패배 |
| --- | --- | --- |
| 단테스 P1 | result_P1_win.mp3 | result_P1_loss.mp3 |
| 카이 P2 | result_P2_win.mp3 | result_P2_loss.mp3 |
| 태초 P3 | result_P3_win.mp3 | result_P3_loss.mp3 |
| 어둠 P4 | result_P4_win.mp3 | result_P4_loss.mp3 |
| 가디언 P5 | result_P5_win.mp3 | result_P5_loss.mp3 |
| 리델루트 P6 | result_P6_win.mp3 | result_P6_loss.mp3 |
| 트롤 P7 | result_P7_win.mp3 | result_P7_loss.mp3 |

## 배경음악

저장 위치: `apps/client/public/bgm/`. 배경음악은 반복 재생합니다.

| 화면·모드 | 기본 | 승리 결과 | 패배 결과 |
| --- | --- | --- | --- |
| 메인·대기실 | main.mp3 | — | — |
| 왕자들의 내전 | civil_war.mp3 | civil_war_win.mp3 | civil_war_loss.mp3 |
| 태초의 전쟁 | primordial.mp3 | primordial_win.mp3 | primordial_loss.mp3 |
| 리델루트 황야 | lidellut.mp3 | lidellut_win.mp3 | lidellut_loss.mp3 |
| 트롤 부족의 반란 | troll.mp3 | troll_win.mp3 | troll_loss.mp3 |

결과 배경음악이 없으면 해당 모드의 기본 배경음악을 유지합니다.
