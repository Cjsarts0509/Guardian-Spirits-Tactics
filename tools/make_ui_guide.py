# docs/art/GEMINI_UI_가이드.md 생성 — 카드 프레임·인물 반신상·모드 카드·UI 키트 (그룹별 시트 → tools/split_ui_sheets.py 로 분할)
import os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
icon_src = open(os.path.join(ROOT, 'tools/make_icon_guide.py'), encoding='utf-8').read()
# 1차 아이콘 가이드의 캐릭터 시트(C1~C7) 설명을 그대로 재사용
ns: dict = {}
exec(icon_src[: icon_src.index('head = """')], ns)
CHAR_SHEETS = [s for s in ns['SHEETS'] if s[0].startswith('C')]

# ───────────── 공통 블록 ─────────────
REF = """STYLE REFERENCE: The attached images are this game's approved logo and key art. Match their metalwork exactly — blackened silver and gunmetal forged into sharp thorns and spikes, fine engraved filigree, cracked stone texture, small faceted gems that glow from within, crimson on the left / violet on the right as the house colors. Same lighting, same darkness, same painterly realism."""

KEYED_LAYOUT = """LAYOUT: Create ONE image containing a {rows}×{cols} grid of {n} separate objects. Fill the ENTIRE background with flat pure magenta (#FF00FF) — no gradient, no texture, no shadow on the magenta. Each object sits centered in its own equal cell with at least 48px of magenta around it, never touching another object or the image edge. Order left→right, top→bottom exactly as numbered. Do not draw numbers or labels."""

FULL_LAYOUT = """LAYOUT: Create ONE image: a {rows}×{cols} grid of {n} equal {shape} tiles, separated by 32px solid pure magenta (#FF00FF) gutters, with a 32px magenta margin around the whole grid. Each tile is painted edge to edge (no transparency, no rounded corners, no frame). Order left→right, top→bottom exactly as numbered. Do not draw numbers or labels."""

FRAME_RULES = """FRAME RULES (critical):
- These are EMPTY card frames for a digital card game. The game engine draws the artwork and all text later.
- Every window marked "ART WINDOW" must be filled with the same flat pure magenta (#FF00FF) as the background — completely empty, no art, no gradient, no glow bleeding into it. Its edges are a clean sharp inner bevel.
- Every area marked "PLAQUE" is a blank dark recessed panel (very dark slate, subtle texture) — NO text, letters, runes or symbols on it.
- Every "SOCKET" is an empty round or diamond setting for a gem, slightly recessed, dark inside.
- All frames in this sheet share exactly the same outer silhouette, size, window positions and proportions; only the metal tint, ornament motif and gem color change.
- Clean symmetrical construction, crisp outer edge (no smoke, sparks or glow spilling outside the frame silhouette), front view, no perspective, no drop shadow onto the magenta."""

RULES = """RULES: no text, no letters, no numbers, no watermark, no UI mockup around the objects. No cute, cartoon, glossy or bright mobile-game look. Original designs only — do not imitate Hearthstone, Warcraft, Diablo, Magic: The Gathering or any existing game's art."""

PORTRAIT_STYLE = """STYLE (identical for every tile): grim dark-fantasy character art for a card game, HALF-BODY shot (head to waist, both shoulders and at least one hand visible), figure centered and turned slightly toward the viewer, head in the upper third with clear space above it. Painted in heavy oil, strong chiaroscuro, half of the face in shadow. Desaturated ashen palette with one smoldering accent light behind the figure ({glow}). Background: a dark, softly blurred atmospheric backdrop fitting the character (no scenery details, no horizon line), darkening toward all four edges so it blends into a card frame. Weathered skin, scars, worn armor and cloth, haunted or menacing expression. Faint smoke, ash and embers. Coarse painterly texture, subtle film grain. Must read clearly at 160px wide."""

PORTRAIT_RULES = """RULES: no text, no letters, no numbers, no card frame or border, no watermark. Nothing important within the outer 8% of each tile (it will be covered by a frame). Dark red blood stains are fine; no gore. Original designs only — do not imitate any existing game's art."""

