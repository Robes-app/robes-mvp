-- migrate:up
-- Pictures from before `stood_on` (20261105160000) carry no record of what they stood on, so
-- no look on staging wore the `Robes model` tag (plan 2026-11-05 §2.4). The best reading of each:
--
-- A frame: drawn on her twin where she has one (the twin wins once it exists), on the cell she
-- built by hand where one is filed, else on a Robes model. A frame drawn before her twin existed
-- reads 'twin' here and so wears no tag — the error that shows nothing, never a false tag.
update app.looks l
set stood_on = case
  when a.twin_asset_id is not null then 'twin'
  when a.avatar_id is not null then 'cell'
  else 'robes'
end
from app.profiles p
left join app.avatars a on a.user_id = p.id
where l.user_id = p.id
  and l.stood_on is null
  and l.frame_asset_id is not null;

-- A render: its key names the model (the twin, a Robes model — the five or the three legacy
-- generic cells — or a picks cell), as the entity already reads it at request time.
update app.looks
set stood_on = case
  when render_key like 'twin:%' then 'twin'
  when render_key ~ '^[wm]-(r[1-5]|s4-h1-nt|s1-h0-nt|s7-h3-nt)@v[0-9]+:' then 'robes'
  when render_key ~ '^[wm]-s[0-7]-h[0-5]-' then 'cell'
end
where stood_on is null
  and render_asset_id is not null
  and render_key is not null
  and render_key not like 'frame:%';

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
