# Robes Platform

The next-generation Robes: a secure, scalable platform with a Next.js web app and an Expo (iOS/Android) app sharing one API, one design system and one data model. It is built here, beside the legacy app, which keeps serving www.byrobes.com and beta.byrobes.com until cutover.

| Folder | What |
|---|---|
| `app/` | Next.js 16 web app + `/api/v1` route handlers (Vercel) |
| `mobile/` | Expo SDK 57 app (EAS) |
| `workers/` | AWS Lambda job workers (generation, renditions, fetch, notify, maintenance) — from M1 |
| `infra/` | AWS CDK v2 app — from M1 |
| `supabase/` | Migrations, pgTAP tests, local config — from M0 |
| `packages/` | Shared: `config`, `tokens`, `contracts`, `api`, then `db`, `ui`, `ui-native`, `copy`, `icons`, `api-client`, `core`, `ai`, `media`, `jobs`, `analytics`, `emails` |
| `docs/` | Spec, requirements, reference and plans — start at `docs/SPEC.md` |

**Start here:** `docs/SPEC.md` → `docs/plans/README.md` → the current milestone plan. Agents: read `CLAUDE.md` in this folder.

Local setup (after M0): Node 24 + `corepack enable`, Docker running, then from `platform/`: `pnpm install && pnpm db:start && pnpm --filter @robes/tokens build && pnpm --filter @robes/app dev`.
