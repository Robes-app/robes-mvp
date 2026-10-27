# Cutover readiness: swapping byrobes.com to the new app

Status: draft, 2026-10-23 (updated 2026-10-26). Owner: Niall. The ordered steps a person with
credentials runs are [`runbooks/production-release.md`](../runbooks/production-release.md). This is the checklist that gets us from "the new app works on
staging" to "every beta user is on the new app and didn't notice anything break". The cutover
mechanics themselves stay in `docs/migration.md` §3–5 (normative); this plan lists what has to be
true before we run them, and adds what this week's legacy work changed.

## Where we are

- New app: live on staging (`staging.byrobes.com`, Vercel production target from `beta`), AWS
  workers in the sandbox account `259887029472`, Postgres on Supabase project `ebqaolcwhcqtuvkluubu`.
- Legacy app: www.byrobes.com (Railway, `main`) and beta.byrobes.com (Railway, `beta`), Supabase
  `Robes_p0`, Supabase Auth (password + Google), Resend, Cloudinary, Airtable.
- Production for the new app does not exist yet (`docs/HANDOVER.md`: "Production: not set up yet").
- Migration tooling (`scripts/migrate`) has only been rehearsed against a local fixture.

## 0. BLOCKER on staging now: the media pipeline is not running

Found 2026-10-23 by walking the flow on staging as a new account. **Every photo-driven flow is
dead**, which reads to a tester as "I can't create a look".

What was measured:
- `POST /api/v1/uploads` signs fine and a direct `PUT` to
  `robes-staging-media-259887029472` returns 200. Bucket CORS answers
  `Access-Control-Allow-Origin: https://staging.byrobes.com` for `PUT`. The upload is NOT the problem.
- The asset then **stays `status: 'pending'` forever** — `GET /api/v1/assets/:id` polled for 60s
  returns no `master`, no renditions, no width/height/blurhash.
- `wardrobe-pieces` waits `assetWaitMs` (30s) for the asset to leave `pending`, throws
  `asset_not_ready`; `useFirstPiece` falls back to the single read, which waits another 30s on
  `wardrobe-analyse`. Total ~60s, then the piece is marked failed.

So `uploads/` is not reaching **RenditionFn**, or RenditionFn is failing every invocation. The CDK
wiring is correct in code (`infra/src/stacks/media-stack.ts`: native `notificationConfiguration`
→ `s3:ObjectCreated:*` on `RENDITION_PREFIXES`), so this is deployed state, not a code defect.

Ops steps (needs admin credentials on `259887029472`, eu-west-1):
- [ ] CloudWatch logs for the `rendition` function: is it invoked at all? If it is, read the error.
- [ ] The rendition DLQ (`queues-stack.ts` `RenditionDlq`) — depth and a sample message.
- [ ] `aws s3api get-bucket-notification-configuration` on the media bucket: is the Lambda
      configuration actually present, and does the `S3InvokeRendition` permission still exist?
- [ ] Check the worker secrets the rendition path needs — this plan's §B still lists
      `database/url` as a placeholder. `processUpload` writes the asset row, so a bad
      `DATABASE_URL` fails every invocation into the DLQ.
- [ ] `pnpm cdk diff 'Staging/*'`, then redeploy `Stg-Media`.
- [ ] Re-test: upload a photo, poll `GET /api/v1/assets/:id` until `ready`, then create a look
      from a photo end to end.

Until this is fixed, nothing else about staging can be judged — and **it must be proved on
production before the DNS move**, because it is invisible in a health check
(`/api/v1/health` answered `{"ok":true}` throughout).

## A. Catch up with this week's founder work (legacy 16–23 Oct)

Ported 2026-10-23 and then **audited against legacy clause by clause** (four read-only audits:
twin, front door, prompt + observations, piece page). The ports were functional-first, so the
list below separates "the behaviour is there" from "it reads as beta does".

- [x] **Prompt hierarchy** — at parity, verified clause by clause against `30d7ea5`
      (`packages/core/src/style-dna/prompt.ts`): hard nos first and absolute, brief above the
      photo reads, struck lines never rendered, the DNA block as guidance.