# ───────────── 시트 정의 ─────────────
# (id, 제목, kind[keyed|full], rows, cols, 레이아웃 보충, 공통 설명, [(파일명, 설명)])
SKILL_CARD = """SHAPE: a vertical playing-card frame, aspect ratio exactly 5:7, outer edge with sharp clipped corners and thorned filigree.
- ART WINDOW: top 52% of the card, a wide pointed-arch window (gothic arch top, straight bottom).
- SOCKET top-left on the frame edge overlapping the window corner: a round gem socket (mana).
- SOCKET top-right on the frame edge: a small diamond socket (cooldown).
- PLAQUE: a narrow name banner across the bottom edge of the art window.
- PLAQUE: the lower 38% of the card, a large rectangular text box with a thin engraved border.
- A tiny empty diamond SOCKET at the bottom center edge (uses left)."""

CHAR_CARD = """SHAPE: a vertical character-card frame, aspect ratio exactly 3:4, outer edge with sharp clipped corners and thorned filigree.
- ART WINDOW: almost the whole card — inner rectangle starting 6% from the left, right and top edges, ending at 80% of the height, top edge shaped as a shallow pointed arch.
- PLAQUE: a name banner across the bottom 20%, slightly wider than the window, with a thin engraved border.
- A faction CREST sits on the top center of the frame, overlapping the window edge (described per tile).
- SOCKET: one small round gem socket at each bottom corner."""

