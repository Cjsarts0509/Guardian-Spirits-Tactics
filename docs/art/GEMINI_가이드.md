# 가택 웹판 아이콘 — Gemini 생성 가이드 (다크 판타지)

## 방향
- **톤**: 고딕·그림다크. 거의 검은 바탕에서 피사체만 떠오르는 강한 명암, 잿빛으로 죽인 색에 **불씨 같은 강조색 하나**. 낡은 쇠, 갈라진 뼈, 썩은 천, 핏자국, 꺼져가는 촛불, 연기·재·불티. 정체를 숨기고 배신하는 게임이라 분위기 키워드는 공포·배신·비밀.
- **원본 아이콘 이미지는 Gemini에 넣지 않는다.** 텍스트 컨셉만으로 새로 그린다. 원본을 넣고 리마스터시키면 결과물이 원본(블리자드·외부 아트)의 파생물로 남아 공개 서비스에 쓰기 위험하다. 원본은 사람이 분위기 참고용으로만 본다.
- **시트 방식**: 스킬은 3×3(9개), 캐릭터는 2×3(6개). 이보다 많으면 개수·순서를 어기기 쉽다.
- **스타일 고정**: S1을 마음에 들 때까지 뽑고, 고른 아이콘 2~3장을 이후 모든 시트에 스타일 참고로 첨부한다 (아래 블록 추가).
- **칸 사이는 마젠타(#FF00FF) 줄.** 아이콘은 꽉 찬 그림이라 키잉 없이 분할만 한다. 기존 Colab 시트분할 노트북(마젠타 자동 모드)을 쓰거나 시트를 나한테 주면 잘라서 파일명 붙여 준다.
- **테두리·글자·회색 버전은 그리지 않는다.** 테두리, 쿨다운, 비활성 흑백은 웹에서 처리.

## 색 규칙 (어두운 톤 안에서 계열 구분)
| 계열 | 강조색 | 시트 |
|---|---|---|
| 기본 행동·보석 | 녹슨 금색·낡은 양피지 | S1 |
| 정보(확인·스캔·간파) | 병든 듯한 옅은 청록 유령빛 | S2 |
| 관계(배우자·충복·후계) | 바랜 장밋빛·녹슨 금색 | S3 |
| 살해·공격 | 검붉은 피·불씨 | S4 |
| 제압 / 보호 | 멍든 보라 / 창백한 뼈색·은색 | S5 |
| 캐릭터 | 단테스 측 진홍 / 카이 측 짙은 보라 | C1, C2 |

## 순서
1. S1 생성 → 스타일 확정 (여러 번 뽑아도 됨)
2. 확정 아이콘 2~3장 첨부해서 S2~S5, C1~C2
3. 시트 분할 → 파일명은 각 시트 아래 목록
4. 48px로 줄여서 형태가 구분되는지 확인. 너무 어두우면 실루엣이 죽으니 아래 "보정 문구"로 조절. 공격 → 상급 공격 → 연쇄살인처럼 단계가 있는 건 나란히 놓고 비교
5. 웹 규격: 마스터 PNG 보관, 웹용 256px·128px WebP (내가 변환해 줄 수 있음)

## 2번째 시트부터 프롬프트 맨 앞에 붙일 블록
```
STYLE REFERENCE: The attached images are icons already approved for this set. Match their rendering, brushwork, darkness level, lighting direction, edge shadow and color treatment exactly, so the new icons look like the same artist made them. Do not copy their subjects or compositions.
```

## 보정 문구 (결과 보고 프롬프트 끝에 한 줄 추가)
- 너무 밝거나 게임 일러스트처럼 깔끔할 때: `Make it darker and grimmer: crush the shadows toward black, desaturate everything except the single accent glow, add more grime, scratches and smoke.`
- 너무 어두워서 48px에서 안 보일 때: `Keep the dark mood but strengthen the rim light and the accent glow on the subject's outline so the silhouette separates clearly from the background.`
- 칸마다 그림체가 다를 때: `All tiles must share exactly the same brushwork, lighting direction and darkness level, as if painted in one session.`

## 캐릭터 설정 (가디언 스피리츠2 v1.55 영웅 설명 기준)
- 모델은 종족·체형·무기 같은 큰 틀만 참고했다. 원래 블리자드 캐릭터를 특정하는 특징(악마사냥꾼의 눈가리개, 데스나이트의 해골 견갑·서리 검 등)은 일부러 뺐다.
- GS2에 영웅이 없는 캐릭터는 다른 영웅 설명에 나오는 언급, 가택 칭호, 가택 아이콘을 근거로 했다.

| 캐릭터 | 원작 설정 | 참고 모델·아이콘 | 프롬프트에 반영 |
|---|---|---|---|
| 단테스 | 마계 첫째 왕자. 연인 프레이아의 배신으로 죽음. 듀에르가 드워프를 노예로 부림 (다른 영웅 설명 속 언급) | 가택 아이콘 BTNMetamorphosis | 뿔·날개 달린 악마 왕자, 가슴의 상처 |
| 메르츠키엘 | 둘째 왕자, 가장 총명, 시타델 집정관. 내전 패배 후 유폐, 2차 전쟁 때 가디언으로 투항 | 기본 모델 IllidanEvil | 작은 뿔·옅은 날개, 학자풍 높은 깃 |
| 켈후 | 단테스의 충복. 포로로 잡혀 정신 고문, 동족을 지키려 참전 | OgreLord | 부러진 엄니, 족쇄 흉터, 가시 철퇴 |
| 프레이아 | 탐욕의 신 리비도의 대사제, 미인. 단테스의 연인이었다가 배신해 죽이고 카이에게 투항 | Maiev | 금 볏 머리장식, 금사슬·동전, 차가운 미소 |
| 소엔 | 단테스의 암살자. 카이에게 붙잡혔다가 복수를 위해 가디언으로 | watcher | 뾰족 두건·천 복면, 입술 흉터, 곡도 두 자루 |
| 레인딜라 | 메르츠키엘의 아내. 남편 탈출 시간을 벌려 희생, 크레이트가 영혼을 속박해 밴시가 됨, 기억 상실 (GS2 '소울 싱어') | BansheeGhost | 하반신이 흩어지는 유령 귀부인, 결혼반지 |
| 세피 | 메르츠키엘을 섬긴 마녀, 그를 살리는 조건으로 카이에게 투항. 마계 최강 마녀 | DemonessBlue | 푸른 피부, 숫양 뿔, 갈라진 피부의 붉은 빛 |
| 카이 | 셋째 왕자, 잔인·냉혹. 형제를 꺾고 후계자. 패전 후 어비스에서 증오를 배움 | 기본 모델 HeroDemonHunter | 검은 가시 왕관, 피부의 보라 문양, 등 뒤 곡검 두 자루 |
| 아린 | 카이의 심복, 카스파의 동생. 마계에선 드문 충성심 | 기본 모델 UndeadArthas | 보라 룬 새긴 검은 판금, 룬 대검 |
| 투마 | 지옥문 파수꾼, 3대 마왕 시절부터 살아옴. 내전·1차 전쟁의 선봉 | ChaosWolfRider | 붉은 피부·엄니, 불타는 갈기, 불꽃 검 두 자루 |
| 크레이트 | 카이의 참모, 사령술사들의 수장. 부관의 배신으로 치명상 | HeroArchMage | 긴 회색 수염, 해골 지팡이, 가슴의 오래된 상처 |
| 카스파 | 카이의 친우, 섀도우 종파 제사장. 프레이아의 사촌이라 드로우로 해석 | Shaman | 드로우 피부, 의식 흉터, 뼈 부적·깃털, 해골 지팡이 |
| 라엘 | 태초의 전쟁에서 케인과 함께 지상을 지킨 '피닉스 마스터' (언급만) | 가택 아이콘 BTNPriest | 금발 엘프, 불씨 남은 피닉스 깃털 망토 |
| 케인 | 달의 여신이 고른 2대 문 울프 수장. 태초의 전쟁에서 엘타스와 싸움 | Spiritwolf | 은백색 영혼 늑대, 이마의 초승달 (사람 아님) |
| 에오릴 | 피닉스 수장, 샤이닝과의 사이에 세나를 둠 (언급만) | 가택 아이콘 BTNSorceress | 불타는 깃털 왕관, 잉걸불 같은 머리 |
| 뉴켈리어스 | 고대 자연의 수호자, 샤이닝과 가디언 창설 | 기본 모델 MalFurion | 이마에서 자란 가지 뿔, 이끼 수염, 나무껍질 피부 |
| 타친 | 설정 없음, 가택 칭호 '트롤 치프틴' | 가택 아이콘 BTNForestTrollTrapper | 숲 트롤 족장, 깃털 뼈 머리장식, 그물·창 |
| 쿠마린 | 설정 없음, '타우리안 치프틴' | BTNHeroTaurenChieftain | 소머리 족장, 땋은 갈기, 돌망치 |
| 엘타스 | 태초의 전쟁에서 다크니스 군을 지휘한 대장군. 유물 '엘타스의 방패'는 용의 형상 (언급·아이템 설명) | BTNHeroDeathKnight | 검은 판금, 용 얼굴 방패, 찢긴 군기 |
| 사신트 | 대마왕 크림슨이 신임하는 마계 사령관, 전쟁광. 태초의 전쟁 선봉 (GS2 '오버로드') | ChaosWarlord | 붉은 피부 악마 군주, 가시 철관 |
| 킬데르 | 설정 없음, '로열 뱀파이어' | BTNHeroDreadLord | 박쥐 날개 귀족 흡혈귀 |
| 드라칸 | 설정 없음, '블랙타워 위자드' | BTNSkeletonMage | 해골 마법사, 갇힌 초록 불꽃 |
| 허밀리 | 설정 없음, '다크 프리스트' | BTNNecromancer | 문신한 민머리 사제, 뼈 묵주 |
| 컨슘 | 설정 없음, '미트 골렘' | BTNAbomination | 꿰맨 살덩이 골렘, 갈고리·사슬 |
| 샤이닝 | 가디언 창설자, 리델루트 제국의 수장. 세나·치즈코의 아버지 (언급만) | BTNDragonHawk | 나이 든 황제 지휘관, 날개 투구 |
| 치즈코 | 샤이닝이 천사와 낳은 반천사. 외교관으로 각지를 돌아다님 | 기본 모델 Jaina | 옅은 빛 날개, 낡은 외교관 로브, 희미한 후광 |
| 유이 | 성 토아라크 기사단(병원 기사단) 단장. 리델루트 황야에서 카이 기습 | BloodElfSpellThief | 찌그러진 진홍·은 갑옷, 붕대 감은 팔, 성표 |
| 로네리스 | 빛의 군주 저스티스의 선택을 받은 전사, 은퇴한 성기사단장이 다시 참전 | HeroPaladinBoss2 | 전성기 지난 성기사, 회색 수염, 대형 망치 |
| 수프라 | 블러드 엘프 대전사, 저스티스의 수호자. 헬 게이트 다수 파괴 | BloodElfLieutenant | 붉은 칠 갑옷, 긴 흰 머리, 피 묻은 장검 |
| 카미카제 | 타우렌 대전사. 인질 협박으로 항복, 프레이아에게 정신 지배당함 | HeroTaurenChieftainCIN | 늙은 소머리 전사, 흰 갈기, 보랏빛으로 흐린 눈 |
| 치스 | 얼음 일족 부족장. 다크니스에 부족 대부분을 잃고 재건 중 | WitchDoctor | 서리빛 피부, 올려 쓴 뼈 가면, 지친 족장 |
| 사토시 | GS2 네임드 크립, '아이스 가드' | BTNForestTroll | 모피·서리 뼈갑옷, 둥근 방패 |
| 즈윈라 | GS2 네임드 크립, '아이스 워로드' | BTNIceTrollBeserker | 서리 낀 엄니, 투척 도끼 두 자루 |
| 하치 | 설정 없음, '엘더 헤드헌터' | BTNHeadhunter | 회색 드레드록, 허리의 전리품 머리 |
| 토크라 | 설정 없음, '아이스 샤먼' | BTNIceTrollShaman | 고드름 땋은 머리, 얼어붙은 토템 |
| 울디안 | 설정 없음, '와일드 휴먼' | BTNBeastMaster | 야인 조련사, 어깨의 매 |
| 울피안 | 설정 없음, '와일드 휴먼' | BTNDruidOfTheClaw | 반쯤 곰으로 변한 야인 |
| 데카 | 치스의 동생 '트롤베인'. 힘을 얻으려 트롤들을 다크니스에 바친 배신자 | HeadHunter_V1 | 피범벅 광전사, 가슴의 계약 낙인 |
| 네오니스 | 그즐리카 트롤 부족장, 혼돈의 신의 종자. 카이를 부추겨 전쟁을 일으킴 | 기본 모델 HeroShadowHunter | 금 간 의식 가면, 저주 부적, 비웃음 |
| 카'눌라 | 설정 없음, '카오스 샤먼' | BTNDarkTrollShadowPriest | 보라검은 피부, 초록 혼돈 불꽃 |
| 카즈로우 | 설정 없음, '카오스 어설트' | BTNDarkTroll | 혼돈 흉터, 들쭉날쭉한 식칼 |
| 세이로우 | 설정 없음, '파나틱 어설트' | BTNDarkTrollTrapper | 낙인 새긴 광신도, 그물·갈고리창 |


---

## S1 — 기본 행동·진실의 보석 (3×3)
```
Create ONE image: a 3×3 grid of 9 square game skill icons.

LAYOUT: 9 equal square tiles in 3 rows × 3 columns, separated by 32px solid pure magenta (#FF00FF) gutters, with a 32px magenta margin around the whole grid. Each tile is painted edge to edge (no transparency, no rounded corners). Order is left→right, top→bottom, exactly as numbered in SUBJECTS. Do not draw numbers or labels.

STYLE (identical for every tile): grim dark-fantasy game icon, gothic and ominous, painted in heavy oil on a near-black ground. Strong chiaroscuro — the subject emerges from deep black shadow and most of the tile stays dark. Desaturated ashen palette (charcoal, bone, rust, tarnished iron) with ONE smoldering accent color glowing from within the subject. Weathered, cracked, scarred and blood-stained materials: old iron, cracked bone, rotting cloth, guttering candle and ember light. Faint smoke, ash and embers in the air. Coarse painterly texture with subtle film grain. One bold silhouette that still reads clearly when shrunk to 48px. Mood: dread, betrayal, secrets.

RULES: no text, no letters, no numbers, no UI frame or border, no watermark. No cute, cartoon, glossy or bright mobile-game look, no clean sci-fi glow. Dark red blood stains and drips are fine; no exposed organs or dismemberment. Original designs only — do not imitate Warcraft, StarCraft, Diablo or any existing game's art.

SUBJECTS (accent: tarnished gold and old parchment):
1. Proclamation — a tattered parchment decree nailed to a black oak door, sealed with dripping blood-red wax, lit by one dying candle
2. Alliance — two scarred gauntleted hands clasping over a blood oath, a thin red thread binding their wrists
3. Break alliance — the blood thread snapping as the two gauntlets wrench apart, drops of blood flying
4. Attack — a notched black dagger driving downward, its edge catching a single red gleam
5. Advanced attack — a massive rusted executioner's greatsword wreathed in smoldering crimson embers, far heavier than the dagger
6. Broadcast in secret — a faceless hooded herald raising a cracked bone horn, ghostly sound rings rippling through smoke
7. Truth shard (1 of 3) — one jagged shard of pale crystal glowing faintly in black ash
8. Truth shard (2 of 3) — two shards fused by molten seams into a broken gem, one third still missing
9. Truth gem (complete) — a whole faceted gem burning with cold inner light, an eye staring from within
```
파일명: 1 `skill_publish` · 2 `skill_ally` · 3 `skill_break_ally` · 4 `skill_attack` · 5 `skill_advanced_attack` · 6 `skill_global_chat` · 7 `item_truth_shard_1` · 8 `item_truth_shard_2` · 9 `item_truth_gem`

## S2 — 정보 계열 (3×3)
```
Create ONE image: a 3×3 grid of 9 square game skill icons.

LAYOUT: 9 equal square tiles in 3 rows × 3 columns, separated by 32px solid pure magenta (#FF00FF) gutters, with a 32px magenta margin around the whole grid. Each tile is painted edge to edge (no transparency, no rounded corners). Order is left→right, top→bottom, exactly as numbered in SUBJECTS. Do not draw numbers or labels.

STYLE (identical for every tile): grim dark-fantasy game icon, gothic and ominous, painted in heavy oil on a near-black ground. Strong chiaroscuro — the subject emerges from deep black shadow and most of the tile stays dark. Desaturated ashen palette (charcoal, bone, rust, tarnished iron) with ONE smoldering accent color glowing from within the subject. Weathered, cracked, scarred and blood-stained materials: old iron, cracked bone, rotting cloth, guttering candle and ember light. Faint smoke, ash and embers in the air. Coarse painterly texture with subtle film grain. One bold silhouette that still reads clearly when shrunk to 48px. Mood: dread, betrayal, secrets.

RULES: no text, no letters, no numbers, no UI frame or border, no watermark. No cute, cartoon, glossy or bright mobile-game look, no clean sci-fi glow. Dark red blood stains and drips are fine; no exposed organs or dismemberment. Original designs only — do not imitate Warcraft, StarCraft, Diablo or any existing game's art.

SUBJECTS (accent: sickly pale teal ghost-light):
1. Ally check — a weary open eye peering through the slit of a battered iron shield
2. Enemy check — a bloodshot eye caught inside a crown of black thorns
3. Advanced enemy check — the thorn-crowned eye ringed by floating occult runes burning pale teal, more intricate
4. Scan — a cracked crystal lens held up by a skeletal hand, its ghost-light revealing a hooded figure
5. Advanced scan — the cracked lens with orbiting runes, exposing a screaming spectral face beneath a hood
6. Oracle — a blind seer's bowl of black water reflecting a faintly glowing gem
7. Shadow eye — an eye formed from black smoke, its pupil a sliver of glowing crystal
8. Curse — a hex sigil seared into pale parchment, a guttering blue flame being snuffed out
9. Priestess of the god of greed — a gold-and-blood-red veil drawn back from a beautiful pale face, gold coins spilling, candlelight
```
파일명: 1 `skill_ally_check` · 2 `skill_enemy_check` · 3 `skill_advanced_enemy_check` · 4 `skill_scan` · 5 `skill_advanced_scan` · 6 `skill_oracle` · 7 `skill_shadow_eye` · 8 `skill_curse` · 9 `skill_libido_priestess`

## S3 — 관계 계열 (3×3)
```
Create ONE image: a 3×3 grid of 9 square game skill icons.

LAYOUT: 9 equal square tiles in 3 rows × 3 columns, separated by 32px solid pure magenta (#FF00FF) gutters, with a 32px magenta margin around the whole grid. Each tile is painted edge to edge (no transparency, no rounded corners). Order is left→right, top→bottom, exactly as numbered in SUBJECTS. Do not draw numbers or labels.

STYLE (identical for every tile): grim dark-fantasy game icon, gothic and ominous, painted in heavy oil on a near-black ground. Strong chiaroscuro — the subject emerges from deep black shadow and most of the tile stays dark. Desaturated ashen palette (charcoal, bone, rust, tarnished iron) with ONE smoldering accent color glowing from within the subject. Weathered, cracked, scarred and blood-stained materials: old iron, cracked bone, rotting cloth, guttering candle and ember light. Faint smoke, ash and embers in the air. Coarse painterly texture with subtle film grain. One bold silhouette that still reads clearly when shrunk to 48px. Mood: dread, betrayal, secrets.

RULES: no text, no letters, no numbers, no UI frame or border, no watermark. No cute, cartoon, glossy or bright mobile-game look, no clean sci-fi glow. Dark red blood stains and drips are fine; no exposed organs or dismemberment. Original designs only — do not imitate Warcraft, StarCraft, Diablo or any existing game's art.

SUBJECTS (accent: faded dried-rose and tarnished gold):
1. Spouse (the prince's side) — two tarnished wedding rings, silver and obsidian, bound by a frayed crimson ribbon on cold stone
2. Spouse (the soul follower's side) — two tarnished wedding rings with a pale soul flame trapped between them
3. Loyal servant of the crimson prince — a dented knight's helm bowed before a floating black iron crown set with crimson gems
4. Loyal servant of the dark prince — a dented knight's helm bowed before a floating crown of black thorns lit violet
5. Warrior's scent — a feral beast's scarred snout sniffing, scent trails curling into the shapes of blades
6. Name a successor — a withered dying hand passing a black crown into a gauntleted hand
7. Successor — a black crown hanging above an empty cracked throne in a cold shaft of light
8. Advice — a hooded mouth whispering into a scarred ear, a cold blue wisp between them
9. Calmness — a frozen black lake under a pale moon, a single ripple at its center
```
파일명: 1 `skill_mertz_spouse` · 2 `skill_reindila_spouse` · 3 `skill_kelhu_loyal` · 4 `skill_kai_loyal` · 5 `skill_warrior_scent` · 6 `skill_dantes_successor` · 7 `skill_successor` · 8 `skill_advice` · 9 `skill_calmness`

## S4 — 살해·공격 계열 (3×3)
```
Create ONE image: a 3×3 grid of 9 square game skill icons.

LAYOUT: 9 equal square tiles in 3 rows × 3 columns, separated by 32px solid pure magenta (#FF00FF) gutters, with a 32px magenta margin around the whole grid. Each tile is painted edge to edge (no transparency, no rounded corners). Order is left→right, top→bottom, exactly as numbered in SUBJECTS. Do not draw numbers or labels.

STYLE (identical for every tile): grim dark-fantasy game icon, gothic and ominous, painted in heavy oil on a near-black ground. Strong chiaroscuro — the subject emerges from deep black shadow and most of the tile stays dark. Desaturated ashen palette (charcoal, bone, rust, tarnished iron) with ONE smoldering accent color glowing from within the subject. Weathered, cracked, scarred and blood-stained materials: old iron, cracked bone, rotting cloth, guttering candle and ember light. Faint smoke, ash and embers in the air. Coarse painterly texture with subtle film grain. One bold silhouette that still reads clearly when shrunk to 48px. Mood: dread, betrayal, secrets.

RULES: no text, no letters, no numbers, no UI frame or border, no watermark. No cute, cartoon, glossy or bright mobile-game look, no clean sci-fi glow. Dark red blood stains and drips are fine; no exposed organs or dismemberment. Original designs only — do not imitate Warcraft, StarCraft, Diablo or any existing game's art.

SUBJECTS (accent: deep blood red and ember):
1. The dark lord's command — a clawed black gauntlet pointing forward beneath a burning crimson sigil
2. Backstab — a curved dagger thrusting out from the folds of a dark cloak, blood dripping from its tip
3. Chain murder — three blood-stained daggers linked by a rusted chain, arcing in sequence
4. Soul reaver — a black scythe tearing a pale wailing soul out of a falling silhouette
5. Valiant charge — a warrior wrapped in fire lunging forward sword first, embers trailing behind
6. Essence absorption — a stream of red life essence torn from a fallen shadow into a clenched fist
7. Burning magic — a blue mana orb cracking apart as orange fire devours it
8. Source of flame — a burning heart of fire chained inside a ring of black iron runes
9. Disguise — a cracked porcelain mask with a different, darker face leering through the crack
```
파일명: 1 `skill_dantes_command` · 2 `skill_backstab` · 3 `skill_soen_chain_murder` · 4 `skill_soul_reaver` · 5 `skill_valiant_charge` · 6 `skill_essence_absorb` · 7 `skill_burning_magic` · 8 `skill_flame_source` · 9 `skill_disguise`

## S5 — 제압·보호 계열 (3×3)
```
Create ONE image: a 3×3 grid of 9 square game skill icons.

LAYOUT: 9 equal square tiles in 3 rows × 3 columns, separated by 32px solid pure magenta (#FF00FF) gutters, with a 32px magenta margin around the whole grid. Each tile is painted edge to edge (no transparency, no rounded corners). Order is left→right, top→bottom, exactly as numbered in SUBJECTS. Do not draw numbers or labels.

STYLE (identical for every tile): grim dark-fantasy game icon, gothic and ominous, painted in heavy oil on a near-black ground. Strong chiaroscuro — the subject emerges from deep black shadow and most of the tile stays dark. Desaturated ashen palette (charcoal, bone, rust, tarnished iron) with ONE smoldering accent color glowing from within the subject. Weathered, cracked, scarred and blood-stained materials: old iron, cracked bone, rotting cloth, guttering candle and ember light. Faint smoke, ash and embers in the air. Coarse painterly texture with subtle film grain. One bold silhouette that still reads clearly when shrunk to 48px. Mood: dread, betrayal, secrets.

RULES: no text, no letters, no numbers, no UI frame or border, no watermark. No cute, cartoon, glossy or bright mobile-game look, no clean sci-fi glow. Dark red blood stains and drips are fine; no exposed organs or dismemberment. Original designs only — do not imitate Warcraft, StarCraft, Diablo or any existing game's art.

SUBJECTS (accent: bruised violet for 1–3, pale bone-silver for 4–9):
1. Shadow jail — a cage of black shadow bars closing around a frozen screaming silhouette
2. Confusion — whirling occult runes circling a bowed head, clawed hands clutching at it
3. Nightmare — a sleeping face with a horned shadow creature crawling out of the darkness above it
4. Rune protection — a dome of pale silver runes shielding a kneeling figure in darkness
5. Soul wall — a translucent wall of gaunt spectral figures standing shoulder to shoulder
6. Soul recovery — a faint soul flame rekindled in two scarred cupped hands, pale green-white light
7. Bodyguard (the ogre) — a massive battered, bloodied shield planted in front of a crimson-gemmed black crown
8. Bodyguard (the dark templar) — a dark smoking blade raised in front of a crown of black thorns
9. Hard skin — a scarred muscular arm hardening into cracked stone and riveted iron
```
파일명: 1 `skill_shadow_jail` · 2 `skill_confusion` · 3 `skill_nightmare` · 4 `skill_rune_protection` · 5 `skill_soul_wall` · 6 `skill_soul_recovery` · 7 `skill_bodyguard_kelhu` · 8 `skill_bodyguard_arin` · 9 `skill_hard_skin`

## C1 — 내전 · 단테스 측 6명 (2×3)
```
Create ONE image: a 2×3 grid of 6 square character portrait icons.

LAYOUT: 6 equal square tiles in 2 rows × 3 columns, separated by 32px solid pure magenta (#FF00FF) gutters, with a 32px magenta margin around the whole grid. Each tile is painted edge to edge (no transparency, no rounded corners). Order is left→right, top→bottom, exactly as numbered in SUBJECTS. Do not draw numbers or labels.

STYLE (identical for every tile): grim dark-fantasy character portrait, bust shot turned slightly toward the viewer, painted in heavy oil on a near-black ground. Strong chiaroscuro with half of the face sunk in shadow. Desaturated ashen palette with one smoldering accent light behind the figure (a dim crimson glow). Weathered skin, scars, worn armor and cloth, haunted or menacing expression. Faint smoke, ash and embers. Coarse painterly texture with subtle film grain. Face and silhouette must read clearly when shrunk to 64px.

RULES: no text, no letters, no numbers, no UI frame or border, no watermark. No cute, cartoon, glossy or bright mobile-game look, no clean sci-fi glow. Dark red blood stains and drips are fine; no exposed organs or dismemberment. Original designs only — do not imitate Warcraft, StarCraft, Diablo or any existing game's art.

SUBJECTS:
1. Dantes, the eldest demon prince, Successor of Darkness — towering and horned, a heavy black crown fused to his horns, smoldering crimson eyes, dark leathery wings folded behind cracked obsidian armor; proud, doomed, a faint wound at his chest where a lover's blade struck
2. Mertzkiel, the second demon prince and the wisest of them — a lean fel-touched prince with small swept-back horns and faint shadowy wings, long silver hair, a scholar-archon's high collar over tarnished armor, calculating, haunted eyes
3. Kelhu, Ogre Lord — a hulking ogre with broken tusks, one crude iron pauldron, shackle scars on his wrists, a giant spiked mace; grim and battered, unbroken loyalty in his small eyes
4. Freya, drow high priestess of the god of greed — a strikingly beautiful dark-skinned elven woman, long pale hair, a tall crested headdress of gold, gold chains and coins over dark ornate robes, a cold knowing smile, a greedy red glow behind her
5. Soen, drow assassin — a dark-skinned elven woman, face half-hidden by a pointed hood and cloth mask, a scar across her lips, twin curved daggers held low, cold vengeful eyes
6. Reindila, a noble lady whose soul was bound into a banshee — translucent pale body dissolving into tattered veils below the chest, long drifting hair, hollow glowing eyes with no memory left, a faint wedding ring on a ghostly hand
```
파일명: 1 `char_dantes` · 2 `char_mertz` · 3 `char_kelhu` · 4 `char_freya` · 5 `char_soen` · 6 `char_reindila`

## C2 — 내전 · 세피 + 카이 측 5명 (2×3)
```
Create ONE image: a 2×3 grid of 6 square character portrait icons.

LAYOUT: 6 equal square tiles in 2 rows × 3 columns, separated by 32px solid pure magenta (#FF00FF) gutters, with a 32px magenta margin around the whole grid. Each tile is painted edge to edge (no transparency, no rounded corners). Order is left→right, top→bottom, exactly as numbered in SUBJECTS. Do not draw numbers or labels.

STYLE (identical for every tile): grim dark-fantasy character portrait, bust shot turned slightly toward the viewer, painted in heavy oil on a near-black ground. Strong chiaroscuro with half of the face sunk in shadow. Desaturated ashen palette with one smoldering accent light behind the figure (a dim crimson glow for tile 1, a dim deep violet glow for tiles 2–6). Weathered skin, scars, worn armor and cloth, haunted or menacing expression. Faint smoke, ash and embers. Coarse painterly texture with subtle film grain. Face and silhouette must read clearly when shrunk to 64px.

RULES: no text, no letters, no numbers, no UI frame or border, no watermark. No cute, cartoon, glossy or bright mobile-game look, no clean sci-fi glow. Dark red blood stains and drips are fine; no exposed organs or dismemberment. Original designs only — do not imitate Warcraft, StarCraft, Diablo or any existing game's art.

SUBJECTS:
1. Sephy, the greatest witch of the demon realm (crimson faction) — a pale blue-skinned demoness with curling ram horns, wild dark hair, skin cracked and glowing red at the seams, chaotic curse sigils burning around her clawed hands
2. Kai, the third demon prince, cruel and cold (violet faction) — a lean demon prince with long black hair and a crown of black thorns, faint violet sigils glowing across his skin, twin curved blades crossed behind his shoulders, eyes burning with hatred learned in the abyss
3. Arin, Dark Templar, the prince's one loyal blade (violet faction) — blackened plate engraved with violet runes, a long runed greatsword trailing violet smoke, a pale stern face, unwavering eyes
4. Tuma, ancient warden of the gate of hell, Flame Blader (violet faction) — a red-skinned tusked brute with a burning mane, two flaming blades, ash and soot on scarred skin, a savage grin
5. Krate, Doom Lord, master of necromancers (violet faction) — an ancient gaunt sorcerer with a long grey beard, deep hood and layered black robes, a staff crowned with a skull, sunken burning eyes, an old ragged wound across his chest
6. Kaspa, high priest of a shadow cult (violet faction) — a dark-skinned drow with ritual scars, bone fetishes and black feathers, spirit smoke curling from a skull-topped staff, a cruel smile
```
파일명: 1 `char_sephy` · 2 `char_kai` · 3 `char_arin` · 4 `char_tuma` · 5 `char_krate` · 6 `char_kaspa`

## C3 — 태초의 전쟁 · 지상 연합 6명 (2×3)
```
Create ONE image: a 2×3 grid of 6 square character portrait icons.

LAYOUT: 6 equal square tiles in 2 rows × 3 columns, separated by 32px solid pure magenta (#FF00FF) gutters, with a 32px magenta margin around the whole grid. Each tile is painted edge to edge (no transparency, no rounded corners). Order is left→right, top→bottom, exactly as numbered in SUBJECTS. Do not draw numbers or labels.

STYLE (identical for every tile): grim dark-fantasy character portrait, bust shot turned slightly toward the viewer, painted in heavy oil on a near-black ground. Strong chiaroscuro with half of the face sunk in shadow. Desaturated ashen palette with one smoldering accent light behind the figure (a dim pale-gold dawn glow). Weathered skin, scars, worn armor and cloth, haunted or menacing expression. Faint smoke, ash and embers. Coarse painterly texture with subtle film grain. Face and silhouette must read clearly when shrunk to 64px.

RULES: no text, no letters, no numbers, no UI frame or border, no watermark. No cute, cartoon, glossy or bright mobile-game look, no clean sci-fi glow. Dark red blood stains and drips are fine; no exposed organs or dismemberment. Original designs only — do not imitate Warcraft, StarCraft, Diablo or any existing game's art.

SUBJECTS:
1. Rael, elven hero of an ancient war — long golden hair, a mantle of smoldering phoenix feathers, worn white-and-gold robes, determined weary eyes
2. Kane, chieftain of the moon wolves — a great silver-white spirit wolf, a crescent moon mark glowing on his brow, a scarred muzzle, pale moonlit mist in his fur (an animal portrait, not a human)
3. Eoril, queen of the phoenixes — regal, a crown of burning feathers, red-gold hair like embers, robes of smoldering plumage, ash drifting around her
4. Nukelius, elder druid and ancient guardian of nature — antler-like branches growing from his brow, a moss-tangled beard, bark-like skin, robes of dead leaves, glowing green eyes
5. Tachin, forest troll chieftain — lean, long tusks, war paint, a feathered bone headdress, nets and spears, a wary hunter's stare
6. Kumarin, chieftain of the bull-headed folk — a massive horned chieftain with a braided mane, ritual totems on his chest, a great stone-headed hammer, scarred hide
```
파일명: 1 `char_rael` · 2 `char_kane` · 3 `char_eoril` · 4 `char_nukelius` · 5 `char_tachin` · 6 `char_kumarin`

## C4 — 태초의 전쟁 · 다크니스 6명 (2×3)
```
Create ONE image: a 2×3 grid of 6 square character portrait icons.

LAYOUT: 6 equal square tiles in 2 rows × 3 columns, separated by 32px solid pure magenta (#FF00FF) gutters, with a 32px magenta margin around the whole grid. Each tile is painted edge to edge (no transparency, no rounded corners). Order is left→right, top→bottom, exactly as numbered in SUBJECTS. Do not draw numbers or labels.

STYLE (identical for every tile): grim dark-fantasy character portrait, bust shot turned slightly toward the viewer, painted in heavy oil on a near-black ground. Strong chiaroscuro with half of the face sunk in shadow. Desaturated ashen palette with one smoldering accent light behind the figure (a dim blood-red glow). Weathered skin, scars, worn armor and cloth, haunted or menacing expression. Faint smoke, ash and embers. Coarse painterly texture with subtle film grain. Face and silhouette must read clearly when shrunk to 64px.

RULES: no text, no letters, no numbers, no UI frame or border, no watermark. No cute, cartoon, glossy or bright mobile-game look, no clean sci-fi glow. Dark red blood stains and drips are fine; no exposed organs or dismemberment. Original designs only — do not imitate Warcraft, StarCraft, Diablo or any existing game's art.

SUBJECTS:
1. Eltas, grand general of the demon host — black plate armor, a dragon-faced shield, a horned helm with a burning visor slit, a tattered war banner behind him
2. Sasint, warmongering overlord of the demon realm — a red-skinned demonic warlord with tusks, a spiked iron crown and pauldrons, a warmonger's grin, banners of skulls behind
3. Kilder, royal vampire — an aristocratic vampire lord with bat-like wings, pale grey skin, a high-collared regal coat, fangs, eyes glowing red
4. Drakan, wizard of the Black Tower — a skeletal wizard, a cracked skull face beneath a tall hood, rotting purple robes, a staff holding a caged green flame
5. Humily, dark priest — gaunt, shaved head with ritual tattoos, bone rosaries, black vestments, a sickle-shaped ritual knife
6. Consume, meat golem — a hulking stitched flesh golem, mismatched patched hide, hooks and chains embedded in it, a cleaver for a hand, one dull eye
```
파일명: 1 `char_eltas` · 2 `char_sasint` · 3 `char_kilder` · 4 `char_drakan` · 5 `char_hermilly` · 6 `char_consume`

## C5 — 리델루트 황야 · 가디언 6명 (2×3)
```
Create ONE image: a 2×3 grid of 6 square character portrait icons.

LAYOUT: 6 equal square tiles in 2 rows × 3 columns, separated by 32px solid pure magenta (#FF00FF) gutters, with a 32px magenta margin around the whole grid. Each tile is painted edge to edge (no transparency, no rounded corners). Order is left→right, top→bottom, exactly as numbered in SUBJECTS. Do not draw numbers or labels.

STYLE (identical for every tile): grim dark-fantasy character portrait, bust shot turned slightly toward the viewer, painted in heavy oil on a near-black ground. Strong chiaroscuro with half of the face sunk in shadow. Desaturated ashen palette with one smoldering accent light behind the figure (a dim pale silver-gold glow). Weathered skin, scars, worn armor and cloth, haunted or menacing expression. Faint smoke, ash and embers. Coarse painterly texture with subtle film grain. Face and silhouette must read clearly when shrunk to 64px.

RULES: no text, no letters, no numbers, no UI frame or border, no watermark. No cute, cartoon, glossy or bright mobile-game look, no clean sci-fi glow. Dark red blood stains and drips are fine; no exposed organs or dismemberment. Original designs only — do not imitate Warcraft, StarCraft, Diablo or any existing game's art.

SUBJECTS:
1. Shining, grand general and emperor who founded the Guardians — an aging noble commander in battered silver-gold armor, a winged helm, a heavy cloak, grey-streaked hair, burdened but unyielding eyes
2. Chizuko, half-angelic daughter of the emperor — a young sorceress with faint feathered wings of pale light, silver-blonde hair, travel-worn diplomat's robes, a faint flickering halo
3. Yui, commander of a hospitaller knight order — a woman in dented crimson-and-silver armor, bandaged forearms, a holy sigil glowing on her gauntlet, resolute eyes
4. Roneris, veteran champion of the Lord of Justice — a paladin past his prime, greying beard, heavy scarred plate armor, a great warhammer, faint holy light behind him
5. Supra, blood-elf champion, the Bloody Knight — red-lacquered armor, long pale hair, sharp elven features, a blood-stained longsword, a battle-hardened stare
6. Kamikaze, great warlord of the bull-headed folk, mind-enslaved — an old horned warrior with a braided white mane, a massive totem axe, eyes glazed with an unnatural violet glow
```
파일명: 1 `char_shining` · 2 `char_chizuko` · 3 `char_yui` · 4 `char_loneris` · 5 `char_supra` · 6 `char_kamikaze`

## C6 — 트롤 부족의 반란 · 얼음 부족 6명 (2×3)
```
Create ONE image: a 2×3 grid of 6 square character portrait icons.

LAYOUT: 6 equal square tiles in 2 rows × 3 columns, separated by 32px solid pure magenta (#FF00FF) gutters, with a 32px magenta margin around the whole grid. Each tile is painted edge to edge (no transparency, no rounded corners). Order is left→right, top→bottom, exactly as numbered in SUBJECTS. Do not draw numbers or labels.

STYLE (identical for every tile): grim dark-fantasy character portrait, bust shot turned slightly toward the viewer, painted in heavy oil on a near-black ground. Strong chiaroscuro with half of the face sunk in shadow. Desaturated ashen palette with one smoldering accent light behind the figure (a dim icy-blue glow). Weathered skin, scars, worn armor and cloth, haunted or menacing expression. Faint smoke, ash and embers. Coarse painterly texture with subtle film grain. Face and silhouette must read clearly when shrunk to 64px.

RULES: no text, no letters, no numbers, no UI frame or border, no watermark. No cute, cartoon, glossy or bright mobile-game look, no clean sci-fi glow. Dark red blood stains and drips are fine; no exposed organs or dismemberment. Original designs only — do not imitate Warcraft, StarCraft, Diablo or any existing game's art.

SUBJECTS:
1. Chis, chieftain of the ice trolls — frost-blue skin, long tusks, a bone mask pushed up on his brow, a staff of carved antler, the weary leader of a dying tribe
2. Satoshi, ice guard — a stout ice troll in furs and frost-rimed bone armor, a heavy round shield, a guardian's stern glare
3. Zwinla, ice warlord — a fierce ice troll with frost-crusted tusks, twin throwing axes, a white fur mantle, war paint
4. Hachi, elder headhunter — an old troll with grey dreadlocks, shrunken trophy heads on his belt, a long spear, a cunning old grin
5. Tokra, ice shaman — an ice troll with icicles in his braided hair, a frozen spirit totem, cold blue runes on his skin
6. Uldian, wild human beastmaster — matted hair and beard, furs and bones, a hawk perched on his shoulder, feral eyes
```
파일명: 1 `char_chis` · 2 `char_satoshi` · 3 `char_zwinra` · 4 `char_hachi` · 5 `char_tokra` · 6 `char_uldian`

## C7 — 트롤 부족의 반란 · 울피안 + 반란자 5명 (2×3)
```
Create ONE image: a 2×3 grid of 6 square character portrait icons.

LAYOUT: 6 equal square tiles in 2 rows × 3 columns, separated by 32px solid pure magenta (#FF00FF) gutters, with a 32px magenta margin around the whole grid. Each tile is painted edge to edge (no transparency, no rounded corners). Order is left→right, top→bottom, exactly as numbered in SUBJECTS. Do not draw numbers or labels.

STYLE (identical for every tile): grim dark-fantasy character portrait, bust shot turned slightly toward the viewer, painted in heavy oil on a near-black ground. Strong chiaroscuro with half of the face sunk in shadow. Desaturated ashen palette with one smoldering accent light behind the figure (a dim icy-blue glow for tile 1, a dim sickly-green glow for tiles 2–6). Weathered skin, scars, worn armor and cloth, haunted or menacing expression. Faint smoke, ash and embers. Coarse painterly texture with subtle film grain. Face and silhouette must read clearly when shrunk to 64px.

RULES: no text, no letters, no numbers, no UI frame or border, no watermark. No cute, cartoon, glossy or bright mobile-game look, no clean sci-fi glow. Dark red blood stains and drips are fine; no exposed organs or dismemberment. Original designs only — do not imitate Warcraft, StarCraft, Diablo or any existing game's art.

SUBJECTS:
1. Ulpian, wild human shapeshifter (ice side) — half-turned into a bear, claws and fur bursting from his arms, primal rage
2. Deka the Trollbane, the chieftain's traitor brother (rebels) — a lean blood-soaked troll berserker, a mad grin, notched throwing axes, pact sigils burned into his chest
3. Neonis, shadow thief and servant of a god of chaos (rebels) — a troll trickster in a cracked ritual mask, a curved dagger and hex charms, a mocking grin under the mask
4. Ka'nula, chaos shaman (rebels) — a dark troll with purple-black skin, a hood of shadows, a staff spitting sickly green chaos fire
5. Kazrow, chaos raider (rebels) — a dark troll with chaos-scarred skin, a jagged cleaver, crazed glowing eyes
6. Seirow, fanatic raider (rebels) — a dark troll zealot with ritual brands, nets and hooked spears, frothing devotion
```
파일명: 1 `char_ulpian` · 2 `char_deka` · 3 `char_neonis` · 4 `char_kanulla` · 5 `char_kazrow` · 6 `char_seirow`

---

## 나머지 모드 스킬
캐릭터는 4개 모드 42명 전부 위에 있다. 태초·리델루트·트롤 스킬 아이콘(약 100종)은 `gemini_prompts.csv`에 원작 설명과 함께 목록만 있고, 그 모드를 만들 때 위 형식(같은 STYLE·RULES 블록)으로 시트 프롬프트를 정리한다. 내전과 겹치는 스킬(공표·공격·소울 리버 등)은 위에서 만든 걸 그대로 쓴다.
