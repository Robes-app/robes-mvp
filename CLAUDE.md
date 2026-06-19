# Robes MVP — Claude Code Reference

## What this is
Fashion AI styling app. User inputs a key piece (photo, text, or link) → Gemini generates 3 editorial looks with outfit images. Live at **www.byrobes.com**, deployed on Railway.

## Branches
- `main` — live production (www.byrobes.com) — **edit this branch for anything on byrobes.com**
- `signup-flow` — Supabase auth + dashboard (in development, test at robes-mvp-co1h-production.up.railway.app) — do NOT merge to main yet

---

## PRODUCTION (`main` branch — byrobes.com)

### Stack
- **Backend**: Node.js + Express, ES modules (`"type":"module"`), `server.js`
- **Frontend**: Vanilla HTML/CSS/JS SPA — no framework, no build step
- **AI**: Google Gemini via `@google/genai`
  - `gemini-2.5-flash` — JSON styling text (3 looks)
  - `gemini-3.1-flash-image` — editorial outfit images (1 per look)
- **Storage**: Cloudinary (photo uploads + generated images), in-memory `lookStore` Map (48h TTL) for shareable look URLs
- **CRM**: Airtable — `Contacts` table (email/name), `Feedback` table (every prompt logged)

### Key files
| File | Purpose |
|------|---------|
| `server.js` | All API endpoints + Gemini calls + Cloudinary + Airtable |
| `public/index.html` | Main SPA — all screens in one file |
| `public/js/app.js` | All client logic — state, flow, rendering |
| `public/css/robes-mvp.css` | All styles |
| `public/look.html` | Shareable look page (static, loads `/api/look/:id`) |

### Deploying
```bash
git add <files>
git commit -m "message"
git push -u origin main   # triggers Railway auto-deploy on byrobes.com
```
No build step. Railway picks up `npm start` → `node server.js`.

### Environment variables (set in Railway)
- `GEMINI_API_KEY`
- `AIRTABLE_TOKEN`, `AIRTABLE_BASE_ID`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `PUBLIC_URL` = `https://www.byrobes.com`
- `PORT` (Railway sets automatically)

### App flow (modal path — primary)
1. **Landing** — email capture → `submitLandingEmail()` → Airtable `Contacts`
2. **Flow modal opens** → Step 1: prompt/photo input
3. `submitStyle()` fires `callStyle()` early (parallel with name entry), stores in `st.stylingPromise`
4. Step 2: name entry
5. Step 3: generating animation → `runGenModal()` picks up `st.stylingPromise`
6. Result → `saveLook()` hits `/api/look` → gets shareable ID → `go('result')`

### State object (`st` in app.js)
```js
{ name, email, pieceName, prompt, link, photo,
  photoUrl,          // Cloudinary URL for uploaded photo
  ways,              // array of 3 look objects from Gemini
  generatedImages,   // array of 3 base64 images from Gemini
  fallback,          // true when input wasn't recognisable as a fashion piece
  history,           // previous styling sessions (localStorage)
  stylingPromise,    // pre-fired callStyle() promise
  styleController,   // AbortController for in-flight /api/style fetch
  lookId,            // share URL id from /api/look
  resultLayout, shareIdx, idx }
```

### Key conventions
- **No framework, no build** — edit HTML/CSS/JS directly, changes are live on push
- **No comments** unless the WHY is non-obvious
- **Fallback piece**: `black Balmain waistcoat with gold buttons` — shown when Gemini can't identify a fashion item
- **Airtable logging**: every prompt auto-logged to `Feedback` table via `POST /api/look` (fires async after responding to client)
- **AbortController**: always abort `st.styleController` in `openModal()` and `closeModal()` to prevent orphaned server requests
- **Image fallback**: when a generated image is null (timeout/fail), show `.way-img-placeholder` div — never fall back to `st.photo`
- **`.reveal` sections**: use IntersectionObserver in `prepLanding()` to add `.in` class — they start `opacity:0`

### Airtable schema
**Contacts**: `Email`, `Name`, `Instagram Handle`, `Joined At`
**Feedback**: `Email`, `Prompt`, `Piece Link` (look URL), `Photo` (attachments), `Looks Output`, `Rating`, `User Feedback`, `Created At`

### Common gotchas
- `paintProgress()` guards for missing `#nav-progress` — don't add back the null check removal
- `gemini-3.1-flash-image` is slow (~30s) and occasionally times out — 40s server timeout, images run in parallel
- `callStyle()` fires early from `submitStyle()` — don't move it later or users wait longer
- `persist()` strips `photo` and `generatedImages` from history when localStorage is full
- Look share page (`/look/:id`) serves `look.html` which fetches `/api/look/:id` — data lives in-memory 48h, falls back to Airtable `Feedback` table on cache miss (queries by `Piece Link` field)

---

## IN DEVELOPMENT (`signup-flow` branch — not on byrobes.com yet)

### Additional stack
- **Auth + DB**: Supabase (project: `Robes_p0`, URL: `https://ayowpaknssulsqqvwpqx.supabase.co`)
  - Google OAuth + email/password auth
  - `profiles` table — first_name, style_icons[], budget, wardrobe_description
  - `prompt_history` table — logs every Anthropic API call per user
- **AI (wardrobe context)**: Anthropic `claude-sonnet-4-6` via Supabase Edge Function

### Additional files (signup-flow only)
| File | Purpose |
|------|---------|
| `public/signup.html` | Supabase auth signup page (email + Google OAuth) |
| `supabase/schema.sql` | DB schema — run once in Supabase SQL editor |
| `supabase/functions/wardrobe-context/index.ts` | Edge Function — assembles user profile, calls Anthropic, writes to prompt_history |

### Supabase config
- Project: `Robes_p0`
- URL: `https://ayowpaknssulsqqvwpqx.supabase.co`
- Publishable key: `sb_publishable_D_iIPtp_R6kjN_711jfyTg_sFmRdpwJ`
- Google OAuth: enabled, callback URL registered in Google Cloud Console
- Allowed redirect URLs: `https://robes-mvp-production.up.railway.app/**`, `https://robes-mvp-co1h-production.up.railway.app/**`
- Edge Function secrets set: `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (auto-injected)

### Supabase DB schema
**profiles**: `id` (FK → auth.users), `first_name`, `style_icons[]`, `budget`, `wardrobe_description`, `created_at`, `updated_at`
- Auto-created on signup via `handle_new_user` trigger
- RLS: users can only read/write their own row

**prompt_history**: `id`, `user_id` (FK → profiles), `prompt`, `response`, `tokens_used`, `model`, `created_at`
- RLS: users can only read/write their own rows

### Edge Function: wardrobe-context
- URL: `https://ayowpaknssulsqqvwpqx.supabase.co/functions/v1/wardrobe-context`
- Auth: pass user's JWT in `Authorization: Bearer <token>` header
- Body: `{ "prompt": "..." }`
- Reads user profile, assembles system prompt, calls `claude-sonnet-4-6`, writes to prompt_history
- Returns: `{ "response": "...", "tokens_used": N }`

### signup.html conventions
- Supabase client instantiated as `sbClient` (not `supabase` — conflicts with `window.supabase` global from CDN)
- Google OAuth redirects to `/dashboard` after auth
- Email signup: sends confirmation email; if `data.session` exists, redirects immediately

### What's next to build (dashboard)
- `public/dashboard.html` — protected page, checks Supabase session on load
- Show user's first name, allow them to fill in style_icons, budget, wardrobe_description → saves to `profiles` table
- Input field to send a prompt to the `wardrobe-context` Edge Function and display the response
- If no session → redirect to `/signup.html`
