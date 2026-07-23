-- Migration 12 — planned_days: the dated-day index over the lookbook blobs
-- (22 Jul brief §4, with the 23 Jul Diary handoff §0.2 amendments folded in:
--  a moment is a row — slot / pinned / anchor_item_ids ship in the same
--  migration because no write path existed before it ran).
--
-- planned_days is an INDEX over the existing wkData/tvData/dlData blobs,
-- not a replacement: lookbook_items stays authoritative for rendering a
-- look; these rows carry a pointer back plus enough denormalised summary
-- to paint a rail card or a month cell without parsing the blob.
--
-- Run once in the Supabase SQL editor on Robes_p0.
-- Until it runs, every client write/read warns in the console and no-ops.

create table if not exists public.planned_days (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,

  -- A day is a local-calendar concept: `date`, never timestamptz. The
  -- client computes the local calendar date and sends ISO YYYY-MM-DD.
  day_date      date not null,

  source_type   text not null,           -- 'daily' | 'weekly' | 'travel'
  -- lookbook_items.id (client Date.now() string). No FK on purpose: the
  -- lookbook PK is (user_id, id) and rows can be local-only pre-sync.
  source_id     text not null,
  day_index     int  not null default 0, -- position within the parent plan

  -- The moment. One date holds one or two of them; the check constraint
  -- deliberately caps v1 at two at the database level — a third slot is a
  -- product conversation with a migration attached.
  slot          text not null default 'day'
                  check (slot in ('day', 'evening')),

  -- She has told us something fixed is happening here (a beach day, a
  -- client dinner) — as against a day Robes proposed. Pinned moments are
  -- generation constraints; Robes dresses around them.
  pinned        boolean not null default false,

  status        text not null default 'planned',
                                         -- 'planned' | 'free' | 'worn' | 'swapped'
  activity      text,                    -- her words, or the generated day label
  headline      text,                    -- the day's editorial line
  thumb_urls    jsonb default '[]'::jsonb, -- 2-3 http urls for rail/month cells
  item_ids      jsonb default '[]'::jsonb, -- wardrobe_items ids in this look

  -- Build-around pieces (Diary Phase 2). Reserved: unwritten until the
  -- intake ships.
  anchor_item_ids jsonb default '[]'::jsonb,

  -- Reserved for the OOTD capture phase. Unwritten here — leave null.
  ootd_photo_url text,
  worn_at        timestamptz,

  environment   text default 'beta',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- The unit of uniqueness is the MOMENT, not the date: two plans may
-- legitimately claim the same date (precedence is a read-time question,
-- never a write-time exclusion — uniquing on date would let a trip
-- silently overwrite a weekly plan).
create unique index if not exists planned_days_source_slot
  on public.planned_days (user_id, source_id, day_index, slot);

create index if not exists planned_days_user_date
  on public.planned_days (user_id, day_date);

alter table public.planned_days enable row level security;

drop policy if exists planned_days_own on public.planned_days;
create policy planned_days_own on public.planned_days
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists planned_days_admin_read on public.planned_days;
create policy planned_days_admin_read on public.planned_days
  for select to authenticated using (is_admin());
