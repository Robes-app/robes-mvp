# Runbook — Environments

What to create, per environment, before the first staging/production deploy. Background: `../infrastructure.md` §1–§3, §7, §11, `../security.md` SEC-70..74, ADR-019 (app data in schema `app`, role `robes_app`), ADR-020 (managed Postgres + Better Auth; no Supabase) and ADR-021 (Amazon SES for email; the Vercel API uses scoped IAM user keys). **No secret values go in this file or anywhere in git**: only IDs, names and where each value lives.

Environments: `dev` (laptop, no cloud accounts), `staging`, `production`. Each cloud environment gets its **own** account/project in every provider (SEC-70).

## 1. ID register

Fill in as resources are created. IDs are not secrets; keys and passwords are.

| Item | Staging | Production | Where it's used |
|---|---|---|---|
| Postgres host (Supabase DB-only / Neon / RDS, EU) | `<host>` / `<project-id>` | `<host>` / `<project-id>` (PITR on) | `DATABASE_URL`, `MIGRATION_DATABASE_URL` |
| AWS account ID | `<stg-account-id>` | `<prod-account-id>` | GitHub env var `AWS_ACCOUNT_ID` |
| GithubDeployRole ARN | `arn:aws:iam::<stg>:role/robes-staging-github-deploy` | `arn:aws:iam::<prod>:role/robes-prod-github-deploy` | GitHub env var `AWS_DEPLOY_ROLE_ARN` |
| API IAM user / key secret | `robes-staging-api` / `robes-staging/api/aws-access-key` | `robes-prod-api` / `robes-prod/api/aws-access-key` | Vercel `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (§6) |
| Media bucket | `robes-staging-media` | `robes-prod-media` | Vercel `MEDIA_BUCKET` |
| Media domain / CloudFront ID | `media.staging.byrobes.com` / `<dist-id>` | `media.byrobes.com` / `<dist-id>` | Vercel `MEDIA_PUBLIC_ORIGIN` (`https://` + domain) |
| CloudFront public key ID | `<K…>` | `<K…>` | Vercel `MEDIA_CLOUDFRONT_KEY_PAIR_ID` |
| ACM cert (us-east-1) ARN | `<arn>` | `<arn>` | GitHub env var `MEDIA_CERT_ARN` |
| Vercel project ID | `<prj_…>` | same project | Vercel dashboard |
| Apple Services ID / Team ID / Key ID | `<com.byrobes.web.staging>` / `<team>` / `<key>` | `<com.byrobes.web>` / `<team>` / `<key>` | Better Auth (§3) |
| Google OAuth client ID | `<id>.apps.googleusercontent.com` | `<id>.apps.googleusercontent.com` | Better Auth (§3) |
| Upstash database | `robes-staging` (`eu-west-1`) | `robes-prod` (`eu-west-1`) | Vercel env |
| GCP project | `robes-staging` | `robes-prod` | Gemini key owner |
| PostHog (EU) project ID | `275134` ("Robes", shared with legacy beta) | `275134` (same project for now; split by `environment`) | `NEXT_PUBLIC_POSTHOG_KEY` |
| SES domain / config set | `staging.mail.byrobes.com` / `robes-staging-email` | `mail.byrobes.com` / `robes-prod-email` | `MAIL_FROM`, `SES_CONFIGURATION_SET` (§9) |
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
5. **Email OTP**: sent through SES (§9) from `MAIL_FROM` with `SES_CONFIGURATION_SET`, using the API user's keys. Locally, the app sends over SMTP to the mail catcher instead.
6. Allowed callback URLs are exactly `https://<app>/api/auth/callback/{apple,google}`; add a preview-domain callback only if previews must sign in.

## 4. AWS (Organizations)

1. In the management account: AWS Organizations → create accounts `robes-staging` and `robes-prod` (distinct root emails). Enable IAM Identity Center; engineers get `AdministratorAccess` on staging and a break-glass-only permission set on production.
2. Per account, enable: CloudTrail (org trail from management), Cost Explorer, IAM Access Analyzer, S3 Block Public Access at account level.
   Service Quotas → Lambda → **Concurrent executions**: request 1000. New accounts start at 10, and the reserved concurrency on `generateFn` (`workers.generateReservedConcurrency`) fails to deploy until the quota leaves 10 unreserved.
3. Bootstrap CDK once per account (admin credentials via Identity Center):
   ```bash
   aws sso login --profile robes-staging
   cd platform/infra
   pnpm cdk bootstrap aws://<stg-account-id>/eu-west-1 --profile robes-staging   # a script, not `pnpm exec` (esbuild PATH)
   ```
