# Robes Platform — Master Spec

**Status:** approved for build · **Date:** 2026-09-24 · **Owner:** platform lead
**What this is:** the specification for rebuilding Robes as a secure, scalable, consumer-grade platform — a Next.js web app, an Expo (React Native) app, a job-based AI backend on AWS, and Supabase for auth and data — built in `platform/` beside the legacy app, which keeps running until cutover.

---

## 0. How to use these docs

Read in this order. Normative docs (rules) are marked ★; reference docs are evidence extracted from the legacy code (branch `platform` = `origin/beta` @ `2aef362`).

| Doc | Purpose |
|---|---|
| ★ `SPEC.md` (this) | Goals, decisions, architecture summary, scope, milestones, open decisions |
| ★ `security.md` | Security requirements `SEC-nn` — merge gates |
| ★ `infrastructure.md` | Vercel, AWS CDK stacks, media pipeline, queues, CI/CD, cost controls, observability, DR |
| ★ `data-model.md` | Schema rules + amendments to the proposed target schema |
| ★ `api.md` | `/api/v1` conventions and endpoint catalogue |
| ★ `design-system.md` | Tokens pipeline (Tailwind v4 + Uniwind), components, quality gates |
| ★ `mobile.md` | Expo app architecture and store readiness |
| ★ `migration.md` | Data migration, cutover, rollback |
| `plans/` | Implementation plans — start with `plans/README.md` |
| `reference/legacy-api-and-ai.md` | Every legacy route, prompt, model, business rule, defect |
| `reference/legacy-data-model.md` | Effective legacy schema, JSONB shapes, **§6 proposed target schema**, legacy→target mapping |
| `reference/legacy-features.md` | Every surface/feature, client logic to move server-side, storage, analytics, **§8 parity checklist** |
| `reference/brand-and-design.md` + `tokens.draft.json` | Brand voice, naming map, palette, type, components, a11y gaps |
| `reference/ux-opportunities.md` | UX pain points, 25 improvements, new IA, budgets, **§5 P0 UX requirements** |
| `reference/cost-research.md` | Storage/AI/platform pricing, cost model at 1k/25k/250k MAU, savings levers |
| `reference/stack-versions.md` | Current versions (2026-09-24), compatibility, token-sharing approach |

The production readiness review that motivated this work: https://claude.ai/artifact/74NsRLx4k3wsPyYGJsw3RZ

## 1. Goals

1. **Secure by design.** Every finding in the review is closed structurally (`security.md` §3 map), with an automated test that keeps it closed.
2. **Scales horizontally.** Stateless web tier, durable jobs, no in-process state; 250k MAU without re-architecture.
3. **One product, two clients.** Web and native share contracts, API client, tokens, copy, core logic, and the same IA; native adds camera, push, offline, share sheet.
4. **Drastically better UX.** The P0 UX requirements (`reference/ux-opportunities.md` §5, adopted verbatim as `UX-01…UX-29`) — staged streaming results in ~3 s, resumable jobs, no polling, instant navigation, fast capture, value before 15 pieces, two-screen onboarding, undo not confirm.
5. **Cost-efficient.** Unit economics measured per generation; the levers in `infrastructure.md` §8 target ≈ −70% vs legacy at scale (`reference/cost-research.md` §5.1).
6. **Parity, then beyond.** Everything in the legacy parity checklist that product keeps (`reference/legacy-features.md` §8) works on web before cutover and on native before store launch.

## 2. Non-goals (for this rebuild)

- Porting the legacy code. Legacy is a behavioural spec; nothing in `public/` or `server.js` is copied wholesale. Prompts and pure logic (`style_dna.js`, `wardrobe_taxonomy.js`) are ported deliberately with tests.
- Rebuilding surfaces legacy has switched off: **moodboards** (`_RB_MB_HIDDEN`), **weekly plan** (ADR-001 legacy), try-on UI (endpoint only, no UI) — unless product decides otherwise (§9).
- Multi-region active/active, marketplace/commerce, stylist accounts (legacy `project/Robes for Stylists.html`) — later.

