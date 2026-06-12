# Robes MVP — Claude Code Reference

## What this is
Fashion AI styling app. User inputs a key piece (photo, text, or link) → Gemini generates 3 editorial looks with outfit images. Live at **www.byrobes.com**, deployed on Railway.

## Stack
- **Backend**: Node.js + Express, ES modules (`"type":"module"`), `server.js`
- **Frontend**: Vanilla HTML/CSS/JS SPA — no framework, no build step
- **AI**: Google Gemini via `@google/genai`
  - `gemini-2.5-flash` — JSON styling text (3 looks)
  - `gemini-3.1-flash-image` — editorial outfit images (1 per look)
- **Storage**: Cloudinary (photo uploads + generated images), in-memory `lookStore` Map (48h TTL) for shareable look URLs
- **CRM**: Airtable — `Contacts` table (email/name), `Feedback` table (every prompt logged)

## Key files
| File | Purpose |
|------|---------|
| `server.js` | All API endpoints + Gemini calls + Cloudinary + Airtable |
| `public/index.html` | Main SPA — all screens in one file |
| `public/js/app.js` | All client logic — state, flow, rendering |
| `public/css/robes-mvp.css` | All styles |
| `public/look.html` | Shareable look page (static, loads `/api/look/:id`) |

## Deploying
```bash
git add <files>
git commit -m "message"
git push -u origin main   # triggers Railway auto-deploy
```
No build step. Railway picks up `npm start` → `node server.js`.

## Environment variables (set in Railway)
- `GEMINI_API_KEY`
- `AIRTABLE_TOKEN`, `AIRTABLE_BASE_ID`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `PUBLIC_URL` = `https://www.byrobes.com`
- `PORT` (Railway sets automatically)

## App flow (modal path — primary)
1. **Landing** — email capture → `submitLandingEmail()` → Airtable `Contacts`
2. **Flow modal opens** → Step 1: prompt/photo input
3. `submitStyle()` fires `callStyle()` early (parallel with name entry), stores in `st.stylingPromise`
4. Step 2: name entry
5. Step 3: generating animation → `runGenModal()` picks up `st.stylingPromise`
6. Result → `saveLook()` hits `/api/look` → gets shareable ID → `go('result')`

## State object (`st` in app.js)
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

## Key conventions
- **No framework, no build** — edit HTML/CSS/JS directly, changes are live on push
- **No comments** unless the WHY is non-obvious
- **Fallback piece**: `black Balmain waistcoat with gold buttons` — shown when Gemini can't identify a fashion item
- **Airtable logging**: every prompt auto-logged to `Feedback` table via `POST /api/look` (fires async after responding to client)
- **AbortController**: always abort `st.styleController` in `openModal()` and `closeModal()` to prevent orphaned server requests
- **Image fallback**: when a generated image is null (timeout/fail), show `.way-img-placeholder` div — never fall back to `st.photo`
- **`.reveal` sections**: use IntersectionObserver in `prepLanding()` to add `.in` class — they start `opacity:0`

## Airtable schema
**Contacts**: `Email`, `Name`, `Instagram Handle`, `Joined At`  
**Feedback**: `Email`, `Prompt`, `Piece Link` (look URL), `Photo` (attachments), `Looks Output`, `Rating`, `User Feedback`, `Created At`

## Common gotchas
- `paintProgress()` guards for missing `#nav-progress` — don't add back the null check removal
- `gemini-3.1-flash-image` is slow (~30s) and occasionally times out — 40s server timeout, images run in parallel
- `callStyle()` fires early from `submitStyle()` — don't move it later or users wait longer
- `persist()` strips `photo` and `generatedImages` from history when localStorage is full
- Look share page (`/look/:id`) serves `look.html` which fetches `/api/look/:id` — data lives in-memory, expires 48h
