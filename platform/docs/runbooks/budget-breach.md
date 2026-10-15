# Runbook — Budget breach

Triggered by: AWS Budgets (50/80/100 % actual, 100 % forecast → SNS `robes-<env>-alerts`), GCP budget alerts, Vercel spend alerts, Postgres host and Upstash usage emails, or the in-app breaker (SEC-03) returning `capacity`.

## 1. Triage (15 min)

1. Which provider and environment? Staging breaches are usually a runaway test or loop: stop it, don't page.
2. Find the driver:
   - **AWS**: Cost Explorer → group by *Service*, then *Usage type*, daily granularity. Usual suspects: Lambda duration (stuck retries — check DLQ and queue-age alarms), CloudFront data transfer (hotlinked share images), S3 requests.
   - **Gemini**: GCP Billing → Reports by SKU; in the DB:
     ```sql
     select date_trunc('hour', created_at) h, feature, model, count(*), sum(cost_micros)/1e6 usd
     from app.generation_calls where created_at > now() - interval '24 hours'
     group by 1,2,3 order by 1 desc, usd desc limit 50;
     ```
     Top spenders by user: group by `user_id`. One user dominating = abuse; many users = real growth or a bug in lazy images/dedupe cache.
   - **SES / API user**: a spike in `SES` or in S3/SQS request cost with flat traffic can mean the API user's access key leaked (ADR-021). Check `aws iam get-access-key-last-used`, CloudTrail `lookup-events` for `robes-<env>-api`, and SES → Reputation metrics; on any doubt follow `key-rotation.md` → Vercel API access key → **Leak**.
   - **Vercel**: Usage tab → Functions / Edge requests / Bandwidth; check Firewall for bot traffic.
3. Is it abuse, a bug or growth? That decides step 2.

## 2. Contain

- **Abuse**: ban the user(s) (admin) and tighten the Firewall rule; enable Attack Challenge mode on Vercel if request volume spikes.
- **Email abuse**: stop all sending for the stage at once: `aws sesv2 put-configuration-set-sending-options --configuration-set-name robes-<env>-email --no-sending-enabled` (re-enable with `--sending-enabled`). Sign-in codes stop too, so announce it.
- **Bug / runaway**: kill-switch the feature (`kill-switch.md`); if workers are looping, set reserved concurrency to 0 for that function and purge the queue only after the job rows are safe (`aws sqs purge-queue` — rows stay `queued` and the sweeper will re-enqueue them, so fix the bug first).
- **Real growth**: raise the budget deliberately (see 3); check quotas/plans still match `../infrastructure.md` §8 unit economics.

## 3. Adjust

- AWS budget amount: `infra/config/<stage>.ts` → `budget.monthlyUsd`, then deploy.
- In-app daily breaker: `app.platform_budget.limit_micros` per model family.
- GCP quota caps: APIs → Quotas.

## 4. Follow up

Write up cause, cost, and the guard that should have caught it earlier (quota, alarm threshold, eval, cache). Link it in the ops log.
