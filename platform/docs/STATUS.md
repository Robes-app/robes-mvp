# Platform status

What is built, what runs where, and what is left, for whoever picks this up next. Plans and
decisions live in `plans/`, `SPEC.md` (ADRs) and `CLAUDE.md` (rules); this page is the map.

## Run it

```bash
pnpm bootstrap            # deps, docker services (Postgres, MinIO, Mailpit), migrations, buckets
pnpm dev:web              # http://localhost:3300 — sign in with any email; codes land in Mailpit (http://localhost:58025)
pnpm dev:mobile           # Expo Go; see docs/DEVELOPING.md → Mobile sign-in
pnpm verify               # lint + typecheck + unit + DB suites (what every commit passes)
pnpm --filter @robes/app test:e2e   # Playwright against `next start`
pnpm notify               # one email tick → Mailpit
pnpm maintenance          # retention, outbox sweep, account deletion, data export
pnpm batch:tick -- --now=2026-09-24T04:30:00Z [--user=<id>]   # overnight Today look (fake batch locally)
```

Without `GEMINI_API_KEY` every AI call uses the deterministic fake, so all flows work offline.

## Built (by roadmap milestone)

| Area | Web | Native | API / worker |
|---|---|---|---|
| M0/M1 platform | shell, CSP nonces, security headers | Expo Router, SecureStore session | `route()`/`sseRoute()` wrapper, Better Auth passwordless OTP (+ Apple/Google when configured), jobs outbox (inline in dev, SQS in AWS), SSE progress, flags, quotas, spend breaker, consents |
| Media | uploads, signed renditions | camera/roll upload | presigned PUT → RenditionFn (sharp, AVIF/WebP, blurhash); CloudFront signed URLs/cookies |
| M2 shell | nav, ⌘K, Create sheet, You area | tabs, Create modal, You stack | `/me`, notification prefs, deletion request |
| M3 wardrobe | grid, add, piece page, wishlist | same | pieces CRUD + undo, batch analyse job, wishlist + "I bought this" |
| M4 styling | style a piece, ideas, saved looks, look page, composer, share, You › Style | same | `key_piece` job (text then frames), ideas, looks + variants + wears, style DNA engine (legacy parity fixtures), colour/silhouette analysis job, shares (128-bit token, signed ≤2 h images) |
| M5 today & plan | Today (next step, week strip, tray), Style it for today, Plan | same | `/today`, next-step rules, `daily` job (weather via Open-Meteo), plan pin/unpin/rename |
| M6 comms & admin | unsubscribe page, waitlist + confirm, admin app, data export | — | notify tick (looks ready, five, empty week, morning cue; RFC 8058 one-click), account deletion (SEC-80), data export (SEC-81), admin reads (every read audited), waitlist (SEC-60) |
| M7 native | — | push registration + deep links, consent-gated PostHog (analytics + JS errors) | push tokens API, Expo push channel on the notify tick |

## Infrastructure

CDK stages `Staging` / `Production` (`infra/`), selected with `-c stage=` or `ROBES_STAGE`;
member/small accounts use `ROBES_<STAGE>_BUDGETS=off` and `ROBES_<STAGE>_GENERATE_RESERVED_CONCURRENCY=0`
(`runbooks/environments.md` §4 step 10). Staging was deployed to the sandbox account
259887029472 (eu-west-1) on 2026-09-24.

**Pending in the sandbox** (needs fresh admin credentials; review `pnpm cdk diff 'Staging/*'` first):
1. ~~Redeploy~~ done 2026-09-24 incl. `Stg-Inbound`. Still to do by hand: MX `in.staging.mail.byrobes.com` →
   `10 inbound-smtp.eu-west-1.amazonaws.com` and activate the rule set (`runbooks/environments.md` §9 step 7).
2. ~~CloudFront private key~~ in `robes-staging/cloudfront/signing-key` (2026-09-24).
   Vercel project `codu/robes-app` (root `platform/app`, dub1, Node 24) is linked with non-secret env set;
   run `bash scripts/bootstrap.sh staging` to migrate Supabase, create the robes_app login and set every
   secret (Vercel + Secrets Manager), then `vercel deploy --prod --scope codu` from the repo root.
3. Set real values for the placeholder secrets: `gemini/api-key`, `unsub/hmac-key` (and the same
   value as Vercel `UNSUB_HMAC_KEY`), `expo/access-token`, `database/url`, `auth/*`.
