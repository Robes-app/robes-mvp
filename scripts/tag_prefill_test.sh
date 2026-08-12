#!/usr/bin/env bash
# ADR-002 Session B / migration 18 harness — the category -> tag pre-fill.
#
#   DATABASE_URL=postgres://user@host:port/THROWAWAY ./scripts/tag_prefill_test.sh
#
# POINT THIS AT A THROWAWAY DATABASE. It replays the real migration chain from
# scratch and will collide with anything real. Never Robes_p0.
#
# Unlike season_tags_migration_test.sh (which stands up a minimal fixture),
# this replays the ACTUAL migration files in order — 3, 10, 14, 15, 16, 17,
# then 18 — so it also proves those still compose. Phases:
#   1. chain + fixture + migration 18 + assertions
#   2. the TRIGGER: a piece inserted after the migration is pre-filled too
#   3. idempotency: re-run 18, assert again, corrections still intact
set -euo pipefail
: "${DATABASE_URL:?set DATABASE_URL to a throwaway database}"
here="$(cd "$(dirname "$0")/.." && pwd)"
run() { psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f "$1"; }
val() { psql "$DATABASE_URL" -qAt -c "$1"; }

echo "── 1 · migration chain ──"
run "$here/scripts/adr002_prelude.sql"
for f in wardrobe_schema item_dna_migration wardrobe_v2_migration looks_migration \
         wardrobe_taxonomy_migration look_roles_migration season_tags_migration \
         ; do
  run "$here/supabase/$f.sql"
done
echo "── 1 · fixture + migration 18 ──"
run "$here/scripts/tag_prefill_fixture.sql"
run "$here/supabase/tag_prefill_migration.sql"
run "$here/scripts/tag_prefill_assert.sql"

echo "── 2 · trigger on a fresh insert ──"
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -c "insert into public.wardrobe_items
  (user_id, label, category, category_l2, category_l3)
  values ('00000000-0000-0000-0000-000000000001','fresh trench','Outerwear','Coats','Trench coat');"
got=$(val "select pf('fresh trench')")
want="autumn_winter / inferred / everyday"
[ "$got" = "$want" ] && echo "   ok  trigger pre-filled a new piece ($got)" \
  || { echo "   FAIL trigger — got '$got', want '$want'"; exit 1; }

echo "── 3 · idempotency ──"
before=$(val "select count(*) from public.tag_pieces")
run "$here/supabase/tag_prefill_migration.sql"
after=$(val "select count(*) from public.tag_pieces")
[ "$before" = "$after" ] && echo "   ok  link count stable at $after" \
  || { echo "   FAIL links changed on re-run: $before -> $after"; exit 1; }
run "$here/scripts/tag_prefill_assert.sql"
echo "── all green ──"