4. Request the media certificate in **us-east-1** (ACM → public cert → `media.staging.byrobes.com`), validate by DNS, record the ARN in §1.
5. Create the CloudFront signing key pair (`key-rotation.md` §CloudFront, steps 1–2) and commit the **public** key as `platform/infra/config/keys/<stage>.cloudfront.pub.pem` (or set GitHub var `CLOUDFRONT_PUBLIC_KEY`). Without it, synth warns and uses a placeholder key, so signed media stays unreadable (fail closed).
6. First deploy from a laptop (creates the GitHub deploy role CI needs afterwards):
   ```bash
   export ROBES_STAGING_AWS_ACCOUNT_ID=<stg-account-id>
   export ROBES_STAGING_MEDIA_DOMAIN=media.staging.byrobes.com ROBES_STAGING_MEDIA_CERT_ARN=<arn>
   pnpm cdk deploy 'Staging/*' -c stage=staging --profile robes-staging
   ```
   Select stacks by Stage path (`'Staging/*'`); `--all` only matches top-level stacks and deploys nothing here. Review first with `pnpm cdk diff 'Staging/*' -c stage=staging`.
   If the account already has a GitHub OIDC provider, set `ROBES_<STAGE>_GITHUB_OIDC_PROVIDER_ARN` to import it instead.