4. SES: add the DKIM/MAIL FROM DNS records from the `Stg-Email` outputs; request production access.
5. Vercel project + env (`runbooks/environments.md` §6), Turnstile keys, Upstash.

## Known gaps (not built yet)

- **TODO: Sign in with Apple.** Deliberately left out: sign-in stays email only (one-time code) until the app is in TestFlight, so the initial ask isn't widened with more sign-in flows to test. Add it before App Store submission: the App Store requires it once Google sign-in is offered (beta vs staging review, Arrival 01).
- Receipts: no photo-based re-read of receipt lines (legacy vision pass; would need image fetching); product images kept as metadata only. Activating the SES rule set and the `in.` MX record are ops steps (`runbooks/environments.md` §9).
- Alternates rail and swapping pieces in a daily draft (secondary frames now render on demand via `look_render`).
- `borrowing` email and `finish` next-step rule (need look proposals). Your model: no photographed try-on from her own photos (renders use the catalog portrait for her picks, per SEC-22).
- Trips: no images, no "more looks from this capsule", trips not drawn as Plan blocks.
- Legal texts (pages exist, copy "On its way"), "export ready" email, push receipts polling.
- Native crash reporting needs `@posthog/react-native-plugin` in an EAS/dev build; push needs an EAS project id + APNs/FCM.
- M8 monetisation.
- Legacy migration tooling: see `migration.md` (rehearsed locally against a fixture, not the real legacy DB).

## Legacy sync 2026-10-13

Legacy `2aef362..origin/beta` (the 2026-10-01 → 10-10 beta work) reviewed against the platform.

**Ported:** the style DNA prompt block (fixtures regenerated from legacy `style_dna.js`; platform feeds
`style_archetypes` only, since the other inputs aren't stored yet); `style-piece` v2 (itemised pieces per
way, owned pieces resolved to `pieceId`); `daily`/`travel` v2 (one hero per look, rotated);
`wardrobe-analyse`/`receipt-read` v2 (the label never carries the brand); legacy migrations 24/25 in
`scripts/migrate` (saved looks only, see `migration.md`).

**Already equivalent:** the trip-hidden mail rule (notify only reads look-backed plan days), account delete
(SEC-80). **Legacy-only:** `/settings` redirects, email link paths, the `TRIP_HIDDEN` board-share rule, docs.

**New in legacy, not built here** (rough effort; ~~struck~~ = built since, see 2026-10-15):
- Refine in her own words on daily/travel looks and a saved look (`/api/look/refine`), M. (↻ on a suggested
  look is built: `style-piece` v3 refine.)
- ~~The look prompt: `/api/look/ask` with ASK intents over a draft look, plus per-piece `styled` notes~~ —
  built (`look-ask` v1 job; `styled` rides the avatar v2 render).
- ~~Look states (Suggested → Draft → Saved, `anchor_piece_id`/`set_id`), the keep-or-pass deck~~ — built
  (`server/look-states.ts`, `components/looks/deck.tsx`). Still not built: the modular home (O1–O4 resolver), L.
- ~~Style memory (verdicts, swaps, wears, strikes, asks) feeding the DNA block~~ — built (`style-dna` repo memory).
- ~~Her brief, brands, investment and facts in Settings~~ — built (`style-brief` job, You › Style, `/me/style/season`).
- ~~Avatar frame mode (re-dress Robes' own frame of a suggested look)~~ — built (`look-frame` job).
- Travel looks re-styled from the case (`held`, refine), M; the platform has no trip looks yet.

## Legacy sync 2026-10-15

Legacy `origin/beta` commits after the 10-13 sync (`61f1cf0` → `fc66bcd`, 13–15 Oct) reviewed against the
platform. Most of it had already landed through the `port/looks` and `port/photos` branches.

**Ported:** the style DNA prompt block (legacy `37ad2e9` cost pass: each section's explanatory second
sentence folded into one line; `1284303`: the memory closes on "Her brief today outranks all of this").
Fixtures regenerated from legacy `style_dna.js`; prompt versions unchanged (the block is shared context,
as in the 10-13 sync).

**Already equivalent:** `style-piece` v3 already carries the scene line + her pieces as numbered frame
references (`61f1cf0`), one piece per slot and whitespace-collapsed fields (`19f5ad8`), gender from the
profile and the tightened brief (`37ad2e9`), and `askDateFrom` for a day read from her words (the platform
never had the intent classifier); `look-ask` v1 words a rule in her voice and parks it under Robes noticed
(`1284303`); brief lists were already uncapped (`76187f0`); several pieces from one photograph
(`2975850`, `05fe85a`, `d3df950`) — `wardrobe-pieces` v1 incl. pairs collapsed and the kind-and-colour
match rule, the add-flow and look-from-photo screens with Already mine / Leave it out and matched pieces
reading as her row; the swap glyph is already the one circular-arrows icon (`fc66bcd`).

**Legacy-only:** home's empty Style DNA card as one "Log your style notes" door (`f044b35`) — the
platform has no modular home yet; harness and CLAUDE.md edits.

**New in legacy, since built here:** the saved look's calendar on a Lookbook card (the diary sheet
over the grid, web and native — beta parity pass 4, 2026-10-28).

