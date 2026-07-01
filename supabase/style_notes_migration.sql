-- ============================================================
-- Style Notes columns on profiles — run once in Supabase SQL editor.
-- Backward-compatible: existing rows get NULLs, RLS is inherited.
-- ============================================================

alter table public.profiles add column if not exists season             text;
alter table public.profiles add column if not exists undertone          text;
alter table public.profiles add column if not exists contrast           text;
alter table public.profiles add column if not exists body_type          text;
alter table public.profiles add column if not exists splurge_categories text[] default '{}';
alter table public.profiles add column if not exists annual_spend       text;
alter table public.profiles add column if not exists headshot_url       text;
alter table public.profiles add column if not exists full_length_url    text;
