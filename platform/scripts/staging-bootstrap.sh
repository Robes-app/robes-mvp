#!/usr/bin/env bash
# One-off staging bootstrap for the Supabase database, Vercel env secrets and AWS secrets.
# Run it yourself (it writes secrets); nothing it handles is printed or saved to disk.
#   Needs: AWS credentials for the staging account in the environment, `vercel` logged in with
#   access to the codu team, psql, and the repo linked (`vercel link --project robes-app`).
#   Usage (from platform/):  bash scripts/staging-bootstrap.sh
set -euo pipefail

REF="${SUPABASE_REF:-ebqaolcwhcqtuvkluubu}"
POOLER="${SUPABASE_POOLER:-aws-1-eu-west-1.pooler.supabase.com}"
SCOPE="${VERCEL_SCOPE:-codu}"
ENV="robes-staging"
export AWS_REGION="${AWS_REGION:-eu-west-1}"
cd "$(dirname "$0")/.."

read -rsp "Supabase postgres password: " DB_PASSWORD && echo
ADMIN_URL="postgresql://postgres:${DB_PASSWORD}@db.${REF}.supabase.co:5432/postgres?sslmode=require"

echo "1/5 migrating the database"
DATABASE_ADMIN_URL="$ADMIN_URL" pnpm --silent db:migrate

echo "2/5 giving robes_app (the API/worker role) a login"
APP_PW="$(openssl rand -hex 24)"
psql "$ADMIN_URL" -q -v ON_ERROR_STOP=1 -c "alter role robes_app login password '${APP_PW}';"
# Transaction pooler: short-lived serverless connections; node-postgres needs no named statements.
DATABASE_URL="postgresql://robes_app.${REF}:${APP_PW}@${POOLER}:6543/postgres?sslmode=require"
psql "$DATABASE_URL" -qAtc "select 'robes_app connects';"

vercel_secret() { # name value
  printf '%s' "$2" | vercel env add "$1" production --scope "$SCOPE" --sensitive --force >/dev/null
  echo "   vercel: $1"
}
aws_secret() { # name value
  aws secretsmanager put-secret-value --secret-id "${ENV}/$1" --secret-string "$2" >/dev/null
  echo "   aws: ${ENV}/$1"
}
aws_read() { aws secretsmanager get-secret-value --secret-id "${ENV}/$1" --query SecretString --output text; }

echo "3/5 app secrets"
vercel_secret DATABASE_URL "$DATABASE_URL"
aws_secret database/url "$DATABASE_URL"
vercel_secret BETTER_AUTH_SECRET "$(openssl rand -base64 48 | tr -d '\n')"
UNSUB="$(openssl rand -base64 48 | tr -d '\n')"
vercel_secret UNSUB_HMAC_KEY "$UNSUB"
aws_secret unsub/hmac-key "$UNSUB"

echo "4/5 keys CDK created (media signing, API user)"
vercel_secret MEDIA_CLOUDFRONT_PRIVATE_KEY "$(aws_read cloudfront/signing-key)"
API_KEY_JSON="$(aws_read api/aws-access-key)"
vercel_secret ROBES_AWS_ACCESS_KEY_ID "$(printf '%s' "$API_KEY_JSON" | python3 -c 'import json,sys;print(json.load(sys.stdin)["accessKeyId"],end="")')"
vercel_secret ROBES_AWS_SECRET_ACCESS_KEY "$(printf '%s' "$API_KEY_JSON" | python3 -c 'import json,sys;print(json.load(sys.stdin)["secretAccessKey"],end="")')"

echo "5/5 Gemini for the workers (from the repo-root .env, if present)"
GEMINI="$(grep -E '^GEM(I|E)NI_API_KEY=' ../.env 2>/dev/null | head -1 | cut -d= -f2- | tr -d "\"' " || true)"
if [ -n "$GEMINI" ]; then aws_secret gemini/api-key "$GEMINI"; else echo "   skipped: no GEMINI_API_KEY in ../.env"; fi

echo "Done. Deploy with: (cd .. && vercel deploy --prod --scope $SCOPE)"
