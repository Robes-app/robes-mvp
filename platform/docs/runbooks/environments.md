# Runbook — Environments

What to create, per environment, before the first staging/production deploy. Background: `../infrastructure.md` §1–§3, §7, §11, `../security.md` SEC-70..74, ADR-019 (app data in schema `app`, role `robes_app`) and ADR-020 (managed Postgres + Better Auth; no Supabase). **No secret values go in this file or anywhere in git**: only IDs, names and where each value lives.

Environments: `dev` (laptop, no cloud accounts), `staging`, `production`. Each cloud environment gets its **own** account/project in every provider (SEC-70).

## 1. ID register

Fill in as resources are created. IDs are not secrets; keys and passwords are.

| Item | Staging | Production | Where it's used |
|---|---|---|---|
| Postgres host (Supabase DB-only / Neon / RDS, EU) | `<host>` / `<project-id>` | `<host>` / `<project-id>` (PITR on) | `DATABASE_URL`, `MIGRATION_DATABASE_URL` |
| AWS account ID | `<stg-account-id>` | `<prod-account-id>` | GitHub env var `AWS_ACCOUNT_ID` |
| GithubDeployRole ARN | `arn:aws:iam::<stg>:role/robes-staging-github-deploy` | `arn:aws:iam::<prod>:role/robes-prod-github-deploy` | GitHub env var `AWS_DEPLOY_ROLE_ARN` |
| VercelApiRole ARN | `arn:aws:iam::<stg>:role/robes-staging-vercel-api` | `arn:aws:iam::<prod>:role/robes-prod-vercel-api` | Vercel `AWS_ROLE_ARN` |
| Media bucket | `robes-staging-media` | `robes-prod-media` | Vercel `MEDIA_BUCKET` |
| Media domain / CloudFront ID | `media.staging.byrobes.com` / `<dist-id>` | `media.byrobes.com` / `<dist-id>` | Vercel `MEDIA_PUBLIC_ORIGIN` (`https://` + domain) |
| CloudFront public key ID | `<K…>` | `<K…>` | Vercel `MEDIA_CLOUDFRONT_KEY_PAIR_ID` |
| ACM cert (us-east-1) ARN | `<arn>` | `<arn>` | GitHub env var `MEDIA_CERT_ARN` |
| Vercel team slug / project ID | `<team>` / `<prj_…>` | same project | GitHub var `VERCEL_TEAM_SLUG` |
| Apple Services ID / Team ID / Key ID | `<com.byrobes.web.staging>` / `<team>` / `<key>` | `<com.byrobes.web>` / `<team>` / `<key>` | Better Auth (§3) |
| Google OAuth client ID | `<id>.apps.googleusercontent.com` | `<id>.apps.googleusercontent.com` | Better Auth (§3) |
| Upstash database | `robes-staging` (`eu-west-1`) | `robes-prod` (`eu-west-1`) | Vercel env |
| GCP project | `robes-staging` | `robes-prod` | Gemini key owner |
| Sentry projects | `robes-web-staging`, `robes-workers-staging` | `robes-web`, `robes-workers`, `robes-mobile` | DSNs |
| PostHog (EU) project ID | `<id>` | `<id>` | `NEXT_PUBLIC_POSTHOG_KEY` |
| Resend domain | `staging.mail.byrobes.com` | `mail.byrobes.com` | `RESEND_FROM`, OTP emails |
| EAS channel | `preview` | `production` | mobile builds |

## 2. Postgres (per environment)

The code is host-agnostic (ADR-020): any managed Postgres ≥ 16 in an EU region (`eu-west-1` preferred, next to Vercel `dub1` and AWS). Candidates: Supabase used as a database only, Neon, or RDS.

1. Create the database `robes-staging` / `robes-prod`. Production: **PITR on** (≥ 7 days) and automated daily backups; staging: daily backups and a spend cap if the host has one.
2. TLS required on every connection (`sslmode=require` or stricter). Use the host's **pooled** endpoint (transaction mode) for runtime URLs.
3. Create two logins. Generate each password with `openssl rand -base64 36 | tr -d '/+=' | cut -c1-40`; run the SQL via `psql` as the host's admin user, never in a migration or a web SQL console history:
   - **Migration role** (owns the schema; used only by CI `pnpm db:migrate`): for example `create role robes_migrator login password '<pw>';` plus ownership/`create` on the database as your host requires.
   - **`robes_app`** (runtime; the role and its grants come from migrations): `alter role robes_app with login password '<pw>';`
