-- ============================================================
-- Robes — migration 22: the re-engagement channel (funnel slice 6)
-- Run once in the Supabase SQL editor (after migration 11 — is_admin()).
-- Every statement is additive and idempotent — safe to run while the
-- pre-migration code is live on production AND beta (shared project).
--
-- Adds:
--   profiles.notification_prefs — her email choices, one jsonb:
--     { looks_ready: bool, nudges: bool, morning: bool,
--       morning_hour: 6..10, timezone: 'Europe/Dublin' }
--     Missing keys read as: looks_ready TRUE (transactional — she asked
--     for the looks), nudges NULL (not asked yet — nothing sends),
--     morning FALSE (opt-in only, set from Account details alone).
--   notifications — the idempotency ledger: one row per mail, written
--     BEFORE the send with the service key; unique (user_id, kind, ref)
--     is what makes a re-tick, a restart, or two Railway services
--     sharing the project harmless. Own-read + admin-read RLS; no
--     client insert policy — only the server writes here.
--
-- Until this runs: the client's timezone write hits PGRST204 and the
-- whole slice stands down client-side (no ask, no Emails section); the
-- server's tick finds no prefs column and sends nothing.
-- ============================================================

alter table public.profiles
  add column if not exists notification_prefs jsonb not null default '{}'::jsonb;

create table if not exists public.notifications (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users(id) on delete cascade,
  kind     text not null,   -- looks_ready | look_waiting | borrowing | five | week_empty | morning
  ref      text not null,   -- the item / look id, the ISO week, or the local date the mail is about
  sent_at  timestamptz not null default now(),
  unique (user_id, kind, ref)
);
create index if not exists notifications_user_idx on public.notifications(user_id, sent_at desc);
create index if not exists notifications_kind_idx on public.notifications(kind, sent_at desc);

alter table public.notifications enable row level security;
drop policy if exists notifications_own_read on public.notifications;
create policy notifications_own_read on public.notifications
  for select using (auth.uid() = user_id);
drop policy if exists notifications_admin_read on public.notifications;
create policy notifications_admin_read on public.notifications
  for select using (public.is_admin());

-- ── rollback (never run as part of the migration) ─────────────
-- drop table if exists public.notifications;
-- alter table public.profiles drop column if exists notification_prefs;
