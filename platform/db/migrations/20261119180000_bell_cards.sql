-- migrate:up
-- The bell's onboarding cards (design "Onboarding notifications", 19 Nov). `bell_seen_at` is when
-- she last opened the sheet: a card that appeared after it lights the dot. `bell_cards` keeps what
-- the 30-day `dismissed` map cannot: how often she put the Twin and Style DNA cards away (once, back
-- after a week; twice, for good) and that she has had a twin, so deleting one never brings the
-- card back.
alter table app.user_ui_state
  add column bell_seen_at timestamptz,
  add column bell_cards jsonb not null default '{}'
    check (jsonb_typeof(bell_cards) = 'object' and pg_column_size(bell_cards) <= 2048);

-- Anyone with a twin on file, or one deleted and still archived, has had one.
update app.user_ui_state u
set bell_cards = u.bell_cards || '{"twinHad": true}'::jsonb
where exists (
    select 1 from app.style_profiles s
    where s.user_id = u.user_id and s.headshot_asset_id is not null
  )
  or exists (
    select 1 from app.avatars a
    where a.user_id = u.user_id and (a.twin_asset_id is not null or a.twin_draw_status = 'pending')
  )
  or exists (select 1 from app.twin_archives t where t.user_id = u.user_id);

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
