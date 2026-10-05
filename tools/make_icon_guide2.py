# GEMINI_가이드_2차.md 생성 — 태초·황야·트롤 스킬 81종 (원본 워3 아이콘을 쓰던 것 전부). 블록은 1차와 동일
import json, re

import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, 'tools/make_icon_guide.py'), encoding='utf-8').read()
GRID = re.search(r'GRID = """(.*?)"""', src, re.S).group(1)
SKILL_STYLE = re.search(r'SKILL_STYLE = """(.*?)"""', src, re.S).group(1)
RULES = re.search(r'RULES = """(.*?)"""', src, re.S).group(1)

SHEETS = [
 ("S6", "태초 · 지휘관과 리더쉽", "pale-gold dawn light for 1–5, deep blood red for 6–9", [
  ("skill_rael_leadership", "Leadership (dawn) — a tattered silver war-banner raised over a sea of spear tips catching the first pale-gold light"),
  ("skill_rael_adv_leadership", "Advanced leadership (dawn) — the same banner now burning with pale-gold flame, twice the spears, runes along the pole"),
  ("skill_rael_eoril_test", "The phoenix queen's test — a crowned knight kneeling with eyes closed as a single burning feather hovers before his face"),
  ("skill_rael_master_power", "Master's authority (dawn) — a radiant greatsword plunged straight down through a black iron crown, splitting it"),
  ("skill_kumarin_commander_guard", "Commander's guard — a long bone-tipped spear planted upright before a floating silver crown, dark-elf hand on the haft"),
  ("skill_eltas_leadership", "Leadership (darkness) — a black iron banner bearing a bleeding eye sigil, raised over jagged spears"),
  ("skill_eltas_adv_leadership", "Advanced leadership (darkness) — the black eye-banner wreathed in crimson fire, more spears, burning runes"),
  ("skill_eltas_shield", "Shield of the black knight — a massive black-iron tower shield scarred with three deep gouges, standing alone in ash"),
  ("skill_kilder_master_power", "Master's authority (darkness) — a black blade plunged through a cracked silver crown, blood running down the fuller"),
 ]),
 ("S7", "태초 · 짐승과 불꽃", "moon silver for 1–2, phoenix ember orange for 3–6, blood red for 7–9", [
  ("skill_kane_moon_protection", "Moon protection — a wolf-helmed warrior's head beneath a pale moon halo, fur and breath frosted"),
  ("skill_kane_wolfs_slash", "Wolf's slash — three savage claw gashes tearing through plate armor, moonlight on the claw tips"),
  ("skill_eoril_queens_eye", "Queen's eye — a single golden phoenix eye opening inside a swirl of flame"),
  ("skill_eoril_flame_shackle", "Flame shackle — manacles made of fire clamping shut around a struggling wrist"),
  ("skill_eoril_trial", "Trial — a lone figure walking into a corridor of flame, great fiery wings spread above the entrance"),
  ("skill_eoril_phoenix_flame", "Phoenix flame — a phoenix bursting out of a pile of ash to engulf a hulking black shape"),
  ("skill_eltas_bloody_heart", "Bloody heart — a black heart clenched in iron, pumping glowing red essence through dark veins"),
  ("skill_kilder_vampiric", "Vampiric — a fanged mouth drinking a thread of red essence from a fresh wound, pale skin"),
  ("skill_kilder_casanova", "Casanova — a black rose offered by a gloved hand, one drop of blood sliding off a petal"),
 ]),
 ("S8", "태초 · 주술과 연합", "sickly teal ghost-light for 1–5, bruised violet for 6–7, dried-rose and incense gold for 8–9", [
  ("skill_nukelius_chakra_magic", "Chakra magic — seven points of light kindling up the spine of a meditating silhouette, mana pouring outward"),
  ("skill_tachin_troll_regen", "Troll regeneration — green-grey troll flesh knitting itself closed over a deep gash"),
  ("skill_tachin_union", "Forming a union — a huge troll hand and a slender dark-elf hand clasped over a bone totem"),
  ("skill_tachin_neutralize", "Neutralizing hex — a burning curse sigil dissolving into grey ash beneath an open palm"),
  ("skill_kumarin_binding", "Binding hex — black spectral chains coiling tight around a hulking shadow"),
  ("skill_drakan_black_spell", "Black spell — a dragon-skull staff releasing a cloud of black curse smoke with faces in it"),
  ("skill_drakan_enchant_muscle", "Enchantment: muscle — a scarred arm swelling with draconic runes, veins glowing ember"),
  ("skill_hermilly_seeing_libido", "Seeing of desire — a lipstick-stained eye reflected in a cracked hand mirror, incense smoke curling"),
  ("skill_hermilly_libido_protection", "Protection of desire — a perfumed red veil wrapping a hulking brute, warding sigils glowing on the cloth"),
 ]),
 ("S9", "태초 · 사신트와 컨슘", "rust and bone", [
  ("skill_sasint_support", "Support — a cracked war-horn pouring blue mana light into a comrade's upturned cup"),
  ("skill_sasint_training", "Training — a wooden training dummy hacked to splinters, a greatsword left buried in it"),
  ("skill_sasint_battle_mastery", "Battle mastery — a veteran's scarred gauntlet gripping a blade, mastery sigils burning up the forearm"),
  ("skill_consume_slave_instinct", "Slave instinct — a collared beast lowering its head toward a floating black crown"),
  ("skill_consume_master_guard", "Master's guard — a hulking shadow with arms spread wide, standing between the viewer and a crown"),
  ("skill_consume_bodyguard", "Bodyguard (two charges) — two battered shields stacked, each with one deep notch"),
  ("skill_consume_resistance", "Resistance — curse sigils shattering harmlessly against a brute's thick hide"),
  ("skill_consume_iron_skin", "Iron skin — bare skin plated over with riveted iron scales, seams glowing dull orange"),
  ("skill_consume_final_evolution", "Final evolution — a monstrous silhouette bursting out of a cracked human-shaped shell"),
 ]),
 ("S10", "학살 · 황야의 다크니스", "blood red for 1, grey-violet mist for 2–5, warped crystal teal for 6", [
  ("skill_consume_slaughter", "Slaughter — a monstrous claw raking through a crowd of small silhouettes, arcs of blood"),
  ("skill_religious_alliance", "Religious alliance — a dark cathedral rose window with two sigils (a coin and a skull) joined by a thread of blood"),
  ("skill_dawn_mist", "Dawn mist — a grey pre-dawn mist swallowing a watching eye, only the lid still visible"),
  ("skill_charge_sense", "Charge sense — a boar-helmed charging silhouette seen through heat shimmer, hoof-tracks glowing"),
  ("skill_great_will", "Great will — a general's gauntlet pointing forward beneath a holy sigil of pale fire, an order to execute"),
  ("skill_distortion", "Distortion — a faceted truth gem warping and cracking in a clawed hand, its light bending wrong"),
  ("skill_kinship_shining", "Kinship — two wings joined at the shoulder, one white feather and one black, bound by a gold thread"),
  ("skill_join", "Join — a kneeling knight adding his shield to a growing wall of shields, four slots, one empty"),
  ("skill_chivalry", "Chivalry — a knight's sword laid flat across both palms in an oath, pale light on the blade"),
 ]),
 ("S11", "황야의 기사단", "pale silver-gold holy light", [
  ("skill_defend", "Defend — a tall kite shield with four nocks cut into its rim, blood on three of them"),
  ("skill_angel_baptism", "Angel's baptism — a half-angel's hand pouring pale light from a chalice over a bowed helm"),
  ("skill_diplomacy", "Diplomacy — a sealed letter changing hands beneath a table, one hand armored, one gloved"),
  ("skill_mass_teleport", "Mass teleport — a ring of silver runes opening in the ground, a knight stepping half out of it with sword drawn"),
  ("skill_order_founding", "Founding the order — a banner with a new crest being nailed to a ruined chapel wall"),
  ("skill_order_inquisition", "Order's inquisition — an iron chair under a single shaft of light, a hooded inquisitor's hand on its back"),
  ("skill_heresy_judgment", "Heresy judgment — a blade of pale fire splitting a heretic's black mask in two"),
  ("skill_commander_search", "Commander search — a spyglass of bone scanning a line of banners for one with a general's crest"),
  ("skill_ancient_sorcery", "Ancient sorcery — a broken gem shard being made whole by old runes spiraling up from a stone circle"),
 ]),
 ("S12", "트롤 · 얼음 부족", "icy blue for 1–6, bone white for 7–9", [
  ("skill_holy_binding", "Holy binding — chains of frost-light wrapping a roaring berserker, a tribal chieftain's staff raised"),
  ("skill_spirit_hex", "Spirit hex — an ice spirit's face forming in frost over a hidden figure's silhouette"),
  ("skill_bodyguard_chief", "Chief's bodyguard — two crossed ice-rimed tribal spears planted before a bone throne"),
  ("skill_brothers", "Brothers — two tusked troll fists bumping together, matching scars on both forearms"),
  ("skill_chief_protection", "Chief protection — an ice guard's broad frost-covered shield blocking a charging shadow"),
  ("skill_chief_search", "Chief search — frosted footprints in snow leading toward a bone throne, a lantern held low"),
  ("skill_hide", "Hide — a headhunter melting into shadow, only one eye and a bone mask edge visible"),
  ("skill_troll_venom", "Troll venom — a bone dart dripping sickly green venom, poison veins spreading"),
  ("skill_hunters_mark", "Hunter's mark — a bone-white mark burned onto a hooded figure's back, a headhunter's thrown spear"),
 ]),
 ("S13", "트롤 · 야생과 정화", "wild green for 1–4, holy frost-white for 5, chaos sickly green for 6–9", [
  ("skill_wild_essence", "Wild essence — a shaman's hand sensing a green feral aura rising from a crouched figure"),
  ("skill_wild_blessing", "Wild blessing — a wolf-pelt shaman pressing a glowing green paw-print onto a warrior's chest"),
  ("skill_wild_bond", "Wild bond — two feral humans back to back, a single green vine binding their wrists"),
  ("skill_wild_path", "Wild path — a dark forest trail lit by green fox-fire, leading toward a bone throne"),
  ("skill_purify_hex", "Purifying hex — frost-white light burning black chaos smoke out of a screaming figure"),
  ("skill_bloody_madness", "Bloody madness — a berserker's bloodshot eye with red mana veins throbbing across the face"),
  ("skill_neviathan_avatar", "Avatar of Neviathan — a shadowy sea-serpent coiling around a thief's silhouette, one glowing green eye"),
  ("skill_chaos_hex", "Chaos hex — a shaman's totem splitting a hooded figure's shadow in two, green sparks"),
  ("skill_destroyer_guidance", "Destroyer's guidance — a shaman dissolving into green flame as he hands a burning heart to a berserker"),
 ]),
 ("S14", "트롤 · 돌격대와 공통 기본", "chaos red for 1–4, tarnished gold and teal for 5–9", [
  ("skill_dark_skin", "Dark skin — troll hide darkening to blackened stone, cracks glowing red"),
  ("skill_assault_bond", "Assault bond — two chaos warriors' axes crossed, red cords binding the hafts"),
  ("skill_berserk_kazrow", "Berserk — a troll warrior mid-roar, veins bursting with red light, all weapons raised"),
  ("skill_reckless_charge", "Reckless charge — a warrior and his target both engulfed in one red explosion of impact"),
  ("skill_supreme_attack", "Supreme attack — a colossal black-iron halberd crowned with crimson fire, far beyond the greatsword"),
  ("skill_advanced_ally_check", "Advanced ally check — a weary eye behind a shield slit, ringed by floating teal runes"),
  ("skill_ally_scan", "Ally scan — a cracked crystal lens over a row of friendly banners, ghost-light picking one"),
  ("skill_enemy_scan", "Enemy scan — a cracked crystal lens over a row of enemy banners wrapped in thorns, picking one"),
  ("skill_battle_sense", "Battle sense — a warrior's ear turned to a heartbeat of crossed blades glowing in the dark"),
 ]),
]

