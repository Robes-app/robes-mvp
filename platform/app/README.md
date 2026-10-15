# @robes/app — Robes web platform (Next.js)

The core platform: the web experience (Today · Wardrobe · Looks · Plan + Create + You, signed-out marketing site, public share pages) and the `/api/v1` API that both web and the Expo app use.

- Stack: Next.js 16.3 (App Router, RSC, `proxy.ts`), React 19.3, Tailwind 4.3 on `@robes/tokens`, `@supabase/ssr`, deployed on Vercel (Fluid compute, `dub1`).
- API rules: `../docs/api.md` and `../docs/security.md`. Every route uses `route()` from `@robes/api`.
- Scaffolded in M0 Task 11–12 (`../docs/plans/2026-09-24-m0-foundations.md`).