## 3. Principles

1. **The server is the authority.** Clients send intent and ids; the server loads context, enforces quotas, mints ids, creates artifacts. No business rule exists only in a client.
2. **Everything slow or paid is a job.** Postgres row = truth, SQS = transport, Lambda = executor, Realtime = notification.
3. **Least privilege everywhere.** RLS + column grants; service role only in server-only modules and workers; OIDC not keys; no anon table access.
4. **Contracts first.** zod schemas in `packages/contracts` generate types, the API client and OpenAPI; model outputs are validated like user input.
5. **Test the rules, not just the code.** pgTAP for RLS, route-manifest tests for auth, contract fuzzing for validation, evals for prompts, budgets for performance, contrast tests for tokens.
6. **Product voice is code.** Copy lives in `packages/copy`; banned words fail CI; errors never leak provider text.
7. **YAGNI with a map.** Build the milestone in front of you; the docs say where the rest goes.

## 4. Decisions (ADRs)

| ADR | Decision | Rationale / reference |
|---|---|---|
| 001 | Monorepo at `platform/` (pnpm workspaces + Turborepo): `app/` (Next.js), `mobile/` (Expo), `workers/` (Lambda handlers), `infra/` (CDK), `supabase/` (migrations/tests), `packages/*` (shared), `scripts/`, `docs/`. Legacy root untouched. | User requirement: new folder, no disruption |
| 002 | **Keep Supabase** (Auth, Postgres, Realtime, pg_cron) on **new projects** per environment (`robes-staging`, `robes-prod`, EU region); no Supabase Storage | Review §Supabase; cost-research §1.5 |
| 003 | **Next.js 16 on Vercel** (Fluid compute, `dub1`), API as route handlers under `/api/v1` using a shared `route()` wrapper; `proxy.ts` for CSP nonce + session refresh | stack-versions; api.md |
| 004 | **Async generation on AWS**: SQS (+DLQ) + Lambda (Node 24, arm64) via **CDK v2**, outbox pattern with a sweeper; EventBridge Scheduler for cron | infrastructure.md §4 |
| 005 | **Media on S3 + CloudFront** with pre-generated renditions (sharp Lambda), signed cookies/URLs for private media; **Cloudinary retired** after rehost | cost-research §2.3 (≈$680 vs ≈$15.5k/mo at 25k MAU) |
| 006 | **Tokens in TS → Tailwind v4 `@theme` CSS** shared by web (Tailwind 4.3) and native (**Uniwind 1.12**); NativeWind 5 is the swap-in once stable | stack-versions §Token-sharing; design-system.md |
| 007 | **Airtable retired**; waitlist, feedback, looks move to Postgres; optional one-way CRM sync from a worker | review H2, M3 |
| 008 | **AI provider layer** (`packages/ai`) with a capability→model registry, versioned prompt modules, evals, cost accounting; Gemini first | infrastructure.md §6; model churn in cost-research §4.1 |
| 009 | **Upstash Redis** for rate limits + idempotency keys | security SEC-04 |
| 010 | Sentry (all runtimes), PostHog EU (consent-gated, replay masked), pino logs with redaction | security SEC-83/84 |
| 011 | Data migration by scripted ETL into new projects + staged cutover with rollback | migration.md |
| 012 | Testing: Vitest (TS packages, web), jest-expo + RNTL (native components), Playwright (web e2e), Maestro (native e2e), pgTAP (DB), fast-check (contract fuzz), `packages/ai/evals` | stack-versions |
| 013 | Branching: M0–M1 on `platform`; then merge `platform/` into `beta` as trunk with Railway watch paths excluding `platform/**`; Vercel/turbo-ignore excludes legacy | infrastructure.md §7 |
| 014 | Runtime baselines: Node 24 LTS, pnpm 11.27, TypeScript 6.0.3, Biome 2.5, Next 16.3.6 / React 19.3, Expo SDK 57 / RN 0.86.3 / React 19.2.3, zod 4.6 | stack-versions |
| 015 | IA: **Today · Wardrobe · Looks · Plan + Create + You**, identical routes on web and native | ux-opportunities §3 |
| 016 | Identifiers: server-minted UUIDs; share tokens ≥128-bit; legacy share ids honoured read-only for 180 days | security SEC-13; data-model §5 |
| 017 | Emails via Resend + React Email (`packages/emails`) using `tokens.js`; inbound receipts via Resend inbound webhook (Svix-verified) | security SEC-61 |
| 018 | Mobile dev runs through Expo: `expo start` + **Expo Go** by default; every native dependency via `expo install` and must pass `expo-doctor`. Switch to a dev client (`expo run:ios` / EAS `development` profile, still `expo start`) only when a feature needs a module Expo Go lacks (e.g. RevenueCat) — record it here when it happens. No hand-edited `ios/`/`android/` (CNG) | mobile.md; stack-versions |

