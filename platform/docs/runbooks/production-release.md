# Runbook — Production release and cutover from beta

The ordered steps that create production for the new app and move every beta user onto it. Run
by a person with admin access to AWS, Vercel, the Postgres host, Google Cloud and DNS for
`byrobes.com`. Claude Code can prepare and check everything that is code; every step marked
**[human]** needs credentials or a decision that only an owner has.

This page is the order of play. The detail lives in the runbooks it links: don't copy values or
commands out of them, follow them in place.

- Environments, IDs, secrets, DNS for SES: [`environments.md`](environments.md)
- Rebuilding an environment from nothing: [`recreate-environment.md`](recreate-environment.md)
- Database changes and the production migration path: [`database-migrations.md`](database-migrations.md)
- Secrets and rotation: [`key-rotation.md`](key-rotation.md)
- Turning a feature off fast: [`kill-switch.md`](kill-switch.md)
- Restoring data: [`restore-pitr.md`](restore-pitr.md)
- The migration tool and its mapping: [`../migration.md`](../migration.md) §3–5
- What has to be true first: [`../plans/2026-10-23-cutover-readiness.md`](../plans/2026-10-23-cutover-readiness.md)

## 0. Decisions to take before anything is built [human]

1. **Production AWS account**: a separate `robes-prod` account (the plan, `environments.md` §4
   step 1) or the production stage in the shared account `259887029472` (§4 step 10 allows it).
2. **Production database**: `../migration.md` §4 records that production's schema `app` lives in
   the legacy Supabase project `Robes_p0` (so the migration source and target are one database,
   and the copy is set-based inside it). Confirm that, or name another EU host with PITR.
3. **Domains on day one**: the app at `app.byrobes.com`; whether `www.byrobes.com` becomes the
   rebuilt marketing site (OD-5) or keeps a static page; `beta.byrobes.com` redirects to `app.`.
4. **Cutover date** and the legacy feature freeze two weeks before it.
5. **Her rejected colours** (soft avoid on the platform, a hard no on beta, `30d7ea5`): Annie's call.
6. **Product events**: whether the new app needs legacy's `_rbTrack` coverage on day one.

## 1. Code that must be green on the release commit

Done in the repo, by anyone (Claude included). On the commit you mean to release:

- [ ] `cd platform && pnpm verify` (lint, typecheck, unit tests, database tests).
- [ ] `pnpm --filter @robes/app build` with the CI env (`.github/workflows/platform-ci.yml`), and
      `pnpm --filter @robes/app test:e2e` (CI runs both on every PR into `platform/**`).
- [ ] The migration rehearsal against the fixture: `pnpm migrate:rehearse` ends with
      `"ok": true`. On a checkout without the legacy `supabase/` folder (the `main` branch), point
      the fixture at one that has it: `ROBES_LEGACY_SQL_DIR=<repo with beta>/supabase pnpm migrate:rehearse`.
- [ ] The parity pass is re-run against beta (cutover-readiness §A, last item).

## 2. Create production [human]

Follow [`environments.md`](environments.md) top to bottom for `production`, filling its §1 ID
register as you go. In order:

1. **Postgres** (§2): PITR on, the migration role and `robes_app` logins, `MIGRATION_DATABASE_URL`
   into the GitHub `production` environment secret, `DATABASE_URL` into Vercel and Secrets Manager.
2. **AWS** (§4): account, Lambda concurrency quota (or `ROBES_PRODUCTION_GENERATE_RESERVED_CONCURRENCY=0`),
   CDK bootstrap, media certificate in us-east-1, CloudFront key pair, first `cdk deploy
   'Production/*' -c stage=production` from a laptop (`cdk diff` first), every secret value under
   `robes-prod/` (database url, Better Auth secret, Apple, Google, Gemini, CloudFront signing key,
   fal, Expo token, unsub HMAC key). Budgets (§4 step 10: from the payer account if this is a member).
3. **SES** (§9): domain `mail.byrobes.com` verified, DKIM + MAIL FROM + DMARC records live,
   **production access requested and granted in the production account**. No SES = no sign-in
   codes = nobody can sign in. Inbound MX for `in.mail.byrobes.com` and the active receipt rule set
   (one active set per account and region: decide if staging shares the account).
4. **Better Auth** (§3): production secret, `BETTER_AUTH_URL=https://app.byrobes.com`, Google
   production OAuth client with exact redirect URIs. Apple stays off until TestFlight.