SHEETS = [
 ("U1", "스킬 카드 프레임 8종", "keyed", 2, 4, SKILL_CARD,
  "Eight skill-card frames, one per skill category. Same shape, different metal tint, motif and gem color:", [
  ("card_skill_basic", "BASIC ACTION — tarnished gold and dark iron, simple laurel-and-thorn filigree, amber gems"),
  ("card_skill_info", "INFORMATION — pale tarnished silver, engraved eyes and lens rings along the border, sickly teal gems"),
  ("card_skill_bond", "RELATIONSHIP — dark rose-gold, intertwined vines and rings, dried-rose red gems"),
  ("card_skill_kill", "KILL / ATTACK — blackened iron with blood-red enamel, crossed blades and barbed thorns, crimson gems, faint dried blood in the engravings"),
  ("card_skill_control", "CONTROL / DISRUPT — bruised violet-black metal, chains and shackle motifs, violet gems"),
  ("card_skill_guard", "PROTECTION — bone-white and pale steel, shield and wing motifs, pale silver-white gems"),
  ("card_skill_passive", "PASSIVE — rough grey carved stone instead of metal, runes worn smooth, dull unlit gems (it never activates)"),
  ("card_skill_ultimate", "ONCE-PER-GAME ULTIMATE — the most ornate: black gold with a small spiked crown motif on the top edge, one large blazing orange gem in the mana socket"),
 ]),
 ("U2", "인물 카드 프레임 — 진영 8종", "keyed", 2, 4, CHAR_CARD,
  "Eight character-card frames, one per faction (two per game mode). Same shape; the crest, metal and gem color mark the faction:", [
  ("card_char_civil_1", "Prince Dantes' house — blackened iron with crimson enamel, crest: a horned black crown, crimson gems"),
  ("card_char_civil_2", "Prince Kai's house — dark steel with violet enamel, crest: a crown of black thorns, violet gems"),
  ("card_char_primordial_1", "Earthly alliance — weathered bronze and pale gold, crest: a rising sun over crossed spears, pale gold gems"),
  ("card_char_primordial_2", "Primordial darkness — black iron with deep blood-red enamel, crest: a bleeding eye, dark red gems"),
  ("card_char_lidellut_1", "Darkness cult of the wasteland — grey-violet tarnished silver, crest: a cracked chalice, grey-violet gems"),
  ("card_char_lidellut_2", "Guardian knights — pale silver and white gold, crest: a winged sword, silver-white gems"),
  ("card_char_troll_1", "Ice tribe — frost-rimed pale steel and bone, crest: a horned bone mask with tusks, icy blue gems"),
  ("card_char_troll_2", "Troll rebels — rusted iron and green-stained bone, crest: a broken skull with chaos runes, sickly green gems"),
 ]),
 ("U3", "인물 카드 프레임 — 지휘관 8종", "keyed", 2, 4, CHAR_CARD + "\n- COMMANDER VERSION: the crest is twice as large and crowned with spikes, the whole border is heavier and more ornate, and a thin gilded inner line runs around the art window. Otherwise identical shape and window positions to a normal frame.",
  "The same eight factions as the previous sheet, but the COMMANDER (leader) version of each frame:", [
  ("card_char_civil_1_cmd", "Prince Dantes' house — commander (crest: horned black crown, crimson)"),
  ("card_char_civil_2_cmd", "Prince Kai's house — commander (crest: crown of black thorns, violet)"),
  ("card_char_primordial_1_cmd", "Earthly alliance — commander (crest: rising sun over crossed spears, pale gold)"),
  ("card_char_primordial_2_cmd", "Primordial darkness — commander (crest: bleeding eye, blood red)"),
  ("card_char_lidellut_1_cmd", "Darkness cult — commander (crest: cracked chalice, grey-violet)"),
  ("card_char_lidellut_2_cmd", "Guardian knights — commander (crest: winged sword, silver-white)"),
  ("card_char_troll_1_cmd", "Ice tribe — commander (crest: horned bone mask, icy blue)"),
  ("card_char_troll_2_cmd", "Troll rebels — commander (crest: broken skull, sickly green)"),
 ]),
 ("U4", "카드 뒷면 4종 · 모드 카드 프레임 · 선택 테두리", "keyed", 2, 3,
  """SHAPE: tiles 1–4 are complete vertical card BACKS, aspect 3:4 (same outer silhouette as a character card), fully painted — no window. Tile 5 is an empty vertical mode-card frame, aspect 3:4. Tile 6 is a thin glowing selection outline, aspect 3:4.""",
  "Unknown-identity card backs (shown for players whose identity is hidden) and two utility frames:", [
  ("card_back_civil_war", "Card back for 'The Princes' Civil War' — black lacquer with a central split mask, left half crimson, right half violet, thorned silver border"),
  ("card_back_primordial", "Card back for 'The War of the Beginning' — dark bronze with a central eclipse (gold sun swallowed by a red eye), ancient carved border"),
  ("card_back_lidellut", "Card back for 'The Lidellut Wastes' — grey-violet silver with a central cracked chalice under a winged sword, wind-worn border"),
  ("card_back_troll", "Card back for 'The Troll Tribe Rebellion' — frosted bone and rusted iron with a central tusked mask, jagged tribal border"),
  ("card_mode_frame", "EMPTY mode-select card frame — the grandest frame: black silver with long thorns, ART WINDOW filling the top 72% (pointed arch), PLAQUE across the bottom 28%, a large empty round SOCKET on the top center"),
  ("card_select_ring", "SELECTION HIGHLIGHT — only a thin (2% of width) glowing gold-white outline following the card silhouette with tiny thorn points at the corners; everything inside and outside the line is magenta"),
 ]),
 ("U5", "모드 카드 일러스트 4종", "full", 2, 2, "", "", [
  ("mode_civil_war", "The Princes' Civil War — a cracked throne room; two demon princes (a horned one in crimson light, a thorn-crowned one in violet light) stand back-to-back with drawn blades, a broken crown on the floor between them, faces hidden in shadow"),
  ("mode_primordial", "The War of the Beginning — a mythic battlefield at the dawn of the world: a radiant golden army on a cliff facing a tide of black armored darkness under a red eclipse, ancient stone ruins"),
  ("mode_lidellut", "The Lidellut Wastes — a windswept grey wasteland at twilight, a ruined chapel; a line of silver knights with banners advancing toward hooded cultists around a corrupted altar"),
  ("mode_troll", "The Troll Tribe Rebellion — a frozen tundra village of bone and hide tents, a tusked chieftain on a bone throne in blue firelight while green-glowing rebel shamans and axe warriors charge out of a snowstorm"),
 ]),
 ("U6", "UI 키트 — 패널·버튼·입력", "keyed", 3, 3,
  """These are user-interface pieces that will be sliced and STRETCHED (9-slice): ornate decoration only in the corners and the center of each edge; the long straight runs of every border must be plain, uniform and identical along their length so they can be repeated. Interiors marked ART WINDOW are flat magenta (they become transparent); interiors marked PLAQUE are flat very dark slate.""",
  "Nine user-interface pieces, each centered in its own cell, front view:", [
  ("ui_login_panel", "LOGIN PANEL — vertical rectangle 3:4, heavy thorned silver border, a large empty round SOCKET on the top center for an emblem, interior PLAQUE"),
  ("ui_panel_large", "LARGE PANEL — wide rectangle 4:3, thin engraved silver border with small thorn ornaments in the four corners only, interior PLAQUE"),
  ("ui_panel_small", "SMALL PANEL — square, same border style as the large panel but thinner, interior PLAQUE"),
  ("ui_modal", "DIALOG FRAME — wide rectangle 16:10, double border with a crimson gem on the left edge center and a violet gem on the right edge center, interior PLAQUE"),
  ("ui_topbar", "TOP BAR — a very wide thin horizontal strip (10:1), dark iron with a small thorned crest at the center, plain straight runs elsewhere"),
  ("ui_button_primary", "PRIMARY BUTTON — wide pill-like plate 4:1 with clipped corners, dark gold rim, interior PLAQUE slightly lighter than others"),
  ("ui_button_secondary", "SECONDARY BUTTON — same shape as the primary button but plain gunmetal rim, interior PLAQUE"),
  ("ui_input", "TEXT INPUT — wide thin slot 6:1, recessed dark interior PLAQUE, thin silver rim with tiny end caps"),
  ("ui_divider", "DIVIDER — a long thin horizontal ornament (12:1): a straight silver line with a small thorned diamond in the center and tapering spikes at both ends"),
 ]),
 ("U7", "배경 4종 (로비·게임판)", "full", 2, 2, "", "", [
  ("bg_lobby", "Lobby background — the dark interior wall of a ruined gothic cathedral, tall pillars and faint rose-window light far away, mostly empty dark stone so UI panels can sit on it"),
  ("bg_table", "Game table background — top-down view of a huge cracked black stone table, candle wax drips and scattered ash at the edges, center mostly empty and dark"),
  ("bg_wall_crimson", "Side panel background (left, crimson house) — dark crimson velvet drapery and black iron, very low contrast"),
  ("bg_wall_violet", "Side panel background (right, violet house) — dark violet velvet drapery and black iron, very low contrast"),
 ]),
]