- [x] **"Where should the pieces come from?"** — at parity and better: `recent` sets are loaded
      server-side from her own artifacts rather than trusted from the client payload.
      `readBalance` is regex-identical to legacy; starred pieces as taste present.
- [x] **The balance answer governs the owned-first clauses** (`62b3d35`) and is now auditable —
      `balance`, `shown` and `owned_of_total` ride `app.generation_calls.detail`.
- [x] **The hero rule** — `bcf8b8a` replaced one shared directive used by style, daily AND
      travel; only style-piece had been updated, so the overnight look and trips still ran the
      superseded 2026-10-08 rule. Fixed as `daily/v3` + `travel/v3`, with a test pinning v3's
      directive byte-equal to style-piece v4's so the three cannot drift again.
- [x] **Observations** — "That's right / Not quite", the un-keep ×, the paused wardrobe read and
      the high-street brands (M&S, & Other Stories, Mango, Dunnes, Penneys) are all at parity,
      web and native.
- [x] **Onboarding multi-piece pick** ("Robes sees N pieces · Which one first?").
- [x] **The week strip from the first saved look** — the cleanest port of the set.
- [x] **Colour model** phases 1–4 — the shade list, the analyse output, migration 27's columns and
      the piece sheet. **Your colours / Your prints** then needed its own shape: a family is one
      rounded square quartered into four shades (it was four circles), prints the same square (a
      circle), and the answer sits on the sheet's own avoid · no view · love control, not the
      header's uppercase segmented control. Fixed web and native.
- [ ] **The diary sheet is 14 day pills, not beta's month calendar** (`diary-sheet.tsx`,
      `packages/core/src/calendar`). Consequences: no past days, so **retro "record it as worn"
      is unreachable**; no filed-day dots; no "I wore this today"; and nothing is preselected on
      an undated save, so the CTA opens disabled where beta's is live. M.
- [x] **The generic-model badge** — on the deck's top card (`bcf8b8a`), the suggested look's
      frame and the empty draft's canvas (2026-10-27), opening the twin drawer, never a navigation.
- [x] **The scanner** — the deck's dressing card, the suggested tile and the look page's busy
      frame (`9ca0bf3`), with the three line lists kept apart.
- [ ] **The digital twin screens** — the engine is a faithful port (every constant matches) but
      the redline is not: the hero is not full-bleed over cream with the 90px fade and the caption
      inside it, the "Build your model" CTA the redline **deleted** was re-added, and the italic
      five-state status line and the empty state are missing. The parametric figure underlay is
      absent, so the stage is empty until the first twin lands. L.
- [x] **The in-app camera with Single | Several** (`bc56305`) — web over `getUserMedia`, native
      on `expo-camera` (+ `expo-image-manipulator`, both in Expo Go so no dev build), the mode
      remembered per device, Several collecting shots into the existing batch, and the OS camera
      as the fallback on a refused permission.
- [x] **The piece page leads with its photograph** and carries the Hero Rack star, which until
      now was reachable from the grid alone. **Change photo is NOT built**: there is no route to
      replace a piece's asset, and a button that does nothing is worse than its absence — it
      needs a contract + handler, scoped below.
- [x] **The receipt door** is its address card (the one action), the three numbered steps and a
      line naming what is waiting in the Inbox.
- [ ] **Change photo on a piece**: add `wardrobe.photo` to `packages/contracts/src/routes.ts`
      plus its handler, then the corner pill on the record door. S–M, needs the api-security
      checklist.
- [x] **A saved look has no wear record.** Closed 2026-10-24 (`ac827fb`, `1a0b3db`): a dedicated
      `looks.wears` read (the day, and the pieces she wore that day named from the wear's own
      snapshot), `wearDiff` in `@robes/core`, and the record under the rack on both clients —
      the dated rows each opening their day and naming what that day held that the look no
      longer does, each removable, with a door to record a day before today.
- [ ] **Her rejected colours sit outside HER HARD NOS** — deliberate on the platform (soft avoid
      in the palette block) but it contradicts `30d7ea5`'s "her nos are absolute". Needs Annie's
      call, not a code change.
- [x] **The balance question on every new-look door** — the home box, the empty Suggested tab and
      the Create sheet (one `HomeBox`), a dated day door, and the piece page (web: the box opens
      with the piece inside it; native: Style a piece asks it) (2026-10-27).
