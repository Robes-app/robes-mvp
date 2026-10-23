# Cutover readiness: swapping byrobes.com to the new app

Status: draft, 2026-10-23. Owner: Niall. This is the checklist that gets us from "the new app works on
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

Last parity pass was 2026-10-15 (`docs/STATUS.md`). New legacy work since, in build order:

- [ ] **Prompt hierarchy**: her hard nos first and absolute; brief outranks photo reads; struck
      observations never rendered (`packages/core/src/style-dna/prompt.ts`). S–M.
- [ ] **Quick ones** (S each): Observations verbs "That's right / Not quite" + un-keep ×, wardrobe
      read paused; high-street brands in the brand pool (M&S, & Other Stories, Mango, Dunnes,
      Penneys); Save opens the diary sheet; the scanner line while a look generates.
- [ ] **"Where should the pieces come from?"** (All mine · A mix · Suggest new pieces) + `recent`
      sets so a second ask is a second answer + starred pieces as taste; then the balance answer
      overriding the owned-first rules. L, then S. Fixes "it shows me the same clothes again".
- [ ] **Front door**: swap on a suggested look without Edit (M); three generic models + the
      "Generic model" badge (M); week strip from the first saved look (S–M, needs the modular home).
- [ ] **Onboarding multi-piece pick** ("Robes sees N pieces · Which one first?"), reusing
      `wardrobe-pieces`. M.
- [ ] **Digital twin**: one reference image per account (face from the close-up, line from the
      facts); migration for twin url/key; then the redlined twin screens. L + M.
- [ ] **Colour model** phases 1 → 2 → 3/4: shade list + analyse output + migration for
      shade/extra colours/print; piece sheet + Refine by family; add-flow doors + Your colours /
      Your prints with soft avoid. M, L, L.
- [ ] **Design-system doc**: selected = warm `#F3EFE6` / `#C9BCA6`; never a count as a fraction.
- [ ] Re-run the parity pass right before cutover (the founder keeps shipping on legacy until then).

Ask the founders to **freeze new legacy features** from the cutover date minus two weeks, or every
change lands twice.

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
- [ ] Extend the catalog/transform for this week's legacy columns: twin url/key (26), colour
      shade / extra colours / print (27), `style_dna.palette`, `style_dna.brief`/`memory` changes.
- [ ] Decide how the production run is allowed: `scripts/migrate/src/db.ts` refuses non-local
      databases by design. Proposal: a `--target production` flag that requires the admin URL from
      an env var plus a typed confirmation, run only from the cutover checklist.
- [ ] **Images**: build the real `rehost` copy (Cloudinary → S3, renditions, flip provider).
      Until it finishes, keep Cloudinary paid and live.
- [x] Legacy share links: render legacy artifact shares at `/share/[token]` (OD-7: live 180 days)
      and build the redirect map (`/look/:id`, `/board/:id`, `/dashboard`, `/wardrobe`,
      `/lookbook`, `/diary`, `/settings`, `/piece/:id`, `/moodboard/:slug`) — `app/src/lib/legacy-redirects.ts`.
- [ ] Legacy read-only flag (503 on write routes + banner) in `server.js`.
- [ ] Test `reverse-delta` in rehearsal (it is the rollback path after DNS moves).
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
- [ ] Fix the T-7d email copy in `docs/migration.md` §4: not "same login" but "same email; you'll
      get a code instead of typing a password".
- [ ] T-7d email to every beta user (from SES, the new sending domain, so it also warms it up):
      what changes, sign in with your email, your wardrobe and lookbook come with you, save any
      unsaved drafts.
- [ ] Installed home-screen app (PWA at `/dashboard`): redirect `/dashboard` → `/today` so the
      icon keeps working.
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
