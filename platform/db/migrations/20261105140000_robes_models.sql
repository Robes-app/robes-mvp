-- migrate:up
-- The Robes models (plan 2026-11-05): five shared portraits per wearer, each a catalog cell in its
-- own grammar (`w-r4@v1`), and which one she chose. Hair gains a sixth swatch, silver (h5).

-- Which Robes model stands under her looks; null = never chosen (the first stands). Not personal
-- data: a number into a fixed catalog.
alter table app.profiles
  add column model_preset smallint check (model_preset between 1 and 5);

-- The catalog takes a Robes model's key beside the picks cells, and h5 (silver).
alter table app.avatar_cells
  drop constraint avatar_cells_id_check,
  add constraint avatar_cells_id_check
    check (id ~ '^[wm]-(s[0-7]-h[0-5]-(hg|pe|re|it|ap|nt)(-(ll|lr|fl|fr))*|r[1-5])@v[0-9]+$');

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