- [ ] **No product events come from either client's components.** Legacy fires `camera_opened`,
      `camera_filed`, `piece_removed`, `swap_drawer_opened` and dozens more through `_rbTrack`.
      On the platform, `@robes/analytics` is a closed typed catalogue, the web exposes only
      consent controls through `useAnalytics()`, and `createNativeAnalytics` in
      `mobile/src/lib/analytics.tsx` has **no consumer at all** — no provider is mounted in the
      Expo app. So the in-app camera carries `shortcut:` comments where its two events belong
      (`mobile/src/features/wardrobe/Camera.tsx`), and the web camera doesn't track them either.
      Deliberately not fixed in the parity pass: capturing product events from components is an
      architecture decision across both clients, not a port. Decide before cutover whether the
      new app needs legacy's event coverage on day one — the admin funnel reads these.
- [ ] Re-run the parity pass right before cutover (the founder keeps shipping on legacy until then).

Ask the founders to **freeze new legacy features** from the cutover date minus two weeks, or every
change lands twice. The 16–23 Oct window alone was eight days of work landing twice.

## B. Production environment

- [ ] **Decide**: separate production AWS account (the plan) or production stage in the current
      account (`docs/runbooks/environments.md` §4 step 10 allows it).
- [ ] Production AWS: CDK deploy of all stacks; real secrets (Gemini, Better Auth secret, unsub
      HMAC, database URL, Google/Apple OAuth, CloudFront signing key, fal, Expo); budgets.
- [ ] Production Postgres (EU), `robes_app` login role, PITR on, migrations through
      `platform-deploy-prod` only.
- [ ] Vercel: a real production target for `app.byrobes.com` (today the project's production
      target serves staging); production env vars; `AUTH_TRUSTED_ORIGINS` without `exp://`.
- [ ] **Email (blocks sign-in)**: SES domain `mail.byrobes.com` verified (DKIM + MAIL FROM DNS),
      **SES production access in the production account**, suppression topic wired, inbound MX
      for receipts. Staging's production-access request: submitted 2026-10-23 (sandbox account).
- [ ] DNS records: app, media (CloudFront, ACM cert in us-east-1), mail DKIM, MAIL FROM, inbound MX.
- [ ] Google OAuth production client (redirect URIs exact, no wildcards).
- [ ] PostHog + Sentry production projects; consent gating verified on prod.
- [ ] Legal pages: real Terms and Privacy text (currently "On its way"), covering SES, AWS, Vercel,
      PostHog replay, Gemini.
- [ ] Turnstile + Upstash (rate limiting) configured for production.

## C. Data: moving every user and their wardrobe

- [ ] **Rehearse against a real copy of `Robes_p0`** (a dump restored locally, never prod
      directly): extract → transform → assert. Find duplicate emails (case-insensitive), the real
      volumes, and anything migrations 12–27 added that the catalog doesn't know.
- [x] Extend the catalog/transform for the legacy columns through migration 29: twin url/key (26),
      colour shade / extra colours / print (27), `style_dna.palette`, `brief`/`memory`/`facts`/
      `brands`/`investment`, looks `styling` (24), states/anchor (25), `proposals` (19), size /
      currency / L2 / L3 on wardrobe and wishlist, `notification_prefs`, inbox rows. Material
      (29) lands in the platform's `material` column on wardrobe and wishlist (an id outside the 40
      is dropped). Not carried,
      no platform home: `style_dna.style_archetypes_soft` ("sometimes" types — the platform's
      prompt reads the key but nothing stores it), legacy look `set_id`/`set_index` (warning), the
      twin key (redrawn), `inbox_address` (re-minted), `is_admin` (by hand). `icon_tags` is
      derived from the icons on the platform, so nothing to carry. The fixture can be built from a
      checkout without the legacy SQL with `ROBES_LEGACY_SQL_DIR`.
- [x] The production run is gated (`scripts/migrate/src/db.ts`, tested in
      `test/target-guard.test.ts`): a non-local target needs the admin URL in `TARGET_DATABASE_URL`,
      `--target=production` on the command, and its `user@host` typed into
      `ROBES_MIGRATE_PRODUCTION` (`--target=staging` + `ROBES_MIGRATE_STAGING` for rehearsals); `--target=production` against a local URL refuses; every CLI names
      its target on stderr first; `migrate:reset` on a remote target needs `--confirm-wipe=<user@host>`.
