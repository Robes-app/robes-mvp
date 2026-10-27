# Database changes (migrations)

How to change the database safely. Written for whoever runs Claude from this folder: follow it in
order, and stop to ask the owner where it says so.

## When you need one

You need a migration whenever the app must store something new or store it differently: a new
table, a new column, a changed constraint, an index, a backfill. Code alone never changes the
database. Reference data generated from `@robes/core` uses `pnpm --filter @robes/core gen:sql`
instead (CLAUDE.md, rule 4).

## The rules (from CLAUDE.md "Data access and security")

- **Forward-only.** Never edit a migration that has run anywhere (local counts once it is
  committed). Fix a mistake with a new migration.
- **Schema `app`, owned per user.** A new table has `user_id uuid not null references app.users (id)
  on delete cascade`. A child of another user-owned table uses a composite foreign key
  `(parent_id, user_id) references app.parent (id, user_id)`. Add `created_at` and `updated_at`, plus
  `deleted_at` when a row can be soft-deleted and restored, and `select private.track_updates('app.<table>');`.
- **Checks in the database.** Lengths, enums and ranges are `check` constraints, not only zod.
- **No grants by hand.** Default privileges give `robes_app` CRUD on new `app` tables. Functions
  need explicit grants; `security definer` functions set `search_path = ''`.
- **Code only through repositories.** Queries live in `packages/db/src/repos/*` with `UserId` as the
  first argument and a cross-user test; routes never touch Kysely.
- **Personal data is documented in the same PR**: a row in `docs/data-inventory.md`, and the data
  export (`packages/db/src/repos/exports.ts`, SEC-81) includes it. Account deletion is covered by the
  `on delete cascade` to `app.users`.

## Step by step (local)

From `platform/`, with Docker running (`pnpm services:up`):

1. `pnpm db:new <short_name>`: creates `db/migrations/<timestamp>_<short_name>.sql`. Write the SQL
   under `-- migrate:up`. Leave `-- migrate:down` as "Forward-only".
2. `pnpm db:migrate`: applies it to the dev and test databases.
3. `pnpm db:types`: regenerates `packages/db/src/database.types.ts`. Commit it; CI fails on drift.
4. Repository functions plus tests in `packages/db/test` (a schema test for new constraints, and a
   repository test that proves another user can neither read nor change the rows).
5. Contracts (`packages/contracts`), the route (`route()`, `auth`, zod input/output, `rateLimit`),
   then the web and native screens.
6. `pnpm verify` (lint, typecheck, unit and database tests) and
   `pnpm --filter @robes/app test:e2e`. All green before you commit.

Worked example: `db/migrations/20261022204737_day_names.sql` and commit "feat(diary): name any
day…" (table, repository, cross-user and export tests, route, screens, docs).

## Shipping order: migrate first, then deploy

The web app deploys from `beta` (Vercel production branch) and the workers from the AWS stack, so
new code goes live minutes after a merge.

1. Open the PR. CI applies every migration to a fresh Postgres and runs the database tests.
2. Merge. **Staging migrates itself:** the `robes-app` Vercel project's production build runs
   `pnpm db:migrate` before `next build` (preview builds skip it), using the `DATABASE_ADMIN_URL`
   Production env var (the migration role). A failed migration fails the build, so the old
   deployment keeps serving. Check the build log for `node scripts/db-migrate.mjs`.
   `bash scripts/migrate-staging.sh` (from `platform/`, in a real terminal) still works to apply
   migrations by hand ahead of a deploy.
3. **Production:** only through the `platform-deploy-prod` workflow (manual, a reviewer approves).
   It migrates, then deploys. Ask the owner first; never run production migrations from a laptop.

The migration runs while the previous deployment is still live, and the phone app stays on
whatever version people have installed (App Store review, and some never update). So every
migration must work with the old code too, as below.

Why this matters (2026-10-24): the `material` migration was pushed but never applied, the new code
deployed anyway, and staging's home page failed with `column w.material does not exist` until the
migration ran.

### Keep each step safe on its own

Write migrations so the old code still works after they run (staging and production both run old
code for a few minutes):

- Add, don't rename. To rename or reshape a column, add the new one, write both, backfill, move
  readers, and drop the old one in a later migration.
- A new `not null` column needs a default, or a backfill in the same migration.
- New code treats a new column as possibly empty (old rows are, and an old phone app never fills
  it). `material` is the model: null renders as the empty "Add" row.
- Drop a column only once no app version still in use reads it: weeks for the phone app.
- Big backfills and new indexes on large tables: ask the owner first (they lock tables).

## If something goes wrong

- A migration fails part-way on staging: dbmate runs each file in a transaction, so nothing is half
  applied. Read the error, write a fixed migration (new file), and re-run.
- Wrong data was written: restore from point-in-time recovery (`docs/runbooks/restore-pitr.md`).
  Ask the owner before touching production.