## 5. Architecture summary

See `infrastructure.md` §1 diagram. In one paragraph: web and native clients authenticate with Supabase and call `/api/v1` on Vercel with the user's JWT. Route handlers validate (zod), authorize (JWT via JWKS; admin via `private.admin_users`), rate-limit (Upstash), check quotas and flags, and either serve reads (RLS-scoped Supabase client) or create a `generation_jobs` row and enqueue to SQS. Lambda workers load context from Postgres with the service role, call Gemini through `packages/ai`, write staged outputs and images (S3, renditions by a sharp Lambda, delivered by CloudFront), and create artifacts. Clients receive progress via Supabase Realtime (row changes + broadcast), and push when backgrounded. Schedules (notify tick, overnight Today batch, retention, sweeper) run on EventBridge. Everything is defined in code: Supabase migrations, CDK stacks, Vercel project config, EAS config.

## 6. UX

- **IA and route map**: `reference/ux-opportunities.md` §3 (adopted). Canonical web routes: `/` (Today when signed-in; marketing when signed-out), `/wardrobe`, `/wardrobe/inbox`, `/wardrobe/wishlist`, `/piece/[id]`, `/looks`, `/looks/ideas`, `/look/[id]`, `/look/new`, `/ideas/[id]`, `/plan`, `/day/[date]`, `/trip/[id]`, `/you/*`, `/auth/*`, `/share/[token]`. Native mirrors via Expo Router. Legacy `/look/<10-hex>` and `/board/<id>` resolve to shares (`migration.md` §4).
- **P0 UX requirements** `UX-01…UX-29` = `reference/ux-opportunities.md` §5 items 1–29, verbatim. Each feature plan lists which UX-nn it satisfies; the milestone exit review checks them.
- **Budgets** (`reference/ux-opportunities.md` §4, enforced in CI per UX-24): e.g. text stage p50 ≤ 3 s, all images p50 ≤ 45 s, route JS ≤ 150 KB gz, mobile LCP ≤ 2.0 s, native cold start ≤ 2.0 s on a Pixel 6a.
- **Improvements beyond parity** planned into milestones: D1–D7, D9–D16 (P0, core milestones); D8 cutouts (M3); D17 offline (M7); D18 Today batch + morning push (M5); D19 taste memory (M6); D20 share extension, D21 haptics (M7); D22 i18n readiness (M2 copy registry); D23 widget, D24 calendar, D25 outfit photo → pieces (post-launch backlog).

## 7. Security

`security.md` is normative. Every milestone exit requires the SEC items it touches to have passing tests. The legacy stack gets immediate hotfixes in parallel (`plans/2026-09-24-p0-legacy-hotfixes.md`) because the rebuild takes months.

## 8. Scope → milestones

The parity checklist (`reference/legacy-features.md` §8, 92 items) is assigned to milestones in `plans/README.md`. Summary:

