# Runbook — Restore from PITR

Use when data was corrupted or deleted (bad migration, bug, operator error). Production Postgres has point-in-time recovery (≥ 7 days) on whichever managed host we run (ADR-020); media has S3 versioning (noncurrent versions kept 30 days).

## 0. Decide

1. Declare an incident; one person drives. Note the **last known good time** in UTC (check `updated_at`, audit rows, deploy times).
2. Stop the bleeding: kill-switch the affected features (`kill-switch.md`). If a deploy caused it, pause the deploy workflow and roll Vercel back (Deployments → previous → **Instant Rollback**). If a migration caused it, do not run `db:migrate` again until fixed.
3. Choose: **restore to a new instance** and copy selected rows back (preferred when only some tables/users are affected), or **replace the database** (everything goes back; writes after that time are lost).

## 1. Create a PITR copy (host-specific, all non-destructive)

| Host | How |
|---|---|
| Neon | Console → Branches → **Create branch** from `main` at a timestamp (or `neonctl branches create --parent main --parent-timestamp <ISO>`). |
| RDS | `aws rds restore-db-instance-to-point-in-time --source-db-instance-identifier robes-prod --target-db-instance-identifier robes-prod-restore --restore-time <ISO>` (Aurora: `restore-db-cluster-to-point-in-time`). |
| Supabase (DB-only) | Dashboard → Database → Backups → Point in time → **Restore to a new project**. |

Call its connection string `RESTORE_URL` (admin user, `sslmode=require`).

## 2. Surgical restore (preferred)

1. Export just the rows you need:
   ```bash
   psql "$RESTORE_URL" -c "\copy (select * from app.<table> where user_id in (...)) to 'fix.csv' csv header"
   ```
2. Review them, then load into production in one transaction as the migration/admin role (upsert through a temp table so existing rows are replaced, not duplicated):
   ```bash
   psql "$PROD_ADMIN_URL" -v ON_ERROR_STOP=1 -1 -f - <<'SQL'
   create temp table fix (like app.<table>);
   \copy fix from 'fix.csv' csv header
   insert into app.<table> select * from fix
     on conflict (id) do update set (<cols>) = (excluded.<cols>);
   SQL
   ```
3. Delete the restore copy when done (it bills). `shred -u fix.csv`.

## 3. Replace the database (whole-database rollback)

1. Kill-switch writes (or all paid features plus sign-in) so nothing races the switch-over.
2. Promote the PITR copy:
   - Neon: make the restored branch the primary (or `neonctl branches restore main ^self@<ISO>` in place).
   - RDS: rename the old instance, rename the restore to `robes-prod` (or point the URLs at the new endpoint).
   - Supabase: in-place PITR from the dashboard (project unavailable during restore).
3. Point `DATABASE_URL` (Vercel + `robes-<env>/database/url`, then cold-start Lambdas) and GitHub `MIGRATION_DATABASE_URL` at the new endpoint if it changed.
4. Roles and passwords restored with the snapshot may be older than the current ones: re-apply `robes_app` and migration-role passwords (`key-rotation.md`).
5. Migrations applied after the restore time are gone: rerun the deploy workflow (it runs `pnpm db:migrate`).
6. Jobs: `queued` jobs are re-enqueued by the `job-sweeper` schedule; `running` jobs are re-leased when their lease expires. Sessions created after the restore time are lost; those users sign in again.

## 4. Media (S3)

Deleted or overwritten objects are recoverable for 30 days via versions:

```bash
aws s3api list-object-versions --bucket robes-prod-media --prefix media/<userId>/ \
  --query 'DeleteMarkers[?IsLatest].[Key,VersionId]' --output text |
while read -r key vid; do
  aws s3api delete-object --bucket robes-prod-media --key "$key" --version-id "$vid"   # removes the delete marker
done
aws cloudfront create-invalidation --distribution-id <id> --paths '/media/<userId>/*'
```

## 5. Close

1. Verify: health, sign-in (OTP, Apple, Google), a generation, the affected users' data.
2. Lift kill switches; write the incident note (timeline, data lost, follow-ups); add a test or guard that would have caught it.
