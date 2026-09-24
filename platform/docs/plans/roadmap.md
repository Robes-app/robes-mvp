# Robes Platform — Milestone Roadmap (M1–M8)

Each milestone below is a **brief**: goal, inputs, ordered task list with target files/packages, the legacy parity items it owns (from `reference/legacy-features.md` §8), and exit gates. Before executing a milestone, expand it into a bite-sized plan with `superpowers:writing-plans` (see `plans/README.md`). Keep tasks in the order given — later tasks depend on earlier ones.

Notation: `SEC-nn` = `security.md`; `UX-nn` = `reference/ux-opportunities.md` §5 item nn; `Dnn` = improvement in `reference/ux-opportunities.md` §2; `API §x` = `api.md`; `DM §x` = `data-model.md`; `INFRA §x` = `infrastructure.md`.

---

## M1 — Platform core

**Goal:** Everything later features need: the full baseline schema, AWS infrastructure in staging, the durable job system end-to-end, direct uploads with renditions and signed delivery, complete web auth, environment separation and observability.

**Inputs:** DM §1–3 + `reference/legacy-data-model.md` §6; INFRA §1–5, §7, §9–10; API §1–4; SEC-01..05, 10..16, 20..21, 30..34, 50..55, 70..74.

**Tasks**
1. **Accounts & projects (manual, runbook):** create Supabase `robes-staging` + `robes-prod` (EU, asymmetric JWT signing keys enabled, PITR on prod), AWS Organizations accounts `robes-staging` / `robes-prod`, Vercel project `robes-app` (root `platform/app`, Node 24, `dub1`), Upstash Redis (EU) per env, GCP projects + Gemini keys with budgets and quota caps, Sentry + PostHog EU projects, Resend domains. Record every ID/URL in `docs/runbooks/environments.md` (no secrets).
2. **Local signing keys:** configure `supabase/config.toml` for asymmetric JWT signing locally (`supabase gen signing-key`), so local tokens verify via JWKS exactly like prod; add an integration test signing in a seeded user and calling an `auth: 'user'` route.
3. **Baseline schema (DM §3 files 3–10)** with pgTAP per table (ownership comment, RLS, cross-user, column grants, anon denied), `packages/db` (generated types, `createUserClient`, `createServiceClient` behind `server-only` + lint ban), `pnpm db:types` drift check in CI.
4. **Admin + quotas in `route()`:** `isAdmin` backed by `private.admin_users` (service client), `quota` option calling `private.consume_quota` in the same transaction as job insert, `flag` option reading `feature_flags` (30 s cache), `Idempotency-Key` (Upstash), `X-Robes-App-Version` + `upgrade_required`. Tests for each.
5. **Web auth (`app/src/app/auth/*`)** with `@supabase/ssr` cookies + `proxy.ts` refresh (`getClaims()` only): sign up (first name), confirm email, sign in, Google, **Apple**, forgot/reset, sign out; route guards (signed-in `/` → Today, protected → sign-in); onboarding gate using `profiles.onboarded_at` via `POST /me/onboarding/complete`. Parity: all "Auth & onboarding" auth items. Playwright e2e against local Supabase (Inbucket for emails).
6. **CDK app (`platform/infra`)**: `IdentityStack` (GitHub OIDC, Vercel OIDC role), `SecretsStack`, `QueuesStack`, `WorkersStack` (skeleton `generateFn` with a **fake provider**), `MediaStack`, `SchedulesStack` (sweeper + retention stubs), `ObservabilityStack`, `BudgetsStack`. `cdk synth` snapshot tests (`aws-cdk-lib/assertions`) asserting: buckets block public access, queues have DLQs, no `*` IAM actions, Lambdas arm64 + Node 24, log retention set.
7. **Job system (`packages/jobs` + `workers/`)**: `enqueue()` (SQS via Vercel OIDC creds; `inline` transport in dev), outbox sweeper, worker lease/idempotency, stage writes, Realtime publication, `GET /jobs/:id`, `POST /jobs/:id/cancel`, `useJob()` hook (web) subscribing to row changes + broadcast. End-to-end test: web creates a fake job → staging SQS → Lambda → Realtime → UI shows stages. UX-04, UX-05, UX-07, UX-10.
8. **Uploads & media (`packages/media`, `workers/rendition`)**: `POST /uploads` presigned PUT with conditions, `RenditionFn` (sharp: EXIF strip, orientation, HEIC→JPEG, 2048 master, 320/640/1080/1600 avif+webp, blurhash), `assets` lifecycle, `POST /media/session` signed cookies (web) / signed URL policy (native), image loader for `next/image` custom loader + `expo-image`; CSP `img-src` += media origin. SEC-20, SEC-21. Test: upload → ready → rendition URLs load with cookie, 403 without.
9. **Observability & consent:** Sentry (web/API/workers) with release = SHA, pino redaction (SEC-83) with a unit test that emails/prompts never appear, PostHog EU behind a consent banner (`consents` table), replay masked by default, `packages/analytics` typed event catalogue (port names from `reference/legacy-features.md` §5 where the event still exists).
10. **CI/CD:** `platform-deploy-staging.yml` (db push → cdk deploy → Vercel auto → smoke), `platform-deploy-prod.yml` (manual, protected), `cdk diff` PR comment, gitleaks, `pnpm audit --prod`, Renovate config. Railway watch paths exclude `platform/**`; merge `platform/` into `beta` (ADR-013).
11. **Runbooks:** environments, key rotation, restore from PITR, kill switch, budget breach, recreate environment.

