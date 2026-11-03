# Staging deploy hand-off: workers now, then deploy-on-merge

For: Niall (or an agent Niall runs from `platform/`). Written 2026-10-28.
Owner of the outcome: Annie. Background: `environments.md` §4 step 10 and §5.

## Why

Staging has two halves that deploy differently:

- **Web app (Vercel):** redeploys on every `beta` merge. Live.
- **Workers and infra (AWS CDK, account 259887029472, eu-west-1):** never redeploy on a merge. The
  `platform-deploy-staging` workflow has no GitHub `staging` environment, so it fails (run
  #1, 28 Oct, at the first step that needs it).

So photo reads on staging still run the old worker, even though the fixes are merged:
`gemini-3.8-flash` at full resolution, print and material read (`wardrobe.pieces` v2), PR #56.
A blouse with a Sézane collar label still files with no brand, print or material.

Do **Part A** today so Annie can test. Do **Part B** and **Part C** so it never happens again.

## Rules for the agent

- Staging only. Never touch `Production/*` or the `production` environment.
- Never print, log, echo or commit a secret. Ask the human to paste a secret straight into the
  command that needs it, or read it from their password manager or Vercel. Don't put secret values
  in this file, the shell history or a PR.
- Run `cdk diff` before `cdk deploy`. **Stop and show the human the diff** if it removes or
  replaces anything they didn't expect: an alarm subscription, an env var such as `POSTHOG_KEY`,
  a bucket, the OIDC provider or a secret. Deploy only after they say yes.
- Staging **owns** the GitHub OIDC provider. Never set `ROBES_STAGING_GITHUB_OIDC_PROVIDER_ARN`:
  importing it would delete it.
- If anything below disagrees with what you find in AWS or GitHub, stop and ask. Don't improvise.

## Part A: deploy the staging workers from a laptop (now, ~10 min)

Needs AWS credentials for account 259887029472 with CDK deploy rights (the ones used on
23 Oct), Node 24, pnpm 11.27.1.

1. Get the latest `beta`:
   ```bash
   git fetch origin && git checkout beta && git pull --ff-only
   cd platform && pnpm install --frozen-lockfile
   ```
2. Confirm the AWS identity is the right account:
   ```bash
   aws sts get-caller-identity   # Account must be 259887029472
   ```
3. Set the synth inputs. Use the **same values as the 23 Oct deploy**, or the diff will strip
   them:
   ```bash
   export ROBES_STAGING_AWS_ACCOUNT_ID=259887029472
   export ROBES_STAGING_BUDGETS=off
   export ROBES_STAGING_GENERATE_RESERVED_CONCURRENCY=0
   export ROBES_STAGING_ALERT_EMAIL=...   # the address that gets staging alerts today
   export ROBES_POSTHOG_KEY=...           # the PostHog project key the workers carry today
   # Only if they were set on 23 Oct (staging has no custom media domain yet, so normally unset):
   # export ROBES_STAGING_MEDIA_DOMAIN=... ROBES_STAGING_MEDIA_CERT_ARN=...
   ```
   To find the current values without guessing: in AWS Lambda (eu-west-1), open any
   `robes-staging-*` worker → Configuration → Environment variables (`POSTHOG_KEY`), and SNS →
   topic `robes-staging-alerts` → Subscriptions (the alert email).
4. Diff, read it, then deploy:
   ```bash
   cd infra
   pnpm cdk diff 'Staging/*' -c stage=staging
   # Expected: Lambda code/asset changes for the workers (new bundle). Nothing removed.
   pnpm cdk deploy 'Staging/*' -c stage=staging
   ```
5. Check it's live:
   ```bash
   curl -fsS https://staging.byrobes.com/api/v1/health
   ```
   Then ask Annie to add one piece from a photo on staging. A label in the photo should come back
   as the brand, and print and material should be filled.

## Part B: set up the GitHub `staging` environment (~15 min)

This lets the **Run workflow** button deploy staging, and lets Part C make it automatic.

1. Confirm the deploy role exists (Part A, or the first laptop deploy, created it):
   ```bash
   aws iam get-role --role-name robes-staging-github-deploy --query Role.Arn --output text
   # arn:aws:iam::259887029472:role/robes-staging-github-deploy
   ```
   It trusts `repo:Robes-app/robes-mvp:environment:staging`, so the environment name must be
   exactly `staging`.
2. Create the environment and its variables. Use the `gh` CLI, authenticated as a repo admin:
   ```bash
   gh api -X PUT repos/Robes-app/robes-mvp/environments/staging
   R=Robes-app/robes-mvp
   gh variable set AWS_ACCOUNT_ID --env staging -R $R -b 259887029472
   gh variable set AWS_DEPLOY_ROLE_ARN --env staging -R $R -b arn:aws:iam::259887029472:role/robes-staging-github-deploy
   gh variable set APP_URL --env staging -R $R -b https://staging.byrobes.com
   gh variable set BUDGETS --env staging -R $R -b off
   gh variable set GENERATE_RESERVED_CONCURRENCY --env staging -R $R -b 0
   gh variable set ALERT_EMAIL --env staging -R $R -b '<same as Part A>'
   gh variable set POSTHOG_KEY --env staging -R $R -b '<same as Part A>'   # a publishable key, not a secret
   # Only if Part A used them: MEDIA_DOMAIN, MEDIA_CERT_ARN, BUDGET_EMAIL, CLOUDFRONT_PUBLIC_KEY
   ```
3. Add the one secret, the **migration** role's URL for the staging database (owns the schema;
   never the runtime `robes_app` URL). It's the value Vercel's staging build uses as
   `DATABASE_ADMIN_URL`. Have the human paste it at the prompt so it never lands in history:
   ```bash
   gh secret set MIGRATION_DATABASE_URL --env staging -R Robes-app/robes-mvp
   ```
4. Test it: GitHub → Actions → **platform-deploy-staging** → **Run workflow** → branch `beta`.
   It must go green through `db migrate`, `cdk deploy (Staging)` and `smoke`. If `cdk deploy`
   fails on credentials, re-check step 1 and the environment name.

## Part C: deploy on every `beta` merge (1 min, after Part B is green)

The workflow already triggers on `beta` (from PR "parity pass 4"). The deploy job waits for one
repo-level switch, so merges don't fail while Part B is undone:

```bash
gh variable set STAGING_AUTO_DEPLOY -R Robes-app/robes-mvp -b true
```

From then on, a `beta` merge that touches `platform/**` deploys the workers too. To pause it, set
the variable to `false`.

## Done when

- [ ] Part A: `cdk deploy` finished with nothing unexpected removed; a photo read on staging
      returns brand, print and material.
- [ ] Part B: a manual **Run workflow** on `beta` is green.
- [ ] Part C: `STAGING_AUTO_DEPLOY=true`, and the next `beta` merge's deploy is green.
- [ ] Update `environments.md` §4 step 10: the "GitHub environments are not set up" line becomes
      "set up 2026-10-<dd>".
