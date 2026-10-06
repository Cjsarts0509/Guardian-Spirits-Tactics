# 가택 웹판 — UI 아트 Gemini 가이드 (카드 프레임 · 인물 카드 · 모드 카드 · UI 키트)

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

## U1 — 스킬 카드 프레임 8종 (2×4, 마젠타 키잉(투명))
```
STYLE REFERENCE: The attached images are this game's approved logo and key art. Match their metalwork exactly — blackened silver and gunmetal forged into sharp thorns and spikes, fine engraved filigree, cracked stone texture, small faceted gems that glow from within, crimson on the left / violet on the right as the house colors. Same lighting, same darkness, same painterly realism.

LAYOUT: Create ONE image containing a 2×4 grid of 8 separate objects. Fill the ENTIRE background with flat pure magenta (#FF00FF) — no gradient, no texture, no shadow on the magenta. Each object sits centered in its own equal cell with at least 48px of magenta around it, never touching another object or the image edge. Order left→right, top→bottom exactly as numbered. Do not draw numbers or labels.

SHAPE: a vertical playing-card frame, aspect ratio exactly 5:7, outer edge with sharp clipped corners and thorned filigree.
- ART WINDOW: top 52% of the card, a wide pointed-arch window (gothic arch top, straight bottom).
- SOCKET top-left on the frame edge overlapping the window corner: a round gem socket (mana).
- SOCKET top-right on the frame edge: a small diamond socket (cooldown).
- PLAQUE: a narrow name banner across the bottom edge of the art window.
- PLAQUE: the lower 38% of the card, a large rectangular text box with a thin engraved border.
- A tiny empty diamond SOCKET at the bottom center edge (uses left).

FRAME RULES (critical):
- These are EMPTY card frames for a digital card game. The game engine draws the artwork and all text later.
- Every window marked "ART WINDOW" must be filled with the same flat pure magenta (#FF00FF) as the background — completely empty, no art, no gradient, no glow bleeding into it. Its edges are a clean sharp inner bevel.
- Every area marked "PLAQUE" is a blank dark recessed panel (very dark slate, subtle texture) — NO text, letters, runes or symbols on it.
- Every "SOCKET" is an empty round or diamond setting for a gem, slightly recessed, dark inside.
- All frames in this sheet share exactly the same outer silhouette, size, window positions and proportions; only the metal tint, ornament motif and gem color change.
- Clean symmetrical construction, crisp outer edge (no smoke, sparks or glow spilling outside the frame silhouette), front view, no perspective, no drop shadow onto the magenta.

RULES: no text, no letters, no numbers, no watermark, no UI mockup around the objects. No cute, cartoon, glossy or bright mobile-game look. Original designs only — do not imitate Hearthstone, Warcraft, Diablo, Magic: The Gathering or any existing game's art.

OBJECTS — Eight skill-card frames, one per skill category. Same shape, different metal tint, motif and gem color:
1. BASIC ACTION — tarnished gold and dark iron, simple laurel-and-thorn filigree, amber gems
2. INFORMATION — pale tarnished silver, engraved eyes and lens rings along the border, sickly teal gems
3. RELATIONSHIP — dark rose-gold, intertwined vines and rings, dried-rose red gems
4. KILL / ATTACK — blackened iron with blood-red enamel, crossed blades and barbed thorns, crimson gems, faint dried blood in the engravings
5. CONTROL / DISRUPT — bruised violet-black metal, chains and shackle motifs, violet gems
6. PROTECTION — bone-white and pale steel, shield and wing motifs, pale silver-white gems
7. PASSIVE — rough grey carved stone instead of metal, runes worn smooth, dull unlit gems (it never activates)
8. ONCE-PER-GAME ULTIMATE — the most ornate: black gold with a small spiked crown motif on the top edge, one large blazing orange gem in the mana socket
```
파일명: 1 `card_skill_basic` · 2 `card_skill_info` · 3 `card_skill_bond` · 4 `card_skill_kill` · 5 `card_skill_control` · 6 `card_skill_guard` · 7 `card_skill_passive` · 8 `card_skill_ultimate`

