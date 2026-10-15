# Legacy API and AI reference (Express `server.js` + modules)

Snapshot of branch `platform` (the live beta, beta.byrobes.com), taken 2026-09-24 at commit `2aef362`. It covers these files:

| File | Lines | What it holds |
|---|---|---|
| `server.js` | 3392 | Every HTTP route, all Gemini calls, Cloudinary, Airtable, the image-job store, the rate limiter, the generation_log wrapper, avatar cells |
| `inbox.js` | 578 | Forwarded-receipt webhook ingest, the product-page reader, the SSRF guard, the Svix verifier |
| `notify.js` | 411 | Resend email: the sequence, the morning cue, the receipt confirmation, unsubscribe tokens, the idempotency ledger |
| `style_dna.js` | 603 | The 12-season and 5-body catalogs, deterministic classifiers, composers, and the prompt block injected into every stylist call |
| `wardrobe_taxonomy.js` | 251 | The 3-level wardrobe taxonomy, its validator, and the season and wear-for pre-fill defaults |

Every line reference points at `server.js` unless another file is named. After reading this doc, an engineer should be able to re-implement each backend capability in the Next.js + TypeScript platform without reading `server.js` end to end. Prompts are summarised here, not pasted. Open the line range for the exact wording.

---

## 0. Global facts

- **Runtime:** Node ≥18 (local v20), ES modules, **Express 4.19** (`package.json`). Express 4 does **not** catch rejected promises from `async` handlers. Any `throw` outside a `try` in an async route, and any rejection inside a fire-and-forget `(async () => {...})()` that has no `.catch`, becomes an **unhandled rejection**. Node ≥15 exits the process on an unhandled rejection by default, and `server.js` installs no `unhandledRejection` handler (grep finds none). §9 lists every crash vector.
- **Body parsing:** `express.json({ limit: '20mb' })` keeps `req.rawBody` for the Svix check (38). Static files come from `public/`, with `no-cache` on `.js`, `.css` and `.html` (39–45).
- **Authentication:** none. No route checks a Supabase JWT. Every `/api/*` route is public, and the only identity signal is a `userId` field in the JSON body. That field is trusted for log attribution (68–79) and for loading the avatar (3040–3052).
- **Route count:** 48 route registrations (`app.get` or `app.post`) plus 3 `app.use` calls (json 38, static 39, the genCtx middleware 68). That is the "51" in the brief.
- **AI SDK:** a single `new GoogleGenAI({ apiKey: GEMINI_API_KEY })` client (47). Every call goes through `ai.models.generateContent`, which the generation_log wrapper patches (§2).
- **Models used:**
  - `gemini-2.5-flash`: all JSON text work.
  - `gemini-2.5-pro`: only as a fallback or lead in stylenotes/analyse and the moodboard.
  - `gemini-3.1-flash-image`: every image.
- **Text JSON convention:** `responseMimeType: 'application/json'`, a `responseSchema` constant, `thinkingConfig: { thinkingBudget: 0 }` and an explicit `maxOutputTokens`. Thinking stays off because flash counts thinking tokens inside `maxOutputTokens`, and large JSON truncates without it. The moodboard is the one text call that has **no** schema or JSON mime type.
- **Post-parse clean-up:** every parsed text payload goes through `deEscDeep` (1150–1155), which decodes literal `\uXXXX` escapes the model leaks, such as `"€135"`.
- **Image-call convention:** `config: { responseModalities: ['TEXT','IMAGE'] }`, plus `imageConfig: { aspectRatio: '4:5' }` for avatar calls only. The first `inlineData` part in the response is the image. Calls run strictly one at a time, with a 3 s stagger between frames. Each call races a 40, 45, 50 or 60 s timeout, and the result goes to Cloudinary before its URL is written to the job.
- **Gender plumbing (477–497):**
  - `normGender(g)` maps anything other than `'man'` or `'unspecified'` to `'woman'`.
  - `genderDirective(g)` returns the sentence injected into stylist system prompts.
  - `wearerNoun(g)` and `wearerWears(g)` supply the image-prompt fragments.
  - Pronouns in prompts stay "she/her" and the directive tells the model how to read them.
- **Shared image fragments:**
  - `FULL_BODY_FRAME` (466): head-to-toe framing rule.
  - `styleIconsImageLine(icons)` (468–475): up to 5 icons as a "channels X, Y" sentence.
  - `AVATAR_IDENTITY` (3061): "the FIRST image is the model", used when an avatar reference image is prepended.
  - `AVATAR_STUDIO` (2928).
- **Logging:** `logAI(event)` (50–52) writes one JSON line to stdout (Railway logs only). The queryable trail is `generation_log` (§2).

---

## 1. Image-job lifecycle (the async pattern)

**Store.** `imageJobs = new Map()` (28), in-memory. Entry shape: `{ images: (string|null)[] | {type,url}[], done: boolean, created: ms }`. A sweeper runs every 5 min and deletes jobs older than **10 min** (29–34).

**Pattern shared by every image route:**
1. Run the text step (if any) and normalise it.
2. `jobId = randomBytes(6).toString('hex')` (12 hex chars). `imageJobs.set(jobId, {images: N nulls, done:false, created})`.
3. **Respond immediately** with the text payload plus `jobId` (`mb_job_id` for the moodboard) and usually `imageCount`/`count`.
4. Generate in a background IIFE, sequentially, with `await sleep(3000)` between frames.
5. For each frame:
   - Call `gemini-3.1-flash-image` inside `Promise.race` against a timeout that resolves `null`.
   - Pull the first `inlineData` part.
   - `cloudinaryUpload(base64, mime)` → URL.
   - Write the URL to `job.images[i]`.
   - On failure, `logAI` and `continue` (the slot stays `null`).
6. Set `job.done = true` at the end.

**Poll endpoint:** `GET /api/images/:jobId` (737–741) returns `{ images, done }` or 404 `{error:'Job not found or expired'}`. No auth; job ids are the only secret. Clients poll at these cadences:
- `public/js/app.js` 390–420: every 2 s, max 60 tries.
- Style Notes: every 4 s.
- Travel: comments mention a "5-minute polling ceiling" (1925–1926).

**Cloudinary upload** (`cloudinaryUploadFile`, 285–323):
- Signed upload: `sha256("folder=robes&timestamp=<ts><SECRET>")` → `POST https://api.cloudinary.com/v1_1/<cloud>/image/upload` with form fields `file`, `api_key`, `timestamp`, `signature`, `folder=robes`.
- `file` may be a `data:` URL or a public http(s) URL, in which case Cloudinary fetches it itself.
- The returned `secure_url` is rewritten to insert **`/image/upload/f_auto,q_auto/`** so HEIC uploads render in non-Safari browsers (311–318).
- Returns `null` on missing config or any error, and never throws.
- `cloudinaryUpload(b64, mime)` (279–281) wraps it with a data URL.

**Per-route variants:**

| Route | Frames | Timeout per call | Retries | Notes |
|---|---|---|---|---|
| `/api/style` | 3 (one per way) | 40 s | 2 attempts, 8 s pause | A late result still writes to the job (699–703). Falls back to a **data URL** if Cloudinary fails (697). The only route that can put base64 in a job. |
| `/api/daily` | one per item (4–6) | 50 s | none | Anchor = on-model frame, others = still-life |
| `/api/lookbuild/images` | ≤4 | 50 s | none | still-lifes |
| `/api/travel` | 1 hero + ≤7 stills (cap 8) | 50 s | none | stills only for capsule items with no wardrobe photo |
| `/api/stylenotes/tryon` | 2 (colour) or ≤4 (silhouette) | 50 s | none | identity-preserving edit of the user's photo |
| `/api/avatar/cell` | 1 | 50 s | 2 attempts, 8 s | Answers `{url}` directly if the cell already exists |
| `/api/avatar/render` | 1 | 60 s | 3 attempts, 8 s then 20 s | |
| `/api/moodboard` | ≤7 (3 hero, 2 flat-lay, 2 atmosphere) | 45 s | none | `images` is an array of **`{type,url}` objects**, not strings. Grows incrementally from `[]` (3324, 3363). |

**New platform notes:**
- Persist jobs in Postgres (for example `generation_jobs` and `generation_job_frames`) or in a queue (Inngest, Trigger.dev, QStash), not process memory. Railway restarts and multi-instance deploys currently lose in-flight jobs.
- Key jobs to `user_id` and authorise the poll. Better still, push frames over Supabase Realtime instead of polling.
- Use one frame shape everywhere: `{index, kind, url|null, status, error}`.
- Build every image prompt on the server from validated structured data. Today the moodboard feeds **model-authored** prompts straight to the image model (3330–3339).
- Keep the `f_auto,q_auto` rewrite, or use the Cloudinary SDK's `format: 'auto'`.
- Never return base64 in a job.

---

## 2. generation_log wrapper (AsyncLocalStorage)

**Where:** 54–162, plus two explicit `glog` calls for "composition" rows (daily 1040–1051, travel 1937–1948).

- **Middleware** `app.use('/api', ...)` (68–79) runs `genCtx.run(ctx, next)` for every `/api` request. `ctx` holds:
  - `endpoint`: `req.baseUrl + req.path`.
  - `userId`: body `userId` if it matches `/^[0-9a-f]{8}-[0-9a-f-]{27}$/i`, else null. **Trusted from the client.**
  - `genId`: body `genId`, a client-minted correlation id, sliced to 24 characters.
  - `userPrompt`: the first of body `prompt`, `brief` or `activity`, trimmed to 400 characters.
- AsyncLocalStorage carries this context into the background image loops, so image calls are attributed to the right endpoint and user.
- **Patch:** only when `SUPABASE_SERVICE_ROLE_KEY` is set (116). `ai.models.generateContent` is replaced by a wrapper that times the call and then calls `glog(row)`. The row carries:
  - `user_id`, `endpoint` (or `'background'`), `model`.
  - `tokens_used` from `usageMetadata.totalTokenCount`, and `latency_ms`.
  - `status`: `ok`, `partial` (an image model with no image), `timeout` (error text matches `/timeout|timed out|deadline/`) or `error`.
  - `prompt`: the full flattened text of the system instruction plus every text part; inline images are counted, never stored (`genPromptText`, 99–114).
  - `response`: parsed JSON, or `{text}`, or `{has_image}` for image models.
  - `detail`: `{input_images, gen_id?, user_prompt?, error?}`.
- **`glog`** (81–95) posts to `SUPABASE_URL/rest/v1/generation_log` with the **service role** key and `Prefer: return=minimal`, adding `environment: APP_ENV`. It is fire-and-forget: failures are `console.warn`ed. `APP_ENV` is `'production'` iff `PUBLIC_URL` contains `www.byrobes.com`, else `'beta'` (65).
- Table (`supabase/admin_capture_migration.sql` 65–90): `user_id` has an FK to `auth.users`, and RLS allows admin-only select.
- **Defects:**
  - `userId` comes from the body unauthenticated, so anyone can attribute calls to any real user. A random UUID fails the FK and the row is silently lost.
  - Full prompts include names, style DNA and wardrobe. That is PII in a log table with no retention policy.
  - The patch monkey-patches the SDK object, which is brittle if the SDK changes.
- **New platform notes:**
  - Build an explicit `callModel({feature, userId, genId, ...})` helper that logs. Do not patch the SDK.
  - Take `userId` from the verified session, never from the body.
  - Keep `genId` as a correlation id, but mint it on the server and return it.
  - Add a retention policy and redaction for the log.
  - Keep the "composition" rows (owned vs total counts) as first-class metrics.

---

## 3. Rate limiter

**Where:** 436–458. `rateLimitMap = new Map()` keyed by **`req.ip` only**, with entry `{count, start}`. `rateLimit({windowMs, max})` returns middleware that resets the entry when the window has elapsed, increments the count and returns 429 `{error:'Too many requests — please wait a minute.'}` when `count > max`. Stale entries are pruned hourly.

**Per-route limits:**

| Limit | Routes |
|---|---|
| 60/min | inbox/receipt |
| 40/min | board |
| 30/min | notify/unsub (GET and POST), alternates, lookbuild/note, intent |
| 20/min | wardrobe/read-url, lookbuild/images, avatar/cell |
| 12/min | avatar/render |
| 10/min | style, daily, travel/looks, moodboard |
| 6/min | travel, stylenotes/tryon |
| **None** | health, waitlist, instagram, feedback, images poll, look (POST and GET), static pages, taxonomy, **wardrobe/analyse (a Gemini call)**, **stylenotes/analyse (gemini-2.5-pro)**, **wardrobe/upload (open Cloudinary proxy)** |

**Defects:**
- **One shared counter per IP across every route.** The key does not include the route, so 30 alternates calls followed by one travel call returns 429 (count 31 > 6), and whichever route "starts" the window sets its length for all.
- **No `app.set('trust proxy', ...)`** (grep finds none). Behind Railway's proxy, `req.ip` is probably the proxy hop address, which would make the limiter global across all users. Verify in production.
- Process-local, so it resets on restart and does not work across instances.

**New platform notes:**
- Use a per-user plus per-route limiter backed by a shared store (Upstash Redis, or a Postgres token bucket), keyed on the authenticated user id with an IP fallback for public routes.
- Add daily generation quotas per user. Image generation is the cost driver.

---

## 4. Routes

Each entry follows the same order: Purpose, Request, Response, External calls, Prompt, Business rules, Defects, New platform notes.

### 4.1 Utility and marketing routes

