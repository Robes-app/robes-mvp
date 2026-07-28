-- Migration 13 — gender identity on profiles (2026-07-28)
-- "How do you identify?" in Account details: 'woman' | 'man' | 'unspecified'
-- ('unspecified' = "Prefer not to say"). Every new signup defaults to 'woman'
-- (the column default covers the handle_new_user trigger insert) and the
-- default also backfills every existing row on ADD COLUMN.
-- Run once in the Supabase SQL editor on Robes_p0.

alter table public.profiles
  add column if not exists gender_identity text not null default 'woman';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_gender_identity_check'
  ) then
    alter table public.profiles
      add constraint profiles_gender_identity_check
      check (gender_identity in ('woman', 'man', 'unspecified'));
  end if;
end $$;
