-- migrate:up
-- The facts redesign (handoff "The facts — engineering handoff", 24 Nov): men give six
-- measurements and shoulder width, and every unit is a display choice over one stored value.
-- Lengths are stored in cm to the tenth so a half inch stays exact. All new columns are nullable
-- with no default: an older phone app never fills them and the screens show "Add" for empty.
alter table app.profiles
  add column chest_cm numeric(5, 1) check (chest_cm between 70 and 150),
  add column inseam_cm numeric(5, 1) check (inseam_cm between 50 and 110),
  add column collar_cm numeric(5, 1) check (collar_cm between 30 and 55),
  -- His shoulder measurement; never the Body shape slider (avatar_prefs.adj.shoulders).
  add column shoulder_width_cm numeric(5, 1) check (shoulder_width_cm between 30 and 65),
  -- Her display unit per row, e.g. {"bust":"us","collar":"in"}; a missing key is the default.
  add column unit_prefs jsonb check (
    jsonb_typeof(unit_prefs) = 'object' and pg_column_size(unit_prefs) <= 512
  );

-- Wider ranges only (dress size to UK 24, men's shoes to UK 13, cups to FF and G): old code never
-- writes outside the old ones. G+ stays valid for answers saved before; new code reads it as G.
alter table app.profiles drop constraint profiles_size_uk_check;
alter table app.profiles
  add constraint profiles_size_uk_check check (size_uk between 4 and 24 and size_uk % 2 = 0);
alter table app.profiles drop constraint profiles_shoe_uk_check;
alter table app.profiles
  add constraint profiles_shoe_uk_check
  check (shoe_uk between 2 and 13 and shoe_uk * 2 = trunc(shoe_uk * 2));
alter table app.profiles drop constraint profiles_bust_cup_check;
alter table app.profiles
  add constraint profiles_bust_cup_check
  check (bust_cup in ('AA', 'A', 'B', 'C', 'D', 'DD', 'E', 'F', 'FF', 'G', 'G+'));

-- His chest was saved as the bust tape measure; copy it to chest_cm (bust_cm is kept as it is).
update app.profiles
set chest_cm = bust_cm
where gender_identity = 'man' and bust_cm is not null and chest_cm is null;

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
