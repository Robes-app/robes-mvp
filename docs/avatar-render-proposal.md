# Robes — Looks on Her Avatar: Research + Proposed Solution

**Status:** Research complete · entry-point decision recorded (§3.3) · awaiting Annie's designs
**Date:** 25 August 2026
**Supersedes where they conflict:** the Claude Chat brief ("Avatar Outfit Rendering: Technical Brief", 22 Aug 2026) — this document is grounded in the live `beta` codebase; the brief assumed a Next.js/Supabase-Storage stack Robes doesn't have.

---

## 1. What we're building

Map the results of the selfie-led Style Notes analysis (colour harmony + silhouette & fit) to a **stored avatar** — a consistent, body- and colouring-matched model. A saved look then renders as a single photograph of that avatar wearing the look, answering the proportion question the flat-lay mosaic can't ("where does the waistcoat hem land against those jeans?"). The mosaic stays as the loading state, the fallback, and "the pieces" view.

She is **proposed** an avatar derived from her own analysis, and can change it — a different skin tone, different hair — before saving it for use across Robes.

---

## 2. Research findings (verified 22 Aug 2026)

### 2.1 Gemini capability — the brief's thesis holds, and is slightly better than stated

- **`gemini-3.1-flash-image` accepts up to 14 reference images mixed in one call** (official Gemini API docs). Google's guidance: the model holds consistency for **up to 5 people and ~14 objects** across a workflow. The brief's hard "10 object / 4 character slots, cannot be pooled" split comes from a third-party source and is **not** in Google's documentation — treat 14 total as the budget, with 1 avatar reference + up to ~10 garment photos sitting comfortably inside it.
- Character consistency is real but "not always perfect" (Google's own wording) — it comes from **re-feeding the same reference image**, never from re-describing the avatar in text. There is no seed parameter in play in our SDK calls; the reference image IS the identity.
- **Pricing confirmed against the official pricing page**: $0.045 (0.5K) / **$0.067 (1K)** / $0.101 (2K) / $0.151 (4K) per generated image; Batch API is 50% off. A saved look rendered once at 1K costs ~7¢, then $0 forever (we persist to Cloudinary).
- Flash over Pro stands: Flash takes the most reference images, is the "high-volume, high-efficiency" tier, and **is the model Robes already runs for every generated frame** — same SDK, same wrapper, same `generation_log` capture. No new vendor, no new model string risk.
- FASHN stays rejected for the same reasons as the brief (1 garment per call, chained artefacts, 3× cost, new vendor, expiring URLs).

### 2.2 What the codebase already gives us (this is where the brief was flying blind)

**The avatar descriptors already exist in the database.** Every colour analysis persists `style_dna.color_harmony.extracted_values = { skin_tone_hex, hair_color_hex, eye_color_hex }` plus season, `verified_undertone`, `calculated_contrast`; every silhouette analysis persists `body_type` (5 archetypes) + `geometric_ratios` (shoulder/waist/hip). **No new capture flow, no selfie ask, no consent work** — the mapping input is sitting in `profiles.style_dna` today.
- One cheap enrichment: the analyse pipeline already *generates* prose `hair_observation` / `skin_observation` / `eye_observation` fields (paid for on every analysis) but drops them at `server.js:2603` — a one-line change persists them for richer avatar descriptors.

**The identity-preserving image pattern is already written.** `POST /api/stylenotes/tryon` (server.js:2616) does exactly the render-shape we need — an identity-lock instruction + a reference image + "change only the clothing" — including re-fetching a stored Cloudinary URL back into base64. It's deployed and currently unwired to any client. Its `IDENTITY` prompt is the proven scaffold.

**The display slot already exists.** `looks.photo_url` is defined (migration 14) as "the look's image, never a source of garment data" — an avatar render fits that contract exactly. `_ltMosaicHtml`'s `opts.photo` short-circuits the whole mosaic into one full-bleed image, and the Look detail already renders a `photo_url` as a 4:5 hero panel in place of the board (`dashboard-personalize.js:9588`). **The Lookbook grid card and Look detail need near-zero UI plumbing** — the mosaic-as-fallback behaviour is the existing code path.

**The job/persistence infrastructure is the existing one.** `imageJobs` Map (10-min TTL) + `GET /api/images/:jobId` polling + `cloudinaryUpload` + client persist-on-arrival — the same contract every generated frame already rides. The render must be persisted client-side before the job TTL, which the daily/travel pollers already do.

**One genuinely new thing:** no call in the codebase today passes **more than one input image** to Gemini. Avatar-reference + N garment photos in a single request is unprecedented *for us* (not for the model). This is the thing to validate first.

### 2.3 Corrections to the brief

| Brief said | Reality |
|---|---|
| Next.js App Router, Supabase Edge Functions, Supabase Storage | Vanilla JS + Express `server.js` on Railway; imagery lives on **Cloudinary**; Gemini is called directly from the server |
| New `user_avatars` table + `saved_looks.render_url` schema | Maps onto `profiles` (one new column set) + the existing `looks.photo_url` / `lookbook_items.data` jsonb — far smaller migration surface |
| "Verify 10 object / 4 character slots" | Verified: **14 mixed references total**; the per-category hard caps aren't in official docs |
| Avatar generated per-user at onboarding | Recommend a **curated catalog** instead (Annie's instinct — see §3). Per-user bespoke generation is the fallback, not the default |
| `my-robes.com` vs `byrobes.com` confusion | beta.byrobes.com (`beta` branch), www.byrobes.com (`main`) |

---

## 3. Proposed solution

### 3.0 The core decision: a curated avatar catalog, not per-user generation

Annie's proposal — "create a series of stored avatars" — is the right architecture, and better than the brief's generate-per-user flow:

1. **It converts the biggest open risk into a one-time editorial task.** The brief's top risks are "no known hit rate" and "body/skin-tone range untested". With a catalog, every avatar is generated once and **human-approved by Annie before any user ever sees it** — a bad generation is a curation reject, not a live product failure. Per-user generation puts an unreviewed model output in front of every user at their most sensitive moment.
2. **"Choose a different avatar" becomes trivial and safe.** Swapping skin tone or hair is stepping to the adjacent catalog cell — no regeneration, no waiting, no chance the swap comes back wrong.
3. **Render consistency is identical either way.** Consistency comes from re-feeding the stored reference image; whether that image came from a catalog or a bespoke generation makes no difference to the render pipeline.
4. **It's the house pattern.** Deterministic catalogs fed by LLM extraction is exactly how Style DNA already works (`style_dna.js`: 12 seasons, 5 bodies — extraction proposes, the catalog decides). The avatar catalog is the same idea with images.

### 3.1 The catalog

A new root module **`avatar_catalog.js`** (the `wardrobe_taxonomy.js` pattern — single source of truth, in-repo), each entry:

```js
{ id: 'w-deep-warm-black-classic',   // stable key
  gender: 'woman',                    // normGender vocabulary; 'man' set can follow
  skin:  { band: 5, undertone: 'warm', hex: '#8D5A3B' },   // band ≈ Monk Skin Tone scale
  hair:  { colour: 'black', hex: '#1A1512' },
  build: 'hourglass',                 // internal key ONLY — never rendered in UI
  image_url: 'https://res.cloudinary.com/…',   // the canonical reference image
  descriptor: '…'                     // the text used to generate it, kept for regeneration
}
```

**Axes and initial matrix** (kept deliberately small to launch):
- **Skin**: ~8 tones — 4 depth bands × warm/cool undertone (Monk-scale-informed so the range is inclusive by construction, not by accident).
- **Hair**: 5 colours (black · dark brown · light brown · blonde · red/auburn), one editorial shoulder-length cut to start. Length/texture variants are a later axis.
- **Build**: the 5 silhouette archetypes the engine already classifies. *Internal key only — the words "body type", "Hourglass", "Pear" etc. must never appear in the UI* (the brief's constraint, kept as a hard rule).

Full cross = 8 × 5 × 5 = 200 images. Two ways to keep launch tractable — **decide at curation time, the architecture is the same**:
- **(a) Full pre-generation**: ~$20–30 of image spend + a curation pass. Every cell QA'd up front.
- **(b) Lazy fill (recommended)**: pre-generate and QA the ~40 identity cells (skin × hair) on one neutral build; generate a cell's build variant the first time a user's mapping lands on it, hold it for Annie's approval queue in `/admin`, fall back to the mosaic until approved. The catalog fills organically with only cells real users need.

**Generation**: `scripts/gen_avatar_catalog.mjs` — descriptor → `gemini-3.1-flash-image` (reusing `FULL_BODY_FRAME` framing rules: head-to-toe, face and shoes visible, soft daylight, warm-grey studio backdrop, neutral base layer — a simple cream vest + straight jeans, so garments always *replace* something legible) → Cloudinary → manifest entry. Each avatar is shot once, front-facing, well-lit — Google's stated requirement for a good consistency reference. Regeneration is re-running the script on one id.

### 3.2 The mapping (deterministic, no LLM call)

`proposeAvatar(styleDna, gender)` — pure function beside the catalog, mirroring `classifySeason`/`classifyBody`:
- skin band ← nearest catalog band to `extracted_values.skin_tone_hex` (fallback: season family → depth heuristic when the hex is null); undertone ← `verified_undertone` (Neutral-Warm → warm side, Neutral-Cool → cool side)
- hair ← nearest catalog colour to `hair_color_hex` (fallback: `hair_observation` prose once persisted, else default dark brown)
- build ← `silhouette_proportions.body_type` (fallback: Rectangle — the engine's own fallback)
- No analysis at all yet → no proposal; the feature simply isn't offered until Style Notes has a chapter (same gating pattern as `_rbSilPrompt`).

Because it's deterministic, it's testable in a harness, explainable in `/admin`, and free.

### 3.3 The proposal + change moment (the part Annie designs)

> **DECISION (Annie, 2026-08-25) — analysis-led proposal is the primary door; selection is the fallback; neither lives in onboarding.**
> The question was "generate from her Style Notes vs. select an avatar during onboarding". Resolved:
> - **Onboarding stays untouched** — it was deliberately cut to two steps after bail-point feedback, and at that moment she has given no colouring or body data: a proposal would be a guess, a catalog browse is friction, and a grid of avatars differing in figure is a body lineup (forbidden, §6).
> - **With any analysis on file**: the deterministic proposal is the door — more customised AND lower friction than selecting (zero decisions), and the avatar becomes Style Notes' missing payoff.
> - **Without analysis**: an invitation to Style Notes ("Meet your model — start with your colouring"), plus a **two-swatch quick pick** (skin tone + hair, on one neutral figure) for the impatient path — attribute-led selection, never avatar browsing, so it stays inside the body-lineup rule. When she later completes the silhouette chapter the figure cell upgrades silently; her skin/hair picks persist as `avatar_prefs` overrides.
> - Both doors land on the same catalog, the same change sheet, the same stored `avatar_id` — the only difference is who fills in the starting cell.

> **DESIGN ROUND 1 (Annie's `Style_Notes_to_Your_Model.dc.html`, built 2026-08-25) — three further decisions, all shipped in the page slice:**
> 1. **Style Notes collapses to ONE entry page** — "Two photographs. One model." (close-up + full-length steps beside a live model rail). Taste & budget moves out to its own menu entry (`/stylenotes#taste`).
> 2. **Keep her is live from the close-up alone** (supersedes the mock's both-photographs gate — a full-length requirement would re-introduce the exact bail point onboarding removed): colour read = keepable on a neutral figure; the line read upgrades the figure silently later.
> 3. **Two figure nudge pairs for v1** (Softer/Straighter, Fuller/Narrower — Longer/Shorter cut to keep the catalog matrix small), and **the full analysis chapters survive behind quiet "Her full notes →" doors** on the page (reduced results inline; nothing deleted).
>
> The page's model preview is deliberately an **abstract figure, not imagery** — it adjusts instantly and ships before any catalog exists; the photoreal model arrives with the render pipeline (§3.4). Shipped as: rebuilt `public/stylenotes.html`, migration 20 (`supabase/avatar_migration.sql` — `profiles.avatar_id` + `avatar_prefs`, localStorage degrade until run), the deterministic mapper client-side, `scripts/stylenotes_model_harness.mjs` (158 checks).

> **PHASE 2 SHIPPED (same day) — the render pipeline (§3.4), with one amendment**: avatar cells generate **lazily server-side** (first render that needs a cell generates its reference portrait once, stores it in `avatar_cells`) instead of a pre-generated catalog — the §3.1 "lazy fill" option taken to its conclusion, since the reference image itself never renders in the UI. The curation/approval queue (§3.1's hard rule) is deferred to the /admin pass and flagged in CLAUDE.md. `POST /api/avatar/render` = 1 avatar reference + ≤9 garment photos + text manifest in one `gemini-3.1-flash-image` call; render triggers at look create / edit-&-resave with the `render_key` cache; display ladder `render_url → photo_url → mosaic` everywhere a look draws. Migration 21 (`avatar_render_migration.sql`) adds `avatar_cells` + `looks.render_url/render_key`; everything degrades pre-migration. Live validation: `scripts/avatar_render_smoke.mjs` (smoke + drift runs against beta).

Product shape (final copy/design hers; constraints below are hard):

1. **The reveal**: after a colour or silhouette analysis lands (Style Notes), and once for existing analysed users on the dashboard — "Meet your model." One proposed avatar, full-length, with the line that she was drawn from her colouring and line. CTA saves her; a quiet alternative opens the change sheet.
2. **The change sheet**: a row of skin tones (swatch-led, tap to switch), a row of hair colours. Both are simple catalog-cell steps. For the figure itself: **directional nudges only** — e.g. "softer / straighter", "fuller / narrower" — which silently step between adjacent build cells. Never a lineup of bodies to rank herself against, never the phrase "body type".
3. **Where it lives after**: Account details modal gains a "Your model" row (the collapsible-field pattern the gender control already uses) → reopens the change sheet. Changing the avatar re-renders nothing retroactively by default (existing renders keep their image; an Edit & resave re-renders on the new avatar) — cheap, predictable, and avoids a surprise bulk bill.
4. **Naming**: "avatar" is engine vocabulary — consumer-facing copy should be warmer ("your model", "styled on you", "your mirror" — Annie's call at design time). Never "AI".

**Storage**: migration 20 — `profiles.avatar_id text` + `profiles.avatar_prefs jsonb` (her overrides: `{skin, hair, build_nudge}`, so a regenerated catalog re-maps without losing her choices). Ships with the standard PGRST204 strip-and-retry degrade (its own flag + column-name regex — the existing branches don't cover new columns).

### 3.4 The render (one call at save time)

**`POST /api/avatar/render`** in `server.js`, riding the entire existing pipeline (wrapped `ai.models.generateContent` → `generation_log` for free; `imageJobs`; 3s stagger / serial discipline; `cloudinaryUpload`; `GET /api/images/:jobId` polling):

```
contents.parts = [
  { inlineData: avatar reference image }        ← fetched from Cloudinary (tryon's proven round-trip)
  { inlineData: garment photo } × up to ~10     ← look_pieces → wardrobe_items.image_url (owned)
                                                   or the piece's generated still (unowned)
  { text: assembled prompt }
]
```

The prompt scaffold = tryon's `IDENTITY` lock ("the SAME person — identical face, hair and skin") + `FULL_BODY_FRAME` + a per-garment manifest assembled from wardrobe rows ("she wears: [1] the black tailored waistcoat — worn buttoned; [2] …"), with each image part introduced in order. **Prompt assembly from wardrobe rows is the real engineering work** (the brief is right about this); the endpoint is thin.

- **Trigger**: at the commitment moment — Save this look / Update this look (the rules-01/02 model: named → saved → rendered on her). Never on every view.
- **Cache key**: `avatar_id + sorted piece identity` — stored beside the URL; Edit & resave with the same key skips the call.
- **Persistence**: `looks.render_url` + `render_key` (migration 21, own PGRST204 flag) rather than overwriting `photo_url` — a kp-built look may already carry its editorial frame there, and keeping them separate makes the display ladder explicit. Blob-typed lookbook entries (daily-look etc., when they join later) need **no migration**: the render rides `data` jsonb.
- **Display ladder** (one rule, everywhere a look draws): `render_url` → `photo_url` → mosaic. The mosaic is the instant loading state while a render is in flight, the fallback when one fails, and stays reachable as "the pieces".
- **Resolution**: 1K, 4:5 (the board's export ratio) — $0.067/save. 2K ($0.101) only if 1K disappoints on fabric detail.
- **Gender**: `normGender` routes to the matching catalog set; until a men's set is curated, `man` profiles simply keep the mosaic (never a mismatched avatar).

### 3.5 Later phases (explicitly not now)

- **Daily / travel surfaces**: the Daily anchor shot already generates a full-look editorial image on a *generic* model every time — swapping the avatar reference into that existing call is a natural Phase 3 that *removes* inconsistency rather than adding calls. Travel hero likewise.
- Hair length/texture axis; men's catalog; regenerating the catalog at higher fidelity; Batch API for backfilling renders of existing saved looks.

---

## 4. Validation plan (before any product code)

The brief's §8 order stands, adapted:

1. **Multi-reference smoke** — `scripts/avatar_render_harness.mjs`: one avatar image + 3–5 real wardrobe photos → one render. Proves the unprecedented-for-us multi-image call.
2. **Hit rate** — 20 real looks from the beta wardrobe, deliberately including the failure modes: logos/text, prints, sheer/texture, fine tailoring (the five Balmain buttons), distinctive shoes, and **every skin band and build in the catalog** (the inclusivity check must be pre-launch, not post).
3. **Drift test** — one avatar, 10 different looks, assess whether she reads as the same woman. This is the highest unmitigated risk; the catalog + reference-image architecture is the mitigation, the harness is the proof.
4. Only then: catalog curation → mapping → proposal UI → render endpoint.

A hit rate below ~8/10 shippable means the render launches behind a per-look "keep it / show the pieces instead" affordance rather than as an unconditional hero.

---

## 5. Effort + cost

| Work | Estimate |
|---|---|
| Validation harness + drift/hit-rate runs | 1–2 days |
| Catalog script + generation + Annie's curation pass | 1–2 days (curation is hers) |
| Mapper + migration 20 + proposal/change UI | 2 days |
| Render endpoint + prompt assembly + migration 21 + client persist/display ladder | 2 days |
| Prompt tuning | open-ended — the real variable |

**Running cost**: ~$0.067 per look save; catalog ~$5–30 one-time; $0 per view. At beta scale this is noise; at 10k saves/month it's ~$670 — the point at which Batch pricing and a render-on-first-open strategy get evaluated.

**Not needed**: FASHN (or any new vendor), a selfie capture flow, consent/DPIA work, Supabase Storage, any new polling infrastructure.

---

## 6. Hard rules for whoever builds this

- Never ask her to rank her own body; no body-type lineup; the phrase "body type" never renders. Derive, propose, allow nudges.
- Never re-describe the avatar in text at render time — the stored reference image is the identity.
- Never show an uncurated avatar. A missing/unapproved catalog cell means the mosaic, silently.
- Base64 never lands in a saved row or the `generation_log` (existing conventions hold).
- No "AI" in consumer copy; warm, editorial, confident register throughout.
- The mosaic is never deleted from a surface — it is the one view that cannot be wrong.
