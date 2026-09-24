# Runbook — Key rotation

Rotate on schedule (every 90 days for API keys, yearly for the CloudFront key pair), on staff departure, and **immediately** on suspected leak. Always do staging first, then production. Never paste a value into chat, a ticket or git.

Conventions: `ENV=staging|prod`, `AWS_PROFILE=robes-$ENV`, secrets are named `robes-$ENV/<name>` (`../infrastructure.md` §4.1).

## Set a value in Secrets Manager

```bash
aws secretsmanager put-secret-value --secret-id robes-$ENV/<name> \
  --secret-string file:///dev/stdin <<< "$VALUE"      # or file://key.pem for PEMs
```

Workers read secrets at cold start. Force new cold starts after any change:

```bash
for fn in generate batch notify maintenance rendition; do
  aws lambda update-function-configuration --function-name robes-$ENV-$fn \
    --description "secret rotated $(date -u +%FT%TZ)" >/dev/null
done
```

Vercel values: update in Project → Settings → Environment Variables, then **Redeploy** the latest deployment of that environment (env changes only apply to new deployments).

## Database: `robes_app` password (`DATABASE_URL`)

1. Generate: `PW=$(openssl rand -base64 36 | tr -d '/+=' | cut -c1-40)`.
2. As `postgres` (psql, not the SQL editor): `alter role robes_app with password '<PW>';`. Existing pooled connections keep working; new ones need the new password, so move fast through steps 3–4.
3. Update Secrets Manager `robes-$ENV/database/url` with the new pooler URL, then force Lambda cold starts (above).
4. Update Vercel `DATABASE_URL` and redeploy.
5. Verify: `/api/v1/health` ok; a fake/real job completes; no `password authentication failed` in Sentry/CloudWatch for 10 min. `unset PW`.

## Supabase service-role / JWT signing keys

1. Dashboard → Settings → API keys: create a new **secret** key; update Vercel `SUPABASE_SERVICE_ROLE_KEY` + Secrets Manager `robes-$ENV/supabase/service-role`; redeploy + cold-start Lambdas; then revoke the old key.
2. JWT signing key (asymmetric): Auth → Signing keys → **Create standby key** → wait ≥ 20 min (JWKS caches) → **Rotate** (standby becomes current) → after the longest session TTL, **Revoke** the old key. The API verifies via JWKS, so no deploy is needed.

## Gemini API key

1. GCP → APIs & Services → Credentials → create a new key restricted to the Generative Language API (same quotas).
2. Put it in `robes-$ENV/gemini/api-key` (and Vercel `GEMINI_API_KEY` if used there); cold-start Lambdas.
3. Watch `generation_calls` for errors for 15 min, then delete the old key.

## CloudFront signing key pair

Private key in `robes-$ENV/cloudfront/signing-key`; public key in `infra/config/keys/<stage>.cloudfront.pub.pem` (or GitHub var `CLOUDFRONT_PUBLIC_KEY`).

1. Generate: `openssl genrsa -out cf.pem 2048 && openssl rsa -pubout -in cf.pem -out cf.pub.pem`.
2. Commit `cf.pub.pem` as the stage's public key file (public keys are not secrets). Deploy (`cdk deploy -c stage=<stage> '*/Media'` or the workflow). CDK replaces the key in the key group.
   To avoid a gap for URLs signed with the old key, rotate in two deploys: first add the new key alongside the old one (temporarily list both in `MediaStack`'s key group), switch signing, then remove the old key after the longest URL/cookie lifetime (12 h).
3. `put-secret-value --secret-id robes-$ENV/cloudfront/signing-key --secret-string file://cf.pem`; update Vercel `CLOUDFRONT_KEY_PAIR_ID` to the new public key ID (`MediaStack` → `AWS::CloudFront::PublicKey` physical ID); redeploy.
4. `shred -u cf.pem` (or `rm -P` on macOS). Verify a signed media URL loads and an unsigned one returns 403.

## Resend API key and webhook secret

1. Resend → API keys → create a key with sending access to the environment's domain only.
2. Update Secrets Manager `robes-$ENV/resend/api-key` + Vercel `RESEND_API_KEY`; cold-start `notify`; redeploy Vercel.
3. Webhook secret: roll it in Resend → Webhooks, update `robes-$ENV/resend/webhook-secret` + Vercel `RESEND_WEBHOOK_SECRET` within the same minute (events in between fail signature and are retried by Resend).
4. Send a test email; delete the old key.

## fal, Expo access token, unsubscribe HMAC

- **fal / Expo**: create the new token in the provider console, `put-secret-value`, cold-start, revoke old.
- **`unsub/hmac-key`**: rotating invalidates every unsubscribe link already emailed. Only rotate on leak; accept that old links show "link expired, manage in settings".

## Upstash token

Upstash console → database → **Reset password**; update Vercel `UPSTASH_REDIS_REST_TOKEN` and redeploy immediately (rate limiting fails closed until then).

## After any rotation

Record date, who, and which environments in the ops log; confirm alarms quiet for 30 min.