FULL_SHAPES = {"U5": ("3:4 vertical", "a 2×2 grid of 4 vertical 3:4"), "U7": ("16:9 horizontal", "")}

def sheet_prompt(sid, kind, rows, cols, extra, intro, items, accent_style=None):
    n = rows * cols
    lines = "\n".join(f"{i+1}. {d}" for i, (_, d) in enumerate(items))
    if kind == "keyed":
        parts = [REF, KEYED_LAYOUT.format(rows=rows, cols=cols, n=n), extra, FRAME_RULES, RULES, f"OBJECTS — {intro}\n{lines}"]
    else:
        shape = FULL_SHAPES[sid][0]
        style = ("STYLE: dark fantasy key art for a card game, painted in heavy oil, cinematic chiaroscuro, desaturated palette with one strong accent per tile, faces hidden in shadow, volumetric smoke and embers, painterly texture. Each tile is a complete illustration with its subject centered and nothing important within the outer 10% (a frame will cover it)."
                 if sid == "U5" else
                 "STYLE: dark fantasy game UI background, painted, very low contrast and dark so text stays readable on top, no strong focal subject, seamless-feeling edges.")
        parts = [REF, FULL_LAYOUT.format(rows=rows, cols=cols, n=n, shape=shape), style, PORTRAIT_RULES.replace("no card frame or border, ", "") if sid == "U5" else RULES, "TILES:\n" + lines]
    return "\n\n".join(p for p in parts if p)

