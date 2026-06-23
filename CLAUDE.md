# Robes MVP — Claude Code Reference

## What this is
Fashion AI styling app. User inputs a key piece (photo, text, or link) → Gemini generates 3 editorial looks with outfit images. Live at **www.byrobes.com**, deployed on Railway.

## Stack
- **Backend**: Node.js + Express, ES modules (`"type":"module"`), `server.js`
- **Frontend**: Vanilla HTML/CSS/JS SPA — no framework, no build step
- **AI (styling)**: Google Gemini via `@google/genai`
  - `gemini-2.5-flash` — JSON styling text (3 looks)
  - `gemini-3.1-flash-image` — editorial outfit images (1 per look)
- **Auth + DB**: Supabase (project: `Robes_p0`, URL: `https://ayowpaknssulsqqvwpqx.supabase.co`)
  - Google OAuth + email/password auth
  - `profiles` table — first_name, style_icons[], budget, wardrobe_description
  - `prompt_history` table — logs every Anthropic API call per user
  - `wardrobe_items` table — per-user clothing pieces with image, category, colour, brand, notes
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
| `public/dashboard.html` | Protected dashboard SPA — wardrobe, styling, account |
| `supabase/schema.sql` | DB schema — run once in Supabase SQL editor |
| `supabase/wardrobe_schema.sql` | Wardrobe items table + RLS — run once in Supabase SQL editor |
| `supabase/functions/wardrobe-context/index.ts` | Edge Function — assembles user profile, calls Anthropic, writes to prompt_history |

## Branches
- `main` — live production (www.byrobes.com)
- `signup-flow` — Supabase auth + dashboard work (staging at robes-mvp-co1h-production.up.railway.app)

## What's live vs in development
**Live on byrobes.com (`main` branch)**
- Landing page + styling flow (prompt/photo/link → 3 Gemini looks)
- Shareable look pages (`/look/:id`)
- Airtable CRM logging

**In development on `signup-flow` branch only — NOT on byrobes.com yet**
- `/signup` — Supabase email + Google OAuth sign-up
- `/dashboard` — protected SPA (the bundled `dashboard.html`)
- `/wardrobe` — wardrobe panel URL alias
- Wardrobe feature: add/edit/delete items, photo upload to Cloudinary, category filtering
- Account details modal (edit first/last name, mobile)
- `wardrobe_items` Supabase table (schema in `supabase/wardrobe_schema.sql`)
- Dashboard v2 layout: Wardrobe tracker → Styling Concierge (Moodboards + Style Notes sections in progress)
- Daily Outfit concierge card: locked until 15 wardrobe items, then CTA becomes "Style today →" prefilling prompt

## Deploying
```bash
git add <files>
git commit -m "message"
git push -u origin main   # triggers Railway auto-deploy on byrobes.com
git push -u origin signup-flow   # triggers Railway auto-deploy on test URL
```
No build step. Railway picks up `npm start` → `node server.js`.

## Environment variables (set in Railway)
- `GEMINI_API_KEY`
- `AIRTABLE_TOKEN`, `AIRTABLE_BASE_ID`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `PUBLIC_URL` = `https://www.byrobes.com`
- `PORT` (Railway sets automatically)

Note: Cloudinary vars must be set on **both** production and staging Railway services for wardrobe photo uploads to work.