**Exit gates:** fake job completes through real SQS/Lambda in staging and streams to the browser; upload → renditions → signed delivery works; all SEC items listed in Inputs have passing tests; staging deploy is fully automated; runbooks exist.

---

## M2 — Design system & app shell

**Goal:** Shared UI primitives on both platforms, the new IA shell, two-screen onboarding, the You area — so feature milestones only build feature screens.

**Inputs:** `design-system.md`; `reference/brand-and-design.md`; `reference/ux-opportunities.md` §3 (IA), D10, D11, D13, D15, D16, D22; `mobile.md` §2–3.

**Tasks**
1. `packages/copy` (typed dictionary: nav names, errors from `@robes/api` MESSAGES, empty states, microcopy; `Intl` helpers for dates/currency/units; banned-terms test from brand §1 — UX-25, UX-27, UX-29).
2. `packages/icons` (SVG sources → web + `react-native-svg` components).
3. `packages/ui` (web): Text/Heading/Eyebrow, Button (one-primary-per-screen dev warning — UX-26), IconButton, Pill/Chip, Card variants, Image (media loader + blurhash), Sheet/Dialog (Radix), Field/TextArea/Select/SegmentedControl, Toast with Undo, Skeleton, Progress, EmptyState. Storybook (`@storybook/nextjs-vite`) with light/dark; axe checks; visual snapshots.
4. `packages/ui-native`: same primitives and props on Uniwind; Dynamic Type caps; 44pt targets; haptics hook.
5. Web shell: top nav ≥1024 / tab bar <768, Create button + sheet, ⌘K command bar, avatar menu → You; routes from SPEC §6 as placeholders with skeletons.
6. Native shell: Expo Router `(tabs)` Today · Wardrobe · + · Looks · Plan, Create modal stack, You stack, auth screens (email, Google, Apple), deep-link handling (`robes://`, universal links placeholder).
7. Onboarding (both): ≤2 screens between auth and a streaming result (UX-22) — screen 1 name (prefilled, first word), screen 2 first piece (photo/text) which fires the M4 styling job once M4 exists (M2 ships it against the fake job).
8. You area: Account (name, mobile, email read-only), Notifications prefs (stored, wired in M6), Legal, Sign out (resets analytics identity), **Delete account** entry (wired in M6), consent settings.
9. Undo pattern: `useUndoableMutation` (optimistic + soft delete + 6 s toast) shared hook in `packages/api-client` (UX-13, UX-15). **Note OD-9:** UX-15 replaces legacy "deletes always confirm" — confirm with product.
10. `packages/api-client` generated from `packages/contracts` + TanStack Query hooks (web + native), auth header injection, idempotency keys, app-version header.