7. Set every secret value (`key-rotation.md` §Set a value). Secrets are created with random placeholders, all under `robes-<env>/`: `database/url`, `auth/better-auth-secret`, `auth/apple`, `auth/google`, `gemini/api-key`, `cloudfront/signing-key`, `fal/api-key`, `expo/access-token`, `unsub/hmac-key`. The exception is `api/aws-access-key`, which CDK fills with the API user's access key (§6 step 8).
8. `sharp` for RenditionFn needs no setup: CDK installs the linux-arm64 build (version pinned in `packages/media/package.json`) into the function asset during bundling (`infra/src/lib/native-modules.ts`). Prebuilt sharp can't decode HEIC; see `docs/DEVELOPING.md` → How the pieces fit (Media).
9. DNS: `media.staging` CNAME → the `MediaDistributionDomain` stack output.
10. **Sharing one account** (sandbox, or staging and production side by side): stack names (`Stg-*` / `Prod-*`) and resource names (`robes-staging-*` / `robes-prod-*`) are stage-prefixed and the media bucket is suffixed with the account id, so both stages deploy into one account. Pick a stage with `-c stage=` or `ROBES_STAGE`. Per-stage overrides for small or member accounts:
    - `ROBES_<STAGE>_GENERATE_RESERVED_CONCURRENCY=0`: no reserved concurrency (needed while the account's Lambda limit is 10).
    - `ROBES_<STAGE>_BUDGETS=off`: skip the Budgets stack. An Organizations member account can't create budgets; set them from the payer account instead.
**This project's shared account (259887029472), as deployed 2026-10-23.** Both stages live here; run from `platform/infra` with that account's credentials:
    ```bash
    # staging: it OWNS the GitHub OIDC provider, so never set ROBES_STAGING_GITHUB_OIDC_PROVIDER_ARN (the import would delete it)
    ROBES_STAGING_AWS_ACCOUNT_ID=259887029472 ROBES_STAGING_BUDGETS=off ROBES_STAGING_GENERATE_RESERVED_CONCURRENCY=0 \
      pnpm cdk deploy 'Staging/*' -c stage=staging
    # production: imports staging's provider; a separate cdk output dir so both can run at once
    ROBES_PRODUCTION_AWS_ACCOUNT_ID=259887029472 ROBES_PRODUCTION_BUDGETS=off ROBES_PRODUCTION_GENERATE_RESERVED_CONCURRENCY=0 \
      ROBES_PRODUCTION_GITHUB_OIDC_PROVIDER_ARN=arn:aws:iam::259887029472:oidc-provider/token.actions.githubusercontent.com \
      pnpm cdk deploy 'Production/*' -c stage=production --output cdk.out.prod
    ```
    Lambda's account limit is 10 (hence no reserved concurrency), the account is an Organizations member (no budgets), and neither stage has a custom media domain yet (`MEDIA_PUBLIC_ORIGIN` is the CloudFront domain). The GitHub `staging`/`production` environments are not set up yet, so deploy staging from a laptop after merging worker or infra changes (always `cdk diff` first) until §5 step 5 is done. The website alone redeploys on a `beta` merge; the workers (photo reads, looks, images) do not — a merge that changes `packages/jobs`, `packages/ai` or `workers/` reaches staging only with a deploy.
11. Confirm the SNS email subscription for alerts/budgets (`ROBES_<STAGE>_ALERT_EMAIL`). Optional: AWS Chatbot → Slack `#robes-alerts` subscribed to `robes-<env>-alerts`.

## 5. GitHub

1. Settings → Environments: create `staging` and `production`. Production: required reviewer, deployment branches limited to `platform` (later the trunk).
2. Per environment **variables**: `AWS_ACCOUNT_ID`, `AWS_DEPLOY_ROLE_ARN`, `APP_URL` (`https://staging.byrobes.com` / `https://app.byrobes.com`), `MEDIA_DOMAIN`, `MEDIA_CERT_ARN`, `CLOUDFRONT_PUBLIC_KEY` (optional if committed), `ALERT_EMAIL`, `BUDGET_EMAIL`, and optionally `BUDGETS` (`off` in a member account) and `GENERATE_RESERVED_CONCURRENCY` (§4 step 10).
3. Per environment **secrets**: `MIGRATION_DATABASE_URL` (§2 step 4; migration role, never `robes_app`).
5. **Staging deploys on every `beta` merge** that touches `platform/**` (`platform-deploy-staging.yml`, 2026-10-28), once the repo variable `STAGING_AUTO_DEPLOY` is `true` (Settings → Secrets and variables → Actions → Variables). Set it only after steps 1–3 exist for `staging`: `AWS_DEPLOY_ROLE_ARN` is the staging stack's `robes-staging-github-deploy` role, `AWS_ACCOUNT_ID` 259887029472, `APP_URL` `https://staging.byrobes.com`, `BUDGETS` `off`, `GENERATE_RESERVED_CONCURRENCY` `0`. **Run workflow** (manual) works as soon as the environment exists, switch or not.
4. Renovate: install the Renovate app and add a root `renovate.json` containing `{ "extends": ["local>Robes-app/robes-mvp//platform/renovate.json"] }` (Renovate only reads config at the repo root).

## 6. Vercel

1. Project `robes-app`, root directory `platform/app`, framework Next.js, Node 24, Fluid compute on, function region `dub1`.
2. **One project, two release branches** (2026-10-27): `main` → Production (`app.byrobes.com`); `beta` → the custom environment **`staging`** (`staging.byrobes.com`); other branches are protected previews. Each environment has its own variables; `staging`'s are a separate set from Production's.
3. Build command migrates **staging only** (`if [ "$VERCEL_TARGET_ENV" = staging ]; then pnpm db:migrate; fi`): production shares the database beta runs on, so its migrations are a deliberate step at release (`database-migrations.md`), never a side effect of a merge. Ignored build step: `case "$VERCEL_TARGET_ENV" in production|staging) git diff --quiet HEAD^ HEAD -- ../ ;; *) exit 0 ;; esac`.
4. AWS access is by the stage's IAM user keys (ADR-021), not OIDC federation; leave Vercel OIDC Federation off.
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
| `APPLE_APP_BUNDLE_ID` + `APPLE_TEAM_ID` | universal links (§12): `com.byrobes.app.staging` / `com.byrobes.app` and the team id; served in `/.well-known/apple-app-site-association`. Unset → the file lists no app |
| `ANDROID_APP_PACKAGE`, `ANDROID_CERT_SHA256` | Android App Links (§12): the stage's package and its signing certificate SHA-256 (comma-separated, `AA:BB:…`; from `eas credentials` or Play Console → App signing). Served in `/.well-known/assetlinks.json`; unset → `[]` |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | token sensitive |
| `ROBES_AWS_REGION`, `ROBES_AWS_ACCESS_KEY_ID`, `ROBES_AWS_SECRET_ACCESS_KEY` | `eu-west-1`; keys of `robes-<env>-api` from Secrets Manager (step 8); secret key sensitive. `ROBES_`-prefixed because Vercel reserves `AWS_*` names; the API passes them to its SES, S3 and SQS clients explicitly |
| `JOBS_INTERACTIVE_QUEUE_URL`, `JOBS_BATCH_QUEUE_URL`, `FETCH_QUEUE_URL` | Queues stack. Without `FETCH_QUEUE_URL` deployed link imports return `disabled` (the API never fetches user URLs itself) |
| `MEDIA_BUCKET`, `MEDIA_S3_REGION` | `robes-<env>-media`, `eu-west-1`. Uploads are presigned with the `AWS_ROLE_ARN` role; never set `MEDIA_S3_ACCESS_KEY_ID`/`MEDIA_S3_SECRET_ACCESS_KEY` outside dev (config refuses them) |
| `MEDIA_PUBLIC_ORIGIN` | CloudFront origin, e.g. `https://media.byrobes.com` (https required). Added to CSP `img-src`/`connect-src`; the bucket's regional S3 origin is added to `connect-src` for browser PUTs |
| `MEDIA_CLOUDFRONT_KEY_PAIR_ID`, `MEDIA_CLOUDFRONT_PRIVATE_KEY` | required outside dev. The private key is sensitive: copy the PEM from `cloudfront/signing-key` (single line with `\n` escapes is fine) |
| `MEDIA_COOKIE_DOMAIN` | parent domain shared by the app and media host (`staging.byrobes.com` / `byrobes.com`) so web signed cookies reach CloudFront. Set it together with `MEDIA_PUBLIC_ORIGIN` = the `media.` domain; on the bare `*.cloudfront.net` origin the cookies never arrive |
| `GEMINI_API_KEY` | only if the API makes sub-3 s model calls; otherwise workers only |
| `MAIL_FROM`, `SES_CONFIGURATION_SET` | `Robes <hello@staging.mail.byrobes.com>` / `robes-staging-email` (production: `mail.byrobes.com`, `robes-prod-email`) |
| `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | |
| `NEXT_PUBLIC_POSTHOG_KEY` | required outside dev; publishable ingest key, read at runtime and passed to the browser |
| `NEXT_PUBLIC_POSTHOG_HOST` | optional, default `https://eu.i.posthog.com` (https required outside dev); CSP gains it and `https://eu-assets.i.posthog.com` |
| `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID` | build-time only: source-map upload to PostHog error tracking. Key sensitive, scope *Error tracking: write*. Without them the build skips the upload |
| `MIN_APP_VERSION` | 426 gate for old native builds |
| `INBOUND_MAIL_DOMAIN` | `in.staging.mail.byrobes.com` / `in.mail.byrobes.com`; the domain of her forwarding address (§9 step 7) |
| `UNSUB_HMAC_KEY` | sensitive; the same value as Secrets Manager `robes-<env>/unsub/hmac-key` (≥32 chars), which notifyFn signs unsubscribe links with. Rotating it voids links in mail already sent |

8. Copy the API user's access key into Vercel (after every deploy that changes `api.accessKeys`):
   ```bash
   aws secretsmanager get-secret-value --secret-id robes-<env>/api/aws-access-key \
     --query SecretString --output text | jq -r '"AWS_ACCESS_KEY_ID=\(.accessKeyId)"'
   # paste the id into Vercel; then the secret, straight to the clipboard (never echo it into logs):
   aws secretsmanager get-secret-value --secret-id robes-<env>/api/aws-access-key \
     --query SecretString --output text | jq -r .secretAccessKey | pbcopy
   ```
   Set `ROBES_AWS_ACCESS_KEY_ID`, `ROBES_AWS_SECRET_ACCESS_KEY` (Sensitive) and `ROBES_AWS_REGION=eu-west-1` for the environment, clear the clipboard, and redeploy. The user can only enqueue jobs, PUT/GET `uploads/*`, send SES mail from the stage domain and read the CloudFront signing key; denied calls page `robes-<env>-alerts` (EventBridge rule on CloudTrail, which needs the org trail from §4 step 2). Rotate every 90 days (`key-rotation.md`).

Local dev (`app/.env.example`) uses MinIO instead: `MEDIA_S3_ENDPOINT=http://localhost:59000` plus the MinIO root credentials, no CloudFront variables (images are presigned MinIO GETs). `pnpm media:setup` creates the buckets.

## 7. Workers (Lambda) environment

Set by CDK; listed so nobody adds them by hand. Plain env: `APP_ENV`, `MEDIA_BUCKET`, and `*_QUEUE_URL` for queues a function may send to. Secrets arrive as ARNs (`<NAME>_SECRET_ARN`) and are read at cold start:

`POSTHOG_KEY` (plain env) turns on error reporting to PostHog; CDK sets it from `ROBES_POSTHOG_KEY` in the deploying shell (the project token, `phc_…`), and omits it when unset.

| Function | Secret ARNs |
|---|---|
| generate | `DATABASE_URL`, `GEMINI_API_KEY`, `FAL_API_KEY` |
| batch | `DATABASE_URL`, `GEMINI_API_KEY` |
| notify | `DATABASE_URL`, `EXPO_ACCESS_TOKEN`, `UNSUB_HMAC_KEY` (email via SES IAM permission; plain env `MAIL_FROM`, `SES_CONFIGURATION_SET`) |
| maintenance | `DATABASE_URL` (retention and deletion run here; there is no pg_cron) |
| rendition | `DATABASE_URL` |
| fetch | none (SEC-40); results go back via `JOBS_INTERACTIVE_QUEUE_URL` |

## 8. Upstash

Create Redis databases `robes-staging` and `robes-prod` in **eu-west-1**, TLS on, eviction off. Copy the REST URL/token into Vercel (§6). Set a monthly budget alert.

## 9. Amazon SES

CDK (`EmailStack`) creates the domain identity (Easy DKIM, RSA 2048), MAIL FROM `bounce.<domain>`, and configuration set `robes-<env>-email` (reputation metrics, TLS required, account suppression for bounces and complaints). Bounce, complaint and reject events go to SNS `robes-<env>-email-events`; `notifyFn` will consume them into `app.email_suppressions`.

1. After the first deploy, read the DNS records from the `<Stg|Prod>-Email` stack outputs:
   ```bash
   aws cloudformation describe-stacks --stack-name Stg-Email \
     --query 'Stacks[0].Outputs[?starts_with(OutputKey, `DkimCname`) || starts_with(OutputKey, `MailFrom`)].OutputValue' --output text
   ```
2. At the DNS provider for `byrobes.com`, add:
   - three DKIM **CNAME**s (`<token>._domainkey.<domain>` → `<token>.dkim.amazonses.com`);
   - MAIL FROM: **MX** `bounce.<domain>` → `10 feedback-smtp.eu-west-1.amazonses.com` and **TXT** `bounce.<domain>` → `"v=spf1 include:amazonses.com ~all"`;
   - **DMARC** TXT `_dmarc.<domain>` → `"v=DMARC1; p=quarantine; rua=mailto:dmarc@byrobes.com"` (start at `p=none` for a week if you want reports first).
3. Wait for SES → Identities → `<domain>` to show **Verified** and DKIM **Successful** (minutes to 72 h), and MAIL FROM **Success**.
4. **Production access** (per account, manual): SES → Account dashboard → *Request production access*: mail type Transactional, website `https://byrobes.com`, describe sign-in codes and notifications, opt-in only, bounce/complaint handling via the configuration set and suppression list. Until granted the account is in the sandbox (200/day, verified recipients only); for staging, verify test inboxes under Identities instead.
5. Send a test: `aws sesv2 send-email --from-email-address "hello@<domain>" --destination ToAddresses=<you> --content 'Simple={Subject={Data=test},Body={Text={Data=ok}}}' --configuration-set-name robes-<env>-email`.
6. Watch reputation: SES → Reputation metrics. Keep bounce < 2 % and complaints < 0.1 %; SES pauses sending at 10 % / 0.5 %.
7. **Inbound receipts** (M3 task 10, built): `InboundStack` adds receipt rule `robes-<env>-receipts` for `in.<domain>` to the account's one active rule set (`SHARED_RECEIPT_RULE_SET` in `infra/config/env.ts`, today Pluck's `pluck-inbound` in 259887029472) (spam/virus scan, TLS required) that stores raw mail under `inbound/` in the media bucket (7-day lifecycle) and notifies SNS `robes-<env>-inbound-mail` → queue `robes-<env>-inbound` → `inboundFn`. Each person gets a private address `<20 chars>@in.<domain>` (You › Forward receipts; regenerate or turn off any time).
   - DNS: **MX** `in.<domain>` → `10 inbound-smtp.eu-west-1.amazonaws.com` (the `InboundMx` output of `<Stg|Prod>-Inbound`). The subdomain is covered by the verified parent identity.
   - SES allows ONE active rule set per account and region, which is why both stages join the existing active set instead of owning one (2026-10-27: our own sets were never active, so every receipt was dropped). Never run `set-active-receipt-rule-set` here: switching the active set cuts off Pluck's mail. A stage moved to its own account sets `sharedReceiptRuleSet` to undefined and activates `robes-<env>-inbound` there.
   - Vercel env `INBOUND_MAIL_DOMAIN=in.<domain>` so the app shows the right address (config refuses the dev default outside dev).
   - Test: forward any order mail to your address from You › Forward receipts; it appears in Wardrobe › Inbox and you get "Robes read your … receipt." Mail that fails SPF, DKIM, spam or virus checks, or goes to an unknown/turned-off address, is dropped (`receipt_dropped` in the `inboundFn` logs).
   - **Nothing arrives at all** (no notice on Wardrobe, nothing in the Inbox — seen on staging 2026-10-26): walk the path in order and stop at the first gap. (1) `dig MX in.<domain>` returns `10 inbound-smtp.eu-west-1.amazonaws.com` — without it the sender's mail server bounces or never delivers, and nothing in AWS sees the mail. (2) `aws ses describe-active-receipt-rule-set --region eu-west-1` lists rule `robes-<env>-receipts` enabled — a rule in an inactive set receives nothing. (3) The SES identity for `<domain>` shows *Verified*. (4) A raw object appears under `s3://<media bucket>/inbound/` after a forward. (5) SNS `robes-<env>-inbound-mail` → SQS `robes-<env>-inbound` shows a message (or the DLQ does). (6) `inboundFn` logs `receipt_held` or `receipt_dropped` with its reason (`unknown_address` = the app's `INBOUND_MAIL_DOMAIN` doesn't match `in.<domain>`, or the address was regenerated; `quota` = her `inbox.receipt` day limit, which pasted links also spend).