## Legacy sync 2026-10-24 — admin

Legacy `public/admin.html` (beta) compared with `/admin` here. The new admin already had the users
list, the user's profile / consents / usage / jobs, job health, metrics, costs, flags and the audit log.

**Ported:** the user page now carries her records, as beta's does — her wardrobe (with signed photo
thumbnails and wear counts), looks (pieces, pieces still to find, wears and last worn), saved
artifacts, wishlist, feedback, what she told Robes (style memory), her brief lines, model calls,
emails sent, receipts and events (`GET /admin/users/:id/records`, audited `admin.user.records`).
Plus a feedback feed across users (`/admin/feedback`), one model call with its prompt and response
(`/admin/generations/:id`, audited `admin.call.read`; the prompt reads "Cleared" after 30 days), and
an output viewer for a saved artifact (`/admin/artifacts/:id`, audited `admin.artifact.read`).

**Not ported:** the per-type artifact rendering (the viewer shows the artifact as stored — a
`shortcut:` in `admin/artifacts/[id]/page.tsx`); beta's prompt → calls → artifact grouping by
`gen_id` (calls link to their job id instead); the beta / production environment filter (each
environment has its own database here). Admins are granted with `pnpm --filter @robes/db admin:grant <email>`.

## Legacy sync 2026-10-24 — material

Ported the same day it landed on legacy beta (design "Colour & material, one section"): every piece
and wish carries ONE material (`material`, an id or null; the family is derived, never stored) from
`@robes/core/material` — seven families, 40 materials, the ids shared with legacy
`material_model.cjs`. Migration `20261024195916_material.sql` is generated by `gen:sql` and
drift-tested (a check constraint from the list on `wardrobe_items` and `wishlist_items`).
`wardrobe.analyse` v4 reads it from the photo and any visible care or composition label (optional,
never an empty enum value) with a `material_check` doubt in `item_dna`; her answer — "Not sure"
included — clears it, and a material she picked while the piece was reading is kept over the read.
The piece record's colour section is "Colour & material", Material its fourth row, opening the
material sheet (family chips, then the family's materials; a pick saves and closes), web and native.
The Colour row now shows Robes' "Check" too.

**Not ported:** material on the multi-piece photo read (`wardrobe.pieces` still builds on
`wardrobe.analyse` v2, colour model included) and on receipt reads; the legacy data copy
(`scripts/migrate`) does not carry `material` yet; Refine has no material filter.

## Add a piece — 2026-10-26 (design "Add Piece — Handoff")

One flow, web and native together. **Add pieces** (native: a form sheet; web: `/wardrobe/add`) picks
where the pieces go once (Wardrobe | Wishlist) and carries it through every door: Take a photo,
Camera roll (several at once, up to 12), Paste a link, Forward a receipt, Add without a photo. The
camera reads every shot as it is taken (Mine / Wishlist replaces Single / Several; the tray counts
what it found; the last-photo thumb is the roll). Every photo and link lands on **Review**: the
scan (7 steps × 380 ms; reduced motion shows it settled), one piece at a time, the record's rows
resolving from "Reading…", any row opening its drawer, "Not this piece", one ink button that files
and walks on, then **Filed** ("Two pieces filed."). A photo read files once all its pieces are
answered (`photoReads.file`, now carrying every edited field and `to`); a link files through its
Inbox entry (`inbox.decide`, then her edits). Shared logic: `@robes/core/add-flow` (scan frames,
tags, the cover crop, the queue, the edit diff); copy: `wardrobe.add`. Twins are named in comments
(`AddPiecesPanel`/`add-flow.tsx`, `Review`/`review.tsx`, `ScanPhoto`, `ManualAdd`, `LinkImport`).

Retired: the web dropzone (`AddPieces`) and its batch-then-reveal (`?saw=1`) on both platforms, the
separate "Several pieces in one photo" screen (web `/wardrobe/add/photo`, native
`/wardrobe/pieces`), the wishlist's inline name form (wishes come in through Add pieces on the
Wishlist), and the "On its way" receipt door (Create's receipt row is the real door now).

**Not carried over, flagged:** Review offers add or skip; the old screen's "Already yours?" (file a
read piece as a duplicate of one she owns, giving it the crop as its photo) is not on Review — the
API's `owned` answer stays for it. Native picks from the camera roll with the OS picker; the web
roll is a file input. The e2e specs were rewritten for the flow but not run in this container (no
MinIO); the unit, DB and native suites and `next build` pass.

