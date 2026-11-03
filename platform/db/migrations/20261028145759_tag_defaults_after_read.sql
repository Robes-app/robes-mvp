-- migrate:up

-- A piece added from a photo is inserted as a 'reading' placeholder with no category, so the
-- insert trigger finds no defaults; the read fills the category later with an update. Run the
-- same defaults once more at that moment — reading → ready — so a photo piece files with its
-- season and wear-for like every other (legacy's migration 18 did this on its single insert).
-- Her own season is kept (season_source = 'user'), and wear tags are only ever added.
create trigger apply_tag_defaults_after_read after update of status on app.wardrobe_items
  for each row
  when (old.status = 'reading' and new.status = 'ready')
  execute function private.apply_tag_defaults();

-- migrate:down
-- Forward-only.
