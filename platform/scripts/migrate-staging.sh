#!/usr/bin/env bash
# Applies pending migrations (db/migrations) to the staging database, then lists what is applied.
# Run it yourself in a terminal window: it asks for the Supabase postgres password and never prints
# or saves it. (Claude Code's `!` prefix has no keyboard input, so the password prompt gets nothing.)
#   Needs: psql and the repo's dev dependencies (pnpm install).
#   Usage (from platform/):  bash scripts/migrate-staging.sh
# Production migrations run only through the platform-deploy-prod workflow (reviewer approval).
set -euo pipefail

REF="${SUPABASE_REF:-ebqaolcwhcqtuvkluubu}"
cd "$(dirname "$0")/.."

if [ ! -t 0 ]; then
  echo "This needs a real terminal to ask for the password. Open Terminal, cd to platform/, and run: bash scripts/migrate-staging.sh" >&2
  exit 1
fi

read -rsp "Staging Supabase postgres password: " DB_PASSWORD && echo
if [ -z "$DB_PASSWORD" ]; then
  echo "No password entered; nothing was changed." >&2
  exit 1
fi
# The password can hold characters that break a URL (@, /, #), so encode it.
ENC=$(DB_PASSWORD="$DB_PASSWORD" node -e 'process.stdout.write(encodeURIComponent(process.env.DB_PASSWORD))')
ADMIN_URL="postgresql://postgres:${ENC}@db.${REF}.supabase.co:5432/postgres?sslmode=require"

echo "Pending before:"
STATUS=$(pnpm --silent exec dbmate --url "$ADMIN_URL" --migrations-dir db/migrations --no-dump-schema status)
grep '^\[ \]' <<<"$STATUS" || echo "  none"
DATABASE_ADMIN_URL="$ADMIN_URL" pnpm --silent db:migrate
echo "Staging is up to date."
