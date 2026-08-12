-- Migration 17 — season bands, shared tag namespace, look climate (ADR-002)
-- Run once in the Supabase SQL editor (Robes_p0), AFTER the audit gate
-- (supabase/season_tags_audit.sql) returns "GATE PASSES".
--
-- This is ADR-002 Session A: schema and backfill ONLY, independently
-- revertible. No client or server code reads these columns yet — Session B
-- (category → tag pre-fill, item_dna.formality, prompt-to-vibe) lands
-- after this and depends on it.
--
-- NOTHING IS DROPPED HERE. `wardrobe_items.seasons`, `wardrobe_items.occasions`
-- and `looks.tags` all survive as the live source of truth for one release,
-- so rolling back is a redeploy rather than a restore. A follow-up migration
-- retires them once the new columns are read in production (ADR-002 [C8]).
--
-- TEXT + CHECK, NOT A POSTGRES ENUM. The ADR draft specified
-- `create type season_band as enum (...)`. There are zero Postgres enums in
-- this schema — every constrained value is text with a guarded check
-- (migration 13's pattern), and style_dna_migration records that as a
-- deliberate deviation on live RLS tables. Decisive here: ADR-002 explicitly
-- anticipates adding a fourth band ('transitional') on evidence, and
-- ALTER TYPE ... ADD VALUE is exactly the operation an enum makes awkward.
-- Widening a check constraint is a one-line ALTER.

-- ── preflight ───────────────────────────────────────────────────────────
-- Depends on migration 10 (wardrobe_items.seasons / .occasions) and
-- migration 14 (looks). Fail with a sentence rather than a bare 42703
-- fifty lines down.
do $$
begin
  if to_regclass('public.looks') is null then
    raise exception 'ADR-002: public.looks is missing — run supabase/looks_migration.sql (migration 14) first.';
  end if;
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'wardrobe_items'
                   and column_name = 'seasons') then
    raise exception 'ADR-002: wardrobe_items.seasons is missing — run supabase/wardrobe_v2_migration.sql (migration 10) first.';
  end if;
end $$;

-- ── slug helper ─────────────────────────────────────────────────────────
-- One normalisation, used by the backfill below and by every client write
-- afterwards.
--
-- THE CLIENT SLUGIFY MUST MATCH THIS EXACTLY, or the dedupe-by-slug
-- guarantee (unique per user_id + kind) silently breaks and she ends up with
-- two "Lisbon" tags that never merge. The contract is:
--   lower -> strip diacritics -> non-alphanumeric runs to '-' -> trim '-'
-- In JS that is:
--   s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
--    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || null
--
-- The diacritic strip is NOT cosmetic. Without it 'Old Céline Minimal' — a
-- shipped vibe seed — slugs to 'old-c-line-minimal' here and
-- 'old-celine-minimal' in any normal JS implementation, and the two never
-- meet. unaccent() is deliberately not used: it is an extension, and this
-- has to work on a bare project.
create or replace function public.rb_tag_slug(p_label text)
returns text
language sql
immutable
as $$
  select nullif(
    trim(both '-' from
      regexp_replace(
        regexp_replace(
          translate(
            -- ligatures first: translate() is strictly 1:1 and cannot expand
            replace(replace(replace(lower(coalesce(p_label, '')),
              'æ', 'ae'), 'œ', 'oe'), 'ß', 'ss'),
            'áàâäãåāăąéèêëēĕėęěíìîïĩīĭįóòôöõøōŏőúùûüũūŭůűųñńňçćčýÿŷšśşžźżđłŕřťďğ',
            'aaaaaaaaaeeeeeeeeeiiiiiiiiooooooooouuuuuuuuuunnncccyyysssszzzdlrrtdg'),
          '[^a-z0-9]+', '-', 'g'),
        '-{2,}', '-', 'g')
    ), '');
$$;

-- ── 1. wardrobe_items: the season band ──────────────────────────────────
-- season_band, NOT season: `profiles.season` is already the muse's COLOUR
-- season from Style Notes (a twelve-value analysis output — 'Soft Autumn',
-- 'True Winter'). Two unrelated concepts must not share the word.
alter table public.wardrobe_items
  add column if not exists season_band text not null default 'year_round';

