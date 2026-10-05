# 가택 웹판 아이콘 — Gemini 생성 가이드 2차 (태초·황야·트롤 스킬 81종)

1차(`GEMINI_가이드.md`)와 같은 방식·같은 STYLE·RULES 블록. 1차에서 확정한 아이콘 2~3장을 **매 시트 프롬프트 맨 앞에 첨부**해서 같은 작가가 그린 것처럼 맞춘다:

```
STYLE REFERENCE: The attached images are icons already approved for this set. Match their rendering, brushwork, darkness level, lighting direction, edge shadow and color treatment exactly, so the new icons look like the same artist made them. Do not copy their subjects or compositions.
```

- 시트 9장 (S6~S14, 각 3×3). 순서·개수 엄수, 칸 사이 마젠타(#FF00FF) 32px.
- 결과물은 `gen_icons/master/<파일명>.png` 로 잘라 넣고 `python tools/build_web_icons.py gen_icons/master icons_pack` 실행 → 원본 아이콘을 자동으로 밀어낸다.
- 같은 개념의 스킬 15종(트롤 스캔류, 광폭화 3종, 지원, 보디가드 등)은 아래 표의 아이콘을 같이 쓰므로 따로 안 그린다.

## 보정 문구
- 너무 밝을 때: `Make it darker and grimmer: crush the shadows toward black, desaturate everything except the single accent glow, add more grime, scratches and smoke.`
- 48px에서 안 보일 때: `Keep the dark mood but strengthen the rim light and the accent glow on the subject's outline so the silhouette separates clearly from the background.`
- 칸마다 그림체가 다를 때: `All tiles must share exactly the same brushwork, lighting direction and darkness level, as if painted in one session.`

---

## S6 — 태초 · 지휘관과 리더쉽 (3×3)
```
Create ONE image: a 3×3 grid of 9 square game skill icons.

LAYOUT: 9 equal square tiles in 3 rows × 3 columns, separated by 32px solid pure magenta (#FF00FF) gutters, with a 32px magenta margin around the whole grid. Each tile is painted edge to edge (no transparency, no rounded corners). Order is left→right, top→bottom, exactly as numbered in SUBJECTS. Do not draw numbers or labels.

STYLE (identical for every tile): grim dark-fantasy game icon, gothic and ominous, painted in heavy oil on a near-black ground. Strong chiaroscuro — the subject emerges from deep black shadow and most of the tile stays dark. Desaturated ashen palette (charcoal, bone, rust, tarnished iron) with ONE smoldering accent color glowing from within the subject. Weathered, cracked, scarred and blood-stained materials: old iron, cracked bone, rotting cloth, guttering candle and ember light. Faint smoke, ash and embers in the air. Coarse painterly texture with subtle film grain. One bold silhouette that still reads clearly when shrunk to 48px. Mood: dread, betrayal, secrets.

RULES: no text, no letters, no numbers, no UI frame or border, no watermark. No cute, cartoon, glossy or bright mobile-game look, no clean sci-fi glow. Dark red blood stains and drips are fine; no exposed organs or dismemberment. Original designs only — do not imitate Warcraft, StarCraft, Diablo or any existing game's art.

SUBJECTS (accent: pale-gold dawn light for 1–5, deep blood red for 6–9):
1. Leadership (dawn) — a tattered silver war-banner raised over a sea of spear tips catching the first pale-gold light
2. Advanced leadership (dawn) — the same banner now burning with pale-gold flame, twice the spears, runes along the pole
3. The phoenix queen's test — a crowned knight kneeling with eyes closed as a single burning feather hovers before his face
4. Master's authority (dawn) — a radiant greatsword plunged straight down through a black iron crown, splitting it
5. Commander's guard — a long bone-tipped spear planted upright before a floating silver crown, dark-elf hand on the haft
6. Leadership (darkness) — a black iron banner bearing a bleeding eye sigil, raised over jagged spears
7. Advanced leadership (darkness) — the black eye-banner wreathed in crimson fire, more spears, burning runes
8. Shield of the black knight — a massive black-iron tower shield scarred with three deep gouges, standing alone in ash
9. Master's authority (darkness) — a black blade plunged through a cracked silver crown, blood running down the fuller
```
파일명: 1 `skill_rael_leadership` · 2 `skill_rael_adv_leadership` · 3 `skill_rael_eoril_test` · 4 `skill_rael_master_power` · 5 `skill_kumarin_commander_guard` · 6 `skill_eltas_leadership` · 7 `skill_eltas_adv_leadership` · 8 `skill_eltas_shield` · 9 `skill_kilder_master_power`

## S7 — 태초 · 짐승과 불꽃 (3×3)
```
Create ONE image: a 3×3 grid of 9 square game skill icons.

LAYOUT: 9 equal square tiles in 3 rows × 3 columns, separated by 32px solid pure magenta (#FF00FF) gutters, with a 32px magenta margin around the whole grid. Each tile is painted edge to edge (no transparency, no rounded corners). Order is left→right, top→bottom, exactly as numbered in SUBJECTS. Do not draw numbers or labels.

STYLE (identical for every tile): grim dark-fantasy game icon, gothic and ominous, painted in heavy oil on a near-black ground. Strong chiaroscuro — the subject emerges from deep black shadow and most of the tile stays dark. Desaturated ashen palette (charcoal, bone, rust, tarnished iron) with ONE smoldering accent color glowing from within the subject. Weathered, cracked, scarred and blood-stained materials: old iron, cracked bone, rotting cloth, guttering candle and ember light. Faint smoke, ash and embers in the air. Coarse painterly texture with subtle film grain. One bold silhouette that still reads clearly when shrunk to 48px. Mood: dread, betrayal, secrets.

RULES: no text, no letters, no numbers, no UI frame or border, no watermark. No cute, cartoon, glossy or bright mobile-game look, no clean sci-fi glow. Dark red blood stains and drips are fine; no exposed organs or dismemberment. Original designs only — do not imitate Warcraft, StarCraft, Diablo or any existing game's art.

SUBJECTS (accent: moon silver for 1–2, phoenix ember orange for 3–6, blood red for 7–9):
1. Moon protection — a wolf-helmed warrior's head beneath a pale moon halo, fur and breath frosted
2. Wolf's slash — three savage claw gashes tearing through plate armor, moonlight on the claw tips
3. Queen's eye — a single golden phoenix eye opening inside a swirl of flame
4. Flame shackle — manacles made of fire clamping shut around a struggling wrist
5. Trial — a lone figure walking into a corridor of flame, great fiery wings spread above the entrance
6. Phoenix flame — a phoenix bursting out of a pile of ash to engulf a hulking black shape
7. Bloody heart — a black heart clenched in iron, pumping glowing red essence through dark veins
8. Vampiric — a fanged mouth drinking a thread of red essence from a fresh wound, pale skin
9. Casanova — a black rose offered by a gloved hand, one drop of blood sliding off a petal
```
파일명: 1 `skill_kane_moon_protection` · 2 `skill_kane_wolfs_slash` · 3 `skill_eoril_queens_eye` · 4 `skill_eoril_flame_shackle` · 5 `skill_eoril_trial` · 6 `skill_eoril_phoenix_flame` · 7 `skill_eltas_bloody_heart` · 8 `skill_kilder_vampiric` · 9 `skill_kilder_casanova`

## S8 — 태초 · 주술과 연합 (3×3)
```
Create ONE image: a 3×3 grid of 9 square game skill icons.

LAYOUT: 9 equal square tiles in 3 rows × 3 columns, separated by 32px solid pure magenta (#FF00FF) gutters, with a 32px magenta margin around the whole grid. Each tile is painted edge to edge (no transparency, no rounded corners). Order is left→right, top→bottom, exactly as numbered in SUBJECTS. Do not draw numbers or labels.

STYLE (identical for every tile): grim dark-fantasy game icon, gothic and ominous, painted in heavy oil on a near-black ground. Strong chiaroscuro — the subject emerges from deep black shadow and most of the tile stays dark. Desaturated ashen palette (charcoal, bone, rust, tarnished iron) with ONE smoldering accent color glowing from within the subject. Weathered, cracked, scarred and blood-stained materials: old iron, cracked bone, rotting cloth, guttering candle and ember light. Faint smoke, ash and embers in the air. Coarse painterly texture with subtle film grain. One bold silhouette that still reads clearly when shrunk to 48px. Mood: dread, betrayal, secrets.

RULES: no text, no letters, no numbers, no UI frame or border, no watermark. No cute, cartoon, glossy or bright mobile-game look, no clean sci-fi glow. Dark red blood stains and drips are fine; no exposed organs or dismemberment. Original designs only — do not imitate Warcraft, StarCraft, Diablo or any existing game's art.

SUBJECTS (accent: sickly teal ghost-light for 1–5, bruised violet for 6–7, dried-rose and incense gold for 8–9):
1. Chakra magic — seven points of light kindling up the spine of a meditating silhouette, mana pouring outward
2. Troll regeneration — green-grey troll flesh knitting itself closed over a deep gash
3. Forming a union — a huge troll hand and a slender dark-elf hand clasped over a bone totem
4. Neutralizing hex — a burning curse sigil dissolving into grey ash beneath an open palm
5. Binding hex — black spectral chains coiling tight around a hulking shadow
6. Black spell — a dragon-skull staff releasing a cloud of black curse smoke with faces in it
7. Enchantment: muscle — a scarred arm swelling with draconic runes, veins glowing ember
8. Seeing of desire — a lipstick-stained eye reflected in a cracked hand mirror, incense smoke curling
9. Protection of desire — a perfumed red veil wrapping a hulking brute, warding sigils glowing on the cloth
```
파일명: 1 `skill_nukelius_chakra_magic` · 2 `skill_tachin_troll_regen` · 3 `skill_tachin_union` · 4 `skill_tachin_neutralize` · 5 `skill_kumarin_binding` · 6 `skill_drakan_black_spell` · 7 `skill_drakan_enchant_muscle` · 8 `skill_hermilly_seeing_libido` · 9 `skill_hermilly_libido_protection`

## S9 — 태초 · 사신트와 컨슘 (3×3)
```
Create ONE image: a 3×3 grid of 9 square game skill icons.

LAYOUT: 9 equal square tiles in 3 rows × 3 columns, separated by 32px solid pure magenta (#FF00FF) gutters, with a 32px magenta margin around the whole grid. Each tile is painted edge to edge (no transparency, no rounded corners). Order is left→right, top→bottom, exactly as numbered in SUBJECTS. Do not draw numbers or labels.

STYLE (identical for every tile): grim dark-fantasy game icon, gothic and ominous, painted in heavy oil on a near-black ground. Strong chiaroscuro — the subject emerges from deep black shadow and most of the tile stays dark. Desaturated ashen palette (charcoal, bone, rust, tarnished iron) with ONE smoldering accent color glowing from within the subject. Weathered, cracked, scarred and blood-stained materials: old iron, cracked bone, rotting cloth, guttering candle and ember light. Faint smoke, ash and embers in the air. Coarse painterly texture with subtle film grain. One bold silhouette that still reads clearly when shrunk to 48px. Mood: dread, betrayal, secrets.

RULES: no text, no letters, no numbers, no UI frame or border, no watermark. No cute, cartoon, glossy or bright mobile-game look, no clean sci-fi glow. Dark red blood stains and drips are fine; no exposed organs or dismemberment. Original designs only — do not imitate Warcraft, StarCraft, Diablo or any existing game's art.

SUBJECTS (accent: rust and bone):
1. Support — a cracked war-horn pouring blue mana light into a comrade's upturned cup
2. Training — a wooden training dummy hacked to splinters, a greatsword left buried in it
3. Battle mastery — a veteran's scarred gauntlet gripping a blade, mastery sigils burning up the forearm
4. Slave instinct — a collared beast lowering its head toward a floating black crown
5. Master's guard — a hulking shadow with arms spread wide, standing between the viewer and a crown
6. Bodyguard (two charges) — two battered shields stacked, each with one deep notch
7. Resistance — curse sigils shattering harmlessly against a brute's thick hide
8. Iron skin — bare skin plated over with riveted iron scales, seams glowing dull orange
9. Final evolution — a monstrous silhouette bursting out of a cracked human-shaped shell
```
파일명: 1 `skill_sasint_support` · 2 `skill_sasint_training` · 3 `skill_sasint_battle_mastery` · 4 `skill_consume_slave_instinct` · 5 `skill_consume_master_guard` · 6 `skill_consume_bodyguard` · 7 `skill_consume_resistance` · 8 `skill_consume_iron_skin` · 9 `skill_consume_final_evolution`

## S10 — 학살 · 황야의 다크니스 (3×3)
```
Create ONE image: a 3×3 grid of 9 square game skill icons.

LAYOUT: 9 equal square tiles in 3 rows × 3 columns, separated by 32px solid pure magenta (#FF00FF) gutters, with a 32px magenta margin around the whole grid. Each tile is painted edge to edge (no transparency, no rounded corners). Order is left→right, top→bottom, exactly as numbered in SUBJECTS. Do not draw numbers or labels.

STYLE (identical for every tile): grim dark-fantasy game icon, gothic and ominous, painted in heavy oil on a near-black ground. Strong chiaroscuro — the subject emerges from deep black shadow and most of the tile stays dark. Desaturated ashen palette (charcoal, bone, rust, tarnished iron) with ONE smoldering accent color glowing from within the subject. Weathered, cracked, scarred and blood-stained materials: old iron, cracked bone, rotting cloth, guttering candle and ember light. Faint smoke, ash and embers in the air. Coarse painterly texture with subtle film grain. One bold silhouette that still reads clearly when shrunk to 48px. Mood: dread, betrayal, secrets.

RULES: no text, no letters, no numbers, no UI frame or border, no watermark. No cute, cartoon, glossy or bright mobile-game look, no clean sci-fi glow. Dark red blood stains and drips are fine; no exposed organs or dismemberment. Original designs only — do not imitate Warcraft, StarCraft, Diablo or any existing game's art.

SUBJECTS (accent: blood red for 1, grey-violet mist for 2–5, warped crystal teal for 6):
1. Slaughter — a monstrous claw raking through a crowd of small silhouettes, arcs of blood
2. Religious alliance — a dark cathedral rose window with two sigils (a coin and a skull) joined by a thread of blood
3. Dawn mist — a grey pre-dawn mist swallowing a watching eye, only the lid still visible
4. Charge sense — a boar-helmed charging silhouette seen through heat shimmer, hoof-tracks glowing
5. Great will — a general's gauntlet pointing forward beneath a holy sigil of pale fire, an order to execute
6. Distortion — a faceted truth gem warping and cracking in a clawed hand, its light bending wrong
7. Kinship — two wings joined at the shoulder, one white feather and one black, bound by a gold thread
8. Join — a kneeling knight adding his shield to a growing wall of shields, four slots, one empty
9. Chivalry — a knight's sword laid flat across both palms in an oath, pale light on the blade
```
파일명: 1 `skill_consume_slaughter` · 2 `skill_religious_alliance` · 3 `skill_dawn_mist` · 4 `skill_charge_sense` · 5 `skill_great_will` · 6 `skill_distortion` · 7 `skill_kinship_shining` · 8 `skill_join` · 9 `skill_chivalry`

## S11 — 황야의 기사단 (3×3)
```
Create ONE image: a 3×3 grid of 9 square game skill icons.

LAYOUT: 9 equal square tiles in 3 rows × 3 columns, separated by 32px solid pure magenta (#FF00FF) gutters, with a 32px magenta margin around the whole grid. Each tile is painted edge to edge (no transparency, no rounded corners). Order is left→right, top→bottom, exactly as numbered in SUBJECTS. Do not draw numbers or labels.

STYLE (identical for every tile): grim dark-fantasy game icon, gothic and ominous, painted in heavy oil on a near-black ground. Strong chiaroscuro — the subject emerges from deep black shadow and most of the tile stays dark. Desaturated ashen palette (charcoal, bone, rust, tarnished iron) with ONE smoldering accent color glowing from within the subject. Weathered, cracked, scarred and blood-stained materials: old iron, cracked bone, rotting cloth, guttering candle and ember light. Faint smoke, ash and embers in the air. Coarse painterly texture with subtle film grain. One bold silhouette that still reads clearly when shrunk to 48px. Mood: dread, betrayal, secrets.

RULES: no text, no letters, no numbers, no UI frame or border, no watermark. No cute, cartoon, glossy or bright mobile-game look, no clean sci-fi glow. Dark red blood stains and drips are fine; no exposed organs or dismemberment. Original designs only — do not imitate Warcraft, StarCraft, Diablo or any existing game's art.

SUBJECTS (accent: pale silver-gold holy light):
1. Defend — a tall kite shield with four nocks cut into its rim, blood on three of them
2. Angel's baptism — a half-angel's hand pouring pale light from a chalice over a bowed helm
3. Diplomacy — a sealed letter changing hands beneath a table, one hand armored, one gloved
4. Mass teleport — a ring of silver runes opening in the ground, a knight stepping half out of it with sword drawn
5. Founding the order — a banner with a new crest being nailed to a ruined chapel wall
6. Order's inquisition — an iron chair under a single shaft of light, a hooded inquisitor's hand on its back
7. Heresy judgment — a blade of pale fire splitting a heretic's black mask in two
8. Commander search — a spyglass of bone scanning a line of banners for one with a general's crest
9. Ancient sorcery — a broken gem shard being made whole by old runes spiraling up from a stone circle
```
파일명: 1 `skill_defend` · 2 `skill_angel_baptism` · 3 `skill_diplomacy` · 4 `skill_mass_teleport` · 5 `skill_order_founding` · 6 `skill_order_inquisition` · 7 `skill_heresy_judgment` · 8 `skill_commander_search` · 9 `skill_ancient_sorcery`

## S12 — 트롤 · 얼음 부족 (3×3)
```
Create ONE image: a 3×3 grid of 9 square game skill icons.

LAYOUT: 9 equal square tiles in 3 rows × 3 columns, separated by 32px solid pure magenta (#FF00FF) gutters, with a 32px magenta margin around the whole grid. Each tile is painted edge to edge (no transparency, no rounded corners). Order is left→right, top→bottom, exactly as numbered in SUBJECTS. Do not draw numbers or labels.

STYLE (identical for every tile): grim dark-fantasy game icon, gothic and ominous, painted in heavy oil on a near-black ground. Strong chiaroscuro — the subject emerges from deep black shadow and most of the tile stays dark. Desaturated ashen palette (charcoal, bone, rust, tarnished iron) with ONE smoldering accent color glowing from within the subject. Weathered, cracked, scarred and blood-stained materials: old iron, cracked bone, rotting cloth, guttering candle and ember light. Faint smoke, ash and embers in the air. Coarse painterly texture with subtle film grain. One bold silhouette that still reads clearly when shrunk to 48px. Mood: dread, betrayal, secrets.

RULES: no text, no letters, no numbers, no UI frame or border, no watermark. No cute, cartoon, glossy or bright mobile-game look, no clean sci-fi glow. Dark red blood stains and drips are fine; no exposed organs or dismemberment. Original designs only — do not imitate Warcraft, StarCraft, Diablo or any existing game's art.

SUBJECTS (accent: icy blue for 1–6, bone white for 7–9):
1. Holy binding — chains of frost-light wrapping a roaring berserker, a tribal chieftain's staff raised
2. Spirit hex — an ice spirit's face forming in frost over a hidden figure's silhouette
3. Chief's bodyguard — two crossed ice-rimed tribal spears planted before a bone throne
4. Brothers — two tusked troll fists bumping together, matching scars on both forearms
5. Chief protection — an ice guard's broad frost-covered shield blocking a charging shadow
6. Chief search — frosted footprints in snow leading toward a bone throne, a lantern held low
7. Hide — a headhunter melting into shadow, only one eye and a bone mask edge visible
8. Troll venom — a bone dart dripping sickly green venom, poison veins spreading
9. Hunter's mark — a bone-white mark burned onto a hooded figure's back, a headhunter's thrown spear
```
파일명: 1 `skill_holy_binding` · 2 `skill_spirit_hex` · 3 `skill_bodyguard_chief` · 4 `skill_brothers` · 5 `skill_chief_protection` · 6 `skill_chief_search` · 7 `skill_hide` · 8 `skill_troll_venom` · 9 `skill_hunters_mark`

## S13 — 트롤 · 야생과 정화 (3×3)
```
Create ONE image: a 3×3 grid of 9 square game skill icons.

LAYOUT: 9 equal square tiles in 3 rows × 3 columns, separated by 32px solid pure magenta (#FF00FF) gutters, with a 32px magenta margin around the whole grid. Each tile is painted edge to edge (no transparency, no rounded corners). Order is left→right, top→bottom, exactly as numbered in SUBJECTS. Do not draw numbers or labels.

STYLE (identical for every tile): grim dark-fantasy game icon, gothic and ominous, painted in heavy oil on a near-black ground. Strong chiaroscuro — the subject emerges from deep black shadow and most of the tile stays dark. Desaturated ashen palette (charcoal, bone, rust, tarnished iron) with ONE smoldering accent color glowing from within the subject. Weathered, cracked, scarred and blood-stained materials: old iron, cracked bone, rotting cloth, guttering candle and ember light. Faint smoke, ash and embers in the air. Coarse painterly texture with subtle film grain. One bold silhouette that still reads clearly when shrunk to 48px. Mood: dread, betrayal, secrets.

RULES: no text, no letters, no numbers, no UI frame or border, no watermark. No cute, cartoon, glossy or bright mobile-game look, no clean sci-fi glow. Dark red blood stains and drips are fine; no exposed organs or dismemberment. Original designs only — do not imitate Warcraft, StarCraft, Diablo or any existing game's art.

SUBJECTS (accent: wild green for 1–4, holy frost-white for 5, chaos sickly green for 6–9):
1. Wild essence — a shaman's hand sensing a green feral aura rising from a crouched figure
2. Wild blessing — a wolf-pelt shaman pressing a glowing green paw-print onto a warrior's chest
3. Wild bond — two feral humans back to back, a single green vine binding their wrists
4. Wild path — a dark forest trail lit by green fox-fire, leading toward a bone throne
5. Purifying hex — frost-white light burning black chaos smoke out of a screaming figure
6. Bloody madness — a berserker's bloodshot eye with red mana veins throbbing across the face
7. Avatar of Neviathan — a shadowy sea-serpent coiling around a thief's silhouette, one glowing green eye
8. Chaos hex — a shaman's totem splitting a hooded figure's shadow in two, green sparks
9. Destroyer's guidance — a shaman dissolving into green flame as he hands a burning heart to a berserker
```
파일명: 1 `skill_wild_essence` · 2 `skill_wild_blessing` · 3 `skill_wild_bond` · 4 `skill_wild_path` · 5 `skill_purify_hex` · 6 `skill_bloody_madness` · 7 `skill_neviathan_avatar` · 8 `skill_chaos_hex` · 9 `skill_destroyer_guidance`

## S14 — 트롤 · 돌격대와 공통 기본 (3×3)
```
Create ONE image: a 3×3 grid of 9 square game skill icons.

LAYOUT: 9 equal square tiles in 3 rows × 3 columns, separated by 32px solid pure magenta (#FF00FF) gutters, with a 32px magenta margin around the whole grid. Each tile is painted edge to edge (no transparency, no rounded corners). Order is left→right, top→bottom, exactly as numbered in SUBJECTS. Do not draw numbers or labels.

STYLE (identical for every tile): grim dark-fantasy game icon, gothic and ominous, painted in heavy oil on a near-black ground. Strong chiaroscuro — the subject emerges from deep black shadow and most of the tile stays dark. Desaturated ashen palette (charcoal, bone, rust, tarnished iron) with ONE smoldering accent color glowing from within the subject. Weathered, cracked, scarred and blood-stained materials: old iron, cracked bone, rotting cloth, guttering candle and ember light. Faint smoke, ash and embers in the air. Coarse painterly texture with subtle film grain. One bold silhouette that still reads clearly when shrunk to 48px. Mood: dread, betrayal, secrets.

RULES: no text, no letters, no numbers, no UI frame or border, no watermark. No cute, cartoon, glossy or bright mobile-game look, no clean sci-fi glow. Dark red blood stains and drips are fine; no exposed organs or dismemberment. Original designs only — do not imitate Warcraft, StarCraft, Diablo or any existing game's art.

SUBJECTS (accent: chaos red for 1–4, tarnished gold and teal for 5–9):
1. Dark skin — troll hide darkening to blackened stone, cracks glowing red
2. Assault bond — two chaos warriors' axes crossed, red cords binding the hafts
3. Berserk — a troll warrior mid-roar, veins bursting with red light, all weapons raised
4. Reckless charge — a warrior and his target both engulfed in one red explosion of impact
5. Supreme attack — a colossal black-iron halberd crowned with crimson fire, far beyond the greatsword
6. Advanced ally check — a weary eye behind a shield slit, ringed by floating teal runes
7. Ally scan — a cracked crystal lens over a row of friendly banners, ghost-light picking one
8. Enemy scan — a cracked crystal lens over a row of enemy banners wrapped in thorns, picking one
9. Battle sense — a warrior's ear turned to a heartbeat of crossed blades glowing in the dark
```
파일명: 1 `skill_dark_skin` · 2 `skill_assault_bond` · 3 `skill_berserk_kazrow` · 4 `skill_reckless_charge` · 5 `skill_supreme_attack` · 6 `skill_advanced_ally_check` · 7 `skill_ally_scan` · 8 `skill_enemy_scan` · 9 `skill_battle_sense`

---

## 같이 쓰는 아이콘 (따로 안 그림)
| 스킬 | 쓰는 아이콘 |
|---|---|
| loyal_servant | skill_kai_loyal |
| essence_drain | skill_essence_absorb |
| bodyguard | skill_bodyguard_arin |
| kumarin_union | skill_tachin_union |
| kumarin_bodyguard | skill_consume_bodyguard |
| kinship_chizuko | skill_kinship_shining |
| greater_mass_teleport | skill_mass_teleport |
| troll_regeneration | skill_tachin_troll_regen |
| ancient_hex_hachi | skill_ancient_sorcery |
| support | skill_sasint_support |
| berserk_deka | skill_berserk_kazrow |
| berserk_seirow | skill_berserk_kazrow |
| troll_ally_scan | skill_ally_scan |
| troll_scan | skill_scan |
| troll_enemy_scan | skill_enemy_scan |
