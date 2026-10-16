-- migrate:up
-- Her digital twin, Style DNA and the brief in her words (legacy Settings 2026-10-07/08, style memory
-- slices A/B 2026-09-30). Legacy kept all of this in profiles.style_dna jsonb; here it is columns and
-- two tables, assembled into the same prompt block server-side.

-- The facts (size, never weight), the houses she reaches for and the one investment level.
alter table app.profiles
  add column style_brands text[] not null default '{}' check (cardinality(style_brands) <= 40),
  add column investment_level text
    check (investment_level in ('under_500', '500_1500', '1500_5000', '5000_plus')),
  add column height_cm smallint check (height_cm between 140 and 210),
  add column size_uk smallint check (size_uk between 4 and 16 and size_uk % 2 = 0),
  add column shoe_uk numeric(3, 1) check (shoe_uk between 2 and 8 and shoe_uk * 2 = trunc(shoe_uk * 2)),
  add column age_band text
    check (age_band in ('under_25', '25_34', '35_44', '45_54', '55_64', '65_plus'));

-- Legacy tiers and yearly spend map once to a level (digital twin brief, "the data already saved").
update app.profiles set investment_level = case
    when annual_spend = 'Under €500' then 'under_500'
    when annual_spend = '€500–1,500' then '500_1500'
    when annual_spend = '€1,500–5,000' then '1500_5000'
    when annual_spend = '€5,000+' then '5000_plus'
    when budget ilike '%luxury%' then '5000_plus'
    when budget ilike '%designer%' then '1500_5000'
    when budget ilike '%contemporary%' then '500_1500'
    when budget ilike '%everyday%' then 'under_500'
  end
  where investment_level is null and (annual_spend is not null or budget is not null);

-- The brief's paragraph, and when Robes last read her wardrobe for it (the memory after this is new).
alter table app.style_profiles
  add column brief_notes text check (char_length(brief_notes) <= 600),
  add column brief_read_at timestamptz;

-- One line of her brief. Kept lines are what every prompt reads first; pending lines are what Robes
-- noticed and she has not answered; struck lines never come back. Notes and colours lines only ever
-- wait (keeping one files it on style_profiles).
create table app.style_brief_lines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users (id) on delete cascade,
  list text not null check (list in ('loves', 'avoids', 'rules', 'notes', 'colours')),
  state text not null check (state in ('pending', 'kept', 'struck')),
  text text not null check (char_length(text) between 1 and 160),
  full_text text check (char_length(full_text) <= 600),
  because text check (char_length(because) <= 200),
  source text not null default 'drafted' check (source in ('drafted', 'edited', 'typed')),
  origin text not null default 'read' check (origin in ('read', 'prompt', 'her')),
  chip text check (char_length(chip) <= 60),
  loved text[] not null default '{}' check (cardinality(loved) <= 6),
  rejected text[] not null default '{}' check (cardinality(rejected) <= 6),
  kept_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (state = 'pending' or list in ('loves', 'avoids', 'rules')),
  check ((state = 'kept') = (kept_at is not null))
);
select private.track_updates('app.style_brief_lines');
create index style_brief_lines_user_idx on app.style_brief_lines (user_id, state, created_at);
-- A line stands once per list (a struck line is a separate record of what she refused).
create unique index style_brief_lines_live_key
  on app.style_brief_lines (user_id, list, lower(text)) where state <> 'struck';

-- What she told Robes through the app (verdicts, swaps, struck lines, asks). Wears are read from
-- app.wears. A record of what happened: insert or delete, never edit.
create table app.style_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users (id) on delete cascade,
  kind text not null check (kind in ('verdict', 'swap', 'strike', 'ask')),
  surface text check (char_length(surface) <= 40),
  subject text check (char_length(subject) <= 120),
  body text check (char_length(body) <= 240),
  verdict smallint check (verdict in (0, 1)),
  piece_out text check (char_length(piece_out) <= 120),
  piece_in text check (char_length(piece_in) <= 120),
  category text check (char_length(category) <= 40),
  look_id uuid,
  created_at timestamptz not null default now(),
  foreign key (look_id, user_id) references app.looks (id, user_id) on delete set null (look_id),
  check ((kind = 'verdict') = (verdict is not null)),
  check (kind <> 'swap' or piece_out is not null or piece_in is not null),
  check (kind not in ('strike', 'ask') or body is not null)
);
create index style_memory_user_idx on app.style_memory (user_id, created_at desc);
create trigger style_memory_immutable before update on app.style_memory
  for each row execute function private.forbid_update();

-- Robes' read of her wardrobe for the brief is a job like any other paid call.
alter table app.generation_jobs drop constraint generation_jobs_kind_check;
alter table app.generation_jobs add constraint generation_jobs_kind_check check (kind in ('fake',
  'key_piece', 'daily', 'travel', 'travel_looks', 'look_render', 'avatar_cell', 'wardrobe_analyse',
  'stylenotes_analyse', 'receipt_read', 'alternates', 'lookbuild_note', 'link_import', 'cutout',
  'style_brief'));

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
