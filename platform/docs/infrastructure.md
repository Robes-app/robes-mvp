# Robes Platform — Infrastructure Spec

Status: **normative**. Decisions referenced as ADR-nn are recorded in `SPEC.md` §4.
Inputs: `reference/cost-research.md` (prices fetched 2026-09-24), `reference/stack-versions.md`, `security.md`.

---

## 1. Topology

```
                 ┌──────────────── Vercel (Pro, Fluid compute) ────────────────┐
 Web browser ───▶│  platform/app  Next.js 16 · RSC pages · /api/v1 route handlers │
 Expo app   ────▶│  proxy.ts (CSP nonce, session refresh) · Firewall + BotID    │
                 └───────┬──────────────┬───────────────┬──────────────────────┘
                         │ user JWT     │ OIDC → IAM    │ service role (server-only)
                         ▼              ▼               ▼
                 Supabase (per env)   AWS (per env account, CDK)            Upstash Redis
                 Auth · Postgres ·    ├─ SQS: jobs-interactive, jobs-batch,   (rate limits,
                 Realtime · pg_cron   │        fetch, notify, maintenance      idempotency)
                   ▲                  │   + DLQ each
                   │ service role     ├─ Lambda workers (Node 24, arm64)
                   └──────────────────┤    generate · render · fetch · notify · delete · batch
                                      ├─ S3 media-private (+ versioning) ──▶ CloudFront
                                      │    media.byrobes.com (OAC, signed cookies/URLs)
                                      ├─ Lambda rendition (sharp) on S3 ObjectCreated
                                      ├─ EventBridge Scheduler (cron)
                                      ├─ Secrets Manager · CloudWatch · SNS → Chatbot/Slack
                                      └─ AWS Budgets
 Third parties: Gemini API (per-env GCP project) · Resend (send + inbound) · PostHog EU · Sentry · Cloudflare Turnstile · fal (BiRefNet cutouts) · Expo Push
```

Principles:
- **Stateless web tier** (SEC-33). Vercel handles request/response, auth, validation, quota, enqueue, and fast reads. No model call over 3 s runs in a request (SEC-34).
- **All slow or paid work is a job**: Postgres `generation_jobs` row is the system of record; SQS is the transport; Lambda is the executor; Supabase Realtime is the notification channel.
- **No VPC**. Nothing needs private networking (Supabase, Gemini, Resend are public endpoints). This keeps Lambda cold starts low, avoids NAT gateway cost, and makes the SSRF fetcher safe by construction (no internal network to reach).
- **One AWS account per environment** under AWS Organizations: `robes-staging`, `robes-prod` (plus the existing management account). Dev uses local emulation (§7) or a per-developer stack in staging with a name prefix.

## 2. Environments

| | dev (local) | staging | production |
|---|---|---|---|
| Web | `pnpm dev` (Next on :3000) | Vercel Preview + `staging.byrobes.com` | Vercel Production `app.byrobes.com` → later `www` |
| Supabase | `supabase start` (Docker) | project `robes-staging` | project `robes-prod` (PITR on) |
| AWS | local runner (§7) | account `robes-staging`, stack prefix `Stg` | account `robes-prod`, stack prefix `Prod`, termination protection |
| Gemini | dev key, low quota | staging GCP project + budget | prod GCP project + budget + quota caps |
| Media | local S3 (MinIO) or staging bucket w/ dev prefix | `media.staging.byrobes.com` | `media.byrobes.com` |
| Resend | test mode | `staging.mail.byrobes.com` | `mail.byrobes.com` |
| PostHog / Sentry | disabled / dev DSN | staging project | prod project |
| Mobile | Expo dev client | EAS channel `preview` | EAS channel `production` |

The legacy stack (Railway `main` + `beta`, Supabase `Robes_p0`, Cloudinary, Airtable) stays untouched until cutover (`migration.md`).

Env validation (SEC-71): `packages/config` exports `serverEnv`, `publicEnv`, `workerEnv` zod schemas. Each app imports only its schema; a production build fails if a dev-only flag is present.

