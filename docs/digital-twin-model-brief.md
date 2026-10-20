# The digital twin's model, rebuilt: her face from one photograph, her line from the facts

*Review of the Eng handoff `Digital_Twin_Eng_Handoff.dc.html` (Turn 3: "The model as hero · two doors") and a recommended build, 20 Oct 2026. Supersedes the catalog half of `docs/avatar-render-proposal.md` §3.0–3.2; the render half (§3.4) stands.*

## The ask, in one line

Drop the full-length photograph. Build the model from **one close-up** (her face, skin, hair) plus **her facts** (height, size, bust, waist, shoes, age) with **three sliders** she can nudge (shoulders · bust · hips, five stops each). Make the face a **closer likeness** of the photograph she uploads. **Seasons and the Full colour notes do not change.**

## What the design hands over (read from the prototype's script, not its placeholders)

| Screen | What it holds |
| --- | --- |
| 3D · Empty state | One photograph slot. Two rows: Colouring ("One close-up reads your season") and Body shape ("Set your line by hand"). No full-length ask anywhere. |
| 3A · Twin | The model as the hero, caption "{Skin} · {hair} hair", a "Drawing your model…" status while she regenerates. Two rows beneath. |
| 3B · Colouring | The close-up slot, **Your season** with the strip, the summary and the notes door, **Another season** — the live 12-season picker as it stands. **Skin and hair** swatches (8 + 5) beneath, "Read from your close-up. Nudge either if it looks off." |
| 3C · Body shape | **Her proportions**: a parametric figure drawn live from the facts (height, size, bust, waist) with a one-line read ("Bust 18 cm over the waist: a fuller bust, a defined waist."). **Adjust by hand**: Shoulders (Narrower ↔ Broader), Bust (Smaller ↔ Fuller), Hips (Narrower ↔ Fuller), stops −2…+2, "As she is" at 0, source line "Your facts" / "By hand". **The facts** drawer: Height (cm / ft-in), Size, Shoes, **Bust (new: bra band + cup, or cm)**, **Waist (new: cm / in)**, Age, Gender. "Size, never weight." |

The prototype's `SEAS` object is a six-season stand-in with placeholder note rows. Ignore it: the live `SEASON_WHEEL` / `seasonRows` picker, the chosen-season route (`POST /api/stylenotes/season`) and the Full colour notes drawer stay byte for byte.

## What exists today, and why it cannot simply be extended

The model is a **shared catalog cell**: `avatar_id = w-s4-h1-hg-ll` (gender · skin 0–7 · hair 0–4 · figure archetype · nudges), generated once per id from a **text descriptor** ("warm honey beige skin, caramel blonde hair, a balanced figure with a defined waist") and held in `avatar_cells` for everyone whose mapping lands on it. The figure key comes from the full-length photograph's silhouette read; the skin and hair from the close-up's extracted hexes, nearest-swatch.

Two things follow:

1. **The face was never hers.** The cell is a text-generated model who shares her colouring. Nothing in the pipeline looks at her photograph when drawing the model — the close-up is read for a season, then set aside. "A closer likeness" is not a prompt tweak on this architecture; it needs her photograph in the generation call.
2. **The matrix cannot take the sliders.** Three five-stop scales on top of 8 × 5 × 2 cells is 8 × 5 × 125 × 2 = 10,000 cells, and once the face is hers the cells are per person anyway. The shared catalog's reason to exist (one curated image serves many accounts) is gone the moment the model looks like her.

So the catalog retires for anyone with a close-up, and the model becomes **one reference image per account**.

## The one finding that decides the split

Google's documentation and developer forum (checked 20 Oct) say the same thing from two sides: reference images carry a **face** reliably ("character resemblance", up to 4 characters on `gemini-3.1-flash-image`), and **do not carry body proportions or scale** — a developer asking for 1.4× relative height got ~1.1×, and the docs say nothing about size riding a reference. That is exactly the design's division of labour:

- **The face comes from a photograph** — her close-up, fed as a reference image. Text cannot do this.
- **The body comes from words** — a descriptor derived from her facts and sliders. A photograph cannot do this reliably, which is also why the full-length read was always the weaker half (pose distortion, loose clothing, the mirror-selfie arm).

## Recommended architecture

### 1 · One twin per account, generated from two inputs

`POST /api/avatar/twin` replaces the per-cell generation for her. One image call, 4:5, with:

