# Runbook — Moving legacy beta data into production

Production (`app.byrobes.com`, its workers and the iPhone app) has been live since November and
beta.byrobes.com was retired on 23 Nov 2026; releasing is `ios-release.md`. What is left of the
cutover is moving legacy beta accounts and their data into production, rotating the legacy keys
and switching the legacy services off. Run by a person with admin access to the Postgres host and
AWS; Claude Code can prepare and check everything that is code. **Robes never deletes her data**:
every step here adds or merges into accounts that already exist (`../migration.md` §4).

- The migration tool and its mapping: [`../migration.md`](../migration.md) §3–5
- Database changes: [`database-migrations.md`](database-migrations.md); restoring: [`restore-pitr.md`](restore-pitr.md)
- Secrets and rotation: [`key-rotation.md`](key-rotation.md)

## 1. Code that must be green first

- [ ] `cd platform && pnpm verify`.
- [ ] The migration rehearsal against the fixture: `pnpm migrate:rehearse` ends with `"ok": true`. On a
      checkout without the legacy `supabase/` folder (`main`), point the fixture at one that has it:
      `ROBES_LEGACY_SQL_DIR=<repo with beta>/supabase pnpm migrate:rehearse`.

## 2. Rehearse on real data [human runs, anyone reads the report]

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

## 3. Test copy on production (any day before the move) [human]

From `../migration.md` §4. Production is real from here: every command below writes it.

1. Pause production's `notify-tick` and `daily-look-batch` schedules (EventBridge Scheduler) so
   migrated users get no email or overnight looks early.
2. Run the copy with all three guards (`scripts/migrate/src/db.ts`): the admin URL, the
   `--target=production` flag on each command, and the target's `user@host` typed into
   `ROBES_MIGRATE_PRODUCTION` (the user carries the Supabase project ref: staging and production
   share the pooler host). Any one missing and the tool refuses before connecting. Rehearse the
   same commands on staging first with `--target=staging` and `ROBES_MIGRATE_STAGING`.
   ```bash
   cd platform
   export LEGACY_DATABASE_URL='<Robes_p0 admin URL>'        # read with SELECT only
   export TARGET_DATABASE_URL='<production admin URL>'      # the migration role, never robes_app
   export ROBES_MIGRATE_PRODUCTION='<user@host from TARGET_DATABASE_URL, typed by hand>'
   pnpm migrate:extract -- --target=production
   pnpm migrate:transform -- --target=production
   pnpm migrate:assert -- --target=production               # exits 1 on any failure
   pnpm migrate:rehost -- --target=production --dry-run
   pnpm migrate:rehost -- --target=production --apply --bucket=<production media bucket>   # admin AWS creds in env
   ```
   Each command prints `robes-migrate → PRODUCTION: <host>/<db>` on stderr before it starts.
3. Sign in on `app.byrobes.com` as the founders' own migrated accounts: wardrobe, looks, diary,
   shares and photos all present.

## 4. The move [human]

T-7 days: the email to every legacy beta user, sent from SES. It says: **same email, but a 6-digit
code instead of a password**; Google unchanged; the wardrobe and lookbook come across; save any
unsaved drafts (they live only in the browser). Name a reply-to that a person reads for 48 h.

Then, in a low-traffic window with the founders available for 48 h:

1. **Legacy read-only**: the legacy server's write routes answer 503 with a banner. *Not built yet*.
2. **The final run, over what is there** (`../migration.md` §4 step 2; `migrate:reset` refuses production):
   ```bash
   pnpm migrate:extract -- --target=production
   pnpm migrate:transform -- --target=production
   pnpm migrate:assert -- --target=production
   ```
   Re-enable the two paused schedules. Keep the `legacy` copy schema for a week as the rollback.
3. **Images**: `pnpm migrate:rehost -- --target=production --apply --bucket=<bucket>`, re-run until
   `failed` is empty. The app shows nothing for a `cloudinary_legacy` asset.
4. **Admins**: grant `app.admin_users` by hand (`is_admin` is not carried).
5. **Rotate** the legacy keys (`key-rotation.md`): Supabase publishable + service keys, the legacy
   Gemini key, Cloudinary, Airtable.
6. **Smoke** as a migrated user (sign in by code, wardrobe, looks, diary, photos) and watch PostHog
   errors, CloudWatch alarms and the SES reputation dashboard for 48 h.

**Rollback**: export what users wrote since the move for re-entry,
`pnpm migrate:reverse-delta -- --target=production --since=<ISO> --out=delta.json`, and turn legacy
writes back on.

## 5. After (T+30 days)

From `../migration.md` §4: cancel Cloudinary once no `cloudinary_legacy` assets remain, archive
Airtable (export to the backups bucket), keep a final dump of the legacy tables for 90 days
(never pause `Robes_p0` itself: it holds production's `app` schema), delete the Railway services, and remove the legacy code in one PR. The legacy path redirects
(`app/src/lib/legacy-redirects.ts`) become permanent then.