## U2 — 인물 카드 프레임 — 진영 8종 (2×4, 마젠타 키잉(투명))
```
STYLE REFERENCE: The attached images are this game's approved logo and key art. Match their metalwork exactly — blackened silver and gunmetal forged into sharp thorns and spikes, fine engraved filigree, cracked stone texture, small faceted gems that glow from within, crimson on the left / violet on the right as the house colors. Same lighting, same darkness, same painterly realism.

LAYOUT: Create ONE image containing a 2×4 grid of 8 separate objects. Fill the ENTIRE background with flat pure magenta (#FF00FF) — no gradient, no texture, no shadow on the magenta. Each object sits centered in its own equal cell with at least 48px of magenta around it, never touching another object or the image edge. Order left→right, top→bottom exactly as numbered. Do not draw numbers or labels.

SHAPE: a vertical character-card frame, aspect ratio exactly 3:4, outer edge with sharp clipped corners and thorned filigree.
- ART WINDOW: almost the whole card — inner rectangle starting 6% from the left, right and top edges, ending at 80% of the height, top edge shaped as a shallow pointed arch.
- PLAQUE: a name banner across the bottom 20%, slightly wider than the window, with a thin engraved border.
- A faction CREST sits on the top center of the frame, overlapping the window edge (described per tile).
- SOCKET: one small round gem socket at each bottom corner.

FRAME RULES (critical):
- These are EMPTY card frames for a digital card game. The game engine draws the artwork and all text later.
- Every window marked "ART WINDOW" must be filled with the same flat pure magenta (#FF00FF) as the background — completely empty, no art, no gradient, no glow bleeding into it. Its edges are a clean sharp inner bevel.
- Every area marked "PLAQUE" is a blank dark recessed panel (very dark slate, subtle texture) — NO text, letters, runes or symbols on it.
- Every "SOCKET" is an empty round or diamond setting for a gem, slightly recessed, dark inside.
- All frames in this sheet share exactly the same outer silhouette, size, window positions and proportions; only the metal tint, ornament motif and gem color change.
- Clean symmetrical construction, crisp outer edge (no smoke, sparks or glow spilling outside the frame silhouette), front view, no perspective, no drop shadow onto the magenta.

RULES: no text, no letters, no numbers, no watermark, no UI mockup around the objects. No cute, cartoon, glossy or bright mobile-game look. Original designs only — do not imitate Hearthstone, Warcraft, Diablo, Magic: The Gathering or any existing game's art.

OBJECTS — Eight character-card frames, one per faction (two per game mode). Same shape; the crest, metal and gem color mark the faction:
1. Prince Dantes' house — blackened iron with crimson enamel, crest: a horned black crown, crimson gems
2. Prince Kai's house — dark steel with violet enamel, crest: a crown of black thorns, violet gems
3. Earthly alliance — weathered bronze and pale gold, crest: a rising sun over crossed spears, pale gold gems
4. Primordial darkness — black iron with deep blood-red enamel, crest: a bleeding eye, dark red gems
5. Darkness cult of the wasteland — grey-violet tarnished silver, crest: a cracked chalice, grey-violet gems
6. Guardian knights — pale silver and white gold, crest: a winged sword, silver-white gems
7. Ice tribe — frost-rimed pale steel and bone, crest: a horned bone mask with tusks, icy blue gems
8. Troll rebels — rusted iron and green-stained bone, crest: a broken skull with chaos runes, sickly green gems
```
파일명: 1 `card_char_civil_1` · 2 `card_char_civil_2` · 3 `card_char_primordial_1` · 4 `card_char_primordial_2` · 5 `card_char_lidellut_1` · 6 `card_char_lidellut_2` · 7 `card_char_troll_1` · 8 `card_char_troll_2`

## U3 — 인물 카드 프레임 — 지휘관 8종 (2×4, 마젠타 키잉(투명))
```
STYLE REFERENCE: The attached images are this game's approved logo and key art. Match their metalwork exactly — blackened silver and gunmetal forged into sharp thorns and spikes, fine engraved filigree, cracked stone texture, small faceted gems that glow from within, crimson on the left / violet on the right as the house colors. Same lighting, same darkness, same painterly realism.

LAYOUT: Create ONE image containing a 2×4 grid of 8 separate objects. Fill the ENTIRE background with flat pure magenta (#FF00FF) — no gradient, no texture, no shadow on the magenta. Each object sits centered in its own equal cell with at least 48px of magenta around it, never touching another object or the image edge. Order left→right, top→bottom exactly as numbered. Do not draw numbers or labels.

SHAPE: a vertical character-card frame, aspect ratio exactly 3:4, outer edge with sharp clipped corners and thorned filigree.
- ART WINDOW: almost the whole card — inner rectangle starting 6% from the left, right and top edges, ending at 80% of the height, top edge shaped as a shallow pointed arch.
- PLAQUE: a name banner across the bottom 20%, slightly wider than the window, with a thin engraved border.
- A faction CREST sits on the top center of the frame, overlapping the window edge (described per tile).
- SOCKET: one small round gem socket at each bottom corner.
- COMMANDER VERSION: the crest is twice as large and crowned with spikes, the whole border is heavier and more ornate, and a thin gilded inner line runs around the art window. Otherwise identical shape and window positions to a normal frame.

FRAME RULES (critical):
- These are EMPTY card frames for a digital card game. The game engine draws the artwork and all text later.
- Every window marked "ART WINDOW" must be filled with the same flat pure magenta (#FF00FF) as the background — completely empty, no art, no gradient, no glow bleeding into it. Its edges are a clean sharp inner bevel.
- Every area marked "PLAQUE" is a blank dark recessed panel (very dark slate, subtle texture) — NO text, letters, runes or symbols on it.
- Every "SOCKET" is an empty round or diamond setting for a gem, slightly recessed, dark inside.
- All frames in this sheet share exactly the same outer silhouette, size, window positions and proportions; only the metal tint, ornament motif and gem color change.
- Clean symmetrical construction, crisp outer edge (no smoke, sparks or glow spilling outside the frame silhouette), front view, no perspective, no drop shadow onto the magenta.

RULES: no text, no letters, no numbers, no watermark, no UI mockup around the objects. No cute, cartoon, glossy or bright mobile-game look. Original designs only — do not imitate Hearthstone, Warcraft, Diablo, Magic: The Gathering or any existing game's art.

OBJECTS — The same eight factions as the previous sheet, but the COMMANDER (leader) version of each frame:
1. Prince Dantes' house — commander (crest: horned black crown, crimson)
2. Prince Kai's house — commander (crest: crown of black thorns, violet)
3. Earthly alliance — commander (crest: rising sun over crossed spears, pale gold)
4. Primordial darkness — commander (crest: bleeding eye, blood red)
5. Darkness cult — commander (crest: cracked chalice, grey-violet)
6. Guardian knights — commander (crest: winged sword, silver-white)
7. Ice tribe — commander (crest: horned bone mask, icy blue)
8. Troll rebels — commander (crest: broken skull, sickly green)
```
파일명: 1 `card_char_civil_1_cmd` · 2 `card_char_civil_2_cmd` · 3 `card_char_primordial_1_cmd` · 4 `card_char_primordial_2_cmd` · 5 `card_char_lidellut_1_cmd` · 6 `card_char_lidellut_2_cmd` · 7 `card_char_troll_1_cmd` · 8 `card_char_troll_2_cmd`

