-- migrate:up
-- What a look's picture stood on (plan 2026-11-05 §2.4): her twin, the cell she built by hand, or
-- a Robes model — recorded when the frame or render lands, so the `Robes model` tag follows the
-- picture and never her account. Null for pictures drawn before this column (no tag).
alter table app.looks
  add column stood_on text check (stood_on in ('twin', 'cell', 'robes'));

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
