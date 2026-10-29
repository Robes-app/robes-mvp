-- 30 · Non-binary as a gender (Annie, 2026-10-29).
-- profiles.gender_identity gains 'non_binary' beside 'woman', 'man' and
-- 'unspecified' (migration 13). Styled across menswear and womenswear,
-- they/them; the figure's catalog stays the woman's, as for 'unspecified'.
-- Idempotent: safe to paste twice. Client degrade: until this runs,
-- Settings saves 'unspecified' when the check refuses 'non_binary'.
alter table public.profiles drop constraint if exists profiles_gender_identity_check;
alter table public.profiles
  add constraint profiles_gender_identity_check
  check (gender_identity in ('woman', 'man', 'unspecified', 'non_binary'));

-- Rollback (only once no row holds 'non_binary'):
-- update public.profiles set gender_identity = 'unspecified' where gender_identity = 'non_binary';
-- alter table public.profiles drop constraint if exists profiles_gender_identity_check;
-- alter table public.profiles add constraint profiles_gender_identity_check
--   check (gender_identity in ('woman', 'man', 'unspecified'));