## U4 — 카드 뒷면 4종 · 모드 카드 프레임 · 선택 테두리 (2×3, 마젠타 키잉(투명))
```
STYLE REFERENCE: The attached images are this game's approved logo and key art. Match their metalwork exactly — blackened silver and gunmetal forged into sharp thorns and spikes, fine engraved filigree, cracked stone texture, small faceted gems that glow from within, crimson on the left / violet on the right as the house colors. Same lighting, same darkness, same painterly realism.

LAYOUT: Create ONE image containing a 2×3 grid of 6 separate objects. Fill the ENTIRE background with flat pure magenta (#FF00FF) — no gradient, no texture, no shadow on the magenta. Each object sits centered in its own equal cell with at least 48px of magenta around it, never touching another object or the image edge. Order left→right, top→bottom exactly as numbered. Do not draw numbers or labels.

SHAPE: tiles 1–4 are complete vertical card BACKS, aspect 3:4 (same outer silhouette as a character card), fully painted — no window. Tile 5 is an empty vertical mode-card frame, aspect 3:4. Tile 6 is a thin glowing selection outline, aspect 3:4.

FRAME RULES (critical):
- These are EMPTY card frames for a digital card game. The game engine draws the artwork and all text later.
- Every window marked "ART WINDOW" must be filled with the same flat pure magenta (#FF00FF) as the background — completely empty, no art, no gradient, no glow bleeding into it. Its edges are a clean sharp inner bevel.
- Every area marked "PLAQUE" is a blank dark recessed panel (very dark slate, subtle texture) — NO text, letters, runes or symbols on it.
- Every "SOCKET" is an empty round or diamond setting for a gem, slightly recessed, dark inside.
- All frames in this sheet share exactly the same outer silhouette, size, window positions and proportions; only the metal tint, ornament motif and gem color change.
- Clean symmetrical construction, crisp outer edge (no smoke, sparks or glow spilling outside the frame silhouette), front view, no perspective, no drop shadow onto the magenta.

RULES: no text, no letters, no numbers, no watermark, no UI mockup around the objects. No cute, cartoon, glossy or bright mobile-game look. Original designs only — do not imitate Hearthstone, Warcraft, Diablo, Magic: The Gathering or any existing game's art.

OBJECTS — Unknown-identity card backs (shown for players whose identity is hidden) and two utility frames:
1. Card back for 'The Princes' Civil War' — black lacquer with a central split mask, left half crimson, right half violet, thorned silver border
2. Card back for 'The War of the Beginning' — dark bronze with a central eclipse (gold sun swallowed by a red eye), ancient carved border
3. Card back for 'The Lidellut Wastes' — grey-violet silver with a central cracked chalice under a winged sword, wind-worn border
4. Card back for 'The Troll Tribe Rebellion' — frosted bone and rusted iron with a central tusked mask, jagged tribal border
5. EMPTY mode-select card frame — the grandest frame: black silver with long thorns, ART WINDOW filling the top 72% (pointed arch), PLAQUE across the bottom 28%, a large empty round SOCKET on the top center
6. SELECTION HIGHLIGHT — only a thin (2% of width) glowing gold-white outline following the card silhouette with tiny thorn points at the corners; everything inside and outside the line is magenta
```
파일명: 1 `card_back_civil_war` · 2 `card_back_primordial` · 3 `card_back_lidellut` · 4 `card_back_troll` · 5 `card_mode_frame` · 6 `card_select_ring`

## U5 — 모드 카드 일러스트 4종 (2×2, 칸 분할만)
```
STYLE REFERENCE: The attached images are this game's approved logo and key art. Match their metalwork exactly — blackened silver and gunmetal forged into sharp thorns and spikes, fine engraved filigree, cracked stone texture, small faceted gems that glow from within, crimson on the left / violet on the right as the house colors. Same lighting, same darkness, same painterly realism.

LAYOUT: Create ONE image: a 2×2 grid of 4 equal 3:4 vertical tiles, separated by 32px solid pure magenta (#FF00FF) gutters, with a 32px magenta margin around the whole grid. Each tile is painted edge to edge (no transparency, no rounded corners, no frame). Order left→right, top→bottom exactly as numbered. Do not draw numbers or labels.

STYLE: dark fantasy key art for a card game, painted in heavy oil, cinematic chiaroscuro, desaturated palette with one strong accent per tile, faces hidden in shadow, volumetric smoke and embers, painterly texture. Each tile is a complete illustration with its subject centered and nothing important within the outer 10% (a frame will cover it).

RULES: no text, no letters, no numbers, no watermark. Nothing important within the outer 8% of each tile (it will be covered by a frame). Dark red blood stains are fine; no gore. Original designs only — do not imitate any existing game's art.

TILES:
1. The Princes' Civil War — a cracked throne room; two demon princes (a horned one in crimson light, a thorn-crowned one in violet light) stand back-to-back with drawn blades, a broken crown on the floor between them, faces hidden in shadow
2. The War of the Beginning — a mythic battlefield at the dawn of the world: a radiant golden army on a cliff facing a tide of black armored darkness under a red eclipse, ancient stone ruins
3. The Lidellut Wastes — a windswept grey wasteland at twilight, a ruined chapel; a line of silver knights with banners advancing toward hooded cultists around a corrupted altar
4. The Troll Tribe Rebellion — a frozen tundra village of bone and hide tents, a tusked chieftain on a bone throne in blue firelight while green-glowing rebel shamans and axe warriors charge out of a snowstorm
```
파일명: 1 `mode_civil_war` · 2 `mode_primordial` · 3 `mode_lidellut` · 4 `mode_troll`

