-- Migration 18 fixture — one piece per branch of the pre-fill mapping.
-- Loaded by scripts/tag_prefill_test.sh AFTER migration 17. Throwaway only.
--
-- The cases that matter:
--   cashmere jumper  legacy category says Tops, but the L2 recovers sheet
--                    category Knitwear — the band must follow the L2
--   oversized blazer the per-l2 override inside Outerwear
--   wool coat        the Outerwear default the override sits beside
--   evening gown     the two-tag case
--   bikini           the only spring_summer default
--   legacy jeans     no L2 at all (pre-migration-15) — legacy fallback
--   unfiled thing    category 'Other' — deliberately gets nothing
--   SHE CORRECTED    season_source 'user' — must be left untouched entirely
--   (blazer belongs to a SECOND account, to prove per-user tag isolation)
insert into public.wardrobe_items
  (id, user_id, label, category, category_l2, category_l3, season_band, season_source) values
 ('33330000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','cashmere jumper','Tops','Jumpers & sweaters','Cashmere jumper','year_round','inferred'),
 ('33330000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','oversized blazer','Outerwear','Blazers','Oversized blazer','year_round','inferred'),
 ('33330000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','wool coat','Outerwear','Coats','Wool coat','year_round','inferred'),
 ('33330000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','evening gown','Dresses','Occasion & evening','Evening gown','year_round','inferred'),
 ('33330000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','bikini','Swimwear','Swimwear','Bikini top','year_round','inferred'),
 ('33330000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000001','legacy jeans','Bottoms',null,null,'year_round','inferred'),
 ('33330000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000001','unfiled thing','Other',null,null,'year_round','inferred'),
 ('33330000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000001','SHE CORRECTED','Knitwear','Cardigans','Chunky cardigan','spring_summer','user');