ALIASES = {
 # 같은 개념은 한 아이콘을 같이 쓴다 (클라이언트 icons.ts SKILL_ICON_ALIAS 와 같아야 함)
 'loyal_servant': 'kai_loyal', 'essence_drain': 'essence_absorb', 'bodyguard': 'bodyguard_arin',
 'kumarin_union': 'tachin_union', 'kumarin_bodyguard': 'consume_bodyguard', 'kinship_chizuko': 'kinship_shining',
 'greater_mass_teleport': 'mass_teleport', 'troll_regeneration': 'tachin_troll_regen', 'ancient_hex_hachi': 'ancient_sorcery',
 'support': 'sasint_support', 'berserk_deka': 'berserk_kazrow', 'berserk_seirow': 'berserk_kazrow',
 'troll_ally_scan': 'ally_scan', 'troll_scan': 'scan', 'troll_enemy_scan': 'enemy_scan',
}

head = """# 가택 웹판 아이콘 — Gemini 생성 가이드 2차 (태초·황야·트롤 스킬 81종)

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
"""
out = [head]
for sid, title, accent, subs in SHEETS:
    assert len(subs) == 9, (sid, len(subs))
    lines = "\n".join(f"{i+1}. {d}" for i, (_, d) in enumerate(subs))
    prompt = "\n\n".join([GRID.format(rows=3, cols=3, n=9, what="game skill icons"), SKILL_STYLE, RULES, f"SUBJECTS (accent: {accent}):\n{lines}"])
    files = " · ".join(f"{i+1} `{f}`" for i, (f, _) in enumerate(subs))
    out.append(f"## {sid} — {title} (3×3)\n```\n{prompt}\n```\n파일명: {files}\n")
out.append("---\n\n## 같이 쓰는 아이콘 (따로 안 그림)\n| 스킬 | 쓰는 아이콘 |\n|---|---|\n" + "\n".join(f"| {k} | skill_{v} |" for k, v in ALIASES.items()) + "\n")
text = "\n".join(out)
open(os.path.join(ROOT, 'docs/art/GEMINI_가이드_2차.md'), 'w', encoding='utf-8').write(text)
json.dump(ALIASES, open(os.path.join(ROOT, 'docs/art/skill_icon_aliases.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('sheets', len(SHEETS), 'icons', sum(len(s[3]) for s in SHEETS), 'aliases', len(ALIASES))