## U6 — UI 키트 — 패널·버튼·입력 (3×3, 마젠타 키잉(투명))
```
STYLE REFERENCE: The attached images are this game's approved logo and key art. Match their metalwork exactly — blackened silver and gunmetal forged into sharp thorns and spikes, fine engraved filigree, cracked stone texture, small faceted gems that glow from within, crimson on the left / violet on the right as the house colors. Same lighting, same darkness, same painterly realism.

LAYOUT: Create ONE image containing a 3×3 grid of 9 separate objects. Fill the ENTIRE background with flat pure magenta (#FF00FF) — no gradient, no texture, no shadow on the magenta. Each object sits centered in its own equal cell with at least 48px of magenta around it, never touching another object or the image edge. Order left→right, top→bottom exactly as numbered. Do not draw numbers or labels.

These are user-interface pieces that will be sliced and STRETCHED (9-slice): ornate decoration only in the corners and the center of each edge; the long straight runs of every border must be plain, uniform and identical along their length so they can be repeated. Interiors marked ART WINDOW are flat magenta (they become transparent); interiors marked PLAQUE are flat very dark slate.

FRAME RULES (critical):
- These are EMPTY card frames for a digital card game. The game engine draws the artwork and all text later.
- Every window marked "ART WINDOW" must be filled with the same flat pure magenta (#FF00FF) as the background — completely empty, no art, no gradient, no glow bleeding into it. Its edges are a clean sharp inner bevel.
- Every area marked "PLAQUE" is a blank dark recessed panel (very dark slate, subtle texture) — NO text, letters, runes or symbols on it.
- Every "SOCKET" is an empty round or diamond setting for a gem, slightly recessed, dark inside.
- All frames in this sheet share exactly the same outer silhouette, size, window positions and proportions; only the metal tint, ornament motif and gem color change.
- Clean symmetrical construction, crisp outer edge (no smoke, sparks or glow spilling outside the frame silhouette), front view, no perspective, no drop shadow onto the magenta.

RULES: no text, no letters, no numbers, no watermark, no UI mockup around the objects. No cute, cartoon, glossy or bright mobile-game look. Original designs only — do not imitate Hearthstone, Warcraft, Diablo, Magic: The Gathering or any existing game's art.

OBJECTS — Nine user-interface pieces, each centered in its own cell, front view:
1. LOGIN PANEL — vertical rectangle 3:4, heavy thorned silver border, a large empty round SOCKET on the top center for an emblem, interior PLAQUE
2. LARGE PANEL — wide rectangle 4:3, thin engraved silver border with small thorn ornaments in the four corners only, interior PLAQUE
3. SMALL PANEL — square, same border style as the large panel but thinner, interior PLAQUE
4. DIALOG FRAME — wide rectangle 16:10, double border with a crimson gem on the left edge center and a violet gem on the right edge center, interior PLAQUE
5. TOP BAR — a very wide thin horizontal strip (10:1), dark iron with a small thorned crest at the center, plain straight runs elsewhere
6. PRIMARY BUTTON — wide pill-like plate 4:1 with clipped corners, dark gold rim, interior PLAQUE slightly lighter than others
7. SECONDARY BUTTON — same shape as the primary button but plain gunmetal rim, interior PLAQUE
8. TEXT INPUT — wide thin slot 6:1, recessed dark interior PLAQUE, thin silver rim with tiny end caps
9. DIVIDER — a long thin horizontal ornament (12:1): a straight silver line with a small thorned diamond in the center and tapering spikes at both ends
```
파일명: 1 `ui_login_panel` · 2 `ui_panel_large` · 3 `ui_panel_small` · 4 `ui_modal` · 5 `ui_topbar` · 6 `ui_button_primary` · 7 `ui_button_secondary` · 8 `ui_input` · 9 `ui_divider`

## U7 — 배경 4종 (로비·게임판) (2×2, 칸 분할만)
```
STYLE REFERENCE: The attached images are this game's approved logo and key art. Match their metalwork exactly — blackened silver and gunmetal forged into sharp thorns and spikes, fine engraved filigree, cracked stone texture, small faceted gems that glow from within, crimson on the left / violet on the right as the house colors. Same lighting, same darkness, same painterly realism.

LAYOUT: Create ONE image: a 2×2 grid of 4 equal 16:9 horizontal tiles, separated by 32px solid pure magenta (#FF00FF) gutters, with a 32px magenta margin around the whole grid. Each tile is painted edge to edge (no transparency, no rounded corners, no frame). Order left→right, top→bottom exactly as numbered. Do not draw numbers or labels.

STYLE: dark fantasy game UI background, painted, very low contrast and dark so text stays readable on top, no strong focal subject, seamless-feeling edges.

RULES: no text, no letters, no numbers, no watermark, no UI mockup around the objects. No cute, cartoon, glossy or bright mobile-game look. Original designs only — do not imitate Hearthstone, Warcraft, Diablo, Magic: The Gathering or any existing game's art.

TILES:
1. Lobby background — the dark interior wall of a ruined gothic cathedral, tall pillars and faint rose-window light far away, mostly empty dark stone so UI panels can sit on it
2. Game table background — top-down view of a huge cracked black stone table, candle wax drips and scattered ash at the edges, center mostly empty and dark
3. Side panel background (left, crimson house) — dark crimson velvet drapery and black iron, very low contrast
4. Side panel background (right, violet house) — dark violet velvet drapery and black iron, very low contrast
```
파일명: 1 `bg_lobby` · 2 `bg_table` · 3 `bg_wall_crimson` · 4 `bg_wall_violet`

