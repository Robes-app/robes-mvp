# Robes MVP — Claude Code Reference

## What this is
Fashion AI styling app. User inputs a key piece (photo, text, or link) → Gemini generates 3 editorial looks with outfit images. Landing page + waitlist live at **www.byrobes.com** (`main`); auth + dashboard closed beta live at **beta.byrobes.com** (`signup-flow`). Both deployed on Railway.

## Stack
- **Backend**: Node.js + Express, ES modules (`"type":"module"`), `server.js`
- **Frontend**: Vanilla HTML/CSS/JS SPA — no framework, no build step
- **AI (styling)**: Google Gemini via `@google/genai`
  - `gemini-2.5-flash` — JSON styling text (3 looks) + wardrobe item analysis
  - `gemini-3.1-flash-image` — editorial outfit images (1 per look)
- **Auth + DB**: Supabase (project: `Robes_p0`, URL: `https://ayowpaknssulsqqvwpqx.supabase.co`)
  - Google OAuth + email/password auth
  - `profiles` table — first_name, style_icons[], budget, wardrobe_description
  - `prompt_history` table — logs every Anthropic API call per user
  - `wardrobe_items` table — per-user clothing pieces with image, category, colour, brand, notes, item_dna
- **AI (wardrobe context)**: Anthropic `claude-sonnet-4-6` via Supabase Edge Function
- **Storage**: Cloudinary (photo uploads + generated images + wardrobe item photos), in-memory `lookStore` Map (48h TTL)
- **CRM**: Airtable — `Contacts` table (email/name), `Feedback` table (every prompt logged)

## Key files
| File | Purpose |
|------|---------|
| `server.js` | All API endpoints + Gemini calls + Cloudinary + Airtable |
| `public/index.html` | Main SPA — all screens in one file |
| `public/signup.html` | Supabase auth signup page (email + Google OAuth) |
| `public/js/app.js` | All client logic — state, flow, rendering |
| `public/css/robes-mvp.css` | All styles |
| `public/look.html` | Shareable look page (static, loads `/api/look/:id`) |
| `public/terms.html` | Beta terms — plain-English, linked from signup legal footer |
| `public/privacy.html` | Privacy notice — plain-English, linked from signup legal footer |
| `public/dashboard.html` | Protected dashboard SPA — wardrobe, styling, account (ejected from Claude Design bundle) |
| `public/dashboard-assets/` | Dashboard fonts/images/app JS extracted from the bundle (uuid filenames) |
| `public/js/dashboard-personalize.js` | The `__robes_personalize` customisation layer for the dashboard |
| `supabase/schema.sql` | DB schema — run once in Supabase SQL editor |
| `supabase/wardrobe_schema.sql` | Wardrobe items table + RLS — run once in Supabase SQL editor |
| `supabase/item_dna_migration.sql` | Adds `item_dna JSONB` column — run once in Supabase SQL editor |
| `public/stylenotes.html` | Protected Style Notes page — colour harmony / silhouette / taste & budget, saves to `profiles` |
| `supabase/style_notes_migration.sql` | Adds Style Notes columns to `profiles` — run once in Supabase SQL editor |
| `supabase/style_notes_analysis_migration.sql` | Adds `colour_analysis` + `silhouette_analysis` JSONB columns — run once in Supabase SQL editor |
| `style_dna.js` | Deterministic Style DNA engine — 12-season + 5-body catalogs, classifiers, prompt injection |
| `supabase/style_dna_migration.sql` | Adds `style_dna` JSONB + `wardrobe_items_count` + triggers — run once in Supabase SQL editor |
| `supabase/functions/wardrobe-context/index.ts` | Edge Function — assembles user profile, calls Anthropic, writes to prompt_history |
| `public/onboarding.html` | First-time-user onboarding flow — splash/intro/name + 4 steps + done, saves to `profiles` |
| `supabase/onboarding_migration.sql` | Adds `onboarded_at timestamptz` to `profiles` + backfills existing rows — run once in Supabase SQL editor |
| `supabase/lookbook_migration.sql` | `lookbook_items` table (saved looks + moodboards, RLS, PK `(user_id, id)` with client `Date.now()` ids) — run once in Supabase SQL editor. The dashboard keeps per-user localStorage as an instant cache and syncs through this table (`_lbCloudPull/Push/Patch/Delete` in `dashboard-personalize.js`); if the migration hasn't run the app silently degrades to local-only |
| `public/board.html` | Public share page template for `/board/:shareId` — server injects OG meta + sanitized payload, no app shell (see Share experience section) |
| `supabase/share_migration.sql` | Adds `share_id` + `is_public` to `lookbook_items` (+ anon RLS select on `is_public = true`) and `instagram_handle` to `profiles` — run once in Supabase SQL editor |

## Branches
- `main` — live production landing page + waitlist (www.byrobes.com) — do NOT merge signup-flow into it yet
- `signup-flow` — auth + dashboard experience, live for the closed beta at **beta.byrobes.com** (same Railway service as robes-mvp-co1h-production.up.railway.app)

## Closed beta (beta.byrobes.com)
- `beta.byrobes.com` is a Railway custom domain on the staging service, which auto-deploys this branch — pushing to `signup-flow` deploys the beta
- Beta invite link for testers: `https://beta.byrobes.com` — this branch's `index.html` is the beta homepage ("One prompt. Dressed for anything.", Get started → `/signup.html`, Sign in link), NOT the waitlist landing that lives on `main`
- All auth redirects are domain-agnostic (`window.location.origin` client-side, relative paths for guards) — no code changes needed per domain
- Per-service Railway env: `PUBLIC_URL` must be `https://beta.byrobes.com` on the beta/staging service and `https://www.byrobes.com` on production (drives share-look URLs)
- Supabase Auth → URL Configuration must allowlist `https://beta.byrobes.com/**` or OAuth + email-confirmation redirects bounce to the Site URL

## What's live vs in development
**Live on byrobes.com (`main` branch)**
- Landing page + styling flow (prompt/photo/link → 3 Gemini looks)
- Shareable look pages (`/look/:id`)
- Airtable CRM logging

**Live for the closed beta on beta.byrobes.com (`signup-flow` branch) — NOT on www.byrobes.com**
- `/signup` — Supabase email + Google OAuth sign-up
- `/dashboard` — protected SPA (plain `dashboard.html`, ejected from the Claude Design bundle)
- `/wardrobe` — wardrobe panel URL alias
- Wardrobe feature: add/edit/delete items, photo upload to Cloudinary, category filtering
- Account details modal (edit first/last name, mobile)
- `wardrobe_items` Supabase table (schema in `supabase/wardrobe_schema.sql`)
- Dashboard v2 layout: Wardrobe tracker → Styling Concierge → Moodboards + Lookbook rows (all live)
- Daily Outfit concierge card: always unlocked ("Style today →" prefills the dress-me prompt); below 15 items it carries an "Editorial until 15 pieces · n/15" progress pill instead of a lock
- Daily Look page: `/api/daily` + `__dlRenderResult` — Context-to-Core framework render (Anchor → Canvas → Texture → Accents) with per-item swap, see its section below
- Travel Edit: `/api/travel` + `__tvRenderResult` — capsule packing & lookbook generator (brief modal with mandatory packed core → 12–15 piece capsule in three tiers + day-by-day Day/Evening lookbook with 4-step formulas, 1:3 interactive multiplier, completeness score + packed checklist, reactive day restyle via `/api/travel/day`, PDF export), see its section below
- `/stylenotes` — Style Notes page (standalone `stylenotes.html`, not part of the dashboard bundle): Colour harmony + Silhouette tabs are Gemini-analysis-driven with empty states; Taste & budget is manual input
- Dashboard **ejected** from the 4.4MB Claude Design bundle into plain files (`dashboard.html` ~150KB + `dashboard-assets/` + `js/dashboard-personalize.js`) — revert = `git revert 63dda67`
- Avatar dropdown grew Style notes + Log out items (`#av-stylenotes`, `#av-logout`)
- Style DNA engine (`style_dna.js`): deterministic 12-season + 5-body archetype mapping from photo primitives, saved to `profiles.style_dna` and injected into `/api/style` + `/api/moodboard` prompts (migrations run on Supabase: style_notes, analysis, style_dna)
- `/onboarding` — first-time-user onboarding flow (standalone `onboarding.html`, see its section below)
- `/terms`, `/privacy` — beta legal pages, linked from the signup footer
- Lookbook + moodboards sync to Supabase (`lookbook_items` table, see its section below) — previously localStorage-only
- Populated moodboards live at `/moodboard/[slug]` (see URL routing section)
- Share flow: every saved surface (moodboard / key piece / daily look / travel edit) publishes to a permanent public page at `/board/:shareId` with OG meta + IG-handle capture (see Share experience section; requires `supabase/share_migration.sql`)
- Style Icons steer every LLM surface (`styleDnaPromptBlock` third arg — see Style DNA section)

## Deploying
```bash
git add <files>
git commit -m "message"
git push -u origin main   # triggers Railway auto-deploy on www.byrobes.com
git push -u origin signup-flow   # triggers Railway auto-deploy on beta.byrobes.com + staging URL
```
No build step. Railway picks up `npm start` → `node server.js`.

## Environment variables (set in Railway)
- `GEMINI_API_KEY`
- `AIRTABLE_TOKEN`, `AIRTABLE_BASE_ID`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `PUBLIC_URL` = `https://www.byrobes.com` on production, `https://beta.byrobes.com` on the beta/staging service
- `PORT` (Railway sets automatically)

Note: Cloudinary vars must be set on **both** production and beta/staging Railway services for wardrobe photo uploads to work.