## 3. Vercel

- Project `robes-app`, root directory `platform/app`, framework Next.js, Node 24, Fluid compute on, region `dub1` (Dublin — EU users, near Supabase EU region; pick Supabase region `eu-west-1` to match).
- Ignored build step: `npx turbo-ignore @robes/app` so legacy/mobile-only commits don't deploy.
- Env: via Vercel encrypted env per environment; secrets not needed at build are `sensitive`.
- AWS access: **Vercel OIDC federation** → IAM role `VercelApiRole` per account (trust: `oidc.vercel.com/<team>` with `sub` bound to project + environment). Permissions: `sqs:SendMessage` on job queues; `s3:PutObject` + `s3:GetObject` on `uploads/*` in the media bucket (presigned PUTs, and the HEAD in `POST /uploads/:id/complete`); `secretsmanager:GetSecretValue` on the CloudFront signing key. No long-lived AWS keys anywhere (SEC-73).
- Security: Vercel Firewall rules (rate limit `/api/v1/*` as a coarse outer layer; per-user limits live in Upstash), BotID/Attack Challenge on auth + waitlist, deployment protection on previews.
- `next/image`: **not used for user media** (cost-research item 11). A custom loader points at CloudFront rendition URLs. Static brand assets may use `next/image`.
- `maxDuration`: default 30 s for API routes; nothing should approach it.

## 4. AWS (CDK)

CDK v2 (TypeScript) app in `platform/infra`. One `cdk.json`, stages `Staging` and `Production` built from the same constructs with per-stage config (`infra/config/{staging,production}.ts`).

### 4.1 Stacks

| Stack | Resources | Notes |
|---|---|---|
| `IdentityStack` | GitHub OIDC provider + `GithubDeployRole` (cdk deploy, scoped to this repo + environment); Vercel OIDC provider + `VercelApiRole`; `WorkerRole`s (one per function) | SEC-73 |
| `SecretsStack` | Secrets Manager: `gemini/api-key`, `supabase/service-role`, `supabase/url`, `resend/api-key`, `resend/webhook-secret`, `cloudfront/signing-key` (private key; public key → key group), `fal/api-key`, `expo/access-token`, `unsub/hmac-key` | Rotation runbook in `docs/runbooks/` |
| `MediaStack` | S3 `robes-<env>-media` (block public access, SSE-S3, versioning with noncurrent expiry 30 d, CORS for presigned PUT from app origins); CloudFront distribution with OAC, custom domain `media.<domain>` (ACM us-east-1), trusted key group, cache policy keyed on path only, response headers policy (CORP, nosniff), HTTP/3; `RenditionFn` (sharp, arm64, 2048 MB) on `ObjectCreated` for `uploads/` and `generated/` | §5 |
| `QueuesStack` | SQS `jobs-interactive`, `jobs-batch`, `fetch`, `notify`, `maintenance`, each with DLQ (maxReceiveCount 3), visibility timeout ≥ 6× function timeout, SSE | FIFO not required; idempotency via job row |
| `WorkersStack` | Lambdas (Node 24, arm64, bundled with esbuild from `platform/workers`): `generateFn` (jobs-interactive, timeout 5 min, reserved concurrency = Gemini RPM budget / images per job), `batchFn` (jobs-batch, submits/polls Gemini Batch API), `fetchFn` (fetch queue; **no IAM beyond SQS + writing result via Supabase**; SEC-40), `notifyFn` (emails + Expo push), `maintenanceFn` (retention, deletion, sweeper), event source mappings with partial batch response | One invocation per generation, images awaited in parallel inside it (cost-research item 12) |
| `SchedulesStack` | EventBridge Scheduler: `notify-tick` every 10 min → notify queue; `daily-look-batch` hourly (users whose local time is 04:00 → batch queue); `retention` daily 03:00 UTC; `job-sweeper` every 1 min (re-enqueue `queued` jobs older than 60 s = outbox recovery); `batch-poll` every 5 min | Replaces in-process `setInterval`s |
| `ObservabilityStack` | CloudWatch log groups (retention 14 d), alarms: DLQ depth > 0, worker error rate > 2%, p95 duration, throttles, queue age > 2 min; SNS topic → AWS Chatbot → Slack `#robes-alerts`; dashboard | |
| `BudgetsStack` | AWS Budgets (monthly, 50/80/100% + forecast) → SNS | GCP + Cloudinary + Vercel budgets configured in their consoles (runbook) |

