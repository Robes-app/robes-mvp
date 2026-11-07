-- migrate:up
-- The Robes models' second lineup (Annie, 7 Nov): the older model moves from 4 to 3 and Porcelain ·
-- Caramel from 3 to 4, so a pick of either still names the same woman. 5 stays the larger model; 1
-- and 2 are new faces in the old places.
update app.profiles
set model_preset = case model_preset when 3 then 4 else 3 end
where model_preset in (3, 4);

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