## Supabase config
- Project: `Robes_p0`
- URL: `https://ayowpaknssulsqqvwpqx.supabase.co`
- Publishable key: `sb_publishable_D_iIPtp_R6kjN_711jfyTg_sFmRdpwJ`
- Google OAuth: enabled, callback URL registered in Google Cloud Console
- Allowed redirect URLs: `https://beta.byrobes.com/**`, `https://robes-mvp-production.up.railway.app/**`, `https://robes-mvp-co1h-production.up.railway.app/**`
- Site URL: `https://beta.byrobes.com` (default target for auth emails when no redirect matches)
- Edge Function secrets set: `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (auto-injected)

### Run-once migrations (Supabase SQL editor, in order)
1–8 are run on `Robes_p0`; 9 shipped with the share flow — verify it has been run (until then sharing degrades gracefully to "try again shortly"). Listed so a fresh project (or a missed one) can be reconciled:
1. `supabase/schema.sql` — profiles + prompt_history + trigger
2. `supabase/wardrobe_schema.sql` — wardrobe_items + RLS
3. `supabase/item_dna_migration.sql` — wardrobe_items.item_dna JSONB
4. `supabase/style_notes_migration.sql` — Style Notes scalar columns on profiles
5. `supabase/style_notes_analysis_migration.sql` — colour_analysis + silhouette_analysis JSONB
6. `supabase/style_dna_migration.sql` — style_dna JSONB + wardrobe_items_count triggers
7. `supabase/onboarding_migration.sql` — profiles.onboarded_at + backfill
8. `supabase/lookbook_migration.sql` — lookbook_items table + RLS
9. `supabase/share_migration.sql` — share_id/is_public on lookbook_items + anon RLS + profiles.instagram_handle

## Supabase DB schema
**profiles**: `id` (FK → auth.users), `first_name`, `style_icons[]`, `budget`, `wardrobe_description`, `created_at`, `updated_at` (+ Style Notes / DNA / onboarding / share columns via the migrations above, e.g. `style_dna`, `onboarded_at`, `instagram_handle`)
- Auto-created on signup via `handle_new_user` trigger
- RLS: users can only read/write their own row

**prompt_history**: `id`, `user_id` (FK → profiles), `prompt`, `response`, `tokens_used`, `model`, `created_at`
- RLS: users can only read/write their own rows

**wardrobe_items**: `id`, `user_id` (FK → auth.users), `label`, `category`, `color`, `brand`, `notes`, `image_url`, `times_worn`, `item_dna`, `created_at`
- Schema in `supabase/wardrobe_schema.sql` — run once in Supabase SQL editor
- `item_dna` JSONB column added via `supabase/item_dna_migration.sql` — run once
- RLS: users can only read/write their own rows
- CRUD via direct Supabase REST API (not Edge Function) using user JWT

## Edge Function: wardrobe-context
- URL: `https://ayowpaknssulsqqvwpqx.supabase.co/functions/v1/wardrobe-context`
- Auth: pass user's JWT in `Authorization: Bearer <token>` header
- Body: `{ "prompt": "..." }`
- Reads user profile, assembles system prompt, calls `claude-sonnet-4-6`, writes to prompt_history
- Returns: `{ "response": "...", "tokens_used": N }`

## Style Notes page (`/stylenotes`, signup-flow branch)
`public/stylenotes.html` is a standalone protected page (NOT part of the dashboard bundle). Session check via `sbClient.auth.getSession()`; no session → redirect to `/signup.html`.

Entry point: the dashboard avatar dropdown — `__robes_personalize` appends an `#av-stylenotes` item after Moodboards (menu order: Account details / Wardrobe / Lookbook / Moodboards / Style notes / Log out) that navigates to `/stylenotes`. The page's ROBES wordmark routes back to `/dashboard`, keeping it inside the dashboard experience.

The topbar carries the standard global header cluster on the right (`.topbar-r`): weather pill (`#sn-weather`, own lightweight geolocation + Open-Meteo fill), Wardrobe button → `/wardrobe`, and an avatar dropdown (`#sn-av-menu`: Dashboard / Wardrobe / Lookbook / Moodboards / Log out) fed by `profiles.first_name` in `init()` — the page never strips the app chrome.

- Three tabs: 01 Colour harmony, 02 Silhouette & proportions, 03 Taste & budget. Breadcrumb `ROBES | Style notes / [chapter]` is pure hierarchy, never a control.
- Tabs 01 + 02 are **analysis-driven with empty states**: before a photo is uploaded the hero shows only the headline + invite copy; every section below is hidden. Presence of `profiles.colour_analysis` / `profiles.silhouette_analysis` (JSONB, via `supabase/style_notes_analysis_migration.sql` — run once) decides empty vs filled — never the scalar columns.
- Photo upload runs two parallel requests: `POST /api/stylenotes/analyse` (`{kind: 'colour'|'silhouette', data, mimeType}`) and `POST /api/wardrobe/upload` (Cloudinary). On success the analysis fills all sections and saves: render JSON to the `*_analysis` column, the DNA fragment merged into `profiles.style_dna`, derived scalars (`season`/`undertone`/`contrast` or `body_type`) + photo URL. On `no_face_detected`/`no_person_detected` an inline error shows under the slot and nothing is saved.

