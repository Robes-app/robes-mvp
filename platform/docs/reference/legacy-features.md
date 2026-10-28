# Robes legacy frontend: the reference for the rebuild

**Status:** reference only (read-only survey). Captured from branch `platform` at commit `2aef362` (2026-09-24). Nothing in the legacy tree was changed.
**Purpose:** this is the inventory the Next.js (web) and Expo React Native (mobile) rebuild must reach parity with. Work through it screen by screen. §8 is the checklist that signs off parity.

**Abbreviations used throughout**
- **DP**: `public/js/dashboard-personalize.js`. It is 27,606 lines: one closure, `window.__robes_personalize`, booted from `public/dashboard.html:2667`.
- **CL**: `CLAUDE.md`, the de facto product spec. Lines 1–938 are dated deltas, newest first. Lines 939–1644 are the reference. Where CL and the code disagree, **the code wins**, and the disagreements are flagged inline.
- **server**: `server.js` (3,392 lines).
- **dash.html**: `public/dashboard.html`.
- Every line number refers to the file named alongside it at the commit above.

---

## 0. How the legacy app is put together (read this before the catalogue)

### Pages
Each page is a separate HTML document with no build step. Every one loads `/js/posthog.js` except `admin.html` and `specimen.html`.

| Page | Contents |
|---|---|
| `dashboard.html` | **The whole signed-in app** (2,679 lines): the markup for every overlay, plus the inline boot at L2577–2679. |
| `onboarding.html` | Onboarding (1,359 lines). |
| `stylenotes.html` | Your model, and Taste & budget (1,871 lines). |
| `signup.html`, `reset.html` | Auth. |
| `admin.html` | Internal admin panel. |
| `board.html` | Server-templated public share page. |
| `look.html` | Old production share page. |
| `index.html` + `js/app.js` | Marketing lander. |
| `privacy.html`, `terms.html` | Legal. |
| `specimen.html` | Type specimen (internal). |

### Dashboard boot (dash.html:2577–2679)
1. It loads supabase-js v2 UMD from jsDelivr and creates a client with the hard-coded publishable key.
2. It resolves the session through `onAuthStateChange` + `getSession`, with a 5s timeout. The listener stays subscribed so `window.__robes_session` follows token refreshes.
3. If there is no session, it goes to `/signup.html?mode=signin`.
4. It selects `profiles`, using a strip-and-retry ladder across missing migration columns.
5. It identifies the user in PostHog.
6. If `!onboarded_at` and the per-user session flag is absent, it goes to `/onboarding`.
7. It loads six legacy bundle chunks in order from `public/dashboard-assets/*.js`:
   - `2586a7a2`: the `<image-slot>` scaffold
   - `063068d4`: `const App`, the app controller
   - `144529f6`: `const Dash`, the dashboard controller and prompt
   - `8c8db126`: the design "Tweaks" panel
   - `a4efbfe6`: `window.KP`, the key-piece modal
   - `3cfe34e4`: `window.WA`, the add-to-wardrobe modal
8. Finally it calls `window.__robes_personalize()` (DP).

DP then monkey-patches the bundle at runtime. See CL "window.App bridge" and "Bundle interception". **Do not port the bundle chunks.** Rebuild from DP's behaviour.

### Data access
- The browser talks to **Supabase PostgREST directly** with the user's JWT, through three helpers:
  - `_waFetch(method, path, body)` at DP:641 sends `Prefer: return=representation`.
  - `_rbCapturePost` at DP:665 sends `return=minimal` and is used for insert-only `events`/`feedback`.
  - `_pdWrite` at DP:5670 is a raw fetch for `planned_days` upserts.
- `onboarding.html`, `stylenotes.html`, `admin.html`, `signup.html` and `reset.html` use a supabase-js client named `sbClient`.
- The Express server holds the service key and all AI calls (Gemini, plus Anthropic via the Edge Function). The server does **not** verify JWTs on most `/api/*` routes. `userId` arrives in the request body and is used only for logging (server:68).

### Schema degradation
Nearly every table access probes for columns or tables that do not exist yet and silently strips them on PGRST204/42P01. Examples: `_waV2Cols`, `_waTaxCols`, `_tgDown`, `_pdDown`, `_rbNotifyDown`, `_mvAvatarCols`, and the profile boot ladder. CL:1110–1133 lists migrations **17, 18, 19, 22 and 23 as not yet run** on `Robes_p0`. **The rebuild should assume the final schema** (every file in `supabase/*.sql`) and drop all of this probing.

### Feature flags

| Flag | Where | Effect |
|---|---|---|
| `_RB_MB_HIDDEN = true` | DP:16 | Moodboards are switched off on beta. |
| `?daycard=off\|on` | localStorage `rb_daycard` | Per-device DayCard kill switch. |
| `?diary=off\|on` | localStorage `rb_diary_prompt` | Per-device Diary intake kill switch. The default is on. |

### DP module map (section comments, for navigating the legacy code)

| Lines | Module |
|---|---|
| 1–420 | Account details modal (64–199), boot return landings (215–245), weather/geo (325–410) |
| 423–653 | Wardrobe wiring: taxonomy fetch, Supabase helpers |
| 654–695 | Capture plane: `_rbCapturePost`, `_rbGenId`, `_rbTrack` |
| 696–880 | Email preferences (migration 22), `?from=email`, feedback cloud (`_rbFbCloud` ~760) |
| 885–1420 | Milestone ladder / learning meter / concierge band |
| 1420–1660 | Pack-for-a-trip multi-select |
| 1660–3600 | Add-a-piece: category cascade, pickers, ways in (2088), receipts (2143/2250), paste link (2190), confirm screen (2434), wishlist target (3365) |
| 3603–3850 | Row-write ladder; receipt inbox (3676) |
| 3852–4220 | ADR-002 tag namespace (`tags`/`tag_pieces`/`tag_looks`) |
| 4221–4640 | Hero Rack, Refine, Wishlist (4407), add entry |
| 4643–5320 | View switching, wardrobe panel, boot routing by path (5140–5320) |
| 5324–5435 | "Style Notes" = **lookbook cache** (`snLoad`/`snSave`) + `lookbook_items` cloud sync |
| 5434–6020 | `planned_days` index write/read (migration 12) |
| 6042–6600 | Lookbook view, piece page (`__rbPieceOpen` 6403) |
| 6598–7300 | Look doors, inspiration, Lookbook empty state (7155), dashboard rows |
| 7307–8420 | Key-piece result (`__kpRenderResult` ~7699), image polling (7610), Build this look in situ (8154) |
| 8421–9030 | Daily look (`__dlSubmit` 8717), daily console, alternates (8982) |
| 9031–10040 | Shared Look/Rack console template, tags parse (9318) |
| 10041–11080 | Day strip, DayCard normaliser (10586) + renderer (10678), day peek, day rename (10874) |
| 11193–11830 | **Looks entity** (migration 14): reads (11222), writes (11365), avatar render (11471), wears (11605), pins (11688) |
| 11830–15080 | Lookbook tab, Refine, look page (12786), composer (13372), model on canvas (13529), handlers, diary sheet (14538) |
| 15081–16460 | Composer handlers, slice-4 brief, inline builder on home, FTU home, next line (15875), model door (15991) |
| 16786–17000 | Shared feedback block, fetch guard |
| 16985–18640 | Day/evening, save day look, day verbs, day page (~18242–18640) |
| 18641–18836 | Shared swap modal |
| 18837–21920 | **Travel edit** |
| 21922–22210 | Share flow, rename |
| 22314–23030 | v2 dashboard layout, breadcrumbs (hidden), nav v2, concierge captions |
| 23030–24450 | Moodboards (hidden), intent system, `/api/style` submit (23352), overlays |
| 24454–24512 | `_rbNav` URL routing + popstate, `_lbCloudPull` boot |
| 24513–24575 | Silhouette prompt, onboarding handoff |
| 24575–26383 | Home rail "week ahead", Diary list/month (25213), Add-a-look picker (26038), `?d=` deep link (26366) |
| 26441–27606 | Diary prompt: scope chip, three doors (26586), routing (26651), restyle (26736), intake unfurl (26765), boot (27210), onboarding handoff (27260) |

---

## 1. Route and URL map

Every page route is an Express `sendFile` (server:2240–2446). All signed-in routes serve the same `dashboard.html`. DP's boot (DP:5140–5320) then reads `location.pathname` and opens the matching overlay. After that, `window._rbNav(path)` (DP:24458) pushes the address with `history.pushState`, and a `popstate` handler (DP:24462–24500) walks the overlays back.

| URL | Served file (server line) | Purpose | Client entry / implementation | Query / hash conventions |
|---|---|---|---|---|
| `/` (`/index.html`) | static `index.html` + `js/app.js` | Marketing lander and waitlist. A Supabase token in localStorage makes it `location.replace('/dashboard')` (index.html:27–32). | app.js | — |
| `/signup` (`/signup.html`) | signup.html (2432) | Sign up, sign in, and request a reset | signup.html L449–641 | `?mode=signup\|signin\|reset` |
| `/reset` | reset.html (2436) | Set a new password from the email link | reset.html L184–263 | Supabase recovery hash |
| `/onboarding` | onboarding.html (2428) | First-run flow: name, first piece, style | onboarding.html L402–1359 | Dashboard boot redirects here when `!onboarded_at` |
| `/dashboard` | dash.html (2244) | Home: masthead, prompt with three doors, week-ahead rail, concierge band, Lookbook row | DP home modules | `?d=YYYY-MM-DD` → day page (DP:26366). `?from=email` → `email_landed`, then stripped (DP:749). `?daycard=`, `?diary=` flags |
| `/wardrobe` | dash.html (2254) | Wardrobe panel (grid, tabs, Refine, add) | `App.showWardrobe` + `__waSetView('all')` | `?receipts=1` → receipt review (DP:5180) |
| `/wishlist` | dash.html (2280) | Wardrobe panel, wishlist view | `__waSetView('wishlist')` | — |
| `/piece/:id` | dash.html (2286) | Wardrobe or wishlist piece page | `__rbPieceOpen(id,{quiet})` DP:6403. Not found → wardrobe | — |
| `/lookbook` | dash.html (2290) | Lookbook: saved looks grid + legacy artifacts | `__snOpen` DP:6056 | `?open=<lookId>[&fill=1]` → look page (+ fill flow). `?new=1&robes=1` → composer with a Robes build (DP:5252–5287) |
| `/looks` | dash.html (2261) | Legacy alias → Lookbook | `__lkGo` DP:5204 | — |
| `/diary` | dash.html (2267) | Diary: rolling 30-day list / month view | `__rbDiaryOpen` DP:25494 | Mode is kept in localStorage `rb_diary_mode` |
| `/calendar` | dash.html (2271) | Legacy alias of `/diary` | same | — |
| `/inspiration` | dash.html (2276) | Inspiration: undated key pieces styled | `__rbInspOpen` DP:6711 | `?open=<lookbook id>` → key-piece result (DP:5211) |
| `/moodboards`, `/moodboard/:slug` | dash.html (2294 / 2298) | Moodboards list / one board. **Hidden on beta** (`_RB_MB_HIDDEN`) | `_mbShowAllPage`, `_mbFindBySlug` DP:23039 | slug = `_mbSlug(title)` |
| `/stylenotes` | stylenotes.html (2424) | Your model (photo reads, the model, presence) | stylenotes.html L752–1843 | `#taste` → Taste & budget view. Hash routing in `routeFromHash` L858–875 |
| `/board/:shareId` | server-rendered from `board.html` (2376; builder 2303–2422) | Public, unauthenticated share page for a published lookbook item (anon RLS `is_public`) | server.js + board.html | 10-hex `share_id` |
| `/look/:id` | look.html (2240) | **Old production** 3-way look share page (in-memory `lookStore` 48h, Airtable fallback). Unused by beta | look.html:357 → `/api/look/:id` | — |
| `/admin` | admin.html (2250). **Unguarded server-side**; the client checks `profiles.is_admin` | Internal admin panel | admin.html | `#users` (default), `#user/<uuid>`, `#health`, `#feedback` |
| `/terms`, `/privacy` | terms.html / privacy.html (2440 / 2444) | Legal | static | — |
| `/specimen.html` | static | Internal type/colour specimen, not linked | static | — |
| `/api/notify/unsub?t=…` | server:384–385 | One-click email unsubscribe (HMAC token) | notify.js | `t=uid.prefKey.hmac` |

**Email deep links** (notify.js, the re-engagement sequence):
- `/inspiration?open=<id>`
- `/stylenotes`
- `/lookbook?open=<id>&fill=1`
- `/lookbook?new=1&robes=1`
- `/wardrobe?receipts=1`
- `/dashboard?from=email` (and `from=email` on the others)

### Client-only states with no URL of their own
The rebuild should give each of these a real route.

| State | Opener | Suggested route |
|---|---|---|
| Day page | `__rbDayOpen(date,{seed,from})` DP:18477 | `/diary/[date]` |
| Trip page (travel edit) | `__snOpenItem(id)` → `__tvRenderResult` | `/trips/[id]` |
| Look page / composer / editor | `__lkOpen(id,{from})` DP:14452, `__lkNew({day,trip})` DP:15104 | `/looks/[id]`, `/looks/new?day=&trip=` |
| Key-piece result | `__kpRenderResult` | `/inspiration/[id]` |
| Daily console (legacy rows / pinned-look day) | `__dlRenderResult` DP:17824 | Fold into `/diary/[date]` |
| Diary list vs month | `__dySetMode` | `/diary?view=list\|month&m=YYYY-MM` |
| Modals: account details, add-a-piece, share, rename, delete confirm, Add-a-look picker, pin sheet, travel intake, tag sheet, swap sheet | — | Intercepting/modal routes (web), presented screens (Expo) |

All `/api/*` routes are listed in §2 next to the features that call them.

- **Endpoints nothing calls from the beta frontend:**
  - `/api/stylenotes/tryon`: the server is ready but no client calls it.
  - `/api/waitlist` and `/api/look`: production lander only.
  - `/api/notify/tick`: an internal timer.
  - `/api/inbox/receipt`: the inbound email webhook.
  - `/api/health`
- **Endpoints the client calls:** listed in §6.3.

---

## 2. Feature catalogue

The catalogue has four parts, one per research area:
- **2A** Auth, onboarding, Style notes / Your model / avatar / try-on, account, email preferences and notifications, PWA, public pages
- **2B** Wardrobe, add a piece (photo / receipt / link), edit/delete, taxonomy and tags, piece page, wishlist, inspiration
- **2C** Home and concierge, key-piece styling, daily look console, looks and the look builder/composer, alternates and restyle, feedback, moodboards
- **2D** Travel edit, Diary/calendar/planned days, Lookbook / saved and sync, share and the IG handle, navigation, admin

Each part lists, for every feature: user-visible behaviour, UX and copy rules, APIs and tables, and legacy code locations.


### 2A. Auth, onboarding, Style notes / Your model, account & email, PWA, public pages

Branch `platform` (the CLAUDE.md header still calls it `beta`). Every line number below comes from reading the code. Where CLAUDE.md's reference section (lines 939–1644) is out of date, that is noted and the code wins.

---

#### 1. AUTH

##### 1.1 Signup / Sign-in / Reset-request: `public/signup.html` (645 lines; script at L449–641)
**Routes.** `/signup` is served by `server.js` L2432. `/signup.html` is served as a static file. Both are the same page. The mode comes from `?mode=`: missing or `signup` means sign-up, `signin` means sign-in, `reset` means the password-reset request.

**Session door (L458–460).** `sbClient.auth.getSession()` runs on load. If a live session exists, it calls `location.replace('/dashboard')`, so a logged-in user never sees the form.

**UI (L372–447).**
- Close ✕ goes to `/`.
- H1 "Creating your *style notes…*".
- Subtext: "Snap your wardrobe once. Then one prompt gets you dressed for anything."
- `#message` area.
- "Continue with Google" button.
- Divider "Or with email".
- First name field (sign-up only).
- Email field.
- Password field with Show/Hide toggle. The input carries `class="ph-no-capture"` (this must be kept: PostHog replay would otherwise record the password once Show flips the type to text).
- CTA "Start my style notes →".
- Toggle "Already have an account? Sign in".
- Legal line linking `/terms` and `/privacy`.

**Mode rewrites (L469–497).**
- **signin:** hides first name. H1 "Welcome *back.*". Subtext "Your wardrobe's where you left it." CTA "Sign in →". Toggle "New to Robes? Create an account". Password `autocomplete="current-password"`. Injects a "Forgotten your password? Reset it" link to `?mode=reset`.
- **reset:** hides first name, password, Google and the divider. H1 "Reset your *password.*". Subtext "Enter your email and we'll send you a link to set a new one." CTA "Email me a reset link →". Toggle "Remembered it? Sign in".

**Validation and copy rules.**
- `setLoading` runs only after validation passes (L542). Loading labels: "Sending your link…", "Signing in…", "Creating your style notes…".
- Validation messages:
  - "Please enter your email address."
  - "Please enter a password."
  - "Please enter your first name."
  - "Password must be at least 8 characters." (sign-up only)
- `friendlyAuthError` (L528) maps raw Supabase errors:
  - "Email not confirmed" → "Almost there — tap the link in the email we sent you first. Worth a look in spam too."
  - "Invalid login credentials" → "That email and password don't match — have another go."
  - Rate limit → "Too many attempts for now…"
- Sign-up rate limit → "…Please wait 1 hour…" (Supabase allows about 3 sign-ups per hour per email).
- "already registered", or `data.user.identities.length === 0` (Supabase returns an obfuscated user with no error), → "Looks like you already have an account — *sign in instead*" (L612–622).

**Supabase auth calls.**
| Call | Line | Redirect |
|---|---|---|
| `auth.signInWithOAuth({provider:'google', options:{redirectTo: origin+'/onboarding'}})` | L552 | `/onboarding` (CLAUDE.md L1213 wrongly says `/dashboard`) |
| `auth.resetPasswordForEmail(email,{redirectTo: origin+'/reset'})` | L570 | Success message: "Check your email — your reset link is on the way." |
| `auth.signInWithPassword({email,password})` | L583 | → `/dashboard` |
| `auth.signUp({email,password,options:{data:{first_name}, emailRedirectTo: origin+'/onboarding'}})` | L596 | If `data.session` exists → `/onboarding`; otherwise "Check your email — we sent you a confirmation link to activate your wardrobe." |

**Enter key** submits from any field (L633).

**Profile creation happens in the database, not the client.** The `handle_new_user` trigger (`supabase/schema.sql` L33–52) inserts `profiles(id, first_name = raw_user_meta_data->>'first_name')`.
- Google users have no `first_name` in their metadata, only `given_name`/`full_name`, so `profiles.first_name` starts null for them. Onboarding's name step fills it.
- The `gender_identity` column default `'woman'` (migration 13) applies to every new row.

**Beta gating / invite: none exists in code.** Anyone who reaches `/signup` can register. The "invite" is simply the URL `https://beta.byrobes.com` (CLAUDE.md L1035). The only operational requirement is that Supabase Auth's redirect allowlist includes `https://beta.byrobes.com/**` and the reset URL (CLAUDE.md L1038, L1221). `admin.html` gates separately on `profiles.is_admin`.

**PostHog.** signup.html loads `posthog.js` but deliberately does not call `__rbPHUser`. The anonymous distinct_id stitches to the user at the next page's identify (CLAUDE.md L211).

##### 1.2 Password reset landing: `public/reset.html` (263 lines; script L184–263)
Served at `/reset` (`server.js` L2436).

**Flow.**
1. It waits for the recovery session: `onAuthStateChange` plus `getSession()`, with a 5s timeout (L205–213). supabase-js reads the tokens from the URL hash.
2. **If there is no session after 5s:** H1 "That link has *expired.*", subtext "Reset links only work once, and only for a little while.", the form is hidden, and the foot link becomes "Send me a fresh link" → `/signup?mode=reset`.
3. **If there is a session:** one new-password field (Show toggle, `ph-no-capture`) and "Save my password →".
   - Validation: minimum 8 characters, "Your password needs at least 8 characters."
   - `auth.updateUser({password})` (L243).
   - Error containing "different from the old" → "That's the same password as before — pick a new one."; any other error → "Couldn't save that just now — try again in a moment."
   - Success → "Done — your password is set.", then after 900ms → `/dashboard`.

##### 1.3 Session checks and redirects on protected pages
| Page | Mechanism | No session → | Other redirects |
|---|---|---|---|
| `dashboard.html` L2577–2679 | Loads supabase-js UMD dynamically (L2582), creates the client (L2587), then `onAuthStateChange` + `getSession` + 5s timeout (L2598–2607). The listener stays subscribed for the tab's lifetime so the refreshed JWT is re-captured into `window.__robes_session` (fix for the "401s after an hour" bug). Exposes `window.__robes_session`, `window.__robes_sb`, `window.__robes_profile`. | `/signup.html?mode=signin` | **Onboarding gate (L2651–2655):** if the profile loaded AND `onboarded_at` is falsy AND `sessionStorage['rb_onboarded__'+uid]` is unset → `/onboarding`. If the select errored (no profile) there is never a redirect. The legacy `rb_onboarded` key is removed first. |
| `onboarding.html` init L1310–1355 | `onAuthStateChange` + `getSession` + 5s timeout | `/signup.html?mode=signin` | `rb_onboarded__uid` set → `/dashboard`. `profile.onboarded_at` set → `/dashboard`. |
| `stylenotes.html` `init()` L1727–1729 | `getSession()` only (no listener, no timeout) | `/signup.html?mode=signin` | none |
| `index.html` L26–32 | Reads localStorage `sb-ayowpaknssulsqqvwpqx-auth-token` directly and checks for a `refresh_token` | (stays on the marketing page) | Has a token → `location.replace('/dashboard')`. The token is not validated, so an expired refresh token bounces to the dashboard, which then bounces back to signin. |
| `reset.html` | recovery session (see 1.2) | expired state | → `/dashboard` after save |

**Dashboard boot profile select ladder (L2615–2643).** This is the strip-and-retry pattern used to survive migrations that have not been run yet.
1. `profiles.select('first_name, last_name, mobile, style_icons, budget, wardrobe_description, style_dna, wardrobe_items_count, onboarded_at, gender_identity, notification_prefs')`.
2. On error: the same select minus `notification_prefs` (migration 22).
3. Then minus `gender_identity` (migration 13).
4. Then minus `onboarded_at` (migration 7), with `onboarded_at:'unknown'` stamped in.

After a successful load it calls `__rbPHUser(session, profile)` (L2645). It then loads the bundle scripts in order and calls `window.__robes_personalize()`.
- **Rebuild note:** replace this ladder with one server-side `/me` endpoint.

##### 1.4 Onboarding-bypass bug (history and current state)
- **The bug (CLAUDE.md L755–760, fixed 2026-07-28).** The unscoped `sessionStorage.rb_onboarded` flag was checked before `onboarded_at`, so a second account signed up in the same tab skipped onboarding entirely, and the dashboard gate read the same flag.
  - Fix: the key is now scoped as `rb_onboarded__<uid>` in all three places (onboarding.html L531/L1284 write, L1333–1334 read; dashboard.html L2652 read).
  - The legacy key is purged on each load (onboarding L1332, dashboard L2651).
  - The flag's remaining job is to guard against a redirect loop for the same user when the `onboarded_at` write fails.
- **Open risk (not fixed).** `supabase/onboarding_migration.sql` ends with an unguarded `update … set onboarded_at = coalesce(created_at, now()) where onboarded_at is null`. Re-running it permanently marks every pending user as onboarded.
- **Residual gaps visible in code:**
  - (a) If onboarding.html's own profile select errors (L1341), `profile` is null and the flow runs even for an already-onboarded user. The dashboard gate is the opposite (it never redirects on error).
  - (b) `finishToDashboard` sets the session flag synchronously and then races the `onboarded_at` update against 1.5s (L530–538). If the write is lost, the user is re-onboarded in the next browser session.
  - (c) Google OAuth and email-confirmation always land on `/onboarding`, which then passes onboarded users through to `/dashboard`: two hops for every returning Google sign-in.
- **Rebuild recommendation:** make `onboarded_at` authoritative, check it server-side in middleware or on the session, and drop the sessionStorage flag.

##### 1.5 Sign-out
| Surface | Location | Behaviour |
|---|---|---|
| Dashboard avatar menu "Log out" (`#av-logout`) | `dashboard-personalize.js` L7409–7431 | Label changes to "Signing out…" → `(window.__robes_sb or a new client).auth.signOut()` → `__rbPHReset()` → `/signup.html?mode=signin` |
| Style notes avatar menu (`#sn-logout`) | `stylenotes.html` L1797–1802 | Same sequence |

Neither clears app localStorage or sessionStorage keys; they rely on per-uid scoping. Unscoped keys (for example `robes-v1`) survive sign-out.

---

#### 2. ONBOARDING / FTUE: `public/onboarding.html` (1359 lines; CSS to ~L390, script L402–1359)

Served at `/onboarding` (`server.js` L2428). It is a standalone page with one state machine: `st.stage` = `'splash' | 'name' | 0 | 1 | 'done'` (L472–484).
- `STEPS = ['keypiece','style']` (L470), in slice-7 "option A" order (CLAUDE.md L94–103).
- Progress bar width = `(i+1)/STEPS.length`.
- **CLAUDE.md L1194–1209 is stale** (it still describes Icons as step 01, a done screen, and an Add-to-Home nudge). Use the dated deltas at L94, L374 and L478 instead.