8. Local development uses the mail catcher over SMTP (see `platform/README.md`); nothing in dev talks to SES. Forwarded receipts locally: `pnpm receipt:ingest <absolute path to .eml> --to <address from You>`.

## 10. Google Cloud (Gemini)

1. Projects `robes-staging` and `robes-prod` under the org, billing linked (also used for the Google OAuth client, §3).
2. Enable the Generative Language API; create an API key restricted to that API only.
3. Billing → Budgets: monthly budget with alerts at 50/80/100 %.
4. APIs → Quotas: cap requests/min and images/day per key (staging low).
5. Put the key in Secrets Manager `robes-<env>/gemini/api-key`.

## 11. Observability and analytics

- **PostHog** (analytics and errors): **EU cloud** project 275134 for both stages for now (the free plan allows one project; a second needs a card on file). Events and errors carry `environment`. Project settings: *Discard client IP data* on, exception autocapture on, authorized URLs `staging.byrobes.com`, `beta.byrobes.com`, `www.byrobes.com`, `byrobes.com`, autocapture off, replay masking on (inputs, text and images; the web SDK also enforces this). The app loads PostHog only after consent (SEC-84).
- **Uptime**: Checkly checks on `/api/v1/health` for both environments.

## 12. Mobile (EAS)

EAS project linked to `platform/mobile`; channels `preview` (staging) and `production`. EAS env holds **public** values only (`EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_POSTHOG_KEY` — after `eas init`: `eas env:create --name EXPO_PUBLIC_POSTHOG_KEY --value <phc_…> --environment preview --environment production --visibility plaintext`). `expo/access-token` in Secrets Manager is the push-sending token for `notifyFn`.

