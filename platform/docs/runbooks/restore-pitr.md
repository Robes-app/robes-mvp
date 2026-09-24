# Runbook — Restore from PITR

Use when data was corrupted or deleted (bad migration, bug, operator error). Production has Supabase PITR (≥ 7 days); media has S3 versioning (noncurrent kept 30 days).

## 0. Decide

1. Declare an incident; one person drives. Note the **last known good time** in UTC (check `updated_at`, audit logs, deploy times).
2. Stop the bleeding: enable the kill switch for affected features (`kill-switch.md`) and, if a deploy caused it, pause the deploy workflow and roll back Vercel (Deployments → previous → **Instant Rollback**).
3. Choose: **in-place PITR** (whole database goes back; writes after that time are lost) or **restore to a new project** and copy selected rows back (preferred when only some tables/users are affected).

## 1. Restore to a new project (surgical, preferred)

1. Supabase dashboard (production) → Database → Backups → Point in time → **Restore to a new project**, target time = last known good; name `robes-prod-restore-<date>`.
2. When ready, export just the rows you need from the restore:
   ```bash
   psql "$RESTORE_URL" -c "\copy (select * from app.<table> where user_id in (...)) to 'fix.csv' csv header"
   ```
3. Review the rows, then load them into production in one transaction as `postgres` (upsert via a temp table so existing rows are replaced, not duplicated):
   ```bash
   psql "$PROD_URL" -v ON_ERROR_STOP=1 -1 -f - <<'SQL'
   create temp table fix (like app.<table>);
   \copy fix from 'fix.csv' csv header
   insert into app.<table> select * from fix
     on conflict (id) do update set (<cols>) = (excluded.<cols>);
   SQL
   ```
4. Delete the restore project when done (it bills).

## 2. In-place PITR (whole database)

1. Announce downtime; set Vercel maintenance (kill switches or a maintenance flag) so no writes race the restore.
2. Dashboard → Database → Backups → Point in time → pick time → **Restore**. The project is unavailable during restore (minutes to hours by size).
3. After restore: migrations applied after the target time are gone. Re-run `pnpm supabase db push` from the deploy workflow (or laptop) so the schema matches `main`.
4. The `robes_app` password and any auth keys rotated after the target time revert — re-apply per `key-rotation.md`.
5. Re-enqueue stuck jobs: the `job-sweeper` schedule re-enqueues `queued` jobs automatically; jobs `running` at the target time are re-leased when their lease expires.

## 3. Media (S3)

Deleted or overwritten objects are recoverable for 30 days via versions:

```bash
aws s3api list-object-versions --bucket robes-prod-media --prefix media/<userId>/ \
  --query 'DeleteMarkers[?IsLatest].[Key,VersionId]' --output text |
while read -r key vid; do
  aws s3api delete-object --bucket robes-prod-media --key "$key" --version-id "$vid"   # removes the delete marker
done
```

Then invalidate CloudFront for the paths: `aws cloudfront create-invalidation --distribution-id <id> --paths '/media/<userId>/*'`.

## 4. Close

1. Verify: health, sign-in, a generation, affected users' data.
2. Lift kill switches; write the incident note (timeline, data lost, follow-ups); add a test or guard that would have caught it.