5. **Gemini** (§10): production key restricted to the Generative Language API, budget and quotas.
6. **Upstash** (§8) and **Turnstile** keys.
7. **PostHog** (§11): authorized URLs include `app.byrobes.com`; consent gating checked on prod.
8. **GitHub** (§5): the `production` environment with a required reviewer and its variables
   (`AWS_ACCOUNT_ID`, `AWS_DEPLOY_ROLE_ARN`, `APP_URL=https://app.byrobes.com`, `MEDIA_DOMAIN`,
   `MEDIA_CERT_ARN`, alert/budget emails) and the `MIGRATION_DATABASE_URL` secret.
9. **Vercel** (§6): a real production target on `app.byrobes.com` (today the project's production
   target serves staging — move staging to a Preview branch domain first), every variable in the
   §6 table for production, the API user's access key (§6 step 8), `AUTH_TRUSTED_ORIGINS` without
   `exp://`, spend cap.
10. **DNS** (no user-facing records yet): `media.byrobes.com` → the CloudFront output, the SES
    DKIM/MAIL FROM/DMARC records, the inbound MX. Keep `app.byrobes.com` private (Vercel
    deployment protection or no DNS) until T-0.
11. **Legal**: real Terms and Privacy text in the app (currently "On its way"), naming SES, AWS,
    Vercel, PostHog replay and Gemini.

Then deploy through CI only: run the **`platform-deploy-prod`** workflow (manual, the reviewer
approves). It migrates with the migration role, deploys `Production/*`, and smoke-tests
`$APP_URL/api/v1/health`.

### Prove production before any user is on it [human]

- [ ] `/api/v1/health` returns `{"ok":true}`.
- [ ] Sign in by emailed code and by Google with a test account.
- [ ] **Upload a photo and poll `GET /api/v1/assets/:id` until `ready`**, then make a look from a
      photo end to end. The health check stays green while the rendition pipeline is dead (this is
      exactly what broke staging, cutover-readiness §0): check the `rendition` CloudWatch logs and
      the rendition DLQ depth.
- [ ] A generation runs end to end and its notification email arrives.
- [ ] CloudWatch alarms `OK`, the SNS alert subscription confirmed, budgets present.

## 3. Rehearse on real data [human runs, anyone reads the report]

Never against `Robes_p0` directly. Restore a dump of it to a local Postgres:

```bash
pg_dump --format=custom --no-owner "$ROBES_P0_READONLY_URL" > robes_p0.dump   # read-only creds
createdb -h 127.0.0.1 -p 55432 -U postgres robes_p0_copy
pg_restore --no-owner -h 127.0.0.1 -p 55432 -U postgres -d robes_p0_copy robes_p0.dump
cd platform
LEGACY_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:55432/robes_p0_copy pnpm migrate:rehearse
```

Read the report:
- `extracted.missing` lists legacy columns the real database lacks (a migration that never ran).
- `assert.failures` must be empty. The usual one is **two accounts with one email**: merge them in
  the legacy app by hand, re-dump, re-run.
- `assert.warnings` to review: legacy admins (grant `app.admin_users` by hand later), `times_worn`
  above recorded wears, bust/waist out of range, unknown colours, suggestions without their set.
- Repeat until the gate is clean **twice in a row**, the last one on the day before T-0.

Also rehearse rollback once: `pnpm migrate:reverse-delta -- --since=<ISO>` against the rehearsal
target after making a test look in it.

## 4. Test copy on production (any day before T-0) [human]

From `../migration.md` §4. Production is real from here: every command below writes it.

1. Pause production's `notify-tick` and `daily-look-batch` schedules (EventBridge Scheduler) so
   migrated users get no email or overnight looks early.
2. Run the copy with all three guards (`scripts/migrate/src/db.ts`): the admin URL, the
   `--target=production` flag on each command, and the target's exact host typed into
   `ROBES_MIGRATE_PRODUCTION`. Any one missing and the tool refuses before connecting.
   ```bash
   cd platform
   export LEGACY_DATABASE_URL='<Robes_p0 admin URL>'        # read with SELECT only
   export TARGET_DATABASE_URL='<production admin URL>'      # the migration role, never robes_app
   export ROBES_MIGRATE_PRODUCTION='<the host in TARGET_DATABASE_URL, typed by hand>'
   pnpm migrate:extract -- --target=production
   pnpm migrate:transform -- --target=production
   pnpm migrate:assert -- --target=production               # exits 1 on any failure
   pnpm migrate:rehost -- --target=production --dry-run
   pnpm migrate:rehost -- --target=production --apply --bucket=<production media bucket>   # admin AWS creds in env
   ```
   Each command prints `robes-migrate → PRODUCTION: <host>/<db>` on stderr before it starts.
