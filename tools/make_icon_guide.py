# GEMINI_가이드.md 생성 (고정 블록은 시트마다 그대로 반복)
GRID = """Create ONE image: a {rows}×{cols} grid of {n} square {what}.

LAYOUT: {n} equal square tiles in {rows} rows × {cols} columns, separated by 32px solid pure magenta (#FF00FF) gutters, with a 32px magenta margin around the whole grid. Each tile is painted edge to edge (no transparency, no rounded corners). Order is left→right, top→bottom, exactly as numbered in SUBJECTS. Do not draw numbers or labels."""

SKILL_STYLE = """STYLE (identical for every tile): grim dark-fantasy game icon, gothic and ominous, painted in heavy oil on a near-black ground. Strong chiaroscuro — the subject emerges from deep black shadow and most of the tile stays dark. Desaturated ashen palette (charcoal, bone, rust, tarnished iron) with ONE smoldering accent color glowing from within the subject. Weathered, cracked, scarred and blood-stained materials: old iron, cracked bone, rotting cloth, guttering candle and ember light. Faint smoke, ash and embers in the air. Coarse painterly texture with subtle film grain. One bold silhouette that still reads clearly when shrunk to 48px. Mood: dread, betrayal, secrets."""

PORTRAIT_STYLE = """STYLE (identical for every tile): grim dark-fantasy character portrait, bust shot turned slightly toward the viewer, painted in heavy oil on a near-black ground. Strong chiaroscuro with half of the face sunk in shadow. Desaturated ashen palette with one smoldering accent light behind the figure ({glow}). Weathered skin, scars, worn armor and cloth, haunted or menacing expression. Faint smoke, ash and embers. Coarse painterly texture with subtle film grain. Face and silhouette must read clearly when shrunk to 64px."""

RULES = """RULES: no text, no letters, no numbers, no UI frame or border, no watermark. No cute, cartoon, glossy or bright mobile-game look, no clean sci-fi glow. Dark red blood stains and drips are fine; no exposed organs or dismemberment. Original designs only — do not imitate Warcraft, StarCraft, Diablo or any existing game's art."""

