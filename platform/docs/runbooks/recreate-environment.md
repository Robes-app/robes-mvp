# Runbook — Recreate an environment

Everything is code except provider accounts and secret values. This rebuilds `staging` (or `production` after a region/account loss) from nothing. Budget ≈ 2 h plus database restore time.

## Prerequisites

Accounts from `environments.md` §1 exist (or are recreated first: AWS account via Organizations, Postgres host project, Vercel project). You have admin access via Identity Center and the Postgres host.

## Steps

1. **Postgres** (`environments.md` §2)
   - New database on the chosen host in the EU, PITR on (production).
   - Roles and URLs: migration role + `robes_app` passwords, `MIGRATION_DATABASE_URL` / `DATABASE_URL`.
   - Schema: `cd platform && DATABASE_URL="$MIGRATION_DATABASE_URL" pnpm db:migrate`.
   - Data (production only): restore from the host's PITR/backup of the old database (`restore-pitr.md` §1), or from the daily logical dump in `robes-prod-backups` once `maintenanceFn` writes it (`../infrastructure.md` §10):
     ```bash
     aws s3 cp s3://robes-prod-backups/<latest>.dump . && pg_restore --no-owner --role=robes_migrator -d "$MIGRATION_DATABASE_URL" <latest>.dump
     ```
2. **AWS**
   - `cdk bootstrap aws://<account>/eu-west-1` (`environments.md` §4 step 3).
   - Stateful resources in production are `RETAIN`: if the old account still exists, the bucket `robes-prod-media` and secrets survive a stack delete. Import them rather than recreate (`cdk import`) or rename in `infra/config/production.ts` if the old ones are gone.
   - Deploy: `cd platform/infra && pnpm cdk deploy --all -c stage=<stage>` (with the `ROBES_<STAGE>_*` env from `environments.md` §4 step 6).
   - Set all secret values (`key-rotation.md` §Set a value); new CloudFront key pair if the old private key is lost.
   - Media restore (if the bucket was lost and cross-region replication is on): `aws s3 sync s3://<replica> s3://robes-<env>-media`.
3. **GitHub**: update environment vars (`AWS_ACCOUNT_ID`, `AWS_DEPLOY_ROLE_ARN`) and the `MIGRATION_DATABASE_URL` secret; rerun the deploy workflow; it must be green.
4. **Vercel**: env vars per `environments.md` §6 (new queue URLs, the new API user's access key from `robes-<env>/api/aws-access-key`, `DATABASE_URL`, Better Auth/Apple/Google values); redeploy; domains still point at the project. Apple/Google callback URLs are unchanged if the app domain is.
5. **DNS**: `media.<domain>` CNAME to the new CloudFront domain; SES DKIM/MAIL FROM records must be re-added from the new `Email` stack outputs (new account = new DKIM tokens), and production SES access requested again (`environments.md` §9).
6. **Verify**
   - `curl $APP_URL/api/v1/health` → `{"ok":true}`
   - Sign in (OTP, Apple, Google), upload a photo (rendition appears), run a generation end to end, receive the notification email.
   - CloudWatch alarms in `OK`; SNS subscription confirmed; budgets present.

## Tear down staging

Staging stacks are not termination-protected and use `DESTROY` policies:

```bash
aws s3 rm s3://robes-staging-media --recursive   # versioned: also delete versions, or empty via console
cd platform/infra && pnpm cdk destroy --all -c stage=staging
```

Secrets enter a 7–30 day recovery window; to recreate immediately with the same names, `aws secretsmanager delete-secret --force-delete-without-recovery --secret-id robes-staging/<name>` first.
