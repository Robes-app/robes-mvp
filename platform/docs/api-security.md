# API security guide

The rules for anyone, person or Claude, who adds or changes an API route, a database query, sign-in, uploads or a background job. Each rule exists because breaking it would let one person see or change someone else's wardrobe, photos or account, or run up the AI bill.

The full requirement list with its reasoning is in [`security.md`](security.md) (SEC-xx numbers), and the binding rules for Claude are in [`../CLAUDE.md`](../CLAUDE.md). This page is the practical version: how to do it right, and what to refuse.

## How the API protects people (the five layers)

1. **Every route goes through `route()`** (`app/src/server/route.ts`, built on `@robes/api`). It checks the session, validates input with zod, limits body size (32 KB), applies rate limits and feature flags, and parses the response through the `output` schema so undeclared fields never leave the server.
2. **Identity comes only from the session.** `user.id` comes from the Better Auth session cookie (web) or the session token in the device keychain (native). It is never read from the body, query or URL.
3. **Database access is scoped by a branded `UserId`.** Route handlers never write SQL. They call `@robes/db` repositories whose first argument is a `UserId`, a branded type minted by `verifiedUserId()` only after identity is proven (the session in `server/session.ts`, or a signed link such as unsubscribe). Every query filters on it.
4. **Postgres is private.** The app connects as `robes_app` (create, read, update and delete on schema `app` only). No browser or phone ever talks to the database, and there are no Supabase client keys.
5. **Tests prove it.** `route-manifest.test.ts` fails if a route skips `route()` or is public without being allow-listed. Every repository has a cross-user test showing user B gets nothing of user A's.

## Adding a route: do it this way

1. Add the schemas to `@robes/contracts` and one entry to `packages/contracts/src/routes.ts`.
2. Create `app/src/app/api/v1/<path>/route.ts`:

```ts
export const POST = route({
  auth: 'user',                 // 'user' unless there is a written reason; 'admin' for /admin
  input: CreateThingInput,      // zod, from @robes/contracts
  output: Thing,                // what the client may see, nothing more
  rateLimit: { key: 'things.create', limit: 20, windowSeconds: 60 },
  handler: async ({ input, user }) => repos.things.create(user.id, input),
});
```

3. Add or extend a repository in `packages/db/src/repos/`. Its first argument is `userId: UserId`, and every `where` includes it. Write a cross-user test.
4. If it calls an AI model, or takes more than about 3 seconds, make it a job: `startJob()` charges the quota and creates the job in one transaction, and the route returns `202 { jobId }`. Job input carries ids and intent only. The worker loads her wardrobe, style DNA and plan from the database by the job's `user_id`.
5. Run `pnpm verify`. The manifest and contract tests will tell you if anything is missing.

## Never do these

| Don't | Why | Do instead |
|---|---|---|
| Read `userId`, `ownerId`, an email, a plan or an "isAdmin" from the request | Anyone can send any value | Use `user.id` from the handler args, and load everything else from the database |
| Call `verifiedUserId()` on an id from the request | It turns an attacker's input into a trusted identity | Only the session (or a verified signature) yields a `UserId` |
| Write `export async function GET(req)` without `route()` | It skips auth, validation and limits; the manifest test fails | Use `route()` / `sseRoute()` |
| Set `auth: 'public'` to make something "just work" | It exposes the route to the internet | Keep `auth: 'user'`. A genuinely public route (share page, waitlist, unsubscribe) needs a reason, an entry in the manifest allow-list and in `api.md` §3, and a rate limit |
| Return a database row directly, or loosen `output` with `.passthrough()` / `z.any()` | Leaks internal and other fields | Declare exactly the fields the screen needs |
| Query by id alone (`where id = $1`) | Lets anyone read anyone's row by guessing ids | Always `where id = $1 and user_id = $2`, via a repository |
| Answer "forbidden" for someone else's row | Confirms the row exists | Answer `not_found` (404) |
| Import Kysely, `pg` or `sql` in a route handler | Bypasses the repository guarantees | Add a repository function |
| Call Gemini (or any paid API) inside a route | No quota, no retry, and a timeout risk | Use a job with a quota |
| Put user photos in a public bucket, or return raw S3 URLs | Photos must stay private (SEC-20/21) | Presigned upload + signed delivery via `@robes/media` |
| Fetch a URL the user gave you with `fetch()` | Server-side request forgery into AWS internals | Use `safeFetch` in `packages/jobs/src/link/safe-fetch.ts` (SEC-40) |
| Log emails, names, prompts, tokens or photos | Logs are not private | Log ids and counts; `@robes/logger` scrubs, but don't rely on it |
| Show model or provider error text to the user | Leaks internals and prompts | Throw an `ApiError` with a short code |
| Store tokens in `localStorage` / AsyncStorage | Readable by any script or malicious package | Web uses httpOnly cookies; native uses SecureStore (Better Auth Expo plugin) |
| Add a wildcard to `AUTH_TRUSTED_ORIGINS` or OAuth redirects | Lets other sites complete sign-in | List exact origins and schemes |
| Add a third-party script or CDN | CSP blocks it, and it can read the page | Bundle the package; if it really needs an origin, update the CSP in `server/security-headers.ts` and `data-inventory.md` |
| Commit a secret, or paste one into a doc or chat | It lives in git history forever | `.env.local` (gitignored), Vercel env (sensitive) or AWS Secrets Manager |
| Edit an applied migration, or change data in the Supabase dashboard | Environments drift silently | `pnpm db:new <name>`; migrations are forward-only |
| Make yourself admin by editing a table | No audit trail | `pnpm --filter @robes/db admin:grant <email>`; admin reads are audited |
| Disable or skip a failing test to get green | The test is usually the security check | Fix the cause |

## Admin routes

- Use `auth: 'admin'` (role `admin` in `app.admin_users`; `support`/`analyst` are not admins).
- Every admin read of user data writes `app.audit_log`.
- Admin pages show no user content beyond what the task needs.

## Before you merge: checklist

- [ ] Every new route uses `route()` with `auth`, `input`, `output`, and a `rateLimit` (and a quota, via a job, if it spends money).
- [ ] No identity, entitlement or context is read from the request.
- [ ] New queries live in repositories scoped by `UserId`, with a cross-user test.
- [ ] New tables are in schema `app`, carry `user_id` with composite foreign keys, and have schema tests (`packages/db/test/schema`).
- [ ] New personal data is listed in `data-inventory.md`, and account deletion/export cover it.
- [ ] No new public route, third-party origin, secret or bucket prefix without the matching doc and test update.
- [ ] `pnpm verify` and `pnpm --filter @robes/app test:e2e` are green.

If a request can only be met by breaking one of these rules, stop and ask the owner. There is almost always a safe way to build the same feature.