SHEETS = [
 ("S1", "기본 행동·진실의 보석", 3, 3, "game skill icons", "tarnished gold and old parchment", None, [
  ("skill_publish", "Proclamation — a tattered parchment decree nailed to a black oak door, sealed with dripping blood-red wax, lit by one dying candle"),
  ("skill_ally", "Alliance — two scarred gauntleted hands clasping over a blood oath, a thin red thread binding their wrists"),
  ("skill_break_ally", "Break alliance — the blood thread snapping as the two gauntlets wrench apart, drops of blood flying"),
  ("skill_attack", "Attack — a notched black dagger driving downward, its edge catching a single red gleam"),
  ("skill_advanced_attack", "Advanced attack — a massive rusted executioner's greatsword wreathed in smoldering crimson embers, far heavier than the dagger"),
  ("skill_global_chat", "Broadcast in secret — a faceless hooded herald raising a cracked bone horn, ghostly sound rings rippling through smoke"),
  ("item_truth_shard_1", "Truth shard (1 of 3) — one jagged shard of pale crystal glowing faintly in black ash"),
  ("item_truth_shard_2", "Truth shard (2 of 3) — two shards fused by molten seams into a broken gem, one third still missing"),
  ("item_truth_gem", "Truth gem (complete) — a whole faceted gem burning with cold inner light, an eye staring from within"),
 ]),
 ("S2", "정보 계열", 3, 3, "game skill icons", "sickly pale teal ghost-light", None, [
  ("skill_ally_check", "Ally check — a weary open eye peering through the slit of a battered iron shield"),
  ("skill_enemy_check", "Enemy check — a bloodshot eye caught inside a crown of black thorns"),
  ("skill_advanced_enemy_check", "Advanced enemy check — the thorn-crowned eye ringed by floating occult runes burning pale teal, more intricate"),
  ("skill_scan", "Scan — a cracked crystal lens held up by a skeletal hand, its ghost-light revealing a hooded figure"),
  ("skill_advanced_scan", "Advanced scan — the cracked lens with orbiting runes, exposing a screaming spectral face beneath a hood"),
  ("skill_oracle", "Oracle — a blind seer's bowl of black water reflecting a faintly glowing gem"),
  ("skill_shadow_eye", "Shadow eye — an eye formed from black smoke, its pupil a sliver of glowing crystal"),
  ("skill_curse", "Curse — a hex sigil seared into pale parchment, a guttering blue flame being snuffed out"),
  ("skill_libido_priestess", "Priestess of the god of greed — a gold-and-blood-red veil drawn back from a beautiful pale face, gold coins spilling, candlelight"),
 ]),
 ("S3", "관계 계열", 3, 3, "game skill icons", "faded dried-rose and tarnished gold", None, [
  ("skill_mertz_spouse", "Spouse (the prince's side) — two tarnished wedding rings, silver and obsidian, bound by a frayed crimson ribbon on cold stone"),
  ("skill_reindila_spouse", "Spouse (the soul follower's side) — two tarnished wedding rings with a pale soul flame trapped between them"),
  ("skill_kelhu_loyal", "Loyal servant of the crimson prince — a dented knight's helm bowed before a floating black iron crown set with crimson gems"),
  ("skill_kai_loyal", "Loyal servant of the dark prince — a dented knight's helm bowed before a floating crown of black thorns lit violet"),
  ("skill_warrior_scent", "Warrior's scent — a feral beast's scarred snout sniffing, scent trails curling into the shapes of blades"),
  ("skill_dantes_successor", "Name a successor — a withered dying hand passing a black crown into a gauntleted hand"),
  ("skill_successor", "Successor — a black crown hanging above an empty cracked throne in a cold shaft of light"),
  ("skill_advice", "Advice — a hooded mouth whispering into a scarred ear, a cold blue wisp between them"),
  ("skill_calmness", "Calmness — a frozen black lake under a pale moon, a single ripple at its center"),
 ]),
 ("S4", "살해·공격 계열", 3, 3, "game skill icons", "deep blood red and ember", None, [
  ("skill_dantes_command", "The dark lord's command — a clawed black gauntlet pointing forward beneath a burning crimson sigil"),
  ("skill_backstab", "Backstab — a curved dagger thrusting out from the folds of a dark cloak, blood dripping from its tip"),
  ("skill_soen_chain_murder", "Chain murder — three blood-stained daggers linked by a rusted chain, arcing in sequence"),
  ("skill_soul_reaver", "Soul reaver — a black scythe tearing a pale wailing soul out of a falling silhouette"),
  ("skill_valiant_charge", "Valiant charge — a warrior wrapped in fire lunging forward sword first, embers trailing behind"),
  ("skill_essence_absorb", "Essence absorption — a stream of red life essence torn from a fallen shadow into a clenched fist"),
  ("skill_burning_magic", "Burning magic — a blue mana orb cracking apart as orange fire devours it"),
  ("skill_flame_source", "Source of flame — a burning heart of fire chained inside a ring of black iron runes"),
  ("skill_disguise", "Disguise — a cracked porcelain mask with a different, darker face leering through the crack"),
 ]),
 ("S5", "제압·보호 계열", 3, 3, "game skill icons", "bruised violet for 1–3, pale bone-silver for 4–9", None, [
  ("skill_shadow_jail", "Shadow jail — a cage of black shadow bars closing around a frozen screaming silhouette"),
  ("skill_confusion", "Confusion — whirling occult runes circling a bowed head, clawed hands clutching at it"),
  ("skill_nightmare", "Nightmare — a sleeping face with a horned shadow creature crawling out of the darkness above it"),
  ("skill_rune_protection", "Rune protection — a dome of pale silver runes shielding a kneeling figure in darkness"),
  ("skill_soul_wall", "Soul wall — a translucent wall of gaunt spectral figures standing shoulder to shoulder"),
  ("skill_soul_recovery", "Soul recovery — a faint soul flame rekindled in two scarred cupped hands, pale green-white light"),
  ("skill_bodyguard_kelhu", "Bodyguard (the ogre) — a massive battered, bloodied shield planted in front of a crimson-gemmed black crown"),
  ("skill_bodyguard_arin", "Bodyguard (the dark templar) — a dark smoking blade raised in front of a crown of black thorns"),
  ("skill_hard_skin", "Hard skin — a scarred muscular arm hardening into cracked stone and riveted iron"),
 ]),
 ("C1", "내전 · 단테스 측 6명", 2, 3, "character portrait icons", None, "a dim crimson glow", [
  ("char_dantes", "Dantes, the eldest demon prince, Successor of Darkness — towering and horned, a heavy black crown fused to his horns, smoldering crimson eyes, dark leathery wings folded behind cracked obsidian armor; proud, doomed, a faint wound at his chest where a lover's blade struck"),
  ("char_mertz", "Mertzkiel, the second demon prince and the wisest of them — a lean fel-touched prince with small swept-back horns and faint shadowy wings, long silver hair, a scholar-archon's high collar over tarnished armor, calculating, haunted eyes"),
  ("char_kelhu", "Kelhu, Ogre Lord — a hulking ogre with broken tusks, one crude iron pauldron, shackle scars on his wrists, a giant spiked mace; grim and battered, unbroken loyalty in his small eyes"),
  ("char_freya", "Freya, drow high priestess of the god of greed — a strikingly beautiful dark-skinned elven woman, long pale hair, a tall crested headdress of gold, gold chains and coins over dark ornate robes, a cold knowing smile, a greedy red glow behind her"),
  ("char_soen", "Soen, drow assassin — a dark-skinned elven woman, face half-hidden by a pointed hood and cloth mask, a scar across her lips, twin curved daggers held low, cold vengeful eyes"),
  ("char_reindila", "Reindila, a noble lady whose soul was bound into a banshee — translucent pale body dissolving into tattered veils below the chest, long drifting hair, hollow glowing eyes with no memory left, a faint wedding ring on a ghostly hand"),
 ]),
 ("C2", "내전 · 세피 + 카이 측 5명", 2, 3, "character portrait icons", None, "a dim crimson glow for tile 1, a dim deep violet glow for tiles 2–6", [
  ("char_sephy", "Sephy, the greatest witch of the demon realm (crimson faction) — a pale blue-skinned demoness with curling ram horns, wild dark hair, skin cracked and glowing red at the seams, chaotic curse sigils burning around her clawed hands"),
  ("char_kai", "Kai, the third demon prince, cruel and cold (violet faction) — a lean demon prince with long black hair and a crown of black thorns, faint violet sigils glowing across his skin, twin curved blades crossed behind his shoulders, eyes burning with hatred learned in the abyss"),
  ("char_arin", "Arin, Dark Templar, the prince's one loyal blade (violet faction) — blackened plate engraved with violet runes, a long runed greatsword trailing violet smoke, a pale stern face, unwavering eyes"),
  ("char_tuma", "Tuma, ancient warden of the gate of hell, Flame Blader (violet faction) — a red-skinned tusked brute with a burning mane, two flaming blades, ash and soot on scarred skin, a savage grin"),
  ("char_krate", "Krate, Doom Lord, master of necromancers (violet faction) — an ancient gaunt sorcerer with a long grey beard, deep hood and layered black robes, a staff crowned with a skull, sunken burning eyes, an old ragged wound across his chest"),
  ("char_kaspa", "Kaspa, high priest of a shadow cult (violet faction) — a dark-skinned drow with ritual scars, bone fetishes and black feathers, spirit smoke curling from a skull-topped staff, a cruel smile"),
 ]),
 ("C3", "태초의 전쟁 · 지상 연합 6명", 2, 3, "character portrait icons", None, "a dim pale-gold dawn glow", [
  ("char_rael", "Rael, elven hero of an ancient war — long golden hair, a mantle of smoldering phoenix feathers, worn white-and-gold robes, determined weary eyes"),
  ("char_kane", "Kane, chieftain of the moon wolves — a great silver-white spirit wolf, a crescent moon mark glowing on his brow, a scarred muzzle, pale moonlit mist in his fur (an animal portrait, not a human)"),
  ("char_eoril", "Eoril, queen of the phoenixes — regal, a crown of burning feathers, red-gold hair like embers, robes of smoldering plumage, ash drifting around her"),
  ("char_nukelius", "Nukelius, elder druid and ancient guardian of nature — antler-like branches growing from his brow, a moss-tangled beard, bark-like skin, robes of dead leaves, glowing green eyes"),
  ("char_tachin", "Tachin, forest troll chieftain — lean, long tusks, war paint, a feathered bone headdress, nets and spears, a wary hunter's stare"),
  ("char_kumarin", "Kumarin, chieftain of the bull-headed folk — a massive horned chieftain with a braided mane, ritual totems on his chest, a great stone-headed hammer, scarred hide"),
 ]),
 ("C4", "태초의 전쟁 · 다크니스 6명", 2, 3, "character portrait icons", None, "a dim blood-red glow", [
  ("char_eltas", "Eltas, grand general of the demon host — black plate armor, a dragon-faced shield, a horned helm with a burning visor slit, a tattered war banner behind him"),
  ("char_sasint", "Sasint, warmongering overlord of the demon realm — a red-skinned demonic warlord with tusks, a spiked iron crown and pauldrons, a warmonger's grin, banners of skulls behind"),
  ("char_kilder", "Kilder, royal vampire — an aristocratic vampire lord with bat-like wings, pale grey skin, a high-collared regal coat, fangs, eyes glowing red"),
  ("char_drakan", "Drakan, wizard of the Black Tower — a skeletal wizard, a cracked skull face beneath a tall hood, rotting purple robes, a staff holding a caged green flame"),
  ("char_hermilly", "Humily, dark priest — gaunt, shaved head with ritual tattoos, bone rosaries, black vestments, a sickle-shaped ritual knife"),
  ("char_consume", "Consume, meat golem — a hulking stitched flesh golem, mismatched patched hide, hooks and chains embedded in it, a cleaver for a hand, one dull eye"),
 ]),
 ("C5", "리델루트 황야 · 가디언 6명", 2, 3, "character portrait icons", None, "a dim pale silver-gold glow", [
  ("char_shining", "Shining, grand general and emperor who founded the Guardians — an aging noble commander in battered silver-gold armor, a winged helm, a heavy cloak, grey-streaked hair, burdened but unyielding eyes"),
  ("char_chizuko", "Chizuko, half-angelic daughter of the emperor — a young sorceress with faint feathered wings of pale light, silver-blonde hair, travel-worn diplomat's robes, a faint flickering halo"),
  ("char_yui", "Yui, commander of a hospitaller knight order — a woman in dented crimson-and-silver armor, bandaged forearms, a holy sigil glowing on her gauntlet, resolute eyes"),
  ("char_loneris", "Roneris, veteran champion of the Lord of Justice — a paladin past his prime, greying beard, heavy scarred plate armor, a great warhammer, faint holy light behind him"),
  ("char_supra", "Supra, blood-elf champion, the Bloody Knight — red-lacquered armor, long pale hair, sharp elven features, a blood-stained longsword, a battle-hardened stare"),
  ("char_kamikaze", "Kamikaze, great warlord of the bull-headed folk, mind-enslaved — an old horned warrior with a braided white mane, a massive totem axe, eyes glazed with an unnatural violet glow"),
 ]),
 ("C6", "트롤 부족의 반란 · 얼음 부족 6명", 2, 3, "character portrait icons", None, "a dim icy-blue glow", [
  ("char_chis", "Chis, chieftain of the ice trolls — frost-blue skin, long tusks, a bone mask pushed up on his brow, a staff of carved antler, the weary leader of a dying tribe"),
  ("char_satoshi", "Satoshi, ice guard — a stout ice troll in furs and frost-rimed bone armor, a heavy round shield, a guardian's stern glare"),
  ("char_zwinra", "Zwinla, ice warlord — a fierce ice troll with frost-crusted tusks, twin throwing axes, a white fur mantle, war paint"),
  ("char_hachi", "Hachi, elder headhunter — an old troll with grey dreadlocks, shrunken trophy heads on his belt, a long spear, a cunning old grin"),
  ("char_tokra", "Tokra, ice shaman — an ice troll with icicles in his braided hair, a frozen spirit totem, cold blue runes on his skin"),
  ("char_uldian", "Uldian, wild human beastmaster — matted hair and beard, furs and bones, a hawk perched on his shoulder, feral eyes"),
 ]),
 ("C7", "트롤 부족의 반란 · 울피안 + 반란자 5명", 2, 3, "character portrait icons", None, "a dim icy-blue glow for tile 1, a dim sickly-green glow for tiles 2–6", [
  ("char_ulpian", "Ulpian, wild human shapeshifter (ice side) — half-turned into a bear, claws and fur bursting from his arms, primal rage"),
  ("char_deka", "Deka the Trollbane, the chieftain's traitor brother (rebels) — a lean blood-soaked troll berserker, a mad grin, notched throwing axes, pact sigils burned into his chest"),
  ("char_neonis", "Neonis, shadow thief and servant of a god of chaos (rebels) — a troll trickster in a cracked ritual mask, a curved dagger and hex charms, a mocking grin under the mask"),
  ("char_kanulla", "Ka'nula, chaos shaman (rebels) — a dark troll with purple-black skin, a hood of shadows, a staff spitting sickly green chaos fire"),
  ("char_kazrow", "Kazrow, chaos raider (rebels) — a dark troll with chaos-scarred skin, a jagged cleaver, crazed glowing eyes"),
  ("char_seirow", "Seirow, fanatic raider (rebels) — a dark troll zealot with ritual brands, nets and hooked spears, frothing devotion"),
 ]),
]