All stateful resources `RemovalPolicy.RETAIN` in production; `terminationProtection: true`.

### 4.2 Job flow (outbox pattern)

1. `POST /api/v1/looks/generate` → auth → zod → `consume_quota()` + insert `generation_jobs(status='queued', idempotency_key)` in one transaction → `SendMessage({ jobId })` → `202 { jobId }`.
2. If `SendMessage` fails, the row stays `queued`; `job-sweeper` re-enqueues after 60 s. Workers treat duplicate deliveries idempotently (`update ... set status='running' where id=$1 and status in ('queued','running' and lease expired)` as a lease).
3. Worker loads **all context from the DB** (SEC-16), runs the pipeline (text via streaming → persist `output.text` stage → images in parallel → each image uploaded to S3 `generated/` → `generation_assets` row), updates status, creates the artifact row on success.
4. Clients follow `GET /api/v1/jobs/:id/events` (SSE, ADR-020), which the API serves by watching the job row for the session user; each event is the full job snapshot, so a refresh resumes from the latest stage.
5. Native app backgrounded → `notifyFn` sends Expo push "Your looks are ready" when the job finishes and the client hasn't acked.

### 4.3 Local development

- `supabase start` for Postgres/Auth/Realtime.
- `platform/workers` exposes a `LocalQueue` adapter: in dev, the API's `enqueue()` calls the worker handler in-process (behind `JOBS_TRANSPORT=inline`) so no AWS is needed. Contract tests run the same handler against the SQS event shape.
- Media: MinIO via docker compose (S3-compatible, `pnpm media:setup` creates the buckets). There is no S3 event locally, so `POST /api/v1/uploads/:id/complete` runs the same `processUpload()` as `RenditionFn` in-process via `after()`; images are served as presigned MinIO GETs instead of CloudFront.

## 5. Media pipeline (replaces Cloudinary) — ADR-005

Decision: **S3 + CloudFront with pre-generated renditions** (cost-research §2.3: ≈$680/mo vs ≈$15.5k on Cloudinary list price at 25k MAU).

Key layout (single private bucket):
```
uploads/{userId}/{assetId}/original          user photo as uploaded (≤ 20 MB, presigned PUT, content-type + length enforced by policy)
media/{userId}/{assetId}/master.jpg          2048px master (EXIF stripped, orientation applied, HEIC→JPEG)
media/{userId}/{assetId}/{w}.{avif|webp}     renditions w ∈ {320, 640, 1080, 1600}
media/{userId}/{assetId}/cutout.png|webp     background-removed (wardrobe pieces)
generated/{userId}/{jobId}/{idx}.png         raw model output (lifecycle: delete after 7 d)
shared/{shareToken}/...                      copies/links for public share snapshots (public-by-token, long cache)
catalog/...                                  shared assets (avatar cells, brand)
```

Upload flow: `POST /api/v1/uploads` (auth, quota, kind, contentType, size) → creates `assets` row (`status='pending'`) → returns presigned PUT (5 min, exact key, `Content-Type` + `Content-Length` conditions). Client uploads directly (web: fetch; native: `expo-file-system` background upload after on-device resize to ≤ 3000px). `RenditionFn` fires on ObjectCreated → validates magic bytes, strips EXIF/GPS, writes master + renditions + blurhash/thumbhash → marks asset `ready` → deletes original after 30 d (lifecycle to Glacier IR first if originals must be retained; default: delete — master is the keeper).