**Universal links (N4).** Staging builds claim `staging.byrobes.com`, production builds `app.byrobes.com`, development builds nothing (`mobile/app.config.ts`); the paths are `@robes/core/app-links`. For each stage: (1) Apple Developer → Identifiers → the App ID (`com.byrobes.app.staging` / `com.byrobes.app`) has **Associated Domains** on (EAS normally syncs this on build); (2) set the Vercel env above and check `https://<host>/.well-known/apple-app-site-association` and `/assetlinks.json` list the app; (3) a **new EAS build** (entitlements are native, not OTA). iOS reads the file at install, so path changes need a new build too. Native Google/Apple sign-in through the browser also needs the stage's scheme (`robes-staging://` / `robes://`) in `AUTH_TRUSTED_ORIGINS`.

## Checklist before the first deploy

- [ ] §1 filled in for the environment
- [ ] Postgres: PITR (prod), migration role + `robes_app` passwords set, URLs stored only in GitHub/Vercel/Secrets Manager
- [ ] Better Auth: secret, URL, Apple and Google clients with the exact callback URLs
- [ ] SES: domain verified, DKIM + MAIL FROM + DMARC live, production access granted (prod)
- [ ] API user key copied into Vercel; no other AWS credentials in Vercel
- [ ] CDK bootstrapped; first `cdk deploy` from a laptop done; every secret value set
- [ ] GitHub environment vars/secrets set; deploy workflow green
- [ ] Vercel env complete; `/api/v1/health` returns `{"ok":true}`
- [ ] Budgets confirmed in AWS, GCP, Vercel, Upstash and the Postgres host