head = """# 가택 웹판 — UI 아트 Gemini 가이드 (카드 프레임 · 인물 카드 · 모드 카드 · UI 키트)

## 방식
- **그룹별 시트로 생성 → 내가 잘라서 적용.** 시트 PNG 를 `U1.png`, `P1.png` … 처럼 시트 id 로 저장해서 주면 됨.
- **프레임은 비워서 만든다.** 그림·글자는 게임이 얹는다. 프레임의 그림 창(ART WINDOW)과 바깥은 마젠타(#FF00FF) → 잘라서 투명 처리. 글자 칸(PLAQUE)은 빈 어두운 판.
  → 그래서 스킬 설명·마나·쿨다운이 바뀌어도 이미지를 다시 만들 필요가 없고, 한글도 깨지지 않는다.
- **인물은 프레임 없이 반신상만** (3:4). 같은 인물 카드 프레임 위에 진영별로 얹는다.
- **매 시트에 레퍼런스 첨부**: 메인 엠블럼 + 서브 엠블럼 + 메인 키 비주얼 (금속·가시·크림슨/바이올렛 톤 통일용). 인물 시트(P1~P7)는 기존 초상 아이콘 해당 6장도 같이 첨부 → 얼굴·복장 유지.
- 비율 지정: 프레임 시트(U1~U3)는 **가로 16:9**, U4·U6 **4:3**, U5·U7·P 시트는 **정사각에 가깝게**(Gemini 비율 옵션에서 고름).

## 순서 (프레임 먼저 확정 → 나머지 맞추기)
1. **U1 스킬 카드 프레임** 을 마음에 들 때까지 뽑는다 (형태 기준이 됨).
2. 확정 U1 에서 2장을 레퍼런스로 추가 첨부하고 U2·U3·U4·U6.
3. 인물 P1~P7, 모드 U5, 배경 U7.

## 문제별 보정 문구 (프롬프트 끝에 한 줄)
- 그림 창에 그림을 그려 넣을 때: `The ART WINDOW must be completely empty flat magenta #FF00FF. Do not draw anything inside it.`
- 글자 칸에 룬·글자가 생길 때: `PLAQUE areas must be completely blank dark panels with no marks of any kind.`
- 프레임마다 모양이 다를 때: `All frames must have exactly the same outer silhouette and window positions; change only color, crest and ornament.`
- 테두리 밖으로 연기·빛이 번질 때: `Nothing outside the frame silhouette except flat magenta. No glow, smoke or sparks outside the frame.`

## 화면 쪽 변경 (이미지 오면 내가 할 일)
- 스킬: 지금 가로형 카드 → **세로 5:7 카드**(위 그림 창에 스킬 아이콘, 이름 띠, 아래 설명칸, 좌상단 마나 보석·우상단 쿨다운·하단 남은 횟수). 계열별 프레임은 스킬 성격으로 자동 분류.
- 플레이어: **미확인 = 모드별 카드 뒷면**, 확인/공개 = 진영 프레임 + 반신상, 지휘관은 지휘관 프레임. 선택 대상은 선택 테두리.
- 로비 모드 선택 = 모드 카드(일러스트 + 모드 프레임), 메인 로그인 = 로그인 패널, 모달·패널·버튼·입력 = UI 키트 9-slice.

---
"""

out = [head]
for sid, title, kind, rows, cols, extra, intro, items in SHEETS:
    assert len(items) == rows * cols, (sid, len(items))
    files = " · ".join(f"{i+1} `{f}`" for i, (f, _) in enumerate(items))
    tag = "마젠타 키잉(투명)" if kind == "keyed" else "칸 분할만"
    out.append(f"## {sid} — {title} ({rows}×{cols}, {tag})\n```\n{sheet_prompt(sid, kind, rows, cols, extra, intro, items)}\n```\n파일명: {files}\n")

for i, (cid, title, rows, cols, _what, _accent, glow, subs) in enumerate(CHAR_SHEETS, 1):
    pid = f"P{i}"
    n = rows * cols
    lines = "\n".join(f"{k+1}. {d}" for k, (_, d) in enumerate(subs))
    prompt = "\n\n".join([
        REF + "\nCHARACTER REFERENCE: the attached square portraits show these same characters — keep their faces, hair, horns, armor and colors, but redraw them as half-body card art.",
        FULL_LAYOUT.format(rows=rows, cols=cols, n=n, shape="vertical 3:4"),
        PORTRAIT_STYLE.format(glow=glow), PORTRAIT_RULES, "SUBJECTS:\n" + lines])
    files = " · ".join(f"{k+1} `{f.replace('char_', 'card_art_')}`" for k, (f, _) in enumerate(subs))
    out.append(f"## {pid} — 인물 반신상 · {title} ({rows}×{cols}, 칸 분할만)\n첨부: 기존 아이콘 `{cid}` 시트의 초상 6장\n```\n{prompt}\n```\n파일명: {files}\n")

text = "\n".join(out)
open(os.path.join(ROOT, 'docs/art/GEMINI_UI_가이드.md'), 'w', encoding='utf-8').write(text)
print('sheets', len(SHEETS) + len(CHAR_SHEETS), 'images', sum(len(s[7]) for s in SHEETS) + sum(len(s[7]) for s in CHAR_SHEETS), 'chars', len(text))