**Parity owned:** onboarding splash/name, sign out, terms/privacy, PWA manifest + native icons/splash, account details modal, silhouette prompt dismissal (as `user_ui_state`).
**Exit gates:** Storybook + contrast + copy lint + axe green; IA identical on web and native (UX-11, UX-12); onboarding ≤2 screens; performance budgets wired in CI (UX-24: Lighthouse CI on web routes; bundle size limits).

---

## M3 — Wardrobe

**Goal:** Getting a wardrobe in is fast and pleasant; one ingest pipeline; pieces look great (cutouts).

**Inputs:** `reference/legacy-api-and-ai.md` (`/api/wardrobe/analyse`, `/read-url`, `/upload`, inbox.js, `wardrobe_taxonomy.js`); `reference/legacy-features.md` §2 Wardrobe; D7, D8, D9; SEC-20..22, SEC-40, SEC-41; `reference/cost-research.md` §3 (cutouts).

**Tasks**
1. Port `wardrobe_taxonomy.js` → `packages/core/taxonomy` (typed, tested) + reference-data migration generator (legacy `scripts/gen_taxonomy_migration.mjs` as reference).
2. Wardrobe CRUD API + pages (web + native): grid, top-ten/hero (cap 10), counts, Refine (season band, wear-it-for, colour, brand, source), piece page `/piece/[id]` (siblings, worn count, in N looks, wears).
3. Analyse job (`wardrobe_analyse`): prompt port to `packages/ai` (minimal client for this milestone — full layer in M4), schema-validated output, confidence → auto-file vs Inbox (UX-19).
4. Batch capture: web drop zone/multi-select; native multi-shot camera + camera-roll multi-select + background upload queue (UX-17, UX-18); `POST /wardrobe/items/batch`; items appear in "reading" state within 1 s.
5. Product-link import via the **isolated fetch worker** (`workers/fetch`) with the SEC-40 guard + test table of bypass payloads.
6. Receipts: Resend inbound → `/webhooks/resend-inbound` (Svix verify, idempotent on message id — legacy had no idempotency) → `receipt_read` job → `wardrobe_inbox`; inbox address minting (≥64-bit, re-mint on migration); receipt emails deferred to M6.
7. Wardrobe › Inbox (all ingest sources, per-item file/skip to wardrobe or wishlist, count on Today — UX-20).
8. Wishlist (same ways in, keeps source picture, "I bought this" → promote).
9. Tags (seed + custom; shared across pieces and looks) with `private.apply_tag_defaults`.
10. Cutouts: `render` step via fal BiRefNet → `cutout` rendition; fallback provider behind a flag; show cutouts in grids.
11. Value-before-15 groundwork: ladder copy (5·10·15) as capability-appearing (UX-27), no lock language; **OD-1** decides stand-ins.

**Parity owned:** all "Wardrobe" items (Inspiration moves to M4 as Ideas).
**Exit gates:** UX-17..20 met on device; SEC-40 bypass table green; ingest p95 auto-tag ≤ 8 s; no base64 anywhere in API bodies.

---

## M4 — Styling engines

**Goal:** The core magic — style a piece, build and save looks — fast, staged, resumable and cost-controlled.

**Inputs:** `infrastructure.md` §6 (AI layer), §8 (cost levers); `reference/legacy-api-and-ai.md` (`/api/style`, `/api/intent`, `/api/alternates`, `/api/lookbuild/*`, `/api/avatar/*`, style_dna.js, prompt table); `reference/legacy-features.md` §2 Styling engines + §3 client logic; D1–D6, D9, D14, D19 groundwork; UX-01..10, 13, 14, 21, 28.

