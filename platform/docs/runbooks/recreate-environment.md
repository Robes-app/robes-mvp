# Runbook — Recreate an environment

Everything is code except provider accounts and secret values. This rebuilds `staging` (or `production` after a region/account loss) from nothing. Budget ≈ 2 h plus Supabase restore time.

## Prerequisites

Accounts from `environments.md` §1 exist (or are recreated first: AWS account via Organizations, Supabase project, Vercel project). You have admin access via Identity Center and the Supabase org.

## Steps

1. **Supabase**
   - New project (same name, `eu-west-1`), asymmetric JWT keys, PITR (prod) — `environments.md` §2 steps 1–4.
   - Schema: `pnpm supabase link --project-ref <new-ref> && pnpm supabase db push`.
   - Data (production only): restore from the latest backup/PITR of the old project into the new one (`restore-pitr.md` §1), or from the daily logical dump in `robes-prod-backups` once `maintenanceFn` writes it (`../infrastructure.md` §10):
     ```bash
     aws s3 cp s3://robes-prod-backups/<latest>.dump . && pg_restore --no-owner -d "$NEW_URL" <latest>.dump
     ```
   - `robes_app` password and `DATABASE_URL` — `environments.md` §2 step 6.
2. **AWS**
   - `cdk bootstrap aws://<account>/eu-west-1` (`environments.md` §3 step 3).
   - Stateful resources in production are `RETAIN`: if the old account still exists, the bucket `robes-prod-media` and secrets survive a stack delete. Import them rather than recreate (`cdk import`) or rename in `infra/config/production.ts` if the old ones are gone.
   - Deploy: `cd platform/infra && pnpm exec cdk deploy --all -c stage=<stage>` (with the `ROBES_<STAGE>_*` env from `environments.md` §3 step 6).
   - Set all secret values (`key-rotation.md` §Set a value); new CloudFront key pair if the old private key is lost.
   - Media restore (if the bucket was lost and cross-region replication is on): `aws s3 sync s3://<replica> s3://robes-<env>-media`.
3. **GitHub**: update environment vars (`AWS_ACCOUNT_ID`, `AWS_DEPLOY_ROLE_ARN`, `SUPABASE_PROJECT_REF`); rerun the deploy workflow — it must be green.
4. **Vercel**: env vars per `environments.md` §5 (new queue URLs, role ARN, `DATABASE_URL`, Supabase keys); redeploy; domains still point at the project.
5. **DNS**: `media.<domain>` CNAME to the new CloudFront domain; Resend records unchanged unless the Resend account changed.
6. **Verify**
   - `curl $APP_URL/api/v1/health` → `{"ok":true}`
   - Sign in, upload a photo (rendition appears), run a generation end to end, receive the notification email.
   - CloudWatch alarms in `OK`; SNS subscription confirmed; budgets present.

## Tear down staging

Staging stacks are not termination-protected and use `DESTROY` policies:

```bash
aws s3 rm s3://robes-staging-media --recursive   # versioned: also delete versions, or empty via console
cd platform/infra && pnpm exec cdk destroy --all -c stage=staging
```

Secrets enter a 7–30 day recovery window; to recreate immediately with the same names, `aws secretsmanager delete-secret --force-delete-without-recovery --secret-id robes-staging/<name>` first.
