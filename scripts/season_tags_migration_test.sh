#!/usr/bin/env bash
# ADR-002 / migration 17 harness — proves the backfill against real rows.
#
#   DATABASE_URL=postgres://user@host:port/THROWAWAY ./scripts/season_tags_migration_test.sh
#
# POINT THIS AT A THROWAWAY DATABASE. It creates the pre-migration schema
# from scratch and will collide with anything real. Never Robes_p0.
#
# Three phases:
#   1. fixture -> migration -> assertions
#   2. re-run the migration -> assertions again (idempotency)
#   3. POOLED-SESSION SIMULATION: every statement in its OWN psql session,
#      which is how the Supabase SQL editor executes a script (it pools
#      connections, so consecutive statements can land on different
#      backends). Then assertions again.
#
# Phase 3 exists because the migration has already been broken twice by
# assuming statements share context, and neither failure was visible in a
# single psql session:
#   - a data-modifying CTE cannot see its own inserts (0 links, silent);
#   - a temp table does not survive between statements in the editor
#     (`relation "_adr002_wear" does not exist`, hit on Robes_p0).
# Any session-local construct — temp table, SET, prepared statement — will
# fail phase 3. That is the point.
set -euo pipefail
: "${DATABASE_URL:?set DATABASE_URL to a throwaway database}"
here="$(cd "$(dirname "$0")/.." && pwd)"
mig="$here/supabase/season_tags_migration.sql"

echo "── 1 · fixture ──"
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f "$here/scripts/season_tags_fixture.sql"
echo "── 1 · migration 17 ──"
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f "$mig"
echo "── 1 · assertions ──"
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f "$here/scripts/season_tags_assert.sql"

echo "── 2 · re-run (idempotency) ──"
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f "$mig"
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f "$here/scripts/season_tags_assert.sql"

if command -v python3 >/dev/null 2>&1; then
  echo "── 3 · pooled-session simulation ──"
  tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
  n=$(python3 "$here/scripts/sql_split.py" "$mig" "$tmp")
  for f in "$tmp"/*.sql; do
    psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f "$f"
  done
  echo "   $n statements, each in its own session"
  psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f "$here/scripts/season_tags_assert.sql"
else
  echo "── 3 · SKIPPED (needs python3) ──"
fi
echo "── all green ──"