### Redline pass — 2026-10-26 (design "Add Piece — Redline Audit")

- **Jobs follow SSE with the row as the fallback** (`app/src/lib/follow-job.ts`, used by `useJob`
  and Review's reads): a stream that errors, sends a payload the contract rejects, or stays silent
  for 4s falls back to `jobs.get` every 2.5s until the job settles, and the row is re-read every
  20s while the stream is open. Staging showed Review stuck on "reading" and links never reaching
  Review; this removes the dependence on the stream arriving.
- **Review's reading state**: a falling scan line, three breathing rows, "Robes is *reading* your
  photo…", Cancel; after 20s or an empty read, "Fill it in yourself" opens the manual form with the
  photo attached (a late read still lands).
- **Chrome**: one primary spec (ink pill, 48pt, 30% ink disabled, pinned at the foot —
  `PinnedAction` on both); the web dock stands down on the add routes (`isFlowPath`); the
  destination is chosen once on the Add pieces sheet (the camera's toggle and the link's are gone;
  the link says "Filing to your wardrobe · Change").
- **Inbox holds receipts only**: link entries keep `source: 'link'` and load through the new
  `inbox.get`; the count is pieces waiting. A quiet photo read that finds nothing now discards its
  placeholder piece (`pieces.discard`) instead of leaving a failed "New piece". The receipt
  selection screen is on both platforms.
- **Field drawers** (rows as a white card with hints, colour/material/category/print/wear/price/
  size/notes) per the audit; size logic in `@robes/core/sizes`, price parsing in `@robes/core/wardrobe`.
- **Not done in code**: staging receipts need the MX record for `in.staging.mail.byrobes.com` and
  the `robes-staging-inbound` SES rule set activated (runbooks/environments.md §9 step 7). Native
  camera refused → Settings (the OS-camera fallback is gone, per the audit). Size conversions are
  womenswear only.

## Beta parity — 2026-10-28

Beta and staging compared screen by screen, every gap listed and closed in seven passes
(`plans/2026-10-28-beta-parity-move-to-staging.md` — the gap list, Annie's decisions and each
pass's notes). Done on web and native: the blockers (unnamed save, model re-render after an edit,
"Sept"), beta's visual tokens, the look page and piece metadata, the diary/Lookbook/home/wardrobe/You
details, live weather from her location, the inline title field, the photo read's print and
material, the native shell (not-found, deep links, app links), and product events after consent.

**Still outside code:** a staging worker deploy (`runbooks/staging-deploy-handoff.md` — until then
photo reads, the twin, the colour read and model dressing run the 23 Oct workers); the GitHub
`staging` environment and `STAGING_AUTO_DEPLOY`; the app-link env (Apple team and bundle id,
Android package and cert) and Associated Domains; a new EAS build; the live checklist (plan §8).
**Open:** native Sign in with Apple (N9, App Store blocker); consent during onboarding; the
week's list in plan §7.

## Flakes to watch

- `wardrobe-ui` wishlist Undo under heavy parallel load (seen once, not reproduced).
- `ui-native` Sheet test once under a full parallel run.
- `route-manifest` (SEC-01) once under a full `pnpm test` while two agents were writing to the
  same checkout: one route's dynamic import overran its per-route timeout (the suite reported
  111s of transforms on that run). Passed in isolation immediately after and on a quiet re-run.
  It is shaped like a timeout, not a logic failure — but it is the security-critical manifest
  test, so re-run `pnpm test` on a quiet tree before trusting a green and never narrow its glob.