Delivery:
- Private media (default): CloudFront **signed cookies** on web (path-scoped `/media/{userId}/*`, 12 h, set by the API on session start/refresh); **signed URLs** on native (canned policy, daily-stable expiry so `expo-image` disk cache stays warm).
- Share snapshots: `shared/{token}/*` served without signature, `Cache-Control: public, max-age=31536000, immutable`; revoking a share deletes the prefix and invalidates.
- Loader: `packages/media` builds URLs `https://media.<domain>/media/{userId}/{assetId}/{w}.avif` with `srcset`; both `next/image` custom loader and `expo-image` source builder use it.

Cutouts: `render` job step calls BiRefNet on fal (then self-host on serverless GPU when volume justifies; Photoroom API as quality fallback) — cost-research §3.

Lifecycle rules: `generated/` expire 7 d; `uploads/` expire 30 d; noncurrent versions 30 d; incomplete multipart 1 d; Intelligent-Tiering on `media/` after 30 d.

Malware/abuse: magic-byte + dimension checks in `RenditionFn`; moderation for images that become public (SEC-23). GuardDuty Malware Protection for S3 is optional (cost) — enable for `uploads/` in production if budget allows.

## 6. AI provider layer — ADR-008

- `packages/ai`: provider interface (`generateJson`, `streamText`, `generateImage`, `editImage`, `submitBatch`) with a Gemini implementation on `@google/genai`; model IDs come from a **model registry** (`packages/ai/src/models.ts`) keyed by capability (`text.fast`, `text.reasoning`, `vision.analyse`, `image.hero`, `image.secondary`) — never hard-coded at call sites.
- **Model churn is real** (cost-research §4.1, verify at M0): the 2.5 text models are restricted to existing users, `gemini-2.5-flash-image` shuts down 2026-10-02, the current recommended Flash is `gemini-3.8-flash` (price doubles 2027-01-01), `gemini-3.1-flash-lite-image` is half the price of `gemini-3.1-flash-image`. The registry + eval harness makes switching a config change.
- Every call: `AbortSignal` timeout, `responseSchema` for JSON, `maxOutputTokens`, thinking budget cap, `usageMetadata` → `generation_calls` + `platform_budget` (SEC-03).
- Prompts: `packages/ai/src/prompts/<feature>/v<N>.ts` — pure functions of validated, typed inputs; user text only in the user turn, fenced and truncated (SEC-23). Ported from legacy constants listed in `reference/legacy-api-and-ai.md` §prompt table.
- Evals: `packages/ai/evals/` golden inputs per feature; `pnpm eval <feature>` runs against a chosen model and scores schema validity + rubric; required before changing a prompt version or model mapping.

## 7. CI/CD (GitHub Actions)

Workflows in repo root `.github/workflows/` with `paths: [platform/**]` filters so legacy is unaffected.

| Workflow | Trigger | Jobs |
|---|---|---|
| `platform-ci.yml` | PR touching `platform/**` | pnpm install (cache) → `turbo run lint typecheck test build --filter=...[origin/<base>]` → `supabase start` + `supabase db reset` + pgTAP (`supabase test db`) → Playwright against `next start` with local Supabase → gitleaks → `pnpm audit --prod` → `cdk synth` + `cdk diff` (staging) comment on PR |
| `platform-deploy-staging.yml` | push to trunk | `supabase db push` (staging) → `cdk deploy --all` (Staging, via OIDC role) → Vercel deploys itself (Git integration) → post-deploy smoke (Playwright @smoke against staging) |
| `platform-deploy-prod.yml` | manual dispatch / release tag, environment protection (required reviewer) | same steps against production; Vercel promote staging build (`vercel promote`) |
| `mobile.yml` | PR touching `platform/mobile/**` or shared packages | typecheck, jest-expo tests, `eas build --profile preview --non-interactive` on labels; Maestro flows on EAS Workflows |
| `platform-nightly.yml` | cron | full Playwright + Maestro, `pnpm eval --all` against staging models, dependency audit, Supabase advisors report |