## Style DNA engine (`style_dna.js`, PRD: Style DNA Core Profile Generation)
The analyse endpoint runs **reasoning-first extraction + deterministic catalogs**: Gemini (`gemini-2.5-flash`, `temperature: 0`) writes stylist-grade observation fields FIRST (lighting cast, hair/skin/eye temperature evidence, pose distortions), then a **holistic archetype call** (`season` against the 12-season rubric embedded in the prompt / `body_shape` against the 5-archetype rubric) alongside the measurable primitives (undertone/contrast/chroma/lightness enums; shoulder/waist/hip ratios). Schemas use `propertyOrdering` so observations precede classification — the JSON doubles as chain-of-reasoning. Everything the user sees still comes from the `style_dna.js` catalogs:
- **Reconciliation (deliberate deviation from PRD §4.2/§5.1 primacy)**: `buildColorHarmony`/`buildSilhouette` prefer the model's holistic archetype call; the primitive mapping (`classifySeason`/`classifyBody`) is the deterministic fallback (schema-less retry, old payloads) and a cross-check recorded in `dna.classification` (`source`, `primitive_season`/`ratio_body_type`, `agreement`, `reasoning`). Rationale: the 4-enum mapping discards the holistic evidence a stylist uses — one wrong enum (Cool vs Warm) lands the opposite season family, the exact observed failure (warm muted blonde → True Summer instead of Soft Autumn). If the holistic season's family contradicts the extracted undertone, undertone is coerced to Neutral-Warm/Neutral-Cool so the rendered copy stays coherent.
- The silhouette prompt corrects for **mirror-selfie pose distortion** (a raised phone arm widens that shoulder — the old prompt read hourglass frames as Inverted Triangle) and camera angle before estimating ratios, and only allows Inverted Triangle on an unmistakably broader corrected shoulder line + undefined waist.
- **Extraction runs at `temperature: 0`** (the default 1.0 was sampling different undertone/contrast/chroma enums for the same photo, cascading into a different season on each retry — this is why colour results looked inconsistent). The colour prompt enforces a measurement protocol: neutralise ambient colour cast against the sclera/teeth first, ignore background/clothing/makeup, treat hair temperature (golden vs ash) as first-class undertone evidence. Accuracy ceiling is still the model perceiving colour semantically not colorimetrically — the parked next step is true PRD §4.1 colorimetry (Gemini locates skin/hair/iris/sclera regions, server samples pixels via `sharp`, LAB + sclera white-balance decide undertone/contrast).
- `classifySeason()` — PRD §4.2 mapping matrix → one of 12 seasonal archetypes (`SEASONS` catalog: 18-shade matrix, 6 neutrals, 4 stars + 4 accents, 7 avoid, metals rules, stylist voice from the Colour Harmony matrix sheet). Note: the sheet's Deep Winter/Cool Winter/Cool Summer/Warm Autumn/Deep Autumn names are mapped to the PRD enum's Dark Winter/True Winter/True Summer/True Autumn/Dark Autumn.
- `classifyBody()` — PRD §5.1 width-ratio thresholds → one of 5 body archetypes (`BODIES` catalog from the Master Archetype Registry: 4 dresses + notes, 4 necklines, 4 display tips, 4 full styling maxims). Loose clothing + flat ratios → Rectangle fallback with `fallback_applied: true`. Hourglass shoulder:hip band widened to 0.9–1.1 (photo-estimated ratios are noisy).
- `styleDnaPromptBlock` honours `style_dna.user_overrides` (`loved_colors`, `rejected_colors`, `measurements`) — user corrections outrank the photo-derived profile in every downstream prompt. No UI writes these yet; it's the landing slot for the planned refinement loop.
- `buildColorHarmony()` / `buildSilhouette()` return `{ render, dna }` — render feeds the page, dna is the PRD §3.3 `style_dna` payload (`color_harmony` / `silhouette_proportions` fragments). `low_confidence` lighting sets `refinement_needed: true` and falls back to Neutral-Warm.
- `styleDnaPromptBlock(styleDna, wardrobeCount, styleIcons)` — PRD §6 downstream injection: flattens the DNA into LLM prompts with State A (<15 items, editorial/cold-start) vs State B (≥15, strict closet matching) directives. Wired into `/api/style` (accepts `styleDna`, `wardrobeCount`) and `/api/moodboard` (accepts `styleDna`); `__robes_personalize` passes `_rbStyleDna()` + `_waItems.length` from `window.__robes_profile.style_dna` (added to the dashboard boot select along with `wardrobe_items_count`).
- **Style Icons steer every surface**: the third arg (`profiles.style_icons`, client helper `_rbStyleIcons()`) renders a north-star directive — follow the icons' aesthetic, brands and styling codes without ever contradicting the DNA colour/silhouette rules. Works icons-only (before any photo analysis exists). Wired through `/api/style`, `/api/daily`, `/api/travel`, `/api/travel/day`, `/api/moodboard` (`styleIcons` in every client payload, incl. the onboarding prefire).
- Migration `supabase/style_dna_migration.sql` — run once: `style_dna JSONB` + GIN index, `wardrobe_items_count` + insert/delete trigger on `wardrobe_items` + backfill, vector extension. Deviation from PRD §3.1: existing text columns are NOT converted to Postgres enums (live RLS table); value sets are enforced by the engine.
- Tuning palettes/copy/rules = edit `style_dna.js` only; no prompt or client changes needed.
- The client downscales photos to max 1600px JPEG before sending (`createImageBitmap` → canvas, FileReader fallback) — keeps analyse + Cloudinary fast and clear of the 20mb body limit.
- Each photo slot shows `.slot-guide` microcopy on lighting/framing (headshot: soft daylight facing a window, no filters/direct sun/coloured light; full-length: straight-on head-to-toe, fitted clothing) — biggest cheap accuracy lever for the analysis.
- `/api/stylenotes/analyse` model chain: `gemini-2.5-pro` (schema, `thinkingBudget: 1024` — pro can't disable thinking, so it's bounded; `maxOutputTokens` 4096) → `gemini-2.5-flash` (schema, thinking off, 2048) → flash **without** schema (JSON mode + the prompt's field spec — renderers validate shape anyway). Pro leads because season/body-shape judgement is a once-per-user call worth the latency. JSON parsing happens inside the attempt loop, so a truncated pro response falls through to flash instead of 502ing. All attempts failing → 502 `{ error: 'analysis_failed', reason }`; the client logs `reason` to the console and Railway logs carry `[stylenotes/analyse] <model> failed` + the model that answered in `logAI`.
- Colour analysis JSON drives: 18-hex palette, undertone rows + note, 6 neutrals, 8 best colours, 7 avoid colours + note, proof captions, 3 seen-on-you label pairs, 3 metals (name + 3 gradient hexes) + note. Silhouette drives: body type, 4 traits, 4 dress cards, 5 necklines, 5 tips. All LLM strings pass through `esc()`, hexes through `hex()` validation.
- Loads/saves to `profiles`: `season`, `undertone`, `contrast`, `body_type`, `colour_analysis`, `silhouette_analysis`, `style_icons`, `budget` (tier name), `splurge_categories`, `annual_spend`, `headshot_url`, `full_length_url`. Base columns via `supabase/style_notes_migration.sql` — run once.
- Saves fire immediately on each interaction (`update … eq('id', uid)`); `#save-state` in the top bar shows Saving…/Saved/Couldn't save.
- `#ch-season-row`, `#ch-metrics`, `#sil-type-row` carry inline `display` styles — toggle via `style.display`, NOT the `hidden` attribute (inline display beats it).
- Only two upload affordances exist: headshot (tab 01, 300×380) and full-length photo (tab 02, 300×520). Never make the analysis/try-on frames uploadable.
- **Try-on imagery** (`POST /api/stylenotes/tryon`, `{kind, analysis, data+mimeType | photoUrl}`): after a successful analyse, the client fires a background job that renders the user (identity-preserving `gemini-3.1-flash-image` edit of their own photo) into the proof pair (best vs first avoid colour, colour tab) and the 4 dress silhouettes (silhouette tab, dresses coloured with the user's first star colour when the colour analysis exists). Images generate staggered 3s apart, upload to Cloudinary (URL-only — never base64 into the job), and the client polls `GET /api/images/:jobId` every 4s (`pollTryon`), patching frames as they land and persisting the URLs into `colour_analysis.proof_images` / `silhouette_analysis.dress_images` so they survive reload. `init()` backfills imagery for analyses saved before the feature existed via the stored `headshot_url`/`full_length_url` (Cloudinary-hosted only; once per session via `sessionStorage.rb_tryon_*` so a flaky job can't loop). Frames pulse (`rb-pulse`) while a job is live. Remaining `.ph` frames (seen-on-you, necklines, styling tips) are still editorial placeholders.
- No hex labels under clothing colours, no Accessories/Jewellery/Makeup sections, no "Read once"/privacy strings (explicit design exclusions).
- Selected states are warm cream `#F3EFE6` with `#C9BCA6` border + small dark dot/check — never heavy black fills.

## Onboarding flow (`/onboarding`, signup-flow branch)
`public/onboarding.html` is a standalone protected page (vanilla, no framework) ported from the Claude Design "Robes Onboarding Flow v2" bundle. One state machine (`st.stage`): dark splash (auto-advances 2s) → intro → name → 4 cream working steps → dark done screen. All copy/tokens come from the mockup — Cormorant + Inter, `--primary` ink dark arc, cream `#FAF8F5` steps, 2px radii, hairline borders.

**Gating**: `profiles.onboarded_at` (via `supabase/onboarding_migration.sql` — run once; backfills existing users so only new signups see the flow). Dashboard boot selects it and redirects to `/onboarding` when the profile row loaded AND `onboarded_at` is null AND `sessionStorage.rb_onboarded` is unset (the session flag is a loop guard in case the DB write fails). If the select errors (migration not run), boot retries without the column and does NOT redirect. Email signup with an immediate session goes straight to `/onboarding`; Google OAuth + email-confirmation links still land on `/dashboard` and bounce via the boot check.

**Steps + persistence** (all saves fire immediately via `sbClient.from('profiles').update`):
- Name (dark screen) — prefilled from `profiles.first_name`, falling back to auth `user_metadata` (`first_name`/`given_name`/first token of `full_name`). Saves `first_name` (first word) only when changed.
- Step 01 Icons — typeahead + chips over the `ROBES_ICONS` pool, saves `style_icons` on continue.
- Steps 02/03 Colour + Silhouette — same pipeline as stylenotes: downscale to 1600px JPEG, parallel `POST /api/stylenotes/analyse` + `POST /api/wardrobe/upload`, save `colour_analysis`/`silhouette_analysis` + `style_dna` merge + scalars + photo URLs. The "What Robes reads" ledger flips Awaiting → Reading → real values (season/undertone/contrast, body type). `no_face_detected`/`no_person_detected` shows an inline error and saves nothing.
- Step 04 First piece — pivoted from text prompt to wardrobe capture: photo panel (same `.cap` chrome as steps 02/03) + optional single-line stylist note; the "What Robes files" ledger reads The piece / Category / Brand / Colour / Cut. CTA "Catalogue this piece" runs the same `/api/wardrobe/analyse` + `/api/wardrobe/upload` pair as the dashboard add flow (one retry on `analysisFailed`/missing label), then: scan-line animation while reading → extracted tags pop over the photo staggered (`kpTagPop`: category, editorial colour, brand, silhouette fit + label banner) → row inserted into `wardrobe_items` via `sbClient` (background, promise kept in `st.piece.savePromise`) → activation modal drops in ("Piece nº 01 · Cataloged / In your wardrobe."). Modal primary "Style it three ways" writes `sessionStorage.rb_onboard_piece = {prompt, photo, cataloged}` (prompt = note or analysed label; `cataloged` awaits the insert with a 3s cap; photo dropped on quota errors) and goes to done; ghost "Straight to the dashboard" goes to done without a handoff. `noItemDetected` clears the photo with an inline error; a hard analysis failure keeps the photo so the CTA can be retried. No photo → nudge; Skip still goes to done. The activation modal waits an extra beat after the tag pops (pacing is deliberate), carries an X close, and once dismissed only the CONTINUE CTA reopens it (`P.modalDismissed`). Opening the modal prefires `/api/style` (`prefireStyle` — same payload as the concierge, incl. `styleIcons`) and stores the finished result in `sessionStorage.rb_onboard_styled`; the dashboard handoff (`_rbOnboardHandoff`) renders it instantly via `__kpRenderResult` and only falls back to `_cbStyleSubmit` when the prefire hasn't landed.
- Done screen — sets `onboarded_at` + `sessionStorage.rb_onboarded`, CTA → `/dashboard`.

**Dashboard handoff**: `_rbOnboardHandoff` IIFE at the end of `__robes_personalize` reads + clears `rb_onboard_piece` and calls `_cbStyleSubmit(prompt, photo)` after 1200ms — the user lands on the dashboard, sees the existing "Styling your piece three ways…" overlay, then `__kpRenderResult`. Reuses the whole concierge pipeline; no new result rendering. The handoff's background wardrobe persist only runs when the payload lacks `cataloged: true` (legacy payloads or an onboarding insert that failed) — step 04 normally saves the item itself, so this guard is what prevents duplicate wardrobe rows.

Every working step has "Skip for now" — the flow never blocks. Only the name screen gates its Continue (disabled until non-empty).

## signup.html conventions
- Supabase client instantiated as `sbClient` (not `supabase` — conflicts with `window.supabase` global from CDN)
- Google OAuth redirects to `/dashboard` after auth
- Email signup: sends confirmation email; if `data.session` exists, redirects immediately
- `setLoading(true)` fires only **after** all client-side validation passes (email/password/firstName/password length) — putting it earlier leaves the submit button stuck on "Creating your wardrobe…" when validation fails
- Supabase applies its own signup rate limit (~3/hour per email) independent of app code. On error, `rate limit`/`too many` in `error.message` swaps in a friendly message telling the user to wait an hour or use a different email — surfaces during repeated beta-testing with the same address, not a bug

## Conversational intent routing (PRD §2 — the inspiration tracks)
The concierge textarea (`#cb-ta`) routes every submit through `_cbSubmit` → `_cbResolve` in `dashboard-personalize.js`:
- **Chip = explicit override.** The three chips (Style a key piece / Dress me today / Create a moodboard) still exist as prompt scaffolds and manual overrides — a deliberate deviation from the PRD's "remove the pills": they double as the clarifying affordance.
- **No chip = NL intent extraction.** `_cbDetectIntent(text, hasPhoto)` classifies the free-typed prompt into `'style' | 'dress-me' | 'moodboard' | 'travel' | null`. Priority: a named piece beats the occasion around it ("my Prada shoes to the office today" → key piece, per PRD); a trip beats the occasions inside it ("dinners on my Ibiza trip" → travel), except an explicit "moodboard" ask. A photo attachment always means `'style'`.
- **null = clarifying loop.** `_cbShowClarify(prompt)` renders `#cb-clarify` (four tap options, incl. "Pack for a trip") under the chip row; the typed prompt is preserved and submitted with the chosen track via `_cbResolve`. Never clobber the textarea in this path — `_cbSetIntent` (chips) injects template text, `_cbResolve` does not.
- **Dress-me routes to `/api/daily` at every wardrobe count.** `_cbResolve('dress-me', …)` calls `window.__dlSubmit(prompt)` — the Daily Look track itself handles cold-start (fully aspirational at 0 items, hybrid below 15 with an explanatory toast, closet-first at ≥15). The chip is never locked; the old moodboard reroute is gone.
- **Travel routes to the brief modal, not straight to the API.** `_cbResolve('travel', …)` calls `window.__tvOpen({brief: prompt})` — destination + dates need structure, so the typed prompt lands in the modal's notes field (with a light destination-prefill heuristic).

## Daily Look context + closet injection (`/api/style`)
`/api/style` now accepts `intent` (`'style'` default | `'dress-me'`), `context` (`{city, month, tempRange, condition, hint}`) and `wardrobeItems` (label/category/color/times_worn, capped at 60 server-side):
- `_rbWeather` stores what it fetches in `window.__rbCtx` (`city`, `tempC`, `tempRange` from daily min/max, `condition`, `hint` via `layerHint()`), which `_cbStyleSubmit` snapshots into `context` for dress-me submits. Nav strip painting is unchanged.
- Server: `intent === 'dress-me'` swaps the system brief (three complete outfits for a real day, not three ways around one piece), relaxes the fallback rule (a plain occasion is a valid brief — only gibberish falls back), injects the real-time context line, and — at ≥15 closet items — directs Gemini to build primarily from the digitised wardrobe, referencing owned pieces by exact label.
- Both `/api/style` briefs carry the PRD §3.2 four-tier layer formula (Anchor / Canvas / Texture / Exclamation Point) + hyper-specificity directive.
- `__kpRenderResult(data, promptText, opts)` takes `opts.intent`/`opts.context`: dress-me gets the "Your day, dressed three ways" header, the contextual metadata pill (city · month | temp range | layer hint), and "Today's brief" instead of "Your piece". `intent`+`context` are persisted inside `kpData` so reopened lookbook entries keep the daily framing.

## Daily Look page (`/api/daily` + `__dlRenderResult`) — Context-to-Core framework
The dress-me track's own surface: ONE complete outfit for the real day, rendered as the four architectural steps a stylist works through, with per-item swap. Replaces the old "three ways" render for dress-me (the `/api/style` dress-me path still exists for backward compat with saved lookbook entries).
- **Server `POST /api/daily`**: accepts `{prompt, name, styleDna, wardrobeItems (id/label/category/color/brand/image_url/times_worn, capped 60), context}`. The system prompt encodes the Context-to-Core Framework — 1) Context Filters (agenda/mobility from the brief, atmospheric reality from `context`, psychological goal), 2) Architectural Formula (exactly 4 steps: The Anchor ×1 / The Canvas ×1–2 / The Texture ×1 / The Accents ×2), 3) Golden Ratios (rule of thirds, volume balancing, textural contrast — surfaced in `stylist_summary` + item descriptions), 4) Transition Protocol (`transition_tip`: one subtractive-styling or hardware-swap move). Structured schema (`DAILY_SCHEMA`, gemini-2.5-flash, `thinkingBudget: 0`, 3000 tokens), fallback only on gibberish.
- **Wardrobe-state directive** shifts the balance: 0 items = fully aspirational (every item `wardrobe_index: -1` + retailer_hint + price_point — a shopping brief), 1–14 = hybrid (owned pieces referenced by index + exact label wherever they serve, gaps filled aspirationally, owned always beats hypothetical), ≥15 = closet-first (new pieces only for true gaps / the exclamation point). Server resolves `wardrobe_index` → `wardrobe_match {id,label,image_url,color}` per item and assigns a flat `image_index`.
- **Imagery**: one frame per item via the shared `imageJobs` infra — anchor gets the full-look editorial shot (whole outfit, anchor leading), every other item a still-life; staggered 3s, Cloudinary-hosted URLs only, client polls `_dlPollImages` (5-min ceiling — staggered gen is slow) and persists via `_dlPersistImages`.
- **Client render** (`__dlRenderResult(data, promptText, opts)` in dashboard-personalize.js, page `#dl-result-page`, z-index 40 under the nav): eyebrow `TODAY · {OCCASION}`, lead line varies with ownership ("From your wardrobe, / Nearly all yours, / Styled for you, {name}."), provenance dot + `palette` swatches (3 validated hexes), weather pill, stylist-summary card (step names bolded client-side) + transition tip, then the 4 numbered step sections — each item row shows name/brand plus "✓ Yours" or "retailer · price" and a SWAP pill.
- **Swap** (`__dlSwap(flatIdx)` → `__dlSwapApply`): same PRD 3.B modal as moodboards (category-filtered wardrobe grid, AI-alternative fallback, Snap mine → `WA.open()`, affiliate CTA). Apply overwrites the item's name/brand with the owned piece, clears retailer/price, sets `wardrobe_match`, re-renders (items are references into `__lastDlData.steps`) and patches the saved lookbook entry.
- **Persistence**: auto-saved to the lookbook as `type: 'daily-look'` with `dlData` (jobId stripped so a reopened entry never polls a dead job); `__snOpenItem` re-opens via `__dlRenderResult(..., {skipSave: true, savedId})`. Card labels read "Daily look" in all three lookbook surfaces.
- **Reopen must carry `savedId`** — `__snOpenItem` passes `{skipSave: true, savedId: item.id}` and every render's skipSave branch resolves `_xxxActiveSaveId = (opts && opts.savedId) || data.id || null`. The render `data` (kpData/dlData/tvData) has no `id` of its own, so dropping `savedId` leaves the active id null; the next Share then hits `_shareFindOrMake`'s lazy-mint path and `snAdd`s a **duplicate** lookbook row on every share (the key-piece Share-duplication bug — the kp branch was the one missing `savedId`).
- Feedback block posts `surface: 'daily-look'` with occasion/ownership counts to `/api/feedback`.

