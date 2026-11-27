# Runbook — Releasing: the sync, the workers and the iPhone app

How a change on `beta` reaches production (`app.byrobes.com`, its workers) and the iPhone app
(TestFlight, then the App Store). The rules are in `platform/CLAUDE.md` → *Releases and
compatibility* and ADR-022 (`SPEC.md` §4); the words (*sync*, *minimum app version*, *two-step
change*…) are in the root `GLOSSARY.md` → Releases. Steps marked **[Niall]** need his accounts.

The order is always: **sync → workers → build from `main` → TestFlight → Beta App Review → raise
the latest app version**. A two-step change raises the minimum app version later, on its own.

## 0. Before the sync: is anything a two-step change?

The sync PR lists the PRs going over. **CI answers this for you**: `packages/api-client/src/compat.test.ts`
checks every saved contract (`contracts/<version>.json`) at or above the minimum app version
against the API in the tree, and fails naming each route and field that would break. Replayed on
0.7.0 against 0.8.0's API, it names #259's wider sizes and new cup values. A change is a
two-step change when a supported app version would fail against it: a request it sends is now
refused (an input narrowed, a new required field, a route renamed or removed), or a response
field it reads is gone. **Until the minimum app version is 0.9.0 or later, a wider response is one
too**: 0.8.0 and earlier reject a whole response holding a new enum value or a wider range (#259
broke 0.7.0 this way). From 0.9.0 the app reads them tolerantly, except a new value in a required
field outside any list (`platform/CLAUDE.md` rule 3).

A two-step change never ships whole. Step one makes production accept old and new; the new app
ships; step two (§6) raises the minimum app version once the old app is gone.

## 1. The sync **[Niall merges]**

One PR into `main` carrying `platform/` whole from `beta`, beta's deletions included. Never a
whole-branch PR (its head is `beta`: it would put the legacy app on www), never a hand-picked
list of paths, never an old sync branch (it rolls `main` back).

`.github/workflows/platform-sync-pr.yml` keeps it: after every beta merge that touches
`platform/` it rebuilds `sync/platform` from `beta`, opens or refreshes the PR into `main`, lists
the PRs going over and starts its checks. Merge it once the checks are green; nothing else to
rebuild. It needs, once **[Niall]**: Settings → Actions → General → *Allow GitHub Actions to
create and approve pull requests*. By hand (the action is off, or `.github/` changed, which its
token can't push), from the main checkout:

```bash
git fetch origin
git worktree add -b sync/platform-<topic> ../robes-sync origin/main && cd ../robes-sync
git rm -rq platform && git checkout origin/beta -- platform     # a bare checkout keeps beta's deleted files on main
git commit -m "sync: platform from beta at $(git rev-parse --short origin/beta)"
git diff --stat origin/beta HEAD -- platform                    # must print nothing
git push -u origin HEAD && gh pr create --base main
```

Annie merges into `beta` through the day: by hand, **rebuild just before merging** (the same
three git lines) so it still matches `origin/beta`. `.github/` goes over the same way when it changed;
the root `CLAUDE.md` and `docs/legacy-app-history.md` differ on `main` on purpose (www entries)
and are synced by hand, by path.

**Prove it on production** once Vercel's `robes-prod` build is Ready:
- The build log lists each migration: `vercel inspect <deployment> --logs | grep Applied`
  (from a folder linked to `robes-prod`). Production migrates itself as `robes_migrator`
  (`database-migrations.md`); nothing is run by hand.
- `curl https://app.byrobes.com/api/v1/health` → `{"ok":true}`, and a route the sync added
  answers 401 rather than 404.

## 2. Production workers

The workers (looks, photo reads, the hourly sweep) deploy **after** §1's build has migrated (new
workers read new columns). `.github/workflows/platform-deploy-prod-workers.yml` does it: when
Vercel reports `robes-prod` succeeded on a `main` commit whose `platform/` is still main's, it runs `cdk diff
'Production/Workers'` and deploys only when the diff is the functions' code
(`infra/src/lib/diff-guard.ts`); an empty diff deploys nothing. Anything more (IAM, queues,
alarms, a function's environment) fails the run, and a person deploys by hand, below. It needs,
once **[Niall]**: in the GitHub environment `production`, the variables `AWS_DEPLOY_ROLE_ARN`
(`arn:aws:iam::259887029472:role/robes-prod-github-deploy`) and `POSTHOG_KEY` (the staging one;
one PostHog project) and deployments from `main` only; then the repo variable
`PROD_WORKERS_AUTO_DEPLOY=true`.

By hand **[Niall's AWS session]**, from an up-to-date `main` checkout, never `beta`:

```bash
# AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_SESSION_TOKEN: an SSO session on 259887029472
# (AdministratorAccess, from the portal). The ~/.aws default profile's static key is dead.
export ROBES_POSTHOG_KEY=<phc_…>   # GitHub variable POSTHOG_KEY (staging env); one PostHog project for both stages
cd platform/infra                  # in a worktree, put node_modules/.bin on PATH or bundling can't find esbuild
ROBES_PRODUCTION_AWS_ACCOUNT_ID=259887029472 ROBES_PRODUCTION_BUDGETS=off \
  ROBES_PRODUCTION_GENERATE_RESERVED_CONCURRENCY=0 \
  ROBES_PRODUCTION_GITHUB_OIDC_PROVIDER_ARN=arn:aws:iam::259887029472:oidc-provider/token.actions.githubusercontent.com \
  pnpm cdk diff 'Production/Workers' -c stage=production --exclusively --output cdk.out.prod