**Tasks**
1. `packages/ai`: provider interface, Gemini adapter (`@google/genai`), **model registry** (verify current IDs/prices first — cost-research §4.1 notes 2.5 restrictions and the 2026-10-02 shutdown), abort/timeouts, `responseSchema`, usage → `generation_calls` + `platform_budget`, pricing table, `generation_cache`.
2. Port `style_dna.js` → `packages/core/style-dna` (pure, typed, 100% unit-tested with legacy fixtures) — server-side only writes (`style_profiles`).
3. Prompt modules v1 ported from legacy constants (user text only in user turn, fenced/truncated; image prompts from server templates — SEC-23) + `packages/ai/evals` golden sets per feature; `pnpm eval` in nightly CI.
4. `POST /looks/generate` (Style a piece): stage A text streamed (broadcast) + persisted ≤3 s p50 (UX-02), hero image eager, secondary images lazy/on-demand (UX-09, cost lever 1), parallel priority images, per-item retry (UX-08), cancel (UX-07), results land in **Looks › Ideas** (`/ideas/[id]`), auto-expire unsaved ideas after 30 days.
5. Intent routing: fast paths + `POST /intent` (≤5 s, no job); Today prompt with three doors.
6. Looks entity: create/name (offered, never applied)/save/edit/resave/delete(soft), lineage/variants, Update vs Save as new when history exists (UX-28), `set_look_pieces` RPC, look page `/look/[id]` with rack, proposals, wear record.
7. Composer (web + native): role slots, add a piece (chooser), swap sheet (wardrobe grid + snap mine + shop), "Robes build" at ≥5 pieces.
8. Alternates, look notes, proposal stills (`/looks/:id/alternates|note|render`) as jobs with the shared still cache (UX-09).
9. Avatar/model render (`/avatar/render`, `/avatar/cells/:key`) — own profile only (SEC-22).
10. Feedback per look (👍/👎 + note) → `feedback` table; taste memory groundwork (D19).
11. Lite-image A/B for secondary images via evals (cost lever 3) and dedupe cache hit-rate metric.

**Parity owned:** Styling engines items except Diary/trip ones; Inspiration → Ideas; generation overlays replaced by staged screens; Moodboards per OD-2.
**Exit gates:** UX-01..10, 13, 14, 21, 28 verified with Playwright + Maestro timing assertions on staging; evals ≥ legacy baseline; cost per "style a piece" measured and ≤ target in cost-research §4.2 after levers.

---

## M5 — Today & Plan

**Goal:** Daily habit and planning: Today's look (interactive + pre-made overnight), the Plan (days, many looks per day), trips, wears.

**Inputs:** legacy `/api/daily`, `/api/travel`, `/api/travel/looks`, planned_days logic (`reference/legacy-features.md` §3 client logic to move server-side), weather (Open-Meteo), D18; UX-16.

**Tasks**
1. Today screen: greeting + one next step (port `_rbNextLine` rules to `packages/core/next-step` with tests), Today's look card with weather, Ask Robes prompt, generation tray, week strip, Inbox count; ≤1 ink fill, ≤7 doors.
2. `POST /today/generate` (Style it for today) → composer draft (nothing saved until named — legacy rule) as a job.
3. Overnight batch: `SchedulesStack` hourly trigger → users at local 04:00 with activity in last 7 days → Gemini **Batch API** jobs → Today card ready at wake; morning push (native) / email cue (M6) (D18, cost lever 4).
4. Plan: `/plan` rolling 30-day list + month toggle, `/day/[date]` many looks per day, add-a-look picker, pin/unpin to one or many days, rename day, weather — all server-side via `sync_planned_days` (no client sweeps; UX-14).
5. Wears: wear from day/look, immutable wears, `wardrobe_item_stats` view (times worn, cost per wear).
6. Trips: `POST /travel/plan` intake (destination, dates ≤10 days, occasions, anchors, evenings) → trip `/trip/[id]` (diary rows, unscheduled looks, pin sheet, add looks, scoped swap, capsule/packing), trip weather (forecast/climate), restyle a day.
7. Universal links for every Today/Plan email/push destination (UX-16).

**Parity owned:** all "Planning" items; "Dress today"; legacy daily console only for migrated old `daily_look` artifacts (read-only renderer).
**Exit gates:** Today card ready before 07:00 local for active test users on staging; plan state identical across two devices; no client-side derived indexes.

---

## M6 — Profile, sharing, comms, admin, and web cutover

**Goal:** Complete web parity, then move www/beta users onto the platform.

