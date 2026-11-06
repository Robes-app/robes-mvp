-- migrate:up
-- Felix rebuild D19 and D21 (plan 2026-11-06). `picture_note` is her own words on how Robes'
-- picture of the look is drawn ("sleeves rolled up"): every render and frame of the look reads it,
-- and it never changes which pieces are worn. `robes_hidden` hides Robes' picture from the look's
-- image stack without destroying it; the next render or frame that lands clears it and brings the
-- fresh picture to the front. Both are additive with safe defaults, so code and phone builds from
-- before them keep working: they never read either column.
alter table app.looks
  add column picture_note text
    constraint looks_picture_note_check
    check (picture_note is null or char_length(picture_note) between 1 and 280),
  add column robes_hidden boolean not null default false;

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
