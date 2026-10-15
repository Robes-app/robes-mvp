-- migrate:up
-- The first seven days (legacy docs/beta-onboarding-7day-brief.md): first_piece, pick_one and
-- week_one by email; the model and batch nudges and Wore it? by push only.
alter table app.notifications drop constraint notifications_kind_check;
alter table app.notifications add constraint notifications_kind_check check (kind in (
  'looks_ready', 'look_waiting', 'borrowing', 'five', 'week_empty', 'morning', 'receipt',
  'account_deleted', 'export_ready', 'first_piece', 'pick_one', 'week_one', 'model_nudge',
  'batch_nudge', 'wore_it'));

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