#### `GET /api/health` (326–338)
- **Purpose:** health and config probe. The admin panel reads it to explain empty tabs.
- **Response:** `{ ok:true, gemini, airtable, cloudinary, supabase (SUPABASE_ANON_KEY set), generation_log (service key set), email: notifier.on, inbox: inboxOn, inbox_domain }`.
- **Defects:** public, and it discloses which integrations are configured. Low risk.
- **New:** keep it as an unauthenticated liveness check. Move config detail behind an admin check.

#### `POST /api/waitlist` (395–406)
- **Purpose:** landing-page email capture into Airtable `Contacts`. No caller in `public/` on this branch; the `main` landing uses it.
- **Request:** `email` (string, required, regex `/.+@.+\..+/`), `name` (optional). No length caps.
- **Response:** `{ok:true}` or 400 `{error:'Invalid email'}`.
- **External:** `airtableUpsert('Contacts', {Email, 'Joined At': YYYY-MM-DD, Name?})` does a PATCH with `performUpsert.fieldsToMergeOn:['Email']` (243–259).
- **Defects:** no rate limit and no CAPTCHA. Airtable failures are swallowed, so the route answers ok regardless.
- **New:** a `waitlist` table in Postgres (or a Resend audience), with a rate limit and a bot check.

#### `POST /api/instagram` (409–418)
- **Purpose:** attach an Instagram handle to a contact.
- **Request:** `email` (optional), `handle` (required). A leading `@` is stripped.
- **External:** Airtable upsert on `Contacts` merged by `Email`.
- **Defects:**
  - **Crash:** `handle.replace` on a non-string truthy value (412) throws inside an async handler with no try, which is an unhandled rejection that ends the process.
  - Anyone can overwrite any contact's handle by supplying their email (upsert).
  - An empty email upserts a record with `Email:''`.
  - No rate limit.
- **New:** make it an authenticated profile field.

#### `POST /api/feedback` (421–434)
- **Purpose:** look rating and comment. Written to Airtable `Feedback` by `app.js` and `dashboard-personalize.js`.
- **Request:** `email`, `rating` (coerced with `Number`), `comment`, `prompt`, `pieceLink`, `photoUrl`, `looksOutput`. All optional and uncapped.
- **External:** `airtableCreate('Feedback', {...})`. When `photoUrl` is present it becomes a `Photo` attachment, so Airtable fetches any URL the client supplies.
- **Defects:** unauthenticated. Airtable fetches an arbitrary URL as an attachment. No rate limit. Unbounded text.
- **New:** use the Supabase `feedback` table, which already exists (`admin_capture_migration.sql` 95+), keyed to the session user and rate limited.

#### `POST /api/look` (2159–2197) and `GET /api/look/:id` (2199–2238)
- **Purpose:** the legacy www "style a key piece" share link (`/look/:id` → `public/look.html`).
- **POST request:** `ways` (array, required, non-empty), plus `name`, `piece`, `photoUrl`, `generatedImages` (data URLs or URLs), `fallback`, `prompt`, `email`.
- **POST response:** `{id}`, 10 hex characters. The look is stored in `lookStore` (19–25), an in-memory Map with a **48 h** TTL swept hourly.
- **POST background work:** every `data:` generated image is uploaded to Cloudinary. Then `airtableCreate('Feedback', {Email, Prompt, 'Piece Link': ${BASE_URL}/look/${id}, Photo: attachments, 'Looks Output': JSON.stringify({name,piece,fallback,photoUrl,genImageUrls,ways}), 'Created At'})` runs.
- **GET:** served from memory. On a miss it queries Airtable with `filterByFormula={Piece Link} = "<url>"`, rebuilds the look from the `Looks Output` JSON and re-caches it. Otherwise 404.
- **Defects:**
  - **Airtable formula injection:** `req.params.id` is interpolated inside `"..."` in the formula (2206–2207). `encodeURIComponent` only URL-encodes; a `"` in the id breaks out of the string literal, so crafted ids can match other rows.
  - POST is unauthenticated and not rate limited. Up to 20 MB bodies are held in memory (DoS). It works as a free Cloudinary upload proxy for arbitrary base64. The `email` field is caller-controlled.
- **New:** drop it. Beta shares go through `lookbook_items.share_id` and `/board/:shareId`. If the www key-piece share must survive, store it in Postgres with a server-generated id and no Airtable read path.

#### Static page routes (2240–2300, 2424–2446)
- **All `res.sendFile` of a file in `public/`:**
  - `/look/:id` → `look.html`
  - `/dashboard`, `/wardrobe`, `/looks`, `/diary`, `/calendar` (legacy alias), `/inspiration`, `/wishlist`, `/piece/:id`, `/lookbook`, `/moodboards`, `/moodboard/:slug` → `dashboard.html`. It is one SPA shell and the client routes on `location.pathname`.
  - `/admin` → `admin.html`, which gates itself client-side on session plus `profiles.is_admin`.
  - `/stylenotes`, `/onboarding`, `/signup`, `/reset`, `/terms`, `/privacy` → the matching `.html`.
- **Defects:** `/admin` ships its HTML to anyone. Admin data safety relies entirely on RLS (`is_admin()` policies).
- **New:** App Router pages, with middleware session checks for app routes and a server-side `is_admin` gate for `/admin`. Keep the deep-link paths as redirects: `/calendar`→`/diary`, `/looks`→lookbook.

#### `GET /board/:shareId` (2302–2422)
- **Purpose:** public share page for a lookbook artifact (moodboard, daily look, travel edit, key piece), with server-rendered OG and Twitter meta for crawlers.
- **Input:** `shareId` is sanitised to `[a-zA-Z0-9_-]`, max 48 characters.
- **External:** Supabase REST with the **anon key**: `lookbook_items?share_id=eq.X&is_public=eq.true&limit=1&select=type,title,subtitle,img,data,created_at`. RLS exposes only public rows. The anon key falls back to a hardcoded publishable key (2309), which is acceptable because it is public.
- **Payload** (`publicSharePayload`, 2319–2373) is whitelist-only: `{type, title, subtitle, images ≤10 https, pieces ≤24 {name,brand,price}, tags ≤6, editorial ≤400 chars}`. Mapping per `type`:
  - `moodboard`: `hero_image`, `grid_images[].url`, `the_look[]`, `aesthetic_tags`, `editorial_direction`.
  - `daily-look`: `dlData.steps[].items[]`. Image order: `wardrobe_match.image_url`, then `generatedImages[image_index]`, then `image_url`, then `img`.
  - `travel-edit`: `tvData.capsule[]`, same image order.
  - default (key piece): `kpData.generatedImages`, `photoUrl`, `ways[]` title and eyebrow.