## P1 — 인물 반신상 · 내전 · 단테스 측 6명 (2×3, 칸 분할만)
첨부: 기존 아이콘 `C1` 시트의 초상 6장
```
STYLE REFERENCE: The attached images are this game's approved logo and key art. Match their metalwork exactly — blackened silver and gunmetal forged into sharp thorns and spikes, fine engraved filigree, cracked stone texture, small faceted gems that glow from within, crimson on the left / violet on the right as the house colors. Same lighting, same darkness, same painterly realism.
CHARACTER REFERENCE: the attached square portraits show these same characters — keep their faces, hair, horns, armor and colors, but redraw them as half-body card art.

LAYOUT: Create ONE image: a 2×3 grid of 6 equal vertical 3:4 tiles, separated by 32px solid pure magenta (#FF00FF) gutters, with a 32px magenta margin around the whole grid. Each tile is painted edge to edge (no transparency, no rounded corners, no frame). Order left→right, top→bottom exactly as numbered. Do not draw numbers or labels.

STYLE (identical for every tile): grim dark-fantasy character art for a card game, HALF-BODY shot (head to waist, both shoulders and at least one hand visible), figure centered and turned slightly toward the viewer, head in the upper third with clear space above it. Painted in heavy oil, strong chiaroscuro, half of the face in shadow. Desaturated ashen palette with one smoldering accent light behind the figure (a dim crimson glow). Background: a dark, softly blurred atmospheric backdrop fitting the character (no scenery details, no horizon line), darkening toward all four edges so it blends into a card frame. Weathered skin, scars, worn armor and cloth, haunted or menacing expression. Faint smoke, ash and embers. Coarse painterly texture, subtle film grain. Must read clearly at 160px wide.

RULES: no text, no letters, no numbers, no card frame or border, no watermark. Nothing important within the outer 8% of each tile (it will be covered by a frame). Dark red blood stains are fine; no gore. Original designs only — do not imitate any existing game's art.

SUBJECTS:
1. Dantes, the eldest demon prince, Successor of Darkness — towering and horned, a heavy black crown fused to his horns, smoldering crimson eyes, dark leathery wings folded behind cracked obsidian armor; proud, doomed, a faint wound at his chest where a lover's blade struck
2. Mertzkiel, the second demon prince and the wisest of them — a lean fel-touched prince with small swept-back horns and faint shadowy wings, long silver hair, a scholar-archon's high collar over tarnished armor, calculating, haunted eyes
3. Kelhu, Ogre Lord — a hulking ogre with broken tusks, one crude iron pauldron, shackle scars on his wrists, a giant spiked mace; grim and battered, unbroken loyalty in his small eyes
4. Freya, drow high priestess of the god of greed — a strikingly beautiful dark-skinned elven woman, long pale hair, a tall crested headdress of gold, gold chains and coins over dark ornate robes, a cold knowing smile, a greedy red glow behind her
5. Soen, drow assassin — a dark-skinned elven woman, face half-hidden by a pointed hood and cloth mask, a scar across her lips, twin curved daggers held low, cold vengeful eyes
6. Reindila, a noble lady whose soul was bound into a banshee — translucent pale body dissolving into tattered veils below the chest, long drifting hair, hollow glowing eyes with no memory left, a faint wedding ring on a ghostly hand
```
파일명: 1 `card_art_dantes` · 2 `card_art_mertz` · 3 `card_art_kelhu` · 4 `card_art_freya` · 5 `card_art_soen` · 6 `card_art_reindila`

## P2 — 인물 반신상 · 내전 · 세피 + 카이 측 5명 (2×3, 칸 분할만)
첨부: 기존 아이콘 `C2` 시트의 초상 6장
```
STYLE REFERENCE: The attached images are this game's approved logo and key art. Match their metalwork exactly — blackened silver and gunmetal forged into sharp thorns and spikes, fine engraved filigree, cracked stone texture, small faceted gems that glow from within, crimson on the left / violet on the right as the house colors. Same lighting, same darkness, same painterly realism.
CHARACTER REFERENCE: the attached square portraits show these same characters — keep their faces, hair, horns, armor and colors, but redraw them as half-body card art.

LAYOUT: Create ONE image: a 2×3 grid of 6 equal vertical 3:4 tiles, separated by 32px solid pure magenta (#FF00FF) gutters, with a 32px magenta margin around the whole grid. Each tile is painted edge to edge (no transparency, no rounded corners, no frame). Order left→right, top→bottom exactly as numbered. Do not draw numbers or labels.

STYLE (identical for every tile): grim dark-fantasy character art for a card game, HALF-BODY shot (head to waist, both shoulders and at least one hand visible), figure centered and turned slightly toward the viewer, head in the upper third with clear space above it. Painted in heavy oil, strong chiaroscuro, half of the face in shadow. Desaturated ashen palette with one smoldering accent light behind the figure (a dim crimson glow for tile 1, a dim deep violet glow for tiles 2–6). Background: a dark, softly blurred atmospheric backdrop fitting the character (no scenery details, no horizon line), darkening toward all four edges so it blends into a card frame. Weathered skin, scars, worn armor and cloth, haunted or menacing expression. Faint smoke, ash and embers. Coarse painterly texture, subtle film grain. Must read clearly at 160px wide.

RULES: no text, no letters, no numbers, no card frame or border, no watermark. Nothing important within the outer 8% of each tile (it will be covered by a frame). Dark red blood stains are fine; no gore. Original designs only — do not imitate any existing game's art.

SUBJECTS:
1. Sephy, the greatest witch of the demon realm (crimson faction) — a pale blue-skinned demoness with curling ram horns, wild dark hair, skin cracked and glowing red at the seams, chaotic curse sigils burning around her clawed hands
2. Kai, the third demon prince, cruel and cold (violet faction) — a lean demon prince with long black hair and a crown of black thorns, faint violet sigils glowing across his skin, twin curved blades crossed behind his shoulders, eyes burning with hatred learned in the abyss
3. Arin, Dark Templar, the prince's one loyal blade (violet faction) — blackened plate engraved with violet runes, a long runed greatsword trailing violet smoke, a pale stern face, unwavering eyes
4. Tuma, ancient warden of the gate of hell, Flame Blader (violet faction) — a red-skinned tusked brute with a burning mane, two flaming blades, ash and soot on scarred skin, a savage grin
5. Krate, Doom Lord, master of necromancers (violet faction) — an ancient gaunt sorcerer with a long grey beard, deep hood and layered black robes, a staff crowned with a skull, sunken burning eyes, an old ragged wound across his chest
6. Kaspa, high priest of a shadow cult (violet faction) — a dark-skinned drow with ritual scars, bone fetishes and black feathers, spirit smoke curling from a skull-topped staff, a cruel smile
```
파일명: 1 `card_art_sephy` · 2 `card_art_kai` · 3 `card_art_arin` · 4 `card_art_tuma` · 5 `card_art_krate` · 6 `card_art_kaspa`