head = """# 가택 웹판 아이콘 — Gemini 생성 가이드 (다크 판타지)

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
"""

out = [head.replace("\n---\n", "\n" + open("/home/claude/gst/lore_table.md", encoding="utf-8").read() + "\n---\n", 1)]
for sid, title, rows, cols, what, accent, glow, subs in SHEETS:
    n = rows * cols
    style = SKILL_STYLE if glow is None else PORTRAIT_STYLE.format(glow=glow)
    subj_head = f"SUBJECTS (accent: {accent}):" if accent else "SUBJECTS:"
    lines = "\n".join(f"{i+1}. {d}" for i, (_, d) in enumerate(subs))
    prompt = "\n\n".join([GRID.format(rows=rows, cols=cols, n=n, what=what), style, RULES, subj_head + "\n" + lines])
    files = " · ".join(f"{i+1} `{f}`" for i, (f, _) in enumerate(subs))
    out.append(f"## {sid} — {title} ({rows}×{cols})\n```\n{prompt}\n```\n파일명: {files}\n")
out.append("""---

## 나머지 모드 스킬
캐릭터는 4개 모드 42명 전부 위에 있다. 태초·리델루트·트롤 스킬 아이콘(약 100종)은 `gemini_prompts.csv`에 원작 설명과 함께 목록만 있고, 그 모드를 만들 때 위 형식(같은 STYLE·RULES 블록)으로 시트 프롬프트를 정리한다. 내전과 겹치는 스킬(공표·공격·소울 리버 등)은 위에서 만든 걸 그대로 쓴다.
""")
open('/home/claude/gst/pack_static/GEMINI_가이드.md', 'w', encoding='utf-8').write("\n".join(out))
total = sum(len(s[7]) for s in SHEETS)
print('sheets', len(SHEETS), 'icons', total)

import json
json.dump({f: d for _s in SHEETS for f, d in _s[7]}, open('/home/claude/gst/subjects.json', 'w'), ensure_ascii=False, indent=1)
