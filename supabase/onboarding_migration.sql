-- Onboarding flow — run once in Supabase SQL editor.
-- Adds the first-time-user flag the dashboard boot checks before
-- redirecting to /onboarding. Existing users are backfilled so only
-- accounts created after this migration see the flow.

alter table public.profiles
  add column if not exists onboarded_at timestamptz;

update public.profiles
  set onboarded_at = coalesce(created_at, now())
  where onboarded_at is null;