Branching (ADR-013): M0–M1 on branch `platform` (PRs into it). Once CI is green and Railway **watch paths** are set to exclude `platform/**`, `platform/` merges into `beta` and `beta` becomes the trunk for both; after cutover legacy code is deleted.

## 8. Cost controls (SEC-03 + cost-research §6)

In priority order — each is a task in the plans:
1. Per-user quotas (`plans`, `usage_counters`) + global daily breaker + kill-switch flags.
2. Lazy images: one hero image eager, secondary images generated when scrolled into view or requested (job `stage` = `on_demand`), text-first streaming.
3. Model tiers from the registry: `image.secondary` → lite image model after A/B via evals; `text.fast` → flash-lite for tagging/classification.
4. Gemini Batch API (−50%) for non-interactive work: overnight "Today" looks for active users, style re-analysis, bulk re-tagging.
5. S3 + CloudFront renditions (no per-transform billing); `next/image` never for user media.
6. Dedupe cache: `generation_cache(key = hash(feature, model, prompt_version, normalized inputs))` → reuse outputs/images for identical requests.
7. Ingest downscale to 2048px master; lifecycle rules (§5).
8. One Lambda invocation per generation; parallel image awaits.
9. PostHog: ~100 events/MAU budget, sampled replay (with consent).
10. Budgets & alerts everywhere: AWS Budgets, GCP budget + API quota caps per key, Vercel spend management, Supabase spend cap on staging, CloudFront flat-rate plan evaluation at >10M req/mo.

Unit economics dashboard (admin): cost per MAU, cost per generation by feature/model, image count per generation, cache hit rate — computed from `generation_calls` + provider prices in `packages/ai/src/pricing.ts`.

## 9. Observability

- **Sentry**: `@sentry/nextjs` (web + API, source maps uploaded in CI), `@sentry/react-native` (via `expo install`), `@sentry/aws-serverless` in workers. Release = git SHA; environment tag.
- **Tracing**: W3C `traceparent` from API → SQS message attribute → worker; Sentry performance ties request → job → Gemini calls.
- **Logs**: pino JSON with redaction (SEC-83) → Vercel log drain / CloudWatch (14 d).
- **Product analytics**: PostHog EU, consent-gated, typed event catalogue in `packages/analytics` (both apps import the same event names/props).
- **Uptime**: Checkly (or Vercel/BetterStack) hitting `/api/v1/health` and a synthetic "generate a look" every hour on staging and production with a dedicated test user.
- **SLOs** (from `reference/ux-opportunities.md` §4): text stage p50 ≤ 3 s, all images p50 ≤ 45 s, job failure rate < 2%, API p95 < 300 ms for reads.

## 10. Backups and DR

- Supabase production: PITR (7 d min) + daily logical dump by `maintenanceFn` to S3 `robes-prod-backups` (Object Lock governance 30 d, separate KMS key).
- S3 media: versioning + (optional) cross-region replication for `media/` in production once revenue justifies; RPO for media = 0 for masters within region.
- Infra is code: full environment recreatable with `cdk deploy` + `supabase db push` + Vercel project config (documented in `docs/runbooks/recreate-environment.md`).
- Runbooks to write in M1: key rotation (Supabase, Gemini, CloudFront key pair, Resend), incident response, restore from PITR, disable a feature (kill switch), budget breach.

## 11. Domains and DNS

- Keep the current DNS provider for `byrobes.com`; add: `app` / `staging` (Vercel), `media` / `media.staging` (CloudFront), `mail` / `staging.mail` (Resend SPF/DKIM/DMARC, inbound MX for receipts `in.byrobes.com`).
- Universal links: `apple-app-site-association` and `/.well-known/assetlinks.json` served by the Next.js app for `app.byrobes.com` (later `www`).
- Cutover: `www.byrobes.com` moves from Railway to Vercel at the end of M6 (see `migration.md`); legacy `/look/:id` and `/board/:id` paths are served by the new app via legacy-token lookup + redirects.