**Inputs:** legacy `/api/stylenotes/*`, `/api/avatar/*`, notify.js, share flow, admin.html; `migration.md`; SEC-60..61, SEC-80..85; D19.

**Tasks**
1. You › Your model: close-up + full-length photo reads (`POST /style/analyse` on own private photos), colour season/undertone/contrast, silhouette/body, the deterministic model (skin/hair picks, shape by hand, photographed cell), forward CTA back to a parked look.
2. You › Taste: style icons, archetypes, range tiers, splurge, annual spend; learned taste memory visible and editable (D19).
3. Sharing: `POST /shares` (snapshot builder, public copies under `shared/{token}/`), unshare, `/share/[token]` RSC page with OG image + report action (SEC-23), IG handle capture, native share sheet (UX-16).
4. Notifications: port notify.js to `workers/notify` + React Email templates (`packages/emails`, tokens.js) — re-engagement sequence (≤1/user/local day), morning cue, looks-ready, receipt held/filed; preferences; RFC 8058 one-click unsubscribe; `email_suppressions`; `?from=email` attribution.
5. Account deletion + data export workers (SEC-80, SEC-81); retention jobs live (SEC-82).
6. Admin app (`app/src/app/(admin)/admin/*`, `auth: 'admin'`, audit_log on every read): users list/detail, output viewer per artifact type, generation health, feedback feed, **cost dashboard** (unit economics from `generation_calls`), flags + entitlements management.
7. Marketing site `/` signed-out (OD-5): port SEO/OG/JSON-LD from legacy `main` `index.html`; waitlist with Turnstile + double opt-in (SEC-60).
8. Migration: `scripts/migrate/*` (introspect, extract, transform, assert, rehost, reverse-delta), rehearsals on staging until asserts clean twice; legacy redirect map (`/dashboard`, `/board/:id`, `/look/<10-hex>`, email deep links).
9. **Cutover** per `migration.md` §4; rotate legacy keys; T+30 decommission checklist.

**Parity owned:** Profile & style notes, Saved & sharing, Notifications (email), Admin, Cross-cutting.
**Exit gates:** web parity checklist 100% (minus product-declined items); migration asserts clean; SEC-60/61/80–85 tests green; cutover done with rollback rehearsed.

---

## M7 — Native parity & store launch

**Goal:** Ship iOS and Android.

**Inputs:** `mobile.md` §3–5; D17, D20, D21; store checklist.

**Tasks**
1. Close any native gaps from M3–M6 (every destination and flow on native).
2. Offline read: TanStack Query persistence (MMKV) + `/sync?since=` delta endpoint + queued writes for simple mutations (D17).
3. Push: `push_tokens`, Expo Push from `workers/notify` (looks ready, morning cue), notification permission UX, deep links.
4. Share extension "Share to Robes" (D20) → Inbox.
5. Haptics + motion polish (D21); dark mode enablement (OD-4).
6. Store compliance (mobile.md §4): in-app deletion, Sign in with Apple, UGC report/block, AI imagery labelling, privacy labels from `docs/data-inventory.md`, permission strings from `packages/copy`.
7. EAS Build/Submit/Update pipelines; Maestro suite on EAS Workflows; TestFlight + Play internal → staged public release.
8. Native observability (deferred from M1 Task 6): `@sentry/react-native` needs a dev build, not Expo Go (ADR 018). Add it with the same scrubbing (`@robes/logger/scrub`), plus PostHog React Native behind the same `consents` answers, using the `@robes/analytics` catalogue.

**Exit gates:** Maestro suite green on both platforms; native budgets met (cold start ≤ 2.0 s Pixel 6a); store review passed.

---

## M8 — Monetisation (optional, after launch data)

**Goal:** Plans and entitlements that drive quotas.

**Tasks:** plans UI + paywall moments (no lock language — capability appearing), Stripe Checkout + webhooks (web), RevenueCat (`react-native-purchases`) + webhook → `entitlements`, quota tiers from `plans.limits`, receipts/emails, admin entitlement tools. Use `stripe:stripe-best-practices` skill when implementing.

**Exit gates:** entitlement changes reflect in quotas within 60 s on both platforms; webhook idempotency tests; refund/cancel flows tested.