- **IMAGE 1: her close-up** (`profiles.headshot_url`, already on Cloudinary, already downscaled client-side). The instruction is the proven `tryon` identity lock, sharpened: *this is a photograph of the person — reproduce her face exactly: bone structure, eyes, brows, nose, mouth, skin tone, the hair's colour, texture and length as photographed; do not idealise, do not change her age.* The age band from the facts rides the prompt so the model does not de-age her.
- **The body descriptor, in text** — `twinDescriptor(facts, adj, gender)`, a pure function beside `avatarDescriptor` (prompt-side vocabulary only, never rendered): a frame word from the UK size band, a height word only at the ends of the range (petite ≤ 158 cm, tall and long-limbed ≥ 175 cm), bust fullness and waist definition from the bust−waist difference, then the three sliders as graded phrases ("shoulders a little broader than her hips", "much fuller hips"). "Size, never weight" holds by construction — nothing in the vocabulary is a weight.
- The standing base layer, pose and studio from `avatarCellGenerate` (the seamless neutral set, barefoot, facing camera, `FULL_BODY_FRAME`, `AVATAR_STUDIO`).

Generate the twin at **2K** (`imageSize`, supported 512 / 1K / 2K / 4K on this model): the face occupies a small region of a full-length 4:5 frame, and a sharper reference face is what every later render copies from. One-off cost ~10¢ per twin version; look renders stay at 1K (~7¢).

**No close-up yet, facts present**: the same endpoint runs text-only — her proportions on a generic face, with the skin/hair swatches driving colouring exactly as the catalog did. That is the design's 3D state ("Set your line by hand" works before any photograph). No facts and no photo → the generic cells (`GENERIC_CELLS`) stand, untouched.

### 2 · Every render carries two references of her

`avatarRefForUser` returns **two** images instead of one — the twin (body, hair, base layer, overall identity) and the close-up (the face at full resolution) — and the render prompts say so: *IMAGE 1 is the model; IMAGE 2 is a close-up of the same person — match the face to IMAGE 2.* This is the single biggest lever on "a closer likeness in the looks": today the render copies a face that is 80 pixels tall in a 4:5 frame. Garment references cap at 8 instead of 9 (2 + 8 inside the 14-image budget). `/api/avatar/render`, `/api/style`'s three frames and `/api/daily`'s anchor shot all read through the same function, so one change covers every surface.

One deliberate deviation from the proposal's rule "never re-describe the avatar in text at render time": because references do not carry proportions, the render prompt should carry **one short figure line** from the same `twinDescriptor` beside the two images. Identity still comes from the images; the line is what stops a "much fuller hips" twin rendering straight-hipped in a look.

### 3 · The parametric figure is instant; the photograph is debounced

The design's SVG figure (drawn from height, size, bust, waist and the sliders) is the live feedback — every stop, every stepper repaints it at once, no call. The **photographed twin regenerates on the drawer's close** (the design's `closeDrawer → redraw`), on a close-up landing, and on a skin/hair nudge settling, under "Drawing your model…" on the hero — never per tap. That is the same cost discipline as the composer canvas (`_lkmSync`'s 1800 ms debounce + key cache): one image call per settled change.

### 4 · Data

No new table. One small migration (next number) and two jsonb extensions:

- `style_dna.facts` gains `bust_band`, `bust_cup`, `bust_cm`, `bust_mode`, `waist_cm` (jsonb, no migration; `factsLines` in `style_dna.js` renders the two new rows into THE FACTS block so a generation reads them too).
- `profiles.avatar_prefs` → v3: `{ skin, hair, adj: {shoulders, bust, hips}, gender, kept, v: 3 }` where `skin`/`hair` are overrides (`null` = from the photograph) and `adj` values are `null` = "from your facts" or −2…+2.
- **New columns** `profiles.twin_url` (her reference image) and `profiles.twin_key` (a hash of `headshot_url` + facts + adj + skin/hair overrides + gender + a `TWIN_STYLE` version constant). The twin lives on her own row under own-row RLS — not in `avatar_cells`, which every authenticated user can read. `looks.render_key` uses `twin_key` in place of `avatar_id`, so a re-photographed twin re-renders a look the next time it opens (`_avRenderKick`'s existing key-mismatch behaviour), and an unchanged twin never re-renders anything.
- `avatar_id` keeps its catalog grammar for the generic cells and for accounts that never upload; `parseAvatarId` is untouched.

### 5 · The twin page

- **3D / 3A**: the hero shows `twin_url` (or the generic cell), caption from the resolved skin/hair names, "Drawing your model…" while a job runs. The **full-length slot leaves the page**; `full_length_url` and `silhouette_analysis` stay in the database untouched.
- **3B**: unchanged picker and notes. The skin/hair rows become overrides with the design's line — "Read from your close-up. Nudge either if it looks off." With a photograph on file the default swatch is the nearest to the photograph's `skin_tone_hex` / `hair_color_hex` (today's mapper), shown as what Robes read; a tap is an override that rides the descriptor ("skin a shade deeper than the photograph: Chestnut").
- **3C**: the facts drawer gains Bust (bra band 28–46 + cup AA–G+, or cm 70–140) and Waist (cm 50–130 / in), with the design's tape line. The one read line is derived, never stored. The three scales write `avatar_prefs.adj`; "Back to your facts" clears them. **Legacy seed**: an account that still carries a `silhouette_analysis.body_type` seeds its sliders from it once (Inverted Triangle → shoulders +1 / hips −1, Pear → hips +1, Apple → bust +1 / waist undefined, Rectangle → 0s, Hourglass → bust +1) so nobody's existing line regresses the day the full-length ask disappears. After that the sliders are hers.
- **Men**: the design's facts rows are the woman's. For `gender: man` the Bust row reads Chest (cm only, no cups) and the descriptor uses the men's vocabulary; the rest is identical. The 7 Oct decision ("men's chest and suit sizes come later") can stay deferred — the row is one branch, not a new sheet.

## What to validate before the UI (a day, in the existing harness)

The render pipeline's hard rule stands: **no uncurated model in front of her.** With a per-account twin there is no curation queue, so the harness is the gate instead. Extend `scripts/avatar_render_smoke.mjs` on Railway (the keys live there):

1. **Likeness**: three consenting close-ups (Annie, Lib, one more) → a twin each → five look renders each. Judged by eye against the photograph: same woman, same age, hair as photographed. This is the number that decides whether "match the face to IMAGE 2" is enough or whether the twin wants a 4K reference.
2. **The sliders read**: one close-up × the hips scale at −2, 0, +2 and the bust scale at −2, 0, +2. If a one-stop change does not change the image, say so and collapse the scale to three stops in the prompt words — a stop that moves nothing is not a control. Google's forum report (1.4× asked, 1.1× delivered) says to expect the extremes to read and the middle to be subtle.
3. **Refusals**: a photograph the model declines to edit (it returns prose, `no_inline_data`) must land as the generic model with one line on the twin page — "Robes couldn't photograph your model from this close-up. Try one in daylight, facing the camera." — never a blank hero and never a 5xx. The `tryon` endpoint ran this edit shape in production, so the path is proven; the refusal rate on real faces is the number to read.

## Two product calls this raises, flagged, not decided

- **Her face on a shared page.** `/api/style`'s three frames already render on her model, and a key piece is shareable at `/board/:shareId`. Once the model is a likeness, a shared board carries her face. Either the share flow says so in one line ("This shows your model"), or shared frames are re-shot on the generic model at share time. Recommend the line; it is her look and her choice.
- **The privacy notice.** `/privacy` says photographs appear in session recordings; it needs one paragraph saying the close-up is used as the reference for the model and for every look rendered on her, that the model image is stored (Cloudinary), and that removing the close-up removes the twin. No consent gate beyond the upload itself — the upload is the ask — but the sentence has to exist before the feature does.

## Cost

Unchanged in shape. One twin generation per settled change (~10¢ at 2K), one render per saved composition (~7¢, unchanged). The shared catalog's one-time curation cost disappears; a cell that was ~10¢ once for everyone becomes ~10¢ once per person, which at beta scale is noise.

## Build order

1. Harness run (above) — the only step that can change the recommendation.
2. Server: `twinDescriptor`, `POST /api/avatar/twin` (job + poll, the cell endpoint's shape), migration for `twin_url` / `twin_key`, `avatarRefForUser` → two references + the figure line, the three render prompts.
3. Twin page: the facts drawer's two rows, the parametric figure + three scales (3C), the hero on the twin with the debounced regen (3A/3D), the full-length slot removed, the swatches as overrides (3B).
4. `/privacy` paragraph and the share line.

Harnesses: `settings_harness` rewritten for 3C and the hero; `style_dna_block_test` for the two new facts lines; `avatar_client_smoke` for `render_key` on `twin_key`.