## Travel Edit (`/api/travel` + `__tvRenderResult`) — Capsule Packing & Lookbook
PRD: AI-Powered Capsule Packing & Lookbook Generator. Replaces the Travel Edit card's `KP.comingSoon` — the card, the concierge `'travel'` intent, and the moodboard's "Pack this trip" CTA (`App.packFromBoard` is repatched, bypassing the bundle's mock pack-sheet) all open the same brief modal.
- **Brief modal (`__tvOpen({brief})`, `#tv-brief-modal`)**: destination, from/to date inputs (default +14/+21 days), free-text brief (PRD step 1's NL trip profile), the Anchor row (below), item-limit stepper 8–15 (default 13). `__tvSubmit` posts `{destination, dateFrom, dateTo, brief, itemLimit, anchorIds, name, styleDna, wardrobeItems (id/label/category/color/brand/image_url/times_worn)}` to `/api/travel`.
- **The packed core (growth PRD epic 1, aggressive-capture revision — Editorial Integration Model)**: the modal's "What's already going in your suitcase?" row shows a "Snap new" tile + wardrobe thumbnails (up to 60). **Mandatory, no cap**: `_TV_MIN_ANCHORS = 2` gates the `#tv-cta` button ("Pack at least 2 pieces to start" until met; `_tvAnchorPaint` drives hint copy + CTA state), and there is no upper limit — a 0-item user must snap 2 new pieces, which is the capture loop working as intended. "Snap new" captures the modal state into `_tvBrief` (`_tvCaptureBrief`), runs the wardrobe add flow, and `_waAfterAdd` re-opens the modal via `__tvOpen({restore: true})` with the fresh piece pre-selected — modal state must survive the round trip. Server: `anchorIds` → closet indexes (uncapped), the item limit auto-expands to core+2 (max 16) so there are always gap slots, and the prompt flips to fill-the-gaps ("editorial integration, not reinvention": validate the core, fill ~`gapCount` slots owned-first; at ≥8 anchors the model acts as pure editor). Every NEW piece must set `bridge` — one clause on what it connects + looks unlocked — rendered in italic on unowned capsule cards (the high-intent affiliate hook). The validation retry also fires when a core piece is dropped (`missingAnchors`).
- **Suitcase Completeness Score (epic 2)**: `#tv-comp` in the render header — owned/total % bar + copy ("N pieces to make yours…" / "Fully yours" at 100%). Recomputed on every render, so swaps and pack-conversions move it automatically.
- **"Packed It" checklist (epic 3)**: every capsule card carries a Packed checkbox (`__tvPackToggle`, surgical DOM update — no re-render, so scroll + 1:3 selection survive) feeding the `#tv-pack-progress` bar next to "The capsule" ("Packed n of m" → "Suitcase closed — bon voyage ✈"). Packing a **curated** (unowned) piece opens `#tv-own-modal` — the conversion moment: "Snap it now" (arms `_waAfterAdd` → `__tvSwapApply`) or "Add without a photo" (`__tvQuickOwn`: direct `wardrobe_items` insert from the capsule metadata, `Swim`→`Swimwear` category mapping, `_waLoad()` refresh so tracker/counts update, then sets `wardrobe_match` and re-renders preserving scroll). `packed` flags live on capsule items inside `tvData`, so they persist and restore on reopen; every mutation patches the saved entry via `_tvPatchSaved`.
- **Server weather (FR-101)**: `fetchTripWeather` geocodes via Open-Meteo, then uses the real forecast when the window is within 16 days, else last year's same dates from the archive API (`seasonal: true`, surfaced as "seasonal read" in the pill). Any failure → `weather: null`, trip still generates. This is destination weather — separate from the client's `_rbWeather` current-city strip.
- **The rules engine**: system prompt encodes the StyleAlchemist 4-Core Pillars — 1:3 high-yield rule, exactly N capsule items across the three tiers (`Foundations & Tailoring` / `Statement & Texture` / `Footwear & Hardware`, targets scaled ~36/28/36% from the PRD's 5/4/5 Ibiza reference), 4-step formula per outfit (`The Anchor` ×1 / `The Canvas` ×1–2 / `The Texture` ×1 / `The Exclamation Point` ×1–2, every entry an `item_index` into the capsule — never an unpacked item), context engineering (location vibe + micro-climate + style DNA), anti-generic constraint. Same 0 / 1–14 / ≥15 wardrobe-state directive as `/api/daily`.
- **Lookbook**: one `days` entry per trip day (capped at 10), each with exactly 2 slots (`Day` / `Evening`), each slot `title` + hyper-specific `how` line + `formula`. `TRAVEL_SCHEMA`, gemini-2.5-flash, `thinkingBudget: 0`, 8000 tokens (big JSON — don't lower it).
- **1:3 validation (PRD §2 "validation parser")**: `travelUnderusedItems` counts distinct outfits per capsule item (only enforced when the lookbook has ≥6 outfits); >2 under-used items triggers ONE corrective regeneration with the offending pieces named. The better attempt wins; no infinite loops.
- **Imagery**: frame 0 = hero editorial shot at the destination; then one still-life per capsule item *without* a wardrobe photo (owned photos are truthful and free), capped at 8 frames total so staggered gen stays under the client's 5-min polling ceiling. `image_index` assigned server-side; `_tvPollImages`/`_tvPersistImages` mirror the dl pattern.
- **Client render (`__tvRenderResult(data, opts)`, `#tv-result-page`, z-index 40)**: header (lead varies with ownership, provenance dot, palette, weather pill ✈, location-vibe pill, stylist summary + suitcase note, hero frame), then the capsule grouped by tier — each card shows photo, "✓ Yours" or retailer · price, an "× N looks" versatility pill and a Swap pill — then the horizontal day-column lookbook (scroll-snap; tap a look to expand its 4-step build via `__tvToggleSlot`). Slot cards show max 3 piece chips + a "+N more" chip — the full build lives in the expand (uncapped chips were the main mobile noise).
- **Reactive day restyle (growth PRD — Reactive Personalization)**: the LLM-guessed itinerary is only the baseline. Day labels render as tappable pills (✎) → `__tvEditDay(di)` opens `#tv-day-modal` ("What are you actually doing?", free text + smart chips like Formal wedding / Boat day; bottom sheet on mobile via `.tv-sheet-wrap`/`.tv-sheet`). `__tvDayApply` posts `{destination, brief, dayIndex, activity, weather, name, styleDna, capsule (lean: name/category/brand/tier/owned)}` to **`POST /api/travel/day`** — a surgical single-day call (`TRAVEL_DAY_SCHEMA`, gemini-2.5-flash, thinking 0, 2500 tokens, no imagery): RE-MIX FIRST from the numbered capsule; `new_item_needed` + `new_item` (with `bridge`) allowed only when the plan genuinely can't be dressed from the capsule (e.g. formal wedding), referenced as `item_index = capsule.length`; a suggested item no formula uses is dropped server-side. Client: `new_item` is pushed onto the capsule (unowned → shows in completeness/checklist/swap like any curated piece), `days[di]` is replaced with `user_activity` stored on the day, render preserves scroll, `_tvPatchSaved` persists **capsule + days**. Other days are untouched.
- **Mobile**: `.tv-daycol` is 84vw under 700px — the lookbook reads as a one-day-per-swipe pager instead of a wall; `.tv-head` collapses to one column; day-edit modal becomes a bottom sheet.
- **Interactive multiplier (PRD §5)**: `__tvSelectItem(ci)` — tapping a capsule card outlines it, keeps co-worn pieces + the looks it appears in at full opacity (looks outlined dark), dims everything else to 0.3, and writes "{name} earns N wears — Day 1 day, …" into `#tv-matrix-note`. The usage matrix (`data._usage`) is rebuilt on every render and never persisted.
- **Swap**: `__tvSwap`/`__tvSwapApply`/`__tvSnapMine` — same PRD 3.B modal as daily look (category grid, AI alternative, Snap mine arms `_waAfterAdd`). Apply patches the saved entry's `tvData.capsule`; capsule items are shared references so lookbook chips + 4-step details update on re-render.
- **PDF export (PRD §5)**: `__tvExport` = `window.print()`; the `#tv-style` print stylesheet hides everything but `#tv-result-page`, strips `.tv-noprint` chrome, wraps the day columns and force-expands every `.tv-slotx` 4-step detail.
- **Persistence**: auto-saved as `type: 'travel-edit'` with `tvData` (jobId + `_usage` stripped); `__snOpenItem` reopens via `__tvRenderResult(tvData, {skipSave, savedId})`; card labels read "Travel edit" in all three lookbook surfaces. Feedback posts `surface: 'travel-edit'`.

## Feedback loop (PRD §4 — every output)
All three generated surfaces carry the inline 👍/👎 + comment block posting to `/api/feedback` → Airtable `Feedback`:
- Key piece / daily look: block inside `__kpRenderResult`; payload includes `email` (Supabase session), `prompt`, and `looksOutput` JSON (`surface`, `intent`, `context`, look titles, timestamp).
- Moodboard: `_mbInjectFeedback(panel, data)` appends `#mb-fb` to `#moodboard-panel` on every `_mbShowResult` (including saved-board reopens); payload includes `email`, `prompt`, and board metadata in `looksOutput`.

## Background image generation (`/api/style`, `/api/moodboard`)
Gemini image generation (`gemini-3.1-flash-image`) takes 20–40s per image — both endpoints respond immediately with text/layout data plus a `jobId`/`mb_job_id`, then generate images in a background `imageJobs` Map (in-memory, 10min TTL) that the client polls via `GET /api/images/:jobId`.
- `/api/style`: images upload to Cloudinary as they land (`cloudinaryUpload` before writing to the job) — the client only ever receives hosted URLs, never base64, so results can be persisted (lookbook) without blowing storage quotas. Falls back to a raw `data:` URL only if the Cloudinary upload itself fails.
- Client polling: `_kpPollImages` (dashboard-personalize.js) starts ~2.5s after render, ticks every 3.5s, swaps each placeholder for the arriving `<img>` with a fade-in, and calls `_kpPersistImages()` on every new URL so the saved lookbook entry gets the images even if the user navigates away before the job finishes.
- `/api/moodboard`: images generate staggered (3s apart) to stay under Gemini's rate limit; `_mbPollImages` ticks every 4s (first poll at 5s) and patches arriving images into the on-screen mosaic **and** the saved moodboard (`panel._savedId`) so a reopened board keeps its imagery.
- Empty mosaic cells are explicit loading states while `mb_job_id`/`jobId` is present: `.rb-tile-loading` adds a small spinner (`.rb-spin`) to every pending cell + a "Creating imagery…" caption on the first, on top of the shared `kpPhPulse` pulse — both mosaic render paths (`_mbShowResult` and the `_mbPollImages` re-render) must keep this markup, and the poll's `done` handler strips it.

## Lookbook + moodboard cloud persistence
Saved looks and moodboards were originally localStorage-only per browser — testing surfaced "Nothing saved yet" after reload and blank image tiles on revisit. Now backed by `lookbook_items` (`supabase/lookbook_migration.sql`, `type` = `'key-piece'`, `'daily-look'`, `'travel-edit'` or `'moodboard'`, PK `(user_id, id)` using the client's `Date.now()` id — the column is unconstrained text, so new types need no migration).
- localStorage (`robes_style_notes__<uid>` / `robes_moodboards__<uid>`) stays the instant read/write cache; every mutation also fires an async Supabase call so the UI never blocks on network.
- `_lbCloudPush(item)` — POST on `snAdd`/`_mbAdd` (new entries)
- `_lbCloudPatch(item)` — PATCH on `snUpdate`/`_mbUpdate` (image URLs landing late, swaps)
- `_lbCloudDelete(id)` — DELETE on `snRemove`/`_mbRemove`
- `_lbCloudPull()` — runs once per boot (after the session helpers are ready, same lazy-poll pattern as `_waInit`): fetches the cloud copy, merges in any local-only entries from before the migration (or from offline saves) and re-pushes them, then overwrites both localStorage caches and re-renders every dashboard row
- If the migration hasn't run, every cloud call fails silently (caught + `console.warn`) and the app behaves exactly as before — local-only, no user-facing error

## Share experience — public pages for moodboards + lookbook (`/board/:shareId`)
Replicates the byrobes.com "Can we share your look?" flow for every saved surface (moodboard, key piece, daily look, travel edit). Run `supabase/share_migration.sql` once.
- **Publish**: `window.__rbShare()` (dashboard-personalize.js) resolves the visible surface via `_shareActiveEntry` → `_shareFindOrMake(id, kind, data)`, mints a 10-hex `share_id` and PATCHes the `lookbook_items` row `{share_id, is_public: true}` with the owner JWT (retries once after `_lbCloudPush` if the row hasn't reached the cloud). `App.openShare` is repatched to it, so every bundle Share button + the Share buttons on the kp/dl/tv result pages all use the real flow.
- **`_shareActiveEntry` must never dead-end.** It picks the surface by *actual visibility* (moodboard `.visible` class; kp/dl/tv result page `display !== 'none'`) with no `&& _xxxActiveSaveId` in the guard — an earlier branch that matched visibility but failed its id-lookup used to `return null` and pre-empt the visible one, which surfaced as the "Style something first — then share it" toast on a fully-rendered key-piece result. `_shareFindOrMake` returns the stored entry, or (id set but dropped from the local cache) a thin `{id, …}` so the DB PATCH still targets the cloud row, or (no id at all) lazily `snAdd`/`_mbAdd`s a reconstruction from the live render data (`window.__lastKpData` / `__lastDlData` / `__lastTvData` / `panel._currentData`) so share always has something to publish. `_shareBuild` strips non-http images so a lazy moodboard mint can't blow the localStorage quota.
- **Modal**: IG-handle capture (`@` input prefilled from `profiles.instagram_handle`; save PATCHes profiles + POSTs `/api/instagram` → Airtable Contacts), "Share my look" (native `navigator.share`, else copy), copy-link row.
- **Public page**: `GET /board/:shareId` (rate-limited) queries Supabase REST with the **anon key** — RLS (`lookbook_select_shared`, `to anon using (is_public = true)`) means only explicitly shared rows are readable. Server injects OG/Twitter meta (crawlers don't run JS) + a whitelist-sanitized payload (`publicSharePayload` — title/subtitle/images/pieces/tags/editorial only, never ids or emails) into `public/board.html` — one REST round trip, no app shell, so it loads fast. Missing/private rows → same template with a 404 not-found state. CTA links go to https://www.byrobes.com.
- `_lbRowToItem`/`_lbItemToRow` carry `share_id`/`is_public` as real columns so cloud pulls never orphan a published link. Share links use `window.location.origin`, so beta links live on beta.byrobes.com.

## URL routing (`window._rbNav`)
Lookbook, moodboards and wardrobe are `position:fixed` overlays, not real navigations, so the address bar needs to be driven manually. `window._rbNav(path)` calls `history.pushState` when the pathname differs; a single `popstate` listener closes whatever overlay is open and re-opens the one matching the new path (or clears the crumb for `/dashboard`). A `_rbRouting` guard stops the popstate handler's own view changes from re-triggering `_rbNav` pushes.
- A populated moodboard lives at `/moodboard/[slug]` (`_mbSlug(title)`; server serves dashboard.html for `/moodboard/:slug`). `_mbShowResult` pushes it, `__mbCloseResult` restores `/moodboards` or `/dashboard`, popstate + the boot deep-link (retries until `_lbCloudPull` lands) reopen the board by slug via `window._mbFindBySlug`.

## Dashboard wardrobe feature (signup-flow branch)
The dashboard was originally a ~4MB self-contained Claude Design bundle; it has been **ejected** into plain files:
- `public/dashboard.html` (~150KB) — plain HTML page. Head carries `window.__resources` (id → asset path map the app JS reads for runtime imagery) and a `#rb-boot` style that hides the body until boot completes.
- `public/dashboard-assets/` — 43 extracted assets (fonts, images, the 6 app JS files), named by their original bundle uuid. Fetched on demand and cached individually.
- `public/js/dashboard-personalize.js` — the entire `window.__robes_personalize` customisation layer.
- Boot sequence (inline script at end of body): load supabase-js CDN → auth guard (no session → `/signup.html`) → set `window.__robes_session`/`__robes_sb`/`__robes_profile` → load the 6 app scripts **sequentially in order** → call `__robes_personalize()` → remove `#rb-boot`. Do not reorder; the app scripts depend on session being set first and on each other's order.
- `window.__robes_sb` is the authenticated Supabase client — used by the avatar dropdown's Log out item (`#av-logout`: `signOut()` then redirect to `/signup.html?mode=signin`). Dropdown order: Account details / Wardrobe / Lookbook / Moodboards / Style notes / Log out.

"The bundle" below refers to the minified app JS in `dashboard-assets/` — its functions are still private closures, so the whole interception layer is unchanged. All customisation runs via `window.__robes_personalize`, called after all bundle scripts execute.

### Wardrobe wiring (inside `__robes_personalize`)
- `_waUid()` / `_waToken()` — read `window.__robes_session` lazily on each call (session loads async after bundle auth)
- `_waFetch(method, path, body)` — direct Supabase REST with user JWT
- `_waLoad()` — fetches `wardrobe_items`, sets `_waLoaded = true`, rebuilds pills, re-renders grid
- `_waRender()` — builds grid from `_waItems`; shows "Loading…" until `_waLoaded` is true
- `_waBuildFilters()` — builds category pill buttons; skips rebuild if our pills (no `onclick` attr) already exist; marks current `_waCat` as active
- `_waSyncCounts()` — updates nav badge (`.nav-wbtn-count`), `#wg-count`, and the `.tracker-*` dashboard widget
- `_waObserver` — MutationObserver on `#wg-grid`: any time the bundle's `renderWardrobe()` overwrites the grid with mock data, we immediately restore real items. Disconnected during our own renders to avoid re-entrancy.
- `_waInit()` — polls every 250ms until `_waUid()` is truthy, then calls `_waLoad()`

### Account details modal
All user-supplied/profile values injected into `acct-modal`'s template literal (`prof.first_name`, `userEmail`, etc.) must pass through `_acctEsc()` — the raw template literal previously leaked as literal `${userEmail}` text when values contained characters that broke the interpolation. `window.__saveAcctDetails()` PATCHes `profiles`, syncs `window.__robes_profile` + the visible avatar name/greeting, then closes the modal ~900ms after showing "Saved." (it used to stay open indefinitely after a successful save).

### `window.App` bridge (critical — `App` is a lexical `const`, not a window prop)
The main dashboard bundle declares its API as `const App = (function(){…})()` — a **global lexical binding**, so it's reachable by the bare name `App` from other classic scripts but is **`undefined` as `window.App`** (unlike `window.KP` / `window.WA`, which are real window props). Every `if (window.App && App.xxx)` guard in `__robes_personalize` therefore silently skipped — the wardrobe patches (which only survived via the `#wg-grid` MutationObserver), and the moodboard `App.openShare` / `App.packFromBoard` / `App.chooseInspire` / `App.saveRename` / wordmark-`App.goHome` patches (which just didn't apply — Share fell through to the bundle's mock "Wimbledon" sheet, etc.). Fix: the personalize body opens with `if (typeof App !== 'undefined' && App && !window.App) window.App = App;` so all those guards resolve. When adding a new `App.*` patch, keep the `window.App` guard — the bridge makes it valid.

### Bundle interception
The dashboard bundle has private functions (`renderWardrobe`, `showView`, etc.) that can't be patched directly. Instead:
- `App.showWardrobe` is patched to call original (for view switching) then immediately restore our grid + pills
- `App.filterWardrobe` is patched to update `_waCat` and call `_waRender()`
- `App.addPiece` is patched to no-op (prevents bundle's mock-data path after WA modal submit)
- `WA.submit` is replaced entirely — saves to Supabase, uploads photo to Cloudinary, then reloads grid
- `WA.open/close/onFile/pickColour/hover/validate` are kept from the bundle untouched

### Wardrobe photo upload
- Client: `WA.submit` reads data URL from `#wa-tile-img` (set by bundle's `WA.onFile` via `FileReader.readAsDataURL`)
- Detection: checks `#wa-tile.filled` class (added by bundle when photo is selected)
- Server: `POST /api/wardrobe/upload` — accepts `{ data: base64, mimeType }`, uploads to Cloudinary, returns `{ url }`
- Saved as `image_url` on the `wardrobe_items` row

### `/wardrobe` URL
`server.js` serves `dashboard.html` for `GET /wardrobe`. On load, `__robes_personalize` detects `pathname === '/wardrobe'` and calls `App.showWardrobe()` after 100ms.

### Wardrobe dashboard tracker widget
The `.tracker-num`, `.tracker-title`, `.tracker-sub`, `.tracker-fill` elements are updated by `_waSyncCounts()` to reflect real item count toward a 15-piece target with copy that scales with progress.

`_WA_TITLES` milestones (0 / 1 / 5 / 10 / 15 items) control the tracker copy. At 0 items the full string is used verbatim; at 1+ items it is prefixed with `n + ' / 15 '`. The CTA reads "Add your first piece +" at 0 items and "Add pieces +" thereafter.

The tracker CTA (`onclick` on `.tracker-cta`) opens the wardrobe add modal directly — it does NOT navigate to `/wardrobe`.

### Dashboard v2 — Styling Concierge cards
The bundle ships with the **old** card order: `[Weekly Planner(01), Travel Edit(02), Key Piece(03)]`. `__robes_personalize` transforms this at runtime:
- Destructures as `const [weekly, travel, keyPiece] = svcs`
- Relabels `keyPiece` → "Daily outfit" (title + description + adds `.svc-daily` class, clears onclick)
- Applies inline SVG data URLs: `calSvg` → Weekly Planner image, `suitSvg` → Travel Edit image
- Rewires the Travel Edit card's onclick from the bundle's `KP.comingSoon` to `window.__tvOpen()` (the feature is live — see its section)
- Reorders DOM to `[keyPiece, weekly, travel]` and renumbers badges 01→02→03
- `_rbUpdateDailyOutfitLock()` then adds the lock pill overlay and manages the CTA state

**Critical**: do NOT use XML comments (`<!-- -->`) inside SVG data URLs — they break the URI encoding and cause the image to fail silently.

### Daily Outfit progress pill (`_rbUpdateDailyOutfitLock`)
- Targets `.svc-daily` card (the relabelled Key Piece card after reorder). The card is **never locked** — the Daily Look track serves an editorial build below 15 items.
- Below 15 items: `.rb-lock-wrap` pill reads "✦ Editorial until 15 pieces · n/15" (information, not a gate); at 15 the pill is removed
- CTA is always "Style today →"; onclick always `_cbSetIntent('dress-me')` (prefills `#cb-ta`, scrolls/focuses)
- Called on every `_waLoad()` completion and wardrobe item add/delete (function name kept for history)

### 3-step wardrobe add flow
We own all 3 steps — the bundle's `.fm-step` content is replaced entirely on `WA.open` for new items.

- **Step 1** (`_showStep1`): our own photo capture UI (file input + drop zone). No bundle involvement.
- **Step 2** (`_runStep2`): "Reading your piece…" spinner + progress text while `POST /api/wardrobe/analyse` runs.
- **Step 3** (`_runStep3`): "Here's what Robes saw." — review form with AI-extracted fields, colour swatches, silhouette pills, and pre-filled notes.

On step 3 submit (`window.__waSawSubmit`): restores `_origStepHTML` (bundle form) into the DOM, populates its hidden fields (`#wa-label-in`, `#wa-cat`, `#wa-brand`, `#wa-notes`, `#wa-sw-name`), then calls `WA.submit` after 50ms.

`_origStepHTML` is captured once on first `WA.open` call (add mode). It is **never** cleared on `WA.close` — preserving it means edit mode can always restore the bundle form even after an add flow.

Edit mode (`_waEditId !== null`): `WA.open` skips step 1 and instead restores `_origStepHTML` at 50ms if `#wa-label-in` is missing from DOM (handles the case where step 1 replaced it).

### Colour picker (`_ALL_SWATCHES` + `_buildSwatchRows`)
Editorial tri-tier swatch system. All swatch data is defined at IIFE scope (not inside `_runStep3`) so it can be shared between the add flow and edit modal.

- `_ALL_SWATCHES` — 21 swatches: Foundations (6) → Dimension Builders (7) → Exclamation Points (6) → Multi + Print
- `_buildSwatchRows(selectedColor)` — returns two-row HTML; the selected swatch gets outline + checkmark
- `window.__rbPickSwatch(el, name)` — global click handler; updates outline/checkmark on all swatch buttons, writes to `#wa-sw-name` and `window.__waSawColor`
- `window.__rbInjectSwatches(selectedColor)` — replaces `#wa-swatches` (bundle's swatch container) with our rows; used by edit modal. Also sets `#wa-sw-name` textContent so `WA.submit` reads the right colour
- Colour is submitted via `#wa-sw-name` textContent — `WA.submit` reads this directly
- `Multi` swatch: `conic-gradient(#FF1493,#FF4500,#E1FD2E,#00A86B,#0047AB,#4B0082,#FF1493)`
- `Print` swatch: diagonal SVG stripe on `#EDE8E0` background
- White swatch uses inset border shadow to show its edge
- Hover reveals colour name in `#rb-sw-label`; click also updates it (covers mobile)

### Gemini wardrobe analysis (`POST /api/wardrobe/analyse`)
Returns structured JSON used to populate step 3 and saved to `item_dna`:
```json
{
  "label": "...",
  "category": "...",
  "color": "...",
  "brand": "...",
  "notes": "...",
  "item_dna": {
    "display": {
      "title": "...",
      "editorial_color_name": "Washed Slate",
      "primary_color_hex": "#6B6B6B",
      "brand_raw": "..."
    },
    "structural_dna": {
      "silhouette_fit": ["Relaxed", "Single-breasted", "Unlined"]
    },
    "llm_styling_context": {},
    "ai_generated_notes": "..."
  }
}
```

Guardrail taxonomy enforced in prompt — `silhouette_fit` values map to controlled terms per category (Tops/Bottoms/Outerwear/Dresses/Shoes/Bags/Accessories). `maxOutputTokens` is 600 (originally 200 — raised to fit the richer response). Runs at `temperature: 0` + `thinkingConfig: { thinkingBudget: 0 }` — same truncation/nondeterminism trap as stylenotes analyse (see Common gotchas). On any Gemini error the response still resolves 200 with `analysisFailed: true` and empty fields (never blocks the caller); onboarding step 04's catalogue flow (`onboarding.html`) and the legacy dashboard handoff persist (`_rbOnboardHandoff` in `dashboard-personalize.js`) both check for `analysisFailed` or a missing `label` and retry the analysis once after a 1.5s pause before saving to `wardrobe_items` — a first-attempt truncation used to silently save the key piece with blank category/brand.

### item_dna JSONB column
- Added via `supabase/item_dna_migration.sql` (backward-compatible — existing rows get `{}`)
- GIN index: `idx_wardrobe_item_dna` for efficient JSONB queries
- `WA.submit` merges current colour + notes into `item_dna` before saving
- `window.__waSawItemDna` holds the in-flight item_dna object during the add/edit flow — always a deep copy

### Silhouette & Fit pills
- Rendered from `item_dna.structural_dna.silhouette_fit` (array of strings)
- Dismissible with × button — `window.__rbRemovePill(i)` splices the array and re-renders
- Shown in step 3 (add flow) and in the edit modal (loaded from saved `item_dna`)
- `window.__waSawFit` tracks the current pill state during the modal session

## App flow (modal path — primary)
1. **Landing** — email capture → `submitLandingEmail()` → Airtable `Contacts`
2. **Flow modal opens** → Step 1: prompt/photo input
3. `submitStyle()` fires `callStyle()` early (parallel with name entry), stores in `st.stylingPromise`
4. Step 2: name entry
5. Step 3: generating animation → `runGenModal()` picks up `st.stylingPromise`
6. Result → `saveLook()` hits `/api/look` → gets shareable ID → `go('result')`

## State object (`st` in app.js)
```js
{ name, email, pieceName, prompt, link, photo,
  photoUrl,          // Cloudinary URL for uploaded photo
  ways,              // array of 3 look objects from Gemini
  generatedImages,   // array of 3 base64 images from Gemini
  fallback,          // true when input wasn't recognisable as a fashion piece
  history,           // previous styling sessions (localStorage)
  stylingPromise,    // pre-fired callStyle() promise
  styleController,   // AbortController for in-flight /api/style fetch
  lookId,            // share URL id from /api/look
  resultLayout, shareIdx, idx }
```

## Key conventions
- **No framework, no build** — edit HTML/CSS/JS directly, changes are live on push
- **No comments** unless the WHY is non-obvious
- **Fallback piece**: `black Balmain waistcoat with gold buttons` — shown when Gemini can't identify a fashion item
- **Airtable logging**: every prompt auto-logged to `Feedback` table via `POST /api/look` (fires async after responding to client)
- **AbortController**: always abort `st.styleController` in `openModal()` and `closeModal()` to prevent orphaned server requests
- **Image fallback**: when a generated image is null (timeout/fail), show `.way-img-placeholder` div — never fall back to `st.photo`
- **`.reveal` sections**: use IntersectionObserver in `prepLanding()` to add `.in` class — they start `opacity:0`

## Airtable schema
**Contacts**: `Email`, `Name`, `Instagram Handle`, `Joined At`
**Feedback**: `Email`, `Prompt`, `Piece Link` (look URL), `Photo` (attachments), `Looks Output`, `Rating`, `User Feedback`, `Created At`

## Dashboard breadcrumb system (`_rbInitBreadcrumb`)

Injected as an IIFE inside `__robes_personalize`. Appends a `#rb-crumb` span to `.nav-l` (the left side of the main nav). The bundle's own `#nav-breadcrumb` is hidden on init.

### Finalized breadcrumb pattern
- **Wordmark** (`ROBES`) is always permanent — routes home, never replaced
- Trail is appended only on sub-pages:
  - `ROBES / Wardrobe` — when wardrobe panel is open
  - `ROBES / Style a piece` — when kpResultPage overlay is showing
  - `ROBES / {Title}` — moodboard opened from dashboard
  - `ROBES / Your Moodboards / {Title}` — moodboard opened from full list
  - `ROBES / Recent looks / Your look` — today's looks subtab
  - `ROBES / Pack a trip` — trip subtab
  - `ROBES / Plan the week` — week subtab

### API
- `window.rbSetCrumb(segments)` — segments is an array of `{ label, action? }`. Last segment is plain text; earlier ones are clickable buttons.
- `window.rbClearCrumb()` — hides crumb, restores wordmark display

### Wordmark onclick
Wired in `_rbInitBreadcrumb` to: clear crumb, close moodboard result + list, hide kp/dl/tv result pages, close wardrobe panel (via the nav wardrobe toggle button), then `_rbNav('/dashboard')` + `App.goHome()`. The toggle tracks its own open state, so when the panel was opened programmatically (direct `/wardrobe` load) the click can no-op — if the panel still has `.visible` after the toggle, the handler hard-routes with `window.location.assign('/dashboard')`.

### Wardrobe crumb (`_rbObserveWardrobe` IIFE)
MutationObserver on `.wardrobe-panel` watches for the `.visible` class being added/removed.
- **Wordmark visibility**: the bundle hides `#nav-wordmark` when showing subpages. Fix uses `wm.style.setProperty('display', 'inline', 'important')` plus a second MutationObserver on the wordmark itself that immediately restores it if the bundle re-hides it. Both are torn down when panel closes.
- `rbClearCrumb()` + `wm.style.removeProperty('display')` on panel close.

### Style a piece crumb (`kpResultPage`)
- `kpResultPage` is `z-index:40` — deliberately below the main nav's `z-index:50` so the nav sits on top of the overlay
- No inline nav inside kpResultPage — crumb lives in the real main nav with correct serif font
- `rbSetCrumb([{ label: 'Style a piece' }])` called when kpResultPage renders
- `rbClearCrumb()` called in `__kpGoBack()`

### Moodboard crumb (`_mbOpenedFromList` flag)
- `window._mbOpenedFromList` — set true when `__mbOpenSaved` is called while the list page is visible
- `_mbShowResult` reads this flag to decide between 1-segment and 2-segment crumb
- `__mbCloseResult` resets the flag and clears crumb

### Subtab crumbs (`_rbPatchSubtabs` IIFE)
Patches `App.setSubtab` to set/clear crumb based on which tab is active. Polls 250ms until `App.setSubtab` exists.

## Moodboard item interactivity & swap modal (PRD 3.B)

### Cold-Start Wardrobe Threshold
`isColdStart = _waItems.length < 15` is evaluated at render time in `_mbShowResult`.

- **State A (< 15 items)**: Pure editorial mode. Rail shows retailer + price pills, circular 32px dark Swap button on every item.
- **State B (≥ 15 items)**: Living lookbook. Items matched from wardrobe show "✓ Yours" green badge + "Swap out" link. Unmatched items show circular Swap button.

### `the_look` Gemini schema additions
Two new fields added to every item in `the_look` array (in `server.js` system prompt):
- `retailer_hint` — best retailer for the piece (e.g. `"Net-a-Porter"`, `"ASOS"`)
- `price_point` — realistic EUR price (e.g. `"€89"`, `"€245"`)

`maxOutputTokens` raised from 4000 → 5000 to fit the richer output without truncation.

### Gemini model chain (`server.js`)
Final working fallback chain (as of 2026-06-29):
```javascript
const MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro'];
// timeout: 30000ms per model, 1 attempt per model
```
Removed deprecated models: `gemini-2.0-flash` (404), `gemini-2.5-flash-lite-preview-06-17` (404), `gemini-1.5-flash` (404). Never add these back.

### Rail rendering (`_mbShowResult`)
Each row in `#mb-rail-pieces`: 44×44px thumbnail (wardrobe photo or `#EDE8E0` placeholder) + name/brand + pills + CTA. Padding `10px 20px` to match bundle's 20px horizontal standard.

Pills (one set, chosen by state):
- **Wardrobe matched** (State B only): green "In your wardrobe" pill + "Worn N×" text — `times_worn` looked up from `_waItems.find(w => w.id === match.id)` at render time, NOT stored on `wardrobe_match`
- **Unmatched**: retailer pill (max-width 90px, ellipsis) + price pill

Sidebar subtitle: `"N pieces · M from your wardrobe"` when matches exist, else `"N pieces"`.

### Overflow fix for Swap buttons
Bundle ancestor elements have `overflow:hidden` set via inline styles that CSS `!important` overrides cannot beat. Fix: after building `railEl.innerHTML`, walk 8 ancestor elements and call `el.style.setProperty('overflow', 'visible', 'important')` on each. This must run on every re-render of the rail.

### Swap modal (`window.__mbSwap(idx)`)
Centered dialog (`position:fixed;inset:0;align-items:center;justify-content:center;padding:24px`), `z-index:950`, `border-radius:20px`, `max-width:480px`, `max-height:80vh`, overflow-y:auto.

Structure:
1. Header: "SWAP THIS PIECE" label + item name (serif) + italic brand/retailer
2. "FROM YOUR WARDROBE" — 4-col grid of `_waItems` filtered by matching category; tap a card to call `__mbSwapApply`
3. If no wardrobe items in category: AI alternative suggestion copy
4. Two side-by-side CTAs: **[Snap mine]** (calls `__mbSnapMine`) + **[Shop via Affiliate →]** (calls `window.__rbAffiliateSoon(modalId)` — closes the swap modal, then opens the bundle's Coming Soon dialog; same handler on the daily-look + travel swap modals)
5. "Opens [retailer] · [price]" centered text below CTAs

### `window.__mbSwapApply(lookIdx, wardrobeId)`
Mutates `window.__mbCurrentLook[lookIdx].wardrobe_match = { id, label, image_url, color }`, removes modal, re-renders rail, shows toast.

### `window.__mbSnapMine()`
Closes swap modal, opens `WA.open()` to add a new wardrobe item.

### `wardrobe_match` object
Stored on each `the_look` item after a swap. Shape: `{ id, label, image_url, color }`. Never stores `times_worn` — always look that up from `_waItems` at render time.

## Common gotchas
- Edit modal "Update piece" button: the bundle's `validate()` only enables `#wa-cta` when `#wa-label-in` is non-empty, and it last runs inside `open()` while the field is still blank. `_waOpenEdit` must re-run `WA.validate()` (or dispatch `input`) after populating the saved label, or the button stays greyed out.
- `#wa-sw-name` is a data-only carrier that `WA.submit` reads for the colour — `__rbInjectSwatches` sets its text **and** `display:none`, because the colour is shown in the injected `#rb-sw-label` header and the raw span otherwise leaks ("Black") as stray text under the silhouette pills in the edit modal.
- Moodboard mosaic on mobile (`@media(max-width:620px)`): the hero and the editorial-text tile each span the full width (`grid-column:1/-1`) so the long editorial copy can't stretch the hero into a giant block; the remaining images/`.mb-ph-cell` placeholders are forced square. The renderer sets inline `height:100%` on mosaic imgs, so the mobile rules use `height:auto !important` to win. Both mosaic render paths (`_mbShowResult` + `_mbPollImages` re-render) must give empty cells the `mb-ph-cell` class or they collapse on mobile.
- Moodboard rail: shop (unmatched) items have no photo — the thumbnail is a serif monogram of the item name's first letter on a cream tile, **not** a generic image-icon SVG (which reads as a broken/loading thumbnail).
- `paintProgress()` guards for missing `#nav-progress` — don't add back the null check removal
- `gemini-3.1-flash-image` is slow (~30s) and occasionally times out — 40s server timeout, images run in parallel
- `callStyle()` fires early from `submitStyle()` — don't move it later or users wait longer
- `persist()` strips `photo` and `generatedImages` from history when localStorage is full
- Look share page (`/look/:id`) serves `look.html` which fetches `/api/look/:id` — data lives in-memory, expires 48h
- Supabase client must be named `sbClient` not `supabase` to avoid conflict with `window.supabase` CDN global
- Dashboard `window.__robes_session` is set async by the bundle — always read uid/token via `_waUid()`/`_waToken()` helpers, never capture them once at init time
- Dashboard bundle's `renderWardrobe()` is a private closure — `App.renderWardrobe` does not exist; use MutationObserver on `#wg-grid` to defend against it
- `_waBuildFilters()` checks for existing non-onclick pills before rebuilding to avoid resetting active filter state on async reloads
- Dashboard bundle ships `[Weekly Planner, Travel Edit, Key Piece]` — always destructure in that order; the v2 layout reorders them at runtime
- SVG data URLs must not contain XML comments (`<!-- -->`) — they break URI encoding silently
- `_origStepHTML` must NOT be cleared on `WA.close` — it is captured once and reused across all subsequent edit opens
- Edit modal: bundle form is restored at 50ms (inside patched `WA.open`), field population at 60ms (inside `_waOpenEdit` setTimeout) — order matters
- `window.__waSawItemDna` is set by `_runStep3` (add flow) and `_waOpenEdit` (edit flow); always a deep copy so mutations don't affect `_waItems`
- `#wa-swatches` is the bundle's swatch container — `__rbInjectSwatches` replaces its innerHTML with our two-row layout
- `kpResultPage` z-index is 40 (below nav's 50) — main nav floats above the overlay. Never raise it above 50 or the crumb styling breaks
- Bundle hides `#nav-wordmark` when wardrobe opens — use `setProperty('display','inline','important')` + a second MutationObserver on the wordmark to defend against re-hiding; `removeProperty('display')` on close
- Wordmark onclick must close the wardrobe panel (`wp.classList.remove('visible')`) — without this, clicking ROBES clears the crumb but the panel stays open
- `_rbTimeAgo(iso)` must be declared as a named `function` declaration (not an expression) — if the declaration is lost, JS throws on the body's `return` statements and the whole dashboard fails to load
- `gemini-2.5-flash` **thinking tokens count inside `maxOutputTokens`** — structured-output endpoints returning large JSON must set `thinkingConfig: { thinkingBudget: 0 }` or the response truncates mid-JSON and the parse throws (this is why wardrobe analyse went 200 → 600 tokens, and why stylenotes analyse disables thinking)
- A Gemini account **out of credit/quota** surfaces as 502 `analysis_failed` from `/api/stylenotes/analyse` — check the `reason` field in the response body (browser console) or Railway logs before debugging code
- Vision-extraction endpoints that map to enums MUST set `temperature: 0` — at the default 1.0 the same photo samples different enum values across runs, which the deterministic engine then turns into different archetypes (looks like a mapping bug but is really nondeterministic extraction)
- The wardrobe category `<select>` (`#wa-cat` in dashboard.html) must always include an `Other` option matching the server's `category` fallback — without it, any item analysed/saved with `category: 'Other'` renders as a blank dropdown that looks broken
- `window.__robes_personalize`'s weather block (geolocation + Open-Meteo) must stay wrapped in its own IIFE with its own early returns — an early `return` written directly in the outer function body (e.g. `if (!weatherEl) return;`) silently aborts every wiring after it (wardrobe, lookbook, moodboards, breadcrumbs), which is invisible unless you check `typeof window.__kpRenderResult` after boot
- Saved lookbook/moodboard entries never store base64 image data (`snAdd`/`_mbAdd`/`_kpPersistImages` only accept strings starting with `http`) — base64 blows the localStorage quota and can't sync to the `lookbook_items.data` jsonb column at any reasonable size
- Lookbook/moodboard localStorage keys (`SN_KEY()`/`MB_KEY()`) resolve the uid **lazily on every call** and return null (no-op) until the session lands — a captured-once uid fell back to `'anon'`, writing saves into a shared `robes_style_notes__anon` key that surfaced as phantom "15 key pieces" on other accounts in the same browser; `__anon` keys are purged at boot
- The moodboard panel overlay must stay at `z-index:40` (below the nav's 50, below the rename/share sheets' 200 and the Coming Soon dialog's 300) — raising it buries the avatar dropdown and every board modal, which reads as "dead CTAs"
- iOS input-focus auto-zoom: every page carries a snippet after the viewport meta that (iOS only) rewrites it with `maximum-scale=1` — Safari still allows pinch gestures, Android is untouched; don't add sub-16px font-size inputs and expect the meta alone to save you on other browsers
- Never put a `capture` attribute on file inputs — it forces straight-to-camera on mobile and hides the native picker (Photo Library / Take Photo / Choose File). The bundle's `pickCamera` helpers were rewritten to `removeAttribute('capture')` for the same reason; the OS picker already offers the camera
- `_kpActiveSaveId` / `panel._savedId` track which lookbook/moodboard row is "live" during a render so background image polling (`_kpPollImages`/`_mbPollImages`) patches the *saved* entry, not just the on-screen DOM — skip this wiring and reopening a look/board after generation finishes shows blanks again