## P3 — 인물 반신상 · 태초의 전쟁 · 지상 연합 6명 (2×3, 칸 분할만)
첨부: 기존 아이콘 `C3` 시트의 초상 6장
```
STYLE REFERENCE: The attached images are this game's approved logo and key art. Match their metalwork exactly — blackened silver and gunmetal forged into sharp thorns and spikes, fine engraved filigree, cracked stone texture, small faceted gems that glow from within, crimson on the left / violet on the right as the house colors. Same lighting, same darkness, same painterly realism.
CHARACTER REFERENCE: the attached square portraits show these same characters — keep their faces, hair, horns, armor and colors, but redraw them as half-body card art.

LAYOUT: Create ONE image: a 2×3 grid of 6 equal vertical 3:4 tiles, separated by 32px solid pure magenta (#FF00FF) gutters, with a 32px magenta margin around the whole grid. Each tile is painted edge to edge (no transparency, no rounded corners, no frame). Order left→right, top→bottom exactly as numbered. Do not draw numbers or labels.

STYLE (identical for every tile): grim dark-fantasy character art for a card game, HALF-BODY shot (head to waist, both shoulders and at least one hand visible), figure centered and turned slightly toward the viewer, head in the upper third with clear space above it. Painted in heavy oil, strong chiaroscuro, half of the face in shadow. Desaturated ashen palette with one smoldering accent light behind the figure (a dim pale-gold dawn glow). Background: a dark, softly blurred atmospheric backdrop fitting the character (no scenery details, no horizon line), darkening toward all four edges so it blends into a card frame. Weathered skin, scars, worn armor and cloth, haunted or menacing expression. Faint smoke, ash and embers. Coarse painterly texture, subtle film grain. Must read clearly at 160px wide.

RULES: no text, no letters, no numbers, no card frame or border, no watermark. Nothing important within the outer 8% of each tile (it will be covered by a frame). Dark red blood stains are fine; no gore. Original designs only — do not imitate any existing game's art.

SUBJECTS:
1. Rael, elven hero of an ancient war — long golden hair, a mantle of smoldering phoenix feathers, worn white-and-gold robes, determined weary eyes
2. Kane, chieftain of the moon wolves — a great silver-white spirit wolf, a crescent moon mark glowing on his brow, a scarred muzzle, pale moonlit mist in his fur (an animal portrait, not a human)
3. Eoril, queen of the phoenixes — regal, a crown of burning feathers, red-gold hair like embers, robes of smoldering plumage, ash drifting around her
4. Nukelius, elder druid and ancient guardian of nature — antler-like branches growing from his brow, a moss-tangled beard, bark-like skin, robes of dead leaves, glowing green eyes
5. Tachin, forest troll chieftain — lean, long tusks, war paint, a feathered bone headdress, nets and spears, a wary hunter's stare
6. Kumarin, chieftain of the bull-headed folk — a massive horned chieftain with a braided mane, ritual totems on his chest, a great stone-headed hammer, scarred hide
```
파일명: 1 `card_art_rael` · 2 `card_art_kane` · 3 `card_art_eoril` · 4 `card_art_nukelius` · 5 `card_art_tachin` · 6 `card_art_kumarin`

