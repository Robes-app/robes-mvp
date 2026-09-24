# Runbook — Environments

What to create, per environment, before the first staging/production deploy. Normative background: `../infrastructure.md` §1–§3, §7, §11 and `../security.md` SEC-70..74. **No secret values go in this file or anywhere in git** — only IDs, names and where the value lives.

Environments: `dev` (laptop, no cloud accounts), `staging`, `production`. Each cloud environment gets its **own** account/project in every provider (SEC-70).

## 1. ID register

Fill in as resources are created. IDs are not secrets; keys and passwords are.

| Item | Staging | Production | Where it's used |
|---|---|---|---|
| AWS account ID | `<stg-account-id>` | `<prod-account-id>` | GitHub env var `AWS_ACCOUNT_ID` |
| GithubDeployRole ARN | `arn:aws:iam::<stg>:role/robes-staging-github-deploy` | `arn:aws:iam::<prod>:role/robes-prod-github-deploy` | GitHub env var `AWS_DEPLOY_ROLE_ARN` |
| VercelApiRole ARN | `arn:aws:iam::<stg>:role/robes-staging-vercel-api` | `arn:aws:iam::<prod>:role/robes-prod-vercel-api` | Vercel env `AWS_ROLE_ARN` |
| Media bucket | `robes-staging-media` | `robes-prod-media` | Vercel `MEDIA_BUCKET` |
| Media domain / CloudFront ID | `media.staging.byrobes.com` / `<dist-id>` | `media.byrobes.com` / `<dist-id>` | Vercel `MEDIA_BASE_URL` |
| CloudFront key pair ID | `<K…>` | `<K…>` | Vercel `CLOUDFRONT_KEY_PAIR_ID` |
| ACM cert (us-east-1) ARN | `<arn>` | `<arn>` | GitHub env var `MEDIA_CERT_ARN` |
| Supabase project ref | `<ref>` (`robes-staging`) | `<ref>` (`robes-prod`) | GitHub env var `SUPABASE_PROJECT_REF` |
| Vercel team slug / project ID | `<team>` / `<prj_…>` | same project | GitHub var `VERCEL_TEAM_SLUG` |
| Upstash database | `robes-staging` (`eu-west-1`) | `robes-prod` (`eu-west-1`) | Vercel env |
| GCP project | `robes-staging` | `robes-prod` | Gemini key owner |
| Sentry projects | `robes-web-staging`, `robes-workers-staging` | `robes-web`, `robes-workers`, `robes-mobile` | DSNs |
| PostHog (EU) project ID | `<id>` | `<id>` | `NEXT_PUBLIC_POSTHOG_KEY` |
| Resend domain | `staging.mail.byrobes.com` | `mail.byrobes.com` | `RESEND_FROM` |
| EAS channel | `preview` | `production` | mobile builds |

## 2. Supabase (per environment)

1. Create project `robes-staging` / `robes-prod`, region **eu-west-1** (matches Vercel `dub1` and AWS), plan Pro.
2. Auth → Signing keys: **migrate to asymmetric JWT signing keys** (ES256), then revoke the legacy HS256 secret once nothing uses it. The API verifies via JWKS (`packages/api`).
3. Database → Backups: enable **PITR** (production: 7 days minimum; staging: daily backups are enough). Note the retention in §1.
4. Staging only: Settings → Billing → enable **spend cap**.
5. Apply migrations from CI (`supabase db push` in the deploy workflow), never from the SQL editor. First time, from a laptop:
   ```bash
   cd platform
   pnpm supabase link --project-ref <ref>
   pnpm supabase db push
   ```
6. Create the `robes_app` login (ADR-019; the role itself comes from migrations). Generate a password and set it as `postgres` via psql — **never** in a migration or the SQL editor history:
   ```bash
   PW=$(openssl rand -base64 36 | tr -d '/+=' | cut -c1-40)
   psql "postgresql://postgres:<postgres-password>@db.<ref>.supabase.co:5432/postgres" \
     -c "alter role robes_app with login password '$PW'"
   ```
   Build the pooler URL (Settings → Database → Connection pooling, transaction mode, port 6543):
   `postgresql://robes_app.<ref>:$PW@aws-0-eu-west-1.pooler.supabase.com:6543/postgres`.
   Store it **only** in Vercel env `DATABASE_URL` (sensitive) and in Secrets Manager `robes-<env>/database/url` (§4 step 6). Then `unset PW`.
7. Auth → URL configuration: site URL `https://staging.byrobes.com` / `https://app.byrobes.com`; redirect URLs for the app plus the Expo scheme. Configure Google/Apple providers when ready.
8. Auth → SMTP: point at Resend (§8) so auth emails come from our domain.

