-- ─────────────────────────────────────────────────────────────────
-- Migration 28 — admins can read saved Looks (2026-10-24)
--
-- looks / look_pieces / wears (migration 14) only ever had own-row
-- policies, so /admin could not see a user's saved looks, what they
-- hold, or when they were worn. This adds one admin-read SELECT policy
-- per table, the same shape migration 11 gave every other table.
--
-- Read-only for admins: no insert / update / delete policy is added.
-- Requires migration 11 (public.is_admin()) and migration 14.
-- Idempotent — safe to re-run. Rollback block at the foot.
-- ─────────────────────────────────────────────────────────────────

do $$
begin
  if to_regprocedure('public.is_admin()') is null then
    raise exception 'public.is_admin() not found — run supabase/admin_capture_migration.sql (migration 11) first.';
  end if;
  if to_regclass('public.looks') is null or to_regclass('public.look_pieces') is null or to_regclass('public.wears') is null then
    raise exception 'looks / look_pieces / wears not found — run supabase/looks_migration.sql (migration 14) first.';
  end if;

  execute 'drop policy if exists looks_admin_read on public.looks';
  execute 'create policy looks_admin_read on public.looks for select using (public.is_admin())';

  execute 'drop policy if exists look_pieces_admin_read on public.look_pieces';
  execute 'create policy look_pieces_admin_read on public.look_pieces for select using (public.is_admin())';

  execute 'drop policy if exists wears_admin_read on public.wears';
  execute 'create policy wears_admin_read on public.wears for select using (public.is_admin())';
end $$;

-- Check: three rows, one per table.
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and policyname in ('looks_admin_read', 'look_pieces_admin_read', 'wears_admin_read')
order by tablename;

-- ── Rollback ─────────────────────────────────────────────────────
-- drop policy if exists looks_admin_read on public.looks;
-- drop policy if exists look_pieces_admin_read on public.look_pieces;
-- drop policy if exists wears_admin_read on public.wears;
