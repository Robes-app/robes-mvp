-- migrate:up
-- Which picture is the record of a look (Look redline 27 Oct): her own photograph ('photo') or the
-- render on her model ('model'). It becomes the Lookbook cover and the diary thumbnail. Null until
-- she picks: her photograph leads when she has one. Nullable, no default, so older app versions
-- that never send it keep working.
alter table app.looks
  add column record_image text check (record_image in ('photo', 'model'));

-- migrate:down
-- Forward-only.