## Supabase config
- Project: `Robes_p0`
- URL: `https://ayowpaknssulsqqvwpqx.supabase.co`
- Publishable key: `sb_publishable_D_iIPtp_R6kjN_711jfyTg_sFmRdpwJ`
- Google OAuth: enabled, callback URL registered in Google Cloud Console
- Allowed redirect URLs: `https://robes-mvp-production.up.railway.app/**`, `https://robes-mvp-co1h-production.up.railway.app/**`
- Edge Function secrets set: `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (auto-injected)

## Supabase DB schema
**profiles**: `id` (FK → auth.users), `first_name`, `style_icons[]`, `budget`, `wardrobe_description`, `created_at`, `updated_at`
- Auto-created on signup via `handle_new_user` trigger
- RLS: users can only read/write their own row

**prompt_history**: `id`, `user_id` (FK → profiles), `prompt`, `response`, `tokens_used`, `model`, `created_at`
- RLS: users can only read/write their own rows

**wardrobe_items**: `id`, `user_id` (FK → auth.users), `label`, `category`, `color`, `brand`, `notes`, `image_url`, `times_worn`, `created_at`
- Schema in `supabase/wardrobe_schema.sql` — run once in Supabase SQL editor
- RLS: users can only read/write their own rows
- CRUD via direct Supabase REST API (not Edge Function) using user JWT

## Edge Function: wardrobe-context
- URL: `https://ayowpaknssulsqqvwpqx.supabase.co/functions/v1/wardrobe-context`
- Auth: pass user's JWT in `Authorization: Bearer <token>` header
- Body: `{ "prompt": "..." }`
- Reads user profile, assembles system prompt, calls `claude-sonnet-4-6`, writes to prompt_history
- Returns: `{ "response": "...", "tokens_used": N }`

## signup.html conventions
- Supabase client instantiated as `sbClient` (not `supabase` — conflicts with `window.supabase` global from CDN)
- Google OAuth redirects to `/dashboard` after auth
- Email signup: sends confirmation email; if `data.session` exists, redirects immediately

## Dashboard wardrobe feature (signup-flow branch)
`public/dashboard.html` is a ~4MB self-contained bundled SPA. All customisation runs via `window.__robes_personalize`, called after all bundle scripts execute.

### Wardrobe wiring (inside `__robes_personalize`)
- `_waUid()` / `_waToken()` — read `window.__robes_session` lazily on each call (session loads async after bundle auth)
- `_waFetch(method, path, body)` — direct Supabase REST with user JWT
- `_waLoad()` — fetches `wardrobe_items`, sets `_waLoaded = true`, rebuilds pills, re-renders grid
- `_waRender()` — builds grid from `_waItems`; shows "Loading…" until `_waLoaded` is true
- `_waBuildFilters()` — builds category pill buttons; skips rebuild if our pills (no `onclick` attr) already exist; marks current `_waCat` as active
- `_waSyncCounts()` — updates nav badge (`.nav-wbtn-count`), `#wg-count`, and the `.tracker-*` dashboard widget
- `_waObserver` — MutationObserver on `#wg-grid`: any time the bundle's `renderWardrobe()` overwrites the grid with mock data, we immediately restore real items. Disconnected during our own renders to avoid re-entrancy.
- `_waInit()` — polls every 250ms until `_waUid()` is truthy, then calls `_waLoad()`

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

### Dashboard v2 — Styling Concierge cards
The bundle ships with the **old** card order: `[Weekly Planner(01), Travel Edit(02), Key Piece(03)]`. `__robes_personalize` transforms this at runtime:
- Destructures as `const [weekly, travel, keyPiece] = svcs`
- Relabels `keyPiece` → "Daily outfit" (title + description + adds `.svc-daily` class, clears onclick)
- Applies inline SVG data URLs: `calSvg` → Weekly Planner image, `suitSvg` → Travel Edit image
- Reorders DOM to `[keyPiece, weekly, travel]` and renumbers badges 01→02→03
- `_rbUpdateDailyOutfitLock()` then adds the lock pill overlay and manages the CTA state

**Critical**: do NOT use XML comments (`<!-- -->`) inside SVG data URLs — they break the URI encoding and cause the image to fail silently.

### Daily Outfit lock / unlock (`_rbUpdateDailyOutfitLock`)
- Targets `.svc-daily` card (the relabelled Key Piece card after reorder)
- Locked state (`_waItems.length < 15`): adds `.rb-lock-wrap` pill overlay, CTA shows "N pieces to go" with lock icon, onclick shows toast
- Unlocked state: removes pill, CTA becomes "Style today →", onclick fills `#cb-ta` with `"Dress me for a day in the city today"` and scrolls/focuses the textarea
- Called on every `_waLoad()` completion and wardrobe item add/delete

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

## Common gotchas
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
