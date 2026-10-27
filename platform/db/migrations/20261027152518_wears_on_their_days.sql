-- migrate:up
-- A wear and a pin to a day are one act (beta): every look she has recorded as worn sits on the
-- day she wore it. New wears file themselves (looks repository); this places the ones recorded
-- before that, once. Data only: old code reads these rows as ordinary pinned entries.
insert into app.planned_days (user_id, day_date, source_kind, look_id, slot, pinned, status, activity, item_ids)
select w.user_id, w.worn_on, 'look', w.look_id, 'day', true, 'worn', dn.name, w.piece_ids
from app.wears w
join app.looks l on l.id = w.look_id and l.user_id = w.user_id and l.deleted_at is null
left join app.day_names dn on dn.user_id = w.user_id and dn.day_date = w.worn_on
where not exists (
  select 1 from app.planned_days p
  where p.user_id = w.user_id and p.look_id = w.look_id and p.day_date = w.worn_on
    and p.deleted_at is null
);

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