pnpm --filter @robes/infra deploy:prod-workers   # only if the diff is the six functions' Code
```

Stop if the diff touches alerts, the CDN or IAM. Never deploy `'Production/*'` from a laptop:
without the alert email and media settings it deletes the alert subscriptions and changes the
CDN. Delete `cdk.out.prod/` afterwards: left in a build worktree it is uploaded to EAS (59 MB).

## 3. The build (from `main`, after the sync)

1. Bump `platform/mobile/app.json` → `version` in a PR into `beta` (a new version for anything
   testers should be asked to update to; EAS raises the build number itself). It reaches `main`
   with the sync.
2. **[Niall]** Build from a fresh worktree of `origin/main` (never the main checkout, which may
   sit on another branch), with Node 24 (`PATH=$HOME/.nvm/versions/node/v24.22.1/bin:$PATH`) and
   `pnpm install` in its `platform/`. The deploy kit (not in git; keys and signing, Niall holds
   it) builds on EAS (`production` profile, `com.byrobes.app` → `app.byrobes.com`), uploads with
   `altool` and sets *What to Test* from `platform/mobile/testflight.json`:
   ```bash
   ~/Projects/ios-deployment-stuff/robes/testflight.sh <path to the main worktree>
   ```
   About 30 minutes. When it says the build is ready, the internal group **Robes team** has it.
3. Save the build's contract from the same worktree and bring it to `beta` by PR, so CI holds
   every later change to it:
   ```bash
   cd platform && pnpm --filter @robes/api-client contract:save   # contracts/<version>.json
   ```

There is no staging iPhone app: every TestFlight build talks to production, which is why the
sync comes first.

## 4. Public beta (Beta App Review)

The external group **Public beta** (public link, limit 500) gets a build only after Apple's Beta
App Review. A new version always goes to review (0.8.0: about 10½ hours); a later build of the
same version may not. With the kit's `asc.mjs`:

```js
await asc('POST', '/v1/betaGroups/<Public beta id>/relationships/builds', { data: [{ type: 'builds', id }] });
await asc('POST', '/v1/betaAppReviewSubmissions', { data: { type: 'betaAppReviewSubmissions', relationships: { build: { data: { type: 'builds', id } } } } });
// approved when GET /v1/builds/<id>/buildBetaDetail → externalBuildState is IN_BETA_TESTING
```

The review notes (`GET /v1/apps/<app id>/betaAppReviewDetail`) walk the reviewer through sign-in
(the review account, `GLOSSARY.md`) and onboarding; when either screen changes, patch them in
the same release.

## 5. After approval: the latest app version

Raise `latest` in `platform/app/src/server/app-versions.ts` to the approved version, by PR into
`beta` and the next sync, so older apps (0.9.0 on) show "A new Robes is ready." once. Never before
approval: the toast would point at nothing installable.

## 6. Two-step changes: raising the minimum app version

Raise it only when PostHog shows no sessions below it in the last 7 days, or the builds below it
are past TestFlight's 90-day expiry; otherwise step two waits. In the same PR delete the
`contracts/<version>.json` files below it. It is `minimum` in
`platform/app/src/server/app-versions.ts`, raised by its own PR into `beta`, and it must reach
production **with or before** the change that needs it, never after. Apps below it see only the
update screen (0.9.0 on; 0.8.0 shows the same line with a *Not now* that leads nowhere). Check it
once the sync is live:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -H 'x-robes-app-version: <old>' https://app.byrobes.com/api/v1/me   # 426
curl -s -o /dev/null -w '%{http_code}\n' -H 'x-robes-app-version: <new>' https://app.byrobes.com/api/v1/me   # 401
```

Until 27 Nov 2026 the minimum was the Vercel variable `MIN_APP_VERSION` on `robes-prod`; nothing
reads it once the version file is live, so **[Niall]** removes it then.

## Rolling back

Migrations are forward-only. Vercel → `robes-prod` → an earlier deployment → *Instant Rollback*
puts the old code on the new schema, which is safe only because every migration works with the
code before it (`database-migrations.md`). Workers roll back by redeploying from the earlier
`main` commit (§2). A TestFlight build is never pulled; ship a fixed one.

## Follow-ups (not built)

- Over-the-air JS updates (EAS Update): `expo-updates` is not installed, and the app version
  and `runtimeVersion` would need a policy first.
- A staging iPhone app (Robes Staging, `com.byrobes.app.staging`, `--profile staging`): its App
  Store Connect app was never made (`eas.json` → `submit.staging.ios.ascAppId` is a placeholder).
