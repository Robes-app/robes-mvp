-- ============================================================
-- Robes — migration 23: the receipt inbox + price / size on a piece
-- Run once in the Supabase SQL editor (after migration 10 — price — and
-- migration 11 — is_admin()). Every statement is additive and
-- idempotent — safe to run while the pre-migration code is live on
-- production AND beta (shared project).
--
-- Adds:
--   wishlist_items.size / currency / category_l2 / category_l3 — the
--     wishlist takes the same doors, so it carries the same metadata.
--   wardrobe_items.size / currency — the two fields the add form now
--     carries under Tags (price already exists, migration 10). A
--     photograph rarely shows them; a receipt or a product page does.
--   profiles.inbox_address — the local part of her Robes address
--     (<inbox_address>@in.byrobes.com), minted by the client the first
--     time she opens "Forward a receipt". Unique across the project.
--   wardrobe_inbox — one row per forwarded receipt Robes has read: the
--     pieces it found (jsonb, already in the analyse shape, images
--     hosted at read time) and a status she moves — held → filed /
--     dismissed. Written ONLY by the server (service key) from the
--     inbound webhook; own-read / own-update / own-delete + admin-read.
--     Nothing is filed into wardrobe_items until she has been through it.
--
-- Until this runs: the form's price / size save-strips on PGRST204, the
-- receipt door tells her the inbox isn't switched on yet (no address is
-- minted), the wardrobe page shows no waiting receipts, and the webhook
-- answers lookup_failed to every mail.
-- ============================================================

alter table public.wardrobe_items add column if not exists size text;
alter table public.wardrobe_items add column if not exists currency text;
alter table public.wardrobe_items add column if not exists price numeric(10,2);

-- The wishlist takes the same four ways in (2026-09-22), so it carries the
-- same metadata: size / currency beside its existing price, and the
-- taxonomy pair a link or a receipt reads.
alter table public.wishlist_items add column if not exists size text;
alter table public.wishlist_items add column if not exists currency text;
alter table public.wishlist_items add column if not exists category_l2 text;
alter table public.wishlist_items add column if not exists category_l3 text;

alter table public.profiles add column if not exists inbox_address text;
create unique index if not exists profiles_inbox_address_key on public.profiles (inbox_address) where inbox_address is not null;

create table if not exists public.wardrobe_inbox (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  source       text not null default 'receipt',   -- receipt (the only source today)
  retailer     text,
  order_ref    text,
  subject      text,
  from_email   text,
  provider_id  text,                                -- the mail provider's message id, for the log
  items        jsonb not null default '[]'::jsonb,  -- [{label, category, category_l2, category_l3, color, brand, price, currency, size, image_url, quantity, returned, item_dna}]
  status       text not null default 'held' check (status in ('held', 'filed', 'dismissed')),
  filed_ids    jsonb,                               -- the wardrobe_items / wishlist_items ids she filed from it
  filed_to     text,                                -- 'wardrobe' | 'wishlist' — where those ids live
  received_at  timestamptz not null default now(),
  decided_at   timestamptz
);
create index if not exists wardrobe_inbox_user_idx on public.wardrobe_inbox (user_id, status, received_at desc);

alter table public.wardrobe_inbox enable row level security;
drop policy if exists wardrobe_inbox_own_read on public.wardrobe_inbox;
create policy wardrobe_inbox_own_read on public.wardrobe_inbox
  for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists wardrobe_inbox_own_update on public.wardrobe_inbox;
create policy wardrobe_inbox_own_update on public.wardrobe_inbox
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists wardrobe_inbox_own_delete on public.wardrobe_inbox;
create policy wardrobe_inbox_own_delete on public.wardrobe_inbox
  for delete using (auth.uid() = user_id);
-- No insert policy: only the server's service key writes a receipt.

-- ── rollback (never run by default) ──────────────────────────
-- drop table if exists public.wardrobe_inbox;
-- drop index if exists public.profiles_inbox_address_key;
-- alter table public.profiles drop column if exists inbox_address;
-- alter table public.wardrobe_items drop column if exists size;
-- alter table public.wardrobe_items drop column if exists currency;
