-- Weekly-plan sweep (ADR-001, 2026-08-08) — run once in the Supabase SQL
-- editor after deploying the weekly-track removal. Optional but recommended:
-- the client performs the same sweep lazily per user at boot (_lbCloudPull in
-- dashboard-personalize.js), so this file just settles every account at once —
-- including users who never open the app again.
--
-- What it does (option A, "sweep"):
--   1. Deletes every planned_days row a weekly plan emitted
--      (source_type = 'weekly') — the calendar index only; blobs untouched.
--   2. ARCHIVES (soft-deletes) weekly-plan lookbook artifacts by flipping
--      their type to 'weekly-plan-archived'. The wkData blob stays in the
--      data jsonb, fully recoverable; no client surface reads or renders
--      the archived type.
--
-- Safe to re-run: both statements are idempotent.

delete from public.planned_days where source_type = 'weekly';

update public.lookbook_items
   set type = 'weekly-plan-archived'
 where type = 'weekly-plan';

-- Verify: both counts should be 0.
select
  (select count(*) from public.planned_days where source_type = 'weekly') as weekly_planned_days,
  (select count(*) from public.lookbook_items where type = 'weekly-plan') as weekly_plan_artifacts;
