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
9. Priestess of desire — a blood-red veil drawn back from a pale face with hollow eyes, candlelight
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

## C1 — 캐릭터 · 단테스 측 6명 (2×3)
```
Create ONE image: a 2×3 grid of 6 square character portrait icons.

LAYOUT: 6 equal square tiles in 2 rows × 3 columns, separated by 32px solid pure magenta (#FF00FF) gutters, with a 32px magenta margin around the whole grid. Each tile is painted edge to edge (no transparency, no rounded corners). Order is left→right, top→bottom, exactly as numbered in SUBJECTS. Do not draw numbers or labels.

STYLE (identical for every tile): grim dark-fantasy character portrait, bust shot turned slightly toward the viewer, painted in heavy oil on a near-black ground. Strong chiaroscuro with half of the face sunk in shadow. Desaturated ashen palette with one smoldering accent light behind the figure (a dim crimson glow). Weathered skin, scars, worn armor and cloth, haunted or menacing expression. Faint smoke, ash and embers. Coarse painterly texture with subtle film grain. Face and silhouette must read clearly when shrunk to 64px.

RULES: no text, no letters, no numbers, no UI frame or border, no watermark. No cute, cartoon, glossy or bright mobile-game look, no clean sci-fi glow. Dark red blood stains and drips are fine; no exposed organs or dismemberment. Original designs only — do not imitate Warcraft, StarCraft, Diablo or any existing game's art.

SUBJECTS:
1. Dantes, Successor of Darkness — a gaunt demonic prince, black horned crown, smoldering crimson eyes, cracked obsidian armor
2. Mertzkiel, the Second Prince — a pale younger prince with long silver hair, haunted eyes, tarnished ornate armor
3. Kelhu, Ogre Lord — a hulking scarred ogre warlord with broken tusks, dried war paint and a matted fur mantle
4. Freya, Priestess of Greed — a priestess weighed down by gold chains and coins, jeweled veil, a cold avaricious smile
5. Soen, Drow Assassin — a dark-skinned elf assassin in a deep hood, a scar across the lips, twin curved daggers
6. Reindila, Soul Follower — a deathly pale woman with drifting soul wisps, hollow sorrowful eyes, tattered veil
```
파일명: 1 `char_dantes` · 2 `char_mertz` · 3 `char_kelhu` · 4 `char_freya` · 5 `char_soen` · 6 `char_reindila`

## C2 — 캐릭터 · 세피 + 카이 측 5명 (2×3)
```
Create ONE image: a 2×3 grid of 6 square character portrait icons.

LAYOUT: 6 equal square tiles in 2 rows × 3 columns, separated by 32px solid pure magenta (#FF00FF) gutters, with a 32px magenta margin around the whole grid. Each tile is painted edge to edge (no transparency, no rounded corners). Order is left→right, top→bottom, exactly as numbered in SUBJECTS. Do not draw numbers or labels.

STYLE (identical for every tile): grim dark-fantasy character portrait, bust shot turned slightly toward the viewer, painted in heavy oil on a near-black ground. Strong chiaroscuro with half of the face sunk in shadow. Desaturated ashen palette with one smoldering accent light behind the figure (a dim crimson glow for tile 1, a dim deep violet glow for tiles 2–6). Weathered skin, scars, worn armor and cloth, haunted or menacing expression. Faint smoke, ash and embers. Coarse painterly texture with subtle film grain. Face and silhouette must read clearly when shrunk to 64px.

RULES: no text, no letters, no numbers, no UI frame or border, no watermark. No cute, cartoon, glossy or bright mobile-game look, no clean sci-fi glow. Dark red blood stains and drips are fine; no exposed organs or dismemberment. Original designs only — do not imitate Warcraft, StarCraft, Diablo or any existing game's art.

SUBJECTS:
1. Sephy, Chaos Witch (crimson faction) — a wild-haired witch with cracked skin, chaotic red sigils burning around her clawed hands
2. Kai, Prince of Darkness (violet faction) — a cold dark prince with a violet aura, crown of black thorns, eyes like dying stars
3. Arin, Dark Templar (violet faction) — a shadow-wrapped warrior with a masked lower face and a smoking violet blade
4. Tuma, Flame Blader (violet faction) — a fierce scarred swordsman, blades and hair burning, ash on his skin
5. Krate, Doom Lord (violet faction) — a towering lord in blackened horned plate, burning eye slits, hanging chains
6. Kaspa, Dark Shaman (violet faction) — a hunched shaman with bone fetishes and ritual scars, spirit smoke rising from a skull staff
```
파일명: 1 `char_sephy` · 2 `char_kai` · 3 `char_arin` · 4 `char_tuma` · 5 `char_krate` · 6 `char_kaspa`

---

## 나머지 모드
태초·리델루트·트롤 아이콘(약 130종)은 `gemini_prompts.csv`에 원작 설명과 함께 목록만 있다. 그 모드를 만들 때 위 형식(같은 STYLE·RULES 블록)으로 시트 프롬프트를 정리한다. 내전과 겹치는 스킬(공표·공격·소울 리버 등)은 위에서 만든 걸 그대로 쓴다.