## 3. AWS (Organizations)

1. In the management account: AWS Organizations → create accounts `robes-staging` and `robes-prod` (distinct root emails). Enable IAM Identity Center; give engineers `AdministratorAccess` on staging and a break-glass-only permission set on production.
2. Per account, enable: CloudTrail (org trail from management), Cost Explorer, IAM Access Analyzer, S3 Block Public Access at account level.
3. Bootstrap CDK once per account (admin credentials via Identity Center):
   ```bash
   aws sso login --profile robes-staging
   cd platform/infra
   pnpm exec cdk bootstrap aws://<stg-account-id>/eu-west-1 --profile robes-staging
   ```
4. Request the media certificate in **us-east-1** (ACM → public cert → `media.staging.byrobes.com`), validate by DNS, record the ARN in §1.
5. Create the CloudFront signing key pair (runbook `key-rotation.md` §CloudFront, steps 1–2), and commit the **public** key as `platform/infra/config/keys/<stage>.cloudfront.pub.pem` (or set GitHub var `CLOUDFRONT_PUBLIC_KEY`). Without it synth warns and uses a placeholder key: signed media stays unreadable (fail closed).
6. First deploy from a laptop (creates the OIDC roles CI needs afterwards):
   ```bash
   export ROBES_STAGING_AWS_ACCOUNT_ID=<stg-account-id> ROBES_VERCEL_TEAM_SLUG=<team>
   export ROBES_STAGING_MEDIA_DOMAIN=media.staging.byrobes.com ROBES_STAGING_MEDIA_CERT_ARN=<arn>
   pnpm exec cdk deploy --all -c stage=staging --profile robes-staging
   ```
   If the account already has a GitHub or Vercel OIDC provider, set `ROBES_<STAGE>_GITHUB_OIDC_PROVIDER_ARN` / `ROBES_<STAGE>_VERCEL_OIDC_PROVIDER_ARN` to import it instead.
7. Set every secret value (`key-rotation.md` §Set a value). Secrets are created with random placeholders: `database/url`, `gemini/api-key`, `supabase/service-role`, `supabase/url`, `resend/api-key`, `resend/webhook-secret`, `cloudfront/signing-key`, `fal/api-key`, `expo/access-token`, `unsub/hmac-key` (all under `robes-<env>/`).
8. `sharp` layer for RenditionFn: publish a linux-arm64 `sharp` layer and add its ARN to `workers.renditionLayerArns` in `infra/config/<stage>.ts` (until Task 8 decides to bundle it instead).
9. DNS: `media.staging` CNAME → the `MediaDistributionDomain` stack output.
10. Confirm the SNS email subscription for alerts/budgets (`ROBES_<STAGE>_ALERT_EMAIL`). Optional: AWS Chatbot → Slack `#robes-alerts` subscribed to `robes-<env>-alerts`.

## 4. GitHub

1. Settings → Environments: create `staging` and `production`. Production: required reviewer, deployment branches limited to `platform` (later the trunk).
2. Per environment **variables**: `AWS_ACCOUNT_ID`, `AWS_DEPLOY_ROLE_ARN`, `SUPABASE_PROJECT_REF`, `VERCEL_TEAM_SLUG`, `APP_URL` (`https://staging.byrobes.com` / `https://app.byrobes.com`), `MEDIA_DOMAIN`, `MEDIA_CERT_ARN`, `CLOUDFRONT_PUBLIC_KEY` (optional if committed), `ALERT_EMAIL`, `BUDGET_EMAIL`.
3. Per environment **secrets**: `SUPABASE_ACCESS_TOKEN` (a personal/CI token scoped to the org), `SUPABASE_DB_PASSWORD` (`postgres` password, for `db push`).
4. Renovate: install the Renovate app and add a root `renovate.json` containing `{ "extends": ["local>Robes-app/robes-mvp//platform/renovate.json"] }` (Renovate only reads config at the repo root).

## 5. Vercel

1. Project `robes-app`, root directory `platform/app`, framework Next.js, Node 24, Fluid compute on, function region `dub1`.
2. Ignored build step: `npx turbo-ignore @robes/app`.
3. Domains: `staging.byrobes.com` → Preview (branch `platform`), `app.byrobes.com` → Production.
4. Settings → Security → **OIDC Federation: Team issuer**. The IAM trust expects `sub = owner:<team>:project:robes-app:environment:<preview|production>`.
5. Deployment protection on previews; Firewall rate-limit rule on `/api/v1/*`; BotID on auth + waitlist.
6. Spend management: set a monthly cap and alert.
7. Env vars per environment (mark all secrets **Sensitive**). The zod schemas in `packages/config` are the source of truth; update this table when they change.

