#!/usr/bin/env bash
# ADR-002 / migration 17 harness — proves the backfill against real rows.
#
#   DATABASE_URL=postgres://user@host:port/THROWAWAY ./scripts/season_tags_migration_test.sh
#
# POINT THIS AT A THROWAWAY DATABASE. It creates the pre-migration schema
# from scratch and will collide with anything real. Never Robes_p0.
#
# What it covers: the five-value seasons -> three-band collapse (including
# cross-band), season_source, the looks.tags flat-array parse (climate,
# Work-to-Dinner fan-out, 'vibe:' custom vibes, unknown-string custom wear
# tags, Light discarded), per-user namespace isolation, slug normalisation,
# the check constraints, idempotency, and that no source column is touched.
#
# It exists because writing this by inspection produced two bugs that only
# a run would catch: a data-modifying CTE whose inserted tags were invisible
# to its own join (0 links), and to_regproc() silently reporting a function
# missing when handed a parenthesised signature.
set -euo pipefail
: "${DATABASE_URL:?set DATABASE_URL to a throwaway database}"
here="$(cd "$(dirname "$0")/.." && pwd)"

echo "── fixture ──"
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f "$here/scripts/season_tags_fixture.sql"
echo "── migration 17 ──"
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f "$here/supabase/season_tags_migration.sql"
echo "── assertions ──"
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f "$here/scripts/season_tags_assert.sql"
echo "── re-run (idempotency) ──"
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f "$here/supabase/season_tags_migration.sql"
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f "$here/scripts/season_tags_assert.sql"
echo "── all green ──"