**What onboarding does NOT have (per the brief's list):**
- No budget step. Budget lives only in Style notes → Taste & budget.
- No gender-identity step. Gender defaults to `'woman'` via the column default and is changed on the Your Model page.
- No colour or silhouette photo steps. They were removed 2026-07-10; `renderPhotoStep` was deleted.
- No done screen. `renderDone` (L1281) is unreachable since 2026-08-18.

##### 2.0 Load failure guard (L403–410)
If `window.supabase` is missing, the page shows a dark splash with "That didn't load quite right." and a Try again button that reloads.

##### 2.1 Splash (`renderSplash` L549–563)
Dark screen with grain, glow and the "Robes" wordmark. It auto-advances to `name` after 2s; tapping skips.

##### 2.2 Name (`renderName` L567–592)
- Dark screen. Eyebrow "First things first". H1 "What should *we call you?*". Sub "A name for your style notes." Input placeholder "Your name".
- Continue is disabled until the input is non-empty. Enter submits.
- There is no Back button: the intro screen was cut 2026-09-21.
- **Prefill:** `profiles.first_name`, falling back to auth `user_metadata.first_name`, then `given_name`, then the first word of `full_name`/`name` (L1337–1351). Because the profile usually lands after the 2s splash, boot re-renders the name stage (L1354).
- **Write:** only the first word, and only if it changed: `profiles.update({first_name})` (L585).
- Goes to step 0.

##### 2.3 Shared step chrome (`stepChrome` L597–617)
Back button, step chip ("Step 0N · …"), 2px progress rail, eyebrow, serif H1 with an italic accent, optional sub, input zone, footer with the ink Continue pill (CSS-uppercased) and "Skip for now". Back goes to the previous step, or to `name` from step 0.

##### 2.4 Step 01 · Wardrobe: first piece (`renderKeyPiece` L902–1274)
**Copy.** Eyebrow "Wardrobe". H1 "Add your *first piece.*". Sub "Give Robes one piece you love — from your wardrobe, or you might be wearing it right now. This is where your wardrobe starts."

**Panel.** Empty state shows "Your key piece" and "Add photo". A file input (`accept="image/*"`) and desktop drag-and-drop (`wireDrop` L844) are both wired.

**Photo handling.** `fileToPayload` (L860–887) downscales to at most 1600px JPEG at 0.85 quality via `createImageBitmap` + canvas. HEIC falls back to FileReader: the raw data is kept and `renderable:false`, so the preview uses the Cloudinary URL.

**The ledger.** "What Robes files" has five rows: 01 The piece, 02 Category, 03 Brand, 04 Colour, 05 Cut. Each row moves from "Awaiting" to "Reading" to its value.

**Auto-scan on attach** (`handleFile` → `catalogue()` L1089–1202):
1. CTA changes to "Reading your piece…". A scan-line overlay shows "Reading your piece…".
2. In parallel:
   - `POST /api/wardrobe/analyse` `{data, mimeType, userId}` → `{label, category, category_l2, category_l3, color, brand, notes, item_dna{display{editorial_color_name, brand_raw}, structural_dna{silhouette_fit[]}…}, noItemDetected?, analysisFailed?}`
   - `POST /api/wardrobe/upload` `{data, mimeType}` → `{url}` (Cloudinary)
3. One retry after 1.5s if the analysis failed or returned no label (L1129–1132).
4. **Errors:**
   - `noItemDetected` clears the photo and shows "Robes couldn't find a piece in that photo — try a clear shot of the garment."
   - A hard failure keeps the photo and shows "Robes couldn't read that piece just now — try again in a moment."
   - The CTA returns to "Style my first piece".
5. **On success:**
   - `wardrobe_items.insert({user_id, label, category||'Other', category_l2, category_l3, color, brand, notes, image_url, item_dna})` via `sbClient` (L1166). If the error names `category_l`/`column` (migration 15 not run), it retries without the taxonomy columns. The promise is kept in `P.savePromise`, and success fires `obTrack('wardrobe_added',…)`.
   - `prefireStyle()` (L1235–1256) fires `POST /api/style` immediately with `{prompt: tag.label, photo: dataURL, styleDna (only if color_harmony/silhouette_proportions exist), styleIcons, wardrobeCount:1, wardrobeItems:[{label,category,color,times_worn:0}], intent:'style', userId}`. The result goes to `sessionStorage.rb_onboard_styled = {prompt, data, ts}`.
   - `writeHandoff()` (L1209–1228) writes `sessionStorage.rb_onboard_piece = {prompt, photo (dataURL; retried with photo:null if quota is exceeded), cataloged}`. It is re-written with `cataloged:true` once the insert settles (3s cap).
   - Reveal theatre: tags pop in a stagger (`popTags`, up to 4 chips: category, editorial colour, brand, fit, plus a label banner). The ledger fills row by row at 480ms steps (`revealLedger`). The Cut row falls back to "—".
   - There is no auto-advance. She continues herself.
6. **Continue on a filed piece:** waits up to 1.5s for the insert ("Filing your piece…") so the handoff carries `cataloged:true`. This prevents a duplicate piece #1 from the dashboard's legacy persist path. Then it writes the handoff again and advances.
7. **Skip discipline:**
   - Skip is hidden as soon as a photo is attached or a piece is filed (`syncSkip` L912–918).
   - With nothing attached, the first tap arms "Skip anyway — Robes styles only what you add" and the second tap advances.
   - Skip does nothing while a read is in flight.
   - No photo plus Continue shows the nudge "Add a photo of your piece first — or skip for now."
   - CTA labels: "Style my first piece" before filing; "Continue" once filed, since Style is next.

**Known accepted cost:** the first three looks are steered by DNA and the piece only, not by icons or archetypes, because the prefire runs before step 02.

##### 2.5 Step 02 · Style: archetype first, then icons (`renderStyle` L640–838)
- **Title:** "While Robes composes your three looks — where does your *style sit?*" when `st.pieceStyled` (a handoff was written); otherwise "Where does your *style sit?*". Step chip "Step 02 · Style", eyebrow "Style", CTA "Continue to your dashboard".
- **Ten archetype cards** (`ARCHETYPES` L432–443): Minimal, Bohemian, Classic, Romantic, Sculptural, Utility, Heritage, Eclectic, Off-duty, Avant-garde.
  - Each has a one-line descriptor, rendered only once the card is selected.
  - Multi-select, no minimum, second tap clears. Selected style is `#F3EFE6` fill with a `#C9BCA6` border and a ✓.
  - Grid is 3 columns on desktop, 2 at ≤560px.
- **"Icons and brands" refinement** behind a hairline:
  - Chips sit inside the field, with typeahead (max 6 matches plus an 'Add "x"' new option). Keys: arrows, Enter, and comma commit; Backspace on an empty input removes the last chip.
  - Placeholder "Add the people and brands whose style inspire you", switching to "Add another…". Tally "N added". Hint "Press Enter to add".
  - "Or tap a popular one" pool: 10 chips, seeded first from `ARCH_SEED[archetype]` (L447–458), then `ROBES_ICONS` (29 names, L420–428).
  - Dropdown taps commit on `pointerdown` (a mobile bug fix).
- **Skip rule:** hidden as soon as any archetype or icon is chosen.
- **Writes on Continue (`proceed` L815–834):**
  - `profiles.update({style_icons: [...]})` if any icons were chosen.
  - `profiles.update({style_dna: {...loadedStyleDna, style_archetypes:[...]}})` when there is something to record or clear. This is a client-side read-modify-write of the whole JSONB.
  - Both writes get a capped 1.5s race ("Opening your dashboard…") before `advance`.
- **Finding: `style_dna.style_archetypes` is written but consumed nowhere** except this page's own prefill. `style_dna.js` `styleDnaPromptBlock`, `server.js` and the dashboard never read it. The rebuild should either wire it into prompts or drop it.

##### 2.6 Finish (`finishToDashboard` L530–538)
Sets `sessionStorage['rb_onboarded__'+uid]='1'`, races `profiles.update({onboarded_at: now})` against 1.5s, then goes to `/dashboard`.

##### 2.7 Dashboard handoff, "Your piece, styled" (interface only; the card itself is in 2C)
`_rbOnboardHandoff` IIFE at `dashboard-personalize.js` L27257+ reads and removes `rb_onboard_piece` and `rb_onboard_styled`. It renders the inline `#rb-styled` card (loading, then ready), auto-saves the result to the lookbook, and shows the email ask (§4.2).

##### 2.8 "Wardrobe logging reveal" (CLAUDE.md L738–746)
The onboarding filing theatre (tag pops plus the five-row ledger) was reused in the dashboard add flow (`_runStep3`). It was partially superseded on 2026-08-05 and now survives as a four-row summary. It is the same visual component and should be one shared component in the rebuild.

---

#### 3. STYLE NOTES / YOUR MODEL: `public/stylenotes.html` (1871 lines; script L752–1843) + `style_dna.js`

Served at `/stylenotes` (`server.js` L2424). It is a standalone page. **CLAUDE.md L1156–1167 (three tabs, try-on polling) is obsolete.** Current state: the 2026-08-25 and 2026-09-01 deltas (CLAUDE.md L355–399).

##### 3.1 Chrome
- **Topbar (L370–401):** wordmark → `/dashboard`; "‹ Home" back link (relabelled Lookbook/Inspiration depending on `rb_model_return`); `#save-state` showing Saving…, Saved or Couldn't save; a weather pill; and an avatar menu with Dashboard, Wardrobe, Lookbook, Taste & budget (`#taste`) and Log out. The avatar initial and name come from `profiles.first_name`; the subtitle reads "Founding Stylist".
- **Weather (L1804–1837):** browser geolocation, then Nominatim reverse geocode for the city and Open-Meteo for the current temperature and weather code, mapped to an emoji.
- **Mobile dock (L1845+):** Home, Lookbook, Diary, Wardrobe, Inspiration.
- **Views (`setView`/`routeFromHash` L858–875):** `#taste` shows Taste & budget; anything else (including the legacy `#silhouette`) shows the model page. It listens to `hashchange`.

##### 3.2 Your Model view (`#view-model`)
**Layout.** A sticky left stage (`#mv-figframe`) and a main column. On mobile the stage leads, full width at 420px.

**Header.** "Your *model.*" + "Two photographs. One model." + the Adjust pill `#mv-adjust` (shown only once a photo has been read).

**Photo slots ("likeness").**
- **Close-up** (`#headshot-slot`). Guide: "Soft daylight, facing a window. No filters, no direct sun, no coloured lighting."
- **Full length** (`#full-slot`). Guide: "Straight-on, head to toe. Fitted clothing reads best — oversized pieces hide your line."
- Once read, each slot shows "✓ Read" and an italic line "{Season|Body type} — read from this photograph."

**Photo read pipeline (`wireSlot`/`processFile` L1614–1713).**
1. Click or drop, then downscale as in onboarding.
2. Busy label: "Reading your colouring…" or "Reading your line…".
3. A 100s AbortController.
4. In parallel:
   - `POST /api/stylenotes/analyse` `{kind:'colour'|'silhouette', data, mimeType, userId}`.
     - Response (colour): `{season, undertone, contrast, summary, undertone_note, palette[18 hex], neutrals[{name,hex}], best_colours[{name,hex}], avoid_colours[], avoid_note, proof_best, proof_less, seen_on_you, metals[{name,hexes[3]}], metals_note, style_dna:{archetype_name, verified_undertone, calculated_contrast, refinement_needed, classification{…}, extracted_values{skin_tone_hex,hair_color_hex,eye_color_hex}, eighteen_shade_matrix, functional_sub_palettes…}}`.
     - Response (silhouette): `{body_type, summary, traits[], dress_silhouettes[{name,note}], neckline_recommendations[], styling_tips[], style_dna:{…silhouette_proportions}}`.
     - Rejections: `{no_face_detected:true}` / `{no_person_detected:true}`. Failure: 502 `{error:'analysis_failed', reason}`.
   - `POST /api/wardrobe/upload` → `{url}`.
5. **Rejection copy:** "Robes couldn't find a face in that photo — try a clearer close-up." / "Robes couldn't read a full-length figure — try a head-to-toe photo." Nothing is saved.
6. **Timeout:** "That took longer than it should — try the photo again."
7. **Other errors:** "Robes couldn't read that photo just now — try again in a moment."
8. **On success**, one `profiles.update` (L1685–1706):
   - Colour: `{colour_analysis: render, style_dna: {...st.styleDna, color_harmony: dna}, season, undertone, contrast, headshot_url}`.
   - Silhouette: `{silhouette_analysis, style_dna: {...st.styleDna, silhouette_proportions: dna}, body_type, full_length_url}`.
   - Then `mvFile()` auto-files the model.

**Server chain (`server.js` L2703–2786).**
- Model order: `gemini-2.5-pro` with schema (thinking 1024, 4096 tokens, 45s race) → `gemini-2.5-flash` with schema (25s) → flash without schema. `fast:true` swaps to flash first; onboarding once used it, and nothing sends it now.
- Temperature 0.
- The server does NOT write Supabase. The client persists everything.
- The endpoint has **no rate limit and no auth**.

**Read sections.**
- `#st1-result` "Your harmony": season name, summary, a 9-swatch strip, Undertone and Contrast facts, and the "Full colour notes →" door.
- `#st2-result` "Your line": body type and summary, with the "Full line notes →" door.

**Full-notes drawer (`mvNotesOpen` L1014–1036).**
- Desktop: a 660px right slide-in. Mobile (≤767px): a bottom sheet whose Close button reads "Done". Closes via scrim or Escape.
- Eyebrow "{Season} · one of twelve" or "{Body} · one of five". Title "Colour notes." or "Line notes."
- Colour notes: 18-shade palette (3×6), undertone rows with "Yours", 6 neutrals, 8 best colours, 7 "Colours that fight you", 3 metals with a note.
- Line notes: 4 traits, 4 dress cards, 5 neckline pills, 5 styling tips.

**The model (deterministic mapper, no LLM; L1042–1176).**
- Skin is one of 8 swatches (`MV_SKINS`, named Espresso … Porcelain). Hair is one of 5 (`MV_HAIRS`, jet black … ash blonde). Each is the nearest hex to `style_dna.color_harmony.extracted_values.skin_tone_hex`/`hair_color_hex`, with fallbacks s3 and h1.
- Figure key from `body_type` → `hg/pe/re/it/ap`, else `nt`.
- Nudges: `line` L/R (Softer/Straighter) and `frame` L/R (Fuller/Narrower).
- `mvModelId()` = `{w|m}-s{0-7}-h{0-4}-{fig}[-l{l|r}][-f{l|r}]`. This string is the **`avatar_id` contract** shared with the server's `parseAvatarId` and `avatarCellEnsure`. Keep the two in sync (the MV_* tables on the client, the AVATAR_*_WORDS tables on the server).
- `mvP()` supplies pronouns (she/he). `'unspecified'` uses the woman catalog.

**Stage.**
- An SVG ghost figure (opacity 0.22 when empty) sits under the photograph.
- Empty copy: "Your model starts the moment your first photograph reads — or shape them by hand."
- Eyebrow: "Read from your photographs", "Part read, part chosen", or "Chosen by hand".
- Caption: "{Skin} · {hair} hair".
- Facts: Harmony and Line, or "Not read yet".

**Photographed cell (`mvPhotoSync`/`mvPhotoFetch` L1389–1444).**
- Debounced 900ms (0ms the first time), with a sequence guard.
- `POST /api/avatar/cell {avatarId}` → `{url}` or `{jobId}` (rate limit 20/min). The job is polled every 3.5s via `GET /api/images/:jobId` → `{images:[url|null], done}`, with a 180s ceiling.
- Chip "Creating your model…". On failure the ghost stays. `img.onerror` removes the image.

**Shape by hand (`mvShapeRowsHtml`/`renderShape`/`mvShapeRowPick` L1178–1262).**
- Five rows: Presence pills (Woman / Man / Prefer not to say), Skin dots, Hair dots, The line, The frame.
- **Nothing read yet:** the rows sit open in place under "Or shape her/him by hand" / "She changes as you choose."
- **After a read:** the rows move into a 520px flyout (`#mv-adjust-wrap`, a bottom sheet on mobile) headed "Robes read her" / "Adjust by hand.", with a Done button and the foot "Nothing to save — she updates as you choose."
- Every pick repaints and auto-files.
- **Presence writes `profiles.update({gender_identity})` immediately** (L1245) and sets `st.gender`.

**Auto-file (`mvFile` L1296–1309, `mvPersist` L1269–1283).**
- `prefs = {skin, hair, nudges, kept:true, gender, v:2}` is written to localStorage `rb_model__<uid>`.
- Then `profiles.update({avatar_id, avatar_prefs: prefs})`. If the column is missing (migration 20 not run), it flips to local-only.
- The first filing fires `snTrack('model_filed', {by:'photo'|'hand', gender})`.
- Filed line: "✓ Filed · she updates as you change her" (flash animation).
- Status note ladder:
  - "Two photographs read. She's as close as she gets."
  - "One more photograph and she settles."
  - "Add a photograph whenever you like — she updates."
  - "Nothing yet. Add a photograph, or shape the model by hand."
- Init auto-files once if reads exist but nothing has been filed (L1772–1776).

**Forward CTA `#mv-build` (L1311–1358).**
- Label "Build a look", or "Back to your look" when `sessionStorage.rb_model_return ∈ {lookbook, home (with rb_lk_draft parked), inspiration}`.
- Destinations: returns go to `/lookbook`, `/dashboard` or `/inspiration`. Otherwise it sets `rb_model_build='1'` (and `rb_model_open_look='1'` if filed) and goes to `/dashboard`.
- The dashboard boot (`personalize` L207–248) then opens the newest undressed look (`model_build_landed {on:'look'}`) or reveals and focuses the prompt (`{on:'prompt'}`).

**Email landing.** `?from=email` (L1318–1328) removes `rb_lk_draft`, sets `rb_model_return='home'`, strips the param with `replaceState`, then `posthog.register({from_email:true})` and `capture('email_landed',{path:'/stylenotes'})`. This is PostHog only; nothing goes to the events table here.

**Load (`init` L1727–1778).**
- `profiles.select('*').eq('id',uid).single()`.
- Hydrates first_name, style_dna, colour_analysis (if it has `.season`), silhouette_analysis (if it has `.body_type`), style_icons, budget (comma split), splurge_categories, annual_spend, headshot_url, full_length_url, gender_identity and avatar_prefs (falling back to localStorage `rb_model__uid`).
- Whether each chapter shows as empty or filled is decided by the presence of `colour_analysis`/`silhouette_analysis`, never by the scalar columns.

##### 3.3 Taste & budget view (`#view-taste`, L1446–1545)
- **Hero:** "Style notes" / "Taste & budget." with metrics Your tier, Style icons count and You splurge on count.
- **Style icons:** input "Add a name…" with Enter to add. Chips have ×. "Popular among stylists" suggests from `POPULAR_ICONS` (10). Each add or remove calls `profiles.update({style_icons})`.
- **Your range (multi-select tiers)**, `profiles.update({budget: tiers.join(', ')})`. Budget is a CSV string in a text column.
  - Everyday: Zara, H&M, Penneys, Vinted; Under €150
  - Contemporary: €150–500
  - Designer: €500–1,500
  - Luxury: €1,500–5,000
  - Ultra luxury: €5,000+
- **Where you splurge** (multi-select): Shoes, Bags, Outerwear, Jewellery, Occasionwear, Tops & knitwear. Writes `profiles.update({splurge_categories})`.
- **"How much you spend a year"** (collapsible, marked Optional), single select: Under €500, €500–1,500, €1,500–5,000, €5,000+, Prefer not to say. Writes `profiles.update({annual_spend})`.
- **Bug to fix:** `st` initialises mock defaults (L816–819: icons `['Totême','Sienna Miller']`, tier Contemporary, splurge Shoes+Bags, spend €500–1,500). A user with empty columns sees these as her own choices, though they are never persisted until she interacts. In the rebuild, empty should mean empty.
- Every save updates `#save-state`: Saving… → Saved (1.5s) or Couldn't save (3s).

##### 3.4 Unwired or other endpoints in this area
- **`POST /api/stylenotes/tryon`** (`server.js` L2793, rate limit 6/min). Body `{kind, analysis, data+mimeType | photoUrl (Cloudinary only)}` → jobId. **Nothing on the page calls it.** The earlier `pollTryon`/`rb_tryon_*` code was retired; it is kept as the prompt scaffold for the render endpoint.
- **`POST /api/avatar/render`** (`server.js` L3092, rate limit 12/min). Body `{avatarId, pieces[1..12]{name,category,color,brand,image_url}}` → `{jobId, count:1}`, polled via `/api/images`. Called from the dashboard's `_avRenderKick`, **not from stylenotes**. It needs `looks.render_url`/`render_key` (migration 21).
- **`avatarRefForUser(avatarId, userId, gender)`** (`server.js` L3040) resolves `profiles.avatar_id` with the service key for `/api/style` and `/api/daily` frames. Migration 20 is load-bearing: a model kept only in localStorage never reaches these surfaces.
- **Avatar cells** live in the `avatar_cells` table (service-key writes, authenticated read) or an in-process cache. The key is `id + '@v2'`.

##### 3.5 Style DNA engine (`style_dna.js`, 603 lines)
- **Exports:** `SEASONS` (12), `BODIES` (5), `classifySeason` (L394), `classifyBody` (L423), `buildColorHarmony` (L446), `buildSilhouette` (L513), `styleDnaPromptBlock(styleDna, wardrobeCount, styleIcons)` (L557). The last has three postures: 0 items, 1–14 hybrid, ≥15 strict closet. It honours `user_overrides`, which nothing writes yet.
- **Who writes `profiles.style_dna`: only the browser.**
  - `color_harmony` / `silhouette_proportions` come from stylenotes after an analyse call.
  - `style_archetypes` comes from onboarding step 02.
  - The server only computes (`/api/stylenotes/analyse` returns `style_dna` in the response body) and reads DNA from request bodies (`styleDna` in `/api/style`, `/api/daily` and others). The dashboard reads it from `__robes_profile.style_dna` via `_rbStyleDna()`, which is non-null only when color_harmony or silhouette_proportions exists.
  - Both writers replace the whole JSONB from their stale copy loaded at page start, so a lost update is possible across tabs. The fix belongs server-side (§e).
- **Docs.** `docs/avatar-design-brief.md` and `docs/avatar-render-proposal.md` share these hard rules:
  - The phrase "body type" never renders, and there is no body lineup.
  - Never say "AI"; call it "your model", never "avatar".
  - The mosaic is never removed from a surface.
  - The reference image is the identity; never re-describe it in text.
  - Never show an uncurated cell. The v1 build deviates here: lazy cells are shown without curation.
  - Catalog plus deterministic mapping; rendered once at save time at about 7¢ each.
- **Rule conflict.** Stylenotes shows the body archetype name ("Hourglass — read from this photograph.", `#st2-line`, the Line fact). The literal phrase "body type" is avoided, but archetype names do render, which departs from the proposal's line "never ask her to rank her own body". This needs a product decision before the rebuild.

---

#### 4. ACCOUNT DETAILS, EMAIL PREFERENCES, NOTIFICATIONS, GENDER

##### 4.1 Account details modal (`dashboard-personalize.js` L64–199)
- **Entry:** the dashboard avatar menu has "Account details" inserted first (L64–77). Menu order: Account details / Lookbook… / Style notes (L7374–7390) / Taste & budget (`/stylenotes#taste`, L7392–7406) / Log out.
- **Modal `#acct-modal`** (z 9000, blur scrim, 420px card):
  - "Account details", the email (read-only, from the session), `#acct-msg`.
  - First name, Last name, Mobile number (placeholder "+353...").
  - Pointer line: "How you identify now lives with your model — Style notes" → `/stylenotes`.
  - An Emails section.
  - "Save changes". Closes via ✕ or scrim.
- **Save (`__saveAcctDetails` L138–199):**
  1. Raw REST call `PATCH /rest/v1/profiles?id=eq.{uid}` with `{first_name, last_name, mobile}` (Prefer: return=minimal, user JWT).
  2. On success, if the Emails section is visible, a separate `_rbNotifyPatch({looks_ready, nudges, morning, morning_hour})`. Each switch newly turned on fires `_rbTrack('email_optin',{kind})`.
  3. "Saved." (sage), close after 900ms, sync `__robes_profile`, the avatar name and the greeting.
  4. Error: "Error saving — please try again."
- **Emails section (`__rbAcctEmailsSync` L122–133, re-synced on every open).** Three checkboxes:
  - "When my looks are ready": `looks_ready !== false`.
  - "Notes from Robes": `nudges === true`.
  - "A morning line on days I've planned at [6–10]": `morning === true`; `morning_hour` clamped 6–10, default 7.
  - Hidden when `_rbNotifyDown` (migration 22 not run). **The morning switch is the only place `morning:true` is set.**

##### 4.2 Notification preferences plumbing (client)
- `_rbNotifyDown` (L702) is true unless `__robes_profile.notification_prefs` is an object.
- `_rbNotifyPrefs()` (L704).
- `_rbNotifyPatch(partial)` (L712–729) serialises writes on a promise chain and merges over the in-memory prefs, because a JSONB PATCH replaces the whole column. It calls `_waFetch('PATCH','profiles?id=eq.uid',{notification_prefs: merged})` and flips `_rbNotifyDown` on a PGRST204 or column error.
- **Timezone** is written once when empty (`_rbNotifyTzInit` L735–745): `Intl…timeZone` → `{timezone}`.
- **`?from=email` capture** (L749–758): strips the param, `register({from_email:true})`, `_rbTrack('email_landed',{path})`.
- **Session-1 ask** (L27352–27383, inside the onboarding handoff card):
  - Copy: "Robes is composing your three looks. **Email me when they're ready →**" with the sub "and the odd note when your wardrobe's ready for more".
  - The tap (`__rbMailAsk`) calls `_rbNotifyPatch({looks_ready:true, nudges:true})`. One consent covers both. The line changes to "✓ Robes will email you." and fires `email_optin {kind:'looks_ready'}`.
  - The ask is hidden when `nudges===true` or `_rbNotifyDown`, and retires when the loading state ends.
- **Deep links the mails use:** `/inspiration?open=<id>`, `/stylenotes`, `/lookbook?open=<id>&fill=1`, `/lookbook?new=1&robes=1`, `/diary`, `/dashboard?d=YYYY-MM-DD` (all carry `&from=email`).

##### 4.3 Server: `notify.js` (411 lines) + `server.js` wiring (L170–236, L373–393)
- **Provider:** Resend over REST, no SDK. Env: `RESEND_API_KEY`, `EMAIL_FROM` (default `Robes <hello@byrobes.com>`), `NOTIFY_SECRET`, `RESEND_API_URL`, `NOTIFY_TICK=off`, `NOTIFY_DEBUG=1`. It is on only when the key, the service key and the secret are all present. `/api/health` reports `email`. **Nothing sends until byrobes.com is verified in Resend and the env vars are set.**
- **Scheduler:** first tick 60s after boot, then every 10 minutes.
- **`notifyTick`** (L281–400), one pass over every user. User emails come from `GET /auth/v1/admin/users` with the service key; `profiles` has no email column. It reads `notifications`, `events` (`model_filed`, `robes_build_opened`), `wardrobe_items`, `lookbook_items` (key-pieces from the last 48h), `planned_days` (−1 to +9 days) and looks with `look_pieces(wardrobe_items(image_url))`. `selectDegrade` strips missing columns.
- **Sequence** (first match wins, at most one per user per local day):
  1. `looks_ready`: newest key piece with 3 http frames, created in the last 48h, `looks_ready !== false`. Subject "Your three looks are ready."
  2. `look_waiting`: ≥24h since signup, no `avatar_id`, no `model_filed`, ≥1 look. Sent once. Subject "She'd wear it."
  3. `borrowing`: ≥72h, fewer than 5 photographed pieces, a look with ≥2 proposals. Sent once.
  4. `five`: ≥5 photographed pieces, 24h after the fifth, no `robes_build_opened`. Sent once.
  5. `week_empty`: ≥7 days, ≥1 look, no `planned_days` in the next 7 days, at most every 14 days.
  - Everything except `looks_ready` requires `nudges===true`.
- **Morning cue** (outside the daily cap): `morning===true`, the local hour equals `morning_hour`, and a planned_days row exists for today.
  - Subject "{Weekday} · {day title}". CTA `/dashboard?d=`.
  - The weather line appears only if a daily look filed a forecast.
  - Footer "Wore it? The day page takes it."
- **`sendMail`:** INSERT into `notifications` first (a 409 means already sent), then Resend with `List-Unsubscribe` + `One-Click`. A transport failure DELETEs the ledger row. Then an `events` row `email_sent {kind, ref}`.
- **Unsubscribe:** `GET|POST /api/notify/unsub?t=uid.prefKey.hmac` (HMAC-SHA256 under `NOTIFY_SECRET`, rate limit 30/min).
  - It merge-writes that one pref key to false.
  - Success page: "Done — Robes won't email you about this." A bad token returns 400 with "That link didn't work."
  - `POST /api/notify/tick` is mounted only under `NOTIFY_DEBUG=1`.
- **Migration 22 (not run):** `profiles.notification_prefs jsonb default '{}'` plus `notifications(user_id, kind, ref, sent_at, unique(user_id,kind,ref))`. Own-read and admin-read RLS; service-key writes only.
- **Receipt mail:** `sendReceiptMail` `receipt_held` is the inbox feature (another area).

##### 4.4 Gender identity (migration 13)
- Column `profiles.gender_identity text not null default 'woman' check in ('woman','man','unspecified')`.
- **UI:** the Your Model Presence row only (stylenotes L1237–1248). It was moved out of Account details on 2026-09-01; the `__acctGender*` handlers were deleted.
- **Readers:** `_rbGender()` (personalize L28) normalises to 'woman'. It is sent as `gender` on every generation POST. The server's `normGender()` and `genderDirective(g)` make `man` mean menswear only.
- **PostHog:** deliberately excluded from person properties.

---

#### 5. PWA
- **`public/manifest.json`:** name and short_name "Robes"; description "Your personal stylist — one prompt gets you dressed for anything."; `start_url:/dashboard`; `display:standalone`; background and theme `#202021`; icons `/images/robes-icon-192.png` (any) and `/images/robes-icon-512.png` (any maskable).
- **Every page head** (index, signup, reset, onboarding, dashboard, stylenotes, look, board, privacy, terms) has `<link rel=icon 64px>`, `<link rel=apple-touch-icon href=/apple-touch-icon.png>`, `<link rel=manifest>`, `<meta name=apple-mobile-web-app-title content=Robes>` and `<meta name=theme-color content=#202021>`. specimen.html has none of these.
- **There is no service worker** (grep confirms), no offline support and no `beforeinstallprompt` handling.
- The onboarding Add-to-Home-Screen nudge was removed in optimisation 4.7: it mis-rendered on Chrome/desktop. So installation is whatever the browser offers natively.
- No `apple-mobile-web-app-capable` meta is present.
- **Rebuild:** keep the manifest values. Adding a service worker is a new decision.

---

#### 6. PUBLIC / MARKETING PAGES

##### 6.1 `public/index.html` (494 lines) + `public/js/app.js` (906 lines)
- **Served** as the static `/` (the `express.static` root). This branch's index is the beta homepage, **not** the waitlist.
  - Nav: wordmark + "Get started" → `/signup.html`.
  - Session door script (L26–32): a stored token redirects to `/dashboard`.
  - Hero: eyebrow "Your personal stylist"; H1 "One prompt. *Dressed for anything.*"; sub "Your wardrobe, the brands you love, and the looks that inspire you — one prompt pulls it all together."; "Get started" → `/signup.html`; "Already have an account? *Sign in*" → `/signup.html?mode=signin`.
  - A floating prompt card with typewriter prompts (`prepLanding` app.js L113–136, the `LC_PROMPTS` list).
  - "How it works": 01 Define your style / 02 Ask Robes / 03 Get dressed.
  - "What do you need today?" cards (Daily / This week / Travel / Seasonal), all → `/signup.html`.
  - Coco Chanel quote; footer "The world is your runway" / "© 2026 Robes".
  - `.reveal` sections fade in via IntersectionObserver (threshold 0.12).
- **Dead code:** the old anonymous key-piece funnel is still in the DOM and app.js.
  - Screens `#s-name`, `#s-capture`, `#s-gen`, `#s-result`, the flow modal `#fm-dialog`, the share modal and the tweaks panel.
  - Functions `callStyle`→`/api/style`, `pollImages`→`/api/images/:id`, `saveLook`→`/api/look`, `feedbackSubmit`→`/api/feedback`, `shareTo`→`/api/instagram`, plus the Google Form link `forms.gle/bUqWkRJq7VXW986t9`.
  - **No element in index.html calls `App.startFlow`, `App.next` or `App.openModal`**, so all of this is unreachable (the wordmark's `App.goHome` only reshows the landing).
  - The "Tweaks" panel is a Claude-Design edit-mode postMessage bridge (app.js L862–903).
  - **Do not port it.** `/api/waitlist` is also unused on this branch.

##### 6.2 `public/look.html` (378 lines): `/look/:id` share page
- **Served** by `server.js` L2240. The client (`View.init`) takes the id from the last path segment and calls `GET /api/look/:id` → `{name, piece, photoUrl, ways[{eyebrow,title,outfit,details,accessories,tags[]}], generatedImages[], fallback, created}`.
  - Data comes from the in-memory `lookStore` (48h), falling back to Airtable `Feedback` by `Piece Link` (L2199–2238).
- **Renders:**
  - Title "{Owner}'s Robes edit — shared with you".
  - Piece chip. The hero image is `photoUrl`, or the Balmain waistcoat image when `fallback`.
  - A 3-cell collage and an editorial stack of three looks (The Outfit / Key Details / Accessories / Styled with chips).
  - A sticky bar after the hero: "Get dressed by Robes." with "Join the waitlist" → `https://www.byrobes.com` (hardcoded).
  - Not found: "This look has *expired.*" / "Shared looks are available for 48 hours…" with "Style your key piece" → `/`.
- **Writer:** `POST /api/look` (L2159) is called only by the dead app.js flow. **Nothing in the beta app creates `/look/:id` links any more**; board.html (`/board/:shareId`) is the live share path.
- **Treat this page as a legacy production (`main`) artefact.**

##### 6.3 `public/privacy.html` / `public/terms.html`
- Static prose at `/privacy` (L2444) and `/terms` (L2440). Both load PostHog. Foot link "← Back to sign up".
- **Privacy** ("Last updated September 2026") covers:
  - What we collect.
  - How it's used, naming Gemini, Anthropic, Cloudinary, Supabase, Airtable and PostHog EU.
  - Session recordings (everything typed is recorded except passwords; wardrobe photos appear).
  - Emails from Robes (Resend, no pixels, one-click stop).
  - Receipts you forward.
  - Your choices (photos optional; deletion by email).
  - Contact hello@byrobes.com.
- **Terms** ("Last updated July 2026"): what Robes is, your account (16+), your content, beta expectations, contact.
- Both need a legal owner in the rebuild. There is no consent gate for PostHog replay (flagged in CLAUDE.md L215–216).

##### 6.4 `public/specimen.html` (253 lines)
- **Brand guidelines v1.0 (July 2026)**, `noindex`, not routed explicitly (it is reachable at `/specimen.html` as a static file), and has no PostHog.
- It renders the tokens live from `/css/tokens.css`:
  - Typography: Cormorant 300–400 display with a ≥17px serif floor; Inter 300/400/500; 9px UI floor.
  - Colour tokens with a WCAG contrast table.
  - Radii 8/12/14/18 and 100px pills.
  - Canvas: shell 1440, nav 64, gutter ladder.
  - Component language (ink pill, hairline pill, dashed = invitation, selected = cream fill, typographic symbols only).
  - Voice rules: never "AI" or "Generating…"; banned words effortlessly / elevated / versatile / perfect for / ensuring; no exclamation marks; honesty below 15 pieces.
  - Accessibility floor.
- **Use it as the design-system source for the rebuild,** not as a page.



### 2B. Wardrobe, add a piece, piece page, wishlist, inspiration

Unless a path is given, "DP" means `/Users/niallmaher/Projects/robes-mvp/public/js/dashboard-personalize.js` and "CL" means `/Users/niallmaher/Projects/robes-mvp/CLAUDE.md`. Line numbers were taken on branch `platform` at commit 2aef362.

**Where the other code lives**
- **Bundle chunks** in `public/dashboard-assets/*.js`:
  - `063068d4…js` is `const App` (the app controller, with private `renderWardrobe` and `showView`).
  - `144529f6…js` is `const Dash` (the prompt and its `PROMPT_EXAMPLES`).
  - `3cfe34e4…js` is `window.WA` (the add-to-wardrobe modal: `open/close/onFile/pickColour/validate/submit`).
  - `a4efbfe6…js` is `window.KP` (the key-piece modal and `KP.comingSoon`).
  - `8c8db126…js` is a design "Tweaks" host protocol.
  - `2586a7a2…js` is an `<image-slot>` scaffold.
  - DP patches all of these at runtime. None of them should be ported; rebuild from DP's behaviour.
- **Static markup**:
  - `public/dashboard.html`: the wardrobe panel `#wardrobe-panel` at l.2318 (`#wg-filters` l.2324, `#wg-grid` l.2325), the `#wa-modal` bundle form at l.2489, the `#cs-modal` Coming-soon at l.2471, the `#wtrk` tracker section at l.2099.
  - The boot's profile select is at l.2614–2644. It reads the trigger-maintained `profiles.wardrobe_items_count`.

**Schema degrade flags.** Every surface in this area probes the schema. Client flags flip off on PGRST204 or 42P01:
- `_waV2Cols` (migration 10)
- `_waTaxCols` (migration 15)
- `_waV3Cols` and `_wlV23Cols` (migration 23)
- `_tgDown` (migration 17)
- `_wiDown` (migration 23)
- `_wlTableMissing` (migration 10)

Per CL l.1110–1133, migrations 17, 18, 19, 22 and 23 are marked **NOT yet run** on `Robes_p0`. A rebuild should assume the final schema and drop all of this probing.

---

#### 1. Wardrobe (`/wardrobe`)

##### User-visible behaviour

**Routing and boot**
- The server serves `dashboard.html` for `GET /wardrobe` (server.js l.2254) and for `/wishlist` (l.2280).
- The boot branch at DP l.5178–5195 calls `App.showWardrobe()` after 100ms.
- `?receipts=1` is stripped with `replaceState`. The boot then polls every 250ms, up to 40 tries, until `_wiLoaded || _wiDown`, and calls `__waInboxOpen()` if any receipts are held.
  - With one receipt held, it steps straight into that receipt's review.
  - With two or more, it opens the list.
  - With none, she stays on the wardrobe with no modal.
- `?from=email` is captured separately by `_rbEmailLand` (DP l.~756), which fires the event `email_landed {path}` plus a PostHog super-prop `from_email`.
- The patched `App.showWardrobe` (DP l.5164–5170) does this in order: `__rbCloseResultOverlays()`, then the original, then `_waBuildFilters()`, then `_waRender()`, then `_waLoad()`.
- To close the panel programmatically use `App.goHome()` (CL l.924). `showWardrobe` never toggles the panel closed.

**Masthead** (built in `_waV2Setup`, DP l.4948–5131; the relevant part is l.5070–5130)
- `#rb-wsub` has the text tabs **Wardrobe | Wishlist**. The Wishlist tab reads `Wishlist (N)`.
- `.rb-mast-acts` holds two pills:
  - `#rb-add-pill`: "+ Add piece", or "+ Save a piece" on the wishlist view.
  - `#rb-refine-pill`: "Refine", with a count badge.
- The FAB and the "Pack a trip" pill are retired. `__wgPack*` still exists at DP l.1415–1490 but has no door.
- `_waV2Sync` (DP l.4664–4705) switches the title between "Your wardrobe" and "Your wishlist", the count (`#wg-count`) between "N pieces" and "N saved", and toggles the filters, trail, grid and wishlist grid.
  - `#rb-wl-grid` must be set to `display:grid` explicitly.

**Category tab row, the "top ten"** (`_waTabsPaint`, DP l.1549–1596; CL l.524–527)
- The tabs are light text tabs (`.wg-tab`) over the sheet's 14 L1 categories plus Other (`_WA_TAB_CATS`, DP l.437–438).
- Which tabs appear: the top 10 by piece count.
- Their order: canonical sheet order, with **All** first. Ties break in sheet order.
- Everything else sits behind one **"More ▾"** tab (`__waMoreTap`, DP l.1597–1616). It opens a fixed popover `#rb-wg-morepop` at z-990 that lists each category with its count and dismisses on an outside click.
- The row never wraps. On mobile it scrolls horizontally.
- An active category is never hidden. If picked from More, it moves into the row.
- The tabs are re-ranked on every `_waRender`.
- `_waSheetCatOf(it)` (DP l.459) decides a piece's tab: its L2 wins; otherwise the legacy category maps through `_WA_LEGACY_TO_SHEET`.

**Cascade** (`__waCatTap` l.1645; `_waCascadeOpen/Paint` l.1676–1775)
- A tab whose category has L2s in `_waTaxTree` opens a Subcategory › Item type flyout. On desktop it is a two-column flyout; on mobile it is a bottom sheet, where every pick applies the filter and closes.
- The drill state is `_waDrill {l2,l3}`.
- The repainter stands down while `#rb-wg-cascade` is open.

**Trail row** (`#rb-wg-trail`, built in `_waBuildFilters` l.1619–1642; `_waTrailSync` l.1788–1799)
- It shows "Robes › Bottoms › Jeans › Barrel-leg jeans ✕" followed by an italic serif live count, "N pieces".
- With All selected it shows only the count.
- ✕ calls `__waTrailClear`, which clears the category trail. Refine picks survive it.

**Receipt notice** (`#rb-wg-inbox`, `_wiSync` DP l.3710–3729)
- It sits under the trail and never on the wishlist view.
- Copy: "✦ Robes read {two} receipt(s) · N pieces waiting · Review them →" (the button calls `__waInboxOpen`).
- It disappears the moment the last receipt is filed. There is no toast and no "caught up" state.

**Grid** (`_waRender`, DP l.819–881)
- Loading state: "Opening your wardrobe…" (serif italic).
- **One-door empty state** at 0 pieces (DP l.838–853; CL l.524–528): one white card only.
  - Eyebrow "Your wardrobe", headline "Every look starts with *a photograph.*"
  - Ink button "Catalogue your wardrobe", which calls `WA.open()` (a bare open lands on the photo step).
  - Underlined link "Or photograph what you're wearing now", which also calls `WA.open()`.
  - There is no add card, no ghost tiles and no milestone bar. The `.rb-add-card` comes back with the first piece and stays.
- Filter miss: "Nothing matches those filters." plus a clear button (`__waFiltersClear`).
- Sort order:
  - In-season heroes (`hero_position != null && _waInSeasonNow`) come first, by `hero_position`.
  - Everything else keeps the server's `created_at desc` order.
  - An off-season hero stays in its normal slot with a filled star.
- Scroll position is preserved across the innerHTML swap.
- A `MutationObserver` on `#wg-grid` (`_waObserver`, l.809) re-renders whenever the bundle overwrites the grid. This is legacy-only.

**Card** (`_waCard`, DP l.1492–1523)
- Image, or an SVG placeholder.
- A "Never worn" badge when `times_worn === 0`.
- A star button `.rb-star`, always visible, which calls `__waHeroToggle`.
- Name, then "brand · N× worn".
- Tapping the card calls `__rbPieceOpen(id, {from:'wardrobe'})`, which opens the piece page, not the editor.

**Add card** (`_waAddCard`, l.1525–1535): "+ / Add a piece / Photograph · Receipt · Link". It calls `__waAddChooser()`.

**Hero Rack** (CL l.931–934 superseded by l.881–886; DP l.4118, l.4215–4309)
- There is no separate rail. The star is the whole surface.
- `_WA_HERO_CAP = 10`. At the cap the toast reads "The Hero Rack holds 10 — remove one first".
- The toggle is optimistic: it PATCHes `hero_position` (max+1, or null) and reverts on error.
- Toasts: "Saved to your Hero Rack" / "Removed from your Hero Rack".
- Season-aware:
  - `_waSeasonNow()` returns `spring_summer` for April–September, otherwise `autumn_winter` (l.4149).
  - `_waInSeasonNow` treats `year_round` or an untagged piece as always in season.
  - Note: the current code reads `season_band` (ADR-002), not the `seasons[]` array the older docs describe.
- `__waHeroPicker` (l.4256) is a door-less "Build your Hero Rack" modal. Code-only.
- Heroes are prioritised in generation via `hero:true + seasons` in the payloads (server `heroMark`/`heroDirective`; CL l.884). That belongs to another area.

**Refine drawer** (`#rb-refine`; `_waRefineRender` DP l.4340–4406; state `_waRefine = {seasons, colors, wear, brand, src}` l.3846; matcher `_waMatchRefine` l.4167–4190)

Sections:
- **Season**: three band chips, Spring/Summer · Autumn/Winter · Year-round (`WA_BANDS`, l.4114). A `year_round` piece passes any season pick.
- **Wear it for**: the seed vocabulary Everyday, Work, Evening, Occasion, Travel, Active, Lounge (`_TG_WEAR_SEEDS`, l.~3866), plus her own tags, plus tags found on her pieces.
  - A piece tagged Everyday (untagged counts as Everyday) passes any wear pick.
  - `_tgWearOf` reads `tag_pieces`, or falls back to legacy `occasions[]`.
- **Colour**: the full 21-swatch `_ALL_SWATCHES` grid, plus any off-palette colours she owns as chips. It shows an italic note "X, Y selected".
- **Brand**: a `<select>` built from her pieces. It renders only if she owns any branded piece.
- **Added from · Receipts**: renders only once a piece with `item_dna.source.kind === 'receipt'` exists, or the pick is live (`_waItemSrc` l.4191; `__waRefSrc`).

Footer: "Clear all" and "Show N pieces".
- On mobile the drawer is a bottom sheet with a "Refine ✕" header.
- The pill badge counts active picks (`_waRefineCount`, `_waRefinePillSync` l.4331).
- Filtering is `_waFilteredItems()` (l.4199): category tab AND drill L2/L3 AND Refine.

**Counts** (`_waSyncCounts`, DP l.1296–1411)
- Fills `#wg-count` "N piece(s)" (skipped on the wishlist view) and the hidden nav badge `.nav-wbtn-count`.
- Seeds the prompt typewriter examples from her newest labels (`window.__rbPromptExamples`).
- Fills the tracker internals, then calls `_rbFtueOrder`, `_rbGateConcierge`, `_lkHomeSync` and `_rbSilPrompt`.

##### Learning meter and cold-start thresholds (CL l.747–754, l.463–469, l.112–122; DP l.883–1130)

**The ladder**
- `_MS_UNLOCKS` (l.898–902):
  - 5 → "Builds a daily look" (pos 25)
  - 10 → "Plans a week of outfits" (pos 50)
  - 15 → "Knows your taste" (pos 78)
- `_WA_TARGET = 15`, `_MS_SCALE = 20`.
- `_msFillPct` (l.1002) interpolates piecewise so each tick meets its milestone exactly. The track fades out after 75%, so it never reads full.
- `_LK_ROBES_AT` equals 5, counted on photographed pieces (`_lkRobesPics`, l.910).

**Handoff rules (hard)**
- Never render a denominator ("n/15", "n of 15").
- The track never fills to 100%.
- Never use "lock" or "unlock" in copy.
- Milestones name capabilities, not features.

**Headline** (`_msHeadline`, l.945)
- At 0: "Five pieces and Robes builds a daily look."
- When a milestone was just crossed (tracked by the localStorage key `rb_ms_last__<uid>`): "Robes {does} now. {N} more pieces and it {next}."

**Where it renders now**
- The home concierge band: `#rb-svc-learn`, "Robes is learning · N pieces filed" plus the bar (`_rbConciergeSync`, DP l.1139–1245).
- `#rb-svc-filed`: a receipt-style row with one thumbnail of the newest piece, "{Category} · Your first filed piece" or "Last filed", "N pieces in your wardrobe · See all →" (`__rbSvcAll`), "One photo files four pieces." and "Catalogue what you're wearing now" (`__rbSvcSnap` → `_wtrkOpenAdd`).
- The band (`_rbGateConcierge`, l.1246) shows only when there is no `#rb-styled` card, `_rbConciergeDone()` is false, the home mode is not `look`, and `n < 15`.

**Tracker widget `#wtrk`**
- It is permanently hidden (`display:none`, DP l.1364–1365). It stays in the DOM only as `_rbApplyLayout`'s anchor, but its internals still paint:
  - `#wtrk-num` shows a bare count with "Piece(s) filed".
  - `#wtrk-items` shows the first 12 tiles, hero-first with a star badge; each tile calls `__wtrkEdit(id)`, which opens the edit modal.
  - A "+N more" tile calls `App.showWardrobe`; an "Add" tile calls `_wtrkOpenAdd`.
  - `#wtrk-cta` reads "Add your first pieces" or "Add pieces".
- **Recommendation:** do not rebuild `#wtrk`. Rebuild the concierge-band meter instead.

**Toast thresholds after a single add** (DP l.3499–3505)
- At 15 or more pieces: "Added to wardrobe".
- On the fifth photographed piece: "Five pieces filed. Robes can build a look from yours now."
- Otherwise: "Added — N pieces filed. Each one replaces a borrowed piece in your looks."

**Other count gates**
- `_rbSilPrompt` (Style-notes dark card) appears at 15 pieces or more (l.24523).
- The 15-piece styling posture is server-side (`styleDnaPromptBlock`; CL l.1554–1558).

##### Data and APIs
- `GET /rest/v1/wardrobe_items?user_id=eq.<uid>&order=created_at.desc&select=*` (`_waLoad`, DP l.775–802).
  - It retries 3 times with 1.5s × n backoff.
  - It then awaits `_tgLoad()`, which GETs `tags`, `tag_pieces` and `tag_looks`.
  - It chains `_wlLoad()` and `_wiLoad()`. `_waInit` (l.5134) polls every 250ms for a uid, then runs `_waLoad().then(_lkLoad)`.
- `PATCH wardrobe_items?id=eq.<id> {hero_position}` (l.4244).
- `GET /api/wardrobe/taxonomy` at boot (DP l.469–478) returns `{groups: TAXONOMY_GROUPS, tagDefaults, wearSeeds}` with a 1h cache (server.js l.2480–2487).

---

#### 2. Add a piece

##### 2.0 The modal shell and its entry points

**How `WA.open` works** (patched in `_patchWA`, DP l.3172–3300; the three-step closure is `_waSetupAutoTag`, l.1816–3302)
- `WA.open(opts)` accepts `opts.way` ∈ `choose | photo | mail | url | receipts`, `opts.target` ∈ `wardrobe | wishlist`, and `opts.brief`.
- A bare `WA.open()` lands on the photo step. Snap-mine, briefs and the empty state all rely on this.
- Edit mode is `_waEditId` set before open. It ignores `way`, `target` and `brief`.
- `WA.close` (l.3270) resets the batch queue, brief, chooser flag, target, `_waForm`, `__rbWaDetail` and `__waSawTaxSel`.
- The modal DOM is the bundle's `#wa-modal .fm-step`, with step dots from `_setDot`.
- Legacy hack: a hidden dummy `#wa-label-in` is re-appended on every paint because the bundle focuses it on a 220ms timer. Do not port it.

**Entry points**
- `__waAddChooser` (l.4628): the add card and `#rb-add-pill`. It opens the chooser, or `__wlOpenAdd` when on the wishlist view.
- `_wtrkOpenAdd` (l.1287): the home add door. It opens **briefed** for the newest look that still has open proposals (`_rbLookGapsNewest`, l.15371), firing `fill_opened {door:'filed', gaps}`. Otherwise it is a bare open.
- The empty-state buttons use a bare open.
- `__waInboxOpen` (l.4617) uses `{way:'receipts'}`.
- `__wlOpenAdd` / `__wlSoonLink` (l.4606/4556) use `{way:'choose'|'url', target:'wishlist'}`.
- Snap-mine callers set `_waAfterAdd = fn(newId)` and use a bare open (e.g. travel, DP l.21611).

**Ways chooser** (`_showChooser`, DP l.2111–2132; CL l.35–45)
- Wardrobe copy: "Add a piece. / However it reaches you."
- Wishlist copy: "Save a piece. / To your wishlist — however it catches your eye."
- Rows:
  - **Photograph it**: "One photo. Robes reads the rest." (Wishlist: "A screenshot, a photo — Robes reads what it can.")
  - **Forward a receipt**: "N receipt(s) is/are waiting for you to look over." when any are held, else "Send the order email. Robes files what's in it."
  - **Paste a link**: "A product page from anywhere."
  - Dashed **Add without a photo**: "Name it yourself. The photograph can come later."
- Rule: no ink fill on the chooser. Every sub-step coming from the chooser carries "← Other ways in"; the photo step shows that in place of "Add without a photo" (`_waFromChooser`).

**Brief mode** (slice 4; CL l.104–110)
- `_waBrief = {lookId, lookName, gaps:[{name,cats,chip,done}], landed, door}`.
- Step 1 reads "Make *{look}* yours." with a "Looking for:" chip line (`_waBriefHtml`, l.1955). The line repeats on steps 2 and 3, and a landed gap is struck through.
- After save, `_lkFillLand(brief,row)` (l.15376) matches the row's category against an open proposal. On a match it adopts via `_lkPropAdopt`: PATCH the look, move the piece into `look_pieces`, and toast "{label} is in {look} now."
- When the batch ends with something landed, the look opens (`__lkOpen`) and `fill_closed {landed,gaps}` fires.
- An armed `_waAfterAdd` wins over the brief.

##### 2.1 Photograph it (`_showStep1` DP l.1969–2086; `_runStep2` l.2370–2432)

**Step 1 copy** (CL l.405–418)
- "Add your pieces. / One or twenty. Robes reads the colour, the cut and the label — and fills in the rest."
- Wishlist variant: "Save what catches your eye."

**Drop zone**
- A stacked-photos glyph.
- Desktop: "Drop in as many as you like · Robes files them one after another.", an ink **Choose photos** button and "or take a photo".
- Mobile (≤767px): "Add as many as you like", ink **Attach photos** and outlined **Take a photo**.

**Three file inputs**
- `#wa-rb-file`: multiple, with an extension list (desktop and drag-drop).
- `#wa-rb-lib`: `accept=image/*`, multiple (mobile library).
- `#wa-rb-cam`: `capture="environment"` (camera).
- iOS always shows its source sheet on a non-capture input. That is the platform ceiling (CL l.674 bullet 2).

**Images**
- Downscaled client-side by `_rbDownscale` (l.594): max 1600px, JPEG q0.85, falling back to a FileReader data URL.

**Batch add**
- `_waBatchQueue/Total/Done/_waBatchAdvance` (l.580, l.1944).
- Selecting several photos queues the rest. Each save pulls the next photo straight into step 2 without closing the modal.
- A "PIECE n OF m" tag shows on each step.
- Toasts: "Piece n of m added", then "All m pieces in your wardrobe".
- A Retake mid-batch replaces the current photo and keeps the queue.

**Step 2** ("Reading your piece… / One moment — Robes is looking at the photo.")
- A dark photo panel with a scan line and corner brackets. Captions cycle every 1.8s: "Identifying colour and fabric…", "Reading the silhouette…", "Checking for brand details…".
- Calls `POST /api/wardrobe/analyse {data: base64, mimeType, userId}`.
- On a network error it proceeds to step 3 with an empty tag. Note: the in-app add has **no** retry. The retry exists only in the Inspiration scan (DP l.6975) and the onboarding handoff (DP l.27556).

**`POST /api/wardrobe/analyse`** (server.js l.2489–2583; schema l.2449–2477)
- Unauthenticated. `userId` is used only for logging via `genCtx`.
- Model: gemini-2.5-flash, temperature 0, thinkingBudget 0, maxOutputTokens 760, with `ANALYSE_SCHEMA`. The prompt embeds `taxonomyPromptBlock()` and the colour list.
- Success response:
  `{label, category (legacy enum, decided by resolveTaxonomy fold when l2/l3 valid), category_l2, category_l3, color, brand, price:number|null, currency:ISO|null, size|null, notes, item_dna:{display:{title, editorial_color_name, primary_color_hex, brand_raw}, structural_dna:{silhouette_fit[]}, formality:'casual'|'smart'|'formal'|'black_tie'|'', llm_styling_context:{}, ai_generated_notes}}`
- Other outcomes: `{noItemDetected:true, …empty}`, or on any Gemini error a **200** with `{analysisFailed:true, …empty}`.

##### 2.2 The one confirm screen (`_runStep3` l.3075–3105; `_waFormPaint` l.2674–2921; CL l.674–686)

**State**
- `_waForm = {mode:'add'|'manual'|'edit', view:'summary'|'details'|'tags', photo, readable, revealed, src}`.
- Field state lives on window globals: `__waSawLabel/Brand/Notes/Color/Price/Size/Src/SrcUrl/Cat/L2/L3/ItemDna/TaxSel`, plus `__rbWaDetail {band, wear[], bandTouched, wearTouched, addingTag}`.
- The analysed colour goes through `GEMINI_MAP` (l.2630) to the palette name.
- Notes come from `item_dna.ai_generated_notes || notes`.

**Summary view** (readable and has a photo)
- "Here's what Robes *saw.*"
- Sub-line: "Filed from your photo…". Link variant: "Read from the page — adjust the details only if something isn't quite right."
- A photo panel with up to 5 staggered tag pops (sheet L1, L2, brand, colour, L3) and a label banner.
- A four-row ledger that fills row by row every 420ms ("Reading" → value): **01 The piece · 02 Brand ("Unlabelled" if empty) · 03 Category (sheet L1) · 04 Colour (with a dot)**. Tapping a row opens details focused on that field.
- A Retake chip ("↺ Retake", or "↺ Another link").
- The toggle "Edit the details ▾".
- The CTA **"Add to wardrobe →"** (wishlist: "Save to wishlist →").

**Details view** (also the landing for unreadable, manual and edit)
- Header:
  - Compact head: a 64px thumb, the title, a meta line "brand · sheet · L3 · colour · £340 · Size 38", and Retake / Change photo / Add a photo.
  - For unreadable or manual: "Add a piece." with "Robes couldn't quite read this one — give it a name and it files all the same."
- Fields:
  - **The piece**: text input.
  - **Brand**: text input.
  - **Category**: a custom picker, never a native select (`__waFieldPick` → `_waPopShell`: anchored popover on desktop, bottom sheet on mobile).
  - **Subcategory / Item type**: only when the tree loaded and the sheet has L2s; Item type is disabled until an L2 is picked.
  - **Colour**: a single swatch plus a quiet "Change", which opens the `__waColourPop` palette popover.
  - Wishlist only: "Where did you spot it?" chips (`_WL_PICK`, l.4611): Screenshot, Instagram, Substack, In person, A link. The default is Screenshot on a scan and A link on a page read.

**Tags view** ("+ Add tags and notes", with a hint "season, wear it for, price, size, notes" or "N set")
- **Season**: single-select, one of three bands (ADR-002 §1). Never empty; Year-round is the default. It is pre-filled at paint from `_waDetailSeed(category,l2)` using the served `tagDefaults` (l.4094–4113), and the pre-fill stops once she touches it.
- **Wear it for**: multi-select over the seed and custom tag namespace, plus a "+ tag" input (up to 28 chars, slugged by `_rbTagSlug`). Everyday is the default.
- **Price / Size**: "Both optional. Robes fills them in when a receipt or a link carries them."
- **Notes**: placeholder "Fit, fabric, how you like to wear it."
- A wishlist add shows Price, Size and Notes only.

**Rules**
- A default state is displayed, never stored. A lone default is stripped back to null at save.
- `season_source='user'` only if she touched the chip (`bandTouched`).
- Wear links are written only if `wearTouched`. Otherwise the DB trigger's inferred pre-fill stands (migration 18, `trg_wardrobe_tag_defaults`).
- Silhouette & fit is cut from the UI entirely. It is still stored in `item_dna.structural_dna.silhouette_fit`.
- Price, fit_confidence, sentiment and hero_position are omitted from the payload except price, which is written on every save since 2026-09-22.

**Empty-label guard** (`__waSawSubmit`, l.3107–3170)
- A blank name opens details, gives the name field a red border and shows "Give the piece a name first — even "black blazer" will do."
- Legacy only: it then fills the hidden bundle form and calls `WA.submit` after 50ms.

**Save** (`WA.submit`, DP l.3307–3565)
1. Image:
   - Edit keeps the existing `image_url`.
   - An http tile src (a link read) is used as-is.
   - A data URL is sent to `POST /api/wardrobe/upload {data, mimeType}` → `{url}`. This is Cloudinary with an `f_auto,q_auto` rewrite (server.js l.3375–3386, l.~288). An upload failure is swallowed and the piece saves without a photo.
2. `item_dna`: merge in `display.editorial_color_name = colour` and `ai_generated_notes = notes`.
3. Payload:
   - `{user_id, label, category (legacy, = _waTaxLegacy(sheet,l2,l3)), color, brand, notes, image_url, item_dna}`
   - `+ season_band [+ season_source:'user']` (v2 tier)
   - `+ price` (v2 tier; parsed by `_waPriceParse`, l.3656)
   - `+ size (≤40), currency` (v3 tier)
   - `+ category_l2/l3` (tax tier)
   - A manual category that contradicts the filed L2 drops the pair (`_WA_TAX_L2`, l.4125).
4. `_waRowWrite(editId, payload, hasDet)` (l.3613–3652) POSTs or PATCHes with a strip-and-retry ladder on PGRST204.
5. `_tgSetLinks('piece', id, 'wear_for', slugs, 'user')` (l.4031) when `wearTouched`.
6. Event `wardrobe_added {label, category, source:'app', batch_n, batch_i}`.
7. Close, or advance the batch; then `_waLoad()`, the toast, the brief landing and the `_waAfterAdd(newId)` hook.

**Errors**
- A 401 or JWT failure toasts "Your session went quiet — refresh the page and try again".
- Anything else toasts "Something went wrong — try again".

**Colour palette `_ALL_SWATCHES`** (DP l.537–559; CL l.1423–1435)
- Foundations: White #FFFFFF, Cream #F5F5DC, Navy #2C3E50, Charcoal #4A4A4A, Black #000000, Espresso #2B1E18.
- Dimension Builders: Camel #D2B48C, Taupe #8B8589, Olive #556B2F, Aubergine #4B0082, Forest #123524, Bordeaux #4A0E17, Blush #E6C2B6.
- Exclamation Points: Ochre #D4AF37, Magenta #FF1493, Cobalt #0047AB, Emerald #00A86B, Vermillion #FF4500, Acid #E1FD2E, Multi (conic gradient), Print (45° stripe on #EDE8E0).
- `_waSwatchBg(name)` (l.563) is the one renderer:
  - White gets an inset border.
  - An unknown name gets a cream disc.

**Three-level taxonomy** (CL l.687–697)
- Source of truth: `/Users/niallmaher/Projects/robes-mvp/wardrobe_taxonomy.js`.
  - `TAXONOMY_GROUPS` (l.23): 350 L3s, 55 L2s, 14 sheet L1s, each node carrying its legacy `l1`.
  - `resolveTaxonomy(l2,l3)` (l.130): case-insensitive. An unknown L3 degrades to the L2; an unknown L2 returns null.
  - `taxonomyPromptBlock()` (l.148).
  - `SEASON_BANDS`, `WEAR_SEEDS`, `defaultTagsFor` and `tagDefaultRows` (l.169–251).
- Migration 15 adds `wardrobe_items.category_l2/l3`, the `wardrobe_taxonomy` table (PK `(l2,l3)`) and a composite FK.
- Client duplicates to delete in the rebuild: `_WA_SHEET_CATS`, `_WA_TAB_CATS`, `_WA_LEGACY_TO_SHEET`, `_WA_SHEET_DEFAULT_LEGACY`, `_WA_L2_SHEET` (DP l.437–458) and `_WA_TAX_L2` (l.4125).
- Stored `category` is always the legacy enum: Tops, Bottoms, Dresses, Outerwear, Shoes, Bags, Accessories, Swimwear, Other. Displayed L1 is the sheet's 14 categories.

**`item_dna` and silhouette** (CL l.1464–1474)
- `item_dna` is JSONB with a GIN index.
- Shape: `{display, structural_dna.silhouette_fit[], formality, llm_styling_context, ai_generated_notes, source?:{kind:'url'|'receipt', url, site | retailer, order_ref, inbox_id}}`.
- The silhouette pills described in CL l.1470 are **retired** from the UI (CL l.674–686).

##### 2.3 Paste a link (`_showUrlStep` l.2189–2208; `__waUrlRead` l.2225–2248)

**Screen**
- "From a link. / Paste the product page and Robes reads the piece out of it."
- A URL input with a **Read it** button, and the note "Any retailer product page. Robes takes the name, brand, colour, price and size, and leaves the rest."
- Validation on the client: `/^https?:\/\/\S+\.\S+/`.
- Wait state: "Robes is reading it. / A moment." (`_showReading`), with a 45s abort.

**`POST /api/wardrobe/read-url {url, userId}`** (server.js l.362–368)
- Rate limit 20 per minute. Unauthenticated.
- Calls `inbox.readProductPage` (inbox.js l.523–571):
  - `safeHttpUrl` acts as the SSRF guard.
  - Fetches with a browser UA, 12s timeout, 2MB cap.
  - `productHints` reads JSON-LD Product and OpenGraph first.
  - `htmlToText` limited to 12k characters.
  - `PRODUCT_SCHEMA`, Gemini text call, 900 tokens.
  - Structured price and image outrank the model.
  - `normalisePiece` (l.260).
  - The image is hosted on Cloudinary immediately.
- Response: the analyse shape plus `image_url`, `item_dna.source {kind:'url', url, site}`.
- Errors: 400 `bad_url`, or 422 with `unreachable | not_a_page | no_item | read_failed | off`.

**Error copy** (`_URL_ERRS`, l.2217): shown inline, with "Add it without a photo instead →".

**Success**
- `_runStep3(image_url, json, 'url')` lands on the same confirm screen.
- A page with no image lands on details with "Add a photo".
- Event `wardrobe_url_read {host}`.

##### 2.4 Forward a receipt

**Mail step** (`_showMailStep` l.2144–2181; CL l.21–27)
- Eyebrow "Forward a receipt", heading "Your own address."
- An address panel reading `<local>@in.byrobes.com`, with **Copy** (clipboard; toasts the address on failure; event `inbox_address_copied`).
- Three steps:
  - 01 "Forward the order email."
  - 02 "Robes reads each piece's colour, cut, label, price and sizing."
  - 03 "You review and verify before anything gets filed."
- With receipts held: "N pieces waiting · Review them →".
- Footer: ← Other ways in / **Got it**.
- When migration 23 is missing: "Robes' inbox isn't switched on for this account yet."

**Address minting** (`_wiAddress`, DP l.3731–3765; done on the client)
- GET `profiles?id=eq.<uid>&select=inbox_address`.
- If empty, mint `firstname(letters, ≤12, else 'robes')-XXXX` from the alphabet `abcdefghjkmnpqrstuvwxyz23456789` with `Math.random`.
- PATCH `profiles {inbox_address}`, retrying up to 4 times on 23505 (partial unique index).
- Event `inbox_address_minted`.

**Webhook `POST /api/inbox/receipt`** (server.js l.343–358; inbox.js `ingest` l.454–520)
- Authenticated by `INBOX_WEBHOOK_SECRET` (`?key=` or `x-inbox-key`) or a Resend svix signature over `req.rawBody`. With neither configured it returns 503.
- Steps:
  1. `normalizeInbound`: Resend, Postmark, Mailgun or a generic JSON relay.
  2. `localPartOf` finds the recipient on the domain.
  3. Look up the profile by `inbox_address` with the service key.
  4. If Resend sent only an id, fetch the body.
  5. `htmlToText` limited to 60k characters (pixels and logos dropped, `[image: url | alt]` kept).
  6. `readReceipt` with `RECEIPT_SCHEMA` and grounded rules: labels only as printed, else "REF …".
  7. `visionPass`: each product photo is re-read by `VISION_SCHEMA` (3 concurrent, max 24, 30s race). The photo decides label, category, L2/L3, colour and notes; the text keeps price, currency, size, quantity, returned and brand.
  8. `dedupeItems`.
  9. Host every image on Cloudinary.
  10. INSERT one `wardrobe_inbox` row `{user_id, source:'receipt', retailer, order_ref, subject, from_email, provider_id, items:jsonb[], status:'held'}`.
  11. Service-key `events` row `receipt_received {retailer, items, seen, inbox_id, order_ref}`, used by the admin record.
  12. `notifier.sendReceiptMail` (notify.js l.226–245): subject "Robes read your {Zara} receipt.", CTA "Review them/it" → `/wardrobe?receipts=1&from=email`. Gated only by `notification_prefs.receipts === false`; ledgered as `notifications.kind='receipt_held'`.
- Every decided outcome answers 200: `unknown_address`, `not_a_receipt`, `empty`. Only a thrown error returns 500.

**Held list** (`_showReceipts`, l.2251–2282)
- With exactly one receipt it opens that review directly.
- With none: "Nothing waiting. / Forward an order confirmation to your Robes address and its pieces appear here."
- Otherwise:
  - Eyebrow "Waiting for you", heading "{N} pieces read".
  - Rows: ✉ retailer · `_wiWhen` (This morning / Today / Yesterday / weekday / "12 Sep") · N pieces read.
  - Note: "Nothing is filed until you have been through it. Receipts wait as long as they need to."

**Review** (`__waRcptOpen` / `_showReview`, l.2285–2330)
- "← All receipts" appears only when more than one receipt is held.
- Eyebrow "From Zara · Today", heading "13 pieces read", then "Untick anything that went back."
- Rows: tick, a 46×60 thumb or monogram, brand eyebrow, name, "£340 · Size 38 · × 2".
- Everything starts ticked except rows where `returned` is true.
- A landing toggle: "Filing to your wardrobe · To the wishlist instead →", or the reverse.
- Footer: "N pieces chosen · Nothing to keep" and the ink CTA **File N pieces** (or "Save N pieces").

**Filing** (`_wiFile`, DP l.3768–3831)
- Writes one row per ticked item through `_waRowWrite`, with `item_dna.source {kind:'receipt', retailer, order_ref, inbox_id}`.
  - Wardrobe rows fire event `wardrobe_added {source:'receipt'}`.
  - Wishlist rows use `source_type:'receipt'` and `source_label:'From {retailer}'`, and fire `wishlist_added {source:'receipt'}`.
- Only if nothing failed: PATCH `wardrobe_inbox {status:'filed', filed_ids, filed_to, decided_at}`, then event `inbox_reviewed {filed, skipped, retailer, to}`.
- No toast on filing.
- After filing: reload the right list, switch to the wishlist view if that was the target, and return to the list if more receipts remain, else close.

**Dismiss** (`_wiDismiss`, l.3832): PATCH `status:'dismissed'`, then event `inbox_reviewed {filed:0,…}`.

**Load** (`_wiLoad`, l.3680): GET `wardrobe_inbox?user_id=eq.<uid>&status=eq.held&order=received_at.desc`.

**Admin**
- `public/admin.html` l.346 (user detail Receipts section) and `renderInboxHealth` l.645 read `wardrobe_inbox` through `sbClient`.

##### 2.5 Add without a photo

- `__waManualStart` (l.3034) runs `_waFormSeedEmpty` then opens the details view.
- "Add a photo" uses `#rb-wf-photoin`: a straight attach with no re-analyse (l.2890–2898).

---

#### 3. Edit, delete, and replacing a piece's photo

**Edit**
- Opened from the piece page pencil (`__rbPieceEdit` → `_waOpenEdit`, DP l.1801) or programmatically via `__wtrkEdit(id)` (l.1283).
- The patched `WA.open` edit branch calls `_showEditForm(it)` at 150ms (l.3048–3073).
- It is the same form, landing on details:
  - Prefilled price uses `_waPriceFmt(price, currency)`.
  - `band` comes from `season_band` (else year_round).
  - `wear` comes from `tag_pieces`, else legacy `occasions`, else ['everyday'].
- The CTA is **"Update piece →"**.
- If the piece is in any saved looks, a line reads "Styled in N looks →" (`__waFormLooks` → Lookbook).
- A quiet **"Remove from wardrobe"** row sits at the bottom.
- The save is a PATCH through `_waRowWrite`. Price, size and currency are always written.
- An edit carries the saved L2/L3 pair forward when the tree is unavailable.
- Toast: "Piece updated". `__rbPieceSync()` repaints the piece page in place.

**Delete** (`_waDelete`, DP l.3567–3577)
- Uses the **native `confirm('Remove this piece from your wardrobe?')`** (the wishlist uses the styled `_rbConfirmDelete` at l.6071; unify on the styled one in the rebuild).
- `DELETE wardrobe_items?id=eq.<id>`, then close, `_waLoad()`, toast "Piece removed".
- The piece page closes itself when the piece is gone.
- No client-side cascade: `tag_pieces` and `look_pieces` references depend on DB FKs.

**Photo replace on the piece page** (`__rbPiecePhoto` / `__rbPiecePhotoPick`, DP l.6486–6517)
- A cream 28px refresh pill opens `#rb-pc-photoin`.
- `_rbDownscale` → `POST /api/wardrobe/upload {data,mimeType}` → `PATCH wardrobe_items {image_url}`.
- Toast "Photo updated", or "Robes couldn't save that photo — try again".
- It is not re-analysed.
- In the form, "Change photo" on edit or manual is also a straight replace.

---

#### 4. Piece page (`/piece/:id`): two doors, one editor (CL l.332–342; nav rework l.280–288; DP l.6140–6640)

**Routing**
- Server route at server.js l.2286.
- `window.__rbPieceOpen(id, {from:'look'|'day'|'wardrobe'|'wishlist', lookName, siblings, quiet})` (DP l.6403–6438):
  - It finds the piece in `_waItems`, then in `_wlItems` (`_pcFind`). If missing it toasts "Robes couldn't find that piece".
  - It pushes `/piece/<id>` unless `quiet` is set, stores `prevPath`, and fires `piece_opened {from, kind}`.
- The page is a fixed overlay `#rb-piece-page` at z-46, below the nav, with CSS in `#rb-piece-style`.
- Boot deep link (DP l.5293–5308): polls until either list contains the id, else falls back to the wardrobe.
- Popstate is handled at DP l.24502.

**Siblings, used for "n of N" and ‹ ›**
- From a look: the look's owned pieces, suffix "in this look".
- From the wardrobe: pieces in the same sheet category, hero-first then newest, suffix "in {category}".
- From the wishlist: the whole wishlist.
- `__rbPiecePage(±1)` steps through them.

**Chrome**
- The return band comes from `_rbRetHtml` and `_rbRetReg('piece',…)`. Its label is "Wardrobe", "{look name}" or "Wishlist".
- The title block (`_rbTitleHtml`):
  - Eyebrow "In your wardrobe" or "On your wishlist".
  - Serif title, then a pencil (`__rbPieceEdit`) and a star (`__waHeroToggle`). Wardrobe pieces only.
  - Brand as the sub-line.
  - Meta: "{Category} · worn {once|twice|three times…} · in N looks". For the wishlist: "{category} · €{price}"; this one hardcodes € and should use `_waPriceFmt`.

**Media card** (a two-column shell at ≥1024px: media `clamp(360px,38%,560px)` beside the rest)
- A 1:1 contain photo, a "Photo" placeholder, and the replace-photo pill (wardrobe only).
- The italic note.
- Tag pills:
  - Wardrobe: the band label plus the wear-for labels.
  - Wishlist: provenance, price with currency, "Size X", category.
- Wardrobe: a **"Style this piece ▾"** pill opens `__rbPopMenu` with "Build a look / Start from this piece" (`__rbPieceBuild` → `__lkNew` + `__lkApplyNew(id)`, event `piece_build_look`) and "Style it three ways / Robes proposes three" (`__rbPieceStyle` → `__rbInspOpen` + `__inStyleNew({piece})`, event `piece_style_three`).
- Wishlist: an ink **I bought this** (`__rbPieceBought` → `__wlBought`) and a quiet **Remove from wishlist**.

**Rest column** (wardrobe door only; the look and day doors show a preview)
- **Worn** rule, using `max(times_worn, dated wears)`.
- Wear rows come from `_pcWears` (l.6230–6257). It merges three sources, dedupes by date + key, and sorts newest first:
  - `_lkLooks[].wears`, where the wear's `piece_ids` snapshot decides membership.
  - Daily looks marked worn (`dlData.worn` with `anchor_date`), from localStorage `snLoad()`.
  - Worn `planned_days`, from the `robes_planned_days__<uid>` cache.
- Three rows show by default, then "View all N wears →".
- An undated remainder reads "{N} wears counted before Robes kept the dates."
- **"In N looks"** holds saved Looks only (`_pcLooks`). Each tile's meta is "Worn {date}", "Pinned to a plan" or "Not yet worn". The rail is 2 columns, or 4 on desktop, composed by `_ltTile`.
- With no looks: "Not in a look yet · Build a look and it files here."
- From the look or day door: "See the full record in your wardrobe →" (`__rbPieceRecord`).

**Close** (`__rbPieceClose`, l.6446)
- From a look or day it restores `prevPath`.
- Otherwise it reopens the wardrobe on the right view.
- `__rbPieceSync` runs after `_waLoad`, a hero toggle or a wishlist change. It repaints in place and closes if the piece is gone.

**Look-door hooks** (l.6600–6640): `__lkPieceOpen`, `__lkCPieceOpen`, `__dlPieceOpen` and `__tvPieceOpen` all call `__rbPieceOpen(…,{from:'look'})`.

**Data**: read-only from caches, plus the PATCH calls from edit, star and photo.

---

#### 5. Wishlist (`/wishlist`)

**Routing**
- The server route is at l.2280. The boot opens the wardrobe, then `__waSetView('wishlist')` (DP l.5229–5234).
- `__waSetView` (l.4644) sets the crumb "Wardrobe / Wishlist" and calls `_rbNav('/wishlist')`.
- The panel always reopens on All pieces.
- The tab row, trail, Refine and receipt notice are hidden on this view.

**Data**
- Table `wishlist_items` (migration 10): `id uuid, user_id, label, category (legacy), color, brand, note, image_url, price numeric, source_type, source_label, source_url, item_dna, created_at`.
- Migration 23 adds `size, currency, category_l2, category_l3`.
- Load: GET `wishlist_items?user_id=eq.<uid>&order=created_at.desc` (`_wlLoad`, DP l.4408).

**Grid** (`_wlRender`, l.4535–4555)
- Empty state:
  - Eyebrow "The Wishlist", heading "Save what catches your eye.", italic "Robes will tell you if it earns a place next to…".
  - **Save a piece** (`__wlOpenAdd`) and a link-door button (`__wlSoonLink` → `WA.open({way:'url', target:'wishlist'})`).
  - "A screenshot, a photo, a link, a forwarded receipt — Robes reads what it can."
- Filled: dashed cards (`_wlCard`, l.4513):
  - The image or a serif monogram.
  - A provenance chip from `_WL_SRC` (l.4454–4462): robes = "Robes suggests" (sage), url, instagram, substack, screenshot, receipt = "From a receipt", photo = "Saved by you". `source_label` overrides the chip text.
  - Meta: "brand · €/£price (`_waPriceFmt`, legacy EUR) · Size X".
  - The note.
  - **I bought this** and ✕.
  - Tapping the card calls `__rbPieceOpen(id,{from:'wishlist'})`.
  - A "+ Save something / Photograph · Receipt · Link" add card ends the grid.

**Same three ways in** (CL l.45)
- `WA.open({way:'choose', target:'wishlist'})`. There is **no wishlist editor**: `target:'wishlist'` never edits.
- Wishlist payload (`WA.submit` branch, DP l.3364–3401):
  `{user_id, label, category: _waTaxLegacy(...), color, brand, note, image_url, price, source_type (chip, default photo), source_label, source_url (only for url), item_dna, +size, currency, category_l2/l3}` through `_waRowWrite(…,'wishlist_items')`.
- Event `wishlist_added {label, source, batch_n, batch_i}`.
- Toasts: "Saved to your wishlist", "Piece n of m saved", "All m pieces on your wishlist".
- After saving, the view switches to the wishlist.

**Keeping the source picture** (CL l.189–195)
- Every Robes-suggested save goes through `_wlSaveFromItem(it, {imageUrl, silent})` (DP l.4473–4511).
- The image priority is `opts.imageUrl` (the caller resolves the generated still via `_pdItemThumb`), then `it.image_url`, then `it.wardrobe_match.image_url`.
- Payload: `label: it.name, category ('Swim'→'Swimwear'), color, brand, price` (digits parsed from `price_point`), `source_type:'robes'`.
- It skips if `it.wishlisted` is already set (a client flag only).
- `_wlBackfillImages` (l.4431–4452) is a one-time repair per session. It finds wishlist rows with null images whose label matches a saved look's proposal name, and PATCHes `image_url`. Capped at 40.

**I bought this** (`__wlBought`, l.4565–4589)
- Copies the row to `wardrobe_items` through the ladder, carrying price, size, currency and L2/L3 (the note becomes `notes`). Then it DELETEs the wishlist row, runs `_waLoad()` and toasts "{label} is in your wardrobe".
- It does **not** fire `__rbAddFork`. That function was removed on 2026-08-21, so the naming map (docs/product-naming-map.md l.25) is stale on this point.
- No event is fired. Recommend adding `wishlist_bought`.

**Remove** (`__wlRemove`, l.4591)
- `_rbConfirmDelete('Remove from your wishlist?')`, then DELETE, then toast "Removed from your wishlist".

---

#### 6. Inspiration (`/inspiration`) and its call to action

**Page** (DP l.6640–6735; CL l.605–615, l.491–496, l.156–163)
- Server route at l.2276. Boot at DP l.5199–5214 also supports `?open=<lookbook id>`, which opens that key-piece result.
- A fixed overlay `#rb-insp-page` at z-45.
- Masthead: "Key pieces, styled · N styled" with the pill **Style a key piece** (`__inStyleNew()`).
- Grid: 3 columns on desktop, 2 below 1024px, 1 below 767px.
- Content is `lookbook_items` of type `key-piece`, read from the localStorage mirror `robes_style_notes__<uid>` via `snLoad()`. That mirror is synced by the lookbook module (another area).
- Card: a lead image plus two generated stills, the title, "Styled three ways by Robes". It opens `__snOpenItem(id)`.
- The Restyle action is removed; `__inRestyle` survives with no door.
- Empty state (`_rbStylePieceCardHtml`, DP l.22838):
  - Eyebrow "Style a piece", heading "Your piece, *worn three ways.*"
  - "Show Robes one piece you love. You'll get three ways to wear it — none of them the obvious one, each styled around your wardrobe."
  - CTA "Style a key piece →".
- Home row: `_rbRenderInspRow` (l.22920) shows up to 4 cards with "Inspiration · View all". It stands down while the FTU rows and the styled card are showing.

**CTA modal** (`__inStyleNew(opts)` l.7100+; state l.6745–6758; `#rb-inst-wrap` z-950)

Step 1:
- "Style a key piece, *three ways.*"
- Left column: a dashed snap tile, or the attached piece card.
- Under the tile, the prompt's own "+" menu (`_inStAddHtml`): Upload (`#rb-inst-file`), Take a picture (`#rb-inst-cam`, capture), From wardrobe, From wishlist.
  - The last two open `__cbWardrobePick({source, segments:true, onPick})` (DP l.23142), which has a Wardrobe | Wishlist switch. Event `inspiration_piece_pick {source,item}`.
- Right column: a textarea.
  - Placeholder without a piece: "The piece, the occasion, how you like to feel in it...".
  - Placeholder with a piece: "The occasion, the weather, how you want to feel in it…".
- Hints:
  - "A photo makes it sharper — but a few words is plenty."
  - "Robes already knows the {short} and how you have worn it…"
  - Wishlist piece: "Robes knows the {short} from your wishlist…"

A new upload is filed into the wardrobe in parallel (`_inStScanStart`, l.6949–7020):
- analyse and upload run together, with one analyse retry after 1.5s.
- POST `wardrobe_items` with the taxonomy pair, retrying without it on PGRST204.
- Event `wardrobe_added {source:'inspiration_modal'}`, then `_waLoad()`.
- Status line: "Filing it to your wardrobe…" → "✓ Filed to your wardrobe", which attaches the new row as the key piece.
- Or "Robes couldn't see a piece to file — the looks still run.", or the failure line.
- The scan outlives the modal; if the modal is gone it toasts "{label} filed to your wardrobe".
- `_inStScanSeq` guards against a photo being replaced mid-scan.

Go (`__inStGo`, l.7043–7098):
- The prompt is led by "Style my {label} three ways (worn N times)" for a wardrobe piece, or "Style the {label} three ways" for a wishlist piece, followed by her words.
- It requires a photo or words; otherwise it toasts "Add a photo or a few words first".
- Step 2 is the scan: `_IN_SCAN_STAGES` cycle every 2.4s, with "This takes about twenty seconds. Cancel".
- `POST /api/style {prompt, photo, userId, genId, styleDna, styleIcons, gender, wardrobeCount, wardrobeItems:[{label,category,color,times_worn}], intent:'style', context:null}` with a 90s abort.
- On success it closes the modal and the page, then calls `__kpRenderResult(data, prompt, {intent:'style'})`.
- On error it returns to step 1 with inputs kept and toasts "Robes couldn't finish those looks — please try again in a moment." A cancel stays silent.
- Event `inspiration_style_modal {photo, piece, source}`.

---


#### Stale-doc notes to reconcile in the rebuild spec
- CL l.1325–1355 ("Wardrobe wiring / v2 internals") and l.1405–1435 describe the three-step form, swatch rows, silhouette pills, a Refine with fits/worn and four-season multi-select, and `seasons[]`. **All superseded** by the 2026-08-05 redesign, ADR-002 bands (`season_band`), and the 2026-09-22 ways-in change.
- `docs/product-naming-map.md` l.25, l.31 and l.83 mention `__rbAddFork` (removed 2026-08-21), the "✈ Pack a trip" pill (retired) and the `#rb-wa-fab` FAB (retired).
- The Hero Rack rail and title were removed 2026-07-21; the star is the only surface.
- `_waDelete` uses native `confirm()` while the wishlist uses `_rbConfirmDelete`. Unify on the styled one.


### 2C. Home & concierge, key-piece styling, daily console, looks & composer, moodboards

**Scope and sources.** Sources: `CLAUDE.md` (reference lines 939–1644, plus deltas 14–737), the five docs, `public/js/dashboard-personalize.js` (called **DP** below; every line number is in this file unless marked otherwise), the inline boot in `public/dashboard.html` (2577–2679), `server.js`, and the migrations `supabase/looks_migration.sql`, `look_proposals_migration.sql`, `look_roles_migration.sql`, `avatar_render_migration.sql` and `lookbook_migration.sql`.

#### 0. Read this first: facts that change what a rebuild should copy

1. **Moodboards are switched off on beta.** `var _RB_MB_HIDDEN = true` sits at DP:16. Every moodboard entry point checks it and does nothing (DP:5309, 5312, 7357, 22778, 23699, 23704, 24317, 24335, 24408, 24486–24487). The server routes still work: `/moodboards` and `/moodboard/:slug` (server.js:2294–2300) and `POST /api/moodboard` (server.js:3191). To turn them back on you also need to restore the moodboard entries in `_CHIP_DEFS`, `_cbDetectIntent` and `_cbResolve` (see the comment at DP:23693). Treat this as dormant.
2. **A fresh daily generation no longer opens the daily console.** Since 2026-09-15, `__dlSubmit` (DP:8717) and the key piece's "Build this look" (`_kpBuildLookRun`, DP:8030) both hand the `/api/daily` payload to `_lkDraftFromDaily` (DP:16223). That turns it into a **composer draft**, and nothing is written until she names and saves it. `__dlRenderResult` (DP:17824) now only renders `daily-look` rows saved before that date, plus days wearing a pinned look (`__lkOpenAsDay`, DP:11778).
3. **The weekly track has been deleted** (ADR-001, CLAUDE.md:641–648). The ladder copy still says "10 · Plans a week of outfits". The "Weekly planner" concierge card only scopes the prompt to tomorrow.
4. **Wasted image calls on every daily build.** Neither `__dlSubmit` nor `_kpBuildLookRun` sends `noImages`. The server therefore starts an image job with one Gemini image call per item (server.js:1053–1110). The client never polls the returned `jobId` on the composer path. Separately, `_lkShopImages` (DP:15440) fires `/api/lookbuild/images` for the proposals only. Each prompted look can cost 4–8 unused image generations. The rebuild should pass `noImages` or reuse the job.
5. **Two storage models live side by side:**
   - `lookbook_items`: generated artifacts, a JSON blob per row keyed by `Date.now()`. Types are `key-piece`, `daily-look`, `travel-edit`, `moodboard` and `weekly-plan-archived`.
   - `looks` + `look_pieces` + `wears`: the saved Look entity (UUID keys).
   - Look tags now live in `looks.climate_band` plus `tag_looks` (ADR-002, migrations 17/18). `looks.tags text[]` is read-only legacy.
   - `looks.proposals` (migration 19) and `looks.render_url`/`render_key` (migration 21) are written with a strip-and-retry fallback on `PGRST204`.
6. **Direct browser REST writes.** Almost every write goes through `_waFetch` (DP:641): raw PostgREST with the user's JWT and `Prefer: return=representation`. The exception is `_rbCapturePost` (DP:665), which uses `return=minimal` and is the only safe way to insert into `events` and `feedback` (admin-only select policy).

---

#### 1. Home / dashboard

##### 1.1 Boot and page shell
- **Boot** (`dashboard.html:2577–2679`):
  - Loads supabase-js from CDN and creates the client (`_sb`, exposed as `window.__robes_sb`).
  - Gets the session; if none, redirects to `/signup.html?mode=signin`.
  - Selects the profile (`first_name, last_name, mobile, style_icons, budget, wardrobe_description, style_dna, wardrobe_items_count, onboarded_at, gender_identity, notification_prefs`) with a cascade of column-dropping retries.
  - Identifies the user in PostHog (`__rbPHUser`).
  - Redirects to `/onboarding` when `onboarded_at` is null, unless `sessionStorage.rb_onboarded__<uid>` is set.
  - Then loads the bundle and calls `window.__robes_personalize()`.
- **Home order** is decided in one place, `_lkHomeSync` (DP:16072–16107), and sequenced by `_rbFtueOrder(n)` (DP:1039–1103). `_lkHomeSync` calls, in order: `_rbFirstLookCard` → `_rbFtuRows(mode)` → hide `#wtrk` → `_rbRenderStyleNotes` (DP:22855) → `_rbRenderInspRow` (DP:22920) → `_rbModelDoorSync` → `_rbFtueOrder` → `_rbNextPaint`.
  - Standard order: `[prompt, firstlook, rail, model door, styled card, concierge band]`.
  - Below 5 pieces: `[styled, prompt, firstlook, rail, door, band]`.
  - When the FTU rows stand: `zero` → `[styled, rows, band]`; otherwise `[prompt, firstlook, door, rows, band]`.

##### 1.2 Masthead greeting
- `_rbUpdateMasthead()` (DP:24357–24369) sets `#dash-greet` to "Good morning/afternoon/evening, {first name}." Morning is before 12:00, afternoon before 18:00.
- The echo `.dash-echo` defaults to "What are we dressing for today?" (`_RB_FTU_ECHO`, DP:15542). The next line replaces it (1.3).
- The earlier "Welcome back · N pieces" returner variant has been removed. `_rbIsReturner` and `rb_last_visit__<uid>` are dead code.
- Under 640px the greeting shrinks to 34px.
- **Temporal-dead-zone trap:** any state these functions read must be declared with `var` (CLAUDE.md gotcha). A rebuild in React state avoids this.

##### 1.3 The "next line" (funnel slice 1.1 + 3.1)
- `_rbNextLine()` (DP:15902–15948) is a derived sentence plus a text door. `_rbNextPaint()` (DP:15949) writes it into `.dash-echo` as `text + <button.rb-echo-door>{label} →</button>`. `__rbNextGo()` (DP:15968–15990) dispatches the door.
- **Rules, in order; the first match wins:**

| Rule | Condition | Copy | Door |
|---|---|---|---|
| `styled` | FTU rows in `zero` mode | (styled card's own echo stands) | — |
| `model` | `_lkModel === null` and ≥1 saved look | "Build your model and she'll wear *{looks[0].name}*." (pronoun via `_lkModelPro`) | Build your model → `__rbModelGo('next')` |
| `finish` | a look with ≥2 `proposals` and <5 photographed pieces | "*{look}* borrows N pieces. Photograph yours and swap them in." | Swap pieces → `__rbFillOpen(id,'next')` |
| `five` | ≥1 look and photographed pieces < 5 | "{Two} more pieces and Robes builds a look from yours alone." | Add pieces → `_wtrkOpenAdd()` |
| `robes` | ≥5 photographed pieces and no look with `source:'robes-build'` | "Five pieces filed. Robes can build from yours now." | Let Robes build one → `__lkNew(); __lkRobesBuild({door:'next'})` |
| `wear` | today has a moment not yet worn | "Today is dressed. Tap the day when you've worn it." | Open today → `__rbDayOpen(today)` |
| `week` | ≥1 look and no moment in the next 7 rail slots | "Nothing planned this week. Name a day and Robes dresses it." | Open the diary → `__rbDiaryOpen()` |

- "Photographed" means `image_url` is http (`_lkRobesPics`, DP:911). `_lkModel === undefined` (not yet asked) fires no rule and triggers `_lkModelEnsure`.
- Repaints happen from `_lkHomeSync`, from the late model-id callback, and on rail paint (`_rbNextRailSlots`, DP:15898).
- Events: `next_line_shown {rule}` fires only when the rule key changes; `next_line_tapped {rule}`.
- Copy rules: the door is a hairline text button, never an ink fill. "Style me" stays the one ink button on home (the harness pins exactly one ink fill in `#dash`).

##### 1.4 The prompt and its three doors
- **Pills** (`_ikPillsPaint`, DP:26586–26645, into `#rb-sugg`): always these three, in this order, at any state. Each tap is a "fresh start": it closes the intake unfurl, clears the photo, prompt and CTA, and fires `prompt_submitted {intent, scope, source:'pill'}` through `_ikTrack` (DP:26647).
  1. **Style today**: `_ikScopeDay(today)` adds a date chip over an empty prompt with ghost text "Where are you going? What's the vibe?" (`_IK_DAY_PH`). There is no generation on tap. `window.__rbPromptHold` pins the ghost text against the bundle's typewriter.
  2. **Plan a trip**: `_ikOpen('travel', {})` unfurls the Where / When / Vibe crumbs on the box. Provenance reads "our suggestion — change anything". Owned by the travel feature.
  3. **Style a piece**: `__cbWardrobePick()` (DP:23142) opens the wardrobe picker. `__cbWardrobeApply(id)` (DP:23202) writes "Style my {label} three ways" into the box (or replaces the first `[bracket]`). It then **fetches the piece's Cloudinary image into a base64 dataURL** (`_rbUrlToDataUrl`) as `_cbPhotoData`, which routes the submit to the style track. An empty wardrobe shows the toast "Nothing catalogued yet — add a piece to your wardrobe first".
- **Textarea** `#cb-ta` auto-grows up to 240px (`_cbAutoGrow`, DP:23301). Brackets are editable defaults: on submit, `[x]` becomes `x` (in `_cbSubmit`).
- **The "+" add menu** (`#cb-addmenu`) has a "From wardrobe" row and an "Add a look" row → `__cbLookPick`, `__cbLookApply`. If a look is attached (`_cbLookId`), the submit **pins** the look to the scoped day or today and generates nothing. The prompt text becomes the day's name (`_lkPin(id, date, prompt)`, DP:23553–23563). Toast: "“{name}” pinned to today".

##### 1.5 Intent routing (`/api/intent`)
- **Submit chain:** `_cbSubmit` (DP:23542) → if `_rbDiaryOn()` (the default; `?diary=off` or localStorage `rb_diary_prompt=off` turns it off) → `_ikSubmit(prompt)` (DP:26659–26720). Branches:
  - A photo is attached → `_cbStyleSubmit(prompt, photo, {intent:'style'})`, which calls `/api/style`.
  - Empty prompt → toast.
  - A day scope is set → `_ikRestyleDay` (DP:26747): `__dlSubmit(text, {anchorDate, slot})`, or a trip day → `__tvStyleLookForDay`.
  - Regex `/\bdress me\b/` → `__dlSubmit(prompt)` directly (no classifier round trip).
  - Otherwise the reading state "Reading your prompt…" plus skeleton, then `_ikClassify` (DP:26721) with a **4s client abort**. If confidence < 0.6 or intent `unclear` → the clarify panel ("One question — what should this become?", buttons "One outfit, one day" / "Pack for a trip" / Cancel, DP:26884–26906). `daily` → `__dlSubmit`. `travel` → `_ikOpen('travel', seed)`.
  - A stale answer is discarded via the `_ikSeq` guard (DP:26451, checked at 26700 and 26716). A classifier failure lands on the clarify panel with "Robes couldn't quite read that — what are we dressing for?".
- **Gap:** with the diary path on, a typed "style my blazer three ways" without a photo never reaches `/api/style`, because the classifier has no `style` intent. Only the regex fallback (`_cbDetectIntent`, DP:23441, `?diary=off`) and a photo attachment reach the style track.
- **Legacy/fallback resolver** `_cbResolve(intent, prompt)` (DP:23502):
  - `travel` → `__tvOpen({brief})`.
  - `dress-me` → toast "Your closet is growing (n/15)…" when 0 < n < 15, then `__dlSubmit`.
  - `style` → `_cbStyleSubmit`.
  - `_cbShowClarify` (DP:23477) offers three buttons.
- **`POST /api/intent`** (server.js:1384–1445, rate limit 30/min):
  - Request: `{prompt (≤400 chars), clientDate 'YYYY-MM-DD', userId, genId}`.
  - Gemini `gemini-2.5-flash`, temperature 0, thinking budget 0, 500 tokens, 5s server race.
  - Schema `INTENT_SCHEMA` (server.js:1363): `intent ∈ daily|travel|unclear`, `destination`, `date_start`, `date_end`, `vibe`, `day_intents[{date,label}]`, `confidence`.
  - Hard rules in the prompt: never invent a destination or dates; resolve dates against `clientDate`.
  - Response is normalised: dates validated as ISO and swapped if reversed, `day_intents` capped at 14, `vibe` ≤120 chars. Failure → 502 `{error:'intent_failed'}`.

##### 1.6 The Styling Concierge band and the 5/10/15 ladder
- **Cards:** the bundle ships `[Weekly, Travel, KeyPiece]`; DP:7440–7500 rewrites them as:
  - 01 **Daily outfit**: `look1.jpg`; onclick → `_ikScopeDay(today)`, else `_cbSetIntent('dress-me')`.
  - 02 **Weekly planner**: `look2.jpg`; desc "Plan the week a day at a time — name tomorrow, Robes dresses it, and the diary keeps the week."; CTA "Start with tomorrow"; onclick → `_ikScopeDay(tomorrow)`.
  - 03 **Travel edit**: `look3.jpg`; onclick → `__tvOpen()`.
- **Ladder config** `_MS_UNLOCKS` (DP:898–902). This is config; views never hard-code the numbers:

| at | key | cap | pos |
|---|---|---|---|
| 5 | daily | "Builds a daily look" | 25% |
| 10 | weekly | "Plans a week of outfits" | 50% |
| 15 | styleNotes | "Knows your taste" | 78% |

  - `_MS_SCALE = 20` (DP:1004). `_msFillPct` (DP:1005) interpolates piecewise so the fill meets each tick; the last tick is nudged to 78% so the track never reads full. `_msHeadline` (DP:945).
  - `_msBarHtml(n, {still})` (DP:1012) renders the track, ticks and capability columns.
  - `_msTrack` (DP:927) keeps `rb_ms_last__<uid>` so a rung crossed between sessions still reads "just earned".
- **Band header** (`_rbConciergeSync`, DP:1139–1255): "ROBES IS LEARNING · **N** pieces filed" plus the ladder (`still`: no animation). The meter is removed at `n ≥ _WA_TARGET` (15).
- **Filed receipt row** `#rb-svc-filed`: thumbnail of the newest piece, "{Category} · Your first filed piece" or "Last filed", "N pieces in your wardrobe · See all →" (only when n ≥ 2), the note "One photo files four pieces.", and the CTA "Catalogue what you're wearing now" → `_wtrkOpenAdd()`.
- **Card captions** (`_rbUpdateDailyOutfitLock`, DP:22957–23028). The old lock pill is gone ("nothing gated"):
  - Daily: under 5 → "{Three} more pieces and Robes builds a daily look from yours."; 5–14 → "Today's look: built from your pieces first, gaps borrowed."; 15+ → "Today's look: styled entirely from your wardrobe."
  - Weekly: under 10 → "{Seven} more pieces and Robes plans a week of outfits."; otherwise "A week of outfits, each day from your own wardrobe."
  - Travel: "Tell Robes where and how long."
  - The daily CTA is always "Style today →".
- **Show rule** (`_rbGateConcierge`, DP:1257–1284): `!#rb-styled && !_rbConciergeDone() && _rbHomeMode !== 'look' && n < 15`.
- **Retirement** (`_rbConciergeDone`, DP:1123) needs a daily **and** a travel edit, from either:
  - the saved `snLoad` types, or
  - the per-device flags `rb_svc_done__<uid>` = `{daily, travel}`, set by `_rbSvcComplete(kind)` (DP:1113) on any **fresh** render.
  
  The flags are single-device, which CLAUDE.md flags ("no server home").
- Copy rules: text CTAs only on the band ("R3"); one tinted band per screen (`#F2EEE7` with `#E1DACB` hairline); never a denominator or lock language; never 100%.

##### 1.7 Home postures (FTUE)
- `var _rbHomeMode` (DP:15541) ∈ `'zero' | 'zero-lead' | 'look' | null`, mirrored as `#dash[data-home]`. Set by `_rbFtuRows(mode)` (DP:15608). Row definitions come from `_rbFtuRowDefs` (DP:15589).
- **zero** (no saved looks and the onboarding "Your piece, styled" card `#rb-styled` present):
  - The styled card is the hero, with the single ink CTA "See the full looks →". It comes from `_rbOnboardHandoff` (DP:27257+), which reads `sessionStorage.rb_onboard_piece` and `rb_onboard_styled`, and otherwise re-runs `/api/style` and polls `/api/images`.
  - Three hairline rows follow: BUILD YOUR OWN ("Start a look from the rack."), STYLE SOMETHING ("Ask for a look in your own words."), THE WEEK AHEAD ("Nothing planned yet."). They unfurl in place (`__rbFtuToggle`, DP:15741; `__rbFtuRowTap`, DP:15761). Opened rows stay open together (`_rbFtuOpen` set). Event `ftu_row_toggle {row, open}`.
  - The prompt and the rail physically live inside the row bodies.
  - The band is hidden while `#rb-styled` exists.
  - Footer copy "One piece filed. Every look borrows the rest until you photograph your own."
- **zero-lead** (no looks, no styled card): the prompt leads, and the rows shrink to Build your own and The week ahead.
- **Inline builder on home at zero looks**:
  - `#rb-lkhome` via `_lkHomePaint` (DP:15509) renders `_lkNewHtml({home:true})`, the **same** composer and draft. The head shows "N of 4 on the rack".
  - The name input `#rb-lk-hometitle` sits inside the card.
  - Roles are split: Canvas + Anchor, then "Texture · finish / Two more slots, optional. — Show" (`__lkHomeMore`, DP:15481).
  - Empty slots route to `__lkHomeSnap(role)` (DP:15485), which pokes the dedicated camera input `#wa-rb-cam` (else the file picker) and arms `_waAfterAdd` to cast the piece into that role (`look_slot_snap`).
  - Only ONE composer may exist in the DOM. The home module is removed while the Lookbook page is open.
  - `_lkHomeZero()` (DP:15504) means no looks, no shelf items and no trips.
- **look** (first-look posture, "seven doors"): exactly one saved look and no `look`/`daily-look`/`travel-edit` lookbook rows.
  - Renders: greeting + next line; prompt + three pills; **Your looks** `#rb-firstlook` (`_rbFirstLookCard`, DP:15825–15874); model door; Inspiration row.
  - The Your looks row shows the thumbnail (`_lkHeroUrl`, else a mosaic), the name, "N pieces yours · M borrowed", and "Finish it" when proposals remain (else "Open →"). The whole row → `__lkCardOpen(id,'home')`.
  - No FTU rows, no band.
  - The rail stays hidden until a today-or-future moment exists (`_rbLookRailSync`, DP:15785).
- **Standard home**: prompt, rail, model door, styled card, band, Lookbook row (`_rbRenderStyleNotes` shows **saved Looks only**) and Inspiration row (key pieces only).

##### 1.8 Model door
- `#rb-model-door` (`_rbModelDoorWants`, DP:16032; `_rbModelDoorSync`, DP:16039).
- Condition: `_lkModel === null`, ≥1 saved non-draft look, no `#rb-styled`, and not snoozed.
- Copy: eyebrow "Your model"; "Build her once, she'll wear *every look you keep.*"; "Thirty seconds by hand, or two photographs."; hairline pill "Build your model" → `__rbModelGo('door')` (DP:13841); ✕ "Not now".
- **`__rbModelGo`** removes `sessionStorage.rb_lk_draft`, sets `rb_model_return='home'`, fires `model_door_tapped {from}`, and navigates to `/stylenotes`.
- **Snooze:** ✕ writes a timestamp to `localStorage rb_model_door_off__<uid>`; the door returns after 7 days (`_RB_MODEL_DOOR_SNOOZE`, DP:16001).
- Events: `model_door_shown` (once per session), `model_door_dismissed`.
- **Return landing** (DP:215–245): stylenotes sets `sessionStorage.rb_model_build` (+ `rb_model_open_look`). The boot waits for looks and wardrobe to load, then opens the newest look with ≥1 piece or proposal and no `render_url`, with "‹ Home" as the way back; otherwise the prompt. Event `model_build_landed {on: look|prompt}`.
- `_lkModel`: `undefined` = not asked, `null` = none, else `{id, man, skin, hair}` read from `profiles.avatar_id` (`_avFetchId`, DP:11499; GET `profiles?select=avatar_id`, DP:11502).

##### 1.9 Briefed add ("Swap in yours · N", slice 4)
- `_rbLookGaps(l)` (DP:15362) and `_rbLookGapsNewest` (DP:15371) derive the gaps from `looks.proposals`.
- `__rbFillOpen(lookId, door)` (DP:15394) → `WA.open({brief})` with the step-1 heading "Make *{look}* yours." and "Looking for: {a blazer · loafers}".
- Filing a piece lands it on the look via `_lkFillLand` (DP:15376) → `_lkPropAdopt` (DP:15324). Toast "{label} is in {look} now." Events `fill_opened {door, gaps}`, `fill_closed {landed, gaps}`, `piece_swapped {surface:'look-fill'}`.
- Deep link `/lookbook?open=<id>&fill=1` (DP:5253–5262).
- The home add door `_wtrkOpenAdd` (DP:1287) opens briefed whenever a look is borrowing.

---

#### 2. Key-piece styling ("Style a piece")

##### 2.1 Inputs / doors
1. The home "Style a piece" pill → wardrobe picker → prompt pre-filled + photo attached → `_ikSubmit` → `_cbStyleSubmit`.
2. **Inspiration's "Style a key piece" modal** `__inStyleNew(opts)` (DP:7100):
   - Step 1: "Style a key piece, *three ways.*", a snap/attach tile and a brief textarea ("A photo makes it sharper — but a few words is plenty").
   - Under the tile is the prompt's own "+" (`_inStAddHtml`, DP:6888) with four rows: Upload · Take a picture (dedicated capture input `#rb-inst-cam`) · From wardrobe · From wishlist. The last two use `__cbWardrobePick({source, segments:true, onPick})` with the Wardrobe | Wishlist switch (`__cbPickSwitch`).
   - Brief copy: wardrobe pick → "Style my {piece} three ways (worn N times)"; wishlist pick → "Style the {piece} three ways".
   - **A new upload is filed to the wardrobe in parallel** (`_inStScanStart`, DP:6949): `/api/wardrobe/analyse` + `/api/wardrobe/upload` → POST `wardrobe_items` (DP:6993/6999, taxonomy columns stripped on PGRST204) → `wardrobe_added {source:'inspiration_modal'}`. Tile copy "Filing it to your wardrobe…" → "✓ Filed to your wardrobe". When no item is detected: "Robes couldn't see a piece to file — the looks still run".
   - Step 2 is the scan state, cycling `_IN_SCAN_STAGES` every 2.4s ("This takes about twenty seconds. Cancel").
   - Submit `__inStGo` (DP:7045) posts `/api/style` with a 90s abort; errors return to step 1 with her inputs kept. Event `inspiration_style_modal {photo, piece, source}`.
3. Onboarding prefire (`onboarding.html prefireStyle`) → `sessionStorage rb_onboard_styled` → home styled card.
4. Piece page "Style three ways" (`piece_style_three`, DP:6581).

##### 2.2 `_cbStyleSubmit(prompt, photoData, meta)` (DP:23352–23428)
- Full-screen `#kp-loading-overlay` (z-900): title "Styling your piece *three ways…*" (or the dress-me variant), messages cycling every 8s ("Generating editorial looks / Composing outfits… / Creating images… / Almost ready…").
- For `dress-me` it first asks for location/weather (6s cap) and sends `context {city, month, tempRange, condition, hint}` from `window.__rbCtx`.
- Guarded by `_rbOverlayGuard` (DP:8691–8715): **90s hard abort** and a **"Cancel" link after 15s**. Error toasts: "That took longer than it should — please try again." or "Robes couldn't finish those looks — please try again in a moment." A user cancel is silent.
- Photos are downscaled to 1600px JPEG (`_rbDownscale`, DP:594).

##### 2.3 `POST /api/style` (server.js:523–735, rate limit 10/min)
- **Request:** `{prompt, photo (dataURL), link, name, pieceName, styleDna, styleIcons, wardrobeCount, wardrobeItems[{label,category,color,times_worn}] (≤60), intent 'style'|'dress-me', context, gender, userId, genId, avatarId}`.
- **Text:** `gemini-2.5-flash`, `STYLE_SCHEMA` (server.js:499): `{fallback, wearer woman|man, ways[3]{eyebrow,title,outfit,details,accessories,tags[]}}`. Thinking budget 0, 2000 tokens, 3 retries with exponential backoff.
- Wardrobe-state directive: at 15+ pieces, build primarily from her wardrobe by exact label; 1–14 "owned always beats hypothetical". The prompt also carries the four-tier formula and a fallback rule (key piece = gibberish or unidentifiable → `fallback:true`; dress-me only on gibberish).
- The photo is uploaded to Cloudinary in parallel.
- **Response (immediate):** `{ways, jobId, photoUrl, fallback}`.
- **Background images:** three frames generated sequentially with a 3s gap on `gemini-3.1-flash-image`. Each call races 40s; one retry after 8s. The kept avatar is used as the identity reference (`avatarRefForUser`), and the key-piece photo is attached. Each frame is Cloudinary-hosted, falling back to a `data:` URL, and written into `imageJobs[jobId].images[i]` (in memory, 10-minute TTL, server.js:28–34).

##### 2.4 `GET /api/images/:jobId` (server.js:737–741)
- Returns `{images: (string|null)[] | {type,url}[] (moodboard), done}`, or 404 when expired.
- **Pollers:**

| Poller | Location | First poll | Interval | Ceiling |
|---|---|---|---|---|
| `_kpPollImages` | DP:7652 | 2.5s | 3.5s (5s on error) | 300s |
| `_dlPollImages` | DP:8621 | 3s | 4s | 300s |
| `_lkShopPoll` | DP:13458 | — | 4s | 300s |
| `_lkmPoll` | DP:13635 | immediate | 4s | 180s |
| `_avRenderKick` | DP:11536 | — | 4s | 300s |
| `_mbPollImages` | DP:23746 | 5s | 4s | 90 ticks (7.5 min) |
| `_tvPersistImages` / travel | DP:18923 | — | — | — |

- `_kpPersistImages` (DP:7614) calls `snUpdate(_kpActiveSaveId, {img, kpData.generatedImages})` on every new URL (http only). `_kpSettlePlaceholder` falls back to an icon tile.

##### 2.5 Result page `__kpRenderResult(data, promptText, opts)` (DP:7699–~7985)
- `#kp-result-page`, z-40 under the nav, sits inside Inspiration in the nav.
- Header: return band "‹ Inspiration" (no pager, pencil or Share); eyebrow "Key piece"; title from `_kpPieceWords(prompt)` (DP:7999), e.g. "Your pink barrel-leg jeans, *worn three ways.*"; a "Yours" thumbnail.
- **Three-up** `#kp-ways` inside a 1100px column. Card: 3:4 image (tap = build), eyebrow, serif title, one italic line, **Build this look** (hairline pill; card 01 filled while nothing is built — `.kp-build-first`), and "More detail" (`__kpMore(i)`, DP:8006) which reveals The outfit / Key details / Accessories as a **held card**. At ≤700px it becomes a scroll-snap row of 250px cards; `.kp-open` widens the open card to `min(84vw, 340px)`.
- **Per-look feedback** (see 4.10): `_rbFeedbackArm('kp'+i, …, {key:data, track:'key-piece'|'daily', itemId:()=>_kpActiveSaveId})` with "How was this one?" (stacked). The note is prefixed with the way's title.
- **No-model band** `#kp-model-band` (`_kpModelBandSync`, DP:8365): "Build her once, she'll model *all three.*" → `__lkBuildModel`. The button is a hairline on a first-session account (`_kpFirstSession`, ≤1 piece, DP:8360).
- **Auto-save** (fresh renders only): `snAdd({type:'key-piece', title: pieceName, subtitle:'Worn three ways · {weekday}', img, kpData:{ways, fallback, photoUrl, generatedImages (http only), intent, context, genId}})` → `lookbook_items` POST. Event `look_generated {track:'key-piece'|'daily-3way', item, fallback}`.
- **Reopen** passes `{skipSave:true, savedId}`; `_kpActiveSaveId = opts.savedId || data.id`. Omitting `savedId` caused duplicate rows on share (documented bug).

##### 2.6 Build this look, in situ (DP:7987–8420)
- `__kpBuildLook(i)` (DP:7961). If the way is already built (`kpData.builtLooks[i]` resolves through `_kpBuiltLookId`, DP:8290), it opens the saved look instead (`__kpBuildOpenLook`, DP:8344). Otherwise it calls `_kpBuildLookRun(w, kp)` (DP:8030).
- `_kpBuildLookRun`:
  - Folds away the three cards (`_kpBuildShow`), resets the composer, sets `_lkKpHost=true` and `_lkBuilding=true`.
  - Uses the way's own frame as `_lkBuildFrame` and the way's title as the name.
  - Shows the in-place wait line `#kp-build-wait` (15s Cancel; messages "Reading the look / Checking your wardrobe… / Naming the gaps… / Almost ready…").
  - POSTs `/api/daily` with the brief `"Build this exact look for me, piece by piece: {outfit} Accessories: … Key styling detail: … The mood: {eyebrow — title}."`.
  - Matches her uploaded photo to the best-token-overlap unowned item (`_kpBuildToks`) → `_kpPhotoUrl`.
  - Hands off to `_lkDraftFromDaily(data, {kind:'kp', host:'kp', headline, photoUrl: wayImage, eyebrow, again})`.
  - Failure or cancel → `__kpBuildBack` (DP:8266), back to the three cards.
- The strip (`_kpBuildStripHtml`, DP:8216) holds only the way's eyebrow over the composer's name field `#rb-lk-newtitle`. There is no flick between ways. "‹ Inspiration" is the only way out.
- **Save** → `__lkSave` → `_kpBuildSaved(l)` (DP:8297):
  - Paints the Filed card: "{name} is in your Lookbook", plus a forward line. Without a model: "Build your model and she'll wear it." + "Photograph the N pieces that aren't yours yet and swap them in." With a model: "N of these aren't yours yet — photograph yours and Robes swaps them in."
  - **Open the look** → `__lkOpen(id, {from:{label:'Key piece'}})`.
  - Writes `kpData.builtLooks[wayIdx] = look.id` through `snUpdate`, which PATCHes the cloud row.
- **Park for model build:** `_kpBuildPark` (DP:8389) writes `sessionStorage rb_lk_draft` with `kp:{savedId, wayIdx, shop, shopImgs, note, palette, eyebrow}` and `rb_model_return='inspiration'`. `_kpBuildReturn` (DP:8403) restores it.
- A kp draft dies with its page (`_kpBuildDrop`, DP:8279).
- Events `kp_build_look {item, way}`, `look_draft_from_daily {kind:'kp', …}`.

##### 2.7 Pulling from wardrobe or wishlist
Covered by `__cbWardrobePick` (DP:23142–23195). Tiles are capped at 60. The eyebrow reads "From your wardrobe" or "From your wishlist"; the heading is "Which piece are we styling?". `wardrobe_pick {item,label}` fires in `__cbWardrobeApply`, and `inspiration_piece_pick {source,item}` fires at DP:7037.

---

#### 3. Daily look console ("Dress today")

##### 3.1 Entry
- The **Style today** pill scopes the day and waits for her words, then goes through `_ikSubmit` → `__dlSubmit(prompt, {anchorDate, slot})`.
- Other routes: "dress me …" typed; the classifier returning `daily`; `_cbResolve('dress-me')`; a rail or Diary day scope.

##### 3.2 `__dlSubmit(prompt, opts)` (DP:8717–8864)
- **opts:** `locked[]` (anchors), `savedId`, `loose`, `anchorDate`, `slot` ('evening'), `origin`/`kpSourceId` (legacy).
- Overlay title: "One prompt. *Dressed for anything.*"; "Restyling around *your anchors…*" when anchors are locked. Messages cycle every 8s. Weather is asked for first (6s cap). `_rbOverlayGuard` gives the 90s abort and 15s Cancel.
- POSTs `/api/daily` with `{prompt, name, styleDna, styleIcons, gender, wardrobeItems[{id,label,category,color,brand,image_url,times_worn,hero}], context, locked, vibes (_rbVibeVocab ≤40), userId, genId}`. **No `noImages`.**
- On success:
  - Stamps `genId`.
  - `anchor_date` = `opts.anchorDate` || the saved row's date || today (undefined for loose).
  - `slot` from opts or the saved row.
  - Re-marks anchors on the fresh items (by wardrobe id, then name) and restores a dropped `wardrobe_match`.
  - Then **`_lkDraftFromDaily({...data, context}, {kind:'daily', day: anchor_date, again})`**, a composer draft (see 4.5). Nothing is written.
- Error toasts as in 2.2.

##### 3.3 `POST /api/daily` (server.js:908–1180, rate limit 10/min)
- Request adds `noImages` and `locked` (≤8, becomes an "ANCHORED PIECES" block).
- `DAILY_SCHEMA` (server.js:854–906): `{fallback, occasion_label, headline, stylist_summary, transition_tip, palette[], look_tags, steps[{title ∈ The Anchor|The Canvas|The Texture|The Accents, items[{name, category ∈ Tops|Bottoms|Dresses|Outerwear|Shoes|Bags|Accessories|Other, brand, description, how, wardrobe_index, retailer_hint, price_point, alternates[2]{name,brand,retailer_hint,price_point}}]}]}`.
- Wardrobe-state directive (server.js:941–945): 0 items → fully aspirational (`wardrobe_index:-1`); 1–14 → hybrid; 15+ → closet-first.
- The server resolves `wardrobe_index` to `wardrobe_match {id,label,image_url,color}` and a flat `image_index`.
- Response: `{fallback, occasion_label, headline, stylist_summary, transition_tip, palette[≤3], look_tags (normLookTags), steps, jobId?, itemCount}`.
- Images: one per item, 3s stagger, 50s race each. The anchor gets the full-look editorial shot; the rest are still-lifes; all Cloudinary-hosted.

##### 3.4 Console render (legacy saved rows and pinned-look days)
- `__dlRenderResult(data, promptText, opts)` (DP:17824–18240), page `#dl-result-page` (z-40).
- Opens from `__snOpenItem` on a `daily-look` row (`{skipSave:true, savedId}`) or from `__lkOpenAsDay(m)` (DP:11778), which builds a synthetic `dlData` from a pinned look with no generation call.
- **Header:** date eyebrow; title ladder = occasion → "Wearing *{look}*" → the date; weather pill; vibe chip ("Robes read **X** as the vibe. Not quite? Change the vibe", shown once per user via `rb_vibread_seen__<uid>`, DP:8903–8912).
- **Left panel "The Look" / "The day":**
  - With a saved look untouched → `_dlSavedViewHtml`, i.e. the look page's panel (`_lkLookPanelHtml`), a Day/Evening switcher, and the reading rack with "✓ Wore it" plus the one edit door "Edit this day".
  - Otherwise the console built by `_rbConsole(cfg, items)` (DP:9986): board tiles, palette, fabric chips, "N of M from your wardrobe", the stylist note, tags row.
- **Rack:** `_rbRackRolesHtml` (DP:9149) groups `_rbcRow` rows (DP:9944) under role strips in the order The Canvas / The Anchor / The Texture / The Exclamation Point (`_RB_ROLES`, DP:9095; "The Accents" is normalised via `_rbRoleNorm`, DP:9104). Each row labels the slot (`_dlSlot`, DP:8874: Top/Bottom/Shoes/Bag…), with "✓ In your wardrobe" or brand · retailer · price.
- **Verbs:**
  - **Flick** `__dlFlip` (DP:17044) through `_dlOptions` (DP:8946): the served piece plus her other pieces in the same top-level category **only**. AI alternates are no longer in the flick cycle; a single option hides the arrows.
  - **Anchor** `__dlAnchor` (DP:17054).
  - **Swap** `__dlSwap` (DP:18809) opens the shared `_rbSwapModal` (DP:18662):
    - Header: category-matched wardrobe grid (8 tiles).
    - Cross-category suggestion only between Outerwear and Tops.
    - Otherwise a browse-all grid: "Nothing filed under {category} yet — pick any piece, or snap the one you have in mind."
    - Buttons: Snap mine → `__dlSnapMine` (arms `_waAfterAdd`) and **Save to wishlist** (`__rbSwapWishSave`, DP:18649). The "Sold at {retailer} · {price}" line has no link.
    - `__dlSwapApply` (DP:18819): owned piece overwrites name and brand, clears retailer and price, sets `wardrobe_match`, re-renders, fires `piece_swapped {surface:'daily'}`.
  - **Remove** `__dlRemove` (DP:17063).
  - **Add** `__dlAddPiece` (DP:17134) → `WA.open()`.
  - **Role drag-drop** `__dlRoleDrop` (DP:16948); **tags** `__dlTagsEdit/Apply` (DP:16966/16971).
- **Restyle** `__dlRestyle` (DP:17099): re-posts `__dlSubmit(lastPrompt, {locked: anchored, savedId: _dlActiveSaveId, loose, anchorDate})`.
- **Day-change machinery** (a day wearing a saved look), rules 05/06:
  - `_dlDayBase` is the baseline.
  - The edit bar reads "One change to *{look}*. Its N wears stay with it if you update." with **Discard** (`__dlDayReset`, DP:17495), **Save as a new look** (`__dlDayPromote`, DP:17520 → variant look with `origin_look_id`) and **Update this look** (`__dlDayUpdate`, DP:17528 → `_lkCommitPieces`).
  - The exit guard `_dlExitGuard` (DP:17349) asks once: Update / Save as new / Discard.
- **Wear** `__dlWear` (DP:17580): tries `__lkAccrue(ids, {lookId})`, else PATCHes `wardrobe_items.times_worn += 1` for each owned piece (DP:17617). The standalone "Wear today" button is gone from this surface; "✓ Wore it" survives on the saved view.
- **Keep (legacy loose / unsaved)** `__dlSaveAsk` (DP:17156) → `__dlSaveKeep` (DP:17185):
  - Mints `looks` with `source:'daily'`, `name_provisional:true`, `note = stylist_summary`, and proposals for unowned items (opts = item + alternates, `image_url` from `_pdItemThumb`).
  - Patches `dlData.look_id` and wishlists the unowned pieces.
  - Event `look_saved_from_day`.
- **Persistence (legacy render path):**
  - A fresh non-loose render calls `_rbSvcComplete('daily')`, then `snAdd({type:'daily-look', dlData: {...data, jobId: undefined, generatedImages, prompt}})` + `_pdSync('daily', id, …)` (planned_days) + `look_generated {track:'daily'}` (DP:18230).
  - `_dlPatchSaved` (DP:16956) and `_dlPersistImages` (DP:8576) update the row.
  - Unreachable for fresh generations now; kept for completeness.
- **Feedback:** `_rbFeedbackArm('dl', …)` (DP:18236); the block is rendered in the console.

##### 3.5 `POST /api/alternates` (server.js:1236–1290, rate limit 30/min)
- Request `{item:{name,category,brand}, context: string[] (rest of the look, ≤8), styleDna, styleIcons, gender}`.
- `gemini-2.5-flash`, thinking 0, 500 tokens.
- Response `{alternates:[≤2]{name,brand,retailer_hint,price_point,how}}`.
- **Live callers:** the composer's proposal fetch `_lkShopFetch` (DP:15262), used by the Robes build and proposal Swap (`__lkShopSwap`, DP:15276). `_rbFetchAlternates` / `_rbPrefetchAlternates` (DP:8993/9020) have **no external callers** and are dead.

##### 3.6 `POST /api/lookbuild/note` (server.js:1292–1350, rate limit 30/min)
- Request `{pieces[{name,role,owned}] (2–8), styleDna, styleIcons, gender, vibes}`. Fewer than 2 pieces → 400.
- `gemini-2.5-flash`, thinking 0, 450 tokens, `PANEL_NOTE_RULE` (≤30 words).
- Response `{note (≤300), palette[2–4 hex], look_tags}`.
- Caller: `_lkBuildNoteFetch` (DP:15235), sequence-guarded by `_lkBuildSeq`, patched in place; a failure is silent.

---

#### 4. Looks and the Look builder / composer (`/lookbook`, `/looks`)

##### 4.1 Data model (migration 14 + 16/19/21 + ADR-002)
- **`looks`:**
  - `id uuid` (**minted client-side** by `_lkUuid`, DP:11213)
  - `user_id`
  - `name not null`, `name_provisional`
  - `tags text[]` (legacy)
  - `note`, `photo_url`
  - `source` ∈ `wear|manual|robes|robes-build|daily|variant` (text, default `'wear'`)
  - `origin_look_id`
  - `created_at`, `updated_at`
  - `proposals jsonb` (m19)
  - `render_url`, `render_key` (m21)
  - `climate_band`, `climate_source` (ADR-002, m17/18)
- **`look_pieces`** (`look_id`, `wardrobe_item_id` FK → wardrobe_items, `slot`, `position`, `role` from m16). **A look cannot hold an unowned piece**, so unowned pieces live in `looks.proposals`.
- **`wears`** (`id uuid` client-minted, `look_id`, `user_id`, `worn_on date`, `piece_ids uuid[]` snapshot, `note`, `source`, `source_id`, `confirmed_at`). Unique `(user_id, look_id, worn_on)`; **no update policy**, so corrections are delete-and-recreate.
- **`tag_looks`** (`look_id`, `tag_id`, `source`) + **`tags`** (`user_id`, `kind`, `label`, `slug`, `is_seed`). Upserted in `_tgSetLinks` (DP:4021–4060) with `on_conflict`.
- **Proposal shape:** `{role, chip, cats[], opts[{name,brand,retailer_hint,price_point,how}], oi, img_oi, saved, image_url}`.
- **Object-model rules** (docs/look-entity-brief.md §2):
  - Look is mutable; Wear is immutable; DayCard is presentation only.
  - Promotion to a new look happens **only on an explicit "Save as a new look"**.
  - Identity for accrual is the **exact piece set** (`_lkSig`, DP:11277).

##### 4.2 Reads and writes (DP:11222–11470)
- **`_lkLoad`** (DP:11225):
  - Paints from the cache `rb_looks__<uid>` first.
  - Then runs three parallel GETs (`looks?user_id=…&order=created_at.desc`, `look_pieces?order=position.asc` (RLS-scoped), `wears?user_id=…&order=worn_on.desc`) and stitches them.
  - Merges local-only looks and pushes them up; carries local proposals onto cloud rows that lack the column.
  - Then `_wlBackfillImages()`.
  - A missing table (`PGRST205`/`42P01`) sets `_lkDown` and falls back to local-only.
- **`_lkPushCloud`** (DP:11377): POST `looks` (retry without `proposals` on PGRST204), then `_lkPiecesCloud` → **DELETE all `look_pieces` for the look then POST the rows** (DP:11417–11418, not atomic), then PATCH render fields, then `_tgSetLinks` for wear/vibe.
- **`_lkPatchCloud`** (DP:11433): PATCH `looks` with column-strip retries. **`_lkPatch`** (DP:11460) updates local and cloud, and re-kicks the avatar render if pieces changed.
- **`_lkCreate(o)`** (DP:11569): builds the row, unshifts it, writes the cache, pushes, kicks the render, fires `look_created {source, pieces}`.
- **`_lkAddWear`** (DP:11605): idempotent per date; POST `wears` (a 23505 duplicate is ignored); **PATCHes `wardrobe_items.times_worn` for each piece**; fires `wear_confirmed`.
- **`_lkRemoveWear`** (DP:11640): DELETE the wear, decrement `times_worn`; fires `wear_undone`.
- **`__lkAccrue(pieceIds, {lookId,date,source,sourceId})`** (DP:11673): records a wear only against an **existing** look and needs ≥2 pieces (rule 03).
- **Pins** (`_lkPins`, DP:11692; `_pdRowsLk`, DP:11698; `_lkPin`, DP:11715; `_lkUnpin`, DP:11747):
  - `planned_days` rows with `source_type:'look'`, rebuilt and swept on each change.
  - Day names carried forward in `activity`.
  - Optimistic write to the cache `robes_planned_days__<uid>` (≤400 rows).
  - Events `look_pinned {offset_from_today}`, `look_unpinned`.
- **Delete** (`__lkDeleteAsk`, DP:14680): confirm, then DELETE `looks` (DP:14688; FK cascade removes pieces and wears) and `_pdDeleteSource`. Event `look_deleted {wears}`.

##### 4.3 Lookbook grid (`/lookbook`)
- `_lkPaint` (DP:12266). The stream is `_lkLooks` + `_lkShelfItems()` (legacy `type:'look'` items only; daily-look and key-piece rows are excluded) + the travel-edit row (`_lkHolidayRowHtml`, DP:12527).
- Stat line "N looks · M travel edits".
- Cards are built on the shared LookTile (`_ltTile` / `_ltMosaicHtml` / `window._rbLookTile`, DP:10058+). **Rule: any surface drawing a look composes LookTile.** The mosaic adapts to 1/2/3/4+ cells. Meta reads "3 wears · 4 pieces · last 13 Aug" or "Not yet worn".
- **Sort** `__lkSort` (DP:14208): "Last worn ↓ / First worn ↑"; never-worn looks go to the end in descending order and the front in ascending. Event `looks_sorted`.
- **Refine** `_lkRefineHtml` (DP:12640), `__lkRefinePick` (DP:12661), `__lkRefineClear` (DP:12670):
  - Axes: **Season** (spring_summer / autumn_winter / year_round), **Wear it for** (open; seeds everyday, work, evening, occasion, travel, active, lounge), **Vibe** (open).
  - OR within an axis, AND across axes. A look's tags come from `_lkTagsOf` (DP:12581): local mirror → `climate_band` + `tag_looks` → legacy `tags[]` → inherited from its pieces.
  - Sort and Refine render at every count but are **inert until `streamN ≥ 4`** (DP:12353). A delete that drops below 4 clears the filters.
  - No-result state names the filter ("Nothing tagged X.") with a Clear link. Event `looks_refined {axis, active}`.
- **"+ New ▾"** (`__lkNewMenu`, DP:15043): New look → `__lkNew` (DP:15104); New travel edit → `__lkNewHoliday` (DP:15076).
- **Empty Lookbook = one door:** `_lkPaint` arms the composer when nothing exists (`look_compose_opened {door:'empty-lookbook'}`, DP:12281). The Diary segment is inert at zero.

##### 4.4 Look page (`__lkOpen(id, {from:{label, go}})`, DP:14452; `_lkDetailHtml`, DP:12998–13347)
- **Back link** reads the door she came through (`_lkFrom`): Lookbook / Home / a day ("Tue 8 Sep") / Travel edit / Key piece / the piece's name.
- **Header:** eyebrow **Saved look**; the name (italic when `name_provisional`) with a pencil (`__lkTitleEdit` / `__lkTitleCommit`, DP:14818/14826; `look_renamed`).
- **Meta line:** "1 piece · not yet worn · pinned for Tuesday 22 Sep". The pin clause is a door (`.rb-lk-metapin` → `__lkSeeDay`). Extra pinned days get `.rb-lk-pinstrip` strips with a session-only ✕ (`__lkStripHide`, DP:14710).
- **Panel** `_lkLookPanelHtml` (DP:12890). Image ladder: her photograph → `render_url` (her model) → her model's base cell on a zero-piece look → the board.
  - `dFrame` = `source==='robes'` or proposals present, meaning Robes' frame rather than her photo. With a model on file the page leads on **Model**; You / Model switch.
  - The **camera** stays until her own photograph exists: Add, or Replace on the You view (`__lkDetailPhotoAdd` → `_lkPhotoPick` → `/api/wardrobe/upload` → `_lkHerPhotoPatch` sets `photo_url` and `source:'manual'`, DP:16491/16501). Event `look_photo_added`.
  - The **diary** circle bottom-left → `__lkDiaryOpen` (DP:14556): month sheet with rose dots on filed days. `__lkDiaryGo` (DP:14583): today or future → `_lkPin`; past → `_lkAddWear({source:'retro'})`; already pinned → open the day.
  - "Creating her frame…" chip while `_avBusy[id]`.
- **Tags row** `_rbTagsRowHtml` (DP:9380): "Edit tags" opens the shared sheet `__rbTagSheet` (DP:9447) → `_lkTagsApplyTo` (DP:14783); event `look_tags_edited {surface}`. Untagged reads "＋ Tags".
- **Rack (reading):** head "The rack · N pieces" + **Edit & resave** (sentence case). The swap zone `.rb-lk-swapzone` reads "{Three} aren't yours yet / Swap them for something you own" with **Swap** → `__rbFillOpen(id,'rack')`. Rows show wear counts.
- **Proposals on a saved look:**
  - Swap `__lkPropSwap` (DP:15308) → `_rbSwapModal`.
  - Picking an owned piece **adopts** it (`_lkPropAdopt`, DP:15324): the proposal comes off, the piece joins `look_pieces` with its role.
  - `__lkPropSave` (DP:15412) saves to the wishlist; `__lkPropSnap` (DP:15404).
- **Wear record** (a separate card after the rack): "Worn ——— three times · €N a wear" (`_lkCpw`, only when priced pieces and a wear both exist). Dated rows use `_lkFmtDay` "Tue 8 Sep" plus the `_lkWearDiff` line ("White sandals instead of the jacket — *adjusted on the day*"). "Add a date" → `__lkRetro` (DP:14755).
- **Lineage** (`origin_look_id` in both directions) and "Delete this look" close the page.
- **Edit mode** (`__lkEditToggle`, DP:14750; `look_edit_mode`):
  - Composer-style `.rb-lk-editing` rack: flick `__lkDFlip` (DP:14843), swap `__lkDSwap` (DP:14855), remove `__lkDRemove` (DP:14895), add `__lkDAddOpen` / `__lkDAddPiece` (DP:14919/14905), role drag `__lkDRoleDrop` (DP:14518).
  - "Where it lives" (`_lkLivesHtml`, DP:12841).
  - Change bar: "No changes yet. Swap, add or take a piece out and this line tells you what happens to its wear." → "One change to this look. Its 2 wears stay with it if you update."
  - Buttons: **Discard** (`__lkDraftDiscard`, DP:14971), **Save as a new look** (`__lkPromoteAsk`, DP:14979 → modal "You changed N pieces. Save it as a new look?" + a name field → variant look; `look_promoted`), **Update this look** (the ink button; `__lkResave`, DP:14957 → `_lkCommitPieces`, DP:14946; `look_updated {wears}`).
  - With a model on file the edit canvas dresses her live.
- **Share:** removed from every look surface (a `looks` entity has no share path).

##### 4.5 Composer (`_lkNewHtml(o)`, DP:13891–14200; handlers DP:15081–16460)
- **Variants:** Lookbook (`_lkView='new'`), home (`{home:true}`), kp in-situ (`{kp:true}`), day-filing (`_lkDay`), trip draft.
- Only ONE composer can exist in the DOM at a time (the host flags `_lkKpHost` and the home module decide where it paints).
- **Name gate (rules 01/02):** the masthead input "Name your Look". **Save** stays cream until the look is named, then turns ink. `__lkSaveAsk` (DP:16521) on an unnamed look focuses the field and toasts "Name your look and it's yours to keep". **There is no piece floor** (an empty rack saves). If proposals exist, a confirm reads "N pieces aren't yours yet. The look is saved to your Lookbook, and those pieces go to your Wishlist…".
- **Rack:**
  - The four canonical role strips always render, ghosted until filled, with serif-italic hints (`_RB_ROLE_HINTS`: Canvas · tops & basics / Anchor · the hero piece / Texture · a layer with depth / Exclamation Point · shoes, bag & finish). **A slot never forecasts a role.**
  - A filled strip carries a ⊕ (`onRoleAdd`).
  - One dashed "+ Add a piece" row opens the A2 chooser (`__lkAddOpen`, DP:16299; `_lkAddPaint`, DP:16373). Step 1 "What kind of piece?" (the still-open slots, shown only once the look holds a piece, then all fifteen categories). Step 2 is the wardrobe picker plus "Snap a new piece" (`__lkAddSnap`, DP:16339).
  - Row verbs: flick `__lkCFlip` (DP:16157), swap `__lkCSwap/Apply` (DP:16169/16178; `piece_swapped {surface:'look-compose'}`), ✕ `__lkCRemove` (DP:16198).
  - **Drag-cast roles:** HTML5 drag-and-drop on pointer devices (`_rbcDndInit`, DP:9217); drop → `__lkCRoleDrop` (DP:16111) writes `_lkNewRoles`, saved to `look_pieces.role`. Event `role_cast {surface}`.
- **Canvas ("dressing your model")** `_lkModelPanelHtml` (DP:13758), 4:5:
  - With no model: the prompt "NO MODEL YET … Build her once, and she'll model all your looks." → **Build your model** (`__lkBuildModel`, DP:13821). It parks `sessionStorage rb_lk_draft {rows, seq, name, tags, roles, photo, home}` and `rb_model_return`, fires `look_model_build`, and goes to `/stylenotes`. Restored by `__lkDraftRestore` (DP:13849).
  - With a model: an empty rack shows the **avatar cell** (`POST /api/avatar/cell {avatarId}` → `{url}` or `{jobId}`, `_lkmCellFetch`, DP:13646; 30s cooldown after a failure). Every rack change re-renders via **`POST /api/avatar/render {avatarId, pieces[1–12]{name,category,color,brand,image_url}, userId, genId, gender}` → `{jobId}`** (`_lkmSync`/`_lkmRender`, DP:13688/13660).
  - Renders are **debounced 1800ms** (`_LKM_DEBOUNCE`, DP:13582) and cached by `_lkmKey` = `avatarId|sorted ids|p:sorted proposal names`, which is byte-identical to `_avRenderKick`'s key.
  - The previous frame stays up with a "Dressing her…" chip. A failure leaves the old frame. A hidden canvas never renders.
  - Save reuses the canvas frame (`render_url`/`render_key` → `_lkCreate`).
  - Server rate limit 12/min.
- **Photograph door:** "Add your photograph" is a circle on the canvas. `_lkPhotoPick` (DP:16451) downscales, uploads to `/api/wardrobe/upload`, sets `_lkPhoto.url`. It is a one-way door (add or replace).
- **Robes build** `__lkRobesBuild(opts)` (DP:15168):
  - The door shows only when `!_lkBuilt && !kp && !_lkDraftSrc && ≥5 photographed pieces`. Copy: "Robes dresses her from what you've filed" with a model, "Robes builds one from what you've filed" without.
  - Deterministic client-side pick (`_LK_BUILD_ROLES`, `_lkBuildCandidates`, DP:15141): the hero first, then the least worn; photographed pieces only.
  - Cream breathing slots for a minimum of 900ms; the name lands 420ms later (`_lkBuildTitle`, DP:15148: "{Icon A} meets {Icon B}." for the first build only).
  - ≤1 gap → owned build; ≥2 gaps → aspirational build (every gap proposed via `/api/alternates` → `_lkShop` rows, stills via `/api/lookbuild/images`), then `/api/lookbuild/note`.
  - Footer: Try another (`__lkTryAnother`, DP:15455) · Wear it today (`__lkSaveAndWear`, DP:15465; owned build) or Build from mine only (`__lkBuildMineOnly`, DP:15474; aspirational).
  - Event `robes_build_opened {door, pics, first, mineOnly}`.
- **Prompted draft** `_lkDraftFromDaily(data, o)` (DP:16223):
  - Owned `wardrobe_match` items are placed on the rack with their roles (`_lkPlaceQuiet`, DP:16206).
  - Unowned items become `_lkShop` proposals: `{role, chip, ask, cats, opts:[item + alternates], oi:0, _photo}`.
  - `stylist_summary` becomes the note; plus palette, `look_tags`, and the headline as a provisional name.
  - `o.day` sets `_lkDay` → the return band "‹ Sat 27 Sep" and Save reads "Save to Saturday".
  - Stills are fired via `_lkShopImages` (DP:15440).
  - Event `look_draft_from_daily {kind, owned, proposed, day}`.
- **Proposal still images:** `POST /api/lookbuild/images` (server.js:1183–1234, rate limit 20/min). Request `{pieces[≤4]{name,brand,category}}` → `{jobId, imageCount}`. Still-life per piece, 3s stagger, 50s race, Cloudinary. Polled by `_lkShopPoll` (4s, 300s ceiling, stops once `!_lkBuilt`). **Known race:** saving before a still lands saves the proposal with no image.
- **`__lkSave`** (DP:16557–16685):
  - `busy` latch guarded with try/finally.
  - `source` = `'robes-build'` (a Robes build) / `'robes'` (a kp frame) / `'manual'`.
  - `proposals` are snapshotted with `saved:true`; `render_url` is reused; `note` = the build note; `photo_url` = her photo, else the first proposal still when nothing is owned.
  - Tags are parsed from her edit or inherited (`_rbInheritLookTags`, DP:9422). Slots and roles are saved.
  - **Every proposal goes to the wishlist** (`_wlSaveFromItem`, silent, with the still).
  - Then: a day draft → `_lkPin` + toast "{name} · filed to Saturday ✓" + open the day page (`look_saved_to_day`); a trip draft → `__tvAddSavedLookPick` (`look_saved_to_trip`); a kp-hosted draft → `_kpBuildSaved`; otherwise the grid with toast "{name} saved to Looks ✓".
- **Composer feedback** (4.10) renders under Save only for Robes-generated drafts. Its `itemId` is null except on kp, so the cloud feedback row is **not linked** to the look saved afterwards.

##### 4.6 Look tags
- `_RB_TAG_AXES` (DP:9279): climate (pick one) / wear (open) / vibe (open, up to 4 server-side via `normLookTags`, server.js:816).
- Legacy vocabularies are read-only (DP:9296–9310). `_rbTagsParse` (DP:9318) reads flat `tags[]` using a `vibe:` prefix and treats an unknown string as a custom Wear tag.
- **Custom tags:** "+ tag" inline input (`__rbTagCommit`, DP:9459; 28-character cap). A typed value that matches an existing option on any axis selects it instead.
- **Rule:** the axis vocabularies must stay disjoint.
- Generated looks arrive tagged (`LOOK_TAGS_SCHEMA`, server.js:783); `/api/daily` and `/api/lookbuild/note` take a `vibes` vocabulary so the model reuses her existing vibe words.

##### 4.7 Look rules summary (CLAUDE.md:497–510, 232–242)
- Generated → **named** → **saved** → accrues wears. No look-level wear exists without a saved look.
- A look made for a day is made in the composer and filed to the day on save.
- The day's occasion titles the DAY; vibe belongs to the LOOK.
- The Lookbook holds saved looks only.
- A card opens the look page, never the day.
- Leaving an unsaved composer draft discards it; that is intended.

##### 4.8 Ghost strips (see 4.5)
Education layer plus standing drop targets. Never assert DOM order (`nth-child`) on `.rbc-rack`, because rows regroup by role.

##### 4.9 Generation overlays, abort and cancel
- `_rbOverlayGuard` (DP:8691): 90s abort, "Cancel" after 15s; used by `_cbStyleSubmit`, `__dlSubmit` and `_kpBuildLookRun` (in place).
- `__inStGo` has its own 90s AbortController; `__mbRunGeneration` has a 90s one (DP:23713).
- The intent classifier aborts at 4s client-side and 5s server-side.
- Errors are always product-voice toasts.

##### 4.10 Feedback loop, the hairline line
- `_rbFeedbackArm(prefix, payloadFn, {key, track, itemId})` (DP:16845) keeps state in `var _rbFbState` (DP:16800). State resets only when `key` changes.
- `_rbFeedbackBlock(prefix, copy)` (DP:16856): serif "How was this look?" + "Your taste shapes what comes next"; 👍/👎 circles (aria-labels "Loved it" / "Not quite"). A pick opens one input ("Anything you want more of?" / "What would have made it better?") and a hairline Send. Once sent: "*Noted — filed for next time.*"
- `__rbFbRate/Note/Submit` (DP:16893/16900/16904). Submit sends:
  - `POST /api/feedback {email, rating, comment, prompt, looksOutput}` → Airtable `Feedback` (server.js:421–434), and
  - `_rbFbCloud(track, itemId, rating, note)` (DP:759) → Supabase `feedback` insert `{user_id, lookbook_item_id: Number(itemId)|null, track, rating 1|0|null, note}` + `feedback_given`.
- Prefixes: `kp0–2`, `lk` (composer), `dl`, `tv`, moodboard `#mb-fb` (DP:24045).
- **Bug to fix in the rebuild:** `Number(uuid)` becomes NaN, which serialises to null, so look-entity feedback never carries an id. Use `gen_id` or `look_id`.

---

#### 5. Moodboards (`/moodboards`, `/moodboard/:slug`) — **hidden on beta**

- **Generate:** `__mbRunGeneration(prompt)` (DP:23703) posts `/api/moodboard` with `{prompt, wardrobeItems[{id,label,category,color,image_url}], userId, genId, styleDna, styleIcons, gender}` under a 90s abort. A truncated body shows "Moodboard response was cut off — please try again".
- **`POST /api/moodboard`** (server.js:3191–3373, rate limit 10/min):
  - Model chain `gemini-2.5-flash` → `gemini-2.5-pro`, 30s each, 5000 tokens, **thinking 0 is mandatory**.
  - JSON: `{title, location_context, aesthetic_tags[3–5 CAPS], editorial_direction, the_look[8]{name, category, description, styling_note, retailer_hint, price_point €}, image_prompts{hero_looks[3], flat_lays[2], atmosphere[2]}}`. Fewer than 6 items → error.
  - **`wardrobe_match`** is computed server-side by a loose category/label substring match: `{id, label, image_url, color}` or null.
  - Response `{...data, hero_image:null, grid_images:[], mb_job_id}`. Seven background images (3s stagger, 45s race each); job images are `[{type, url}]`, updated incrementally.
- **Render** `_mbShowResult(data, opts)` (DP:23838):
  - Mosaic with `.rb-tile-loading` spinners and "Creating imagery…".
  - Rail "The rack" `.mbr-card`: 44×44 thumbnail or serif monogram, name, brand, **one** provenance line ("✓ In your wardrobe" + "Worn N×", where `times_worn` is looked up live and never stored, or "retailer · price").
  - Actions: flick (`__mbFlip`, DP:24152, owned same-category options via `_mbOpts`, DP:24125, max 8) + Swap. Dashed "+ Add a piece" → `__mbAddPiece` (DP:24164).
  - Sidebar "N pieces · M from your wardrobe".
  - Must force `overflow:visible` on 8 ancestors on every render.
- **Swap modal** `__mbSwap(idx)` (DP:24181, z-950, max-width 480):
  - "SWAP THIS PIECE" + name + brand; "FROM YOUR WARDROBE" grid of category matches.
  - Otherwise an AI-alternative line; **Snap mine** (`__mbSnapMine`, DP:24110 → arms `_waAfterAdd` → `WA.open()`) and a shop / wishlist CTA.
- **`__mbSwapApply(lookIdx, wardrobeId)`** (DP:24262): sets `wardrobe_match`, then `_mbCommitLook` (DP:24144) → re-render + `_mbUpdate(savedId, {the_look})`. Event `piece_swapped {surface:'moodboard'}`. The editorial mosaic does not change on a swap.
- **Cold-start threshold:** the "Yours" reward shows on **any** genuine match at any wardrobe count (the old `<15` display gate was removed). 15 remains the styling-posture threshold on the server (`styleDnaPromptBlock`, the state directives).
- **Persistence:** `_mbAdd/_mbUpdate/_mbRemove` (DP:23048/23057/23066) → localStorage `robes_moodboards__<uid>` + `lookbook_items` (`type:'moodboard'`). Slug via `_mbSlug` (DP:23035); deep links retry until the cloud pull lands (DP:5312). Delete is always behind `_rbConfirmDelete`.
- **Image polling:** `_mbPollImages` (DP:23746) patches the panel and the saved entry (`panel._savedId`).



### 2D. Travel edit, Diary & planned days, Lookbook & sync, share, navigation, admin

**Scope and conventions.** Repo `/Users/niallmaher/Projects/robes-mvp`, branch `platform`.
- **DP** = `public/js/dashboard-personalize.js`: 27,606 lines, one closure `window.__robes_personalize`, booted from `public/dashboard.html:2667`.
- **CL** = `CLAUDE.md`. Line numbers are from the current tree.
- **Supabase access.** The browser talks to Supabase REST directly.
  - `_waFetch(method, path, body)` is at DP:641. It uses the user JWT and `Prefer: return=representation`.
  - `_rbCapturePost` is at DP:665. It sends `Prefer: return=minimal` and is used for `events`/`feedback`, which are insert-only.
  - The anon URL and key are hard-coded at DP:424-425.

---

#### 0. Cross-cutting data model (needed for every section below)

**`lookbook_items`** (`supabase/lookbook_migration.sql`, `share_migration.sql`)
- PK is `(user_id, id bigint)`. `id` is a **client `Date.now()`**, minted in `snAdd` at DP:5991 and in `_mbAdd` at DP:23050.
- Columns: `type` (free text), `title`, `subtitle`, `img`, `data jsonb`, `share_id` (unique where not null), `is_public`, `created_at`.
- The `data` blob holds `kpData` / `dlData` / `tvData` / moodboard fields. It is authoritative for rendering.
- Live types: `key-piece · daily-look · travel-edit · moodboard`, plus legacy `look` and the read-only `weekly-plan-archived`.
- RLS: own CRUD, admin-read, and `lookbook_select_shared` (`to anon using (is_public = true)`).

**`planned_days`** (migration 12, `supabase/planned_days_migration.sql`)
- A derived **index** over the blobs. One row per *moment*.
- Unique on `(user_id, source_id, day_index, slot)`. `slot ∈ {day, evening}`, check-capped at two.
- `source_type` is free text, with values `daily | travel | look | day` (`weekly` has been swept).
- `source_id` is text with no FK. Examples: a lookbook `Date.now()` id, a `looks.id` uuid, or `'day:<YYYY-MM-DD>'`.
- `day_date` is a `date` in the local calendar.
- Denormalised summary: `status` (`planned|free|worn|swapped`), `activity` (her words), `headline` (the look's name), `thumb_urls`, `item_ids`, `pinned`.
- Reserved columns: `anchor_item_ids`, `ootd_photo_url`, `worn_at`.
- Also carries `environment`. RLS is own-all plus admin-read.

**`looks` / `look_pieces` / `wears`** (migration 14)
- These form the saved Look entity. They are loaded at DP:11222-11240 (`_lkLoad`) and cached in localStorage `rb_looks__<uid>`.
- The Lookbook grid shows only these, plus legacy `type:'look'` items.

**Precedence at read time (not write time).**
- `_pdTier` (DP:5768): `look 3 > daily 2 > travel 1`, with ties going to the latest `updated_at` (`_pdWinner`, DP:5769).
- `_pdMany` (DP:5812): looks and daily rows coexist on a date and never supersede each other.
- `_pdFreshest` (DP:5813): per-date same-type supersession for plans.
- `_pdSupersede` (DP:5905): travel sources with overlapping date ranges; the freshest survives wholesale.
- `day` rows are the bottom tier (tier 0).

---

#### 1. Travel edit

##### User-visible behaviour

**Entry doors.** All of these open the one intake modal `__tvOpen(opts)` (DP:19079-19140):
- Diary `+` menu → "Add a travel edit" (`__rbDiaryAddMenu`, DP:25460, which calls `__lkNewHoliday` at DP:15076).
- Prompt `+` menu `#cb-addopt-tv`.
- The home prompt pill "Plan a trip" (`_ikOpen('travel')`). This unfurls where/when/vibe crumbs on the prompt itself, and the commit calls `_tvCreateTrip`.
- A Look's "Pack it" (seeds via `window._lkPackSeed`/`_lkPackSeedLook`).
- Wardrobe "Pack a trip" multi-select (seeds anchors).
- Moodboard pack CTA (seeds `suggested`). Moodboards are currently hidden behind `_RB_MB_HIDDEN`.

**Intake modal `#tv-brief-modal`.**
- Eyebrow "The travel edit", heading "Where are we packing for?", sub "Where, when and the vibe — then name your days and build the looks."
- Fields: Destination, Dates (from/to), and "The vibe".
- Footer: "It files itself into the diary, on those dates."
- Defaults: from = today+14, to = today+21. The destination is regex-guessed from the brief.
- Validation in `__tvSubmit` (DP:19149):
  - Destination required → toast "Tell us where you’re going first".
  - Parseable dates required → toast "Add the dates — even rough ones".
- Trip length is `_tvTripDays` (DP:19142): `min(10, inclusive span)`, or 7 if the dates don't parse. This matches the server.
- Cancel writes nothing.

**Trip creation.** There is no generation gate. `_tvCreateTrip()` (DP:19203-19260) builds a canvas `tvData`:

```
{headline:'A trip to X.', destination, dateFrom, dateTo, dateLine, vibe, brief, plans,
 dayTitles:{}, capsule:[], looks:[], tripDays, palette:[], genId}
```

- Classifier `dayIntents` become `dayTitles[di]`.
- Anchors become capsule entries with `wardrobe_match` and reason "Packed by you."
- Moodboard suggestions become unowned capsule entries.
- `packLookIds` are imported whole via `_tvImportLookInto` (DP:19180).
- It then renders and fetches weather (`_tvFetchTripWx`, DP:19037).

**Trip page `__tvRenderResult(data, opts)`** (DP:20965-21196). A full-page fixed overlay `#tv-result-page`, z-40, one scroll.
- On render it closes `#sn-page` and `#rb-insp-page` (the standing higher-z rule) and stamps `_rbNavOrigin='diary'`.
- **Band 2 (return):** `‹ {Month Year}` → `__tvGoBack` (DP:18954) → `__rbDiaryOpenAt(dateFrom)`.
- **Title block:**
  - Eyebrow "The travel edit".
  - Name, with ONE pencil (Edit details, `__tvEditDetails` at DP:21261).
- **Meta line** `_tvMastMetaHtml` (DP:20920), repainted by `_tvPaintMastMeta` (DP:20956):
  - Format: `📍 Lahinch, Ireland · 4–8 Sep · 5 days › | ☁ 13–19°C · passing showers | A shell and one warm layer`.
  - Shows "Reading the forecast…" until weather lands.
  - The layer hint comes from `_tvLayerHint` (DP:20903).
- **Travel diary** (`_tvPaintWeek`, DP:20098; `#tv-weekstrip`). One row per trip day:
  - Gutter: weekday / numeral / month.
  - Title: inline-editable via `__tvDayTitleEdit/Key/Commit` (DP:20193-20220). Shows "Name the day" while unnamed.
  - Every pinned look is a `.tvw-lk` row: thumb from `_tvLookHero` (DP:19965), name, "N pieces", "· worn again, N changes" on a re-wear, and `→`. Tapping opens it through `__tvDayLookOpen(di, li)` (DP:19950), which calls `__lkFromTripLook` (DP:14333).
  - A slot "+ Add a look" / "+ Add the first look" goes to `__tvDayPick(di)` (DP:20221), which calls `__mvWear(date, {trip:{di}})`.
  - The section hint counts days in words (`_tvWeekHintText`).
- **"Looks, not yet scheduled"** (`_tvPaintLooks`, DP:20006):
  - Shows only unpinned looks, as 3:4 cards with an occasion eyebrow and a calendar icon → `__tvPinSheet(li)` (DP:19832-19930).
  - Header stat `#tv-looks-stat` reads "N packed · M already in a day", beside "+ Look" (`__tvLookMenu`, DP:20282).
  - When every look is placed: "Every look has its day."
  - When there are no looks: "No looks yet." plus "✦ Robes styles the trip" (`__tvRobesStyleTrip`, DP:19262).
  - Folds to one row: 4/3/2 per breakpoint, with "Show all N looks ▾" (`__tvLooksToggle`).
- **The capsule** is a collapsible drawer `#tv-capbody` (`__tvCapToggle`, DP:21228). It is the packing list.
  - Bar: "The capsule · N pieces", stat "n / N packed" (`_tvPaintPackProgress`, DP:21531), and "+ Add pieces" (`__tvCapAdd`).
  - Keep and Worth-adding cards carry Pack/Packed (`__tvPackToggle`, DP:21550) for owned or `added` pieces.
  - "+ Add" on a Worth-adding piece is `__tvAddOwn` (DP:21572). It joins the pack and silently writes to the wishlist.
  - Swap: `__tvSwap`/`__tvSwapApply` (DP:21701/21876), identity-swap everywhere.
  - A "× N" chip shows wears per piece (the 1:3 matrix is rebuilt each render as `data._usage` and never persisted).

**Pin to a day.**
- The calendar sheet `__tvPinSheet` reuses the look page's diary sheet `#rb-lkdy`:
  - Only the trip's dates are live. The month nav walks only the trip's months.
  - Days this look already wears carry a rose dot.
  - The pill reads "Pin to this day" / "Unpin from this day".
  - `__tvPinSheetGo` (DP:19855) toasts, then the diary row scrolls into view.
  - No dates on the trip → toast plus Edit details.
- The write is `__tvPinToggle(li, di)` (DP:20798): it pushes/splices `look.pins`, deletes that day's `overrides[di]`/`dayAdds[di]`/`dayDrops[di]` on unpin, then calls `_tvPatchSaved()`.

**Adding looks.**
- The `+ Look` picker is the shared Add-a-look picker (§2.6).
- A saved look imports whole: `__tvAddSavedLookPick(id, di)` (DP:20353) → `_tvImportLookInto` → `{imported:true, lookId, title, how, pieces, formula:[], pins}`. `_tvMigrate` (DP:19631) resolves its pieces to capsule entries on render.
- Robes-styled looks:
  - `__tvStyleLooks(opts)` (DP:21365) opens an occasion-chip modal.
  - `__tvMoreGo` (DP:21430) → `POST /api/travel/looks`.
  - The pool is the capsule, plus her wardrobe (cap 24) while the capsule has fewer than 8 pieces.
  - Results with fewer than 2 formula entries are dropped.
  - Toasts: "Styled — one gap piece joined the capsule" / "Styled and pinned to X" / "Look styled — pin it to its days".

**Opening a trip look.**
- A saved (imported) look opens its own look page via `__lkOpen(id, {from:{label:'Travel edit'}, trip:{li,di}})`. That page has two trip-only extras:
  - A pinned-for strip: "Pinned for Saturday 1 Aug · {day title}, on the trip to X." + "Open the travel edit →", or "Packed for X — not yet on a day." + "Pin to a day →".
  - A Pack/Packed toggle on each owned rack row, plus "Pack this look" (`__tvPackLook`, DP:20850).
- A Robes-styled trip look opens as a DRAFT in the look editor (`_lkTripDraftFrom`, `__lkTripDraftSave`/`Discard`), with the bar "Not in your Lookbook yet…" · Discard · **Save this look**.
- Saving mints a `looks` row and re-links the trip look (`imported:true, lookId`).

**Scoped swap.**
- `__tvLookSwap(li, fi, di)` (DP:21729) opens the swap sheet with "Only Day N" (writes `look.overrides[di][fi]`) or "All pinned days" (writes `look.slotOverrides[fi]`).
- Effective piece = day override → look override → formula (`_tvEffCi`, DP:19701; `_tvLookEntries`, DP:19713 applies `dayAdds`/`dayDrops`).
- A wardrobe piece adopted into a look joins the capsule (`_tvCapsuleIndexFor`, DP:21716).

**Edit details** (`__tvEditDetails` / `__tvEditDetailsSave`, DP:21261/21311).
- Fields: Title / Destination / Dates / Vibe.
- Shorter dates clamp every day-indexed map.
- A moved destination or new dates re-fetch weather.
- **Delete this trip** (`__tvDeleteTrip`, DP:21298): confirm "Delete this trip? Its looks and packing list go with it." → `snRemove` → back to the Diary.

**Weather** (`_tvFetchTripWx`, DP:19037).
- Client-side Open-Meteo: geocode, then the forecast when the trip is ≤14 days out, otherwise last year's archive (`seasonal:true`).
- Writes `data.weather = {city, country, tempRange, condition, seasonal}` and persists.

##### Persistence and the pinned day reaching the Diary
- **Fresh save** (DP:21165-21178):
  - `snAdd({type:'travel-edit', title: headline, subtitle: destination · dateLine, img, tvData})`.
  - `jobId` and `_usage` are stripped. Only http images are kept.
  - Then `_pdSync('travel', id, saveCopy)`.
- **Every mutation** goes through `_tvPatchSaved()` (DP:21198-21222):
  - `snUpdate` with `capsule, looks, tripDays, dayTitles, destination, dateFrom/To, dateLine, vibe, plans, weather, headline, days:undefined`.
  - Then `_pdSyncSaved(id)`.
- **Reopen** (the `skipSave` branch, DP:21179-21188) always re-runs `_pdSync('travel', id, data)`. This self-heals the index.
- **Index rows** `_pdRowsTv` (DP:5556-5636):
  - For each trip day: a day with no pins emits a `free` row, or `planned` if the day is titled, with `activity` = the day title.
  - A pinned day emits the first two `_pdTvDayLooks` rows (DP:5519-5554): slot `day`, then `evening`. `activity` = the day title (first row only), `headline` = the look title, plus thumbs and owned `item_ids`.
  - Legacy `days[]` and deferred-trip branches are kept.
- **Bug class to design out:**
  - `_pdTvDayLooks` rows carry read-time fields `_li` and `_n`. PostgREST 400s the whole batch on an unknown column.
  - `_pdCols` (DP:5668) strips every `_`-prefixed key at the write boundary. This is the 2026-09-22 fix (CL:14-20).
  - A server-side index builder removes this entire class.

##### APIs

**`POST /api/travel`** (server.js:1647-2075, rate limit 6/min).
- Only called from `__tvRobesStyleTrip` (DP:19262-19364).
- Request:
  ```
  {destination, dateFrom, dateTo, brief, vibe, plans[], coveredPlans[], shortlistIds[],
   suggestedItems[], importedLooks[{title,occasion,pieces[]}], userId, genId, name,
   styleDna, styleIcons, gender, wardrobeItems[]}
  ```
- 400 "Tell us where you’re going first." when there is no destination.
- Response (server.js:1952):
  ```
  {fallback, trip_label, headline, location_vibe, stylist_summary, suitcase_note, palette[≤3],
   capsule, left_behind, looks[{occasion,title,how,formula[{item_index, note, role}]}],
   tripDays, plans, destination, dateFrom, dateTo, dateLine, weather, jobId, imageCount}
  ```
- Images are polled via `GET /api/images/:jobId` (`_tvPollImages`, DP:18912).
- The client pins returned looks whose `occasion` matches a `dayTitles` value.

**`POST /api/travel/looks`** (server.js:2076-2158, 10/min).
- Request: `{destination, brief, vibe, occasions[≤10], weather, name, styleDna, styleIcons, gender, capsule[≤24 {name,category,brand,tier,owned}]}`.
- 400 "Missing plans or capsule."
- Response: `{looks[], new_item|null}`. `item_index === capsule.length` means the new gap piece.

##### Tables
- `lookbook_items` (via `snAdd`/`snUpdate`/`snRemove`).
- `planned_days` (upsert and sweeps).
- `wishlist_items` (silent write on "+ Add").
- `looks` / `look_pieces` (draft save).

---

#### 2. Diary / calendar (`/diary`, `/calendar`)

##### 2.1 `planned_days` write/read layer (DP:5436-5988)

**Write path.** `_pdSync(sourceType, sourceId, blob)` (DP:5705):
- Debounced 600ms per source.
- Builds with `_pdRowsTv` / `_pdRowsDl` (DP:5638). The daily builder emits one row at `anchor_date`, slot `evening` if `dlData.slot==='evening'`, and `activity = occasion_label || prompt`.
- Then `_pdWrite` (DP:5673):
  - Upsert `POST /rest/v1/planned_days?on_conflict=user_id,source_id,day_index,slot` with `Prefer: resolution=merge-duplicates,return=minimal`.
  - Then **sweep DELETEs**: `day_index=gte.totalDays`; `slot=eq.evening&day_index=not.in.(…)`; `day_date=lt.min`; `day_date=gt.max`.
  - Then a rail repaint at +700ms.
- `_pdSyncSaved(id)` (DP:5720) re-derives from the local lookbook cache.
- `_pdDeleteSource` (DP:5749) runs on `_lbCloudDelete`. There is no FK cascade.

**Look pins** (`source_type:'look'`, DP:11688-11770).
- `_lkPin(id, date, label)` (DP:11715) rebuilds all of the look's pin rows via `_pdRowsLk` (DP:11698):
  - `day_index` is the position in the sorted dates list.
  - `status` is `worn` if a wear exists on that date.
  - `activity` is the look name or a carried-forward custom day name.
- It writes an optimistic cache entry, then `_pdWrite`, and fires `look_pinned`.
- `_lkUnpin` (DP:11747) rebuilds, or deletes the whole source when zero pins remain.

**Named bare day** (`source_type:'day'`, `source_id:'day:<date>'`).
- `_pdDayName(date, v)` (DP:5735). An empty name deletes the row.
- `_pdDayRow` (DP:5745) is the optimistic row.

**Degradation.** A missing table (PGRST205/42P01) sets `_pdDown` and warns once; the app runs without the index.

**Read path.**
- `_pdFetch(from, to)` (DP:5789): `GET planned_days?user_id=eq&day_date=gte&day_date=lte&order=day_date.asc`.
- `_pdRail(from, to, cb)` (DP:5943):
  - Answers from the localStorage cache `robes_planned_days__<uid>` (≤400 rows) first, then from a fresh fetch.
  - Keeps optimistic rows younger than 15s that the server doesn't know yet.
  - Returns `_pdSlots` (DP:5928): `{date, moments[winner per slot], looks: _pdDayLooksAll, title: _pdDayTitle, rows}`.
- `_pdMonth(from, to)` (DP:5970) returns every row unresolved, plus a `sources` title map.

**Day readers.**
- `_pdDayLooks` (DP:5828): pinned looks plus daily looks whose entry still resolves. Ordered day before evening, then by `created_at`.
- `_pdDayLooksAll` (DP:5855): adds every look pinned on a trip day, expanded from the blob (the index stores only two).
- `_pdDayTitle` (DP:5874): the `day` row → a look row's custom activity or a daily `occasion_label` → the trip day title.

##### 2.2 Weekly track removed and archival (ADR-001; `architecture-decisions.md:3-61`)
- The client sweep runs in `_lbCloudPull` (DP:5402-5412). Any pulled `weekly-plan` row is PATCHed to `type:'weekly-plan-archived'` and its planned_days are deleted.
- `snLoad` (DP:5338) filters `weekly-plan*` so a cached row never renders or re-pushes.
- One-shot ops SQL: `supabase/weekly_plan_sweep.sql`.
- Routing consequences:
  - `/api/intent` no longer returns `weekly`.
  - `_rbTrackCfg` falls back to `daily` (DP:26439).
  - The concierge "Weekly Planner" card survives as a "Coming soon" promo.

##### 2.3 Diary shell and list view (`_rbMonthView` IIFE, DP:25206-26383)
- **Open:** `__rbDiaryOpen` (DP:25494) shows `#sn-page` with `rb-cal-on` (`_mvSetView('cal')`, DP:25437). It sets `_rbNavOrigin='diary'` and the crumb `Diary`, and calls `_rbNav('/diary')`.
- `__rbDiaryOpenAt(iso)` (DP:25506) opens at a month. It flips to Month when the date is outside the list window.
- The alias `__rbCalOpen` (DP:25503) is kept.
- **Mode:** `_dyMode` is `'list'` (default) or `'month'`, persisted in localStorage `rb_diary_mode` (DP:25225/25749). `__dySetMode` (DP:25747) re-fetches and fires `diary_mode`.
- **Header** `_dyHeadHtml` (DP:25591):
  - List: "THE NEXT 30 DAYS · N days filed" / "nothing filed yet".
  - Month: "September 2026 · …".
  - Controls: List | Month segment, and ‹ › circles in **month only**.
  - `+` → `__rbDiaryAddMenu` popover `#rb-dy-addmenu`: "Add a look · Lookbook · N looks" → `__mvWear(date)`, or "Add a travel edit · Where are we packing for?".
- **List** `_dyListHtml` (DP:25877-25930): a rolling window, today → today+30 (`_DY_LIST_DAYS=30`, `_dyWindow` DP:25231).
  - The fetch range is the window ±1d (`_mvLoad`, DP:25543).
  - Each date renders as one of:
    - A **trip block** (`_dyTripBlock`, DP:25850): header with title and range, the weather line from `tvData.weather`, then its days.
    - An **invitation row** for empty non-past days (`_dyInviteRow`, DP:25809): a "Name the day" input and a `+`. Enter → `__dyInviteKey` (DP:25985) writes a `day` row.
    - A **day card** (`_dyDayCard`, DP:25816): her title in serif italic, a pencil (`__dyRename`, DP:25957), a `+` at the right edge (`_dyAddSlot`), and one look row per look (`_dyLookRow`, DP:25779).
    - A **past row** (`_dyPastRow`, DP:25841): "Filed · N pieces" and a Worn chip.
  - Consecutive days share one bordered `.dy-block`.
  - The whole row is tappable → `__dyOpenDay(date)` (DP:25953) → day page. The pencil, look rows and inputs stop propagation.
  - Empty window: "Nothing planned *yet.*" / "Name a day, or pack for somewhere. The diary keeps the dates; the lookbook keeps the looks." / the one ink CTA **Plan a trip**.
  - Tail: "That's the next 30 days." + **Month view**.
  - Today gets a rose left spine.
- **Month view** `_mvPaint` (DP:25620-25746):
  - Monday-start grid (`_mvGrid`, DP:25520). The fetch is grid ±7d so bands know their true extent.
  - Rows go through `_mvFresh` (DP:25531), which applies `_pdSupersede` + `_pdFreshest`.
  - Cells are compact `_dcCard`s with `grid-auto-rows:minmax(132px,auto)`.
  - **Trip bands** (`_mvBands`, DP:25561) are travel only. Each is a spanning pill with the name plus a date range; continuations read "↳ {title}, continued".
  - Lanes are reserved only where a band exists: `_MV_LANE_H = 32`, `padTop = lanes ? 4 + lanes*32 : 0`. Beyond two lanes: "+N more" → `__mvMore` popover `#rb-mv-pop`.
  - A band tap → `__mvBand` (DP:26034) → `__snOpenItem` and `month_band_opened`.
  - A cell tap → `__mvCell` (DP:26002) → day page.
- **Phone month rules** (≤767px, CL:27-36; CSS around DP:25312 plus `_dcCard`):
  - Cells ~45×45, square.
  - Hidden: titles, invite, rows, filed, chip, worn and wear-question.
  - `.dc-dots`: one rose dot for a filed day, two for more than one look.
  - Today = a 4px ink `.dc-nowdot`, numeral forced to ink.
  - Empty future cell = a faint `+` absolutely bottom-left (44px hit area).
  - 4px gutters. The trip ribbon is `--mauve`, 24px high; the ", continued" tail is hidden.
  - Desktop is unchanged.
- **Deep link `?d=YYYY-MM-DD`** (`_mvDeepLink`, DP:26366): once the uid is present, resolves `_pdRail(d,d)` → `_rbOpenPlannedDay`.

##### 2.4 Day page (DP:18242-18640)
- **Open:** `__rbDayOpen(date, {seed, from})` (DP:18477).
  - Renders into `#dl-result-page` (z-40). It closes `#sn-page`, `#rb-insp-page` and the piece page.
  - It resets every daily-console guard.
  - It paints from rows in hand (`_dyPgRows`, DP:18261: rail cache ∪ Diary rows ∪ seed), then `_pdFetch(date,date)` and a repaint, keeping optimistic rows younger than 15s.
  - Fires `day_page_opened`.
  - **No URL push.**
- **Anatomy** (`_dyPgPaint`, DP:18398-18462):
  - Return band `‹ {Month Year}`, or `‹ Home` when `from==='home'` → `__rbDayBack` (DP:18464).
  - Eyebrow = the long date ("Thursday 10 September"). Title = the day title in serif italic, or a "Name the day" door. Pencil → inline rename.
  - Weather pill (`_dyPgWx`, DP:18350), a four-rung fallback:
    1. The live `__rbCtx` for today.
    2. The forecast a generated look stored.
    3. `tvData.weather`.
    4. `window.__rbWxForDate(iso)` (DP:325). Open-Meteo `past_days=7&forecast_days=16`, cached per date; returns null outside −7…+14 days.
  - Trip line: "Part of *{trip}* — Open the travel edit →".
  - Section label: "LOOKS FILED TODAY" / "LOOKS FILED" (past) / "LOOKS PLANNED". Right side: "N looks · M pieces filed".
  - Empty: "Nothing filed yet today / that day / yet."
  - Grid of `.dyp-card`s (`_dyPgCard`, DP:18379): 3:4 image (look render → her photo → mosaic; asks `_avRenderKick` with "Creating her frame…"), "LOOK n", Worn ✓, name, "N pieces", hover ✕.
  - A final dashed "+ Add a look · another moment in the day" → `__mvWear(date)`.
- **Verbs:**
  - A card tap → `__rbDayOpenLook` (DP:18533):
    - Travel → `__snOpenItem` + `__tvDayLookOpen`.
    - Otherwise `_rbOpenMoment(m, {fromDay})`. A pinned look opens its look page with a `‹ {date}` band; a daily look opens its console with a reduced header.
  - ✕ → `__rbDayRemove` (DP:18555):
    - A pinned look confirms "Take “{name}” off Thu 10 Sep?" / "It stays in your Lookbook — only the day lets it go." / **Remove** → `_lkUnpin`.
    - A generated daily look confirms a delete (the copy depends on whether a saved look survives) → `snRemove`.
    - Either way, the day's name is written to a `day` row first so it survives.
  - Rename: `__rbDayNameEdit/Key/Commit` (DP:18615-18633) → `_rbDayNameAll(date, rows, v)` (DP:18596). This re-pins every look with the name, sets `occasion_label` on daily looks, sets the trip's `dayTitles`, and writes the `day` row.
- **Rule:** a day holds any number of looks; moment labels are not shown ("LOOK n" only).

##### 2.5 DayCard v3→v5, the home "week ahead" rail, and the peek
- **DayCard module** (DP:10212-11080):
  - Flag `rb_daycard`. `?daycard=off` is the per-device kill switch (DP:10228-10240).
  - `_dcMoments(dayM, eveM, o)` (DP:10598) produces DayCardData.
  - `_dcCard(d, opts)` (DP:10700) is v5, exactly 132px. Three conditions:
    - **empty·ahead:** "Name the day" input plus `+`.
    - **named·dressed:** title plus pencil, up to two 24×30 look avatars then `+N`, plus `+`.
    - **past·filed:** "Filed · N pieces", colour dots, "✓ Worn" or "Wore it?".
  - A past empty day has no door. Today = a rose hairline. The membership chip shows only when there are no looks.
  - Title rule: her words verbatim; a Robes title is a Title Case name with no trailing stop.
  - `_dcMarkWorn` (DP:10824).
  - `_rbDayRename(m, v)` (DP:10892) is the one rename write path: trip → `tvData.dayTitles`; daily → `occasion_label`; look → `_lkPin` with a label; day → `_pdDayName`.
- **Rail `_rbRail`** (DP:24575-25197). "The week ahead": 7 cards, yesterday through today+5 (`_pdRail(today-1, today+5)`, DP:24908).
  - Head: "Open the diary →".
  - Paints on boot, after `_lbCloudPull`, 700ms after writes, and on `visibilitychange`.
  - A card body → `__rbRailOpen` (DP:25048) → `_rbOpenPlannedDay(m, {from:'home'})` (DP:25062). This ALWAYS opens the day page.
  - Inline naming: `__rbRailName/Key/Commit` (DP:24968-25018). Add: `__rbRailAdd` → `__mvWear`. Look row: `__rbRailLookOpen`. Past: `__rbRailWore`/`__rbRailWear` (DP:25145).
  - Mark worn is blob-first: it stamps `worn` into `tvData.days[i]`/`dlData`, resyncs, accrues to the look (`__lkAccrue`), else PATCHes `wardrobe_items.times_worn+1`. Toast: "Logged — Robes remembers what you wore ✓".
  - **"Coming up"** (`comingUp`, DP:24865-24905): one query, `planned_days day_date>today+5 limit 60`, then `_pdSupersede`. Renders the first source's title, range and counts, and "Open the trip →".
- **Day peek** `__rbDayPeek` (DP:10936-11075): survives on the rail's body tap (legacy) and `__lkSeeDay`. Has Open the day / Wore it / Unpin / rename.

##### 2.6 The Add-a-look picker (one picker behind every `+`; DP:26038-26340)
- `__mvWear(date, {trip})` (DP:26204) opens modal `#rb-mv-wear`.
  - Eyebrow "Add a look · {date}". The day's title heads it, with a pencil → `__mvWearRename*` (DP:26287-26319).
- Two doors:
  - **✦ Robes styles one:** `__mvRobes(date)` (DP:26272) goes home, `_ikScopeDay(date)` scopes the prompt, and the day title is dropped into the prompt. In a trip: `__mvPkRobesTrip` (DP:26263) → `__tvStyleLooks({pinTo, preset})`.
  - **✎ Create a new look:** `__mvPkNew` (DP:26250) → `__lkNew({day, trip, tags})`. The composer shows "✓ Filing to Sat 27 Sep" and Save reads "Save to Saturday".
- **Your looks:** sort Last worn ↓ / First worn ↑; Refine (search, Season / Wear it for / Vibe chips; OR within an axis, AND across).
  - Tiles show "Evening · last 8 Sep" / "never worn".
  - Empty states: "Nothing tagged X." / "Nothing in the Lookbook *yet.*" + **Open the composer**.
- Pick → `__mvWearPick` (DP:26320):
  - Trip → `__tvAddSavedLookPick`.
  - Otherwise `_lkPin(id, date, dayTitle)`, toast "“X” — wearing it {date}", fires `look_worn_from_calendar`.

##### 2.7 Day-chip planning (prompt-first)
- The prompt pill "Style today" → `_ikScopeDay(_pdLocalISO())` (defined at DP:26572) sets a day chip `#rb-scopechip` over an empty prompt with ghost text "Where are you going? What's the vibe?".
- The same scope is armed from the rail, the Diary, and `__mvRobes`.
- Prompt `+` menu "Add a look" (`#cb-addopt-lk` → `__cbLookPick`):
  - Attaching a look plus Style me **pins, never generates**. `_lkPin(id, scopedDate|today, promptText)`: the prompt text becomes the day's name.
- The intake module `_ik*` (DP:26385-27256) is gated by `rb_diary_prompt` (`?diary=off|on`, DP:26441/27213).
- `POST /api/intent` (server.js:1384; call at DP:26725) returns `{intent: daily|travel|unclear, destination, date_start, date_end, day_intents[], vibe, confidence}`.
- A daily look made for a day now opens the composer draft (`_lkDraftFromDaily`). Nothing is written until she names and saves (CL:69-70).

---

#### 3. Lookbook / saved (`/lookbook`, `/looks`) and cloud persistence

##### User-visible behaviour
- **Open:** `__snOpen` (DP:6056, wrapped at DP:25518 to force grid view).
  - Shows `#sn-page` (fixed, z-45, top = nav height), eyebrow "Lookbook", `_lkView='grid'`, crumb `Lookbook`, `_rbNav('/lookbook')`.
  - `/looks` → `__lkGo` (DP:16686), which lands on the same shelf.
- **Masthead** (`_lkPaint`, DP:12266-12400; `_rbMastHtml`):
  - "ALL LOOKS · N looks", then pills "Last worn ↓" / "First worn ↑", "Refine · n", and "+ New look".
  - Sort and Refine render inert below **4** looks (`sortLive = streamN >= 4`).
  - Refine drawer (`_lkRefineHtml`, DP:12568+) axes: Season / Wear it for / Vibe. When filters match nothing: "No looks carry those tags." + clear.
- **Grid:** her `looks` entities (`_lkLookCard`, DP:12428; `__lkCardOpen` → the look page) plus legacy `type:'look'` items (`_lkShelfItems`, DP:12409).
  - Sorted by last wear; never-worn looks go last when descending.
  - Cards read "3 wears · 4 pieces · last 13 Aug" / "Not yet worn".
  - A trailing "+ New look · Built on the rack" add card.
  - **Key pieces live in Inspiration**, **travel edits in the Diary**, and **daily looks are days**. None of them appear in the Lookbook.
- **Empty Lookbook = the composer** (one door, FTUE 2026-08-12). `snRenderPage` (DP:7244) always delegates to `_lkPaint`.
- **Delete** is always behind `_rbConfirmDelete` (DP:6071; modal `#rb-del-modal`, z-960, supports `opts.sub/yes`):
  - "Delete this look?" (`__snRemove`, DP:6091).
  - "Delete this trip? Its looks and packing list go with it." (`__snRemoveTrip`).
- **Open saved item** `__snOpenItem(id)` (DP:6107) routes by type: `daily-look` → `__dlRenderResult(skipSave)`, `travel-edit` → `__tvRenderResult(skipSave)`, `key-piece` → `__kpRenderResult`. When the origin was home, it stamps `_rbNavOrigin` by type (DP:6114-6118).
- **Rename of result surfaces** `__rbRename('kp'|'dl'|'tv')` (DP:21976-22037), modal `#rb-rename-modal`.
  - Copy: "Give it a name.", button "Save name". Writes the card `title` and `data.headline`.
  - "Save it first, then you can rename it" when there is no save id.

##### Sync and merge between localStorage and Supabase (DP:5324-5440, 5989-6020)
- **localStorage keys:**
  - `robes_style_notes__<uid>`: every non-moodboard lookbook item.
  - `robes_moodboards__<uid>`.
  - Legacy global and `__anon` keys are deleted on boot (DP:5332-5335).
- `snSave` drops the oldest items when localStorage is full.
- **Write-through:**
  - `snAdd` (mints `id: Date.now()`, `saved_at`) → `_lbCloudPush` = `POST lookbook_items`.
  - `snUpdate` → `_lbCloudPatch` = `PATCH ?id&user_id` (without id/user_id).
  - `snRemove` → `_lbCloudDelete` = `DELETE`, plus `_pdDeleteSource`.
  - Failures are swallowed.
- **Row mapping:** `_lbItemToRow` (DP:5365) splits `{id, type, title, subtitle, img, share_id, is_public}` into columns and puts the rest into `data`. `_lbRowToItem` (DP:5362) spreads `data` back.
- **Boot pull** `_lbCloudPull` (DP:5389-5434; invoked at DP:24505):
  1. Waits up to 10s for the uid.
  2. `GET lookbook_items?user_id&order=created_at.desc&limit=100` (**cap of 100**).
  3. Runs the weekly archival sweep.
  4. Splits moodboard from other items.
  5. **Merges**: any local item whose id is not in the cloud is appended **and re-pushed**.
  6. Sorts by id descending and overwrites both caches.
  7. Repaints the row, page, moodboards and rail.
- **Looks entity** (DP:11193-11470):
  - Cache `rb_looks__<uid>`.
  - `_lkLoad` does GETs on `looks`, `look_pieces` (RLS-filtered, **no user filter**), and `wears`.
  - Writes: `looks` POST/PATCH/DELETE; `look_pieces` delete-then-insert; `wears` POST/DELETE.
  - Ids come from `crypto.randomUUID` (`_lkUuid`, DP:11213).

---

#### 4. Share flow

##### Publish (DP:21922-22170)
- Trigger: `window.__rbShare()` (DP:22082). `App.openShare` is repatched to it.
  - The nav header `#rb-share-btn` is currently always hidden (DP:22651-22657).
  - Share has been removed from look surfaces (CL:75 point 7). It remains reachable from kp, dl and tv results and moodboards.
  - **A `looks` entity has no share path.**
- Surface resolution: `_shareActiveEntry()` (DP:22040) picks by actual visibility: moodboard panel `.visible` → tv → dl → kp result page. `null` → toast "Style something first — then share it".
- `_shareFindOrMake(id, kind, data)` (DP:21951) returns, in order:
  - The stored entry.
  - A thin `{id, …}` when the item is not in the local cache.
  - A lazy `snAdd`/`_mbAdd` reconstruction via `_shareBuild` (DP:21930) from `window.__lastKpData/__lastDlData/__lastTvData/panel._currentData`. This strips non-http images.
- **Share-id minting** `_shareEnsurePublic` (DP:22060-22080):
  - 5 random bytes → **10-hex** `share_id` (`crypto.getRandomValues`).
  - `PATCH lookbook_items?id&user_id {share_id, is_public:true}`.
  - If 0 rows come back: `_lbCloudPush` → wait 1.2s → retry once, else throw.
  - Then `_shareMarkLocal` and `share_created`.
  - An already-shared entry reuses its `share_id`.
- **Modal `#rb-share-modal`:**
  - Thumb and title. Heading "Can we share your look?". Sub "Add your Instagram handle and we’ll tag you when we showcase this week’s best looks."
  - `@` input, prefilled from `profiles.instagram_handle`.
  - **Share my look** → `navigator.share({title:'{title} — styled by Robes', url})`, else copy.
  - Copy row: "Preparing your link…" → `origin/board/<sid>` (`window.location.origin`, so beta links stay on beta). "Link copied".
  - Failure: "Couldn’t publish this look — try again shortly".
  - Note: "Anyone with the link can view this look — no account details are shown."
- **IG capture** `saveHandle` (DP:22133-22145), on share or copy when the handle changed:
  - `PATCH profiles {instagram_handle}`.
  - `POST /api/instagram {email, handle}` (server.js:409-418): strips `@` and upserts Airtable `Contacts` by Email. Returns `{ok:true}`; 400 "No handle provided".
- There is **no unshare UI** (`is_public` is never set back to false).

##### Public page `GET /board/:shareId` (server.js:2303-2422; `public/board.html`)
- Rate limit 40/min. `shareId` is sanitised to `[A-Za-z0-9_-]{≤48}`.
- One REST call with the **anon key**: `lookbook_items?share_id=eq.X&is_public=eq.true&limit=1&select=type,title,subtitle,img,data,created_at`.
- `publicSharePayload(row)` (server.js:2317-2372) is a whitelist:
  - Fields: `{type, title, subtitle, images[≤10 https], pieces[≤24 {name,brand,price}], tags[≤6], editorial[≤400]}`.
  - Extraction per type: moodboard (hero + grid + `the_look`), daily-look (`dlData.steps[].items`), travel-edit (`tvData.capsule`), key-piece (`kpData.generatedImages`, `photoUrl`, `ways`).
- The template's `<!--__OG__-->` is replaced by title/description/canonical/OG/Twitter tags (`summary_large_image` when there is an image). The `__BOARD_JSON__` payload is inlined with `<` escaped.
- Not found or private → 404 with the same template:
  - `<title>Robes — this look isn’t shared any more</title>` + noindex.
  - Page copy: "This look isn’t shared *any more.*" + a "Create your own" CTA.
- Page (`board.html:62-97`):
  - Eyebrow "{Type label} · Styled by Robes", h1, sub, tag chips, italic editorial.
  - Image grid (first image wide when there are more than 2).
  - "The look — N pieces" list.
  - Dark "Want this styled *for you?*" → **Join Robes** (`https://www.byrobes.com`).
  - Loads `posthog.js`.

##### `/look/:id` (production marketing flow, not the beta dashboard)
- `POST /api/look` (server.js:2159-2197):
  - Body: `{name, piece, photoUrl, ways[], generatedImages[], fallback, prompt, email}`.
  - Mints `randomBytes(5).hex` into the in-memory `lookStore` (48h TTL) and returns `{id}`.
  - Asynchronously uploads data-URI images to Cloudinary and creates an Airtable `Feedback` row (`Piece Link = BASE_URL/look/id`, `Looks Output` = JSON).
- `GET /api/look/:id` (server.js:2199-2238): memory → Airtable fallback by `Piece Link` → re-cache; 404 `{error:'Look not found or expired'}`.
- `GET /look/:id` serves `look.html`, which fetches `/api/look/:id` (look.html:357).
- Callers: `public/js/app.js:341` (/api/look), `:689` (/api/feedback), `:768` (/api/instagram).

##### `/api/feedback` (server.js:421-436)
- Body: `{email, rating, comment, prompt, pieceLink, photoUrl, looksOutput}` → Airtable `Feedback`.
- Dashboard callers: DP:16909 (the shared `_rbFeedbackBlock`), DP:22265, DP:24076 (moodboard).
- Each is mirrored by `_rbFbCloud` (DP:759) → the Supabase `feedback` table `{user_id, lookbook_item_id, track, rating 1/0/null, note}` + `feedback_given`.

---

#### 5. Navigation

##### Model: three questions, three slots (CL:38-45; the chrome module at DP:4706-4920)
- **Band 1: the sticky nav** ("Where am I?"). `dashboard.html:1890-1955`.
  - Wordmark `#nav-wordmark` = Home.
  - Desktop `#rb-topnav`: **Lookbook · Diary · Wardrobe · Inspiration**.
  - Mobile dock `#rb-dock` (≤767px): **Home · Lookbook · Diary · Wardrobe · Inspiration**.
  - The lit tab is **held state** `window._rbNavOrigin ∈ home|lookbook|diary|wardrobe|inspiration`. `_rbNavSync` (DP:22596-22674) stamps it when a ROOT is on top and reads it when a detail is on top. It runs on a 350ms poll.
  - From home, a detail lights its natural section: key piece → Inspiration, dated look or trip → Diary, loose look → Lookbook, piece → Wardrobe.
  - `__rbNavGo(dest)` (DP:22563) is the single tap handler. `'calendar'` is an alias for `'diary'`. `'back'` climbs to the origin root.
  - `__rbNavGo('diary')` opens the **current** month.
- **Band 2: the return band.** `_rbRetHtml(cfg)` (DP:4829): 48px, one `‹ {previous screen's title}` pill, plus a set position "n of N in this look / in tops / on this trip" with ‹ ›.
  - Handlers use a registry: `_rbRetReg(key, {back, prev, next})` (DP:4816) → `window.__rbRet(key, what)` (DP:4817). `_rbRetTop()` is at DP:4913.
  - **Roots carry no band.**
  - ≤767px: bands 1 and 2 collapse. `.nav.rb-depth` hides the wordmark and avatar; `#rb-backpill` (→ `__rbNavBack`) carries the label and `#rb-navset` the position. Swiping the title block walks the set.
- **Band 3: the title block** `_rbTitleHtml` (DP:4848):
  - Rose eyebrow = the object KIND, never the section name.
  - Serif 31px title, pencil/star buttons, italic sub, 12px meta.
- Index screens use one masthead line `_rbMastHtml` (DP:4866).
- All action pills are `.rb-pill`.
- **Back labels per surface:**

  | Surface | Back label | Handler |
  |---|---|---|
  | Look page | the door she came through: Lookbook / Home / a date / trip title / piece name | `_lkFrom` |
  | Day page | `‹ {Month Year}` / `‹ Home` | — |
  | Trip | `‹ {Month Year}` | — |
  | Key piece | `‹ Inspiration` + n of N | — |
  | Piece page | `‹ Wardrobe` / `‹ {look}` / `‹ Wishlist` | — |
  | Day console | `‹ {Mon 24 Aug}` | `__dlToDay` |

##### Breadcrumbs (legacy, hidden)
- `_rbInitBreadcrumb` (DP:22425-22488) provides `window.rbSetCrumb(segments)` / `rbClearCrumb()` (DP:22468/22481).
- The crumb `#rb-crumb` is **hidden in CSS** but still called.
- The wordmark onclick (DP:22440-22466) closes everything and `_rbNav('/dashboard')`. It hard-navigates when the wardrobe panel won't close.
- Related: `_rbPatchSubtabs` (DP:22686) and `_rbObserveWardrobe` (DP:22727).
- **Rebuild:** drop crumbs. The return band plus the lit tab is the model.

##### Client routing `window._rbNav` (DP:24454-24500)
- `_rbNav(path)`: `history.pushState({rb:path}, '', path)` when the path differs. Guarded by `_rbRouting`.
- A single `popstate` handler hides `sn-page`, the inspiration page, the piece page, the moodboard list/result, and the kp/dl/tv result pages. It closes the wardrobe panel when leaving `/wardrobe|/wishlist`, then reopens the view for the new path, else `rbClearCrumb`.
- Boot deep links are in `_waInit` (DP:5178-5322).
- **Overlays that do NOT change the URL:** look page, day page, trip page, key-piece result, daily console, composer, all modals. Only roots and `/piece/:id` push.
- PostHog wraps `pushState`/`replaceState`/`popstate` to fire `$pageview` (`public/js/posthog.js:62-81`).

---

#### 6. Admin panel (`/admin`, `public/admin.html`)

##### Gate and routing
- `gate()` (admin.html:216-227): `sbClient.auth.getSession()` → `profiles.select('is_admin, first_name')`.
  - Anything other than `is_admin === true` → `location.replace('https://byrobes.com')`.
  - The server route (server.js:2250) is unguarded. **Rebuild: gate server-side.**
- Hash routing (`route()`, admin.html:232-240): `#users` (default), `#user/<uuid>`, `#health`, `#feedback`.
- The env select persists `rb_admin_env` (`all|beta|production`) in localStorage and filters generation_log and events.
- Sign out → HOME. PostHog is deliberately excluded.
- All reads use the admin's JWT through `is_admin()` RLS (migration 11, `supabase/admin_capture_migration.sql`). No service key is used in the browser.

##### Screens

**Users** (admin.html:269-330)
- RPC `admin_user_overview(p_limit 50, p_offset, p_search, p_sort, p_dir)`.
- Columns: Name / Email / Joined / Onboarded / Wardrobe / Lookbook / Feedback / Last action / Last sign-in. Headers are click-sortable server-side.
- If the RPC predates the sort params, it falls back to the legacy 3-arg call plus a page-local sort, with a notice.
- Search. Prev/Next paging with "Page n of N". A row click → `#user/<id>`.
- Error text: "has migration 11 … been run, and is your account flagged is_admin?".

**User detail** (admin.html:331-475)
- 10 parallel reads:
  - RPC overview (`p_user`)
  - `profiles *`
  - `wardrobe_items` (200)
  - `wishlist_items` (100)
  - `lookbook_items` (id,type,title,subtitle,img,share_id,is_public,created_at,data; 100)
  - `feedback` (100)
  - `events` (100, env-filtered)
  - `generation_log` (300, env-filtered, no prompt/response)
  - `notifications` (kind,ref,sent_at)
  - `wardrobe_inbox`
- Sections:
  - **Profile · Style DNA:** season, undertone/contrast, body, icons, budget, IG, analyses.
  - **Feedback:** 👍/👎, track chip, note.
  - **Activity:** event_type chip plus a metadata line. Collapsed to 8 (`ACT_SHOW`) with "Show all N … ↓" / "Show the latest N ↑".
  - **Emails:** notifications ledger.
  - **Receipts:** status · retailer · N pieces · N from photographs · #order · filed-to / nothing kept / waiting.
  - **Wardrobe** and **Wishlist** thumbnail grids (★ hero, worn count).
  - **Lookbook** thumbnail grid (`TYPE_LABEL` map, "· shared"). A tap opens the output viewer.
  - **Generations:** rows grouped by `detail.gen_id`. Shows her typed prompt (`detail.user_prompt`), one chip per LLM call (text/img, ok/partial/error, latency; → `inspectGen` modal), and "Saved as" = the lookbook row whose `data` JSON contains that gen_id (→ output viewer, plus the /board link). Collapsed to 10 (`GEN_SHOW`), cap 100 (`GEN_MAX`).

**Output viewer** `viewOutput(row, gRows)` (admin.html:496-578), per type:
- key piece: photo plus the 3 ways with frames.
- daily look: summary plus pieces grouped by role.
- travel edit: destination/dates/vibe, hero, each look with occasion and pin days, piece strip, capsule grid.
- moodboard.
- Plus her prompt, a public page link, and a "Raw data" `<details>`.
- `looks` entities are NOT viewable (migration 14 has no admin-read policy).

**Generation health** (admin.html:586-643)
- `generation_log`, last 7 days, limit 1000, env-filtered.
- Stat tiles: calls / errors+timeouts / partial (no image) / users affected.
- By-endpoint table: calls, ok, partial, failed, median latency, tokens.
- Not-OK table (200): a row → `inspectGen(id)` modal showing the full prompt, response and detail.
- Then **Emails · last 7 days** (`renderMailHealth`, from `notifications`, per kind) and **Receipts · last 7 days** (`renderInboxHealth`, `wardrobe_inbox`, with no env filter).

**Feedback feed** (admin.html:691-730)
- `feedback` with `count:'exact'`, 50/page, newest first. Names come from `profiles.in(ids)`.

##### Capture plane
- **`events`** (client, via `_rbTrack`, DP:681). Insert-only RLS.
- **`generation_log`** (server-only): the service-role wrapper on `ai.models.generateContent`. The `/api` middleware at server.js:68-79 carries `{endpoint, userId, genId, userPrompt(≤400)}` in AsyncLocalStorage.
- **`feedback`** (client, via `_rbFbCloud`).
- `environment` = hostname www.byrobes.com/byrobes.com → production, else beta (`_RB_ENV`, DP:657). Server-side: `PUBLIC_URL` (server.js:66).

---


#### Key rules and thresholds to preserve (quick list)

**Diary**
- List window = 30 days (`_DY_LIST_DAYS`).
- The rail is exactly 7 days (yesterday → +5). "Coming up" starts beyond today+5.
- The month fetch is grid ±7d; the list fetch is window ±1d.
- `planned_days.slot` is capped at two; beyond two looks the card shows `+N` from the blob.

**Travel**
- Trip max 10 days; default dates +14 / +21.
- The pool falls back to the wardrobe while the capsule has fewer than 8 pieces (cap 24).
- `/api/travel/looks`: ≤10 occasions and ≤1 new gap piece; styled looks need ≥2 formula entries.

**Lookbook**
- Sort and Refine go live at ≥4 looks.
- The pull cap is 100.

**Day card and copy**
- Day card = 132px.
- Month cell on the phone: dots only, no titles.
- Today = rose hairline (rose left spine on the list).
- A past empty day is never an invitation.
- Months always print as 3 letters (`_rbMon3`; ICU prints "Sept").
- Her words are shown verbatim; Robes titles are 2–4 word Title Case names.

**Behavioural rules**
- Deletes and unpins always confirm.
- Any overlay opener closes higher-z pages first.
- Capture never blocks or surfaces to the user.
- `events` and `feedback` inserts must use `return=minimal`.

**Share**
- `share_id` = 10 hex characters.
- `/board` exposes whitelisted fields only.
- The rate limit is 40/min.


---

## 3. Client-side business logic that must move server-side

This section consolidates the per-area lists in 2A–2D. Each row says where the logic lives today, why it is a problem, and its recommended home on the new platform. The groups are in rough priority order.

### 3.1 Trust and identity (do these first)

| Logic | Legacy location | Problem | Server home |
|---|---|---|---|
| No JWT verification on AI/upload routes. `userId` comes from the body. `/api/wardrobe/analyse`, `/upload` and `/api/stylenotes/analyse` have no rate limit. | server:68 (logs only); 362, 523, 908, 1183, 1236, 1304, 1384, 1647, 2076, 2489, 2703, 2793, 3068, 3092, 3191, 3375 | Cost and abuse surface; identity is spoofable | Auth middleware on every `/api/*`: verify the Supabase JWT and derive `userId` |
| The client ships `styleDna`, `styleIcons`, `gender` and up to 60 `wardrobeItems` in every generation body | DP 8775, 23396, 23715, 19307, 21452 … | Payload bloat; the client can forge context | The server loads the profile and wardrobe from the JWT's uid |
| Admin gate is client-only (`is_admin` select, then redirect) | admin.html:216–227; server:2250 | The page ships to anyone | Server/middleware guard on `/admin`; keep `is_admin()` RLS as defence in depth |
| Supabase URL and publishable key hard-coded in 6+ places | dash.html:2587, DP:424, DP:148, signup/onboarding/stylenotes/reset/admin | Config drift | Env config / a typed client package |
| `environment` derived from `location.hostname` for `events` | DP:657, onboarding:524, stylenotes:1290 | Spoofable, and duplicated | Server config (`PUBLIC_URL`) |

### 3.2 Id minting

| Logic | Location | Server home |
|---|---|---|
| `lookbook_items.id = Date.now()` (bigint, composite PK `(user_id,id)`), also used as the sort key | `snAdd` DP:5991, `_mbAdd` DP:23050 | `uuid default gen_random_uuid()` (or client uuid v7 accepted idempotently). Migrate `planned_days.source_id` with it (see `docs/system-architecture.md` "two id schemes"). |
| `_rbGenId` = `Date.now().toString(36)+rand` generation correlation id | DP:680 | Minted by the generation endpoint, returned to the client, and stamped server-side onto the saved artifact. Promote `gen_id` to a column; admin currently substring-searches `data` JSON (admin.html ~455). |
| `looks` / `wears` ids from `crypto.randomUUID` | `_lkUuid` DP:11213 | Acceptable as idempotency keys; the server should own create |
| Share id: 10 hex from `crypto.getRandomValues`, PATCHed with the owner JWT, push-then-retry race | `_shareEnsurePublic` DP:22060–22080 | `POST /api/share {artifactId}` → server mints, sets `is_public`, returns the URL; add unshare |
| Receipt inbox address token (`Math.random`, collision retry on the client) | `_wiAddress` DP:3731–3765 | `POST /api/inbox/address`, or a DB default |
| Hero position `max+1`, cap 10 on the client | `_waHeroNextPos` / `__waHeroToggle` DP:4226–4254 | RPC `toggle_hero(piece_id)` with the cap enforced |

### 3.3 Persistence, sync and multi-table writes

| Logic | Location | Server home |
|---|---|---|
| **Lookbook sync/merge.** localStorage is the instant cache. The boot pull (limit 100) merges, re-pushes local-only items, and overwrites caches. | `_lbCloudPull` DP:5389–5434; `snLoad`/`snSave` 5336–5352; `_lbCloudPush/Patch/Delete` 5372–5391 | The server is the source of truth. React Query/SWR (web) + an offline mutation queue (Expo). Paginate. |
| **Looks save/commit** (POST looks → DELETE+POST look_pieces → tags → proposals → pin), non-atomic, with column-strip retries | `_lkCreate` 11569, `_lkPushCloud` 11377, `_lkPiecesCloud` 11408, `_lkPatchCloud` 11433, `__lkSave` 16557, `_lkCommitPieces` 14946, `_lkPropAdopt` 15324 | `POST /looks`, `PATCH /looks/:id` (transaction or RPC) |
| Look local↔cloud merge on load | `_lkLoad` DP:11225–11275 | Same as the lookbook row above |
| Wardrobe row write + schema strip-and-retry ladder; payload assembly (category fold, L2/L3 consistency, price parse, defaults, `season_source`) across four code paths | `_waRowWrite` DP:3613–3652; `WA.submit` 3307–3480; 6993, 21625, 27593 | `POST/PATCH /api/wardrobe/items` (+ wishlist) validated with `wardrobe_taxonomy.resolveTaxonomy` |
| Taxonomy maps hand-copied from `wardrobe_taxonomy.js` | DP:437–506, 4125–4145 | A shared package, or computed columns |
| Tag namespace writes (`_tgEnsure` upsert + link diffing, unscoped GET) | DP:3998–4067; `_rbTagsParse` 9318, `_rbInheritLookTags` 9422 | RPC `set_tags(owner, kind, slugs, source)` |
| Receipt filing (N inserts then a PATCH on the receipt; a partial failure duplicates on retry) | `_wiFile` DP:3768–3831 | `POST /api/inbox/:id/file` in one transaction |
| Wishlist "I bought this" (copy then delete) | `__wlBought` DP:4565 | `POST /api/wishlist/:id/bought` (transaction) |
| Onboarding first piece: analyse → upload → insert → prefire `/api/style` → hand off via sessionStorage (base64 photo) | onboarding.html L1110–1256; DP:27260–27290 | One server action returning a job/artifact id. The dashboard reads it by id. |
| Onboarding completion + loop guards | onboarding L530–538; dash.html:2651 | `POST /onboarding/complete`; middleware redirects on `onboarded_at` only |
| Profile boot select with the migration strip-retry ladder | dash.html:2615–2643 | `GET /api/me` returning a normalised profile |
| Account details raw REST PATCH | DP:138–199 | `PATCH /api/me` (validate mobile) |
| IG handle double write (profiles PATCH + `/api/instagram` → Airtable) | DP:22133–22145 | `PATCH /api/me {instagram_handle}`; the server fans out to Airtable |
| Notification prefs: whole-JSONB PATCH chain | `_rbNotifyPatch` DP:712–729; tz init 735 | `PATCH /api/me/notification-prefs` with a server-side merge |
| Feedback dual post (Airtable via `/api/feedback` + Supabase `feedback`); look uuid cast through `Number()` → null | `_rbFbCloud` DP:~760–775; 16909, 22265, 24076 | `POST /api/feedback {genId, artifactId\|lookId, rating, note}` |
| Trip creation / migration-on-render / mutations / pin toggles / day-index clamping | `_tvCreateTrip` ~19180–19260, `_tvMigrate` 19631, `_tvImportLookInto`, `_tvPatchSaved` 21198, date edit 21311 | A trips API; a one-time migration of legacy `days[]` blobs; consider normalised tables |
| Robes-build orchestration (deterministic pick → `/api/alternates` per gap → `/api/lookbuild/images` → `/api/lookbuild/note`) | `__lkRobesBuild` DP:15141–15175 | `POST /looks/robes-build` |
| Photo round trip (download the Cloudinary image to base64, re-upload in the `/api/style` body) | `__cbWardrobeApply` DP:~23202 | Pass `wardrobeItemId` / `imageUrl`; the server fetches it |
| Wishlist image backfill by name match (≤40 PATCHes on every load) | `_wlBackfillImages` DP:4432 | A one-off data migration, then delete |

### 3.4 Planned days and the Diary

| Logic | Location | Server home |
|---|---|---|
| **planned_days derivation** from trip, daily and look blobs (`_pdRowsTv`, `_pdTvDayLooks`, `_pdRowsDl`, `_pdRowsLk`, `_pdBase`, `_pdCols`), plus the upsert, **four sweep DELETEs**, 600ms per-source debounce, reopen self-heal and optimistic cache | DP:5478–5757, 11698–11770 | Recompute a source's rows inside the same transaction that saves the source (trigger or plan service). Add FK/cascade on source delete (today `_lbCloudDelete` → `_pdDeleteSource` DP:5390). |
| **Read-time precedence** (`_pdTier`, `_pdWinner`, `_pdFreshest`, `_pdSupersede`, `_pdSlots`, `_pdDayLooks(All)`, `_pdDayTitle`, `_mvFresh`, `_mvBands`) | DP:5768–5941, 25531–25590 | `GET /diary?from&to` returns resolved days `{date, title, looks[], trip, bands}` (SQL view or RPC). This keeps rail, list, month, day page and picker identical on web and Expo. |
| Day naming across sources (the `day:<date>` pseudo-source) | `_rbDayRename` DP:10892, `_rbDayNameAll` 18596, `_pdDayName` 5735 | `PATCH /days/:date {name}`; consider a first-class `days` table |
| Look pins rebuilt positionally (`day_index` = position in sorted dates) | `_lkPin`/`_lkUnpin` DP:11715–11770 | Pins as rows keyed by (look, date); `POST/DELETE /looks/:id/pins/:date` |
| **Weekly-plan archival sweep** (type → `weekly-plan-archived`, drop its planned_days) on every lookbook pull; `snLoad` filter | DP:5402–5412, 5338 | Already in `supabase/weekly_plan_sweep.sql`. Run it once and delete the client code (ADR-001). |
| Wear accounting: read-modify-write of `wardrobe_items.times_worn` from a stale local copy; wears assembled from three sources | `_lkAddWear` 11605, `_lkRemoveWear` 11640, `__dlWear` 17580, rail 10861/25177, 17617; `_pcWears` 6230–6257 | RPC `record_wear(look_id, date, piece_ids)` (atomic), or derive counts from `wears`; `GET /pieces/:id/wears` |
| Trip and daily weather (Open-Meteo geocode/forecast/archive, Nominatim reverse geocode) | DP:325–410, 19037–19075; stylenotes L1804–1837 | Cached server weather proxy (Nominatim's policy needs a UA and rate limiting) |

### 3.5 Generation jobs and images

| Logic | Location | Server home |
|---|---|---|
| **Image polling + patching the saved blob from the client.** A closed tab means blank images. `imageJobs` is in-memory (10-minute TTL, single instance), so it is lost on redeploy. | `_kpPollImages` DP:7652 / `_kpPersistImages` 7614; `_dlPollImages` 8621 / `_dlPersistImages` 8576; `_lkShopPoll` 13458; `_lkmPoll` 13635; `_avRenderKick` 11536–11565; `_mbPollImages` 23746; stylenotes 1430; onboarding prefire | A durable `generation_jobs` table + worker that writes URLs straight onto `lookbook_items` / `looks.render_url` / proposals. Clients subscribe (Supabase Realtime / SSE); Expo can use push. |
| `/api/daily` images generated but never polled (`noImages` omitted) | `__dlSubmit` 8775, `_kpBuildLookRun` 8070 | Compose-only by default; reuse the job for proposal stills |
| Intent routing split between client regexes and `/api/intent` (which has no `style` intent) | `_ikSubmit` DP:26651–26735, `_cbDetectIntent` 23441, restyle fast paths 26736 | One `/api/intent` that accepts `hasPhoto` / `attachedPieceId` |

### 3.6 Profile, Style DNA and home state

| Logic | Location | Server home |
|---|---|---|
| **Style DNA writes are browser-only.** `/api/stylenotes/analyse` returns a `style_dna` fragment; the client merges it and PATCHes the whole object plus derived scalars. Onboarding archetypes do the same. | stylenotes L1674–1706; onboarding L819–826 | `/api/stylenotes/analyse` writes the analyses + a `jsonb` merge itself (RPC); an archetype merge RPC |
| Avatar id derivation duplicated client (`mvSkinIdx`/`mvHairIdx`/`mvFig`/`mvModelId`) and server (`parseAvatarId`) | stylenotes L1058–1089, 1269–1283 | `POST /api/model` computes and persists `avatar_id` + `avatar_prefs` |
| Budget stored as a CSV string of tiers; mock defaults in state | stylenotes L1501, L816–819 | `budget_tiers text[]` validated server-side |
| **Wardrobe counts / ladder / home posture** (`_waItems.length`, photographed count `_lkRobesPics`, `_MS_UNLOCKS` 5/10/15, `_rbGateConcierge`, `_rbConciergeDone`, `_rbNextLine`, model-door snooze, "just crossed" memory) | DP:883–1284, 15875–16107; localStorage `rb_ms_last__`, `rb_svc_done__`, `rb_model_door_off__` | `GET /api/home` → `{mode, nextLine, showConcierge, showModelDoor, ladder, counts}`, using `profiles.wardrobe_items_count` (already trigger-maintained); per-user flags on the profile, not per device |
| Season-now (Apr–Sep = spring_summer, hemisphere-naive) | `_waSeasonNow` DP:4149 | Server utility using profile location/timezone |
| Event capture dual write (PostHog + `events` insert from the browser) | `_rbTrack` DP:681; `obTrack` onboarding:520; `snTrack` stylenotes:1286 | Keep the PostHog client SDK; write outcome `events` rows server-side (or `POST /api/events`) |

---

## 4. Storage inventory (localStorage / sessionStorage)

`<uid>` is the Supabase user id (`_waUid()`). Every access is wrapped in try/catch. None of these keys is needed on the new platform except as optional caches. Durable state belongs in Supabase.

### localStorage

| Key | Contents | Writer (reader) | In Supabase? |
|---|---|---|---|
| `robes_style_notes__<uid>` | Array of lookbook items: `key-piece`, `daily-look`, `travel-edit`, legacy `look`. Weekly-plan rows are filtered out. The name is historical: "Style Notes" was the Lookbook. | `snSave` DP:5347 (`snLoad` 5338) | **Yes**: `lookbook_items` (write-through + boot merge) |
| `robes_moodboards__<uid>` | Moodboard items (trims the oldest on quota) | `_mbSave` DP:23043 (`_mbLoad` 23039) | **Yes**: `lookbook_items` `type='moodboard'` |
| `rb_looks__<uid>` | `_lkLooks`: looks + pieces + wears stitched | `_lkCacheWrite` DP:11198 (`_lkCacheRead` 11194) | **Yes**: `looks`, `look_pieces`, `wears` |
| `robes_planned_days__<uid>` | ≤400 `planned_days` rows incl. optimistic ones | `_pdCacheWrite` DP:5785 | **Yes**: `planned_days` |
| `rb_model__<uid>` | `{skin, hair, nudges, kept, gender, v:2}` model prefs (pre-migration-20 fallback) | stylenotes `mvPersist` L1271 (read L1754, DP:11485) | **Yes** once migration 20 runs: `profiles.avatar_prefs` / `avatar_id` |
| `rb_ms_last__<uid>` | Last wardrobe count seen (milestone "just crossed") | `_msTrack` DP:925–936 | No (should be a profile field) |
| `rb_svc_done__<uid>` | `{daily, travel, …}` concierge services used → band retirement | DP:1111–1119 | No (should be a profile field) |
| `rb_model_door_off__<uid>` | Timestamp the home model door was dismissed (returns after 7 days) | DP:16065 (read 16028) | No |
| `rb_sil_prompt_off__<uid>` | `'1'`: the silhouette prompt was dismissed | DP:24563 (read 24537) | No |
| `rb_vibread_seen__<uid>` | `'1'`: the one-time "vibe read" note was shown | DP:8909–8910 | No |
| `rb_diary_mode` | `'list'` or `'month'` | DP:25749 (read 25225) | No (UI preference) |
| `rb_geo_ok` | `'1'`: geolocation granted, so weather may auto-fetch | DP:364 (read 408) | No |
| `rb_daycard` | `'off'`: DayCard kill switch (set by `?daycard=`) | DP:10234 | No (flag) |
| `rb_diary_prompt` | `'on'` or `'off'`: Diary intake prompt kill switch (set by `?diary=`) | DP:27214 (read 26457) | No (flag) |
| `robes-tweaks` | Design tweaks panel `{accent, name, genTime, weather, prompt, density}`. The name fallback is read by `Dash`. | dashboard-assets `8c8db126`:13 (read `144529f6`:35) | No. Prototype leftover; do not port. |
| `rb_admin_env` | `all`, `beta` or `production`: admin env filter | admin.html:188 | No |
| `sb-ayowpaknssulsqqvwpqx-auth-token` | The supabase-js session (managed by the library) | supabase-js; read by index.html:29 for the redirect | Auth session |
| `robes-v1`, `robes-mvp-tweaks` | Old production lander history/state | js/app.js:798–818, tweaks | No. Production-only |
| Removed on boot | `robes_style_notes`, `robes_moodboards`, `robes_style_notes__anon`, `robes_moodboards__anon` (legacy unscoped keys that leaked between accounts) | DP:5333–5334 | — |

### sessionStorage

| Key | Contents | Writer → reader | Purpose |
|---|---|---|---|
| `rb_onboarded__<uid>` | `'1'` | onboarding.html:533, 1284 → dash.html:2652, onboarding:1334 | Stops the onboarding redirect loop if the `onboarded_at` write lags. The unscoped legacy `rb_onboarded` is removed on boot. |
| `rb_onboard_piece` | `{prompt, photo(base64|null), cataloged}` | onboarding.html:1214/1218 → DP:27260 | Onboarding's first piece handed to the dashboard's "Your piece, styled" card |
| `rb_onboard_styled` | `{prompt, data (/api/style result), ts}` | onboarding.html:1255 → DP:27269 | Prefired styling result for the handoff |
| `rb_lk_draft` | Composer draft (pieces, name, kp origin …) parked while she builds her model | DP:13827 → DP:5242, stylenotes:1331 | Returns her to the draft after `/stylenotes` |
| `rb_model_return` | `'home'`, `'inspiration'` or `'lookbook'` | DP:13831/13844, stylenotes:1323 → stylenotes:1330, DP:5244 | Where "back" goes from Your model |
| `rb_model_build` | `'1'` | stylenotes:1352 → DP:215 | Landing after filing the model: rebuild the draft dressed |
| `rb_model_open_look` | `'1'` | stylenotes:1355 → DP:217 | Land on the look, dressed |

**Rebuild:** carry the cross-page handoffs as route params or server state, e.g. `/looks/new?draft=<id>` or `?returnTo=`, not sessionStorage. Expo has no sessionStorage.

---

## 5. Analytics

### 5.1 PostHog configuration (`public/js/posthog.js`)
- **Project:** EU cloud. Key `phc_Bs8KY64rq6xr7g63sdFJr2y8H6QNyMoqtxUuPbJRJavU` (public, ingest-only). `api_host: https://eu.i.posthog.com`, `ui_host: https://eu.posthog.com`. The library is `https://eu-assets.i.posthog.com/static/array.js`, loaded async.
- **Queue:** `window.__rbPH(fn)` queues up to 40 calls until the library loads. If the library is blocked by an ad blocker, calls are dropped silently. Analytics never blocks a flow.
- **Profiles:** `person_profiles: 'identified_only'`.
- **Identity:** `window.__rbPHUser(session, profile)` → `identify(uid, {email, environment, first_name, wardrobe_items, onboarded})`. It is called from dash.html:2645, onboarding:1322 and stylenotes:1731. Gender is deliberately **not** sent.
- **Reset on sign-out:** `window.__rbPHReset()` → `posthog.reset()`, called at DP:7428 and stylenotes:1800.
- **Super property:** `environment` (`production` for `www.byrobes.com` / `byrobes.com`, else `beta`), plus `from_email: true` when the user lands via `?from=email` (DP:755, stylenotes:1326).
- **Pageviews:** `capture_pageview: false`. `$pageview` is fired manually on load and on every `pushState`, `replaceState` and `popstate` (the history methods are wrapped). The rebuild needs the equivalent router hook on web, and screen events on Expo.
- **Autocapture:** on (the default).
- **Session replay:** on. `maskAllInputs: false` ("free love" call, 2026-09-16, CL:206: prompts are recorded as typed). `maskInputOptions: {password: true}`. Both password inputs also carry `class="ph-no-capture"` because the Show toggle flips them to `type=text`. Add `ph-no-capture` to mask anything else.
- **Pages that load posthog.js:** index, signup, reset, onboarding, dashboard, stylenotes, look, board, privacy, terms. Not admin or specimen.

### 5.2 The `events` table (capture plane, migration 11)
- **The dual write:** every product event goes to **both** PostHog (`capture(type, meta)`, even without a uid) **and** the Supabase `events` table as `{user_id, event_type, metadata, environment}`. The table write needs a uid and a JWT, and uses `Prefer: return=minimal` because the table is insert-only for users and select-only for admins. `return=representation` fails with 42501.
- **Writers:**
  - `_rbTrack` DP:681–693
  - `obTrack` onboarding.html:520–528 (supabase-js insert)
  - `snTrack` stylenotes.html:1286–1293
- **Also written from the client:** the `feedback` table (`_rbCapturePost('feedback', …)` DP:763), alongside the `feedback_given` event.
- **Written server-side:** `generation_log`, with one row per LLM call (endpoint, userId, genId, userPrompt ≤400, latency, tokens, status), and `notifications`.

### 5.3 Event dictionary
Each event carries the properties shown, and every event also gets `environment` from the super property. The "Emitted at" column gives DP line numbers unless another file is named.

| Event | Properties | Emitted at |
|---|---|---|
| `$pageview` | — | posthog.js (history hooks) |
| `avatar_render` | `pieces, surface` | 11542, 13668 |
| `capsule_adopted` | `from` | 21838 |
| `day_adjust_opened` | — | 8566 |
| `day_look_opened` | `source_type, from` | 18538, 25028, 26023 |
| `day_look_removed` | `source_type` | 18579, 18589 |
| `day_opened_from_peek` | `source_type` | 11055 |
| `day_opened_from_rail` | `source_type, state` | 25052 |
| `day_page_opened` | `looks, offset_from_today` | 18505 |
| `day_peek_opened` | `source_type` | 11012 |
| `day_renamed` | `source_type` | 10925, 18612 |
| `day_restyled` | `endpoint` | 16940 |
| `day_robes_door` | `date` | 26282 |
| `diary_day_named` | `source` | 24962, 25994 |
| `diary_mode` | `mode` | 25750 |
| `email_landed` | `path` | 756; stylenotes:1326 |
| `email_optin` | `kind` | 172, 27373 |
| `feedback_given` | `track, rating` | 770 |
| `fill_closed` | `landed, gaps` | 3535 |
| `fill_opened` | `door, gaps` | 1293, 15401 |
| `ftu_row_toggle` | `row, open` | 15754 |
| `image_fallback` | `surface, failed, of` | 18920 |
| `inbox_address_copied` | — | 2187 |
| `inbox_address_minted` | — | 3754 |
| `inbox_reviewed` | `filed, skipped, retailer, to` | 3828, 3837 |
| `inspiration_piece_pick` | `source, item` | 7037 |
| `inspiration_restyle` | `item` | 6728 |
| `inspiration_style_modal` | `photo, piece, source` | 7060 |
| `intake_abandoned` | `kind, seconds_open` | 26871 |
| `intake_anchor_selected` | `kind, count` | 27006 |
| `intake_committed` | `kind, days, plans, packed_looks, anchors` | 27176 |
| `intake_dates_edited` | `kind, days_before, days_after` | 27072 |
| `intake_day_edited` | `kind, day_index, action` | 27092, 27101, 27109 |
| `intake_day_pinned` | `kind, day_index, slot, on` | 27118 |
| `intake_evening_added` | `kind, day_index` | 27125 |
| `intake_opened` | `kind, from` | 26863 |
| `kp_build_look` | `item, way` | 7974 |
| `look_attach` | `look` | 23282 |
| `look_compose_opened` | `day` / `door` | 12281, 15111 |
| `look_created` | `source, pieces` | 11598 |
| `look_day_opened` | `look` | 11826 |
| `look_deleted` | `wears` | 14694 |
| `look_diary_opened` | — | 14563 |
| `look_draft_from_daily` | `kind, owned, proposed, day` | 16269 |
| `look_draft_opened` | `source` | 14348 |
| `look_edit_mode` | `on` | 14753 |
| `look_generated` | `track, item, fallback` | 7948, 18230 |
| `look_model_build` | `home, kp` | 13833 |
| `look_opened` | — | 14478 |
| `look_pack_routed` | `pieces` | 14671 |
| `look_photo_added` | `surface` | 8543, 16509 |
| `look_picker_compose` | `trip` | 26255 |
| `look_picker_opened` | `trip` | 26228 |
| `look_pinned` | `offset_from_today` / `surface, day_index` | 11741, 20812 |
| `look_promoted` | `surface, from` | 15030, 17573 |
| `look_renamed` | — | 14838 |
| `look_saved_from_day` | `pieces, unowned` | 17243 |
| `look_saved_from_trip` | `pieces, unowned` | 14416 |
| `look_saved_to_day` | — | 16672 |
| `look_saved_to_trip` | — | 16664 |
| `look_slot_snap` | `surface, role` | 15502 |
| `look_styled` | `surface, occasions, pinned` | 21503 |
| `look_tags_edited` | `surface` | 14805, 16444, 16976, 20511 |
| `look_unpinned` | — | 11767 |
| `look_updated` | `surface` / `wears` | 14968, 17543 |
| `look_worn_from_calendar` | `look` | 26333 |
| `looks_refined` | `axis, active` | 12668 |
| `looks_sorted` | `desc` | 14208 |
| `model_build_landed` | `on` | 240, 243 |
| `model_door_dismissed` | — | 16066 |
| `model_door_shown` | — | 16062 |
| `model_door_tapped` | `from` | 13846 |
| `model_filed` | `by, gender` | stylenotes:1303 |
| `month_band_opened` | `source_type` | 26035 |
| `next_line_shown` | `rule` | 15965 |
| `next_line_tapped` | `rule` | 15971 |
| `photo_attached` | — | 23658 |
| `piece_build_look` | — | 6569 |
| `piece_opened` | `from, kind` | 6436 |
| `piece_style_three` | — | 6581 |
| `piece_swapped` | `surface, item` | 15346, 15388, 16185, 18820, 21811, 21877, … |
| `prompt_submitted` | `intent, scope, source, latency_ms, ok` (Diary prompt) / `track, has_photo, length` (style submit) | 23503, 23564, 26648, 26678, 26702, 26717 |
| `rail_day_scoped` | `state, offset_from_today` | 24923, 24944, 25118 |
| `robes_build_opened` | `door, pics, first, mineOnly` | 15172 |
| `role_cast` | `surface` | 14526, 16117, 16954, 20493 |
| `share_created` | `item, share_id` | 22078 (first publish only) |
| `travel_created` | `destination, days, seeded_looks, seeded_pieces` | 19249 |
| `travel_details_edited` | `place_changed` | 21355 |
| `travel_generated` | `item, destination, pieces, looks` | 19357 |
| `travel_look_added` | `from, pinned` | 20375 |
| `travel_look_removed` | — | 20838 |
| `travel_pin_sheet_opened` | — | 19844 |
| `trip_day_named` | `day_index, cleared` | 20214 |
| `wardrobe_added` | `label, category, source, batch_n, batch_i` | 3477, 3820, 7004; onboarding:1174, 1180 (`source:'onboarding'`) |
| `wardrobe_pick` | `item, label` | 23230 |
| `wardrobe_url_read` | `host` | 2240 |
| `wear_confirmed` | `source, pieces` | 11636 |
| `wear_undone` | — | 11653 |
| `wishlist_added` | `label, source, batch_n, batch_i` | 3392, 3794 |

**Rebuild rule:** keep the event names and property keys **identical**. Funnels in PostHog and the `/admin` Activity feed read them. The events also need to fire from Expo, using the PostHog React Native SDK and the same `identify` shape.

---

## 6. Direct Supabase usage from the browser (and client → API calls)

### 6.1 Auth (supabase-js)

| Call | Location |
|---|---|
| `auth.getSession` | signup:458, reset:214, onboarding:1317, stylenotes:1728, admin:217, dash.html boot |
| `auth.onAuthStateChange` | reset:213, onboarding:1316, dash.html boot (stays subscribed for token refresh) |
| `auth.signInWithOAuth({provider:'google'})` | signup:552 (redirect → `/dashboard`) |
| `auth.resetPasswordForEmail` | signup:570 (redirect → `/reset`) |
| `auth.signInWithPassword` | signup:583 |
| `auth.signUp` (with `first_name` metadata) | signup:596 |
| `auth.updateUser({password})` | reset:243 |
| `auth.signOut` | DP ~7428 (avatar menu), stylenotes:1799, admin:189 |

### 6.2 Tables and RPCs
Unless noted, calls go through `_waFetch` (PostgREST with the user JWT) or `sbClient.from()`. RLS is own-row for every user table.

| Table / RPC | Op | Location |
|---|---|---|
| `profiles` | SELECT (boot, strip-retry ladder) | dash.html:2616, 2623, 2631, 2638 |
| `profiles` | SELECT | onboarding:1341; stylenotes:1734; DP:3736 (inbox address), 11502 (avatar); admin:221 (`is_admin`), 338, 715 |
| `profiles` | UPDATE / PATCH | onboarding:494 (first_name, style_dna, style_icons, onboarded_at …); stylenotes:843 (taste/budget), 1273 (`avatar_id`, `avatar_prefs`), ~1685–1706 (analyses + style_dna); DP:148 (account details, raw fetch), 718 (`notification_prefs`), 3751 (inbox address), 22141 (`instagram_handle`) |
| `wardrobe_items` | SELECT | DP:777; admin:339 |
| `wardrobe_items` | INSERT | DP:3619 (`_waRowWrite`), 6993/6999 (inspiration), 21625 (travel quick-own), 27593/27599 (onboarding handoff); onboarding:1166/1171 |
| `wardrobe_items` | PATCH | DP:3618, 4244 (hero), 6508 (photo), 10861/11633/11650/17617/25177 (`times_worn`) |
| `wardrobe_items` | DELETE | DP:3571 |
| `wishlist_items` | SELECT / INSERT / PATCH / DELETE | DP:4411 / 4482, 3619 / 4448 / 4581, 4594; admin:340 |
| `wardrobe_inbox` (receipts) | SELECT / PATCH | DP:3684 / 3824, 3834; admin:346, 648 |
| `tags` | SELECT / UPSERT (`on_conflict=user_id,kind,slug`) | DP:3972, 4011 / 4004 |
| `tag_pieces`, `tag_looks` | SELECT / UPSERT / DELETE | DP:3976, 3977 / 4051 / 4055 |
| `lookbook_items` | SELECT (limit 100) / INSERT / PATCH / DELETE | DP:5398 / 5374 / 5381, 5408 (archive), 22068/22073 (share) / 5386; admin:341 |
| `planned_days` | UPSERT (`resolution=merge-duplicates`, raw fetch) + sweep DELETEs | DP:5674–5700 |
| `planned_days` | DELETE by source | DP:5752 |
| `planned_days` | SELECT | DP:5790, 24873 |
| `looks` | SELECT / INSERT / PATCH / DELETE | DP:11231 / 11394, 11398 / 11438, 11444 / 14688 |
| `look_pieces` | SELECT (no user filter; relies on RLS) / DELETE + INSERT (replace) | DP:11232 / 11417–11418 |
| `wears` | SELECT / INSERT / DELETE | DP:11233 / 11620 / 11645 |
| `events` | INSERT (`return=minimal`) | DP:691; onboarding:526; stylenotes:1292; admin SELECT 333 |
| `feedback` | INSERT (`return=minimal`) | DP:763; admin SELECT 342, 703 |
| `generation_log` | SELECT (admin only; the server writes) | admin:334, 589, 674 |
| `notifications` | SELECT (admin only; the server writes) | admin:345, 663 |
| RPC `admin_user_overview(p_limit, p_offset, p_search, p_sort, p_dir, p_user)` | CALL | admin:288, 291, 337 |
| Anon `lookbook_items` (`is_public = true`) | SELECT, server-side for `/board/:shareId` | server:2387 |

- **Storage buckets:** none are used from the browser. All images go through `/api/wardrobe/upload` to Cloudinary.
- **Edge Function:** `wardrobe-context` exists but is not called by the current beta frontend.

### 6.3 Client → Express API calls

| Endpoint | Callers |
|---|---|
| `POST /api/style` | DP:7065, 7546, 23396, 27519; onboarding:1241 |
| `GET /api/images/:jobId` | DP:7656, 8625, 11546, 13463, 13638, 18923, 23751, 27484; stylenotes:1430 |
| `POST /api/daily` | DP:8070, 8775 |
| `POST /api/alternates` | DP:8998, 15263 |
| `POST /api/lookbuild/images` | DP:15448 |
| `POST /api/lookbuild/note` | DP:15246 |
| `POST /api/intent` | DP:26725 |
| `POST /api/travel` | DP:19307 |
| `POST /api/travel/looks` | DP:21452 |
| `POST /api/moodboard` | DP:23715 (hidden) |
| `POST /api/wardrobe/analyse` | DP:2414, 6959, 27559; onboarding:1118 |
| `POST /api/wardrobe/upload` | DP:3333, 6502, 6966, 16465, 27565; onboarding:1125; stylenotes:1662 |
| `POST /api/wardrobe/read-url` | DP:2233 |
| `GET /api/wardrobe/taxonomy` | DP:471 |
| `POST /api/stylenotes/analyse` | stylenotes:1652 |
| `POST /api/avatar/cell` | DP:13651; stylenotes:1416 |
| `POST /api/avatar/render` | DP:11536, 13663 |
| `POST /api/feedback` | DP:16909, 22265, 24076 |
| `POST /api/instagram` | DP:22143 |
| `GET /api/look/:id` | look.html:357 |
| `POST /api/look` | app.js:341 (production lander only) |

---

## 7. Third-party scripts, CDNs and external services

| Resource | Loaded by | Notes / rebuild equivalent |
|---|---|---|
| `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2` (UMD) | signup, reset, onboarding, stylenotes, admin (`<script>`); dashboard (injected at boot, `…/dist/umd/supabase.js`) | Unpinned major version. Use the `@supabase/supabase-js` / `@supabase/ssr` packages. |
| PostHog `https://eu-assets.i.posthog.com/static/array.js` → `eu.i.posthog.com` | posthog.js on 10 pages | `posthog-js` (web), `posthog-react-native` (Expo) |
| Google Fonts: **Cormorant** (300/400/500, italic 300/400/500) + **Inter** (300/400/500) via fonts.googleapis.com / fonts.gstatic.com | index, signup, reset, onboarding, stylenotes, look, board, privacy, terms, specimen | Dashboard **self-hosts** the same faces as base64/woff2 `@font-face` (`public/dashboard-assets/*.woff2`, inline in dash.html head) + `/css/tokens.css`. Use `next/font` / `expo-font`. |
| Open-Meteo `api.open-meteo.com/v1/forecast`, `archive-api.open-meteo.com/v1/archive`, `geocoding-api.open-meteo.com/v1/search` | DP:333, 379 (home weather), 19045–19056 (trip weather); stylenotes:1817 | No key needed. Proxy and cache server-side. |
| OpenStreetMap Nominatim `nominatim.openstreetmap.org/reverse` | DP:368; stylenotes:1814 | Reverse geocode for the city label. The usage policy needs a UA and ≤1 rps, so proxy it server-side. |
| Browser Geolocation API | DP:~360; stylenotes:~1810 | `rb_geo_ok` remembers the grant. Expo: `expo-location`. |
| Cloudinary (image hosting) | Indirect: URLs come from `/api/wardrobe/upload` and generation jobs | Keep server-side |
| `forms.gle` link | index.html (lander) | Static link |
| Unsplash-style resource map `window.__resources` | dash.html head (bundle resources, mostly `/dashboard-assets/*.png/jpg`) | Prototype imagery (editorial tiles). Re-host as static assets |
| **Server-side only** (not browser): Google Gemini (`@google/genai`: `gemini-2.5-flash`, `gemini-3.1-flash-image`), Anthropic (Edge Function), Resend (email over REST, `notify.js`), Airtable (Contacts/Feedback), Supabase service key, inbound receipt email webhook (`inbox.js`) | server.js, notify.js, inbox.js | — |

- **PWA:** `public/manifest.json` has name "Robes", `start_url: /dashboard`, `display: standalone`, background and theme `#202021`, and icons at 192 and 512 (maskable). It is linked from every page head, alongside `apple-touch-icon.png`.
- **There is no service worker** and no install prompt handling. Adding one would be a new decision.

---

## 8. Parity checklist

Tick an item when the rebuilt surface matches the legacy behaviour described in §2, on **web** and **mobile** (Expo) where applicable. Items marked *(hidden)* or *(retire?)* need a product decision rather than a port.

### Auth & onboarding
- [ ] Sign up with email and password (first name captured), with the confirmation-email state; immediate redirect when a session is returned
- [ ] Sign in with email and password; "Welcome back" copy variant
- [ ] Continue with Google (OAuth) → `/dashboard`
- [ ] Forgotten password request (`?mode=reset`) → email → `/reset` sets a new password
- [ ] Signed-in visitors to `/`, `/signup` bounce to `/dashboard`; signed-out visitors to protected pages bounce to sign-in
- [ ] Onboarding gate: `!onboarded_at` → `/onboarding`; no redirect loop; no bypass for a second account in the same tab
- [ ] Onboarding splash → name (prefilled from auth metadata; first word only)
- [ ] Onboarding step 01 · first piece: photo or text, Gemini analyse, upload, insert to wardrobe, prefire styling
- [ ] Onboarding step 02 · archetype first (10 cards), then the icons/brands refinement; skip hidden once she answers; writes `style_dna.style_archetypes` and `style_icons`
- [ ] Finish straight to the dashboard (no done screen), `onboarded_at` set; "Your piece, styled" handoff card on home with its loading state
- [ ] Session-1 email opt-in ask inside the handoff card
- [ ] Sign out (resets analytics identity)
- [ ] Public marketing lander / waitlist *(decide whether it is in scope)*
- [ ] Terms and Privacy pages
- [ ] PWA manifest / home-screen install metadata (web); app icons and splash (Expo)

### Wardrobe
- [ ] Wardrobe view `/wardrobe`: grid, top-ten tab row, counts, one-door empty state
- [ ] Refine filters: season band, wear-it-for, colour, brand, "added from receipts"
- [ ] Hero star (cap 10)
- [ ] Add a piece · photograph: drop zone, camera/library, batch add, Gemini analyse, one confirm screen
- [ ] Confirm screen fields: 3-level taxonomy cascade, colour swatches (21 + off-palette), season band (single, default Year-round), wear-it-for tags (+ custom ≤28 chars), price, size, notes, brand
- [ ] Add a piece · paste a product link (`/api/wardrobe/read-url`) → confirm
- [ ] Add a piece · forward a receipt: personal inbox address (mint/copy), held receipts queue, per-receipt review (file / skip, to wardrobe or wishlist), `?receipts=1` deep link, confirmation email
- [ ] Add without a photo
- [ ] Edit a piece (same editor), replace its photo, delete with confirmation
- [ ] Piece page `/piece/:id`: two doors (wardrobe and wishlist), siblings n of N with ‹ ›, worn count, "In N looks", wear list, Build a look / Style three ways from the piece
- [ ] Wishlist `/wishlist`: the same three ways in; keeps the source picture; "I bought this" moves it to the wardrobe; delete
- [ ] Inspiration `/inspiration`: key pieces styled, open (`?open=`), restyle, style-a-piece modal (pick from wardrobe/wishlist or upload, which files a new piece)
- [ ] Learning meter / ladder 5·10·15 wording; "just crossed" moment
- [ ] Tag namespace (seed + custom) shared across pieces and looks

### Styling engines
- [ ] Home masthead greeting + the "next line" rules (first match wins)
- [ ] Prompt with the three doors (Style today · Plan a trip · Style a piece), auto-grow, "+" menu (From wardrobe / Add a look), photo attach
- [ ] Intent routing (fast paths + `/api/intent`), scope chip / day-chip planning, Diary intake unfurl
- [ ] Home postures: zero, zero-lead, inline builder at zero looks, first-look "seven doors", standard
- [ ] Styling Concierge band (learning meter, filed-piece receipt, card captions, show and retirement rules)
- [ ] Model door on home (7-day snooze)
- [ ] Key-piece styling: `/api/style` → three ways, background images with placeholders on failure, auto-save to Inspiration, reopen without re-save, rename, per-look feedback
- [ ] Key piece → Build this look in situ (composer on the key-piece page), park and return via the model build
- [ ] Dress today: `/api/daily` → composer draft (nothing saved until named)
- [ ] Legacy daily console for old `daily-look` rows and pinned-look days: rack by roles, swap, alternates, restyle, day/evening, wear, keep
- [ ] Looks entity: create, name (provisional names), save, edit & resave, delete (confirm), lineage, variants
- [ ] Look page: header, meta line with the pin door, image ladder (photo → model render → figure), tags row, rack, proposals, wear record (cost per wear), edit mode
- [ ] Composer: one held container, role slots, drag-cast roles, ghost strips, add a piece (A2 chooser), "Swap in yours · N", Robes build at ≥5 photographed pieces
- [ ] Dress your model: avatar render of the look (`/api/avatar/render`), no-model band / states
- [ ] Alternates (`/api/alternates`) and look notes (`/api/lookbuild/note`); proposal stills (`/api/lookbuild/images`)
- [ ] Shared swap sheet (wardrobe grid + snap mine + shop)
- [ ] Generation overlays with abort/cancel and timeouts
- [ ] Feedback hairline per look (👍/👎 + note) → Airtable + `feedback`
- [ ] Moodboards `/moodboards`, `/moodboard/:slug` *(hidden; decide)*

### Saved & sharing
- [ ] Lookbook `/lookbook`: grid of looks + legacy artifacts, "+ New ▾" (look / travel edit), empty state = composer, Sort (≥4), Refine by tag axes
- [ ] Open saved artifacts by type (key-piece, daily-look, travel-edit, legacy look)
- [ ] Rename result surfaces; delete with the styled confirm modal
- [ ] Deep links `?open=<id>[&fill=1]`, `?new=1&robes=1`
- [ ] Share a lookbook item: mint the share id, publish, share modal (copy link / native share), IG handle capture
- [ ] Public `/board/:shareId` page (server-rendered, anon read of `is_public` rows)
- [ ] Legacy `/look/:id` *(retire?)*

### Planning
- [ ] Diary `/diary` (+ `/calendar` alias): rolling 30-day list, month view (phone rules: dots only), today marker, mode remembered
- [ ] Home "week ahead" rail (yesterday → +5), day peek
- [ ] Day page: many looks per day, "LOOK n", open / remove / add look, rename the day, weather, wear from calendar, `?d=` deep link
- [ ] Add-a-look picker (one picker behind every "+"): existing look, compose new, let Robes build
- [ ] Pin a look to one or many days; unpin (confirm)
- [ ] Travel edit intake (destination, dates ≤10 days, occasions, anchors, evenings) → `/api/travel`
- [ ] Trip page: meta line, travel diary rows per day, looks not yet scheduled, pin sheet, add looks (`/api/travel/looks`), scoped swap, capsule / packing checklist ("n / N packed"), edit details, delete trip
- [ ] Trip weather (forecast / climate archive)
- [ ] A trip's pinned days appear in the Diary and on the rail
- [ ] Wear accrual (times worn, dated wears) consistent across looks, days and pieces
- [ ] Weekly plans archived and never rendered (migration run, not client sweep)

### Profile & style notes
- [ ] Your model `/stylenotes`: close-up + full-length photo reads (`/api/stylenotes/analyse`), colour season / undertone / contrast, silhouette / body read, full-notes drawer
- [ ] The model: deterministic figure, skin/hair picks, shape by hand, auto-file, photographed cell (`/api/avatar/cell`), presence (gender: woman / man / unspecified)
- [ ] Forward CTA from the model back to the parked look (dressed)
- [ ] Taste & budget `#taste`: style icons (add/remove, suggestions), range tiers, where you splurge, annual spend
- [ ] Style DNA persisted (server-side merge)
- [ ] Account details modal: first/last name, mobile, email (read-only)
- [ ] Silhouette prompt (dismissible, once per user)
- [ ] Try-on (`/api/stylenotes/tryon`) *(endpoint exists, no UI; decide)*

### Notifications
- [ ] Email preferences (looks ready, nudges, morning cue + hour, timezone auto-set) in the account/Emails switches
- [ ] Re-engagement sequence via Resend (server scheduler, at most one per user per local day, morning cue)
- [ ] Receipt-held / receipt-filed confirmation email with a CTA deep link to the wardrobe
- [ ] One-click unsubscribe (`/api/notify/unsub`, HMAC)
- [ ] `?from=email` attribution (`email_landed`, `from_email` super property)
- [ ] Push notifications (Expo) *(new; decide)*

### Admin
- [ ] Server-side admin gate (`profiles.is_admin`)
- [ ] Users list: `admin_user_overview` RPC, search, sortable columns, paging
- [ ] User detail: profile / Style DNA, feedback, activity (collapsed 8), emails ledger, receipts, wardrobe / wishlist / lookbook grids, generations grouped by gen_id (collapsed 10)
- [ ] Output viewer per artifact type (key piece, daily, travel, moodboard, raw data); add `looks` entities (missing today)
- [ ] Generation health: 7-day tiles, by-endpoint table, not-OK list + inspect modal, email and receipt health
- [ ] Feedback feed (paged 50)
- [ ] Environment filter (all / beta / production)

### Cross-cutting
- [ ] Analytics: every event in §5.3 with identical names and properties, `identify` shape, manual pageviews / screens, replay masking (passwords + `ph-no-capture`)
- [ ] `events` / `feedback` capture never blocks or surfaces errors
- [ ] Every URL in §1 resolves (including aliases and deep-link params); client-only states get real routes
- [ ] No durable state in localStorage / sessionStorage (§4)
- [ ] Copy rules: 3-letter months, her words verbatim, sentence-case verbs, deletes always confirm, no failed image replaced by her upload (placeholder instead)

## Legacy sync 2026-10-16: the modular home, the first run and the first seven days

Ported from `origin/beta` (0478e63 → f044b35, 1ebfc72, 465aa5e/c7d3ea5/2fba066) into the platform way:

- **The resolver** lives in `@robes/core/home` (`resolveHome`): O1 Style DNA (two of brands · icons · styles, or `profiles.style_confirmed_at` — beta's walk Done, carried by the migration; the platform has no walk, so nothing sets it anew), O2 the twin (a model or a colour/line read), O3 five photographed pieces, O4 a saved look from hers; activated = O3 ∧ O4. Later is stored server-side (`profiles.home_snoozes`, `POST /me/home/later`), so it holds on every device rather than per device. `GET /today` carries `home` (state, O1 rows, O3/O4 pieces, H1 receipts and Robes noticed, H4 Saved then Suggested) and each week day's first look; `GET /today/weather` fills the masthead line.
- **Differences by design:** the slow-path "Your piece, styled" card is the deck's own dressing state; O4's Build the look opens the composer with her pick (no Robes build-from-hers job exists yet); O3's Snap opens the batch add; H1's receipt strip has no photographs (inbox rows keep no product images); the generation tray stays at the foot while it holds jobs; a trip-shaped ask opens a new trip when the `trips` flag is on.
- **Onboarding:** splash → name → the first piece photographed and read into the five-row ledger (two-tap Skip) → Composing → the deck, with its way back home. The shop-link door on the first piece is not ported: platform link imports land in the Inbox for review, not straight in the wardrobe.
- **The first seven days (notify):** `first_piece`, `pick_one`, `week_one`, `week_empty` retuned as plan_a_day (+5d, the morning-line footer), the 08:00–20:00 send window, `NOTIFY_REPLY_TO` (every mail then says replies reach Annie); push-only model nudge (day 2), batch nudge (day 4) and Wore it? (19:00); looks_ready and the morning cue stop mailing once she has push; native asks for push after her first saved look.
- **Not built, by the brief's own scope:** Annie's invite (`docs/emails/invite.html`) and day-7 feedback emails are sent by hand from annie@byrobes.com (Gmail), never by the platform; the admin cohort tab (brief delta 8); `borrowing`.