-- season_source mirrors looks.climate_source and is what makes the
-- correction signal work on this axis (ADR-002 [C6] + [Q2]): the §6 pre-fill
-- writes 'inferred', she writes 'user'. Without it, a pre-filled band and a
-- chosen band are indistinguishable and the mapping can never be measured.
alter table public.wardrobe_items
  add column if not exists season_source text not null default 'inferred';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'wardrobe_items_season_band_check') then
    alter table public.wardrobe_items add constraint wardrobe_items_season_band_check
      check (season_band in ('spring_summer', 'autumn_winter', 'year_round'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'wardrobe_items_season_source_check') then
    alter table public.wardrobe_items add constraint wardrobe_items_season_source_check
      check (season_source in ('inferred', 'user'));
  end if;
end $$;

-- Backfill from the five-value seasons text[].
--   Spring and/or Summer only          -> spring_summer
--   Autumn and/or Winter only          -> autumn_winter
--   any cross-band pairing             -> year_round  (the accepted loss)
--   {'Year-round'} / null / empty      -> year_round
-- source: a stored value is hers — the displayed defaults were stripped at
-- save (WA.submit), so anything persisted was an explicit pick. Null/empty
-- stays 'inferred', which is the honest read of "she never told us".
update public.wardrobe_items w
set season_band = case
      when ('Spring' = any(s) or 'Summer' = any(s))
       and ('Autumn' = any(s) or 'Winter' = any(s)) then 'year_round'
      when ('Spring' = any(s) or 'Summer' = any(s))  then 'spring_summer'
      when ('Autumn' = any(s) or 'Winter' = any(s))  then 'autumn_winter'
      else 'year_round'
    end,
    season_source = case when cardinality(s) > 0 then 'user' else 'inferred' end
from (select id, coalesce(seasons, '{}'::text[]) as s from public.wardrobe_items) src
where w.id = src.id
  and src.s is not null;

create index if not exists idx_wardrobe_season_band
  on public.wardrobe_items (user_id, season_band);

-- ── 2. looks: the climate band ──────────────────────────────────────────
-- Stored, not computed on read, so the lookbook can filter and sort on it.
alter table public.looks
  add column if not exists climate_band text not null default 'year_round';

-- 'derived' (computed from the pieces) rather than 'inferred' (guessed from
-- a category or a prompt) — the ADR keeps the two words apart because the
-- operations differ: derivation is deterministic, inference is a guess.
alter table public.looks
  add column if not exists climate_source text not null default 'derived';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'looks_climate_band_check') then
    alter table public.looks add constraint looks_climate_band_check
      check (climate_band in ('spring_summer', 'autumn_winter', 'year_round'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'looks_climate_source_check') then
    alter table public.looks add constraint looks_climate_source_check
      check (climate_source in ('derived', 'user'));
  end if;
end $$;

-- Backfill by PARSING looks.tags — there is no climate column to re-type
-- (ADR-002 [C1]). All four axes ride one flat text[] recovered by
-- disjointness; this pulls out the climate slice only.
update public.looks l
set climate_band = case
      when 'High Summer'       = any(l.tags) then 'spring_summer'
      when 'Transitional Warm' = any(l.tags) then 'spring_summer'
      when 'Transitional Cool' = any(l.tags) then 'autumn_winter'
      when 'Deep Winter'       = any(l.tags) then 'autumn_winter'
      else 'year_round'
    end,
    -- Every migrated look stays 'derived', so the first save after migration
    -- re-derives from its pieces and self-corrects. Marking these 'user'
    -- would pin a guess permanently — the override must only ever be hers.
    climate_source = 'derived'
where l.tags is not null;

create index if not exists idx_looks_climate_band
  on public.looks (user_id, climate_band);

-- ── 3. the shared tag namespace ─────────────────────────────────────────
-- One vocabulary, two join tables. A custom "Wear it for" tag created on a
-- look is immediately available on pieces and vice versa — which is what
-- makes a capsule a QUERY (a tag with both pieces and looks attached)
-- rather than a new entity to model.
--
-- Table names: `tags` / `tag_pieces` / `tag_looks`. The draft called the
-- join tables `item_tags` / `look_tags`; `look_tags` is already an
-- identifier in this codebase (the generation-schema field, normLookTags,
-- data.look_tags, the look_tags_edited event) and reusing it guarantees a
-- confused handoff (ADR-002 [C4]).
create table if not exists public.tags (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null,
  label      text not null,
  slug       text not null,
  -- true when the label came from the Robes seed list. Seed rows are NOT
  -- pre-created per user: the seven wear_for seeds and the seven vibe seeds
  -- render from a client constant and a row is minted on first use, so a
  -- fresh account carries no junk rows and handle_new_user is untouched.
  is_seed    boolean not null default false,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tags_kind_check') then
    alter table public.tags add constraint tags_kind_check
      check (kind in ('wear_for', 'vibe'));
  end if;
end $$;

-- The dedupe guarantee. Vocabularies are per-user and per-axis: 'Evening'
-- as a wear_for and 'Evening' as a vibe are different tags.
create unique index if not exists idx_tags_user_kind_slug
  on public.tags (user_id, kind, slug);

alter table public.tags enable row level security;
drop policy if exists tags_select_own on public.tags;
drop policy if exists tags_insert_own on public.tags;
drop policy if exists tags_update_own on public.tags;
drop policy if exists tags_delete_own on public.tags;
create policy tags_select_own on public.tags for select using (auth.uid() = user_id);
create policy tags_insert_own on public.tags for insert with check (auth.uid() = user_id);
create policy tags_update_own on public.tags for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy tags_delete_own on public.tags for delete using (auth.uid() = user_id);

-- source is PER ROW, written once at insert, NEVER bulk-rewritten
-- (ADR-002 [C6]). The draft had any user edit flip every tag on the entity
-- to 'user', which erases the accepted-vs-corrected distinction the whole
-- correction-rate signal is made of. Removing an inferred tag is the
-- correction event; leaving it is the acceptance.
create table if not exists public.tag_pieces (
  wardrobe_item_id uuid not null references public.wardrobe_items(id) on delete cascade,
  tag_id           uuid not null references public.tags(id) on delete cascade,
  source           text not null default 'user',
  created_at       timestamptz not null default now(),
  primary key (wardrobe_item_id, tag_id)
);

create table if not exists public.tag_looks (
  look_id    uuid not null references public.looks(id) on delete cascade,
  tag_id     uuid not null references public.tags(id) on delete cascade,
  source     text not null default 'user',
  created_at timestamptz not null default now(),
  primary key (look_id, tag_id)
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tag_pieces_source_check') then
    alter table public.tag_pieces add constraint tag_pieces_source_check
      check (source in ('inferred', 'user'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tag_looks_source_check') then
    alter table public.tag_looks add constraint tag_looks_source_check
      check (source in ('inferred', 'user'));
  end if;
end $$;

-- Ownership inherits from the parent row (the look_pieces pattern) so a
-- link can never be reached by anyone but the owner of the thing it tags.
alter table public.tag_pieces enable row level security;
drop policy if exists tag_pieces_select_own on public.tag_pieces;
drop policy if exists tag_pieces_insert_own on public.tag_pieces;
drop policy if exists tag_pieces_update_own on public.tag_pieces;
drop policy if exists tag_pieces_delete_own on public.tag_pieces;
create policy tag_pieces_select_own on public.tag_pieces for select
  using (exists (select 1 from public.wardrobe_items w where w.id = wardrobe_item_id and w.user_id = auth.uid()));
create policy tag_pieces_insert_own on public.tag_pieces for insert
  with check (exists (select 1 from public.wardrobe_items w where w.id = wardrobe_item_id and w.user_id = auth.uid()));
create policy tag_pieces_update_own on public.tag_pieces for update
  using (exists (select 1 from public.wardrobe_items w where w.id = wardrobe_item_id and w.user_id = auth.uid()));
create policy tag_pieces_delete_own on public.tag_pieces for delete
  using (exists (select 1 from public.wardrobe_items w where w.id = wardrobe_item_id and w.user_id = auth.uid()));

alter table public.tag_looks enable row level security;
drop policy if exists tag_looks_select_own on public.tag_looks;
drop policy if exists tag_looks_insert_own on public.tag_looks;
drop policy if exists tag_looks_update_own on public.tag_looks;
drop policy if exists tag_looks_delete_own on public.tag_looks;
create policy tag_looks_select_own on public.tag_looks for select
  using (exists (select 1 from public.looks l where l.id = look_id and l.user_id = auth.uid()));
create policy tag_looks_insert_own on public.tag_looks for insert
  with check (exists (select 1 from public.looks l where l.id = look_id and l.user_id = auth.uid()));
create policy tag_looks_update_own on public.tag_looks for update
  using (exists (select 1 from public.looks l where l.id = look_id and l.user_id = auth.uid()));
create policy tag_looks_delete_own on public.tag_looks for delete
  using (exists (select 1 from public.looks l where l.id = look_id and l.user_id = auth.uid()));

-- Admin read across the three new tables, mirroring migration 11. Guarded:
-- public.is_admin() only exists once the admin capture plane has been run,
-- and a fresh project missing it should not fail the whole migration — the
-- same degrade posture every other surface in this codebase takes.
do $$
begin
  -- to_regprocedure, NOT to_regproc: to_regproc takes a bare name and
  -- returns NULL for anything with an argument list, so the parenthesised
  -- form silently reports "missing" even when the function is right there.
  if to_regprocedure('public.is_admin()') is null then
    raise notice 'ADR-002: public.is_admin() not found — skipping admin-read policies. Re-run this block after supabase/admin_capture_migration.sql (migration 11).';
    return;
  end if;
  execute 'drop policy if exists tags_admin_read on public.tags';
  execute 'create policy tags_admin_read on public.tags for select using (public.is_admin())';
  execute 'drop policy if exists tag_pieces_admin_read on public.tag_pieces';
  execute 'create policy tag_pieces_admin_read on public.tag_pieces for select using (public.is_admin())';
  execute 'drop policy if exists tag_looks_admin_read on public.tag_looks';
  execute 'create policy tag_looks_admin_read on public.tag_looks for select using (public.is_admin())';
end $$;

create index if not exists idx_tag_pieces_tag on public.tag_pieces (tag_id);
create index if not exists idx_tag_looks_tag  on public.tag_looks (tag_id);

-- ── 4. backfill: wardrobe_items.occasions -> tags + tag_pieces ──────────
-- The five known values fold to their seeds; a legacy stored 'Everyday'
-- folds to the everyday seed; ANYTHING ELSE is a chip she typed and becomes
-- a custom tag. Dropping the unknowns is the failure mode this guards.
--
-- TWO STATEMENTS, NOT ONE CTE CHAIN. A data-modifying CTE and the main
-- query run against the SAME SNAPSHOT, so an `insert ... returning` into
-- `tags` inside a WITH is invisible to a join against `tags` in the same
-- statement — the links all resolve to nothing and every tag is silently
-- lost. Verified against Postgres 16 while writing this: the single-statement
-- form produced 0 tag_pieces rows. Do not "tidy" these back into one.
-- (No ON COMMIT DROP: psql and the Supabase SQL editor autocommit per
-- statement, so the table would vanish before the next one runs. Dropped
-- explicitly at the end, and defensively here in case a prior run failed.)
drop table if exists _adr002_wear;
create temporary table _adr002_wear as
select
  w.user_id,
  w.id as item_id,
  trim(o.tag) as raw_label,
  trim(o.tag) in ('Everyday', 'Work', 'Evening', 'Occasion', 'Travel', 'Active') as is_seed
from public.wardrobe_items w, unnest(coalesce(w.occasions, '{}'::text[])) as o(tag)
where public.rb_tag_slug(o.tag) is not null;

insert into public.tags (user_id, kind, label, slug, is_seed)
select distinct on (user_id, public.rb_tag_slug(raw_label))
       user_id, 'wear_for', raw_label, public.rb_tag_slug(raw_label), is_seed
from _adr002_wear
order by user_id, public.rb_tag_slug(raw_label), is_seed desc
on conflict (user_id, kind, slug) do nothing;

insert into public.tag_pieces (wardrobe_item_id, tag_id, source)
select distinct r.item_id, t.id, 'user'
from _adr002_wear r
join public.tags t
  on t.user_id = r.user_id and t.kind = 'wear_for'
 and t.slug = public.rb_tag_slug(r.raw_label)
on conflict do nothing;

drop table if exists _adr002_wear;
-- source 'user' is correct here and NOT a guess: the displayed defaults
-- (Year-round / Everyday) are stripped by WA.submit, so a persisted
-- occasions value only ever exists because she picked it.

-- ── 5. backfill: looks.tags -> tags + tag_looks ─────────────────────────
-- The disjointness parse, in the same precedence the client uses
-- (_rbTagsParse): known climate -> already consumed in step 2; known light
-- -> DISCARDED (§7 removes the axis); known wear -> seed slug; known vibe
-- -> seed vibe; 'vibe:' prefix -> custom vibe with the prefix stripped;
-- ANYTHING ELSE -> a custom wear_for tag. That last rule is the one a naive
-- migration misses, and it is where her typed capsule tags live.
-- Same two-statement shape as step 4, for the same snapshot reason.
drop table if exists _adr002_look;
create temporary table _adr002_look as
with raw as (
  select l.user_id, l.id as look_id, trim(t.tag) as raw_label
  from public.looks l, unnest(coalesce(l.tags, '{}'::text[])) as t(tag)
  where trim(coalesce(t.tag, '')) <> ''
),
classified as (
  select
    user_id, look_id, raw_label,
    case
      when raw_label in ('High Summer','Transitional Warm','Transitional Cool','Deep Winter') then 'climate'
      when raw_label in ('Daylight','Twilight & Evening') then 'light'
      when raw_label in ('Elevated Everyday','Smart Creative','Boardroom Power','Work-to-Dinner',
                         'Al Fresco & Travel','Cocktail & Cultural','Formal / Gala') then 'legacy_wear'
      when raw_label in ('Sharp Tailoring','Fluid Monochrome','Column Line','Soft Layering',
                         'Old Céline Minimal','90s Off-Duty','Minimalist Glamour') then 'seed_vibe'
      when raw_label ilike 'vibe:%' then 'custom_vibe'
      else 'custom_wear'
    end as axis
  from raw
),
-- Work-to-Dinner is the one legacy value that fans out to two seeds.
expanded as (
  select user_id, look_id, 'wear_for' as kind, m.label, true as is_seed
  from classified c
  join lateral (
    select unnest(
      case c.raw_label
        when 'Elevated Everyday'   then array['Everyday']
        when 'Smart Creative'      then array['Work']
        when 'Boardroom Power'     then array['Work']
        when 'Work-to-Dinner'      then array['Work','Evening']
        when 'Al Fresco & Travel'  then array['Travel']
        when 'Cocktail & Cultural' then array['Evening']
        when 'Formal / Gala'       then array['Occasion']
      end) as label
  ) m on true
  where c.axis = 'legacy_wear'

  union all
  select user_id, look_id, 'vibe', raw_label, true
  from classified where axis = 'seed_vibe'

  union all
  select user_id, look_id, 'vibe', trim(substring(raw_label from 6)), false
  from classified where axis = 'custom_vibe'
    and trim(substring(raw_label from 6)) <> ''

  union all
  select user_id, look_id, 'wear_for', raw_label, false
  from classified where axis = 'custom_wear'
  -- 'climate' consumed in step 2; 'light' intentionally dropped (ADR-002 §7).
)
select * from expanded where public.rb_tag_slug(label) is not null;

insert into public.tags (user_id, kind, label, slug, is_seed)
select distinct on (user_id, kind, public.rb_tag_slug(label))
       user_id, kind, label, public.rb_tag_slug(label), is_seed
from _adr002_look
order by user_id, kind, public.rb_tag_slug(label), is_seed desc
on conflict (user_id, kind, slug) do nothing;

insert into public.tag_looks (look_id, tag_id, source)
select distinct e.look_id, t.id, 'inferred'
from _adr002_look e
join public.tags t
  on t.user_id = e.user_id and t.kind = e.kind
 and t.slug = public.rb_tag_slug(e.label)
on conflict do nothing;

drop table if exists _adr002_look;
-- source 'inferred' here, unlike step 4: a look's stored tags may have been
-- INHERITED from its pieces (_rbInheritLookTags) rather than chosen, and the
-- two are indistinguishable after the fact. 'inferred' is the recoverable
-- state — the first time she touches the Tags sheet they become 'user'.
-- Marking them 'user' would permanently poison the correction signal.

-- ── verification ────────────────────────────────────────────────────────
do $$
declare
  n_band bigint; n_climate bigint; n_tags bigint; n_tp bigint; n_tl bigint; n_custom bigint;
begin
  select count(*) into n_band    from public.wardrobe_items where season_band <> 'year_round';
  select count(*) into n_climate from public.looks          where climate_band <> 'year_round';
  select count(*) into n_tags    from public.tags;
  select count(*) into n_tp      from public.tag_pieces;
  select count(*) into n_tl      from public.tag_looks;
  select count(*) into n_custom  from public.tags where not is_seed;
  raise notice 'ADR-002 migration 17 complete.';
  raise notice '  pieces banded off year_round : %', n_band;
  raise notice '  looks banded off year_round  : %', n_climate;
  raise notice '  tags created                 : % (% custom)', n_tags, n_custom;
  raise notice '  tag_pieces links             : %', n_tp;
  raise notice '  tag_looks links              : %', n_tl;
  raise notice 'Source columns (seasons / occasions / looks.tags) are UNTOUCHED and still live.';
end $$;

-- ── rollback ────────────────────────────────────────────────────────────
-- Safe at any point before Session B, because nothing reads the new schema
-- yet and no source column was modified:
--
--   drop table if exists public.tag_looks;
--   drop table if exists public.tag_pieces;
--   drop table if exists public.tags;
--   alter table public.looks          drop column if exists climate_band,
--                                     drop column if exists climate_source;
--   alter table public.wardrobe_items drop column if exists season_band,
--                                     drop column if exists season_source;
--   drop function if exists public.rb_tag_slug(text);