- **Template:** `public/board.html` is read once and cached in `_boardTpl`. `<!--__OG__-->` is replaced by the meta block (escaped with `htmlEsc`) and `__BOARD_JSON__` by the JSON with `<` escaped as `<`. A not-found page returns 404 with `noindex`.
- **Defects:** `String.prototype.replace` with a *string* replacement interprets `$&`, `` $` `` and `$'`, so a board title or editorial containing `$'` splices template text into the page (2384). Only garbling, but a real bug. Use a replacer function.
- **New:** a Next.js route `app/board/[shareId]/page.tsx` with `generateMetadata`, reading through a server-side Supabase client (anon plus RLS) and reusing the same whitelist mapper as a typed function.

#### `GET /api/notify/unsub` and `POST /api/notify/unsub` (370–385)
- **Purpose:** one-click unsubscribe. GET is the footer link and POST is the RFC 8058 `List-Unsubscribe-Post` target.
- **Request:** `?t=<uid>.<prefKey>.<hmac40>`.
- **Handler:**
  1. `notifier.verifyUnsub(t)` (notify.js 141–147).
  2. `notifier.applyUnsub(uid, key)` reads `profiles.notification_prefs` and PATCHes `{...prefs, [key]: false}` with the service role (notify.js 151–165).
  3. Returns an inline HTML page, "Done" or "Not quite", built by `UNSUB_PAGE` (374–376).
- **Defects:** GET changes state, so link-scanning mail gateways can unsubscribe users. The PATCH is a read-modify-write race on jsonb.
- **New:** make GET a confirm page whose button POSTs. Keep POST one-click for RFC 8058. Update the pref with `jsonb_set` in an RPC.

#### `POST /api/notify/tick` (386–393)
- **Purpose:** test hook that runs `notifyTick(now)` at a given instant. Mounted **only** when `NOTIFY_DEBUG=1`.
- **Request:** `{now?: ISO}`.
- **Response:** the tick result `{sent[], skipped, considered, error}`.
- **New:** replace it with a cron route protected by `CRON_SECRET` (Vercel Cron), or a scheduled job.

### 4.2 Wardrobe intake

#### `GET /api/wardrobe/taxonomy` (2477–2487)
- **Purpose:** gives the client the Category › Subcategory › Item type selects and the pre-fill preview.
- **Response:** `{ groups: TAXONOMY_GROUPS, tagDefaults: tagDefaultRows(), wearSeeds: WEAR_SEEDS }` with `Cache-Control: public, max-age=3600`.
- **New:** a static TS module imported by both client and server. There is no need for an endpoint.

#### `POST /api/wardrobe/analyse` (2489–2580)
- **Purpose:** photograph of a garment in, a structured wardrobe piece out (the add-a-piece confirm screen). Used by the dashboard and onboarding.
- **Request:** `data` (base64 string, required), `mimeType` (required). No size or type validation beyond the 20 MB body limit.
- **External:** one `gemini-2.5-flash` call. Parts are `[inlineData, prompt text]`. Config: `ANALYSE_SCHEMA`, `maxOutputTokens: 760`, `temperature: 0`, `thinkingBudget: 0`. No retry, no timeout.
- **Prompt** (inline, 2500–2523): fashion-intelligence engine.
  - If no garment is visible, set `no_item_detected`.
  - Otherwise file the piece: label, category, formality (casual, smart, formal, black_tie; judge the garment, not the styling), L2 and L3 copied exactly from `taxonomyPromptBlock()`.
  - Colour from a fixed 20-name palette in "Foundations / Dimension Builders / Exclamation Points / Print" groups.
  - Hex, editorial colour name, brand if visible, 2–4 silhouette descriptors.
  - Price, currency and size **only when printed** in the photo.
  - One notes sentence under 15 words.
- **Schema** `ANALYSE_SCHEMA` (2448–2475), all required: `no_item_detected`, `label`, `category` (enum of 9), `category_l2`, `category_l3`, `color`, `primary_color_hex`, `editorial_color_name`, `brand`, `silhouette_fit[]`, `formality` (enum), `price`, `currency`, `size`, `ai_generated_notes`.
- **Response:**
  - Success: `{ label, category, category_l2, category_l3, color, brand, price:number|null, currency:ISO3|null, size|null, notes, item_dna }`.
  - `item_dna` = `{display:{title, editorial_color_name, primary_color_hex, brand_raw}, structural_dna:{silhouette_fit}, formality, llm_styling_context:{}, ai_generated_notes}`.
  - No item: `{noItemDetected:true, ...empties}`.
  - On any error: **200** with `{analysisFailed:true, ...empties}` (2578). The client retries once after 1.5 s.
- **Business rules:**
  - `resolveTaxonomy(l2, l3)` validates the pair. A valid pair **decides** the legacy `category`, so `category` and `category_l2` never disagree. An invalid pair keeps the model's category with L2 and L3 set to null.
  - Price is parsed to a positive float. Currency is uppercased A–Z and cut to 3 characters. Size is cut to 40 characters.
- **Defects:** no rate limit and no auth on a paid vision call. `mimeType` is not validated.
- **New:** accept a Supabase Storage or Cloudinary upload reference rather than base64. Enforce image mime types and a size cap. Rate limit per user. Keep the 200-with-flag contract, or switch to a typed result union.

#### `POST /api/wardrobe/upload` (3375–3387)
- **Purpose:** host an image on Cloudinary. The client stores the URL in `wardrobe_items.image_url` and similar fields.
- **Request:** either `{data (base64), mimeType}` or `{url}`, a public http(s) URL that must pass `inbox.safeUrl`.
- **Response:** `{url}` (with `f_auto,q_auto`), or 400 (missing), or 500 (Cloudinary env missing or upload failed).
- **Defects:** **no auth and no rate limit**, which makes it an open image-hosting proxy on our Cloudinary account. The remote URL is lexically SSRF-checked, but Cloudinary does the fetch, so the SSRF exposure is Cloudinary's.
- **New:** use signed direct uploads from the browser (Cloudinary upload preset with a server-signed signature, or Supabase Storage signed upload URLs) tied to the user, with a per-user folder.

#### `POST /api/wardrobe/read-url` (359–368)
- **Purpose:** paste a product-page link and get the same piece shape as the photo analyse, plus `image_url`.
- **Request:** `url` (string). `userId` is also sent, but only for logging.
- **Response:**
  - Success: a piece from `normalisePiece` (inbox.js 260–287), with `item_dna.source = {kind:'url', url, site}`.
  - Errors: 400 `{error:'bad_url'}`, 422 `{error: 'unreachable'|'not_a_page'|'read_failed'|'no_item'|'off'}`.
- **External:** see §6.3. Fetches the page (12 s, 2 MB), one `gemini-2.5-flash` call (`PRODUCT_SCHEMA`, 900 tokens, temperature 0), then Cloudinary hosts the product image.
- **Defects:** SSRF guard gaps (§6.4). No auth.
- **New:** run as a server action with an auth check. Resolve DNS and block private ranges after resolution. Disable redirect following, or re-validate each hop.

#### `POST /api/inbox/receipt` (340–357)
- **Purpose:** inbound-mail webhook for forwarded order confirmations.
- **Auth:**
  - Returns 503 `inbox_off` unless `inbox.on` (service key plus Gemini) **and** one of the two secrets is set (225).
  - Accepts `?key=` or header `x-inbox-key` equal to `INBOX_WEBHOOK_SECRET`. The comparison is a plain `===`, not constant-time, and the secret in the query string lands in access logs.
  - Or a Svix signature verified over `req.rawBody` with `RESEND_WEBHOOK_SECRET` (inbox.js 181–196).
  - Otherwise 401.
- **Body:** the provider payload (Resend `email.received`, Postmark, Mailgun or generic JSON).
- **Response:** `inbox.ingest(body)` → `{ok, reason, items?, seen?, id?, user_id?, mailed?}`. It always answers 200 for a decided outcome so the provider does not retry. It returns 500 only if `ingest` throws.
- **Flow:** see §6.2.
- **Defects:** no idempotency on `provider_id`, so a provider retry after a slow read (8000-token text read plus up to 24 vision calls can exceed a webhook timeout) creates duplicate `held` rows. The secret comparison is not constant-time.
- **New:** acknowledge fast (verify, store the raw mail in `inbound_mail` with a unique `provider_id`, return 200) and process in a background job. Use `timingSafeEqual`. Prefer the Svix signature only.

### 4.3 Stylist generation

The inputs shared by these routes are client-supplied. The body carries `styleDna`, `styleIcons`, `wardrobeItems` and `gender`, all read from Supabase by the browser and posted back. `styleDnaPromptBlock(styleDna, wardrobeCount, styleIcons)` (style_dna.js 557–602, §7) turns them into prompt text.

#### `POST /api/style` (460–734): "style a key piece three ways" and the "dress me" daily variant
- **Purpose:** the original Robes flow. A key piece (photo, text or link) goes in; 3 editorial looks and 3 on-model images come out. `intent:'dress-me'` switches the brief to "dress me for today".
- **Request** (523–524):

  | Field | Type | Req | Caps / use |
  |---|---|---|---|
  | `photo` | data URL string | one of photo/link/prompt | parsed by regex `^data:(mime);base64,(data)$`; also uploaded to Cloudinary |
  | `link` | string | " | inserted verbatim in the prompt; **not fetched** |
  | `prompt` | string | " | uncapped in the text prompt; 200 chars in the image prompt |
  | `name`, `pieceName` | string | no | uncapped |
  | `styleDna` | object | no | trusted |
  | `styleIcons` | string[] | no | 12 for the text model, 5 for the image model |
  | `wardrobeCount` | number | no | drives the DNA directive |
  | `wardrobeItems` | `{label,category,color,times_worn}[]` | no | sliced to 60; fields uncapped |
  | `intent` | `'dress-me'` | no | daily mode |
  | `context` | `{city, month, tempRange, condition}` | no | used only in daily mode |
  | `gender` | string | no | `normGender` |
  | `avatarId`, `userId` | string | no | avatar reference lookup |

- **Response:** `{ ways: [{eyebrow,title,outfit,details,accessories,tags[]}×3], jobId, photoUrl (Cloudinary|null), fallback }`, then poll `/api/images/:jobId` for 3 frames.
- **External:**
  - Text: `gemini-2.5-flash` with `STYLE_SCHEMA`, `thinkingBudget:0`, `maxOutputTokens:2000`, no temperature set, wrapped in `withRetry` (3 attempts, 800 ms × 2^i backoff; a local copy at 606–613). The call runs **in parallel** with the Cloudinary upload of the photo.
  - Images: `gemini-3.1-flash-image` ×3, sequential, 3 s stagger, 40 s race, 2 attempts with an 8 s pause.
  - Supabase service role, through `avatarRefForUser`, to read `profiles.avatar_id` and fetch the avatar cell.
- **Prompt** (532–603):
  - The system instruction assembles:
    - a gender block;
    - the brief: key-piece mode "three distinct looks, each with occasion and mood", or daily mode "three complete outfits for today";
    - `formulaBlock` (550–552): the **four-tier layer formula** Anchor / Canvas / Texture / Exclamation Point, plus a "STYLING SANITY CHECK" that keeps sporty pieces in an elevated-casual register and forbids contortions;
    - the fallback rule;
    - the wearer rule;
    - the DNA block, the closet block and the closet directive.
  - The user text is the piece, context and link lines, or the daily rtLine and brief.
  - The image prompt (681) asks for portrait orientation, a single editorial frame, `AVATAR_IDENTITY` when there is an avatar, `FULL_BODY_FRAME`, the piece line, the photo line ("reproduce the piece faithfully, compose a new scene"), a brief line, an icon line, and the look title, eyebrow and outfit.
- **Schema** `STYLE_SCHEMA` (499–521): `fallback` (bool), `wearer` (enum woman or man), `ways[]` of `{eyebrow, title, outfit, details, accessories, tags[]}` with all fields required.
- **Business rules:**
  - **Fallback piece** `FALLBACK_PIECE = 'black Balmain waistcoat with gold buttons'` (461). In key-piece mode the model **must** set `fallback:true` for gibberish, no identifiable garment, or input that is too vague (a colour, one generic word, a non-fashion concept), and style the waistcoat instead. In daily mode fallback applies to gibberish only.
  - On fallback, the user's photo is not sent to the image model and the piece label becomes the fallback piece. The client also swaps in "Balmain waistcoat" (app.js 386).
  - **Closet rules** (538–548): wardrobe lines are `label [category], color, worn N×`.
    - With **≥15 items**, build primarily from the closet and add new pieces only for true gaps or the Exclamation Point.
    - With 1–14 items, prefer owned pieces by exact label and fill gaps.
    - With 0 items, add no directive.
  - **Wearer:**
    - `gender:'man'` forces `man`.
    - Otherwise the model's `wearer` stands.
    - For `woman`, the prompt forbids flipping to male just because the piece is menswear.
    - The image frame uses `man` if the setting or the model says so, else `woman`.
  - **Avatar:** the kept model (avatar cell) is prepended as the first image when the profile has an `avatar_id` whose gender prefix matches the wearer (see §4.5).
- **Defects:**
  - Crash vectors outside `try`: `photo.match` on a non-string (598); `i.label` on a null wardrobe element (540); `styleDnaPromptBlock` on a malformed `styleDna`, where `.join` on non-arrays throws (536).
  - The background IIFE has **no `.catch`**. If the model returns without `ways` or with non-object entries, `ways.map` or `w.title` throws in the background, which is an unhandled rejection. The route also answers `{ways: undefined}` in that case.
  - `link` is inserted into the prompt unvalidated (prompt injection). `userId` and `avatarId` are trusted.
  - Every text field is uncapped.
- **New platform notes:**
  - Load `wardrobe_items`, `profiles.style_dna`, `style_icons`, `gender_identity` and `avatar_id` **server-side by session user id**. Accept only `{ prompt | photoRef | link, intent, context? }`.
  - Validate with zod. Make it a job: create a `generations` row, return `{generationId}`, and stream text then frames.
  - If the link matters, fetch it through the product reader.
  - Re-evaluate whether `dress-me` via `/api/style` is still used, since `/api/daily` is the richer daily path.

#### `POST /api/daily` (743–1125): one outfit for a real day (the "Context-to-Core" framework)
- **Purpose:** "Dress today" and the restyle flow. It produces one look as 4 architectural steps, with per-item owned-wardrobe matching and 2 alternates per item.
- **Request** (912):

  | Field | Type | Caps / use |
  |---|---|---|
  | `prompt` | string | default "A regular day — no fixed plans." |
  | `name` | string | uncapped |
  | `styleDna`, `styleIcons`, `gender`, `avatarId`, `userId` | | as in /api/style |
  | `wardrobeItems` | `{id,label,category,color,brand,image_url,times_worn,hero,season_band,seasons}[]` | sliced to 60 |
  | `context` | `{city,month,tempRange,condition}` | the real-time weather line |
  | `locked` | `{name,category,brand,wardrobe_id}[]` | sliced to 8; name capped at 120 |
  | `vibes` | string[] | the user's vibe vocabulary, ≤40 |
  | `noImages` | bool | skip the image job and return no `jobId` |

- **Response:** `{ fallback, occasion_label, headline, stylist_summary, transition_tip, palette[≤3], look_tags:{climate,wear_for[],vibe[]}, steps:[{title, items:[{name,category,brand,description,how,wardrobe_index,retailer_hint,price_point,alternates[≤3],wardrobe_match|null,image_index}]}], jobId?, itemCount }`.
- **External:**
  - Text: `gemini-2.5-flash` with `DAILY_SCHEMA`, `thinkingBudget:0`, `maxOutputTokens: 4800`, `withRetry` ×3.
  - Images: one per flattened item, 50 s race, no retry, 3 s stagger. Cloudinary is required; a frame that fails to upload is skipped.
  - One extra `glog` composition row: `{stage:'composition', owned_count, item_count}`.
- **Prompt:** the system instruction (951–980) covers:
  1. **Context filters:** agenda and mobility, atmospheric reality, psychological goal.
  2. **Architectural formula:** exactly 4 steps: The Anchor ×1, The Canvas ×1–2, The Texture ×1, The Accents ×2 (footwear plus hardware).
  3. **Golden ratios:** rule of thirds, volume balancing, textural contrast.
  4. **Transition protocol:** one subtractive or hardware-swap move in `transition_tip`.

  It then carries the state directive, hero block, locked block and field rules (headline ≤8 words; `stylist_summary` = PANEL NOTE; palette = 3 hex values; `how` = ROW NOTE; owned vs new pricing; 2 alternates), plus `LOOK_TAGS_RULE`, `vibeVocabLine(vibes)`, the DNA block, `BANNED_CONSTRUCTIONS_RULE` and the closet list by index. The user text is the rtLine plus the brief (982–984).
- **Image prompts** (1083–1085): the Anchor gets an on-model full-look frame (avatar prepended if present, all item names listed, setting = occasion + city). Every other item gets an editorial still-life on cream linen, driven by the model-authored `description`.
- **Schema** `DAILY_SCHEMA` (854–906):
  - Top level: `fallback`, `occasion_label`, `headline`, `stylist_summary`, `transition_tip`, `palette[]`, `look_tags` (`LOOK_TAGS_SCHEMA`), `steps[]`.
  - Each step: `{title enum DAILY_STEP_TITLES, items[]}`.
  - Each item: `{name, category enum(8), brand, description, how, wardrobe_index:int, retailer_hint, price_point, alternates[{name,brand,retailer_hint,price_point}]}`. `description` is optional.
- **Business rules:**
  - **Wardrobe state** (941–945):
    - `n=0`: EMPTY, fully aspirational, every item `wardrobe_index -1` with a retailer and EUR price.
    - `n<15`: GROWING (`n/15`), hybrid; an owned piece always beats a hypothetical one.
    - `n≥15`: COMPLETE, closet-first; new pieces only for true gaps or the exclamation point.
  - **Hero rack** (1446–1467): items with `hero:true` get `★ HERO (<band>)`, where the band is Spring/Summer, Autumn/Winter or Year-round from `season_band`, falling back to the legacy `seasons[]`. The directive prioritises heroes only when the look's climate matches the band.
  - **Locked or anchored pieces** (921–932): each must appear verbatim, and its wardrobe index is pre-resolved from `wardrobe_id`.
  - **Normalisation** (1010–1032):
    - Keep only valid step titles, sort them into canonical order, and keep ≤2 items per step.
    - Resolve `wardrobe_match {id,label,image_url,color}` from `wardrobe_index`.
    - Cap `how` at 160 characters and alternates at 3.
    - Assign `image_index` sequentially.
    - Throw `empty daily look` if nothing survives.
  - `look_tags` goes through `normLookTags` (816–837):
    - `climate` must be in `LOOK_TAG_CLIMATES`, with the legacy map applied.
    - `wear_for` is mapped from legacy terms, de-duplicated and capped at 8.
    - `vibe` is lowercase, strips a `vibe:` prefix, and is capped at 28 characters and 4 entries.
  - Client-side, "The Accents" folds into "The Exclamation Point" (comment 751–755).
- **Defects:**
  - `closetItems.map(i => i.label ...)` throws on a null element outside `try` (936).
  - `styleDna` is trusted.
  - `palette` hex values are not validated.
  - Images that fail stay `null` with no retry.
- **New platform notes:**
  - Load the wardrobe (with hero and season band), style DNA, icons, vibe vocabulary, gender and avatar from the database by user id.
  - Take `locked` as wardrobe item ids, not free text.
  - Fetch the weather context on the server (the client currently sends its own city and weather).
  - Persist the result as a `looks` or `lookbook_items` draft keyed by `generationId`.

#### `POST /api/alternates` (1127–1282)
- **Purpose:** on-demand "Swap": 2 same-slot alternatives for one piece in an existing look. Fetched only when the user engages; the client caches the result.
- **Request:**
  - `item: {name (required, ≤120), category ≤40, brand ≤60}`
  - `context: string[]` (other pieces, ≤8 × 80)
  - `styleDna`, `styleIcons`, `gender`
- **Response:** `{alternates: [{name ≤120, brand, retailer_hint, price_point, how ≤160}] ≤2}`. Entries whose name equals the original's are dropped.
- **External:** `gemini-2.5-flash`, `ALTERNATES_SCHEMA`, `thinkingBudget:0`, `maxOutputTokens: 500`. No retry, no timeout.
- **Prompt** (1249–1255): head stylist. Exactly 2 alternatives for the same slot, never a repeat of the original, each with a real brand, retailer and EUR price. `how` = ROW NOTE, plus the banned constructions and the DNA block. The user text names the piece to replace and "the rest of this look (do not suggest these)".
- **Schema** `ALTERNATES_SCHEMA` (1157–1176): `alternates[]` of `{name, brand, retailer_hint, price_point, how}`, all required.
- **Defects:** `styleDnaPromptBlock` runs outside `try` (1247). No auth.
- **New:** load DNA from the database. Accept `lookId` plus `pieceSlot` rather than free text. Cache by `(user, look, slot)`.

#### `POST /api/lookbuild/images` (1178–1234)
- **Purpose:** still-life frames for pieces Robes *proposed* in the look builder that the user does not own.
- **Request:** `pieces: [{name (required, ≤120), brand ≤60, category ≤40}]`, sliced to **4**. Returns 400 if empty.
- **Response:** `{jobId, imageCount}`, then poll.
- **External:** `gemini-3.1-flash-image` ×N. Prompt (1203): an editorial still-life on cream linen, soft daylight, "No model, no text, no collage". 50 s race, no retry, Cloudinary.
- **New:** create frames against `look_proposals` rows by id. Cache stills per normalised `(name, brand, category)` so the same proposal is never generated twice.

#### `POST /api/lookbuild/note` (1284–1355)
- **Purpose:** write the panel note, palette and tags for a look the client assembled deterministically ("no LLM decides the pieces").
- **Request:** `pieces: [{name (required, ≤120), role ≤40, owned: bool}]` sliced to 8 (**min 2**, else 400), plus `styleDna`, `styleIcons`, `gender`, `vibes`.
- **Response:** `{note ≤300, palette: hex[] (validated /^#[0-9A-Fa-f]{6}$/, ≤4), look_tags}`.
- **External:** `gemini-2.5-flash`, `LOOKBUILD_NOTE_SCHEMA`, `thinkingBudget:0`, `maxOutputTokens: 450`.
- **Prompt** (1318–1328): "a look has already been assembled — you are writing its note and filing it, never changing the pieces". `note` = PANEL NOTE; palette = 2–4 muted hex values read off the named pieces; plus `LOOK_TAGS_RULE`, the vibe line, banned constructions and the DNA block. The user text lists pieces with role and owned or proposed.
- **Schema** `LOOKBUILD_NOTE_SCHEMA` (1292–1302): `note`, `palette[]` (optional), `look_tags`. Required: `note`, `look_tags`.
- **New:** take `lookId` and load the pieces from `look_pieces` plus proposals.

#### `POST /api/intent` (1357–1444): prompt router
- **Purpose:** classify the single free-typed home prompt into the `daily`, `travel` or `unclear` track, and extract destination, dates and vibe.
- **Request:** `prompt` (required, trimmed to 400), `clientDate` (`YYYY-MM-DD`, the client's local date; otherwise null).
- **Response:** `{intent, destination|null (≤60), date_start|null, date_end|null (swapped if reversed), day_intents:[{date,label ≤120}] ≤14, vibe|null (≤120), confidence 0–1}`. On failure, 502 `{error:'intent_failed'}`.
- **External:** `gemini-2.5-flash`, `INTENT_SCHEMA`, **`temperature: 0`**, `thinkingBudget:0`, `maxOutputTokens: 500`, raced against a **5 s** timeout.
- **Prompt** (1389–1401): track definitions (a named trip outranks occasions inside it; a multi-day plan at home is `unclear`). Hard rules:
  - Never invent a destination.
  - Never invent dates; resolve relative dates against TODAY = `clientDate`, and emit no dates if it is unknown.
  - `day_intents` only for stated days.
  - `vibe` only if stated.
  - Confidence below 0.6 means the app asks the user.
- **Schema** `INTENT_SCHEMA` (1363–1382): `intent` (enum), `destination`, `date_start`, `date_end`, `vibe`, `day_intents[{date,label}]`, `confidence`. Required: `intent`, `confidence`.
- **New:** keep it as-is. It is well-shaped. Take the timezone from the profile (`notification_prefs.timezone`) rather than the client date alone.

#### `POST /api/travel` (1469–2020): Travel Edit (capsule packing plus lookbook)
- **Purpose:** for a trip (destination and dates), build a curated capsule, split into **Keep** (her key pieces, each with a reason) and **Worth Adding** (true gaps plus moodboard picks), and style one flat, day-agnostic look per named plan. The client pins looks to days.
- **Request** (1648):

  | Field | Type | Caps / use |
  |---|---|---|
  | `destination` | string, **required** | ≤120; 400 "Tell us where you're going first." |
  | `dateFrom`, `dateTo` | `YYYY-MM-DD` | valid if `to ≥ from`; `tripDays = min(10, days)`, else 7 |
  | `brief` | string | uncapped |
  | `vibe` | string | ≤240 |
  | `plans` | string[] | ≤10 × 60; covered plans are removed from it |
  | `coveredPlans` | string[] | ≤10 × 60; plans already mapped to her own saved looks |
  | `importedLooks` | `{title, occasion, pieces[]}[]` | ≤8; pieces ≤8 × 80. Looks she is packing whole |
  | `shortlistIds` (alias `anchorIds`) | wardrobe ids | key pieces that must be kept |
  | `suggestedItems` | `{name,category,brand,retailer_hint,price_point}[]` | ≤12. Moodboard hand-off; these land in Worth Adding |
  | `wardrobeItems` | as in daily | sliced to 60 |
  | `name`, `styleDna`, `styleIcons`, `gender` | | |

- **Response:** `{ fallback, trip_label, headline, location_vibe, stylist_summary, suitcase_note, palette[≤3], capsule[], left_behind: [] (always empty, deprecated), looks[], tripDays, plans (plans + covered), destination, dateFrom, dateTo, dateLine, weather, jobId, imageCount }`.
  - `capsule[]` items: `{name, tier, category, brand, description, reason, bridge, wardrobe_index, retailer_hint, price_point, wardrobe_match|null, image_index?}`.
  - `looks[]`: `{occasion ≤60, title, how ≤240, look_tags, formula:[{role, item_index, note}] ≤6}`.
  - `weather`: `{city,country,minC,maxC,tempRange,condition,eveningMinC,seasonal}`, or `{city,country}` only, or null.
- **External:**
  - **Weather** (`fetchTripWeather`, 1575–1628), called before the model:
    - Open-Meteo geocoding (`count=1`).
    - If the trip starts within −1…16 days, the live forecast first and the archive second. Otherwise the archive for **last year's same dates** first (a seasonal read) and the forecast second.
    - Each fetch has a 6 s timeout (`fetchJson`, 1566–1573).
    - The result gives min and max temperatures and the dominant WMO code mapped by `WX_CODE_TEXT` (1555–1564). Any failure returns null and the trip still generates.
  - **Text:** `gemini-2.5-flash`, `TRAVEL_SCHEMA`, `thinkingBudget:0`, **`maxOutputTokens: 9000`**, `withRetry` ×3. Plus **one corrective regeneration** (below).
  - **Images:** frame 0 is a hero on-model resort shot. It does **not** use the avatar, and it lists all capsule names. Then one still per capsule item with no owned photo, up to 8 frames in total. 50 s race each, 3 s stagger.
  - One `glog` composition row: `{owned_count, item_count}`.
- **Prompt:** `travelSystem(correctiveNote)` (1768–1816) builds the "StyleAlchemist 4-Core Pillars":
  1. **The 1:3 high-yield rule:** every capsule item appears in at least 3 outfits across at least 2 dress codes.
  2. **The capsule matrix:** the model decides the pack count, targeting about `suggest` items and never more than `capMax`. The maths must hold: pieces × 3 ≥ looks × 4. There are three tiers `TRAVEL_TIERS` with about 36% / 28% / rest splits.
  3. **The 4-step dressing formula:** capsule items referenced by `item_index`. The Anchor ×1, The Canvas ×1–2, The Texture ×1, The Exclamation Point ×1–2; swim and sleep looks may drop to 3. `note` = ROW NOTE, plus look tags.
  4. **Context engineering:** location vibe, micro-climate, DNA.

  Then come the looks section (exactly one per plan, or 0 when every plan is covered, or about `looksTarget` looks without plans; titles are 2–4 words in Title Case), plans, covered occasions, packed looks, the state directive and hero block, field rules, the DNA block, banned constructions, the key-pieces block (**keep every shortlisted piece**; Worth Adding ≤3 beyond moodboard picks, each with a `bridge` clause; do not pack owned pieces she did not shortlist), moodboard picks, the closet list and the corrective note. The user text (1818–1820) holds the weather line, trip brief, dates, days, vibe and the instruction.
- **Schema** `TRAVEL_SCHEMA` (1486–1553), all top-level fields required:
  - `fallback`, `trip_label`, `headline`, `location_vibe`, `stylist_summary`, `suitcase_note`, `palette[]`.
  - `capsule[]`: `{name, tier enum TRAVEL_TIERS, category enum(9, incl. Swim), brand, description, reason?, bridge?, wardrobe_index, retailer_hint, price_point}`.
  - `left_behind[]`: `{wardrobe_index, reason}`.
  - `looks[]`: `{occasion, title, how, look_tags, formula[{role enum TRAVEL_ROLES, item_index, note}]}`.
- **Business rules:**
  - `capMax = max(16, shortlist + suggested + 3)` (1684). `suggest = clamp(tripDays+6, 8, 15)`.
  - `looksTarget`:
    - `min(12, plans.length)` if there are plans;
    - else 0 if covered plans exist;
    - else `min(12, max(4, min(tripDays+2, 10)))`.
  - `totalLooks = looksTarget + packedLooks`.
  - The wardrobe state directive (EMPTY, GROWING or COMPLETE at 15) applies **only when there is no shortlist** (1738–1742).
  - **Validation and corrective pass** (1892–1921):
    - Compute the under-used items (worn in fewer than 3 looks), counted only when there are ≥6 looks. Pieces from packed looks are exempt.
    - Compute the unaccounted shortlist pieces (missing from the capsule).
    - If the capsule is empty, or looks are empty when some were expected, or more than 2 items are under-used, or any shortlist piece is missing, regenerate once with a "VALIDATION FAILURE ON YOUR LAST ATTEMPT — ..." note.
    - Keep the second attempt only if it is non-empty and strictly better on (missing + under-used).
    - Throw `empty travel edit` if still empty.
  - **Normalisation** (1831–1860): tier defaults to Foundations; `wardrobe_match` is resolved; looks are limited to 14 and formula entries to 6, filtered to valid roles and indexes; `left_behind` is forced to `[]` ("Leave Behind" is deprecated).
  - `trip_label` defaults to the destination uppercased.
- **Defects:**
  - `closetItems.findIndex(it => String(it.id) ...)` throws on a null element outside `try` (1665).
  - The heavy synchronous work (weather, then up to 2 × 9000-token calls) can run 30–60 s with no overall timeout.
  - `brief` is uncapped.
  - The hero image ignores the avatar, unlike style and daily.
- **New platform notes:**
  - Model it as a job. Load the wardrobe and DNA by user. Take shortlist ids and validate that they belong to the user.
  - Fetch the weather in a cached helper (key: destination plus date window).
  - Persist as a `trips` entity (or `lookbook_items` type `travel-edit`) and let the client poll for or stream the capsule and looks.
  - Keep the 1:3 validator as a pure function with unit tests.

#### `POST /api/travel/looks` (2022–2154): style more looks from an existing capsule
- **Purpose:** "+ Style another look" and day-scoped travel prompts. It re-mixes the packed capsule into new looks for named occasions and adds at most one gap piece.
- **Request:**
  - `capsule: [{name (required), category, brand, owned}]` ≤24.
  - `occasions: string[]` ≤10 × 60. Both are required, else 400.
  - `destination` ≤120 (default "the trip"), `brief` ≤300 in the prompt, `vibe` ≤240, `weather {city,tempRange,condition}`, `name`, `styleDna`, `styleIcons`, `gender`.
- **Response:** `{looks: [...same look shape, ≤ occasions.length], new_item: {name,tier,category,brand,description,bridge,retailer_hint,price_point,wardrobe_index:-1} | null}`.
- **External:** `gemini-2.5-flash`, `TRAVEL_MORE_SCHEMA`, `thinkingBudget:0`, `maxOutputTokens: 4000`. **No retry.** No images.
- **Prompt** (2098–2109; user text 2115):
  1. One look per occasion, in order, flat, with Title Case titles and `how` = PANEL NOTE.
  2. **Re-mix first**, 4-step formula by `item_index`, ROW NOTE, look tags.
  3. `new_item_needed:true` only if an occasion genuinely cannot be dressed; the new item is then referenced as `item_index = capsule.length`.
- **Schema** `TRAVEL_MORE_SCHEMA` (2029–2074):
  - `looks[]`, same shape as the travel looks.
  - `new_item_needed: bool`.
  - `new_item`: `{name, tier, category, brand, description, bridge?, retailer_hint, price_point}`.
- **Business rules:** `maxIdx = capsule.length - 1 + (newItem?1:0)`. A new item that no formula uses is dropped (2145). The tier defaults to "Statement & Texture".
- **New:** load the capsule from the saved trip by id rather than trusting it from the body.

#### `POST /api/moodboard` (3190–3373)
- **Purpose:** a moodboard for a brief: title, location line, tags, editorial direction, 8 shoppable pieces (`the_look`), and up to 7 images (3 hero, 2 flat-lay, 2 atmosphere).
- **Request:** `prompt` (required; `prompt?.trim()`), `wardrobeItems = []` `{id,label,category,color,image_url}`, `styleDna`, `styleIcons`, `gender`. **No caps** on anything.
- **Response:** `{ title, location_context, aesthetic_tags[], editorial_direction, the_look:[{name,category,description,styling_note,retailer_hint,price_point,wardrobe_match|null}], image_prompts:{hero_looks[],flat_lays[],atmosphere[]}, hero_image:null, grid_images:[], mb_job_id }`, then poll. Job images are `{type:'hero_look'|'flat_lay'|'atmosphere', url|null}[]`.
- **External:**
  - Text: `['gemini-2.5-flash','gemini-2.5-pro']` in order. One attempt each with a 30 s timeout, `maxOutputTokens: 5000`, `thinkingBudget: 0`, **no `responseMimeType`, no schema**. A 503, 429 or timeout falls through to the next model. A `finishReason` other than STOP or MAX_TOKENS throws.
  - The output is stripped of code fences, the first `{...}` is regex-extracted and `JSON.parse`d, and fewer than 6 `the_look` items throws.
  - Images: `gemini-3.1-flash-image` for each **model-authored** prompt, prefixed "Editorial fashion photography. No text overlays." Hero prompts also get "**One woman, alone.**" plus `FULL_BODY_FRAME` (3350). 45 s race, 3 s stagger.
- **Prompt** (3200–3247): the system prompt is "elite personal stylist ... Return ONLY valid JSON". The user prompt holds the brief, the wardrobe context, the DNA block and an **inline example JSON shape** that includes the image prompts. Rules: exactly 8 `the_look` items; hero models must be `wearerNoun(g)`; 3–5 ALL CAPS tags; no London or Wimbledon default. There is no schema constant.
- **Business rules:** wardrobe matching is by category string overlap (3306–3318).
- **Defects:**
  - Crashes outside `try`: `prompt?.trim()` on a non-string, `wardrobeItems.length/.map` on a non-array, and `i.label` on null elements (3194–3198).
  - The hero image prompt **hard-codes "One woman"** even for men (3350); the text prompt asks for `wearerNoun(g)`, so they contradict.
  - The **matcher bug**: `catLower.includes(wiCat)` is true when a wardrobe item's category is `''`, so every look item matches the first uncategorised wardrobe piece (3312).
  - No schema, so the output is fragile. The images come from LLM-authored prompts.
- **New platform notes:**
  - Define a `MOODBOARD_SCHEMA` with `responseSchema`.
  - Have the model return structured image *intents* (subject, setting, mood); the server composes the image prompts, including gender.
  - Match wardrobe items by taxonomy L2/L3 and colour, not substrings. Load the wardrobe and DNA by user.

### 4.4 Style Notes (colour and silhouette analysis)

#### `POST /api/stylenotes/analyse` (2582–2786)
- **Purpose:** from a selfie, the 12-season colour analysis (`kind:'colour'`); from a full-length photo, the 5-archetype body analysis (`kind:'silhouette'`). The result powers Style DNA.
- **Request:** `kind` (`'colour'|'silhouette'`, required), `data` (base64, required), `mimeType` (required), `fast` (bool; onboarding sends `true`).
- **Response:**
  - Colour: `{...render, style_dna: dna}` from `buildColorHarmony`.
  - Silhouette: from `buildSilhouette` (§7).
  - Rejections: `{no_face_detected:true}` or `{no_person_detected:true}`.
  - Failure: 502 `{error:'analysis_failed', reason ≤200}`.
- **External, model chain** (2720–2771):
  - Default: `gemini-2.5-pro` with schema (`thinkingBudget 1024`, `maxOutputTokens 4096`, 45 s race), then `gemini-2.5-flash` with schema (thinking 0, 2048, 25 s), then `gemini-2.5-flash` **without** schema (JSON mode only).
  - With `fast:true`: flash with schema, then pro with schema, then flash without schema.
  - All attempts use `temperature 0`. There is a 1 s pause between attempts. JSON parse happens inside the loop, so a truncated response falls through to the next model.
- **Prompts:**
  - `COLOUR_EXTRACT_PROMPT` (2630–2675): a master colour analyst runs a 6-step protocol. Cast correction uses the sclera and teeth; then hair temperature, skin, eyes, undertone reasoning, season reasoning. There are three dimensions (contrast, chroma, lightness), a description of each of the 12 seasons, and "discipline rules": golden blonde is warm-family; chroma separates Spring from Autumn; muted plus warm is Soft Autumn; flush is not coolness. It also samples skin, hair and eye hex values and sets `low_confidence`.
  - `SIL_EXTRACT_PROMPT` (2677–2701): a master stylist runs a pose-correction-first protocol (a mirror-selfie raised arm must be ignored), then shoulder, waist and hip observations, the 5 archetypes with explicit guards (Inverted Triangle needs genuinely broader skeletal shoulders), and ratio estimates plus the `loose_clothing` flag.
- **Schemas:**
  - `COLOUR_EXTRACT_SCHEMA` (2587–2609), with `propertyOrdering` so the observations come first: `no_face_detected`, `lighting_assessment`, `hair_observation`, `skin_observation`, `eye_observation`, `undertone_reasoning`, `season_reasoning`, `undertone` (Warm, Cool, Neutral-Warm, Neutral-Cool), `contrast` (Low, Medium, High, Extremely High), `chroma` (Low, Medium, High), `lightness` (Low, Medium, High), `season` (`SEASON_ENUM`, 2582), `skin_tone_hex`, `hair_color_hex`, `eye_color_hex`, `low_confidence`.
  - `SIL_EXTRACT_SCHEMA` (2611–2628): `no_person_detected`, `pose_assessment`, `shoulder_observation`, `waist_observation`, `hip_observation`, `shape_reasoning`, `shoulder_waist`, `hip_waist`, `shoulder_hip` (numbers), `body_shape` (`BODY_ENUM`, 2583), `loose_clothing`.
- **Business rules:** the model's holistic call wins. The deterministic primitive mapping is the fallback and is recorded as a cross-check (style_dna.js 446–553).
- **Defects:** no rate limit on a gemini-2.5-pro vision call, and no auth. `mimeType` is not validated.
- **New:** accept a storage reference. Write `profiles.style_dna.color_harmony` or `.silhouette_proportions` on the server (today the client writes it). Rate limit tightly, since this is a once-per-user action.

#### `POST /api/stylenotes/tryon` (2788–2870)
- **Purpose:** render the user into a proof pair (best vs avoid colour) or into up to 4 dress silhouettes. **No caller found in `public/` on this branch.** It may be dead code, although CLAUDE.md still describes it.
- **Request:**
  - `kind` (required).
  - `analysis` (object, required): colour needs `best_colours[0]` and `avoid_colours[0]` with `{name,hex}`; silhouette needs `dress_silhouettes[]` ≤4 with `{name,note}`, plus an optional `dress_colour`.
  - A photo from `data`+`mimeType`, or `photoUrl`, which must start `https://res.cloudinary.com/` and is fetched server-side.
- **Response:** `{jobId, count}`, then poll.
- **External:** `gemini-3.1-flash-image` edits the user's photo. The IDENTITY prefix (2813) says: keep the same person, photorealistic, warm-grey backdrop. Colour prompts ask for a chest-up crew-neck knit in a given colour; silhouette prompts ask for a full-length dress. 50 s race, 3 s stagger.
- **Defects:** `photoUrl` accepts **any** Cloudinary account's asset, not only ours. The `analysis` content is trusted into the prompts.
- **New:** confirm it is still needed. If so, take the colours from the stored DNA and the photo from the user's stored headshot.

### 4.5 Avatar ("Your Model")

The helpers sit at 2872–3061:
- **Catalog:**
  - `AVATAR_SKIN_WORDS[8]` (2882–2885), `AVATAR_HAIR_WORDS[5]` (2886).
  - `AVATAR_FIG_WORDS` and `AVATAR_FIG_WORDS_M`, keyed `hg|pe|re|it|ap|nt` (2889–2904).
  - `AVATAR_NUDGE_WORDS` `ll|lr|fl|fr` (2905).
- **Cell id grammar** (`parseAvatarId`, 2909–2914): `^([wm])-s([0-7])-h([0-4])-(hg|pe|re|it|ap|nt)((?:-(?:ll|lr|fl|fr))*)$`. `w` means woman and `m` means man; `unspecified` rides the woman catalog. The mapping must stay in sync with the client mapper in `stylenotes.html` (MV_SKINS, MV_HAIRS).
- **`avatarDescriptor(id)`** (2915–2926) builds the sentence: "She has <skin> skin, long <hair> hair worn down, and a <figure>, with <nudges>." Men get short hair.
- **Storage:**
  - `avatar_cells` table (`supabase/avatar_render_migration.sql`, `id text pk`, `image_url`, `descriptor`), read and upserted with the **service role** (2950–2981).
  - The storage key is `id@v2` (`AVATAR_CELL_STYLE`, 2947). Bumping the style re-generates every cell.
  - An in-process cache, `avatarCellCache`, sits in front. Concurrent generations of the same cell are de-duplicated through `avatarCellInflight` (2987–2995).
- **Cell generation** (2996–3031):
  - The prompt (3003–3006) is a full-length reference portrait. The base layer is a skin-tone seamless set (tank and shorts for women, tee and shorts for men), barefoot, facing the camera, `FULL_BODY_FRAME` plus `AVATAR_STUDIO`.
  - Model `gemini-3.1-flash-image` with `aspectRatio 4:5`. 2 attempts with an 8 s pause and a 50 s race, then Cloudinary, then the database.
- **`avatarRefForUser(avatarId, userId, gender)`** (3040–3058):
  - Uses the body `avatarId` if it is valid. Otherwise it reads `profiles.avatar_id` by body `userId` with the **service role**.
  - Returns null when the cell's gender prefix does not match the wearer.
  - Otherwise ensures the cell exists and returns base64 of the cell image, fetched only from a `res.cloudinary.com` URL (2930–2938).

#### `POST /api/avatar/cell` (3063–3087)
- **Request:** `avatarId` (must parse, else 400).
- **Response:** `{url}` if the cell exists; otherwise `{jobId}`, and the single-frame job is filled by `avatarCellEnsure`.
- **Business rule:** cells are a **shared catalog** across users. A cell generated for one user pre-fills it for everyone.

#### `POST /api/avatar/render` (3089–3188)
- **Purpose:** the look composer renders the user's model wearing the current rack. The client debounces calls and caches them by render key.
- **Request:** `avatarId` (valid), `pieces: [{name (required), category, color, brand, image_url}]` with **1–12** entries. Fields are capped at 120, 40, 40 and 60.
- **Response:** `{jobId, count:1}`, then poll.
- **External:**
  1. Ensure the cell and fetch it as base64.
  2. Fetch up to **9** garment photos (Cloudinary-only) as inline references. Together with the avatar that stays within the model's 14-reference budget.
  3. Build a text manifest: "IMAGE n: the X — reproduce exactly", or described text for pieces without a photo.
  4. The prompt (3139–3143) says "IMAGE 1 is the model, keep the SAME man or woman". With more than one piece it asks for the complete outfit; with one piece, that piece over the base layer. Plus `FULL_BODY_FRAME` and `AVATAR_STUDIO`.
  5. `gemini-3.1-flash-image` with 4:5, **3 attempts** (pauses of 8 s and 20 s) and a 60 s race each. When the model replies with text and no image, the text is logged as `said`.
- **Defects:** unauthenticated, and any valid `avatarId` works. This is low risk because cells are shared, but it is an image-generation cost with no user binding.
- **New:**
  - Take `avatarId` from the profile and the pieces as wardrobe or proposal ids.
  - Cache renders in a `look_renders` table keyed by `hash(avatar_id, sorted piece ids)`. `looks.render_url` already exists.
  - Keep the shared cell catalog, with the cell style version in the key.

---

## 5. Email system (`notify.js`)

**Construction:** `createNotifier(cfg)` is built at server.js 173–181. Its config:
- `supaUrl`, `serviceKey`
- `resendKey` (`RESEND_API_KEY`)
- `from` (`EMAIL_FROM` || `'Robes <hello@byrobes.com>'`)
- `publicUrl` (`PUBLIC_URL`)
- `secret` (`NOTIFY_SECRET` || `RESEND_API_KEY`)
- `env` (`APP_ENV`)
- `resendUrl` (`RESEND_API_URL` || `https://api.resend.com/emails`)

`on = resendKey && serviceKey && secret` (104). When off, every send is a no-op returning `{ok:false, skipped:'off'}`.

**Transport:** a raw REST `POST resendUrl` with `{from, to:[to], subject, html, text, headers:{'List-Unsubscribe': <url>, 'List-Unsubscribe-Post':'List-Unsubscribe=One-Click'}}` (175–186). The `resend` npm package is listed as optional but unused.

**Idempotency ledger** (`sendMail`, 168–199):
1. INSERT into `notifications {user_id, kind, ref}` with the **service role**. The table has `unique(user_id, kind, ref)` (`supabase/notifications_migration.sql` 28–34).
2. A **409** means the mail was already sent: return `skipped:'sent'`. Any other failure returns `skipped:'ledger'`.
3. Send through Resend. On a transport failure, **DELETE the ledger row** so the next tick retries.
4. On success, fire and forget an `events` insert `{event_type:'email_sent', metadata:{kind, ref}, environment}`.

This design guarantees at-most-once delivery across re-ticks, restarts and two services on one project. There is a tiny window where the ledger row exists, the send fails and the delete also fails; in that case the mail never sends (it fails safe).

**Unsubscribe tokens** (138–149):
- Token format `uid.prefKey.hmac40`, where `hmac40 = HMAC-SHA256(secret, uid + ':' + key)` as hex cut to 40 characters.
- Verified with the regex `^([0-9a-f-]{36})\.(looks_ready|nudges|morning|receipts)\.([0-9a-f]{40})$` and `timingSafeEqual`.
- The pref key for a mail kind comes from `PREF_OF_KIND` (17): `looks_ready→looks_ready`, `morning→morning`, `receipt_held→receipts`, everything else → `nudges`.
- The URL is `${publicUrl}/api/notify/unsub?t=...`.
- Tokens never expire, and one token flips only its own key.

**Templates:** there are no files; everything is inline in notify.js.
- `mailShell({heading, body, images ≤3 http, cta, footer, unsubUrl, preheader, notice})` (68–90): table layout, cream `#FAF8F5` background, a serif heading, an image row, a pill CTA, and the footer with the Stop and Privacy links.
- `mailText` (91–97): the plain-text version.
- `compose(u, kind, m)` (202–209) combines them. Every CTA link gets `?from=email` (`link()`, 210).
- Helpers: `gapName` and `listWords` (53–64), `numWord` (25), `isoWeek` (40–48), `localParts(date, tz)` (30–38, the user's local clock with `Europe/Dublin` as default).

**Email kinds:**

| Kind | Pref key | Trigger (notify.js lines) | Ref (dedupe key) | Subject / CTA |
|---|---|---|---|---|
| `receipt_held` | `receipts` (opt-out: `receipts===false`) | Transactional. Called by `inbox.ingest` after a receipt row is held (`sendReceiptMail`, 226–245). The email comes from `auth/v1/admin/users/:id` (218–225). | inbox row id | "Robes read your {shop} receipt." → `/wardrobe?receipts=1` (up to 3 piece images) |
| `looks_ready` | `looks_ready` (opt-out: `!== false`) | Sequence. The newest `lookbook_items` of type `key-piece` created **in the last 48 h** with ≥3 http `kpData.generatedImages` (322–329) | lookbook item id | "Your three looks are ready." → `/inspiration?open=<id>` |
| `look_waiting` | `nudges` (opt-in: `=== true`) | Sequence. Account age ≥1 day, `avatar_id` column known and null, has ≥1 look, no `model_filed` event (330–335) | latest look id (sent once ever: `!has('look_waiting')`) | "She'd wear it." → `/stylenotes` |
| `borrowing` | `nudges` | Sequence. Age ≥3 days, fewer than 5 photographed wardrobe items, a look with ≥2 `proposals` (336–345) | look id (once ever) | "Robes is borrowing {n} things." → `/lookbook?open=<id>&fill=1` |
| `five` | `nudges` | Sequence. ≥5 photographed pieces, the 5th ≥1 day old, no `robes_build_opened` event (347–352) | literal `'five'` | "Robes can build from yours now." → `/lookbook?new=1&robes=1` |
| `week_empty` | `nudges` | Sequence. Age ≥7 days, has looks, no `planned_days` in the next 7 local days, not sent this ISO week and not within the last 14 days (353–363) | ISO week `YYYY-Www` | "Nothing planned this week." → `/diary` |
| `morning` | `morning` (opt-in: `=== true`) | Morning cue. The user's local hour equals `clamp(prefs.morning_hour ?? 7, 6, 10)` and she has `planned_days` rows for today (370–401). The title and look come from day, look or other rows. A weather line appears **only** if a `daily` source row's lookbook item has `dlData.context` with a temperature or condition. | local date | "{Weekday} · {title}" → `/dashboard?d=<date>` |

**Sequence rule:** one sequence mail per user per local day (`sentToday` looks at SEQ_KINDS in the ledger, 317), with the first match winning in the order `looks_ready > look_waiting > borrowing > five > week_empty`. The morning cue is independent of the sequence.

**Scheduler** (server.js 227–236): when `notifier.on` and `NOTIFY_TICK !== 'off'`, the first tick runs 60 s after boot and then every **10 min** (`setInterval`). A process-local `ticking` flag prevents overlapping ticks.

**Tick data load** (`notifyTick`, 281–408), every query with the service role:
- `profiles` (with `selectDegrade`, which strips a column when a pending migration has not added it yet, 126–136).
- The `auth/v1/admin/users` pages (up to 10 × 1000).
- `notifications` (≤20k), `events` in (model_filed, robes_build_opened), `wardrobe_items`.
- `lookbook_items` key pieces from the last 48 h, and `planned_days` from −1 to +9 days.
- `looks` with `look_pieces(wardrobe_items(image_url))`.

It then loops over the users. The design is O(all users) per tick with hard-coded row limits of 20000 and 5000, which **silently truncate** as the product grows.

**New platform notes:**
- Use React Email templates, one per kind, and keep the same ledger table and 409 semantics.
- Run the tick from a cron (Vercel Cron or Supabase `pg_cron` calling an edge function) with pagination per user cohort, or an event-driven queue: enqueue `looks_ready` when a key piece gets its third frame, and so on.
- Make unsubscribe tokens expire, or fold them into a signed JWT.
- Keep the email lookup in a Supabase view or RPC rather than paging the Admin API.

---

## 6. Receipt inbox and product reader (`inbox.js`)

### 6.1 Config and wiring
`createInbox(cfg)` is built at server.js 213–224. It is dependency-injected so the smoke tests can run without a network:
- `supaUrl`, `serviceKey`, `resendKey`, `resendApiUrl`, `domain` (`INBOX_DOMAIN`, default `in.byrobes.com`).
- `generate`: `inboxGenerate` (server.js 193–200), `gemini-2.5-flash` with a JSON schema, temperature 0, thinking 0, default 2000 tokens.
- `generateVision`: `inboxGenerateVision` (204–212), the same with an inline image, 700 tokens, and a **30 s race**.
- `hostImage = cloudinaryUploadFile`, `notifyReceipt = notifier.sendReceiptMail`, `env`, `allowPrivate` (`INBOX_ALLOW_PRIVATE==='1'`, for smoke tests only).

`on = serviceKey && generate` (302).

Exports: `{on, domain, ingest, readReceipt, readProductPage, normalizeInbound, htmlToText, verifySvix, safeUrl}`.

### 6.2 Receipt ingest (`ingest`, 454–520)
1. **Normalise** the payload (`normalizeInbound`, 157–170) into `{provider, emailId, from, to[], subject, html, text}`. Four shapes are recognised:
   - Resend `{type:'email.received', data}`, whose body usually has to be fetched.
   - Postmark (`HtmlBody`, `TextBody`, `FromFull`).
   - Mailgun (`body-html`, `recipient`).
   - Generic JSON.
2. **Route to a user:** the first `to`/`cc` address whose domain equals `INBOX_DOMAIN` gives its local part (`localPartOf`, 173–178). Then `profiles?inbox_address=eq.<local>` with the service role. `profiles.inbox_address` is unique and minted by the client (`supabase/wardrobe_inbox_migration.sql` 42–43).
3. **Fetch the body** for Resend if it is missing (`fetchResendBody`, 304–319). It tries `/emails/receiving/:id` and then `/emails/:id`. The code itself notes this is **unverified** against live Resend.
4. **HTML to text** (`htmlToText`, 128–149, max 60k characters):
   - Drops comments, script, style, head and svg.
   - Turns `<img>` into `[image: url | alt]`, but drops tracking pixels, icons, logos and social or payment badges (`isPixel`, 123–127: width or height ≤2, or a URL pattern match).
   - Turns block tags into newlines and decodes entities.
5. **Text read** (`readReceipt`, 397–426): one `generate` call with `RECEIPT_SCHEMA` and **8000** tokens.
   - The prompt asks whether this is an order confirmation, shipping notice or receipt for fashion. It lists every wearable piece and skips gift wrap, shipping, discounts and beauty; `returned` is set only when the email says so.
   - **GROUNDING** rules: `label` must be the printed name or the image alt text; when there is no name, use the reference code with `category:'Other'`. `color` only if printed. `image_url` must be the image in the piece's own row. Duplicate rows collapse.
   - Items are normalised (quantity 1–9), items with neither a label nor an image are filtered out, and `dedupeItems` (386–395) keys on `image_url|label + size + price` and sums quantities.
6. **Vision pass** (`visionPass`, 433–449):
   - For up to **24** items with an `image_url`, with concurrency **3** (`mapLimit`, 375–381):
     - `fetchImageBytes`: SSRF-guarded, 10 s, image mime types only, ≤8 MB.
     - `generateVision` with `VISION_SCHEMA`.
     - The prompt (355–367) says the photograph is the truth. It supplies the text row as context and asks for a stylist-style label that never contains a size, price or reference code.
   - The photo decides the label, category, taxonomy and colour. The text keeps the brand (if printed), price, currency, size, quantity and returned flag. Such items get `read_from:'photo'`.
   - Items still lacking a label afterwards are dropped.
7. **Host images now** on Cloudinary, because retailer CDN links go stale (477–483).
8. **Insert** `wardrobe_inbox {user_id, source:'receipt', retailer (read value, else the sender's domain, else 'A receipt'), order_ref, subject, from_email, provider_id, items (jsonb), status:'held'}` with the service role, returning the representation. RLS lets the user read, update and delete her own rows; there is **no insert policy**, so only the server writes (`wardrobe_inbox_migration.sql` 45–73).
9. **Admin record:** fire and forget an `events` row `{event_type:'receipt_received', metadata:{retailer, items, seen, inbox_id, order_ref}}` (503–506).
10. **Confirmation mail:** `notifyReceipt(...)` sends `receipt_held` (§5). It is awaited for the log, but never fails the webhook.
11. **Return** `{ok:true, reason:'held', items, seen, id, user_id, mailed}`.

Other outcomes: `off`, `no_robes_address`, `lookup_failed`, `unknown_address`, `empty`, `read_failed`, `not_a_receipt`, `insert_failed`.

**Holding and review flow:** the server only ever writes `status:'held'`. The **client** (dashboard, `/wardrobe?receipts=1`) reads held rows through RLS. The user unticks returned pieces, and the client files the rest into `wardrobe_items` or `wishlist_items`, then updates the row to `status:'filed'` (with `filed_ids`, `filed_to`, `decided_at`) or to `'dismissed'`. The check constraint is `held|filed|dismissed`.

### 6.3 Product-page reader (`readProductPage`, 523–575)
1. `safeHttpUrl(input)`; `bad_url` if it fails.
2. Fetch with a browser-like User-Agent ending `RobesBot/1.0`, 12 s abort, `redirect:'follow'`. A non-2xx status gives `unreachable`, a non-HTML content type gives `not_a_page`, and the body is cut at 2 MB.
3. `productHints(html, url)` (223–241) reads JSON-LD `Product` (walking `@graph` and `mainEntity`), OpenGraph and product meta tags: name, brand, description, price, currency, colour, image (made absolute) and site.
4. `htmlToText` at 12k characters.
5. One `generate` call with `PRODUCT_SCHEMA` and 900 tokens. The prompt (542–560) asks for the ONE piece on the page, `no_item_detected` for listings, home pages and other non-product pages, and tells the model that structured data outranks visible text.
6. Structured price and currency fill blanks, and the **structured image always wins**.
7. `normalisePiece(out, {kind:'url', url, site})`, then host the image on Cloudinary.

**Shared piece normaliser** (`normalisePiece`, 260–287):
- Taxonomy is validated with `resolveTaxonomy`.
- Colour must be in `COLOURS` (21).
- Price: comma thousands are handled and the value is rounded to 2 decimals.
- Currency is uppercased to 3 letters, size is capped at 40, and `image_url` must be http(s) and ≤1000 characters.
- Output has the same `item_dna` shape as analyse, plus an optional `source`.

**Schemas and prompt text:**
- `PIECE_PROPS` (28–41): label, category (enum `LEGACY_CATEGORIES`), category_l2, category_l3, color, editorial_color_name, brand, price, currency, size, image_url, ai_generated_notes.
- `PRODUCT_SCHEMA` (42–46): `no_item_detected` plus the piece props, all required.
- `RECEIPT_SCHEMA` (47–63): `is_receipt`, `retailer`, `order_ref`, `items[]` of the piece props plus `quantity:int` and `returned:bool`.
- `VISION_SCHEMA` (72–86): `no_item_detected`, label, category, l2, l3, color, editorial_color_name, brand, ai_generated_notes.
- `PIECE_RULES` (88–100): the shared field instructions, including the full taxonomy block.

### 6.4 SSRF guard and webhook auth
**`safeHttpUrl(u, allowPrivate)`** (244–255) requires `http:` or `https:`. It rejects:
- dotless hosts, `localhost`, and `*.local`, `*.internal`, `*.localhost`;
- literal `127.`, `10.`, `0.`, `169.254.`, `192.168.`, `172.16–31.`;
- `[::1]` and `fc`/`fd` ULA prefixes.

It strips the hash. **Gaps:**
- (a) It is lexical only, with no DNS resolution, so a public name that resolves to 127.0.0.1 or 169.254.169.254 passes.
- (b) `redirect:'follow'` in both fetches (336, 533) lets a public URL 302 to an internal address.
- (c) IPv4-mapped IPv6 (`[::ffff:7f00:1]`), `[::]` and CGNAT `100.64/10` are not blocked.

**`verifySvix`** (181–196):
- Headers `svix-id`, `svix-timestamp` and `svix-signature`, with a ±5 min tolerance.
- The key is the base64 part of `whsec_...`.
- The HMAC-SHA256 is computed over `id.ts.body` and compared in constant time against each `v1,<sig>` entry.
- It is correct. Note it uses `req.rawBody`, which is captured globally for every JSON request (server.js 38).

**New platform notes:**
- Use a Next.js route handler for the webhook that verifies Svix and enqueues the work.
- Build the SSRF-safe fetcher with DNS pre-resolution (`dns.lookup` with all addresses checked against private ranges), `redirect:'manual'` with a per-hop re-check, a response-size cap and a content-type check.
- Consider Resend's inbound parsing (or Postmark) as the single provider and drop the four-way normaliser.
- Keep the text-then-vision design: it is what fixed the "pink tracksuit filed as jeans" bug.

---

## 7. Style DNA engine (`style_dna.js`)

The module has no I/O. Gemini extracts primitives and this module owns every palette and rule the user sees.

**Catalogs:**
- `METAL_GRADIENTS` (5–16): 10 metals, each with 3 hex stops.
- `SEASONS` (23–264), one entry per season. Each holds:
  - `family` (warm or cool), `voice` (stylist paragraph), `summary`;
  - `palette` (3 rows × 6 hex, the "eighteen shade matrix");
  - `neutrals[6]`, `stars[4]`, `accents[4]`, `avoid[7]`, each `{name,hex}`;
  - `avoid_note`, `metals {finish, approved[], prohibited[]}`, `metals_note`;
  - `proof_best`, `proof_less`, `seen_on_you[{lifts, flattens}]`.
- `UNDERTONE_COPY`, `UNDERTONE_NOTE` (267–279), `CONTRAST_COPY` (281–286).
- `BODIES` (289–390), one entry per archetype (Hourglass, Pear, Rectangle, Inverted Triangle, Apple): `label`, `profile`, `summary`, `traits[4]`, `dresses[4 {name, note}]`, `necklines[4]`, `tips[4]`, `maxims[4]`.

**Public functions:**
- `classifySeason({undertone, contrast, chroma, lightness})` (394–421): a deterministic decision tree. Warm-family branches go by contrast (High → Clear Spring or Dark Autumn by chroma; Medium → Warm Spring or True Autumn; Low → Light Spring if lightness is High, else Soft Autumn). Cool branches cover Winter, True Summer, Light Summer and Soft Summer.
- `classifyBody({shoulder_waist, hip_waist, shoulder_hip, loose_clothing})` (423–439): ratio thresholds (Hourglass needs sw≥1.2, hw≥1.2 and sh in 0.9–1.1, among others), with nearest-neighbour fallbacks. Returns `{body_type, fallback_applied}`.
- `buildColorHarmony(x)` (446–511):
  - Input: the colour extraction.
  - The undertone defaults to Warm, or Neutral-Warm when `low_confidence`.
  - The **holistic `x.season` wins** if it is valid, else the primitive season. The undertone is then coerced to be family-consistent.
  - Returns `{render, dna}`:
    - `render`: `{season, undertone (display), contrast (display), summary, undertone_note, palette (18 flat), neutrals, best_colours (stars + accents), avoid_colours, avoid_note, proof_best, proof_less, seen_on_you, metals [{name, hexes}], metals_note}`.
    - `dna`: `{archetype_name, verified_undertone, calculated_contrast, refinement_needed, classification{source, primitive_season, agreement, reasoning}, extracted_values{skin, hair, eye hex}, eighteen_shade_matrix{row_1_warm_mutes, row_2_earth_greens, row_3_deep_velvets}, functional_sub_palettes{best_neutrals, primary_stars, secondary_accents, avoid_list}, metals_rules{finish_type, approved_metals, prohibited_metals}, stylist_voice}`.
- `buildSilhouette(x)` (513–553): the holistic `body_shape` wins. Returns:
  - `render`: `{body_type, summary, traits, dress_silhouettes, neckline_recommendations, styling_tips}`.
  - `dna`: `{body_type, fallback_applied, classification{source, ratio_body_type, agreement, reasoning}, geometric_ratios{3, rounded to 2dp}, visual_traits, architectural_rules{dress_silhouettes, necklines, styling_maxims}}`.
- `styleDnaPromptBlock(styleDna, wardrobeCount=0, styleIcons=[])` (557–602): the text injected into **every** stylist prompt.
  - Input: `styleDna = {color_harmony?, silhouette_proportions?, user_overrides?{loved_colors[], rejected_colors[], measurements{}}}` as stored in `profiles.style_dna`.
  - Output lines:
    - STYLE ICONS (≤12) with the "north star, never contradict the colour or silhouette rules" instruction.
    - STYLE DNA: colour archetype, neutrals, stars and accents, the never-style-in avoid list, metals.
    - Body architecture, silhouettes, necklines and maxims.
    - User overrides: loved colours override the avoid list, rejected colours are never used, measurements are trusted over the photo.
    - A **SYSTEM DIRECTIVE** by wardrobe count: ≥15 is a mature closet (mix-and-match modularity); 1–14 is "building (n/15)" (weave owned pieces in by exact label); 0 is fashion-house execution.
  - Returns `''` when there are no icons and no DNA.
  - **Crash risk:** `.join` on fields assumed to be arrays (575–583) when the client posts a malformed `styleDna`.

**New platform notes:**
- Port to TS with typed `SeasonName` and `BodyShape` unions and zod-validate `profiles.style_dna` on write.
- Call `styleDnaPromptBlock` only with DNA loaded from the database.
- Unit-test both classifiers against a fixture table.

---

## 8. Wardrobe taxonomy (`wardrobe_taxonomy.js`)

- **`TAXONOMY_GROUPS`** (23–102): an array of `{sheet_l1, l2, l1, l3[]}`.
  - `sheet_l1` is one of 14 sheet categories (Tops, Knitwear, Bottoms, Dresses & jumpsuits, Outerwear, Tailoring & suiting, Shoes, Bags, Accessories, Jewellery, Activewear, Loungewear & sleepwear, Underwear & intimates, Swim & beach).
  - `l2` is one of about 55 subcategories, unique tree-wide, although some L2s are **split across groups** with different legacy `l1` (Cardigans, Knit separates & sets, Suit separates, Active tops, Active layers & sets, Loungewear).
  - `l1` is the legacy 9-value category the node folds into.
  - `l3` holds the item types, about 350 in total. A few L3 names repeat across L2s ("Leggings", "Cycling shorts", "Knit co-ord set", "Knit dress").
- `L2_INDEX` (Map l2 → {sheet_l1, l1 of the first group}) and a private `L3_INDEX` (l2 → Map l3 → l1), built at 105–114.
- `LEGACY_CATEGORIES` (116): Tops, Bottoms, Dresses, Outerwear, Shoes, Bags, Accessories, Swimwear, Other.
- `taxonomyRows()` (119–123): flat seed rows for the SQL migration (`scripts/gen_taxonomy_migration.mjs`).
- `resolveTaxonomy(l2, l3)` (130–144): case-insensitive match. An unknown L2 returns `null`. An unknown L3 under a known L2 returns the L2 alone with that L2's legacy l1. Otherwise it returns `{category, category_l2, category_l3}`, where `category` is the L3's own legacy l1.
- `taxonomyPromptBlock()` (148–152): one line per group, `"<l1> › <l2>: a | b | c"`.
- ADR-002 pre-fill:
  - `SEASON_BANDS` (169), and `WEAR_SEEDS` (174–182, 7 slugs: everyday, work, evening, occasion, travel, active, lounge).
  - `CATEGORY_DEFAULTS` by sheet_l1 with L2 overrides (188–210): Occasion & evening → evening + occasion; Blazers → work + everyday, year-round; Knitwear and Outerwear → autumn_winter; Swim → travel, spring_summer.
  - `LEGACY_DEFAULTS` (215–219).
  - `defaultTagsFor(sheetL1, l2)` (223–232).
  - `tagDefaultRows()` (237–251) is the seed for the `wardrobe_tag_defaults` table that the migration-18 trigger uses. **The database trigger, not the server, applies the defaults.**

**New:** keep it as a shared TS module. Generate the SQL seed from it in CI. Consider making taxonomy tables the source of truth with a generated TS mirror.

---

## 9. Consolidated security and robustness defects

| # | Defect | Where |
|---|---|---|
| 1 | **No authentication on any API route.** All AI and image endpoints can be called anonymously, a direct cost exposure. | all of §4 |
| 2 | **Client-supplied `userId` trusted** for generation_log attribution and for the service-role read of `profiles.avatar_id` | 68–79, 3040–3052 |
| 3 | **Client-supplied `styleDna`, `wardrobeItems`, `capsule`, `locked`, `importedLooks` trusted.** This allows prompt injection through labels and prevents the server from knowing what the user really owns. | 536–548, 912–945, 1648–1731, 2077–2093, 3192–3207 |
| 4 | **Process-crash vectors** (async handler throws outside try, Express 4, no unhandledRejection handler): `handle.replace` | 412 |
|   | `photo.match` on a non-string; `i.label` on a null wardrobe item; `styleDnaPromptBlock` `.join` on non-arrays | 598, 540, 536 |
|   | daily closet map on null | 936 |
|   | travel `it.id` on null | 1665 |
|   | alternates, lookbuild/note, travel/looks DNA block outside try | 1247, 1316, 2088 |
|   | moodboard `prompt?.trim`, `wardrobeItems.length/.map` | 3194–3198 |
|   | `/api/style` background IIFE has no `.catch` (`ways.map` or `w.title` when the model output is malformed) | 656–728 |
| 5 | **Airtable formula injection** via `:id` | 2206–2207 |
| 6 | **SSRF guard is lexical only.** Redirects are followed and there is no DNS check. | inbox.js 244–255, 336, 533 |
| 7 | **Open Cloudinary proxy:** `/api/wardrobe/upload` and `/api/look` have no auth and no limit | 3375–3387, 2170–2181 |
| 8 | **Rate limiter:** one counter per IP shared across routes; no `trust proxy`; in-memory | 436–458 |
| 9 | **No rate limit** on `/api/wardrobe/analyse` (flash vision), `/api/stylenotes/analyse` (pro vision), feedback, instagram, waitlist, look | 2489, 2703, 395–434, 2159 |
| 10 | `/api/instagram` lets anyone overwrite any contact's handle by email | 409–418 |
| 11 | Webhook secret compared with `===`; secret accepted in the query string | 345–346 |
| 12 | Receipt webhook not idempotent on `provider_id` | inbox.js 484–496 |
| 13 | Unsubscribe via GET mutates state (link scanners) | 384 |
| 14 | `/board` template `.replace` with a string interprets `$` patterns | 2384 |
| 15 | Moodboard: images from model-authored prompts; "One woman" hard-coded for hero frames; empty-category wardrobe matcher bug; no schema | 3330–3350, 3312, 3254–3296 |
| 16 | `/api/stylenotes/tryon` and avatar garment refs accept **any** `res.cloudinary.com` URL (other accounts) | 2800, 2930–2938 |
| 17 | In-memory state (`imageJobs`, `lookStore`, `rateLimitMap`, `avatarCellCache`, notifier `ticking`) breaks on restart and multi-instance | 19, 28, 437, 2940, notify.js 280 |
| 18 | Notify tick loads all users each run, with hard row caps (20000, 5000) that silently truncate | notify.js 248–304 |
| 19 | generation_log stores full prompts with PII and has no retention | 99–158 |
| 20 | Unused or dead code: `WEEK_SUMMARY_RULE` (852); `/api/stylenotes/tryon` has no client caller; `/api/waitlist` has no beta client caller; the `resend` optional dependency is unused | |

---

## 10. Environment variables

| Variable | Read at | Purpose / default |
|---|---|---|
| `PORT` | 16 | HTTP port (Railway sets it); default 3000 |
| `GEMINI_API_KEY` | 47, 218–219, 329 | Gemini client. Also gates the inbox `generate` and `generateVision` functions. |
| `SUPABASE_URL` | 63, 2308 | default `https://ayowpaknssulsqqvwpqx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | 64, 333 | generation_log, avatar cells, the profiles avatar lookup, notifier, inbox. Every privileged write goes through it. |
| `SUPABASE_ANON_KEY` | 332, 2309 | `/board` public read (falls back to the hardcoded publishable key); health flag |
| `PUBLIC_URL` | 65, 177, 2157, 2399 | `APP_ENV` detection (`www.byrobes.com` → production, else beta), email links, look share URL, board canonical URL |
| `RESEND_API_KEY` | 175, 178, 215 | Resend send plus inbound body fetch. It is also the **fallback HMAC secret** for unsubscribe tokens. |
| `RESEND_API_URL` | 180, 216 | override the Resend endpoint (tests). The inbox strips `/emails`. |
| `EMAIL_FROM` | 176 | default `Robes <hello@byrobes.com>` |
| `NOTIFY_SECRET` | 178 | HMAC key for unsubscribe tokens |
| `NOTIFY_TICK` | 227 | `off` disables the scheduler on this service |
| `NOTIFY_DEBUG` | 388 | `1` mounts `POST /api/notify/tick` |
| `INBOX_DOMAIN` | 190 | default `in.byrobes.com` |
| `INBOX_WEBHOOK_SECRET` | 191 | shared secret for `?key=` or `x-inbox-key` |
| `RESEND_WEBHOOK_SECRET` | 192 | Svix `whsec_...` for Resend inbound |
| `INBOX_ALLOW_PRIVATE` | 223 | `1` disables the SSRF private-host block (smoke tests only) |
| `AIRTABLE_TOKEN`, `AIRTABLE_BASE_ID` | 239–240, 330 | Contacts and Feedback. The token prefix is **logged at boot** (241). |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | 274–276, 331 | signed uploads |

`style_dna.js` and `wardrobe_taxonomy.js` read no environment variables. `inbox.js` and `notify.js` receive their config through injection.

---

## 11. Prompt and schema constants

| Constant / prompt | File:lines | Used by | Notes |
|---|---|---|---|
| `FALLBACK_PIECE` | server 461 | style | Balmain waistcoat |
| `FULL_BODY_FRAME` | 466 | all on-model images | |
| `styleIconsImageLine()` | 468–475 | style, daily, travel images | ≤5 icons |
| `normGender`, `genderDirective`, `wearerNoun`, `wearerWears` | 485–497 | all stylists | |
| `STYLE_SCHEMA` | 499–521 | style | fallback, wearer, ways[] |
| style inline prompts (formula, brief, fallback, wearer, system, user, image) | 550–592, 681 | style | |
| `DAILY_STEP_TITLES` | 750 | daily | Anchor, Canvas, Texture, Accents |
| `FORMULA_ROLES` (= `TRAVEL_ROLES`) | 755, 1484 | travel | Accents → Exclamation Point |
| `LOOK_TAG_CLIMATES`, `LOOK_TAG_CLIMATE_LEGACY` | 768, 772–775 | normLookTags | |
| `LOOK_TAG_WEAR`, `LOOK_TAG_WEAR_LEGACY` | 776, 778–782 | normLookTags | |
| `LOOK_TAGS_SCHEMA` | 783–798 | daily, lookbuild/note, travel, travel/looks | climate, wear_for[], vibe[]; never put `''` in an enum (outage note) |
| `LOOK_TAG_VIBE_SEEDS`, `vibeVocabLine()` | 804–813 | | 10 seed vibes |
| `LOOK_TAGS_RULE` | 814–815 | | tag-filling instructions |
| `normLookTags()` | 816–837 | | |
| `BANNED_CONSTRUCTIONS_RULE` | 846 | daily, alternates, note, travel, travel/looks | copy style bans |
| `ROW_NOTE_RULE` | 848 | per-item `how`/`note` | 6–12 words, verb-led |
| `PANEL_NOTE_RULE` | 850 | look-level note | ≤30 words |
| `WEEK_SUMMARY_RULE` | 852 | **unused** | |
| `DAILY_SCHEMA` | 854–906 | daily | |
| daily system, user and image prompts | 951–984, 1083–1085 | daily | |
| `deEscUnicode`, `deEscDeep` | 1143–1155 | all | |
| `ALTERNATES_SCHEMA` + prompt | 1157–1176, 1249–1255 | alternates | |
| lookbuild still-life prompt | 1203 | lookbuild/images | |
| `LOOKBUILD_NOTE_SCHEMA` + prompt | 1292–1302, 1318–1328 | lookbuild/note | |
| `INTENT_SCHEMA` + prompt | 1363–1382, 1389–1401 | intent | |
| `SEASON_BAND_LABELS`, `heroMark`, `heroDirective` | 1453–1467 | daily, travel | |
| `TRAVEL_TIERS` | 1483 | travel | Foundations & Tailoring / Statement & Texture / Footwear & Hardware |
| `TRAVEL_SCHEMA` | 1486–1553 | travel | |
| `WX_CODE_TEXT`, `wxCondition` | 1555–1564 | travel weather | |
| `travelSystem()`, user text, corrective note, image prompts | 1768–1820, 1903–1908, 1981–1983 | travel | |
| `TRAVEL_MORE_SCHEMA` + prompt | 2029–2074, 2098–2115 | travel/looks | |
| `ANALYSE_SCHEMA` + prompt | 2448–2475, 2500–2523 | wardrobe/analyse | |
| `SEASON_ENUM`, `BODY_ENUM` | 2582–2583 | stylenotes | |
| `COLOUR_EXTRACT_SCHEMA`, `SIL_EXTRACT_SCHEMA` | 2587–2628 | stylenotes/analyse | propertyOrdering: evidence first |
| `COLOUR_EXTRACT_PROMPT`, `SIL_EXTRACT_PROMPT` | 2630–2701 | stylenotes/analyse | |
| tryon `IDENTITY` + prompts | 2813–2826 | stylenotes/tryon | |
| `AVATAR_*_WORDS`, `parseAvatarId`, `avatarDescriptor`, `AVATAR_STUDIO`, `AVATAR_CELL_STYLE` | 2882–2947 | avatar | |
| avatar cell prompt | 3003–3006 | avatar cell | |
| `AVATAR_IDENTITY` | 3061 | style, daily images | |
| avatar render prompt | 3139–3143 | avatar/render | |
| moodboard system and user prompt (inline JSON shape, **no schema**) + image prefix | 3200–3247, 3350 | moodboard | |
| `PIECE_PROPS`, `PRODUCT_SCHEMA`, `RECEIPT_SCHEMA`, `VISION_SCHEMA` | inbox 28–86 | inbox, read-url | |
| `PIECE_RULES` | inbox 88–100 | inbox prompts | |
| vision, receipt and product prompts | inbox 355–367, 398–416, 542–560 | inbox | |
| `SEASONS`, `BODIES`, `METAL_GRADIENTS`, `*_COPY` | style_dna 5–390 | stylenotes | |
| `styleDnaPromptBlock` | style_dna 557–602 | every stylist | |
| `taxonomyPromptBlock` | taxonomy 148–152 | analyse, inbox | |

---

## 12. Cross-cutting new-platform recommendations

1. **The server owns the context.** Every generation route takes only the user's *intent* (prompt, dates, plan labels, ids). The server loads `wardrobe_items`, `profiles.style_dna`, `style_icons`, `gender_identity`, `avatar_id`, the vibe vocabulary and saved trips or looks from Postgres by the **session user id**. This removes defects 2, 3 and most of 4, and makes the owned-vs-new metrics trustworthy.
2. **One `generate()` service layer:** model choice, retry and backoff policy, timeouts, zod-validated structured output (derive the Gemini `responseSchema` from zod), `deEscDeep`, and logging to `generation_log` with `feature` and `genId`.
3. **Durable jobs** for anything with images, and for travel text: a `generation_jobs` table plus a worker. The client subscribes via Realtime or polls an authorised endpoint.
4. **Server-built image prompts:** the model returns structured image intents, and the server composes the prompt with gender, avatar, `FULL_BODY_FRAME` and style icons.
5. **Uploads:** signed direct uploads, and store Cloudinary public ids rather than only URLs.
6. **Retire Airtable** for beta flows. `/api/look` and the Airtable fallback exist only for www.
7. **Validation everywhere:** zod on every body, with caps matching today's slices (60 wardrobe items, 8 locked, 10 plans, 24 capsule items, and so on).
8. **Rate limits** per user and route, with daily quotas on image frames.

---

## 13. Porting checklist

### Platform and infrastructure
- [ ] Next.js route handlers or server actions with Supabase session auth on every non-public route
- [ ] zod request schemas mirroring the legacy caps (wardrobe ≤60, locked ≤8, plans ≤10×60, capsule ≤24, pieces ≤12, and the rest)
- [ ] `generate()` service: flash text JSON (schema, thinking 0, maxOutputTokens per feature), retry with 800 ms × 2^i backoff ×3, per-call timeouts, `deEscDeep`
- [ ] Image service: `gemini-3.1-flash-image`, sequential with a 3 s stagger, timeout race, retry policy per feature, Cloudinary upload with `f_auto,q_auto`
- [ ] Durable image and generation jobs with an authorised status read (replacing `imageJobs` and `GET /api/images/:jobId`)
- [ ] generation_log writer (endpoint, model, latency, tokens, status, prompt, response, detail{gen_id, user_prompt, input_images}), environment tag, composition rows (owned_count, item_count)
- [ ] Per-user and per-route rate limiter plus daily generation quotas
- [ ] Health endpoint (liveness public, config detail admin-only)
- [ ] Environment variables from §10 ported, with no secret fallbacks (the unsubscribe HMAC must not reuse the Resend key)

### Wardrobe
- [ ] Taxonomy module (groups, `resolveTaxonomy`, prompt block, tag defaults, wear seeds) plus SQL seed generation
- [ ] Photo analyse → piece (ANALYSE_SCHEMA, taxonomy-validated category, formality, price, currency and size only when printed, `item_dna` shape, `analysisFailed` contract)
- [ ] Signed image upload (replacing `/api/wardrobe/upload`)
- [ ] Product-page reader (JSON-LD, OG hints, PRODUCT_SCHEMA, structured data wins, image hosted)
- [ ] SSRF-safe fetcher (DNS check, manual redirects, size and type caps)
- [ ] Receipt inbox webhook (Svix verify, fast acknowledgement, idempotent on provider_id)
- [ ] Receipt processing job (normalise payload, route by `inbox_address`, html→text, RECEIPT_SCHEMA grounding read, dedupe, vision pass ×3 concurrency ≤24, host images, insert `wardrobe_inbox` held, `receipt_received` event, confirmation mail)
- [ ] Held-receipt review flow (held → filed/dismissed, filed_ids, filed_to)
- [ ] Hero rack and season band support in prompts (`heroMark`, `heroDirective`)

### Styling generators
- [ ] Key piece three ways (STYLE_SCHEMA, fallback-piece rule, wearer rule, closet directive at 15, four-tier formula, 3 on-model frames with avatar)
- [ ] Daily look (DAILY_SCHEMA, Context-to-Core framework, EMPTY/GROWING/COMPLETE at 15, locked pieces, alternates ×2, `wardrobe_match` resolution, `transition_tip`, anchor on-model plus still-lifes, `noImages` mode, weather context)
- [ ] On-demand alternates (ALTERNATES_SCHEMA, excludes the original and the rest of the look)
- [ ] Look-builder note (LOOKBUILD_NOTE_SCHEMA, note, palette hex validation, look tags)
- [ ] Look-builder proposal still-lifes (≤4)
- [ ] Look tags normaliser (climate bands plus legacy map, wear_for seeds plus legacy map, open vibe ≤4, vibe vocabulary line)
- [ ] Copy rules (banned constructions, row note, panel note) as shared prompt fragments
- [ ] Intent classifier (INTENT_SCHEMA, temperature 0, 5 s timeout, never invents a destination or dates, resolves against the user's local date, confidence threshold 0.6 on the client)
- [ ] Moodboard with a proper schema, 8 pieces, taxonomy-based wardrobe matching, server-built image prompts (3 hero, 2 flat-lay, 2 atmosphere), gender-correct

### Travel
- [ ] Trip weather helper (Open-Meteo geocode; forecast within −1…16 days, else last-year archive; fall back to the other source; cached)
- [ ] Travel edit generator (TRAVEL_SCHEMA, the 4 pillars, capMax and suggest maths, looksTarget rules, plans vs covered plans vs imported looks, shortlist keep-all, Worth Adding ≤3 plus moodboard picks with a bridge clause, left_behind deprecated)
- [ ] 1:3 validator plus a single corrective regeneration (keep only if strictly better)
- [ ] Travel images (hero plus stills for unphotographed capsule items, ≤8 frames)
- [ ] Style more looks from a capsule (TRAVEL_MORE_SCHEMA, re-mix first, at most one gap piece, drop an unused gap piece)

### Style Notes and Style DNA
- [ ] Colour analysis (COLOUR_EXTRACT_SCHEMA and prompt, pro→flash→flash-no-schema chain, `fast` flag order, per-model timeouts, rejection flags)
- [ ] Silhouette analysis (SIL_EXTRACT_SCHEMA and prompt, pose correction)
- [ ] `style_dna` module port: SEASONS, BODIES, METAL_GRADIENTS, the copy, `classifySeason`, `classifyBody`, `buildColorHarmony`, `buildSilhouette` (holistic wins, primitive recorded)
- [ ] Server-side persistence of `profiles.style_dna` (color_harmony, silhouette_proportions, user_overrides)
- [ ] `styleDnaPromptBlock` fed only from DB data (icons, DNA, overrides, wardrobe-count directive)
- [ ] Try-on imagery (proof pair and dress silhouettes): decide to keep or drop, since no current caller exists

### Avatar
- [ ] Avatar id grammar and descriptor catalog (woman and man), kept in sync with the client mapper
- [ ] Shared `avatar_cells` catalog with a style-versioned key, lazy generation, in-flight de-duplication, 4:5, 2 attempts
- [ ] Avatar-conditioned look frames (`AVATAR_IDENTITY`, gender-prefix gate) in style and daily (and decide on travel and moodboard)
- [ ] Look render on the user's model (≤9 garment photo refs plus text manifest, 3 attempts with 8 s and 20 s backoff, 60 s timeout, cached by avatar plus piece set)

### Sharing
- [ ] Public board page `/board/[shareId]` (anon plus RLS `is_public`, whitelist payload per type, OG and Twitter metadata, 404 noindex)
- [ ] Decide the fate of the legacy `/look/:id` share, lookStore and Airtable fallback (probably retire)

### Email and notifications
- [ ] Resend transport with List-Unsubscribe and One-Click headers
- [ ] `notifications` ledger (unique user_id, kind, ref; insert-before-send; 409 means skip; delete on transport failure) plus `email_sent` event
- [ ] Unsubscribe tokens (`uid.key.hmac`) with GET confirm and POST one-click; pref keys `looks_ready`, `nudges`, `morning`, `receipts`
- [ ] Email templates: receipt_held, looks_ready, look_waiting, borrowing, five, week_empty, morning (shell plus plain text, `?from=email` links)
- [ ] Scheduler (every 10 min, one sequence mail per local day, first match wins, morning at the user's hour 6–10 in her timezone, weather line only from a filed forecast), paginated and without row-cap truncation
- [ ] Receipt confirmation mail triggered from inbox processing (respects `receipts:false`)

### Marketing and legacy
- [ ] Waitlist capture (move from Airtable Contacts to Postgres or a Resend audience; rate limit plus bot check)
- [ ] Instagram handle, as an authenticated profile field
- [ ] Feedback and ratings into the Supabase `feedback` table (retire Airtable Feedback)
- [ ] Static and app page routes plus legacy redirects (`/calendar`→`/diary`, `/looks`→lookbook), admin page gated server-side