4. Build the URLs:
   - `MIGRATION_DATABASE_URL=postgresql://robes_migrator:<pw>@<direct-host>:5432/<db>?sslmode=require` (direct, not pooled: migrations need session features).
   - `DATABASE_URL=postgresql://robes_app:<pw>@<pooled-host>:<port>/<db>?sslmode=require`.
5. Store them **only** here: `MIGRATION_DATABASE_URL` → GitHub environment secret (§5); `DATABASE_URL` → Vercel env (sensitive, §6) **and** Secrets Manager `robes-<env>/database/url` (§4 step 7).
6. First migration from a laptop (later CI does it): `cd platform && DATABASE_URL="$MIGRATION_DATABASE_URL" pnpm db:migrate`.

## 3. Better Auth (runs inside the Next app)

Sessions live in Postgres; sign-in is email OTP (passwordless) plus Apple and Google.

1. `BETTER_AUTH_SECRET`: `openssl rand -base64 48`. Different per environment. Store in Vercel env (sensitive) and in Secrets Manager `robes-<env>/auth/better-auth-secret` as the backup of record.
2. `BETTER_AUTH_URL`: `https://staging.byrobes.com` / `https://app.byrobes.com`.
3. **Apple** (Apple Developer → Certificates, IDs & Profiles):
   1. App ID with *Sign in with Apple* enabled (the iOS bundle ID).
   2. **Services ID** for web (e.g. `com.byrobes.web.staging`), Sign in with Apple → configure: primary App ID from step 1, domains `staging.byrobes.com`, return URL `https://staging.byrobes.com/api/auth/callback/apple` (production: `app.byrobes.com`).
   3. **Keys** → new key with Sign in with Apple → download the `.p8` once (it can't be re-downloaded). Note the Key ID and your Team ID.
   4. Store `{"clientId":"<services-id>","teamId":"…","keyId":"…","privateKey":"<p8 contents>"}` in `robes-<env>/auth/apple`, and the same values in Vercel env `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`. Delete the downloaded `.p8` afterwards.
4. **Google** (Google Cloud console of the environment's project → APIs & Services):
   1. OAuth consent screen: external, app name Robes, support email, scopes `openid email profile`; publish (production).
   2. Credentials → OAuth client ID → *Web application*; authorized JavaScript origin `https://staging.byrobes.com`; redirect URI `https://staging.byrobes.com/api/auth/callback/google` (production: `app.byrobes.com`). Add iOS/Android client IDs for the native app when mobile sign-in lands.
   3. Store `{"clientId":"…","clientSecret":"…"}` in `robes-<env>/auth/google` and Vercel env `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
5. **Email OTP**: sent through Resend (§9) from `no-reply@<mail domain>`; uses `RESEND_API_KEY` in Vercel.
6. Allowed callback URLs are exactly `https://<app>/api/auth/callback/{apple,google}`; add a preview-domain callback only if previews must sign in.

## 4. AWS (Organizations)

1. In the management account: AWS Organizations → create accounts `robes-staging` and `robes-prod` (distinct root emails). Enable IAM Identity Center; engineers get `AdministratorAccess` on staging and a break-glass-only permission set on production.
2. Per account, enable: CloudTrail (org trail from management), Cost Explorer, IAM Access Analyzer, S3 Block Public Access at account level.
   Service Quotas → Lambda → **Concurrent executions**: request 1000. New accounts start at 10, and the reserved concurrency on `generateFn` (`workers.generateReservedConcurrency`) fails to deploy until the quota leaves 10 unreserved.
3. Bootstrap CDK once per account (admin credentials via Identity Center):
   ```bash
   aws sso login --profile robes-staging
   cd platform/infra
   pnpm exec cdk bootstrap aws://<stg-account-id>/eu-west-1 --profile robes-staging
   ```
4. Request the media certificate in **us-east-1** (ACM → public cert → `media.staging.byrobes.com`), validate by DNS, record the ARN in §1.
5. Create the CloudFront signing key pair (`key-rotation.md` §CloudFront, steps 1–2) and commit the **public** key as `platform/infra/config/keys/<stage>.cloudfront.pub.pem` (or set GitHub var `CLOUDFRONT_PUBLIC_KEY`). Without it, synth warns and uses a placeholder key, so signed media stays unreadable (fail closed).
6. First deploy from a laptop (creates the OIDC roles CI needs afterwards):
   ```bash
   export ROBES_STAGING_AWS_ACCOUNT_ID=<stg-account-id> ROBES_VERCEL_TEAM_SLUG=<team>
   export ROBES_STAGING_MEDIA_DOMAIN=media.staging.byrobes.com ROBES_STAGING_MEDIA_CERT_ARN=<arn>
   pnpm exec cdk deploy --all -c stage=staging --profile robes-staging
   ```
   If the account already has a GitHub or Vercel OIDC provider, set `ROBES_<STAGE>_GITHUB_OIDC_PROVIDER_ARN` / `ROBES_<STAGE>_VERCEL_OIDC_PROVIDER_ARN` to import it instead.
7. Set every secret value (`key-rotation.md` §Set a value). Secrets are created with random placeholders, all under `robes-<env>/`: `database/url`, `auth/better-auth-secret`, `auth/apple`, `auth/google`, `gemini/api-key`, `resend/api-key`, `resend/webhook-secret`, `cloudfront/signing-key`, `fal/api-key`, `expo/access-token`, `unsub/hmac-key`.
8. `sharp` for RenditionFn needs no setup: CDK installs the linux-arm64 build (version pinned in `packages/media/package.json`) into the function asset during bundling (`infra/src/lib/native-modules.ts`). Prebuilt sharp can't decode HEIC; see README → Media.
9. DNS: `media.staging` CNAME → the `MediaDistributionDomain` stack output.
10. Confirm the SNS email subscription for alerts/budgets (`ROBES_<STAGE>_ALERT_EMAIL`). Optional: AWS Chatbot → Slack `#robes-alerts` subscribed to `robes-<env>-alerts`.

## 5. GitHub

1. Settings → Environments: create `staging` and `production`. Production: required reviewer, deployment branches limited to `platform` (later the trunk).
2. Per environment **variables**: `AWS_ACCOUNT_ID`, `AWS_DEPLOY_ROLE_ARN`, `VERCEL_TEAM_SLUG`, `APP_URL` (`https://staging.byrobes.com` / `https://app.byrobes.com`), `MEDIA_DOMAIN`, `MEDIA_CERT_ARN`, `CLOUDFRONT_PUBLIC_KEY` (optional if committed), `ALERT_EMAIL`, `BUDGET_EMAIL`.
3. Per environment **secrets**: `MIGRATION_DATABASE_URL` (§2 step 4; migration role, never `robes_app`).
4. Renovate: install the Renovate app and add a root `renovate.json` containing `{ "extends": ["local>Robes-app/robes-mvp//platform/renovate.json"] }` (Renovate only reads config at the repo root).

## 6. Vercel

1. Project `robes-app`, root directory `platform/app`, framework Next.js, Node 24, Fluid compute on, function region `dub1`.
2. Ignored build step: `npx turbo-ignore @robes/app`.
3. Domains: `staging.byrobes.com` → Preview (branch `platform`), `app.byrobes.com` → Production.
4. Settings → Security → **OIDC Federation: Team issuer**. The IAM trust expects `sub = owner:<team>:project:robes-app:environment:<preview|production>`.
5. Deployment protection on previews; Firewall rate-limit rule on `/api/v1/*`; BotID on auth + waitlist.
6. Spend management: set a monthly cap and alert.
7. Env vars per environment (mark every secret **Sensitive**). The zod schemas in `packages/config` are the source of truth; update this table when they change.

| Variable | Notes |
|---|---|
| `APP_ENV` | `staging` / `production` |
| `DATABASE_URL` | sensitive; `robes_app` pooled URL (§2) |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` | §3 |
| `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` | §3; private key sensitive |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | §3; secret sensitive |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | token sensitive |
| `AWS_REGION`, `AWS_ROLE_ARN` | `eu-west-1`, VercelApiRole ARN (OIDC; no access keys) |
| `JOBS_INTERACTIVE_QUEUE_URL`, `JOBS_BATCH_QUEUE_URL`, `FETCH_QUEUE_URL` | Queues stack |
| `MEDIA_BUCKET`, `MEDIA_S3_REGION` | `robes-<env>-media`, `eu-west-1`. Uploads are presigned with the `AWS_ROLE_ARN` role; never set `MEDIA_S3_ACCESS_KEY_ID`/`MEDIA_S3_SECRET_ACCESS_KEY` outside dev (config refuses them) |
| `MEDIA_PUBLIC_ORIGIN` | CloudFront origin, e.g. `https://media.byrobes.com` (https required). Added to CSP `img-src`/`connect-src`; the bucket's regional S3 origin is added to `connect-src` for browser PUTs |
| `MEDIA_CLOUDFRONT_KEY_PAIR_ID`, `MEDIA_CLOUDFRONT_PRIVATE_KEY` | required outside dev. The private key is sensitive: copy the PEM from `cloudfront/signing-key` (single line with `\n` escapes is fine) |
| `MEDIA_COOKIE_DOMAIN` | parent domain shared by the app and media host (`staging.byrobes.com` / `byrobes.com`) so web signed cookies reach CloudFront |
| `GEMINI_API_KEY` | only if the API makes sub-3 s model calls; otherwise workers only |
| `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `RESEND_FROM` | OTP + product email |
| `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` | auth token is build-time (source maps) |
| `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | `https://eu.i.posthog.com` |
| `MIN_APP_VERSION` | 426 gate for old native builds |

Local dev (`app/.env.example`) uses MinIO instead: `MEDIA_S3_ENDPOINT=http://localhost:59000` plus the MinIO root credentials, no CloudFront variables (images are presigned MinIO GETs). `pnpm media:setup` creates the buckets.

## 7. Workers (Lambda) environment

Set by CDK; listed so nobody adds them by hand. Plain env: `APP_ENV`, `MEDIA_BUCKET`, and `*_QUEUE_URL` for queues a function may send to. Secrets arrive as ARNs (`<NAME>_SECRET_ARN`) and are read at cold start:

| Function | Secret ARNs |
|---|---|
| generate | `DATABASE_URL`, `GEMINI_API_KEY`, `FAL_API_KEY` |
| batch | `DATABASE_URL`, `GEMINI_API_KEY` |
| notify | `DATABASE_URL`, `RESEND_API_KEY`, `EXPO_ACCESS_TOKEN`, `UNSUB_HMAC_KEY` |
| maintenance | `DATABASE_URL` (retention and deletion run here; there is no pg_cron) |
| rendition | `DATABASE_URL` |
| fetch | none (SEC-40); results go back via `JOBS_INTERACTIVE_QUEUE_URL` |

## 8. Upstash

Create Redis databases `robes-staging` and `robes-prod` in **eu-west-1**, TLS on, eviction off. Copy the REST URL/token into Vercel (§6). Set a monthly budget alert.

## 9. Resend

1. Add domains `staging.mail.byrobes.com` and `mail.byrobes.com`; publish SPF, DKIM and DMARC (`p=quarantine` to start).
2. Inbound: MX for `in.byrobes.com` (receipts) on production only.
3. One API key per environment with **sending access to its domain only** (used for OTP sign-in codes and product email); one webhook per environment with its own signing secret.

## 10. Google Cloud (Gemini)

1. Projects `robes-staging` and `robes-prod` under the org, billing linked (also used for the Google OAuth client, §3).
2. Enable the Generative Language API; create an API key restricted to that API only.
3. Billing → Budgets: monthly budget with alerts at 50/80/100 %.
4. APIs → Quotas: cap requests/min and images/day per key (staging low).
5. Put the key in Secrets Manager `robes-<env>/gemini/api-key`.

## 11. Observability and analytics

- **Sentry**: projects `robes-web`, `robes-workers`, `robes-mobile` (plus staging twins, or one project each with `environment` tags). CI auth token (`project:releases`, `org:read`) for source maps.
- **PostHog**: **EU cloud** projects `Robes Staging` and `Robes Production`; no autocapture of inputs; replay masking on.
- **Uptime**: Checkly checks on `/api/v1/health` for both environments.

## 12. Mobile (EAS)

EAS project linked to `platform/mobile`; channels `preview` (staging) and `production`. EAS env holds **public** values only (`EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_POSTHOG_KEY`). `expo/access-token` in Secrets Manager is the push-sending token for `notifyFn`.

## Checklist before the first deploy

- [ ] §1 filled in for the environment
- [ ] Postgres: PITR (prod), migration role + `robes_app` passwords set, URLs stored only in GitHub/Vercel/Secrets Manager
- [ ] Better Auth: secret, URL, Apple and Google clients with the exact callback URLs
- [ ] CDK bootstrapped; first `cdk deploy` from a laptop done; every secret value set
- [ ] GitHub environment vars/secrets set; deploy workflow green
- [ ] Vercel env complete; `/api/v1/health` returns `{"ok":true}`
- [ ] Budgets confirmed in AWS, GCP, Vercel, Upstash and the Postgres host