## P4 — 인물 반신상 · 태초의 전쟁 · 다크니스 6명 (2×3, 칸 분할만)
첨부: 기존 아이콘 `C4` 시트의 초상 6장
```
STYLE REFERENCE: The attached images are this game's approved logo and key art. Match their metalwork exactly — blackened silver and gunmetal forged into sharp thorns and spikes, fine engraved filigree, cracked stone texture, small faceted gems that glow from within, crimson on the left / violet on the right as the house colors. Same lighting, same darkness, same painterly realism.
CHARACTER REFERENCE: the attached square portraits show these same characters — keep their faces, hair, horns, armor and colors, but redraw them as half-body card art.

LAYOUT: Create ONE image: a 2×3 grid of 6 equal vertical 3:4 tiles, separated by 32px solid pure magenta (#FF00FF) gutters, with a 32px magenta margin around the whole grid. Each tile is painted edge to edge (no transparency, no rounded corners, no frame). Order left→right, top→bottom exactly as numbered. Do not draw numbers or labels.

STYLE (identical for every tile): grim dark-fantasy character art for a card game, HALF-BODY shot (head to waist, both shoulders and at least one hand visible), figure centered and turned slightly toward the viewer, head in the upper third with clear space above it. Painted in heavy oil, strong chiaroscuro, half of the face in shadow. Desaturated ashen palette with one smoldering accent light behind the figure (a dim blood-red glow). Background: a dark, softly blurred atmospheric backdrop fitting the character (no scenery details, no horizon line), darkening toward all four edges so it blends into a card frame. Weathered skin, scars, worn armor and cloth, haunted or menacing expression. Faint smoke, ash and embers. Coarse painterly texture, subtle film grain. Must read clearly at 160px wide.

RULES: no text, no letters, no numbers, no card frame or border, no watermark. Nothing important within the outer 8% of each tile (it will be covered by a frame). Dark red blood stains are fine; no gore. Original designs only — do not imitate any existing game's art.

SUBJECTS:
1. Eltas, grand general of the demon host — black plate armor, a dragon-faced shield, a horned helm with a burning visor slit, a tattered war banner behind him
2. Sasint, warmongering overlord of the demon realm — a red-skinned demonic warlord with tusks, a spiked iron crown and pauldrons, a warmonger's grin, banners of skulls behind
3. Kilder, royal vampire — an aristocratic vampire lord with bat-like wings, pale grey skin, a high-collared regal coat, fangs, eyes glowing red
4. Drakan, wizard of the Black Tower — a skeletal wizard, a cracked skull face beneath a tall hood, rotting purple robes, a staff holding a caged green flame
5. Humily, dark priest — gaunt, shaved head with ritual tattoos, bone rosaries, black vestments, a sickle-shaped ritual knife
6. Consume, meat golem — a hulking stitched flesh golem, mismatched patched hide, hooks and chains embedded in it, a cleaver for a hand, one dull eye
```
파일명: 1 `card_art_eltas` · 2 `card_art_sasint` · 3 `card_art_kilder` · 4 `card_art_drakan` · 5 `card_art_hermilly` · 6 `card_art_consume`

## P5 — 인물 반신상 · 리델루트 황야 · 가디언 6명 (2×3, 칸 분할만)
첨부: 기존 아이콘 `C5` 시트의 초상 6장
```
STYLE REFERENCE: The attached images are this game's approved logo and key art. Match their metalwork exactly — blackened silver and gunmetal forged into sharp thorns and spikes, fine engraved filigree, cracked stone texture, small faceted gems that glow from within, crimson on the left / violet on the right as the house colors. Same lighting, same darkness, same painterly realism.
CHARACTER REFERENCE: the attached square portraits show these same characters — keep their faces, hair, horns, armor and colors, but redraw them as half-body card art.

LAYOUT: Create ONE image: a 2×3 grid of 6 equal vertical 3:4 tiles, separated by 32px solid pure magenta (#FF00FF) gutters, with a 32px magenta margin around the whole grid. Each tile is painted edge to edge (no transparency, no rounded corners, no frame). Order left→right, top→bottom exactly as numbered. Do not draw numbers or labels.

STYLE (identical for every tile): grim dark-fantasy character art for a card game, HALF-BODY shot (head to waist, both shoulders and at least one hand visible), figure centered and turned slightly toward the viewer, head in the upper third with clear space above it. Painted in heavy oil, strong chiaroscuro, half of the face in shadow. Desaturated ashen palette with one smoldering accent light behind the figure (a dim pale silver-gold glow). Background: a dark, softly blurred atmospheric backdrop fitting the character (no scenery details, no horizon line), darkening toward all four edges so it blends into a card frame. Weathered skin, scars, worn armor and cloth, haunted or menacing expression. Faint smoke, ash and embers. Coarse painterly texture, subtle film grain. Must read clearly at 160px wide.

RULES: no text, no letters, no numbers, no card frame or border, no watermark. Nothing important within the outer 8% of each tile (it will be covered by a frame). Dark red blood stains are fine; no gore. Original designs only — do not imitate any existing game's art.

SUBJECTS:
1. Shining, grand general and emperor who founded the Guardians — an aging noble commander in battered silver-gold armor, a winged helm, a heavy cloak, grey-streaked hair, burdened but unyielding eyes
2. Chizuko, half-angelic daughter of the emperor — a young sorceress with faint feathered wings of pale light, silver-blonde hair, travel-worn diplomat's robes, a faint flickering halo
3. Yui, commander of a hospitaller knight order — a woman in dented crimson-and-silver armor, bandaged forearms, a holy sigil glowing on her gauntlet, resolute eyes
4. Roneris, veteran champion of the Lord of Justice — a paladin past his prime, greying beard, heavy scarred plate armor, a great warhammer, faint holy light behind him
5. Supra, blood-elf champion, the Bloody Knight — red-lacquered armor, long pale hair, sharp elven features, a blood-stained longsword, a battle-hardened stare
6. Kamikaze, great warlord of the bull-headed folk, mind-enslaved — an old horned warrior with a braided white mane, a massive totem axe, eyes glazed with an unnatural violet glow
```
파일명: 1 `card_art_shining` · 2 `card_art_chizuko` · 3 `card_art_yui` · 4 `card_art_loneris` · 5 `card_art_supra` · 6 `card_art_kamikaze`

