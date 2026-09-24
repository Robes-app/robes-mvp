# Runbook — Kill switch (disable a feature)

Every paid or risky route declares `flag: '<key>'` in `route()` (`../api.md` §1). When the flag is off, the route returns `503 { code: 'disabled' }` and clients show the product's "resting" copy. The API caches flags for 30 s, so changes take effect within half a minute, with no deploy.

## Disable

1. Find the key: grep the route (`flag: 'looks.generate'`) or list keys:
   ```sql
   select key, enabled, updated_at from app.feature_flags order by key;
   ```
2. Turn it off (the admin screen once it exists; until then `psql` as the migration/admin role):
   ```sql
   update app.feature_flags set enabled = false, updated_at = now() where key = 'looks.generate';
   ```
3. Confirm within 60 s: the route returns 503 `disabled` (`curl -i -X POST $APP_URL/api/v1/looks/generate -H "authorization: Bearer $TOKEN"`); PostHog/Sentry show no new generations.

## Everything that spends money, at once

- Global breaker (SEC-03): lower today's limit so the API rejects new paid jobs with `capacity`:
  ```sql
  update app.platform_budget set limit_micros = 0 where day = current_date;
  ```
- Stop workers draining queues (jobs stay queued and resume later):
  ```bash
  for fn in generate batch; do
    aws lambda put-function-concurrency --function-name robes-prod-$fn --reserved-concurrent-executions 0
  done
  ```
  Undo with `put-function-concurrency` back to the configured value (`infra/config/production.ts`) or `cdk deploy`, which restores it.
- Last resort, the provider: disable the Gemini API key in GCP (Credentials → key → **Disable**). Every generation then fails; users see the generic error.

## Scheduled jobs

Pause a schedule without a deploy:

```bash
aws scheduler get-schedule --name robes-prod-daily-look-batch > s.json   # keep for re-enable
aws scheduler update-schedule --name robes-prod-daily-look-batch --state DISABLED \
  --schedule-expression "$(jq -r .ScheduleExpression s.json)" \
  --flexible-time-window Mode=OFF --target "$(jq -c .Target s.json)"
```

The next `cdk deploy` re-enables it; to keep it off, set it in code.

## Re-enable

Reverse the steps, one feature at a time, watching error rate and spend for 15 min between each.