| Variable | Notes |
|---|---|
| `APP_ENV` | `staging` / `production` |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | public values |
| `SUPABASE_SERVICE_ROLE_KEY` | sensitive; auth admin + Realtime broadcast only |
| `DATABASE_URL` | sensitive; `robes_app` pooler URL (§2 step 6) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | sensitive token |
| `AWS_REGION`, `AWS_ROLE_ARN` | `eu-west-1`, VercelApiRole ARN (OIDC; no access keys) |
| `JOBS_INTERACTIVE_QUEUE_URL`, `JOBS_BATCH_QUEUE_URL`, `FETCH_QUEUE_URL` | from the Queues stack |
| `MEDIA_BUCKET`, `MEDIA_BASE_URL`, `CLOUDFRONT_KEY_PAIR_ID`, `CLOUDFRONT_SIGNING_KEY_SECRET_ARN` | private key is read from Secrets Manager at runtime |
| `GEMINI_API_KEY` | only if the API makes sub-3 s model calls; otherwise workers only |
| `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET` | sensitive |
| `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` | auth token: build-time source maps |
| `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | `https://eu.i.posthog.com` |
| `MIN_APP_VERSION` | 426 gate for old native builds |

## 6. Workers (Lambda) environment

Set by CDK; listed here so nobody adds them by hand. Plain env: `APP_ENV`, `MEDIA_BUCKET`, `*_QUEUE_URL` for queues a function may send to. Secrets arrive as ARNs (`<NAME>_SECRET_ARN`) and are read at cold start:

| Function | Secret ARNs |
|---|---|
| generate | `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE`, `GEMINI_API_KEY`, `FAL_API_KEY` |
| batch | `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE`, `GEMINI_API_KEY` |
| notify | `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE`, `RESEND_API_KEY`, `EXPO_ACCESS_TOKEN`, `UNSUB_HMAC_KEY` |
| maintenance | `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE` |
| rendition | `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE` |
| fetch | none (SEC-40); results go back via `JOBS_INTERACTIVE_QUEUE_URL` |

## 7. Upstash

Create Redis databases `robes-staging` and `robes-prod` in **eu-west-1** (Ireland), TLS on, eviction off. Copy the REST URL/token into Vercel (§5). Set a monthly budget alert.

## 8. Resend

1. Add domains `staging.mail.byrobes.com` and `mail.byrobes.com`; publish SPF, DKIM and DMARC (`p=quarantine` to start) records.
2. Inbound: MX for `in.byrobes.com` (receipts) on production only.
3. Create one API key per environment with **sending access to its domain only**; webhook per environment with its own signing secret.

## 9. Google Cloud (Gemini)

1. Projects `robes-staging` and `robes-prod` under the org, billing linked.
2. Enable the Generative Language API; create an API key restricted to that API only.
3. Billing → Budgets: monthly budget with alerts at 50/80/100% (email + Pub/Sub if wired).
4. APIs → Quotas: cap requests/min and images/day per key (staging low).
5. Put the key in Secrets Manager `robes-<env>/gemini/api-key`.

## 10. Observability and analytics

- **Sentry**: projects `robes-web`, `robes-workers`, `robes-mobile` (and staging twins, or one project with `environment` tags). Create a CI auth token (`project:releases`, `org:read`) for source maps.
- **PostHog**: **EU cloud** projects `Robes Staging` and `Robes Production`; disable autocapture of inputs; enable session replay masking.
- **Uptime**: Checkly checks on `/api/v1/health` for both environments.

## 11. Mobile (EAS)

EAS project linked to `platform/mobile`; channels `preview` (staging) and `production`. EAS env holds **public** values only (`EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_POSTHOG_KEY`). `expo/access-token` in Secrets Manager is the push-sending token for `notifyFn`.

## Checklist before the first deploy

- [ ] §1 filled in for the environment
- [ ] Supabase: asymmetric keys, PITR (prod), `robes_app` password set, `DATABASE_URL` stored in both places
- [ ] CDK bootstrapped; first `cdk deploy` from laptop done; every secret value set
- [ ] GitHub environment vars/secrets set; deploy workflow run green
- [ ] Vercel env complete; `/api/v1/health` returns `{"ok":true}`
- [ ] Budgets confirmed in AWS, GCP, Vercel, Upstash, Supabase
