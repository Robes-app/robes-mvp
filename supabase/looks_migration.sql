-- Looks migration (migration 14) — run once in the Supabase SQL editor (Robes_p0)
-- Implements §B1 of docs/look-entity-brief.md: the Look as a saved entity.
--
-- Three tables, not one. The question "does changing the shoes create a new
-- look?" dissolves once the THING is separated from THE OCCASION IT WAS WORN:
--   looks       — the saved, named, reusable entity. Mutable; small edits keep identity.
--   look_pieces — its CURRENT composition.
--   wears       — an immutable record: this look, these exact pieces, this date.
--
-- The client degrades gracefully when this hasn't run (same convention as
-- planned_days and wishlist): the Looks tab falls back to its localStorage
-- cache, cloud writes warn once to the console and no-op, and nothing in the
-- rest of the app changes. Run it before flipping beta traffic.

-- ── looks ───────────────────────────────────────────────────────────────
-- name_provisional carries the offered-not-applied title rule (brief A6):
-- Robes' suggestion pre-populates and renders as provisional; it BECOMES the
-- name if she leaves it alone. There is no null state — a Look cannot be
-- unnamed without breaking the grid.
create table if not exists public.looks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  name_provisional boolean not null default true,
  tags          text[],
  -- the styling note ("Silk shirt tucked into the jeans, sandals, tote").
  -- Synthesised from the pieces at save time, or carried from the generator.
  note          text,
  -- optional look photograph (Phase 2 composer). Deliberately NOT a source of
  -- garment data: no extraction, the picture is just the look's image.
  photo_url     text,
  -- provenance, for the admin read only — never behaviour:
  -- 'wear' (accrued from a confirmed wear, B3) | 'manual' (composer) | 'variant' (promoted, A5)
  source        text not null default 'wear',
  -- set when this look was promoted out of another (A5). No FK cascade: the
  -- ancestor may be deleted, and that must not take the promoted look with it.
  origin_look_id uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.looks enable row level security;

drop policy if exists looks_select_own on public.looks;
drop policy if exists looks_insert_own on public.looks;
drop policy if exists looks_update_own on public.looks;
drop policy if exists looks_delete_own on public.looks;
create policy looks_select_own on public.looks for select using (auth.uid() = user_id);
create policy looks_insert_own on public.looks for insert with check (auth.uid() = user_id);
create policy looks_update_own on public.looks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy looks_delete_own on public.looks for delete using (auth.uid() = user_id);

create index if not exists idx_looks_user on public.looks (user_id, created_at desc);

-- ── look_pieces ─────────────────────────────────────────────────────────
-- The CURRENT composition, and only that. Editing it mutates the existing
-- Look (B5) — there is no similarity threshold and no inference anywhere;
-- creating a new Look is only ever an explicit user action.
-- slot is presentational (Top / Bottom / Shoe / Bag / Accessory) so the
-- composer's rack can rebuild its rows; category stays on wardrobe_items.
create table if not exists public.look_pieces (
  look_id          uuid not null references public.looks(id) on delete cascade,
  wardrobe_item_id uuid not null references public.wardrobe_items(id) on delete cascade,
  slot             text,
  position         smallint,
  primary key (look_id, wardrobe_item_id)
);

alter table public.look_pieces enable row level security;

-- Ownership is inherited from the parent look — one subquery, four policies,
-- so a piece row can never be reached by anyone but the look's owner.
drop policy if exists look_pieces_select_own on public.look_pieces;
drop policy if exists look_pieces_insert_own on public.look_pieces;
drop policy if exists look_pieces_update_own on public.look_pieces;
drop policy if exists look_pieces_delete_own on public.look_pieces;
create policy look_pieces_select_own on public.look_pieces for select
  using (exists (select 1 from public.looks l where l.id = look_id and l.user_id = auth.uid()));
create policy look_pieces_insert_own on public.look_pieces for insert
  with check (exists (select 1 from public.looks l where l.id = look_id and l.user_id = auth.uid()));
create policy look_pieces_update_own on public.look_pieces for update
  using (exists (select 1 from public.looks l where l.id = look_id and l.user_id = auth.uid()));
create policy look_pieces_delete_own on public.look_pieces for delete
  using (exists (select 1 from public.looks l where l.id = look_id and l.user_id = auth.uid()));

create index if not exists idx_look_pieces_item on public.look_pieces (wardrobe_item_id);

-- ── wears ───────────────────────────────────────────────────────────────
-- piece_ids is a SNAPSHOT, not a join to the current composition. This is
-- what keeps history truthful when the look is later edited: a look pinned to
-- five days and then restyled must not silently rewrite five days of history.
--
-- WEARS ARE IMMUTABLE (B4). There is deliberately NO update policy on this
-- table — corrections are delete-and-recreate. This is a hard constraint, not
-- a default: a confirmed wear count is defensible evidence, and evidence that
-- can be edited in place isn't.
create table if not exists public.wears (
  id           uuid primary key default gen_random_uuid(),
  look_id      uuid not null references public.looks(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  worn_on      date not null,
  piece_ids    uuid[] not null,
  note         text,
  -- where the confirmation came from: 'looks' | 'daily' | 'weekly' | 'travel' | 'retro'
  source       text,
  -- the lookbook entry this wear was confirmed from, when there was one
  source_id    text,
  confirmed_at timestamptz not null default now()
);

alter table public.wears enable row level security;

drop policy if exists wears_select_own on public.wears;
drop policy if exists wears_insert_own on public.wears;
drop policy if exists wears_delete_own on public.wears;
create policy wears_select_own on public.wears for select using (auth.uid() = user_id);
create policy wears_insert_own on public.wears for insert with check (auth.uid() = user_id);
-- Undo (A4's quiet affordance) is a DELETE — the only correction path.
create policy wears_delete_own on public.wears for delete using (auth.uid() = user_id);
-- No wears_update_own policy. Do not add one.

create index if not exists idx_wears_look on public.wears (look_id, worn_on desc);
create index if not exists idx_wears_user on public.wears (user_id, worn_on desc);

-- One look is worn at most once on a given date. A day and its evening are
-- two different looks, so this costs nothing real — and it makes confirmation
-- idempotent, so a double-tap or a re-synced blob can't inflate the count
-- that "wear more, buy less" is measured on.
create unique index if not exists idx_wears_unique_day
  on public.wears (user_id, look_id, worn_on);