## P6 — 인물 반신상 · 트롤 부족의 반란 · 얼음 부족 6명 (2×3, 칸 분할만)
첨부: 기존 아이콘 `C6` 시트의 초상 6장
```
STYLE REFERENCE: The attached images are this game's approved logo and key art. Match their metalwork exactly — blackened silver and gunmetal forged into sharp thorns and spikes, fine engraved filigree, cracked stone texture, small faceted gems that glow from within, crimson on the left / violet on the right as the house colors. Same lighting, same darkness, same painterly realism.
CHARACTER REFERENCE: the attached square portraits show these same characters — keep their faces, hair, horns, armor and colors, but redraw them as half-body card art.

LAYOUT: Create ONE image: a 2×3 grid of 6 equal vertical 3:4 tiles, separated by 32px solid pure magenta (#FF00FF) gutters, with a 32px magenta margin around the whole grid. Each tile is painted edge to edge (no transparency, no rounded corners, no frame). Order left→right, top→bottom exactly as numbered. Do not draw numbers or labels.

STYLE (identical for every tile): grim dark-fantasy character art for a card game, HALF-BODY shot (head to waist, both shoulders and at least one hand visible), figure centered and turned slightly toward the viewer, head in the upper third with clear space above it. Painted in heavy oil, strong chiaroscuro, half of the face in shadow. Desaturated ashen palette with one smoldering accent light behind the figure (a dim icy-blue glow). Background: a dark, softly blurred atmospheric backdrop fitting the character (no scenery details, no horizon line), darkening toward all four edges so it blends into a card frame. Weathered skin, scars, worn armor and cloth, haunted or menacing expression. Faint smoke, ash and embers. Coarse painterly texture, subtle film grain. Must read clearly at 160px wide.

RULES: no text, no letters, no numbers, no card frame or border, no watermark. Nothing important within the outer 8% of each tile (it will be covered by a frame). Dark red blood stains are fine; no gore. Original designs only — do not imitate any existing game's art.

SUBJECTS:
1. Chis, chieftain of the ice trolls — frost-blue skin, long tusks, a bone mask pushed up on his brow, a staff of carved antler, the weary leader of a dying tribe
2. Satoshi, ice guard — a stout ice troll in furs and frost-rimed bone armor, a heavy round shield, a guardian's stern glare
3. Zwinla, ice warlord — a fierce ice troll with frost-crusted tusks, twin throwing axes, a white fur mantle, war paint
4. Hachi, elder headhunter — an old troll with grey dreadlocks, shrunken trophy heads on his belt, a long spear, a cunning old grin
5. Tokra, ice shaman — an ice troll with icicles in his braided hair, a frozen spirit totem, cold blue runes on his skin
6. Uldian, wild human beastmaster — matted hair and beard, furs and bones, a hawk perched on his shoulder, feral eyes
```
파일명: 1 `card_art_chis` · 2 `card_art_satoshi` · 3 `card_art_zwinra` · 4 `card_art_hachi` · 5 `card_art_tokra` · 6 `card_art_uldian`

## P7 — 인물 반신상 · 트롤 부족의 반란 · 울피안 + 반란자 5명 (2×3, 칸 분할만)
첨부: 기존 아이콘 `C7` 시트의 초상 6장
```
STYLE REFERENCE: The attached images are this game's approved logo and key art. Match their metalwork exactly — blackened silver and gunmetal forged into sharp thorns and spikes, fine engraved filigree, cracked stone texture, small faceted gems that glow from within, crimson on the left / violet on the right as the house colors. Same lighting, same darkness, same painterly realism.
CHARACTER REFERENCE: the attached square portraits show these same characters — keep their faces, hair, horns, armor and colors, but redraw them as half-body card art.

LAYOUT: Create ONE image: a 2×3 grid of 6 equal vertical 3:4 tiles, separated by 32px solid pure magenta (#FF00FF) gutters, with a 32px magenta margin around the whole grid. Each tile is painted edge to edge (no transparency, no rounded corners, no frame). Order left→right, top→bottom exactly as numbered. Do not draw numbers or labels.

STYLE (identical for every tile): grim dark-fantasy character art for a card game, HALF-BODY shot (head to waist, both shoulders and at least one hand visible), figure centered and turned slightly toward the viewer, head in the upper third with clear space above it. Painted in heavy oil, strong chiaroscuro, half of the face in shadow. Desaturated ashen palette with one smoldering accent light behind the figure (a dim icy-blue glow for tile 1, a dim sickly-green glow for tiles 2–6). Background: a dark, softly blurred atmospheric backdrop fitting the character (no scenery details, no horizon line), darkening toward all four edges so it blends into a card frame. Weathered skin, scars, worn armor and cloth, haunted or menacing expression. Faint smoke, ash and embers. Coarse painterly texture, subtle film grain. Must read clearly at 160px wide.

RULES: no text, no letters, no numbers, no card frame or border, no watermark. Nothing important within the outer 8% of each tile (it will be covered by a frame). Dark red blood stains are fine; no gore. Original designs only — do not imitate any existing game's art.

SUBJECTS:
1. Ulpian, wild human shapeshifter (ice side) — half-turned into a bear, claws and fur bursting from his arms, primal rage
2. Deka the Trollbane, the chieftain's traitor brother (rebels) — a lean blood-soaked troll berserker, a mad grin, notched throwing axes, pact sigils burned into his chest
3. Neonis, shadow thief and servant of a god of chaos (rebels) — a troll trickster in a cracked ritual mask, a curved dagger and hex charms, a mocking grin under the mask
4. Ka'nula, chaos shaman (rebels) — a dark troll with purple-black skin, a hood of shadows, a staff spitting sickly green chaos fire
5. Kazrow, chaos raider (rebels) — a dark troll with chaos-scarred skin, a jagged cleaver, crazed glowing eyes
6. Seirow, fanatic raider (rebels) — a dark troll zealot with ritual brands, nets and hooked spears, frothing devotion
```
파일명: 1 `card_art_ulpian` · 2 `card_art_deka` · 3 `card_art_neonis` · 4 `card_art_kanulla` · 5 `card_art_kazrow` · 6 `card_art_seirow`