- [ ] **Images**: build the real `rehost` copy (Cloudinary → S3, renditions, flip provider).
      Until it finishes, keep Cloudinary paid and live.
- [x] Legacy share links: render legacy artifact shares at `/share/[token]` (OD-7: live 180 days)
      and build the redirect map (`/look/:id`, `/board/:id`, `/dashboard`, `/wardrobe`,
      `/lookbook`, `/diary`, `/settings`, `/piece/:id`, `/moodboard/:slug`) — `app/src/lib/legacy-redirects.ts`.
      2026-10-26: plus the query deep links `?page=twin`, `?walk=1`, `?chapter=brief`,
      `?account=1`, `?new=1` and the legacy unsubscribe links (`/api/notify/unsub` → You ›
      Notifications); unit-tested and in `e2e/legacy-redirects.spec.ts`.
- [ ] Legacy read-only flag (503 on write routes + banner) in `server.js`. A legacy change, on its
      own branch (platform work never edits legacy files).
- [x] Test `reverse-delta` in rehearsal (it is the rollback path after DNS moves) — covered by
      `scripts/migrate/test/rehearsal.test.ts` on the fixture; rehearse it once more on the real dump.
- [ ] Airtable export into the backups bucket.
- [ ] Not migrated by design (tell users where it matters): events, generation logs, prompt
      history, feedback, avatar cells, **drafts kept only in the browser** (unsaved composer drafts,
      `rb_lk_draft`), per-device preferences.

## D. Users: making sure nobody gets locked out

How sign-in changes:

- Password users sign in with **a 6-digit code emailed to them** (no password migrated, by design).
- Google users sign in with Google as before; the account links by email on first sign-in.
- Apple sign-in arrives with TestFlight (deliberately off until then).
- Everyone is signed out once at cutover (new sessions).

Checklist:

- [ ] SES production access + DNS live **before** cutover (no email = nobody can sign in).
- [ ] Duplicate-email accounts merged by hand before the final run (assert fails otherwise).
- [x] Fix the T-7d email copy in `docs/migration.md` §4: not "same login" but "same email; you'll
      get a code instead of typing a password". (Already reads so in §4; repeated in the release runbook §5.)
- [ ] T-7d email to every beta user (from SES, the new sending domain, so it also warms it up):
      what changes, sign in with your email, your wardrobe and lookbook come with you, save any
      unsaved drafts.
- [x] Installed home-screen app (PWA at `/dashboard`): redirect `/dashboard` → `/` (Today) so the
      icon keeps working (`legacy-redirects.ts`).
- [ ] Admins: `is_admin` is not carried over; grant `app.admin_users` by hand.
- [ ] Support path: a reply-to address that a person reads during the 48h watch.

## E. Go / no-go (the day before)

- [ ] Parity pass clean (A), production green (B), rehearsal on yesterday's dump asserts clean (C).
- [ ] Sign in by code and by Google on production with a test account.
- [ ] A migrated test user sees their wardrobe, looks, diary and shares; photos load.
- [ ] Rollback rehearsed: read-only flag off, DNS back, reverse-delta export.
- [ ] Low-traffic window picked; founders available for 48h.

Then run `docs/migration.md` §4 (read-only → final migrate → rehost → DNS → rotate keys → watch).

## F. After (T+30 days, from `docs/migration.md` §4)

Cancel Cloudinary once rehost is done, archive Airtable, pause `Robes_p0` (keep a dump 90 days),
delete Railway, remove the legacy code in one PR. Update the stale docs that still describe
Resend and Supabase Auth (`infrastructure.md` §1/§2/§11, `security.md` SEC-52/55/61).

## Decisions needed

1. Production AWS: new account or a production stage in the current one?
2. Cutover date, and the legacy feature freeze two weeks before it.
3. Which digital twin and colour model work must be on the new app before cutover vs. soon after.
4. `www.byrobes.com` on day one: the marketing site rebuilt in Next (OD-5), or keep a static page
   and serve the app at `app.byrobes.com`.