| Milestone | Outcome | Exit criteria (abridged) |
|---|---|---|
| **M0 Foundations** | Monorepo, toolchain, tokens pipeline, `route()` wrapper with auth/validation/errors/rate limit, Next.js + Expo skeletons, Supabase local with baseline identity schema + pgTAP, CI | CI green; health route; headers test; pgTAP proves C1 impossible; both apps render tokens |
| **M1 Platform core** | Full baseline schema, CDK stacks in staging, job system end-to-end (fake provider), uploads + renditions, web auth (email, Google, Apple), env separation, Sentry/PostHog consent, runbooks | A job created on web completes via SQS/Lambda and streams to the client; upload → renditions → signed delivery works; SEC-01..04, 10..16, 20, 30..34, 50..55, 70..74 tests green |
| **M2 Design system & shell** | `ui`, `ui-native`, `copy`, `icons`; IA shell on web + native; two-screen onboarding; You area; Today skeleton | Storybook; contrast/copy lint; UX-11/12/22/23/25/26/27 |
| **M3 Wardrobe** | Pieces, batch capture (native multi-shot + camera roll), analyse job, taxonomy/tags, Inbox (photos, receipts, links), wishlist, piece page, cutouts | UX-15, 17–20; SEC-20..22, 40, 41 |
| **M4 Styling** | `packages/ai` + evals; Style a piece (key-piece), intent, look composer, alternates/notes/render, Ideas, staged streaming, lazy images, cache, value-before-15 | UX-01..10, 13, 14, 21, 28; cost levers 1–3, 6 |
| **M5 Today & Plan** | Today's look (interactive + overnight batch + morning push/email), Plan (days, trips, wears), travel planning/looks/restyle | UX-16; D18 |
| **M6 Profile, sharing, comms, admin, cutover** | Style analysis (colour/silhouette), avatar/model, taste memory, shares + OG pages, notification emails + prefs + unsubscribe, feedback, deletion/export, admin app + cost dashboard, migration rehearsal → **cutover of www/beta to platform (web)** | Parity checklist (web) complete; migration asserts clean; SEC-60..61, 80..85 |
| **M7 Native parity & store** | All destinations native; offline read; push; share sheet/extension; haptics; store compliance; TestFlight/Play internal → public launch | mobile.md §4 checklist; Maestro suite green |
| **M8 Monetisation (optional)** | Plans/entitlements UI, Stripe (web) + RevenueCat (native) | Entitlements drive quotas |

Mobile work starts in M2 (shell) and each feature milestone M3–M6 includes its native screens unless the plan says "web-first"; M7 closes the gap and ships.

## 9. Open decisions (founder / product)

| # | Decision | Default if no answer |
|---|---|---|
| OD-1 | **Stand-in starter wardrobe (UX D9)** revisits the rule "Robes never hangs a piece she hasn't photographed" | Build "borrowed pieces" clearly marked as not hers (UX-21 still met) without adding stand-ins to the wardrobe; revisit after M4 data |
| OD-2 | Moodboards: revive as an Ideas type or drop | Drop (hidden in legacy) |
| OD-3 | Try-on UI (own photo only) | Defer to post-launch; keep endpoint design in api.md |
| OD-4 | Dark mode at launch | Light at launch; dark tokens defined/tested, enabled M7 |
| OD-5 | Marketing site: rebuild in Next (`/` signed-out) vs keep separate | Rebuild in Next at M6 (SEO metadata ported from legacy `main`) |
| OD-6 | Pricing/plans and free-tier quotas | Beta plan with generous quotas + global breaker; M8 decides |
| OD-7 | Keep legacy share ids live 180 days | Yes |
| OD-8 | Supabase region (EU `eu-west-1`) and Vercel `dub1` | Yes (EU users, GDPR) |
| OD-9 | Undo instead of confirm for deletes (UX-15) replaces the legacy rule "deletes always confirm" | Undo (6 s toast, soft delete); only account deletion confirms |

## 10. Glossary

Product vocabulary and naming rules: `reference/brand-and-design.md` §1 (naming map) and `reference/ux-opportunities.md` §3.1 principle 4 (Look vs Idea, Trip, Wear, "Style a piece", "Style it for today"). Engineering: **job** (a `generation_jobs` row), **artifact** (a saved generated output; UI calls these Looks/Ideas/Trips), **asset** (a stored image), **share** (a public snapshot addressed by token), **stage** (a persisted partial result of a job).
