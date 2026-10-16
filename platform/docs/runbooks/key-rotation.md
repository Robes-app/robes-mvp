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
for fn in generate batch notify maintenance rendition; do   # functions holding the rotated secret
  aws lambda update-function-configuration --function-name robes-$ENV-$fn \
    --description "secret rotated $(date -u +%FT%TZ)" >/dev/null
done
```

Vercel values: update in Project → Settings → Environment Variables, then **Redeploy** the latest deployment of that environment (env changes only apply to new deployments).

## Database: `robes_app` password (`DATABASE_URL`)

1. Generate: `PW=$(openssl rand -base64 36 | tr -d '/+=' | cut -c1-40)`.
2. As the host's admin user via `psql` (not a web console): `alter role robes_app with password '<PW>';`. Open pooled connections keep working; new ones need the new password, so move through steps 3–4 quickly.
3. Update Secrets Manager `robes-$ENV/database/url` with the new URL, then force Lambda cold starts (above).
4. Update Vercel `DATABASE_URL` and redeploy.
5. Verify: `/api/v1/health` ok; a job completes; no `password authentication failed` in Sentry/CloudWatch for 10 min. `unset PW`.

The migration role (`MIGRATION_DATABASE_URL`, GitHub environment secret) rotates the same way: `alter role robes_migrator with password …`, then update the GitHub secret. Nothing else uses it.

## Better Auth secret (`BETTER_AUTH_SECRET`)

Rotating it **signs everyone out** (sessions and cookies are signed with it) and invalidates in-flight OTP codes. Do it on leak, or in a quiet window with a heads-up.

1. `openssl rand -base64 48` → Vercel `BETTER_AUTH_SECRET` (sensitive) → redeploy.
2. Update the backup of record: `robes-$ENV/auth/better-auth-secret`.
3. Optionally clear stale rows: `delete from app.<session table>;` (sessions are unusable anyway).
4. Verify sign-in with email OTP, Apple and Google.

## Apple Sign in with Apple key

Apple allows two active keys per Services ID, so rotate without downtime:

1. Apple Developer → Keys → new key with Sign in with Apple, same primary App ID. Download the `.p8`; note the Key ID.
2. Update `robes-$ENV/auth/apple` (`keyId`, `privateKey`) and Vercel `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`; redeploy.
3. Verify Apple sign-in on web (and iOS once native uses it); then **revoke** the old key in Apple Developer. Delete the local `.p8`.

## Google OAuth client secret

1. Google Cloud → APIs & Services → Credentials → the web client → **Add secret** (the old one stays valid).
2. Update `robes-$ENV/auth/google` and Vercel `GOOGLE_CLIENT_SECRET`; redeploy; verify Google sign-in.
3. Disable, then delete, the old secret.

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

## Vercel API access key (`robes-<env>-api`, ADR-021)

Cadence: every **90 days**, on staff departure, or immediately if the AccessDenied alert fires unexpectedly or the key may have leaked. IAM allows two keys per user, which makes this zero-downtime. Keys are declared in `infra/config/<stage>.ts` → `api.accessKeys`; the **last** entry is the one CDK writes to `robes-<env>/api/aws-access-key`.

1. Add a second key: `accessKeys: [{ serial: 1, status: 'Active' }, { serial: 2, status: 'Active' }]`. Deploy (PR → workflow, or `pnpm cdk deploy -c stage=<stage> '*/Identity'`). Both keys now work; the secret holds key 2.
2. Copy key 2 into Vercel `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (`environments.md` §6 step 8) and **redeploy** the environment.
3. Confirm the old key is idle: `aws iam get-access-key-last-used --access-key-id <old-id>`. Wait until its `LastUsedDate` stops moving (give in-flight deployments ~1 h).
4. Deactivate: `{ serial: 1, status: 'Inactive' }` and deploy. If anything breaks, flip it back to `Active` and deploy (the key is unchanged).
5. After a day with no errors, delete it: remove the `serial: 1` entry and deploy. Record the rotation date.

**Leak (emergency):** skip the waiting. `aws iam update-access-key --user-name robes-<env>-api --access-key-id <leaked> --status Inactive` right away, then do steps 1–2 and 5, and reconcile the config (`status: 'Inactive'`) so the next deploy doesn't re-activate it. Review CloudTrail for calls by that key (`lookup-events --lookup-attributes AttributeKey=AccessKeyId,AttributeValue=<leaked>`).

Never create keys by hand in the console for this user: CDK would not know about them and the secret would drift. If you must (CDK unavailable), create with `aws iam create-access-key`, put it in Vercel, and bring the config back in line afterwards.

## SES (email)

There is no API key: the API sends with the IAM user above, and `notifyFn` with its role. Easy DKIM rotates its signing keys automatically. If `MAIL_FROM` changes, update Vercel env and `email.fromAddress` in `infra/config/<stage>.ts` together (the IAM condition only allows `*@<email.domain>`).

## fal, Expo access token, unsubscribe HMAC

- **fal / Expo**: create the new token in the provider console, `put-secret-value`, cold-start, revoke old.
- **`unsub/hmac-key`**: rotating invalidates every unsubscribe link already emailed. Only rotate on leak; accept that old links show "link expired, manage in settings".

## Upstash token

Upstash console → database → **Reset password**; update Vercel `UPSTASH_REDIS_REST_TOKEN` and redeploy immediately (rate limiting fails closed until then).

## After any rotation

Record date, who, and which environments in the ops log; confirm alarms quiet for 30 min.
