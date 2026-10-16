# P0 Legacy Hotfixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the critical and high findings on the **running** legacy apps (beta.byrobes.com from `beta`, www.byrobes.com from `main`) while the platform is being built. These changes must not break current beta behaviour.

**Architecture:** Minimal, surgical changes to legacy `server.js`, a new SQL migration run in the Supabase SQL editor (legacy has no migration tooling), and a small client fetch wrapper so paid API routes can require a Supabase JWT. No refactors.

**Tech Stack:** Express 4 (legacy), Supabase `Robes_p0`, vanilla JS.

**Branches:** do this work on a branch off `origin/beta` (e.g. `hotfix/security-p0`), PR into `beta`; Tasks 3–4 and 8 also apply to `main` (separate small PR). **Never** on the `platform` branch. Follow the repo root `CLAUDE.md` conventions (deploy = push; Railway auto-deploys).

**Source of findings:** production readiness review (https://claude.ai/artifact/74NsRLx4k3wsPyYGJsw3RZ) — C1, C2, C3, H1, H2, H3, H4, H5. Line numbers are `origin/beta` @ `2aef362`; re-grep before editing.

---

### Task 1: Check live exposure of the admin flag (read-only)

**Step 1:** In the Supabase SQL editor for `Robes_p0`, run:
```sql
select grantee, privilege_type from information_schema.role_table_grants
 where table_schema = 'public' and table_name = 'profiles' and grantee in ('authenticated','anon');
select column_name, grantee, privilege_type from information_schema.column_privileges
 where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_admin';
select policyname, cmd, qual, with_check from pg_policies where tablename = 'profiles';
select id, updated_at from public.profiles where is_admin = true;
```
Expected: record results in the PR description. If `authenticated` has table-level `UPDATE` and the update policy is own-row, the escalation is **live**. Compare the list of admins to the known admin(s); if unknown admins exist, treat as an incident: set them false, review `generation_log`/`admin_user_overview` access, rotate the service key.

### Task 2: Block self-escalation (C1) and anon share listing (H1)

**Files:** Create `supabase/hotfix_2026_09_security.sql` (legacy folder, run once in SQL editor, then commit).

```sql
-- C1: only the service role / postgres may change is_admin.
create or replace function public.protect_profile_admin_flag()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' and coalesce(new.is_admin, false) then
      raise exception 'is_admin is server-managed' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and new.is_admin is distinct from old.is_admin then
      raise exception 'is_admin is server-managed' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists protect_profile_admin_flag on public.profiles;
create trigger protect_profile_admin_flag before insert or update on public.profiles
  for each row execute function public.protect_profile_admin_flag();

-- H1: no anonymous listing of shared rows; /board reads with the service role (Task 5).
drop policy if exists "lookbook_select_shared" on public.lookbook_items;

-- wear_seed_labels had no RLS (data-model review): lock to read-only.
alter table if exists public.wear_seed_labels enable row level security;
drop policy if exists wear_seed_labels_read on public.wear_seed_labels;
create policy wear_seed_labels_read on public.wear_seed_labels for select to authenticated using (true);
revoke insert, update, delete on public.wear_seed_labels from anon, authenticated;
```
**Verify (SQL editor, as a test user via the API or `set role authenticated` + claims):** `update profiles set is_admin = true where id = auth.uid()` fails with 42501; normal profile saves in the beta UI still work (edit name in Account details). Deploy Task 5 **before or together with** dropping the share policy, or `/board` pages 404.

### Task 3: Validate look ids — Airtable formula injection (H2) [beta + main]

**Files:** `server.js` `GET /api/look/:id` (beta ~2199, main ~320).
```js
app.get('/api/look/:id', rateLimit({ windowMs: 60_000, max: 30 }), async (req, res) => {
  if (!/^[0-9a-f]{10}$/.test(req.params.id)) return res.status(404).json({ error: 'Not found' });
  // …existing body unchanged…
```
(On `main`, which has no `rateLimit` helper, add the id check only; Task 8 adds limits.)
**Verify:** `curl -s -o /dev/null -w '%{http_code}' "$URL/api/look/%22%20%26%20%22"` → `404`; a real share link still loads.

### Task 4: Stop crash-by-input and cap bodies (C3, H4) [beta + main]

**Files:** `server.js` top and bottom.
```js
app.set('trust proxy', 1);            // Railway: one proxy hop. Verify: log req.ip vs x-forwarded-for once.
app.disable('x-powered-by');
process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err && err.message));
```
Wrap async handlers without touching each route — add right after `const app = express();`:
```js
for (const m of ['get', 'post', 'put', 'patch', 'delete']) {
  const orig = app[m].bind(app);
  app[m] = (path, ...handlers) => orig(path, ...handlers.map((h) =>
    typeof h === 'function' && h.length < 4
      ? (req, res, next) => { try { const p = h(req, res, next); if (p && p.catch) p.catch(next); } catch (e) { next(e); } }
      : h));
}
```
(`app.get(name)` with a single string argument is the settings getter — the wrapper passes it through because `handlers` is empty.) Add the final error middleware after all routes:
```js
app.use((err, req, res, _next) => {
  console.error('[route error]', req.method, req.path, err && err.message);
  if (!res.headersSent) res.status(500).json({ error: 'Something went wrong on our side.' });
});
```
Body limits: change the global parser to `express.json({ limit: '12mb', verify… })` and cap `/api/look` (beta + main) with `if (JSON.stringify(req.body).length > 200_000) return res.status(413).end();` plus `if (!Array.isArray(ways) || ways.length > 3) return 400` and drop any `generatedImages` entry that is not an `https://res.cloudinary.com/<CLD_CLOUD>/` URL or a `data:image/(png|jpeg|webp);base64,` string ≤ 3 MB, max 3 entries.
**Verify:** `curl -XPOST $URL/api/instagram -H 'content-type: application/json' -d '{"handle":1}'` → `500 {"error":…}` and the process stays up (next request succeeds).

### Task 5: `/board` reads with the service role (H1)

**Files:** `server.js` `GET /board/:shareId` (~2376).
Replace the anon fetch headers with the service key (already set on beta for `generation_log`):
```js
{ headers: { apikey: SUPA_SERVICE_KEY, Authorization: `Bearer ${SUPA_SERVICE_KEY}` } }
```
and fix the template replacement `$`-pattern bug: `.replace('<!--__OG__-->', () => og).replace('__BOARD_JSON__', () => json)`.
**Verify:** a shared board URL renders; `curl "$SUPABASE_URL/rest/v1/lookbook_items?is_public=eq.true&select=*" -H "apikey: <publishable>"` returns `[]`.

### Task 6: Require a Supabase JWT on paid beta routes (C2)

**Files:** `server.js` (middleware), `public/dashboard.html`, `public/onboarding.html`, `public/stylenotes.html` (fetch wrapper).

Server — verify the token with Supabase Auth and cache 5 minutes:
```js
const authCache = new Map();
async function requireUser(req, res, next) {
  try {
    const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Please sign in again.' });
    const hit = authCache.get(token);
    if (hit && hit.exp > Date.now()) { req.userId = hit.id; return next(); }
    const r = await fetch(`${SUPA_URL}/auth/v1/user`, {
      headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return res.status(401).json({ error: 'Please sign in again.' });
    const u = await r.json();
    authCache.set(token, { id: u.id, exp: Date.now() + 5 * 60_000 });
    if (authCache.size > 5000) authCache.clear();
    req.userId = u.id;
    next();
  } catch (e) {
    console.warn('[requireUser]', e && e.message);
    res.status(503).json({ error: 'Robes is busy right now. Try again shortly.' });
  }
}
```
Mount before the routes: `for (const p of ['/api/style','/api/daily','/api/lookbuild','/api/alternates','/api/intent','/api/travel','/api/wardrobe/analyse','/api/wardrobe/upload','/api/wardrobe/read-url','/api/stylenotes','/api/avatar','/api/moodboard','/api/feedback','/api/instagram']) app.use(p, requireUser);`
and in the `/api` context middleware (line ~68) use `req.userId` (set after `requireUser`) instead of `req.body.userId` for `generation_log` attribution where available.

Client — one wrapper per page, installed right after the Supabase client exists (dashboard.html boot, onboarding.html, stylenotes.html):
```js
(function () {
  const orig = window.fetch.bind(window);
  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : input.url;
    if (url.startsWith('/api/') || url.startsWith(location.origin + '/api/')) {
      const { data } = await window.__robes_sb.auth.getSession();
      const token = data && data.session && data.session.access_token;
      if (token) {
        init = init || {};
        const h = new Headers(init.headers || (typeof input !== 'string' ? input.headers : undefined));
        h.set('Authorization', 'Bearer ' + token);
        init.headers = h;
      }
    }
    return orig(input, init);
  };
})();
```
(Use each page's actual client variable — `window.__robes_sb` on dashboard; `sbClient`/`_sb` elsewhere — grep before editing.)
**Verify:** signed-in beta flows (style a piece, add a piece with photo, daily, travel, style notes) still work; `curl -XPOST $URL/api/style -d '{}' -H 'content-type: application/json'` → 401.

### Task 7: Guard the product-link reader (H3)

**Files:** `inbox.js` `readProductPage` / `safeHttpUrl` (~244, ~533).
Resolve and check every hop: use `dns.promises.lookup(host, { all: true })`, reject if any address is private/loopback/link-local/CGNAT (`100.64.0.0/10`)/ULA/IPv4-mapped; fetch with `redirect: 'manual'`, re-validate `Location` up to 3 hops; stop reading after 2 MB via the body reader. Keep `INBOX_ALLOW_PRIVATE` for the smoke only and assert it is unset when `PUBLIC_URL` is a production domain.
**Verify:** reuse `scripts/inbox_smoke.mjs` plus manual `POST /api/wardrobe/read-url {"url":"http://169.254.169.254.nip.io/"}` → 400/422, no outbound request to the metadata IP.

### Task 8: Rate limits and budgets (H5, C2 on main) [beta + main]

- beta: give each route its own limiter key (`rateLimitMap` key `${routeKey}:${req.ip}`), add limits to `/api/stylenotes/analyse` (3/min), `/api/wardrobe/analyse` (20/min), `/api/wardrobe/upload` (20/min), `/api/look` (10/min), `/api/waitlist` + `/api/instagram` + `/api/feedback` (5/min).
- main: add the same small `rateLimit` helper and `trust proxy`, limit `/api/style` to 3/min and 20/day per IP, and a global daily counter that returns 503 after N generations (env `DAILY_STYLE_CAP`, default 500).
- Manual: Google Cloud budget alerts (50/80/100%) + API quota cap on the Gemini key; Cloudinary usage alerts.

### Task 9: Ship and record

Commit per task; open PRs into `beta` (Tasks 1–8) and `main` (3, 4, 8). After deploy, run the verification curls against beta and www. Update `platform/docs/plans/README.md` status for this plan and note any deviations (e.g. Railway hop count) in the PR.