3. Sign in on `app.byrobes.com` as the founders' own migrated accounts: wardrobe, looks, diary,
   shares and photos all present.

## 5. Cutover day (T-0) [human]

T-7 days: the email to every beta user, sent from SES on the new domain (it also warms it up).
The copy says: **same email, but a 6-digit code instead of a password**; Google unchanged; the
wardrobe and lookbook come across; save any unsaved drafts (they live only in the browser).
Name a reply-to that a person reads during the 48 h watch.

Then, in a low-traffic window with the founders available for 48 h:

1. **Legacy read-only**: the legacy server's write routes answer 503 with a banner. *Not built yet*
   — a small legacy change on `beta`/`main` (cutover-readiness §C).
2. **Wipe the test copy, then the final run** (from `../migration.md` §4 step 2):
   ```bash
   pnpm migrate:reset -- --target=production --confirm-wipe=<host>   # the host typed again
   pnpm migrate:extract -- --target=production
   pnpm migrate:transform -- --target=production
   pnpm migrate:assert -- --target=production
   ```
   On a remote target `migrate:reset` refuses a bare `--confirm-wipe`; it needs the host.
   Re-enable the two paused schedules. Drop the `legacy` copy schema once assert passes.
3. **Images**: `pnpm migrate:rehost -- --target=production --apply --bucket=<bucket>`, re-run until
   `failed` is empty. The app shows nothing for a `cloudinary_legacy` asset, so this is before DNS.
4. **Admins**: grant `app.admin_users` by hand (`is_admin` is not carried).
5. **DNS**: `app.byrobes.com` public; `beta.byrobes.com` and `www.byrobes.com` → Vercel per
   decision 0.3. The redirects in `app/src/lib/legacy-redirects.ts` take over every beta path
   (`/dashboard`, `/wardrobe`, `/wishlist`, `/lookbook`, `/inspiration`, `/diary`, `/calendar`,
   `/settings`, `/stylenotes`, `/board/:id`, `/moodboard/:slug`, `/signup`, `/reset`, `/terms`,
   `/privacy`, the legacy unsubscribe links, and the query deep links `?d=`, `?open=`,
   `?receipts=1`, `?walk=1`, `?page=twin`, `?chapter=brief`, `?account=1`, `?new=1`). They are 307
   until rollback is no longer possible; make them permanent then.
6. **Rotate** the legacy keys (`key-rotation.md`): Supabase publishable + service keys, the legacy
   Gemini key, Cloudinary, Airtable.
7. **Smoke** (§2 "Prove production" again, as a migrated user) and watch PostHog errors,
   CloudWatch alarms and the SES reputation dashboard for 48 h.

## 6. Rollback

- Before DNS (step 5): turn the legacy read-only flag off. Nothing else changed for users.
- After DNS: point DNS back, turn legacy writes back on, and export what users wrote on the new
  app since T-0 for re-entry: `pnpm migrate:reverse-delta -- --target=production --since=<T-0 ISO> --out=delta.json`.

## 7. Go / no-go (the day before) [human]

Go only if every line is true:

- [ ] §1 green on the release commit; parity pass clean.
- [ ] Production proved (§2): code and Google sign-in, a photo reaches `ready`, a generation and
      its email work, alarms `OK`.
- [ ] SES production access granted; DKIM, MAIL FROM and DMARC verified; bounce < 2 %.
- [ ] Rehearsal on yesterday's dump asserts clean (§3), the second clean run in a row.
- [ ] Duplicate-email accounts merged; the test copy on production checked by the founders (§4).
- [ ] Legacy read-only flag built and tested on beta; rollback rehearsed (flag off, DNS back,
      reverse-delta export).
- [ ] Real Terms and Privacy live; the T-7 email sent; a person on the reply-to address.
- [ ] Low-traffic window picked; founders available for 48 h.

## 8. After (T+30 days)

From `../migration.md` §4: cancel Cloudinary once no `cloudinary_legacy` assets remain, archive
Airtable (export to the backups bucket), pause `Robes_p0` and keep a final dump 90 days, delete
the Railway services, remove the legacy code in one PR, make the legacy redirects permanent.
