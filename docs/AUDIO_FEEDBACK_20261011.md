# 효과음 선택과 추후 음악 파일명

## 무료 후보 (2026-10-11 라이선스 확인)

대기실 → **내 정보 · 설정 → 소리 설정**에서 각 후보를 재생하고 적용할 수 있다. 선택 전 효과음은 꺼져 있으며 선택/볼륨은 브라우저에 저장된다. 모두 CC0 1.0이며 원본 라이선스/출처는 `apps/client/public/sfx/candidates`에 보관한다.

|용도|후보 A|후보 B|출처|
|---|---|---|---|
|버튼|click_001|select_001|[Kenney Interface Sounds](https://kenney.nl/assets/interface-sounds)|
|카운트다운|tick_001|tick_002|Kenney Interface Sounds|
|시작|confirmation_001|impactBell_heavy_000|Kenney Interface / [Impact Sounds](https://kenney.nl/assets/impact-sounds)|
|공격 성공|sword.1|impactPunch_heavy_000|[StarNinjas 검격](https://opengameart.org/content/20-sword-sound-effects-attacks-and-clashes) / Kenney Impact|
|공격 실패|sword_clash.1|impactMetal_medium_000|StarNinjas 검격 / Kenney Impact|
|사망·카드 파손|scratch_001|impactWood_heavy_000|Kenney Interface / Impact|

워크래프트 원본 음원을 사용하지 않았다. 위 후보는 실제 파일을 포함해 게임 설정에서 비교 가능하다.

## 사용자가 제작할 5초 승리·패배 효과음

`apps/client/public/sfx/result_P1_win.mp3` / `result_P1_loss.mp3`와 같은 규칙으로 **P1~P7**을 준비한다. UI의 캐릭터 진영 프레임에 따라 해당 파일을 재생한다. 공통 음원을 쓰려면 같은 음원을 각 파일명으로 복사한다. 파일은 빌드 시 발견되므로 추가 후 클라이언트 재빌드가 필요하다. 파일이 없으면 요청하지 않는다.

|프레임|진영|
|---|---|
|P1|단테스 계열 (dantes, reindila 등)|
|P2|카이 계열 (sephy, kaspa 등)|
|P3|지상 연합측|
|P4|다크니스 계열|
|P5|가디언 계열 (yui, shining 등)|
|P6|리델루트 계열 (hachi, satoshi 등)|
|P7|트롤 계열 (neonis, kanula 등)|

정확한 매핑 원본은 `apps/client/public/ui/portraits.json`이다.

## 결과·복기 화면에 사용할 모드별 배경음악

`apps/client/public/bgm/`에 아래 8개 파일을 추가한다. 파일이 있으면 경기 종료 시 해당 결과 음악으로 전환하고 결과·복기 동안 반복한다. 없으면 해당 모드의 기존 음악을 유지한다.

- `civil_war_win.mp3`, `civil_war_loss.mp3`
- `primordial_win.mp3`, `primordial_loss.mp3`
- `lidellut_win.mp3`, `lidellut_loss.mp3`
- `troll_win.mp3`, `troll_loss.mp3`

## 확정 효과음 교체 (선택 사항)

`sfx/ui_click.mp3`, `countdown_tick.mp3`, `countdown_start.mp3`, `attack_hit.mp3`, `attack_fail.mp3`, `death.mp3`를 추가하면 설정에서 고른 후보보다 우선한다. 미리 듣기는 후보의 원음으로 유지된다.
