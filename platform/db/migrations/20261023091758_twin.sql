-- migrate:up
-- Her digital twin (legacy 2026-10-20, docs/digital-twin-model-brief.md on beta): one reference
-- image per account, drawn from her close-up (the face) and a text descriptor of her line (the
-- facts and three sliders). The full-length photograph is retired; the catalog cells stay for
-- accounts with no twin.

-- Two more facts (size, never weight): her bust as a bra size or a tape measure, and her waist.
alter table app.profiles
  add column bust_band smallint check (bust_band between 28 and 46 and bust_band % 2 = 0),
  add column bust_cup text check (bust_cup in ('AA', 'A', 'B', 'C', 'D', 'DD', 'E', 'F', 'G+')),
  add column bust_cm smallint check (bust_cm between 70 and 140),
  add column waist_cm smallint check (waist_cm between 50 and 130);

-- The twin on file (a private asset of hers) and the key it answers to; a draw in flight or failed
-- is remembered by its key so an unchanged twin never draws twice.
alter table app.avatars
  add column twin_asset_id uuid,
  add column twin_key text check (char_length(twin_key) <= 64),
  add column twin_draw_key text check (char_length(twin_draw_key) <= 64),
  add column twin_draw_status text check (twin_draw_status in ('pending', 'failed')),
  add column twin_draw_at timestamptz,
  add constraint avatars_twin_asset_fk foreign key (twin_asset_id, user_id)
    references app.assets (id, user_id) on delete set null (twin_asset_id),
  add constraint avatars_twin_draw check ((twin_draw_key is null) = (twin_draw_status is null));

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
