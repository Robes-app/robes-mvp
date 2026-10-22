#!/usr/bin/env bash
# Applies pending migrations (db/migrations) to the staging database, then lists what is applied.
# Run it yourself: it asks for the Supabase postgres password and never prints or saves it.
#   Needs: psql and the repo's dev dependencies (pnpm install).
#   Usage (from platform/):  bash scripts/migrate-staging.sh
# Production migrations run only through the platform-deploy-prod workflow (reviewer approval).
set -euo pipefail

REF="${SUPABASE_REF:-ebqaolcwhcqtuvkluubu}"
cd "$(dirname "$0")/.."

read -rsp "Staging Supabase postgres password: " DB_PASSWORD && echo
ADMIN_URL="postgresql://postgres:${DB_PASSWORD}@db.${REF}.supabase.co:5432/postgres?sslmode=require"

echo "Pending before:"
pnpm --silent exec dbmate --url "$ADMIN_URL" --migrations-dir db/migrations --no-dump-schema status |
  grep '^\[ \]' || echo "  none"
DATABASE_ADMIN_URL="$ADMIN_URL" pnpm --silent db:migrate
echo "Staging is up to date."
