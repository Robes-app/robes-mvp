import 'dotenv/config';
import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash, randomBytes } from 'crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import { readFileSync } from 'fs';
import { GoogleGenAI } from '@google/genai';
import { buildColorHarmony, buildSilhouette, styleDnaPromptBlock } from './style_dna.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;

/* ── look store (in-memory, 48h TTL) ────────────────────────────── */
const lookStore = new Map();
setInterval(() => {
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  for (const [id, look] of lookStore) {
    if (look.created < cutoff) lookStore.delete(id);
  }
}, 60 * 60 * 1000);

/* ── image job store (in-memory, 10min TTL) ──────────────────────── */
const imageJobs = new Map();
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [id, job] of imageJobs) {
    if (job.created < cutoff) imageJobs.delete(id);
  }
}, 5 * 60 * 1000);

app.use(express.json({ limit: '20mb' }));
app.use(express.static(join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js') || filePath.endsWith('.css') || filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  },
}));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/* ── structured AI logging ───────────────────────────────────────── */
function logAI(event) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), ...event }));
}

/* ── generation_log — LLM call trail (admin capture, migration 11) ── */
// Every Gemini call is recorded to Supabase generation_log with the
// service role (bypasses RLS by design): endpoint, model, latency,
// tokens, status and the FULL prompt/response — the learning corpus,
// admin-read-only. A request-scoped AsyncLocalStorage context carries
// endpoint + userId into the background image loops, and one wrapper on
// ai.models.generateContent covers every endpoint without touching them.
// Degrades to a no-op until SUPABASE_SERVICE_ROLE_KEY is set on the
// Railway service.
const SUPA_URL = process.env.SUPABASE_URL || 'https://ayowpaknssulsqqvwpqx.supabase.co';
const SUPA_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_ENV = (process.env.PUBLIC_URL || '').includes('www.byrobes.com') ? 'production' : 'beta';
const genCtx = new AsyncLocalStorage();

app.use('/api', (req, res, next) => {
  const uid = req.body && typeof req.body.userId === 'string' && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(req.body.userId)
    ? req.body.userId : null;
  // genId: client-minted per-generation correlation id — the same id is
  // stored inside the saved lookbook entry, so the admin panel can join
  // "her typed prompt → every LLM call → the artifact" without a schema
  // change (it lives in generation_log.detail).
  const genId = req.body && typeof req.body.genId === 'string' ? req.body.genId.slice(0, 24) : null;
  const rawPrompt = req.body && (req.body.prompt || req.body.brief || req.body.activity);
  const userPrompt = typeof rawPrompt === 'string' && rawPrompt.trim() ? rawPrompt.trim().slice(0, 400) : null;
  genCtx.run({ endpoint: req.baseUrl + req.path, userId: uid, genId, userPrompt }, next);
});

function glog(row) {
  if (!SUPA_SERVICE_KEY) return;
  fetch(SUPA_URL + '/rest/v1/generation_log', {
    method: 'POST',
    headers: {
      'apikey': SUPA_SERVICE_KEY,
      'Authorization': 'Bearer ' + SUPA_SERVICE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ environment: APP_ENV, ...row }),
  }).then(r => {
    if (!r.ok) return r.text().then(t => console.warn('generation_log insert failed:', r.status, t.slice(0, 200)));
  }).catch(err => console.warn('generation_log insert failed:', err.message));
}

// Flatten a generateContent params object into loggable prompt text —
// system instruction + every text part; inline images counted, never stored.
function genPromptText(params) {
  const parts = [];
  const sys = params && params.config && params.config.systemInstruction;
  if (typeof sys === 'string') parts.push(sys);
  else if (sys && Array.isArray(sys.parts)) sys.parts.forEach(p => { if (p.text) parts.push(p.text); });
  let images = 0;
  const contents = Array.isArray(params?.contents) ? params.contents : (params?.contents ? [params.contents] : []);
  for (const c of contents) {
    if (typeof c === 'string') { parts.push(c); continue; }
    for (const p of (c.parts || [])) {
      if (p.text) parts.push(p.text);
      if (p.inlineData) images++;
    }
  }
  return { text: parts.join('\n\n'), images };
}

if (SUPA_SERVICE_KEY) {
  const rawGenerate = ai.models.generateContent.bind(ai.models);
  ai.models.generateContent = async function (params) {
    const t0 = Date.now();
    const ctx = genCtx.getStore() || {};
    const base = {
      user_id: ctx.userId || null,
      endpoint: ctx.endpoint || 'background',
      model: (params && params.model) || null,
    };
    const { text: promptText, images: imagesIn } = genPromptText(params);
    const isImageModel = String(params && params.model || '').includes('image');
    try {
      const r = await rawGenerate(params);
      let respText = null;
      try { respText = r.text; } catch (_) { /* image-only responses */ }
      let responseJson = null, hasImage = false;
      if (isImageModel) {
        hasImage = !!(r.candidates && r.candidates[0]?.content?.parts?.some(p => p.inlineData));
        responseJson = { has_image: hasImage };
      } else if (respText) {
        try { responseJson = JSON.parse(respText); } catch (_) { responseJson = { text: String(respText) }; }
      }
      glog({
        ...base,
        tokens_used: (r.usageMetadata && r.usageMetadata.totalTokenCount) ?? null,
        latency_ms: Date.now() - t0,
        status: isImageModel && !hasImage ? 'partial' : 'ok',
        prompt: promptText || null,
        response: responseJson,
        detail: { input_images: imagesIn, ...(ctx.genId ? { gen_id: ctx.genId } : {}), ...(ctx.userPrompt ? { user_prompt: ctx.userPrompt } : {}) },
      });
      return r;
    } catch (err) {
      glog({
        ...base,
        latency_ms: Date.now() - t0,
        status: /timeout|timed out|deadline/i.test(String(err && err.message)) ? 'timeout' : 'error',
        prompt: promptText || null,
        detail: { input_images: imagesIn, error: String((err && err.message) || err).slice(0, 500), ...(ctx.genId ? { gen_id: ctx.genId } : {}), ...(ctx.userPrompt ? { user_prompt: ctx.userPrompt } : {}) },
      });
      throw err;
    }
  };
} else {
  console.log('generation_log: SUPABASE_SERVICE_ROLE_KEY not set — LLM call trail disabled');
}

/* ── Airtable ────────────────────────────────────────────────────── */
const AT_TOKEN = process.env.AIRTABLE_TOKEN;
const AT_BASE  = process.env.AIRTABLE_BASE_ID;
console.log('Airtable config — base:', AT_BASE, '| token prefix:', AT_TOKEN ? AT_TOKEN.slice(0, 12) + '...' : 'MISSING');

async function airtableUpsert(table, fields) {
  if (!AT_TOKEN || !AT_BASE) { console.warn('Airtable: missing token or base ID'); return; }
  console.log(`Airtable: upserting to ${table}`, JSON.stringify(fields));
  try {
    const res = await fetch(`https://api.airtable.com/v0/${AT_BASE}/${encodeURIComponent(table)}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${AT_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        performUpsert: { fieldsToMergeOn: ['Email'] },
        records: [{ fields }],
      }),
    });
    const body = await res.text();
    if (!res.ok) console.warn(`Airtable ${table} error ${res.status}:`, body);
    else console.log(`Airtable ${table}: ok`);
  } catch (err) { console.warn('Airtable fetch error:', err.message); }
}

async function airtableCreate(table, fields) {
  if (!AT_TOKEN || !AT_BASE) return;
  try {
    const res = await fetch(`https://api.airtable.com/v0/${AT_BASE}/${encodeURIComponent(table)}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${AT_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: [{ fields }] }),
    });
    if (!res.ok) console.warn(`Airtable ${table} error:`, await res.text());
  } catch (err) { console.warn('Airtable error:', err.message); }
}

/* ── Cloudinary ──────────────────────────────────────────────────── */
const CLD_CLOUD  = process.env.CLOUDINARY_CLOUD_NAME;
const CLD_KEY    = process.env.CLOUDINARY_API_KEY;
const CLD_SECRET = process.env.CLOUDINARY_API_SECRET;
console.log('Cloudinary config — cloud:', CLD_CLOUD || 'MISSING');

async function cloudinaryUpload(base64Data, mimeType) {
  if (!CLD_CLOUD || !CLD_KEY || !CLD_SECRET) {
    console.warn('Cloudinary: missing config, skipping upload');
    return null;
  }
  try {
    const timestamp = Math.round(Date.now() / 1000);
    const folder = 'robes';
    const signature = createHash('sha256')
      .update(`folder=${folder}&timestamp=${timestamp}${CLD_SECRET}`)
      .digest('hex');

    const form = new FormData();
    form.append('file', `data:${mimeType};base64,${base64Data}`);
    form.append('api_key', CLD_KEY);
    form.append('timestamp', String(timestamp));
    form.append('signature', signature);
    form.append('folder', folder);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLD_CLOUD}/image/upload`, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) { console.warn('Cloudinary upload error:', await res.text()); return null; }
    const data = await res.json();
    console.log('Cloudinary upload ok:', data.secure_url);
    // Deliver an automatically-optimised, browser-renderable format. HEIC/HEIF
    // uploads otherwise deliver as .heic — which every non-Safari viewer fails
    // to render — even though Gemini parses the original fine. f_auto makes
    // Cloudinary transcode to webp/jpeg per the requesting browser, so every
    // downstream viewer (wardrobe grid, moodboard, lookbook, share pages) works.
    return typeof data.secure_url === 'string'
      ? data.secure_url.replace('/image/upload/', '/image/upload/f_auto,q_auto/')
      : data.secure_url;
  } catch (err) {
    console.warn('Cloudinary error:', err.message);
    return null;
  }
}

/* ── waitlist ────────────────────────────────────────────────────── */
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    gemini: !!process.env.GEMINI_API_KEY,
    airtable: !!process.env.AIRTABLE_TOKEN,
    cloudinary: !!process.env.CLOUDINARY_API_KEY,
    supabase: !!process.env.SUPABASE_ANON_KEY,
    generation_log: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
});

app.post('/api/waitlist', async (req, res) => {
  const { email, name } = req.body;
  if (!email || !/.+@.+\..+/.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  const fields = { 'Email': email, 'Joined At': new Date().toISOString().split('T')[0] };
  if (name) fields['Name'] = name;
  await airtableUpsert('Contacts', fields);

  res.json({ ok: true });
});

/* ── instagram handle ────────────────────────────────────────────── */
app.post('/api/instagram', async (req, res) => {
  const { email, handle } = req.body;
  if (!handle) return res.status(400).json({ error: 'No handle provided' });
  const clean = handle.replace(/^@+/, '');
  await airtableUpsert('Contacts', {
    'Email': email || '',
    'Instagram Handle': clean,
  });
  res.json({ ok: true });
});

/* ── feedback ────────────────────────────────────────────────────── */
app.post('/api/feedback', async (req, res) => {
  const { email, rating, comment, prompt, pieceLink, photoUrl, looksOutput } = req.body;
  await airtableCreate('Feedback', {
    'Email': email || '',
    ...(rating != null ? { 'Rating': Number(rating) } : {}),
    'User Feedback': comment || '',
    'Prompt': prompt || '',
    'Piece Link': pieceLink || '',
    ...(photoUrl ? { 'Photo': [{ url: photoUrl }] } : {}),
    'Looks Output': looksOutput || '',
    'Created At': new Date().toISOString().split('T')[0],
  });
  res.json({ ok: true });
});

/* ── rate limiting ───────────────────────────────────────────────── */
const rateLimitMap = new Map();

function rateLimit({ windowMs, max }) {
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    const entry = rateLimitMap.get(key) || { count: 0, start: now };
    if (now - entry.start > windowMs) { entry.count = 0; entry.start = now; }
    entry.count++;
    rateLimitMap.set(key, entry);
    if (entry.count > max) return res.status(429).json({ error: 'Too many requests — please wait a minute.' });
    next();
  };
}

// prune stale entries hourly
setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [key, entry] of rateLimitMap) {
    if (entry.start < cutoff) rateLimitMap.delete(key);
  }
}, 60 * 60 * 1000);

/* ── style ───────────────────────────────────────────────────────── */
const FALLBACK_PIECE = 'black Balmain waistcoat with gold buttons';

// Shared image-prompt fragments — every on-model editorial frame uses these
// so the figure is never cropped and the user's declared taste reaches the
// image model, not just the text model.
const FULL_BODY_FRAME = 'FULL-LENGTH FRAMING, HEAD TO TOE: the entire figure fits inside the frame — the full head and hair visible with clear space above, both shoes fully visible with clear space below. Never crop the face, head, hands or feet. Subject standing, centred, photographed from far enough back to capture the whole body.';

function styleIconsImageLine(styleIcons) {
  const icons = Array.isArray(styleIcons)
    ? styleIcons.filter(s => typeof s === 'string' && s.trim()).map(s => s.trim()).slice(0, 5)
    : [];
  return icons.length
    ? `The styling sensibility channels ${icons.join(', ')} — their signature silhouettes and fashion codes. `
    : '';
}

/* ── gender identity (profiles.gender_identity, migration 13) ─────────
   'woman' (default — every signup starts here, and any missing/invalid
   value normalises to it, so pre-migration clients behave exactly as
   before), 'man' (menswear only, everywhere), or 'unspecified'
   ("Prefer not to say" — the model judges from the brief). The stylist
   prompts use "she"/"her" generically throughout; rewriting every
   pronoun per-request would be fragile, so the directive tells the
   model how to read them instead. */
const normGender = (g) => (g === 'man' || g === 'unspecified') ? g : 'woman';

function genderDirective(gender) {
  if (gender === 'man')
    return 'The user identifies as a man. Every piece, look and recommendation must be menswear — male cuts, sizing and styling codes, menswear brands and male style references throughout. Never suggest womenswear. Where these instructions use "she"/"her" generically, they refer to this male client — read them as "he"/"him".';
  if (gender === 'unspecified')
    return 'The user has not said how they identify. Use your best judgement from their words, their pieces and their wardrobe to decide whose clothing to recommend; when nothing points a direction, keep pieces and styling gender-neutral. Where these instructions use "she"/"her" generically, they simply refer to this client.';
  return 'Unless the brief clearly indicates a male wearer, style for a woman.';
}

// Image-prompt fragments — who stands in the editorial frame.
const wearerNoun = (g) => g === 'man' ? 'man' : g === 'unspecified' ? 'person' : 'woman';
const wearerWears = (g) => g === 'man' ? 'He wears' : g === 'unspecified' ? 'They wear' : 'She wears';

const STYLE_SCHEMA = {
  type: 'object',
  properties: {
    fallback: { type: 'boolean' },
    wearer: { type: 'string', enum: ['woman', 'man'] },
    ways: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          eyebrow:     { type: 'string' },
          title:       { type: 'string' },
          outfit:      { type: 'string' },
          details:     { type: 'string' },
          accessories: { type: 'string' },
          tags:        { type: 'array', items: { type: 'string' } },
        },
        required: ['eyebrow', 'title', 'outfit', 'details', 'accessories', 'tags'],
      },
    },
  },
  required: ['fallback', 'wearer', 'ways'],
};

app.post('/api/style', rateLimit({ windowMs: 60_000, max: 10 }), async (req, res) => {
  const { photo, link, prompt, name, pieceName, styleDna, styleIcons, wardrobeCount, wardrobeItems, intent, context: rtContext, gender } = req.body;
  const g = normGender(gender);

  if (!photo && !link && !prompt) {
    return res.status(400).json({ error: 'Provide at least a photo, link, or prompt.' });
  }

  const daily = intent === 'dress-me';
  const who = name ? `The user's name is ${name}.` : '';
  const piece = pieceName ? `The key piece is described as: "${pieceName}".` : '';
  const context = prompt ? `Additional context from the user: "${prompt}".` : '';
  const linkCtx = link ? `The user provided a product link for reference: ${link}.` : '';
  const dnaBlock = styleDnaPromptBlock(styleDna, Number(wardrobeCount) || 0, styleIcons);

  const closetItems = Array.isArray(wardrobeItems) ? wardrobeItems.slice(0, 60) : [];
  const closetBlock = closetItems.length
    ? `THE USER'S DIGITISED WARDROBE (${closetItems.length} pieces): ${closetItems.map(i =>
        `${i.label}${i.category ? ' [' + i.category + ']' : ''}${i.color ? ', ' + i.color : ''}${Number(i.times_worn) > 0 ? `, worn ${i.times_worn}×` : ''}`
      ).join('; ')}.`
    : '';
  const closetDirective = closetItems.length >= 15
    ? 'Build each outfit primarily from the digitised wardrobe above — reference owned pieces by their exact labels, and add new pieces only where the closet has a true gap or for the Exclamation Point.'
    : closetItems.length > 0
      ? 'The user already owns the pieces listed above. Wherever an owned piece genuinely serves the look, use it and refer to it by its exact label — an owned piece always beats a hypothetical one. Fill only the true gaps with new, editorially-matched pieces. Never reach for something she would have to buy when a relevant piece is already in the list.'
      : '';

  const formulaBlock = `Every look follows the four-tier layer formula: 1) THE ANCHOR — the weather/agenda hero piece; 2) THE CANVAS — premium supporting basics; 3) THE TEXTURE — one depth-adding element; 4) THE EXCLAMATION POINT — the accessories, footwear and hardware that inject identity. Never give generic output like "jeans and a top" — name exact cuts, fabrications and styling techniques (e.g. "French-tuck a heavyweight silk button-down into high-waisted, wide-leg wool trousers").

STYLING SANITY CHECK: every styling move must be something a respected stylist would actually shoot on the street — honour the key piece's natural register. Sporty and athletic pieces stay in an elevated-casual register: never belt knitwear or cardigans over athletic shorts, never force waist-cinching or hourglass tricks onto a sporty silhouette, never layer formal tailoring over gym wear. Any silhouette or body-architecture rules below govern WHAT pieces you select — they are never a licence to contort HOW a piece is worn. If a styling trick needs explaining to look intentional, drop it: effortless always beats clever.`;

  const brief = daily
    ? `The user is dressing for a real day, happening now. You build three complete, wearable outfits for that day — each a distinct mood or register, all appropriate to the occasion and the real-time weather context provided.`
    : `When given a key fashion piece, you create three distinct, wearable looks around it — each with a clear occasion and mood. Your descriptions are specific: you name real item types, describe drape and texture, and explain why each pairing works.`;

  const fallbackRule = daily
    ? `IMPORTANT: Set "fallback": true ONLY if the input is gibberish or random characters. A plain occasion, agenda or mood (e.g. "brunch", "a day of meetings") is a valid daily brief — set "fallback": false and dress the user for it.`
    : `IMPORTANT: You must set "fallback": true if ANY of these apply — the input is gibberish or random characters; no specific clothing item, garment, or accessory can be identified; the request is too vague to style (e.g. just a colour, a single generic word, or a non-fashion concept). When fallback is true, style a ${FALLBACK_PIECE} instead. Only set "fallback": false when a real, nameable fashion piece is clearly present.`;

  const wearerRule = g === 'man'
    ? `Set "wearer" to "man" — the user is a man and every look is styled for him.`
    : g === 'unspecified'
      ? `Set "wearer" to your best judgement of who the looks are styled for, based only on the user's words and the piece itself.`
      : `Set "wearer" to who the looks are styled for: "woman" unless the user's words clearly state the wearer is male — the piece itself being menswear or unisex (sportswear, an oversized jacket, boyfriend jeans) NEVER makes the wearer male.`;

  const genderBlock = g === 'woman'
    ? 'Your user is a stylish, fashion-forward woman — unless the input clearly indicates a male wearer, style all looks for a woman.'
    : genderDirective(g);

  const systemInstruction = `You are an expert fashion stylist known for elegant, directional styling advice. Your tone is warm, precise, and editorial — like a trusted stylist who truly understands clothes. ${genderBlock} ${who}

${brief}

${formulaBlock}

${fallbackRule}

${wearerRule}${dnaBlock ? '\n\n' + dnaBlock : ''}${closetBlock ? '\n\n' + closetBlock : ''}${closetDirective ? '\n' + closetDirective : ''}`;

  const rtLine = daily && rtContext && (rtContext.city || rtContext.tempRange)
    ? `Real-time context: ${[rtContext.city, rtContext.month].filter(Boolean).join(' · ')}${rtContext.tempRange ? ' | ' + rtContext.tempRange : ''}${rtContext.condition ? ' | ' + rtContext.condition : ''}. Dress the user for exactly this weather and place.`
    : '';

  const userText = daily
    ? `${rtLine ? rtLine + '\n\n' : ''}The user's brief for today: "${prompt}".

Dress them for this day three ways. Make each outfit genuinely distinct — different moods and registers of the same day. Each look must be complete from anchor to exclamation point, and every piece weather-appropriate.`
    : `${piece} ${context} ${linkCtx}

Style this key piece three ways. Make each look genuinely distinct — different occasions, moods, and dressing codes. Be specific about how the piece is worn and what surrounds it. Each look should feel complete and real.`;

  let photoMatch = null;
  const textParts = [];

  if (photo) {
    photoMatch = photo.match(/^data:([^;]+);base64,(.+)$/);
    if (photoMatch) {
      textParts.push({ inlineData: { mimeType: photoMatch[1], data: photoMatch[2] } });
    }
  }
  textParts.push({ text: userText });

  // retry wrapper
  async function withRetry(fn, attempts = 3) {
    for (let i = 0; i < attempts; i++) {
      try { return await fn(); } catch (err) {
        if (i === attempts - 1) throw err;
        await new Promise(r => setTimeout(r, 800 * Math.pow(2, i)));
      }
    }
  }

  try {
    const t0 = Date.now();

    const [textResponse, photoUrl] = await Promise.all([
      withRetry(() => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: textParts }],
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: STYLE_SCHEMA,
          thinkingConfig: { thinkingBudget: 0 },
          maxOutputTokens: 2000,
        },
      })),
      photoMatch ? cloudinaryUpload(photoMatch[2], photoMatch[1]) : Promise.resolve(null),
    ]);

    const textMs = Date.now() - t0;
    const parsed = JSON.parse(textResponse.text);
    const fallback = parsed.fallback === true;
    const ways = parsed.ways;
    logAI({ feature: 'style', stage: 'text', model: 'gemini-2.5-flash', ms: textMs, fallback });

    // Create image job and respond immediately — images generate in background
    const jobId = randomBytes(6).toString('hex');
    imageJobs.set(jobId, { images: [null, null, null], done: false, created: Date.now() });
    res.json({ ways, jobId, photoUrl, fallback });

    // Background image generation — never blocks the client
    const t1 = Date.now();
    // 'man' setting always wins; otherwise the model's wearer judgement
    // stands (for 'unspecified' that judgement IS the routing decision, so
    // the frames match the looks it wrote).
    const wearer = g === 'man' ? 'man' : parsed.wearer === 'man' ? 'man' : 'woman';
    const iconLine = styleIconsImageLine(styleIcons);
    const briefLine = !fallback && prompt ? `The user's brief: "${String(prompt).slice(0, 200)}". ` : '';
    // Strictly ONE generation in flight at a time — the daily/travel/
    // moodboard pattern. Concurrent calls contend for the image model's
    // rate limit (that is what left looks imageless); a failed frame gets
    // one retry after a pause long enough to clear a rate-limit window.
    (async () => {
      const results = ways.map(() => null);
      for (let i = 0; i < ways.length; i++) {
        if (i > 0) await new Promise(r => setTimeout(r, 3000));
        const w = ways[i];
        const imgParts = [];
        if (!fallback && photoMatch) {
          imgParts.push({ inlineData: { mimeType: photoMatch[1], data: photoMatch[2] } });
        }
        const pieceLabel = fallback ? FALLBACK_PIECE : (pieceName || 'the clothing item');
        const pieceLine = daily && !fallback ? '' : `The key piece is ${pieceLabel}. `;
        const photoLine = !fallback && photoMatch
          ? 'The attached photo shows the key piece only — reproduce the piece faithfully, but compose an entirely new scene; never copy the photo\'s framing, background or crop. '
          : '';
        imgParts.push({
          text: `PORTRAIT ORIENTATION ONLY. Single fashion editorial photograph — one ${wearer}, alone, one scene, no collage, no split panels, no side-by-side images. ${FULL_BODY_FRAME} ${pieceLine}${photoLine}${briefLine}${iconLine}Look: "${w.title}" — ${w.eyebrow}. The ${wearer} wears the complete outfit: ${String(w.outfit || '').trim().replace(/\.$/, '')}. Soft natural light, luxury campaign aesthetic.`,
        });

        const makeCall = attempt => ai.models.generateContent({
          model: 'gemini-3.1-flash-image',
          contents: [{ role: 'user', parts: imgParts }],
          config: { responseModalities: ['TEXT', 'IMAGE'] },
        }).then(async r => {
          const part = r.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
          if (!part?.inlineData) {
            logAI({ feature: 'style', stage: 'image', index: i, attempt, success: false, reason: 'no_inline_data' });
            return null;
          }
          // Host on Cloudinary so the client can persist a small URL in the
          // lookbook instead of a multi-MB base64 blob; fall back to data URL
          const hosted = await cloudinaryUpload(part.inlineData.data, part.inlineData.mimeType);
          const src = hosted || `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          logAI({ feature: 'style', stage: 'image', index: i, attempt, success: true, hosted: !!hosted, ms: Date.now() - t1 });
          // Write straight onto the job — a slow call that outlived its race
          // timeout still delivers its image to the poller this way.
          const job = imageJobs.get(jobId);
          if (job && !job.images[i]) job.images[i] = src;
          return src;
        }).catch(err => {
          logAI({ feature: 'style', stage: 'image', index: i, attempt, success: false, reason: err.message });
          return null;
        });

        let src = null;
        for (let attempt = 1; attempt <= 2 && !src; attempt++) {
          if (attempt > 1) {
            logAI({ feature: 'style', stage: 'image', index: i, success: false, reason: 'retrying' });
            await new Promise(r => setTimeout(r, 8000));
          }
          src = await Promise.race([
            makeCall(attempt),
            new Promise(resolve => setTimeout(() => resolve(null), 40000)),
          ]);
          const job = imageJobs.get(jobId);
          if (!src && job && job.images[i]) src = job.images[i];
        }
        results[i] = src;
      }
      const job = imageJobs.get(jobId);
      // Merge — an image may have landed on the job after its race timed out
      if (job) { job.images = job.images.map((v, i) => v || results[i]); job.done = true; }
      logAI({ feature: 'style', stage: 'images_complete', jobId, totalMs: Date.now() - t0, successCount: results.filter(Boolean).length });
    })();
  } catch (err) {
    if (res.headersSent) return; // client already disconnected
    console.error('Gemini API error:', err.message);
    res.status(500).json({ error: err.message || 'Styling failed' });
  }
});

/* ── image job polling ───────────────────────────────────────────── */
app.get('/api/images/:jobId', (req, res) => {
  const job = imageJobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found or expired' });
  res.json({ images: job.images, done: job.done });
});

/* ── daily look — Context-to-Core framework ──────────────────────── */
// One complete outfit for a real day, built as the four architectural
// steps a senior stylist works through (Anchor → Canvas → Texture →
// Accents). The wardrobe-state directive shifts the balance from fully
// aspirational (empty closet) to closet-first (≥15 pieces); every item
// carries a wardrobe_match so the client's swap flow can trade any
// piece for something owned.
const DAILY_STEP_TITLES = ['The Anchor', 'The Canvas', 'The Texture', 'The Accents'];

// Build 3 copy rules (Tranche 2) — installed once and interpolated into
// every stylist prompt so Daily/Weekly/Travel speak in one register. The
// failure pattern the audit found is always the same: copy that justifies
// a piece instead of describing it. These rules replace that instinct with
// two distinct jobs — a row note (the physical adjustment) and a panel
// note (the look's logic) — and a banned-construction list pulled from the
// actual audited output, not hypotheticals.
const BANNED_CONSTRUCTIONS_RULE = `BANNED CONSTRUCTIONS — never use these, in any field: the construction "X yet Y" (e.g. "comfortable yet refined"); benefit justification ("perfect for", "ideal for", "suitable for", "great for", "keeping you comfortable"); machine connectives ("ensuring", "while maintaining", "creating a", "allowing for", "centers around"); adverb inflation ("effortlessly", "seamlessly", "timelessly", "meticulously"); dead adjectives ("elevated", "versatile", "polished aesthetic", "vibrant spirit"); sustainability or virtue framing of any kind; quotation marks.`;

const ROW_NOTE_RULE = `ROW NOTE: one sentence, 6–12 words maximum. Describes how THIS piece is worn in THIS look — the physical adjustment a stylist makes with her hands, not the reason for it. Verb-led; start with a participle where natural — Worn, Tucked, Belted, Cuffed, Carried, Layered, Left, Buttoned. Never state why the piece is good, who it suits, or what it achieves. Never repeat the item's name — the rack already names it. Never begin with "Perfect", "Ideal", "Great" or "A". Write for a woman who already has taste; she does not need convincing. Examples: "Worn open, sleeves cuffed once above the wrist." / "Belted at the natural waist, not the hip." / "Cuffed once at the ankle to show the shoe."`;

const PANEL_NOTE_RULE = `PANEL NOTE: 30 words maximum, one or two sentences. Describes the logic of the look — how it balances, what register it sits in, what the weather or occasion asked for. Name garments by TYPE only (the wool, the knit, flat leather) — never list the pieces in order or name internal framework/formula steps; the rack already names them, with prices. Warm, direct and finished — she has been dressed, not sold to.`;

const WEEK_SUMMARY_RULE = `WEEK SUMMARY: 40 words maximum. Describes the week's register, weather and shape only — it covers up to seven days and still should not inventory them. Names no specific garment, so it can't go stale after she later swaps or restyles a day.`;

const DAILY_SCHEMA = {
  type: 'object',
  properties: {
    fallback: { type: 'boolean' },
    occasion_label: { type: 'string' },
    headline: { type: 'string' },
    stylist_summary: { type: 'string' },
    transition_tip: { type: 'string' },
    palette: { type: 'array', items: { type: 'string' } },
    steps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', enum: DAILY_STEP_TITLES },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                category: { type: 'string', enum: ['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Bags', 'Accessories', 'Other'] },
                brand: { type: 'string' },
                description: { type: 'string' },
                how: { type: 'string' },
                wardrobe_index: { type: 'integer' },
                retailer_hint: { type: 'string' },
                price_point: { type: 'string' },
                alternates: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      brand: { type: 'string' },
                      retailer_hint: { type: 'string' },
                      price_point: { type: 'string' },
                    },
                    required: ['name', 'brand', 'retailer_hint', 'price_point'],
                  },
                },
              },
              required: ['name', 'category', 'brand', 'how', 'wardrobe_index', 'retailer_hint', 'price_point', 'alternates'],
            },
          },
        },
        required: ['title', 'items'],
      },
    },
  },
  required: ['fallback', 'occasion_label', 'headline', 'stylist_summary', 'transition_tip', 'palette', 'steps'],
};

app.post('/api/daily', rateLimit({ windowMs: 60_000, max: 10 }), async (req, res) => {
  const { prompt, name, styleDna, styleIcons, wardrobeItems, context: rtContext, locked, gender } = req.body;
  const g = normGender(gender);

  const closetItems = Array.isArray(wardrobeItems) ? wardrobeItems.slice(0, 60) : [];
  const n = closetItems.length;
  const dnaBlock = styleDnaPromptBlock(styleDna, n, styleIcons);

  // Anchored pieces (restyle flow) — items the user has locked into the
  // look. They must survive a restyle untouched; everything else re-mixes.
  const lockedList = (Array.isArray(locked) ? locked : [])
    .filter(l => l && l.name)
    .slice(0, 8)
    .map(l => {
      const idx = l.wardrobe_id != null ? closetItems.findIndex(it => String(it.id) === String(l.wardrobe_id)) : -1;
      return { name: String(l.name).slice(0, 120), category: l.category || '', brand: l.brand || '', idx };
    });
  const lockedBlock = lockedList.length
    ? `ANCHORED PIECES — the user has LOCKED these into today's look. Every one of them MUST appear in the final look exactly as given (same piece, same name), placed in the architectural step where it belongs; restyle everything AROUND them:\n${lockedList.map(l =>
        `- ${l.name}${l.category ? ' [' + l.category + ']' : ''}${l.brand ? ', ' + l.brand : ''}${l.idx >= 0 ? ` (wardrobe index ${l.idx} — set its wardrobe_index)` : ''}`
      ).join('\n')}`
    : '';

  const closetBlock = n
    ? `THE USER'S DIGITISED WARDROBE (${n} pieces, referenced by index):\n${closetItems.map((i, idx) =>
        `${idx}: ${i.label}${i.category ? ' [' + i.category + ']' : ''}${i.color ? ', ' + i.color : ''}${i.brand ? ', ' + i.brand : ''}${Number(i.times_worn) > 0 ? `, worn ${i.times_worn}×` : ''}${heroMark(i)}`
      ).join('\n')}`
    : 'THE USER HAS NOT CATALOGUED ANY WARDROBE PIECES YET.';
  const heroBlock = heroDirective(closetItems);

  const stateDirective = n === 0
    ? `WARDROBE STATE: EMPTY. Build a fully aspirational, editorial look — this look doubles as a shopping brief. Every item gets "wardrobe_index": -1 plus a real "retailer_hint" and "price_point".`
    : n < 15
      ? `WARDROBE STATE: GROWING (${n}/15). Hybrid build: wherever an owned piece genuinely serves the brief, use it — set its "wardrobe_index" and use its exact label as the name. Fill true gaps with aspirational pieces (wardrobe_index -1, real retailer_hint + price_point). When an owned piece and a hypothetical piece would both work, ALWAYS choose the owned piece.`
      : `WARDROBE STATE: COMPLETE (${n} pieces). Closet-first build: compose the look primarily from the digitised wardrobe — nearly every item should carry a valid "wardrobe_index" and its exact owned label. Introduce a new piece (wardrobe_index -1) only for a true gap or the finishing exclamation point.`;

  const rtLine = rtContext && (rtContext.city || rtContext.tempRange)
    ? `REAL-TIME CONTEXT: ${[rtContext.city, rtContext.month].filter(Boolean).join(' · ')}${rtContext.tempRange ? ' | ' + rtContext.tempRange : ''}${rtContext.condition ? ' | ' + rtContext.condition : ''}. This is the atmospheric reality — fabric weight, layers and footwear must answer to it.`
    : '';

  const systemInstruction = `You are Robes' head stylist — elite, editorial, precise. ${name ? `The user's name is ${name}. ` : ''}${genderDirective(g)} You dress clients for real days using the Context-to-Core Framework. Never output a generic outfit — name exact cuts, fabrications and styling techniques (e.g. "French-tuck a heavyweight silk button-down into high-waisted wide-leg wool trousers").

THE FRAMEWORK — work through it in this order:
1. THE CONTEXT FILTERS. Fix the day's parameters before pulling a single garment: the agenda & mobility in the brief (what she physically does today), the atmospheric reality (the real-time weather provided — it dictates fabric weight and outerwear), and the psychological goal (how she needs to feel and be perceived).
2. THE ARCHITECTURAL FORMULA. Build the outfit as exactly four steps, in this exact order:
   - "The Anchor" — exactly 1 item: the hero structural piece that sets the register (blazer, coat, statement skirt, dress).
   - "The Canvas" — 1 or 2 items: the supporting, high-quality basics beneath the anchor (shirt, tee, knit, trousers, skirt).
   - "The Texture" — exactly 1 item: the layering element that adds tactile dimension (scarf, cardigan, fine knit, belt).
   - "The Accents" — exactly 2 items: the definitive footwear plus one piece of hardware (bag, jewellery) that finish the look.
3. THE GOLDEN RATIOS. Balance the build through body architecture: the Rule of Thirds (never a 50/50 visual split — aim for 1/3 : 2/3, e.g. a high-waisted trouser with a tucked-in top lengthens the leg line), Volume Balancing (an oversized or voluminous piece demands a point of structure or compression elsewhere), and Textural Contrast (mix matte, sheen and rough — silk + wool + leather — so the look never falls flat). Let this thinking show in the stylist_summary and item descriptions.
4. THE TRANSITION PROTOCOL. She moves between environments without going home. "transition_tip" is ONE concrete move — subtractive styling (drop a layer to lower the formality) or hardware swapping (daytime tote + sneakers → clutch + kitten heel) — that shifts today's look into its next scene.

${stateDirective}${heroBlock ? '\n\n' + heroBlock : ''}${lockedBlock ? '\n\n' + lockedBlock : ''}

FIELD RULES:
- "occasion_label": 1–3 words, sentence case, naming the day's occasion (e.g. "Garden party", "Studio day").
- "headline": a short serif-worthy line naming place and occasion, sentence case, ending in a full stop (e.g. "A Dublin garden-party look."). Max 8 words.
- "stylist_summary" is this look's PANEL NOTE. ${PANEL_NOTE_RULE}
- "palette": exactly 3 hex colours drawn from the look, ordered neutral to accent.
- Each item: "name" is the piece itself (e.g. "Cream check blazer"); "brand" is ONE real brand suited to the piece's register (for owned pieces, the owned brand or ""); "description" is one internal reference sentence — cut, fabric, colour — used only to generate its photograph, never shown to her.
- "how" is this item's ROW NOTE. ${ROW_NOTE_RULE}
- Owned pieces: set "wardrobe_index" to the wardrobe list index, use the exact owned label as the name, and set retailer_hint and price_point to "". New pieces: "wardrobe_index": -1 with a real "retailer_hint" (e.g. "COS", "Net-a-Porter", "Arket") and a realistic EUR "price_point" (e.g. "€89").
- "alternates": exactly 2 per item — similar-but-distinct options for the SAME slot (a different colour, fabrication or register that still honours the palette, the weather and the DNA below), each with its own real brand, retailer_hint and EUR price_point. These power the flick-through rail, so make them genuinely wearable alternatives, never filler.
- "fallback": true ONLY if the brief is gibberish or random characters — then dress her for a pleasant, unremarkable day in the given context instead. A plain occasion, agenda or mood is a valid daily brief.${dnaBlock ? '\n\n' + dnaBlock : ''}

${BANNED_CONSTRUCTIONS_RULE}

${closetBlock}`;

  const userText = `${rtLine ? rtLine + '\n\n' : ''}The user's brief for today: "${(prompt || '').trim() || 'A regular day — no fixed plans.'}"

Dress her for this exact day, start to finish, through the four architectural steps.`;

  async function withRetry(fn, attempts = 3) {
    for (let i = 0; i < attempts; i++) {
      try { return await fn(); } catch (err) {
        if (i === attempts - 1) throw err;
        await new Promise(r => setTimeout(r, 800 * Math.pow(2, i)));
      }
    }
  }

  try {
    const t0 = Date.now();
    const textResponse = await withRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: userText }] }],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: DAILY_SCHEMA,
        thinkingConfig: { thinkingBudget: 0 },
        maxOutputTokens: 4800,
      },
    }));
    const parsed = JSON.parse(textResponse.text);

    // Normalise: canonical step order, ≤2 items per step, wardrobe matching
    let steps = Array.isArray(parsed.steps)
      ? parsed.steps.filter(s => s && DAILY_STEP_TITLES.includes(s.title) && Array.isArray(s.items) && s.items.length)
      : [];
    steps.sort((a, b) => DAILY_STEP_TITLES.indexOf(a.title) - DAILY_STEP_TITLES.indexOf(b.title));
    const flat = [];
    steps.forEach(s => {
      s.items = s.items.slice(0, 2).map(it => {
        const wi = Number.isInteger(it.wardrobe_index) && it.wardrobe_index >= 0 ? closetItems[it.wardrobe_index] : null;
        it.wardrobe_match = wi
          ? { id: wi.id, label: wi.label, image_url: wi.image_url || null, color: wi.color || '' }
          : null;
        it.how = String(it.how || '').slice(0, 160);
        it.alternates = (Array.isArray(it.alternates) ? it.alternates : [])
          .filter(a => a && a.name)
          .slice(0, 3)
          .map(a => ({ name: String(a.name).slice(0, 120), brand: a.brand || '', retailer_hint: a.retailer_hint || '', price_point: a.price_point || '' }));
        it.image_index = flat.length;
        flat.push({ stepTitle: s.title, item: it });
        return it;
      });
    });
    if (!flat.length) throw new Error('empty daily look');
    const dailyOwnedCount = flat.filter(f => f.item.wardrobe_match).length;
    logAI({ feature: 'daily', stage: 'text', model: 'gemini-2.5-flash', ms: Date.now() - t0, items: flat.length, owned: dailyOwnedCount, fallback: parsed.fallback === true });
    // Composition (addendum to Tranche 2 Build 2): logAI only reaches
    // Railway's console, not the queryable generation_log table — the
    // owned-vs-total gate the original Build 2 brief asked for was
    // unanswerable because ownership never landed in `detail`. Write it
    // here alongside the text call's own automatically-logged row.
    (function () {
      const gctx = genCtx.getStore() || {};
      glog({
        user_id: gctx.userId || null,
        endpoint: '/api/daily',
        model: 'gemini-2.5-flash',
        status: 'ok',
        prompt: null,
        response: null,
        detail: { stage: 'composition', owned_count: dailyOwnedCount, item_count: flat.length, ...(gctx.genId ? { gen_id: gctx.genId } : {}) },
      });
    })();

    const jobId = randomBytes(6).toString('hex');
    imageJobs.set(jobId, { images: flat.map(() => null), done: false, created: Date.now() });
    res.json({
      fallback: parsed.fallback === true,
      occasion_label: parsed.occasion_label || '',
      headline: parsed.headline || '',
      stylist_summary: parsed.stylist_summary || '',
      transition_tip: parsed.transition_tip || '',
      palette: Array.isArray(parsed.palette) ? parsed.palette.slice(0, 3) : [],
      steps,
      jobId,
      itemCount: flat.length,
    });

    // Background imagery — one frame per item, staggered under Gemini's
    // rate limit: the anchor gets the full-look editorial shot, everything
    // else a still-life. Only hosted URLs reach the client (lookbook-safe).
    const t1 = Date.now();
    const allNames = flat.map(f => f.item.name).join(', ');
    const scene = [parsed.occasion_label ? parsed.occasion_label.toLowerCase() : '', rtContext?.city].filter(Boolean).join(' in ');
    (async () => {
      for (let i = 0; i < flat.length; i++) {
        if (i > 0) await new Promise(r => setTimeout(r, 3000));
        const { stepTitle, item } = flat[i];
        const imgPrompt = stepTitle === 'The Anchor'
          ? `PORTRAIT ORIENTATION ONLY. Single editorial fashion photograph — one ${wearerNoun(g)}, alone, one scene, no collage, no split panels, no text overlays. ${FULL_BODY_FRAME} ${styleIconsImageLine(styleIcons)}${wearerWears(g)} the complete outfit: ${allNames}. The ${item.name} leads the frame. ${scene ? `Setting: ${scene}. ` : ''}Soft natural light, luxury campaign aesthetic.`
          : `Editorial still-life photograph of a single ${item.name}${item.brand ? ' by ' + item.brand : ''} — ${item.description || ''}. The garment styled alone on a neutral cream-linen surface, soft daylight, quiet luxury catalogue aesthetic. No model, no text, no collage, one item only.`;
        try {
          const r = await Promise.race([
            ai.models.generateContent({
              model: 'gemini-3.1-flash-image',
              contents: [{ role: 'user', parts: [{ text: imgPrompt }] }],
              config: { responseModalities: ['TEXT', 'IMAGE'] },
            }),
            new Promise(resolve => setTimeout(() => resolve(null), 50000)),
          ]);
          const part = r?.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
          if (!part?.inlineData) {
            logAI({ feature: 'daily', stage: 'image', index: i, success: false, reason: r ? 'no_inline_data' : 'timeout_50s' });
            continue;
          }
          const url = await cloudinaryUpload(part.inlineData.data, part.inlineData.mimeType);
          if (!url) {
            logAI({ feature: 'daily', stage: 'image', index: i, success: false, reason: 'cloudinary_failed' });
            continue;
          }
          logAI({ feature: 'daily', stage: 'image', index: i, success: true, ms: Date.now() - t1 });
          const job = imageJobs.get(jobId);
          if (job) job.images[i] = url;
        } catch (err) {
          logAI({ feature: 'daily', stage: 'image', index: i, success: false, reason: err.message });
        }
      }
      const job = imageJobs.get(jobId);
      if (job) job.done = true;
      logAI({ feature: 'daily', stage: 'images_complete', jobId, totalMs: Date.now() - t0 });
    })();
  } catch (err) {
    if (res.headersSent) return;
    logAI({ feature: 'daily', stage: 'text', success: false, reason: err.message });
    console.error('[daily] Gemini error:', err.message);
    res.status(500).json({ error: err.message || 'Daily look failed' });
  }
});

/* ── on-demand alternates (Tranche 2, Build 2) ───────────────────────── */
// Weekly and Travel had no per-item AI alternates at all — their
// flick-through carousel (_dlOptions on the client) only ever offered
// owned same-category pieces. Generating 2 alternates per item upfront
// (like Daily does) would be a large schema/token cost across up to 84
// Weekly items for options that mostly never get viewed, so this is a
// narrow, cheap, single-item call fetched only when she engages with a
// piece (Swap) — never on render — and cached client-side per session.
// A narrow, well-scoped task like this doesn't need a frontier model;
// gemini-2.5-flash (thinking off) is the cheapest model already proven
// reliable on this API — see CLAUDE.md's Gemini model chain notes before
// ever trying a cheaper/smaller model that isn't already validated here.
const ALTERNATES_SCHEMA = {
  type: 'object',
  properties: {
    alternates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          brand: { type: 'string' },
          retailer_hint: { type: 'string' },
          price_point: { type: 'string' },
          how: { type: 'string' },
        },
        required: ['name', 'brand', 'retailer_hint', 'price_point', 'how'],
      },
    },
  },
  required: ['alternates'],
};

app.post('/api/alternates', rateLimit({ windowMs: 60_000, max: 30 }), async (req, res) => {
  const { item, context, styleDna, styleIcons, gender } = req.body;
  const g = normGender(gender);
  const itemName = String((item && item.name) || '').trim().slice(0, 120);
  if (!itemName) return res.status(400).json({ error: 'Missing item.' });
  const category = String((item && item.category) || '').trim().slice(0, 40);
  const brand = String((item && item.brand) || '').trim().slice(0, 60);
  const otherItems = (Array.isArray(context) ? context : [])
    .filter(s => typeof s === 'string' && s.trim())
    .slice(0, 8)
    .map(s => s.trim().slice(0, 80));
  const dnaBlock = styleDnaPromptBlock(styleDna, 0, styleIcons);

  const systemInstruction = `You are Robes' head stylist. ${genderDirective(g)} Suggest exactly 2 alternatives to ONE piece already in an existing look — similar-but-distinct options for the SAME slot (a different colour, fabrication or register that still honours the rest of the look), never a repeat of the original piece. Each needs a real brand suited to its register, a real "retailer_hint" (e.g. "COS", "Net-a-Porter", "Arket") and a realistic EUR "price_point" (e.g. "€89"). These power a flick-through rail, so make them genuinely wearable, never filler.
- "how" is this alternative's ROW NOTE. ${ROW_NOTE_RULE}

${BANNED_CONSTRUCTIONS_RULE}${dnaBlock ? '\n\n' + dnaBlock : ''}`;

  const userText = `THE PIECE TO REPLACE: ${itemName}${brand ? ' by ' + brand : ''}${category ? ' [' + category + ']' : ''}.
${otherItems.length ? `THE REST OF THIS LOOK (do not suggest these): ${otherItems.join(', ')}.\n` : ''}Suggest 2 alternatives for this exact slot.`;

  try {
    const t0 = Date.now();
    const r = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: userText }] }],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: ALTERNATES_SCHEMA,
        thinkingConfig: { thinkingBudget: 0 },
        maxOutputTokens: 500,
      },
    });
    const parsed = JSON.parse(r.text);
    const alternates = (Array.isArray(parsed.alternates) ? parsed.alternates : [])
      .filter(a => a && a.name && a.name.toLowerCase() !== itemName.toLowerCase())
      .slice(0, 2)
      .map(a => ({ name: String(a.name).slice(0, 120), brand: a.brand || '', retailer_hint: a.retailer_hint || '', price_point: a.price_point || '', how: String(a.how || '').slice(0, 160) }));
    logAI({ feature: 'alternates', stage: 'text', model: 'gemini-2.5-flash', ms: Date.now() - t0, count: alternates.length });
    res.json({ alternates });
  } catch (err) {
    logAI({ feature: 'alternates', stage: 'text', success: false, reason: err.message });
    console.error('[alternates] Gemini error:', err.message);
    res.status(500).json({ error: err.message || 'Alternates failed' });
  }
});

/* ── intent classifier (Diary Phase 1 — the prompt as single entry) ── */
// Routes a free-typed prompt to a track. Structured JSON only; the two
// non-negotiables: it NEVER invents a destination or a date (a guessed
// "Ibiza" is the failure mode that destroys trust in the field), and
// relative dates resolve against the CLIENT's local calendar date, never
// server now(). Captured in generation_log via the wrapped ai client.
const INTENT_SCHEMA = {
  type: 'object',
  properties: {
    intent: { type: 'string', enum: ['daily', 'weekly', 'travel', 'unclear'] },
    destination: { type: 'string' },
    date_start: { type: 'string' },
    date_end: { type: 'string' },
    day_intents: {
      type: 'array',
      items: {
        type: 'object',
        properties: { date: { type: 'string' }, label: { type: 'string' } },
        required: ['date', 'label'],
      },
    },
    confidence: { type: 'number' },
  },
  required: ['intent', 'confidence'],
};

app.post('/api/intent', rateLimit({ windowMs: 60_000, max: 30 }), async (req, res) => {
  const prompt = String(req.body.prompt || '').trim().slice(0, 400);
  if (!prompt) return res.status(400).json({ error: 'Empty prompt.' });
  const clientDate = /^\d{4}-\d{2}-\d{2}$/.test(String(req.body.clientDate || '')) ? req.body.clientDate : null;

  const systemInstruction = `You classify ONE styling prompt from a fashion app user into a track. Return JSON only.
TRACKS:
- "daily" — one outfit for one occasion or one day ("dinner tonight", "an outfit for Friday's interview").
- "weekly" — a plan spanning several routine days or a week ("plan my work week", "outfits for next week").
- "travel" — a trip away: a destination, packing, a holiday, a stay ("pack for Ibiza", "a week in Rome", "my honeymoon").
- "unclear" — none of the above reads confidently.
A named trip outranks the occasions inside it ("dinners on my Lisbon trip" → travel). A week span outranks a single occasion inside it.
HARD RULES — breaking these is worse than "unclear":
1. NEVER invent a destination. "destination" is filled ONLY with a place the user actually wrote. "Somewhere warm" is NOT a destination — leave it empty.
2. NEVER invent dates. Fill "date_start"/"date_end" (ISO YYYY-MM-DD) ONLY when the prompt states them explicitly ("4–11 Aug") or relatively resolvable ("next week", "this weekend") against TODAY, which is ${clientDate || 'unknown — in that case emit NO dates at all'} in the user's own timezone. A season or vague future ("in September", "soon") fills nothing.
3. "day_intents": only when the prompt names specific activities on resolvable specific days ("Friday is a client dinner") — one entry per stated day, label in her words. Never padded.
4. "confidence" 0–1: how sure you are of the track. Below 0.6 means the app will ask her instead of acting.
Leave any unknown string field as an empty string.`;

  try {
    const t0 = Date.now();
    const r = await Promise.race([
      ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: `THE PROMPT: "${prompt}"` }] }],
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: INTENT_SCHEMA,
          temperature: 0,
          thinkingConfig: { thinkingBudget: 0 },
          maxOutputTokens: 500,
        },
      }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('intent timeout')), 5000)),
    ]);
    const parsed = JSON.parse(r.text);
    const isoOk = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
    const out = {
      intent: ['daily', 'weekly', 'travel', 'unclear'].includes(parsed.intent) ? parsed.intent : 'unclear',
      destination: String(parsed.destination || '').trim().slice(0, 60) || null,
      date_start: isoOk(parsed.date_start) ? parsed.date_start : null,
      date_end: isoOk(parsed.date_end) ? parsed.date_end : null,
      day_intents: (Array.isArray(parsed.day_intents) ? parsed.day_intents : [])
        .filter(d => d && isoOk(d.date) && d.label)
        .slice(0, 14)
        .map(d => ({ date: d.date, label: String(d.label).slice(0, 120) })),
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
    };
    if (out.date_start && out.date_end && out.date_end < out.date_start) {
      const t = out.date_start; out.date_start = out.date_end; out.date_end = t;
    }
    logAI({ feature: 'intent', stage: 'text', model: 'gemini-2.5-flash', ms: Date.now() - t0, intent: out.intent, confidence: out.confidence });
    res.json(out);
  } catch (err) {
    logAI({ feature: 'intent', stage: 'text', success: false, reason: err.message });
    console.error('[intent] classify error:', err.message);
    res.status(502).json({ error: 'intent_failed' });
  }
});

/* ── weekly plan (P0 simplification — the Weekly Plan View) ─────────── */
// A chronological 5–7 day calendar strip routing wardrobe items across
// the user's agenda. Deliberately lean: one schema-forced flash call,
// NO image generation (owned wardrobe photos are truthful and free —
// the utility engine must never wait on imagery), wardrobe_match
// resolution identical to /api/daily so the client renders owned
// pieces with their real photos.
const WEEKLY_SCHEMA = {
  type: 'object',
  properties: {
    fallback: { type: 'boolean' },
    week_label: { type: 'string' },
    headline: { type: 'string' },
    stylist_summary: { type: 'string' },
    palette: { type: 'array', items: { type: 'string' } },
    days: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          day_label: { type: 'string' },
          occasion: { type: 'string' },
          note: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                category: { type: 'string', enum: ['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Bags', 'Accessories', 'Other'] },
                brand: { type: 'string' },
                description: { type: 'string' },
                how: { type: 'string' },
                wardrobe_index: { type: 'integer' },
                retailer_hint: { type: 'string' },
                price_point: { type: 'string' },
              },
              required: ['name', 'category', 'brand', 'how', 'wardrobe_index', 'retailer_hint', 'price_point'],
            },
          },
        },
        required: ['day_label', 'occasion', 'note', 'items'],
      },
    },
  },
  required: ['fallback', 'week_label', 'headline', 'stylist_summary', 'palette', 'days'],
};

// Shared weekly helpers — the closet block, wardrobe-state directive and
// per-item normalisation are identical for the full-week call and the
// single-day restyle.
// Hero Rack: the client marks starred pieces with hero: true (+ their
// seasons[] tags). The closet lines carry a ★ HERO mark and this directive
// makes them the first-choice owned pieces wherever occasion + season fit.
function heroMark(i) {
  if (!i || i.hero !== true) return '';
  const seasons = Array.isArray(i.seasons) && i.seasons.length
    ? i.seasons.filter(s => typeof s === 'string' && s).slice(0, 5).join('/')
    : 'Year-round';
  return `, ★ HERO (${seasons})`;
}
function heroDirective(closetItems) {
  if (!closetItems.some(i => i && i.hero === true)) return '';
  return `HERO PIECES: the wardrobe items marked ★ HERO are her Hero Rack — the pieces she reaches for first, the spine of her wardrobe. Whenever a hero piece genuinely suits the occasion AND the season/climate in play, PRIORITISE it over any other comparable owned piece and let it lead the look. The bracketed tags are the seasons each hero belongs to — its priority only applies when the look's season/climate matches a tag (Year-round always matches); never force an off-season hero into a look.`;
}

function weeklyClosetBlocks(closetItems) {
  const n = closetItems.length;
  const closetBlock = n
    ? `THE USER'S DIGITISED WARDROBE (${n} pieces, referenced by index):\n${closetItems.map((i, idx) =>
        `${idx}: ${i.label}${i.category ? ' [' + i.category + ']' : ''}${i.color ? ', ' + i.color : ''}${i.brand ? ', ' + i.brand : ''}${Number(i.times_worn) > 0 ? `, worn ${i.times_worn}×` : ''}${heroMark(i)}`
      ).join('\n')}`
    : 'THE USER HAS NOT CATALOGUED ANY WARDROBE PIECES YET.';
  const heroBlock = heroDirective(closetItems);
  const stateDirective = n === 0
    ? `WARDROBE STATE: EMPTY. Build fully aspirational, editorial outfits — they double as a shopping brief. Every item gets "wardrobe_index": -1 plus a real "retailer_hint" and "price_point".`
    : n < 15
      ? `WARDROBE STATE: GROWING (${n}/15). Hybrid build: wherever an owned piece genuinely serves a day, use it — set its "wardrobe_index" and use its exact label as the name. Fill true gaps with aspirational pieces (wardrobe_index -1, real retailer_hint + price_point). When an owned piece and a hypothetical piece would both work, ALWAYS choose the owned piece.`
      : `WARDROBE STATE: COMPLETE (${n} pieces). Closet-first build: route the outfits primarily through the digitised wardrobe — nearly every item should carry a valid "wardrobe_index" and its exact owned label. Introduce a new piece (wardrobe_index -1) only for a true gap.`;
  // The hero directive rides inside stateDirective so /api/weekly and
  // /api/weekly/day both pick it up without touching their prompt templates
  return { closetBlock, stateDirective: heroBlock ? stateDirective + '\n\n' + heroBlock : stateDirective };
}

function weeklyNormaliseItem(it, closetItems) {
  const wi = Number.isInteger(it.wardrobe_index) && it.wardrobe_index >= 0 ? closetItems[it.wardrobe_index] : null;
  return {
    name: String(it.name || '').slice(0, 120),
    category: it.category || 'Other',
    brand: it.brand || '',
    description: it.description || '',
    how: String(it.how || '').slice(0, 160),
    wardrobe_index: wi ? it.wardrobe_index : -1,
    retailer_hint: wi ? '' : (it.retailer_hint || ''),
    price_point: wi ? '' : (it.price_point || ''),
    wardrobe_match: wi
      ? { id: wi.id, label: wi.label, image_url: wi.image_url || null, color: wi.color || '' }
      : null,
  };
}

// Category-coverage validation (audit D1) — a day needs a top + bottom (or
// a dress) plus footwear; the weekly prompt only asked for this in prose,
// so coverage could silently drop. Mirrors Travel's unaccounted()/
// corrective-recall pattern (server.js travelUnderusedItems/unaccounted).
function weeklyCategorySlot(category) {
  const c = String(category || '').toLowerCase();
  if (c.indexOf('top') === 0) return 'top';
  if (c.indexOf('bottom') === 0) return 'bottom';
  if (c.indexOf('dress') === 0) return 'dress';
  if (c.indexOf('shoe') === 0) return 'shoes';
  return 'other';
}

// Truncates to `cap` items without dropping the sole occupant of a required
// slot (top/bottom/dress/shoes) — coverage must survive truncation, not
// just generation (the old slice(0,6) ran before any coverage check).
function weeklyTruncateItems(items, cap) {
  if (items.length <= cap) return items;
  const soleOccupant = new Set();
  ['top', 'bottom', 'dress', 'shoes'].forEach(slot => {
    const idxs = [];
    items.forEach((it, i) => { if (weeklyCategorySlot(it.category) === slot) idxs.push(i); });
    if (idxs.length === 1) soleOccupant.add(idxs[0]);
  });
  const kept = new Set(items.map((it, i) => i).filter(i => soleOccupant.has(i)));
  for (let i = 0; i < items.length && kept.size < cap; i++) kept.add(i);
  return items.filter((it, i) => kept.has(i));
}

// Days missing required coverage (a top+bottom, or a dress; plus shoes).
// Rest days are exempt — they carry no items by design.
function weeklyCoverageGaps(days) {
  const gaps = [];
  days.forEach(d => {
    if (d.rest) return;
    const slots = new Set(d.items.map(it => weeklyCategorySlot(it.category)));
    const bodyOk = slots.has('dress') || (slots.has('top') && slots.has('bottom'));
    if (bodyOk && slots.has('shoes')) return;
    const missing = [];
    if (!bodyOk) missing.push(slots.has('top') ? 'a bottom or dress' : slots.has('bottom') ? 'a top or dress' : 'a top and a bottom, or a dress');
    if (!slots.has('shoes')) missing.push('footwear');
    gaps.push({ label: d.day_label, missing: missing.join(' and ') });
  });
  return gaps;
}

const WEEKLY_ITEM_RULES = `- Each item: "name" is the piece itself; "brand" is ONE real brand suited to the register (owned pieces: the owned brand or ""); "description" is one internal reference sentence — cut, fabric, colour — never shown to her.
- "how" is this item's ROW NOTE. ${ROW_NOTE_RULE}
- Owned pieces: set "wardrobe_index" to the wardrobe list index, use the exact owned label as the name, and set retailer_hint and price_point to "". New pieces: "wardrobe_index": -1 with a real "retailer_hint" and a realistic EUR "price_point" (e.g. "€89").`;

app.post('/api/weekly', rateLimit({ windowMs: 60_000, max: 6 }), async (req, res) => {
  const { prompt, name, styleDna, styleIcons, wardrobeItems, context: rtContext, dayPlan, weekDays, anchorItemIds, gender } = req.body;
  const g = normGender(gender);

  const closetItems = Array.isArray(wardrobeItems) ? wardrobeItems.slice(0, 60) : [];
  const n = closetItems.length;
  const dnaBlock = styleDnaPromptBlock(styleDna, n, styleIcons);
  const { closetBlock, stateDirective } = weeklyClosetBlocks(closetItems);

  // Build-around pieces from the intake (Diary Phase 2 §2.5): pieces she
  // multi-selected to seed the plan — woven in where they serve, never
  // forced into every look.
  const anchorLabels = (Array.isArray(anchorItemIds) ? anchorItemIds.slice(0, 12) : [])
    .map(id => closetItems.find(c => String(c.id) === String(id)))
    .filter(Boolean)
    .map(c => c.label)
    .filter(Boolean);
  const anchorBlock = anchorLabels.length
    ? `\n\nBUILD-AROUND PIECES — she picked these herself to seed the week: ${anchorLabels.map(l => `"${l}"`).join(', ')}. Treat them as pieces to build the week AROUND — each earns real wears where it genuinely serves the day, never forced into every look and never ignored.`
    : '';

  // The calendar: weekDays are the client's day labels ("Monday · 14 Jul"),
  // dayPlan is her pre-generation itinerary — string = her plan (authoritative),
  // '' = Robes plans it, null = deliberately left free (NO outfit).
  const labels = (Array.isArray(weekDays) ? weekDays : []).slice(0, 14).map(l => String(l || '').slice(0, 40));
  const rawPlan = Array.isArray(dayPlan) ? dayPlan.slice(0, 14) : [];
  const dayCount = Math.min(14, Math.max(labels.length, rawPlan.length) || 7);
  const cal = [];
  for (let i = 0; i < dayCount; i++) {
    const p = rawPlan[i];
    cal.push({
      label: labels[i] || `Day ${i + 1}`,
      plan: p === null ? null : String(p || '').slice(0, 140),
    });
  }
  const active = cal.map((c, i) => ({ ...c, i })).filter(c => c.plan !== null);
  if (!active.length) return res.status(400).json({ error: 'every day is left free' });

  const itineraryBlock = `THE CALENDAR (${dayCount} days — generate EXACTLY one entry per listed day, in this exact order, using each "day_label" verbatim):\n${active.map((c, k) =>
    `${k + 1}. day_label: "${c.label}" — ${c.plan ? `HER PLAN (authoritative — dress exactly this): ${c.plan}` : 'no plan given — infer a fitting occasion from the brief'}`
  ).join('\n')}${cal.some(c => c.plan === null) ? `\n(Days deliberately left free are omitted above — do NOT generate entries for them.)` : ''}`;

  const rtLine = rtContext && (rtContext.city || rtContext.tempRange)
    ? `REAL-TIME CONTEXT: ${[rtContext.city, rtContext.month].filter(Boolean).join(' · ')}${rtContext.tempRange ? ' | ' + rtContext.tempRange : ''}${rtContext.condition ? ' | ' + rtContext.condition : ''}. This is the atmospheric reality for the week ahead — fabric weight, layers and footwear must answer to it.`
    : '';

  function weeklySystem(correctiveNote) {
    return `You are Robes' head stylist — elite, editorial, precise. ${name ? `The user's name is ${name}. ` : ''}${genderDirective(g)} You are planning a CHRONOLOGICAL WEEK of dressing — a calendar that routes real wardrobe pieces across her agenda. Never output a generic outfit — name exact cuts, fabrications and styling techniques.

THE WEEKLY PLAN RULES:
1. THE CALENDAR IS AUTHORITATIVE. Generate exactly one entry per calendar day listed, in order, with the given day_label verbatim. Where she wrote a plan for a day, dress exactly that plan and derive the "occasion" from it. Where no plan is given, infer a concrete occasion from the brief.
2. THE ROUTING DISCIPLINE. This is a wardrobe ROUTER, not separate shopping briefs: deliberately re-wear key pieces across the week styled differently (a blazer worn formal Tuesday returns undone over denim Thursday). Never repeat an identical full outfit. "note" is this day's PANEL NOTE — when a piece returns, its logic is part of that day's balance and register.
3. THE BUILD. Each day is one complete outfit of 4–6 items: top + bottom (or dress), footwear, and the finishing layer/bag/accessory that makes it deliberate.

${stateDirective}

FIELD RULES:
- "week_label": 2–4 words, sentence case, naming the week (e.g. "Studio week", "Back to work").
- "headline": a short serif-worthy line naming the week's mood, sentence case, ending in a full stop. Max 8 words.
- "stylist_summary" is the WEEK SUMMARY. ${WEEK_SUMMARY_RULE}
- "note" is this day's PANEL NOTE. ${PANEL_NOTE_RULE}
- "occasion": 2–5 words, sentence case.
- "palette": exactly 3 hex colours the week is built around, neutral to accent.
${WEEKLY_ITEM_RULES}
- "fallback": true ONLY if the brief is gibberish — then plan a pleasant, unremarkable working week instead. A plain agenda, job or mood is a valid weekly brief.${dnaBlock ? '\n\n' + dnaBlock : ''}

${BANNED_CONSTRUCTIONS_RULE}

${closetBlock}${correctiveNote ? '\n\n' + correctiveNote : ''}`;
  }

  const userText = `${rtLine ? rtLine + '\n\n' : ''}${itineraryBlock}${anchorBlock}

The user's brief for the week: "${(prompt || '').trim() || 'A regular working week.'}"

Dress every calendar day above, chronologically.`;

  async function withRetry(fn, attempts = 3) {
    for (let i = 0; i < attempts; i++) {
      try { return await fn(); } catch (err) {
        if (i === attempts - 1) throw err;
        await new Promise(r => setTimeout(r, 800 * Math.pow(2, i)));
      }
    }
  }

  async function generate(correctiveNote) {
    const r = await withRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: userText }] }],
      config: {
        systemInstruction: weeklySystem(correctiveNote),
        responseMimeType: 'application/json',
        responseSchema: WEEKLY_SCHEMA,
        thinkingConfig: { thinkingBudget: 0 },
        maxOutputTokens: 12000,
      },
    }));
    return JSON.parse(r.text);
  }

  // Re-assembles the full calendar from the model's generated days: entries
  // land on the active days positionally (day_label from the calendar
  // always wins); left-free days are stamped as rest days the client
  // renders as a quiet state. Truncation runs through weeklyTruncateItems
  // so a required slot can never be dropped by the 6-item cap.
  function assembleDays(genDays) {
    return cal.map((c, i) => {
      if (c.plan === null) {
        return { day_label: c.label, occasion: 'Left free', note: '', rest: true, user_activity: null, items: [] };
      }
      const k = active.findIndex(a => a.i === i);
      const g = genDays[k];
      if (!g) return { day_label: c.label, occasion: 'Left free', note: '', rest: true, user_activity: c.plan || null, items: [] };
      const kept = weeklyTruncateItems(g.items, 6);
      return {
        day_label: c.label,
        occasion: String(g.occasion || c.plan || '').slice(0, 60),
        note: String(g.note || '').slice(0, 240),
        rest: false,
        user_activity: c.plan || null,
        items: kept.map(it => weeklyNormaliseItem(it, closetItems)),
      };
    });
  }

  try {
    const t0 = Date.now();
    let parsed = await generate();

    let genDays = (Array.isArray(parsed.days) ? parsed.days : [])
      .filter(d => d && Array.isArray(d.items) && d.items.length);
    if (!genDays.length) throw new Error('empty weekly plan');
    let days = assembleDays(genDays);

    // Category-coverage validation (audit D1): one corrective regeneration
    // when a day is missing a required slot, mirroring Travel's
    // unaccounted()/corrective-recall pattern. If the second attempt still
    // doesn't clear coverage, keep whichever attempt is better and log the
    // remaining gap instead of blocking — a logged gap is acceptable, a
    // silent one was the bug.
    let gaps = weeklyCoverageGaps(days);
    if (gaps.length) {
      logAI({ feature: 'weekly', stage: 'validate', retry: true, gaps: gaps.length });
      try {
        const note = `VALIDATION FAILURE ON YOUR LAST ATTEMPT — these days are missing required coverage: ${gaps.map(g => `${g.label} (missing ${g.missing})`).join('; ')}. Rework so every day has a complete top-and-bottom (or dress) build plus footwear.`;
        const secondParsed = await generate(note);
        const secondGenDays = (Array.isArray(secondParsed.days) ? secondParsed.days : [])
          .filter(d => d && Array.isArray(d.items) && d.items.length);
        if (secondGenDays.length) {
          const secondDays = assembleDays(secondGenDays);
          const secondGaps = weeklyCoverageGaps(secondDays);
          if (secondGaps.length < gaps.length) {
            parsed = secondParsed; genDays = secondGenDays; days = secondDays; gaps = secondGaps;
          }
        }
      } catch { /* keep first attempt */ }
    }
    if (gaps.length) {
      logAI({ feature: 'weekly', stage: 'validate', retry: false, uncorrected: gaps.length, days: gaps.map(g => g.label) });
      const gctx = genCtx.getStore() || {};
      glog({
        user_id: gctx.userId || null,
        endpoint: '/api/weekly',
        model: 'gemini-2.5-flash',
        status: 'partial',
        prompt: null,
        response: null,
        detail: { stage: 'weekly_coverage_uncorrected', gaps: gaps.map(g => g.label), ...(gctx.genId ? { gen_id: gctx.genId } : {}) },
      });
    }

    const itemCount = days.reduce((s, d) => s + d.items.length, 0);
    const owned = days.reduce((s, d) => s + d.items.filter(i => i.wardrobe_match).length, 0);
    logAI({ feature: 'weekly', stage: 'text', model: 'gemini-2.5-flash', ms: Date.now() - t0, days: days.filter(d => !d.rest).length, items: itemCount, owned, fallback: parsed.fallback === true });
    // Composition (addendum to Tranche 2 Build 2): a week-level ratio
    // averages seven days together and can hide a single day that's
    // almost entirely new-to-buy — the exact failure the ownership query
    // was meant to catch. Carry the per-day breakdown alongside the week
    // totals in ONE row rather than logging averaged and losing the day.
    (function () {
      const gctx = genCtx.getStore() || {};
      glog({
        user_id: gctx.userId || null,
        endpoint: '/api/weekly',
        model: 'gemini-2.5-flash',
        status: 'ok',
        prompt: null,
        response: null,
        detail: {
          stage: 'composition',
          owned_count: owned,
          item_count: itemCount,
          days: days.filter(d => !d.rest).map(d => ({
            label: d.day_label,
            owned_count: d.items.filter(i => i.wardrobe_match).length,
            item_count: d.items.length,
          })),
          ...(gctx.genId ? { gen_id: gctx.genId } : {}),
        },
      });
    })();

    // Image frames — Weekly was the one generated surface with no imagery
    // at all (generation_log 2026-07-22: zero image rows against Daily's 29
    // and Travel's 8), so every unowned piece rendered as a monogram tile
    // forever. Owned pieces keep their wardrobe photos (truthful and free);
    // each DISTINCT unowned piece gets one still-life — the routing
    // discipline re-wears pieces across days, so every appearance of the
    // same name shares one frame. Capped like Travel so the staggered loop
    // stays under the client's 5-minute polling ceiling.
    const stillItems = [];
    const stillIdxByName = new Map();
    days.forEach(d => d.items.forEach(it => {
      if (it.wardrobe_match && it.wardrobe_match.image_url) return;
      const key = String(it.name || '').trim().toLowerCase();
      if (!key) return;
      if (stillIdxByName.has(key)) { it.image_index = stillIdxByName.get(key); return; }
      if (stillItems.length >= 8) return;
      it.image_index = stillItems.length;
      stillIdxByName.set(key, it.image_index);
      stillItems.push(it);
    }));
    const frames = stillItems.length;

    const jobId = frames ? randomBytes(6).toString('hex') : null;
    if (jobId) imageJobs.set(jobId, { images: Array.from({ length: frames }, () => null), done: false, created: Date.now() });
    res.json({
      fallback: parsed.fallback === true,
      week_label: parsed.week_label || '',
      headline: parsed.headline || '',
      stylist_summary: parsed.stylist_summary || '',
      palette: Array.isArray(parsed.palette) ? parsed.palette.slice(0, 3) : [],
      days,
      itemCount,
      ...(jobId ? { jobId, imageCount: frames } : {}),
    });

    if (jobId) {
      const t1 = Date.now();
      (async () => {
        for (let f = 0; f < frames; f++) {
          if (f > 0) await new Promise(r => setTimeout(r, 3000));
          const item = stillItems[f];
          const imgPrompt = `Editorial still-life photograph of a single ${item.name}${item.brand ? ' by ' + item.brand : ''} — ${item.description || ''}. The garment styled alone on a neutral cream-linen surface, soft daylight, quiet luxury catalogue aesthetic. No model, no text, no collage, one item only.`;
          try {
            const r = await Promise.race([
              ai.models.generateContent({
                model: 'gemini-3.1-flash-image',
                contents: [{ role: 'user', parts: [{ text: imgPrompt }] }],
                config: { responseModalities: ['TEXT', 'IMAGE'] },
              }),
              new Promise(resolve => setTimeout(() => resolve(null), 50000)),
            ]);
            const part = r?.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (!part?.inlineData) {
              logAI({ feature: 'weekly', stage: 'image', index: f, success: false, reason: r ? 'no_inline_data' : 'timeout_50s' });
              continue;
            }
            const url = await cloudinaryUpload(part.inlineData.data, part.inlineData.mimeType);
            if (!url) {
              logAI({ feature: 'weekly', stage: 'image', index: f, success: false, reason: 'cloudinary_failed' });
              continue;
            }
            logAI({ feature: 'weekly', stage: 'image', index: f, success: true, ms: Date.now() - t1 });
            const job = imageJobs.get(jobId);
            if (job) job.images[f] = url;
          } catch (err) {
            logAI({ feature: 'weekly', stage: 'image', index: f, success: false, reason: err.message });
          }
        }
        const job = imageJobs.get(jobId);
        if (job) job.done = true;
        logAI({ feature: 'weekly', stage: 'images_complete', jobId, totalMs: Date.now() - t0 });
      })();
    }
  } catch (err) {
    if (res.headersSent) return;
    logAI({ feature: 'weekly', stage: 'text', success: false, reason: err.message });
    console.error('[weekly] Gemini error:', err.message);
    res.status(500).json({ error: err.message || 'Weekly plan failed' });
  }
});

// Surgical single-day call — the weekly counterpart of /api/travel/day.
// Powers both "Restyle this day" (with anchored pieces held fixed) and
// dressing a day that was left free / re-planned after generation.
const WEEKLY_DAY_SCHEMA = {
  type: 'object',
  properties: {
    occasion: { type: 'string' },
    note: { type: 'string' },
    stylist_summary: { type: 'string' },
    items: WEEKLY_SCHEMA.properties.days.items.properties.items,
  },
  required: ['occasion', 'note', 'stylist_summary', 'items'],
};

app.post('/api/weekly/day', rateLimit({ windowMs: 60_000, max: 10 }), async (req, res) => {
  const { activity, dayLabel, brief, anchors, weekSummary, name, styleDna, styleIcons, wardrobeItems, context: rtContext, gender } = req.body;
  const g = normGender(gender);

  const closetItems = Array.isArray(wardrobeItems) ? wardrobeItems.slice(0, 60) : [];
  const n = closetItems.length;
  const dnaBlock = styleDnaPromptBlock(styleDna, n, styleIcons);
  const { closetBlock, stateDirective } = weeklyClosetBlocks(closetItems);

  const anchorList = (Array.isArray(anchors) ? anchors : [])
    .filter(a => a && a.name)
    .slice(0, 8)
    .map(a => {
      const idx = a.wardrobe_id != null ? closetItems.findIndex(it => String(it.id) === String(a.wardrobe_id)) : -1;
      return { name: String(a.name).slice(0, 120), category: a.category || '', brand: a.brand || '', idx };
    });
  const anchorBlock = anchorList.length
    ? `ANCHORED PIECES — the user has LOCKED these into this day's outfit. Every one of them MUST appear exactly as given (same piece, same name); restyle everything AROUND them:\n${anchorList.map(a =>
        `- ${a.name}${a.category ? ' [' + a.category + ']' : ''}${a.brand ? ', ' + a.brand : ''}${a.idx >= 0 ? ` (wardrobe index ${a.idx} — set its wardrobe_index)` : ''}`
      ).join('\n')}`
    : '';

  const rtLine = rtContext && (rtContext.city || rtContext.tempRange)
    ? `REAL-TIME CONTEXT: ${[rtContext.city, rtContext.month].filter(Boolean).join(' · ')}${rtContext.tempRange ? ' | ' + rtContext.tempRange : ''}${rtContext.condition ? ' | ' + rtContext.condition : ''}.`
    : '';

  const systemInstruction = `You are Robes' head stylist — elite, editorial, precise. ${name ? `The user's name is ${name}. ` : ''}${genderDirective(g)} You are dressing ONE day inside an already-planned week. One complete outfit of 4–6 items: top + bottom (or dress), footwear, and the finishing layer/bag/accessory. Never output a generic outfit — name exact cuts, fabrications and styling techniques.

${stateDirective}${anchorBlock ? '\n\n' + anchorBlock : ''}

FIELD RULES:
- "occasion": 2–5 words, sentence case, derived from the day's plan.
- "note" is this day's PANEL NOTE. ${PANEL_NOTE_RULE}
- "stylist_summary" refreshes the WEEK SUMMARY now this day has changed. ${WEEK_SUMMARY_RULE}
${WEEKLY_ITEM_RULES}${dnaBlock ? '\n\n' + dnaBlock : ''}

${BANNED_CONSTRUCTIONS_RULE}

${closetBlock}`;

  const userText = `${rtLine ? rtLine + '\n\n' : ''}${weekSummary ? `THE WEEK SO FAR (for routing continuity — re-wear pieces styled differently, never repeat an identical outfit): ${String(weekSummary).slice(0, 900)}\n\n` : ''}The day: ${dayLabel || 'a weekday'}. Her plan for it: "${(activity || '').trim() || 'A regular day.'}"${brief ? `\nThe week's brief: "${String(brief).slice(0, 300)}"` : ''}

Dress her for exactly this day.`;

  try {
    const t0 = Date.now();
    const textResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: userText }] }],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: WEEKLY_DAY_SCHEMA,
        thinkingConfig: { thinkingBudget: 0 },
        maxOutputTokens: 2600,
      },
    });
    const parsed = JSON.parse(textResponse.text);
    const items = (Array.isArray(parsed.items) ? parsed.items : [])
      .filter(it => it && it.name)
      .slice(0, 6)
      .map(it => weeklyNormaliseItem(it, closetItems));
    if (!items.length) throw new Error('empty day');
    const weeklyDayOwnedCount = items.filter(i => i.wardrobe_match).length;
    logAI({ feature: 'weekly-day', stage: 'text', model: 'gemini-2.5-flash', ms: Date.now() - t0, items: items.length, owned: weeklyDayOwnedCount });
    // Composition (addendum to Tranche 2 Build 2) — this restyle currently
    // logged without it; a single-day call needs no per-day breakdown.
    (function () {
      const gctx = genCtx.getStore() || {};
      glog({
        user_id: gctx.userId || null,
        endpoint: '/api/weekly/day',
        model: 'gemini-2.5-flash',
        status: 'ok',
        prompt: null,
        response: null,
        detail: { stage: 'composition', owned_count: weeklyDayOwnedCount, item_count: items.length, ...(gctx.genId ? { gen_id: gctx.genId } : {}) },
      });
    })();
    res.json({
      occasion: String(parsed.occasion || activity || '').slice(0, 60),
      note: String(parsed.note || '').slice(0, 240),
      stylist_summary: String(parsed.stylist_summary || '').slice(0, 400),
      items,
    });
  } catch (err) {
    logAI({ feature: 'weekly-day', stage: 'text', success: false, reason: err.message });
    console.error('[weekly/day] Gemini error:', err.message);
    res.status(500).json({ error: err.message || 'Day restyle failed' });
  }
});

/* ── travel edit (PRD: AI-Powered Capsule Packing & Lookbook,
      wardrobe-first revision: curatorial logic) ─────────────────────── */
// The user multi-selects a realistic shortlist from her catalogued
// wardrobe; Robes curates it — Keep (earns ≥3 wears, with a reason),
// Leave Behind (shortlisted but cut, with a reason), Worth Adding
// (genuine gaps only, the smallest group, may be empty). The pack count
// is an OUTPUT of the 1:3 rule + trip length, not a user input. The
// lookbook is a day-by-day Day/Evening grid where every outfit is a
// 4-step formula referencing capsule items by index; the 1:3 rule is
// validated server-side with one corrective regeneration. Weather for
// the destination + date window is fetched here (FR-101), not on the
// client — the client's weather strip is the user's current city.
const TRAVEL_TIERS = ['Foundations & Tailoring', 'Statement & Texture', 'Footwear & Hardware'];
const TRAVEL_ROLES = ['The Anchor', 'The Canvas', 'The Texture', 'The Exclamation Point'];

const TRAVEL_SCHEMA = {
  type: 'object',
  properties: {
    fallback: { type: 'boolean' },
    trip_label: { type: 'string' },
    headline: { type: 'string' },
    location_vibe: { type: 'string' },
    stylist_summary: { type: 'string' },
    suitcase_note: { type: 'string' },
    palette: { type: 'array', items: { type: 'string' } },
    capsule: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          tier: { type: 'string', enum: TRAVEL_TIERS },
          category: { type: 'string', enum: ['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Bags', 'Accessories', 'Swim', 'Other'] },
          brand: { type: 'string' },
          description: { type: 'string' },
          reason: { type: 'string' },
          bridge: { type: 'string' },
          wardrobe_index: { type: 'integer' },
          retailer_hint: { type: 'string' },
          price_point: { type: 'string' },
        },
        required: ['name', 'tier', 'category', 'brand', 'description', 'wardrobe_index', 'retailer_hint', 'price_point'],
      },
    },
    left_behind: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          wardrobe_index: { type: 'integer' },
          reason: { type: 'string' },
        },
        required: ['wardrobe_index', 'reason'],
      },
    },
    days: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          day_label: { type: 'string' },
          slots: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                slot: { type: 'string', enum: ['Day', 'Evening'] },
                title: { type: 'string' },
                how: { type: 'string' },
                transition_tip: { type: 'string' },
                formula: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      role: { type: 'string', enum: TRAVEL_ROLES },
                      item_index: { type: 'integer' },
                      note: { type: 'string' },
                    },
                    required: ['role', 'item_index', 'note'],
                  },
                },
              },
              required: ['slot', 'title', 'how', 'transition_tip', 'formula'],
            },
          },
        },
        required: ['day_label', 'slots'],
      },
    },
  },
  required: ['fallback', 'trip_label', 'headline', 'location_vibe', 'stylist_summary', 'suitcase_note', 'palette', 'capsule', 'left_behind', 'days'],
};

const WX_CODE_TEXT = [
  [0, 'clear skies'], [1, 'mostly clear'], [2, 'partly cloudy'], [3, 'overcast'],
  [45, 'foggy'], [51, 'light drizzle'], [61, 'rain'], [71, 'snow'], [80, 'passing showers'], [95, 'thunderstorms'],
];
function wxCondition(code) {
  if (!Number.isFinite(code)) return '';
  let text = '';
  for (const [c, t] of WX_CODE_TEXT) { if (code >= c) text = t; }
  return text;
}

async function fetchJson(url, ms = 6000) {
  const r = await Promise.race([
    fetch(url),
    new Promise((_, rej) => setTimeout(() => rej(new Error('weather timeout')), ms)),
  ]);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// FR-101: geocode the destination, then real forecast when the window is
// inside Open-Meteo's 16-day horizon, else last year's same dates as a
// seasonal read. Any failure returns null — the trip still generates.
async function fetchTripWeather(destination, dateFrom, dateTo) {
  try {
    const geo = await fetchJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1&language=en`);
    const loc = geo?.results?.[0];
    if (!loc) return null;
    const base = { city: loc.name, country: loc.country || '' };
    const from = new Date(dateFrom + 'T00:00:00Z');
    const to = new Date(dateTo + 'T00:00:00Z');
    if (isNaN(from) || isNaN(to)) return base;
    const daily = 'temperature_2m_max,temperature_2m_min,weather_code';
    const shift = d => { const x = new Date(d); x.setUTCFullYear(x.getUTCFullYear() - 1); return x.toISOString().slice(0, 10); };
    const liveUrl = () => `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&daily=${daily}&start_date=${dateFrom}&end_date=${dateTo}&temperature_unit=celsius`;
    const archiveUrl = () => `https://archive-api.open-meteo.com/v1/archive?latitude=${loc.latitude}&longitude=${loc.longitude}&daily=${daily}&start_date=${shift(from)}&end_date=${shift(to)}&temperature_unit=celsius`;

    // Live forecast when the trip STARTS inside Open-Meteo's ~16-day horizon
    // (and hasn't already begun), else last year's same dates as a seasonal
    // read. Try the primary source, and if it comes back empty fall through
    // to the other one before giving up — the pill always gets a real
    // forecast OR a seasonal average whenever geocoding succeeds.
    const daysToStart = Math.round((from - Date.now()) / 86400000);
    const useLive = daysToStart >= -1 && daysToStart <= 16;
    const plan = useLive
      ? [{ url: liveUrl, seasonal: false }, { url: archiveUrl, seasonal: true }]
      : [{ url: archiveUrl, seasonal: true }, { url: liveUrl, seasonal: false }];

    for (const step of plan) {
      let data;
      try { data = await fetchJson(step.url()); } catch { continue; }
      const maxes = (data?.daily?.temperature_2m_max || []).filter(Number.isFinite);
      const mins = (data?.daily?.temperature_2m_min || []).filter(Number.isFinite);
      const codes = (data?.daily?.weather_code || []).filter(Number.isFinite);
      if (!maxes.length || !mins.length) continue;
      const counts = new Map();
      codes.forEach(c => counts.set(c, (counts.get(c) || 0) + 1));
      const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      return {
        ...base,
        minC: Math.round(Math.min(...mins)),
        maxC: Math.round(Math.max(...maxes)),
        tempRange: `${Math.round(Math.min(...mins))}–${Math.round(Math.max(...maxes))}°C`,
        condition: wxCondition(dominant),
        eveningMinC: Math.round(Math.min(...mins)),
        seasonal: step.seasonal,
      };
    }
    return base;
  } catch (err) {
    logAI({ feature: 'travel', stage: 'weather', success: false, reason: err.message });
    return null;
  }
}

// Validates the 1:3 rule — returns capsule indexes worn in fewer than
// three outfits (only meaningful when the lookbook itself is non-trivial).
function travelUnderusedItems(capsule, days) {
  const uses = capsule.map(() => 0);
  let outfits = 0;
  days.forEach(d => (d.slots || []).forEach(s => {
    outfits++;
    const seen = new Set();
    (s.formula || []).forEach(f => {
      if (Number.isInteger(f.item_index) && f.item_index >= 0 && f.item_index < capsule.length && !seen.has(f.item_index)) {
        seen.add(f.item_index);
        uses[f.item_index]++;
      }
    });
  }));
  if (outfits < 6) return [];
  return uses.map((u, i) => ({ i, u })).filter(x => x.u < 3).map(x => x.i);
}

app.post('/api/travel', rateLimit({ windowMs: 60_000, max: 6 }), async (req, res) => {
  const { destination, dateFrom, dateTo, brief, name, styleDna, styleIcons, wardrobeItems, shortlistIds, anchorIds, dayPlan, gender } = req.body;
  const g = normGender(gender);
  if (!destination || !String(destination).trim()) {
    return res.status(400).json({ error: 'Tell us where you’re going first.' });
  }

  const dest = String(destination).trim().slice(0, 120);
  const closetItems = Array.isArray(wardrobeItems) ? wardrobeItems.slice(0, 60) : [];
  const n = closetItems.length;
  const dnaBlock = styleDnaPromptBlock(styleDna, n, styleIcons);

  // The shortlist (wardrobe-first PRD, curatorial revision) — everything
  // she is TEMPTED to bring, multi-selected from her catalogued wardrobe.
  // Every shortlisted piece is KEPT — "Leave Behind" is deprecated (beta
  // feedback: cutting her own picks read as illogical without a real
  // packing-restriction engine); Robes' job is the wear-map + true gaps.
  // (`anchorIds` accepted for back-compat with older clients.)
  const shortIdxs = (Array.isArray(shortlistIds) ? shortlistIds : (Array.isArray(anchorIds) ? anchorIds : []))
    .map(id => closetItems.findIndex(it => String(it.id) === String(id)))
    .filter(i => i >= 0);

  // Moodboard handoff ("Pack this trip" from a board): unowned board pieces
  // ride along and land in Worth Adding — she chose them already.
  const suggestedItems = (Array.isArray(req.body.suggestedItems) ? req.body.suggestedItems : [])
    .filter(s => s && s.name)
    .slice(0, 12)
    .map(s => ({
      name: String(s.name).slice(0, 120),
      category: s.category ? String(s.category).slice(0, 24) : '',
      brand: s.brand ? String(s.brand).slice(0, 60) : '',
      retailer_hint: s.retailer_hint ? String(s.retailer_hint).slice(0, 60) : '',
      price_point: s.price_point ? String(s.price_point).slice(0, 20) : '',
    }));

  // The capsule normally caps at 16, but every shortlisted piece is kept and
  // every moodboard pick joins Worth Adding — the cap must never force a
  // silent cut of something she chose herself.
  const capMax = Math.max(16, shortIdxs.length + suggestedItems.length + 3);

  const from = new Date(String(dateFrom || '') + 'T00:00:00Z');
  const to = new Date(String(dateTo || '') + 'T00:00:00Z');
  const validDates = !isNaN(from) && !isNaN(to) && to >= from;
  const tripDays = validDates ? Math.min(10, Math.round((to - from) / 86400000) + 1) : 7;
  const fmt = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const dateLine = validDates ? `${fmt(from)} – ${fmt(to)}${from.getUTCFullYear() !== new Date().getUTCFullYear() ? ' ' + from.getUTCFullYear() : ''}` : '';
  const monthName = validDates ? from.toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' }) : '';

  const weather = validDates ? await fetchTripWeather(dest, String(dateFrom), String(dateTo)) : await fetchTripWeather(dest, '', '');

  // The user's own day plan (Trip > pick pieces > plan days > outfits) —
  // one entry per trip day: a string with her plan, '' for days she left
  // to Robes, or null for days she DELIBERATELY left free (no looks).
  // Authoritative: a planned day is dressed for exactly that plan.
  const editOnly = req.body.editOnly === true;
  const planDays = (Array.isArray(dayPlan) ? dayPlan : [])
    .slice(0, tripDays)
    .map(s => s === null ? null : String(s || '').trim().slice(0, 140));
  const restIdx = new Set(planDays.map((p, i) => p === null ? i : -1).filter(i => i >= 0));
  const hasPlan = planDays.some(Boolean) || restIdx.size > 0;
  const planDate = i => validDates ? fmt(new Date(from.getTime() + i * 86400000)) : '';
  const planList = planDays.map((p, i) =>
    `Day ${i + 1}${planDate(i) ? ' (' + planDate(i) + ')' : ''}: ${p === null
      ? 'DELIBERATELY LEFT FREE — she needs NO looks this day; return this day with "slots": []'
      : p || '(no plan given — infer a plausible day from the brief and destination)'}`
  ).join('\n');
  const planBlock = hasPlan && !editOnly
    ? `THE USER'S OWN ITINERARY — she has told you her real plans. This is AUTHORITATIVE: dress each planned day for EXACTLY what she is doing (every slot answers to it — the Day slot dresses the plan itself; an Evening slot exists ONLY when her plan names an evening moment). Never invent a different agenda for a planned day. For a planned day, "day_label" is "Day N · {2–4 word title of her plan}".
${planList}`
    : (hasPlan && editOnly
      ? `HER ITINERARY (context for the edit — the outfits come later, but what you keep must be able to dress these plans):
${planList}`
      : '');

  // Stamp the plan onto the normalised days: a deliberately free day is
  // replaced with an empty rest entry; a planned day carries her own words
  // (the client shows "· your plan" and prefills ✎ The real plan).
  function applyPlanStamp(days) {
    days.forEach((d, i) => {
      if (restIdx.has(i)) days[i] = { day_label: `Day ${i + 1} · Left free`, rest: true, slots: [] };
      else if (planDays[i]) d.user_activity = planDays[i];
    });
    return days;
  }

  const closetBlock = n
    ? `THE USER'S DIGITISED WARDROBE (${n} pieces, referenced by wardrobe_index):\n${closetItems.map((i, idx) =>
        `${idx}: ${i.label}${i.category ? ' [' + i.category + ']' : ''}${i.color ? ', ' + i.color : ''}${i.brand ? ', ' + i.brand : ''}${Number(i.times_worn) > 0 ? `, worn ${i.times_worn}×` : ''}${heroMark(i)}`
      ).join('\n')}`
    : 'THE USER HAS NOT CATALOGUED ANY WARDROBE PIECES YET.';
  // Trip hero priority answers to the DESTINATION's climate/season (the
  // micro-climate block + trip dates), not the user's current season
  const heroBlock = heroDirective(closetItems);

  // Only the shortlist-less legacy path needs a wardrobe-state directive —
  // with a shortlist the curatorial block below governs everything.
  const stateDirective = shortIdxs.length ? '' : (n === 0
    ? `WARDROBE STATE: EMPTY. Build a fully aspirational capsule — a curated shopping brief. Every item gets "wardrobe_index": -1 plus a real "retailer_hint" and "price_point". "left_behind" must be [].`
    : n < 15
      ? `WARDROBE STATE: GROWING (${n}/15). Hybrid capsule: wherever an owned piece genuinely serves the trip, use it — set its "wardrobe_index" and use its exact label as the name. Fill true gaps with editorially matched acquisitions (wardrobe_index -1, real retailer_hint + price_point). When an owned piece and a hypothetical piece would both work, ALWAYS pack the owned piece. "left_behind" must be [].`
      : `WARDROBE STATE: COMPLETE (${n} pieces). Closet-first capsule: pack primarily from the digitised wardrobe — most items should carry a valid "wardrobe_index" and their exact owned label. Suggest a new piece (wardrobe_index -1) only for a true gap the trip exposes. "left_behind" must be [].`);

  const wxLine = weather && weather.tempRange
    ? `MICRO-CLIMATE (${weather.seasonal ? 'seasonal average for these dates' : 'live forecast'}): ${weather.city}${weather.country ? ', ' + weather.country : ''} — daytime highs to ${weather.maxC}°C, evening lows to ${weather.minC}°C, mostly ${weather.condition || 'mixed conditions'}. Fabric weights, layers and evening cover-ups must answer to this.`
    : '';

  // The pack count is an output, not an input: the model derives it from
  // trip length + the 1:3 rule. `suggest` is soft guidance echoing the
  // PRD's 5/4/5 Ibiza reference architecture; 16 is the hard normalise cap.
  const suggest = Math.max(8, Math.min(15, tripDays + 6));
  const foundations = Math.round(suggest * 0.36);
  const statements = Math.round(suggest * 0.28);
  const hardware = suggest - foundations - statements;

  function travelSystem(correctiveNote) {
    return `You are Robes' head stylist — elite, editorial, precise. ${name ? `The user's name is ${name}. ` : ''}${genderDirective(g)} You are building a Capsule Packing Edit & Lookbook for a trip, governed by the StyleAlchemist 4-Core Pillars. Never output a generic outfit — ban flat phrasing ("jeans and a top"); render every look with high descriptive specificity (e.g. "Deep-V tuck the oversized alabaster silk button-down into the wide-leg linen trousers, cinched with the molten gold waist-belt").

THE PILLARS — all four are hard constraints:
1. THE 1:3 HIGH-YIELD RULE. Every capsule item must appear in AT LEAST THREE different outfits across the lookbook, in at least two distinct dress codes. No single-outfit passengers — if a piece can't earn three wears, it doesn't get packed.
2. THE CAPSULE MATRIX. YOU decide the pack count — the smallest capsule that dresses every day of the trip under the 1:3 rule. For this ${tripDays}-day trip that is typically around ${suggest} items (never more than ${capMax}); the maths must hold: pieces × 3 wears ≥ ${tripDays * 2} looks × ~4 formula slots. Split the capsule across the three tiers: "${TRAVEL_TIERS[0]}" (~${foundations} items — architectural basics, tailoring, versatile one-pieces), "${TRAVEL_TIERS[1]}" (~${statements} items — the tactile hero pieces: statement dresses, crochet, plissé, prints), "${TRAVEL_TIERS[2]}" (~${hardware} items — shoes, bags, belts, jewellery that seal silhouettes).${shortIdxs.length ? ' The tier targets are guidance for shaping what you KEEP — never pad the capsule to hit a number.' : ''}
3. THE 4-STEP DRESSING FORMULA. Every outfit's "formula" is built ONLY from capsule items referenced by "item_index" (0-based index into the capsule array — never invent an item that isn't packed): "The Anchor" ×1 (the context-driven hero), "The Canvas" ×1–2 (the grounding basics), "The Texture" ×1 (the tactile dimension layer), "The Exclamation Point" ×1–2 (footwear/hardware that finish it). Swim or sleep-adjacent looks may drop to 3 entries, never fewer. Each entry's "note" is that piece's ROW NOTE. ${ROW_NOTE_RULE}
4. CONTEXT ENGINEERING. Ingest three vectors at once: the Location Vibe (name it in "location_vibe", e.g. "Refined Mediterranean Minimalism"), the Micro-Climate provided, and the client's proportional architecture / style DNA below. Everything packed answers to all three.

${editOnly
  ? `THE LOOKBOOK IS DEFERRED: she is still gathering pieces and will plan the outfits later, as she packs. Return "days": [] (an empty array). STILL apply the 1:3 discipline when deciding what to keep — every kept piece must plausibly earn at least three wears across the ~${tripDays * 2} looks this trip will eventually hold.`
  : `THE LOOKBOOK: exactly ${tripDays} entries in "days" — one per trip day, "day_label" like "Day 1 · Arrival"${dateLine ? ` (the trip runs ${dateLine})` : ''}. Each dressed day gets a "Day" slot; add an "Evening" slot ONLY when that day's plan names an evening moment (a dinner, a night out, an event) or the brief clearly calls for one — by default the evening is LEFT FREE and the day carries just its "Day" slot. Slots are ${hasPlan ? 'mapped to the user\'s own itinerary below' : 'mapped to a plausible itinerary drawn from the brief'}. Each slot: "title" (3–6 words naming the scene), "how" (ONE hyper-specific styling sentence — the anti-generic constraint applies), "transition_tip" (ONE concrete subtractive-styling or hardware-swap move that shifts the look into its next scene) and the "formula". A day the itinerary marks as deliberately left free gets "slots": [] — no looks.`}

${planBlock ? planBlock + '\n\n' : ''}${[stateDirective, heroBlock].filter(Boolean).join('\n\n')}

FIELD RULES:
- "trip_label": destination + month, ALL CAPS (e.g. "IBIZA · JULY").
- "headline": a short serif-worthy line naming the trip, sentence case, full stop, max 9 words (e.g. "A week in Ibiza, packed once.").
- "stylist_summary": 2–3 sentences opening with the climate + vibe read, then how the capsule multiplies (reference the 1:3 maths — the pieces kept vs the ${tripDays * 2} looks they earn).${shortIdxs.length ? ' Open by VALIDATING the strongest kept piece ("Your ' + closetItems[shortIdxs[0]].label.toLowerCase() + ' is exactly right for…") before describing what the edit unlocks.' : ''}
- "reason": for KEPT owned pieces — one warm, specific line on why it made the cut (the wears it earns, what it anchors). New pieces: "".
- "bridge": for NEW pieces only (wardrobe_index -1) — one clause naming what it connects in the capsule and how many looks it unlocks. Owned pieces: "".
- "suitcase_note": ONE practical packing move (rolling, garment bags, what flies in what) in stylist voice.
- "palette": exactly 3 hex colours the capsule is built on, neutral to accent.
- Capsule items: "name" is the piece (for owned pieces the exact owned label); "brand" ONE real brand (owned brand or ""); "description" one hyper-specific sentence — cut, fabrication, colour, why it earns its place. Owned: wardrobe_index set, retailer_hint and price_point "". New: wardrobe_index -1, real "retailer_hint" (e.g. "COS", "Net-a-Porter", "Arket") and realistic EUR "price_point" (e.g. "€145").
- "fallback": true ONLY if the destination/brief is gibberish — then pack for a pleasant week away somewhere temperate instead.${dnaBlock ? '\n\n' + dnaBlock : ''}

${BANNED_CONSTRUCTIONS_RULE}

${shortIdxs.length ? `THE SHORTLIST — everything she is bringing (${shortIdxs.length} owned pieces, by wardrobe_index):
${shortIdxs.map(i => `${i}: ${closetItems[i].label}${closetItems[i].category ? ' [' + closetItems[i].category + ']' : ''}${closetItems[i].color ? ', ' + closetItems[i].color : ''}`).join('\n')}
KEEP EVERY SHORTLISTED PIECE — she has already decided what to bring; NEVER cut, drop or leave behind a shortlisted piece. Each one goes in "capsule" with its wardrobe_index, exact owned label and a one-line "reason" naming the wears it earns and what it anchors. "left_behind" must be []. Work every piece as hard as the 1:3 rule allows — a weaker piece still gets styled into the trip, not cut.
WORTH ADDING — the SMALLEST group, and it may be EMPTY: suggest a new piece (wardrobe_index -1, real retailer_hint + price_point) ONLY for a genuine gap the packed pieces expose that no shortlisted piece can fill. Never more than 3${suggestedItems.length ? ' beyond her moodboard picks below' : ''}. Every NEW piece must justify itself as a bridge: set its "bridge" field to one clause naming what it connects and how many looks it unlocks (e.g. "Bridges the linen tailoring and the evening slip — unlocks 5 looks").
Do not pack owned pieces she did not shortlist — she chose from her full wardrobe already.

` : ''}${suggestedItems.length ? `HER MOODBOARD PICKS (${suggestedItems.length} pieces she does NOT own — she is packing this trip from a moodboard she built):
${suggestedItems.map(s => `- ${s.name}${s.category ? ' [' + s.category + ']' : ''}${s.brand ? ', ' + s.brand : ''}${(s.retailer_hint || s.price_point) ? ' (' + [s.retailer_hint, s.price_point].filter(Boolean).join(' · ') + ')' : ''}`).join('\n')}
Include EACH of these as a new capsule piece (wardrobe_index -1) with its brand and a real "retailer_hint" + "price_point" (use the ones given where present) — they are her Worth Adding list and do NOT count against the new-piece cap. Style them into the lookbook like any other capsule piece. Only drop one if it genuinely cannot serve this trip.

` : ''}${closetBlock}${correctiveNote ? '\n\n' + correctiveNote : ''}`;
  }

  const userText = `${wxLine ? wxLine + '\n\n' : ''}THE TRIP BRIEF: ${dest}${dateLine ? ', ' + dateLine : ''}${monthName ? ' (' + monthName + ')' : ''}, ${tripDays} day${tripDays > 1 ? 's' : ''}. ${String(brief || '').trim() || 'No further notes — read the destination and season for the vibe.'}

${shortIdxs.length ? `Pack every shortlisted piece, map the wears each one earns, add only what's genuinely missing${editOnly ? '' : ' — and build'}` : (editOnly ? 'Build the capsule' : 'Build the capsule and')}${editOnly ? '. The lookbook is deferred — "days" must be [].' : ` the full ${tripDays}-day lookbook.`}`;

  async function withRetry(fn, attempts = 3) {
    for (let i = 0; i < attempts; i++) {
      try { return await fn(); } catch (err) {
        if (i === attempts - 1) throw err;
        await new Promise(r => setTimeout(r, 800 * Math.pow(2, i)));
      }
    }
  }

  function normalise(parsed) {
    const capsule = (Array.isArray(parsed.capsule) ? parsed.capsule : [])
      .filter(it => it && it.name)
      .slice(0, capMax)
      .map(it => {
        if (!TRAVEL_TIERS.includes(it.tier)) it.tier = TRAVEL_TIERS[0];
        const wi = Number.isInteger(it.wardrobe_index) && it.wardrobe_index >= 0 ? closetItems[it.wardrobe_index] : null;
        it.wardrobe_match = wi
          ? { id: wi.id, label: wi.label, image_url: wi.image_url || null, color: wi.color || '' }
          : null;
        return it;
      });
    // Free days keep their (empty) position so the plan stamp can align —
    // only a day the plan doesn't mark free is dropped for having no looks.
    const days = (Array.isArray(parsed.days) ? parsed.days : [])
      .filter(d => d && Array.isArray(d.slots))
      .slice(0, tripDays)
      .map(d => {
        d.slots = d.slots.slice(0, 2).map(s => {
          s.formula = (Array.isArray(s.formula) ? s.formula : [])
            .filter(f => f && TRAVEL_ROLES.includes(f.role) && Number.isInteger(f.item_index) && f.item_index >= 0 && f.item_index < capsule.length)
            .slice(0, 6);
          return s;
        }).filter(s => s.formula.length);
        return d;
      })
      .filter((d, i) => d.slots.length || restIdx.has(i));
    // "Leave Behind" is deprecated — anything the model still tries to cut
    // is ignored; unaccounted() forces a corrective pass so every
    // shortlisted piece lands in the capsule instead.
    return { capsule, days, leftBehind: [] };
  }

  async function generate(correctiveNote) {
    const r = await withRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: userText }] }],
      config: {
        systemInstruction: travelSystem(correctiveNote),
        responseMimeType: 'application/json',
        responseSchema: TRAVEL_SCHEMA,
        thinkingConfig: { thinkingBudget: 0 },
        maxOutputTokens: 9000,
      },
    }));
    return JSON.parse(r.text);
  }

  // Shortlisted pieces missing from the capsule — every shortlist piece
  // must be kept (Leave Behind is deprecated), never dropped.
  function unaccounted(capsule, leftBehind) {
    const seen = new Set([
      ...capsule.filter(it => it.wardrobe_match).map(it => String(it.wardrobe_match.id)),
      ...leftBehind.map(l => String(l.id)),
    ]);
    return shortIdxs.filter(si => !seen.has(String(closetItems[si].id)));
  }

  try {
    const t0 = Date.now();
    let parsed = await generate();
    let { capsule, days, leftBehind } = normalise(parsed);
    applyPlanStamp(days);

    // PRD §2 validation parser: one corrective pass when the 1:3 matrix
    // is materially violated (more than two under-used items) or a
    // shortlisted piece went unaccounted for (neither kept nor cut).
    // In edit-only mode "days" is deliberately empty — never a failure.
    const under = travelUnderusedItems(capsule, days);
    const missing = unaccounted(capsule, leftBehind);
    if (!capsule.length || (!editOnly && !days.length) || under.length > 2 || missing.length) {
      const note = capsule.length && (editOnly || days.length)
        ? `VALIDATION FAILURE ON YOUR LAST ATTEMPT — ${[
            under.length ? `these packed items were worn in fewer than 3 outfits: ${under.map(i => capsule[i].name).join(', ')}` : '',
            missing.length ? `these shortlisted pieces were missing from the capsule: ${missing.map(i => closetItems[i].label).join(', ')}` : '',
          ].filter(Boolean).join('; ')}. Rework the edit so EVERY shortlisted piece is kept in the capsule${editOnly ? '' : ', and EVERY capsule item earns at least three wears'}.`
        : '';
      logAI({ feature: 'travel', stage: 'validate', retry: true, underused: under.length, unaccounted: missing.length, empty: !capsule.length || (!editOnly && !days.length) });
      try {
        const second = await generate(note);
        const norm2 = normalise(second);
        applyPlanStamp(norm2.days);
        const under2 = travelUnderusedItems(norm2.capsule, norm2.days);
        const missing2 = unaccounted(norm2.capsule, norm2.leftBehind);
        if (norm2.capsule.length && (editOnly || norm2.days.length) &&
            (!capsule.length || (!editOnly && !days.length) || (missing2.length + under2.length) < (missing.length + under.length))) {
          parsed = second; capsule = norm2.capsule; days = norm2.days; leftBehind = norm2.leftBehind;
        }
      } catch { /* keep first attempt */ }
    }
    if (!capsule.length || (!editOnly && !days.length)) throw new Error('empty travel edit');
    if (editOnly) days = [];

    // Image frames: 0 = the hero editorial shot; then a still-life per
    // capsule item that has no wardrobe photo (owned photos are truthful
    // and free), capped so staggered generation stays under the client's
    // 5-minute polling ceiling.
    let frames = 1;
    capsule.forEach(it => {
      if (!(it.wardrobe_match && it.wardrobe_match.image_url) && frames < 8) it.image_index = frames++;
    });

    const owned = capsule.filter(it => it.wardrobe_match).length;
    logAI({ feature: 'travel', stage: 'text', model: 'gemini-2.5-flash', ms: Date.now() - t0, items: capsule.length, days: days.length, owned, leftBehind: leftBehind.length, shortlisted: shortIdxs.length, underused: travelUnderusedItems(capsule, days).length, fallback: parsed.fallback === true });
    // Composition (addendum to Tranche 2 Build 2) — the capsule is one
    // pack shared across the whole trip (not per-day like Weekly), so one
    // owned-vs-total figure for the trip is the meaningful unit here.
    (function () {
      const gctx = genCtx.getStore() || {};
      glog({
        user_id: gctx.userId || null,
        endpoint: '/api/travel',
        model: 'gemini-2.5-flash',
        status: 'ok',
        prompt: null,
        response: null,
        detail: { stage: 'composition', owned_count: owned, item_count: capsule.length, ...(gctx.genId ? { gen_id: gctx.genId } : {}) },
      });
    })();

    const jobId = randomBytes(6).toString('hex');
    imageJobs.set(jobId, { images: Array.from({ length: frames }, () => null), done: false, created: Date.now() });
    res.json({
      fallback: parsed.fallback === true,
      trip_label: parsed.trip_label || dest.toUpperCase(),
      headline: parsed.headline || '',
      location_vibe: parsed.location_vibe || '',
      stylist_summary: parsed.stylist_summary || '',
      suitcase_note: parsed.suitcase_note || '',
      palette: Array.isArray(parsed.palette) ? parsed.palette.slice(0, 3) : [],
      capsule,
      left_behind: leftBehind,
      days,
      outfits_deferred: editOnly,
      destination: dest,
      dateFrom: validDates ? String(dateFrom) : '',
      dateTo: validDates ? String(dateTo) : '',
      dateLine,
      weather,
      jobId,
      imageCount: frames,
    });

    const t1 = Date.now();
    const capsuleNames = capsule.map(it => it.name).join(', ');
    (async () => {
      const stills = capsule.filter(it => Number.isInteger(it.image_index));
      for (let f = 0; f < frames; f++) {
        if (f > 0) await new Promise(r => setTimeout(r, 3000));
        const item = f === 0 ? null : stills[f - 1];
        const imgPrompt = f === 0
          ? `PORTRAIT ORIENTATION ONLY. Single editorial travel-fashion photograph — one ${wearerNoun(g)}, alone, one scene, no collage, no split panels, no text overlays. ${FULL_BODY_FRAME} ${styleIconsImageLine(styleIcons)}${parsed.location_vibe ? parsed.location_vibe + ' aesthetic. ' : ''}Setting: ${dest}${monthName ? ' in ' + monthName : ''}. ${wearerWears(g)} a complete look drawn from this capsule: ${capsuleNames}. Soft natural light, luxury resort campaign aesthetic.`
          : `Editorial still-life photograph of a single ${item.name}${item.brand ? ' by ' + item.brand : ''} — ${item.description || ''}. The piece styled alone on a neutral cream-linen surface, soft daylight, quiet luxury catalogue aesthetic. No model, no text, no collage, one item only.`;
        try {
          const r = await Promise.race([
            ai.models.generateContent({
              model: 'gemini-3.1-flash-image',
              contents: [{ role: 'user', parts: [{ text: imgPrompt }] }],
              config: { responseModalities: ['TEXT', 'IMAGE'] },
            }),
            new Promise(resolve => setTimeout(() => resolve(null), 50000)),
          ]);
          const part = r?.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
          if (!part?.inlineData) {
            logAI({ feature: 'travel', stage: 'image', index: f, success: false, reason: r ? 'no_inline_data' : 'timeout_50s' });
            continue;
          }
          const url = await cloudinaryUpload(part.inlineData.data, part.inlineData.mimeType);
          if (!url) {
            logAI({ feature: 'travel', stage: 'image', index: f, success: false, reason: 'cloudinary_failed' });
            continue;
          }
          logAI({ feature: 'travel', stage: 'image', index: f, success: true, ms: Date.now() - t1 });
          const job = imageJobs.get(jobId);
          if (job) job.images[f] = url;
        } catch (err) {
          logAI({ feature: 'travel', stage: 'image', index: f, success: false, reason: err.message });
        }
      }
      const job = imageJobs.get(jobId);
      if (job) job.done = true;
      logAI({ feature: 'travel', stage: 'images_complete', jobId, totalMs: Date.now() - t0 });
    })();
  } catch (err) {
    if (res.headersSent) return;
    logAI({ feature: 'travel', stage: 'text', success: false, reason: err.message });
    console.error('[travel] Gemini error:', err.message);
    res.status(500).json({ error: err.message || 'Travel edit failed' });
  }
});

/* ── travel edit: reactive day restyle (growth PRD — Reactive
   Personalization). The lookbook's LLM-guessed itinerary is the baseline;
   when the user declares a day's REAL plan, this surgical call re-dresses
   only that day by re-mixing the existing capsule. At most ONE new gap
   piece may be introduced, and only when the capsule genuinely cannot
   serve the plan (e.g. a formal wedding with nothing formal packed). ── */
const TRAVEL_DAY_SCHEMA = {
  type: 'object',
  properties: {
    day_label: { type: 'string' },
    new_item_needed: { type: 'boolean' },
    new_item: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        tier: { type: 'string', enum: TRAVEL_TIERS },
        category: { type: 'string', enum: ['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Bags', 'Accessories', 'Swim', 'Other'] },
        brand: { type: 'string' },
        description: { type: 'string' },
        bridge: { type: 'string' },
        retailer_hint: { type: 'string' },
        price_point: { type: 'string' },
      },
      required: ['name', 'tier', 'category', 'brand', 'description', 'retailer_hint', 'price_point'],
    },
    slots: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          slot: { type: 'string', enum: ['Day', 'Evening'] },
          title: { type: 'string' },
          how: { type: 'string' },
          formula: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                role: { type: 'string', enum: TRAVEL_ROLES },
                item_index: { type: 'integer' },
                note: { type: 'string' },
              },
              required: ['role', 'item_index', 'note'],
            },
          },
        },
        required: ['slot', 'title', 'how', 'formula'],
      },
    },
  },
  required: ['day_label', 'new_item_needed', 'slots'],
};

app.post('/api/travel/day', rateLimit({ windowMs: 60_000, max: 10 }), async (req, res) => {
  const { destination, brief, dayIndex, activity, capsule, anchors, weather, name, styleDna, styleIcons, gender } = req.body;
  const g = normGender(gender);
  const act = String(activity || '').trim().slice(0, 200);
  const capIn = (Array.isArray(capsule) ? capsule : []).filter(c => c && c.name).slice(0, 20);
  const anchorsIn = (Array.isArray(anchors) ? anchors : [])
    .filter(a => a && Number.isInteger(a.item_index) && a.item_index >= 0 && a.item_index < capIn.length)
    .slice(0, 8);
  if (!act || !capIn.length) {
    return res.status(400).json({ error: 'Missing plan or capsule.' });
  }
  const dayNum = (Number.isInteger(parseInt(dayIndex, 10)) ? parseInt(dayIndex, 10) : 0) + 1;
  const dest = String(destination || '').trim().slice(0, 120) || 'the trip';
  const dnaBlock = styleDnaPromptBlock(styleDna, capIn.filter(c => c.owned).length, styleIcons);

  const capList = capIn.map((c, i) =>
    `${i}: ${c.name}${c.category ? ' [' + c.category + ']' : ''}${c.brand ? ', ' + c.brand : ''}${c.owned ? ' (hers)' : ''}`
  ).join('\n');
  const wxLine = weather && weather.tempRange
    ? `MICRO-CLIMATE: ${weather.city || dest} — ${weather.tempRange}, mostly ${weather.condition || 'mixed conditions'}.`
    : '';

  const systemInstruction = `You are Robes' head stylist — elite, editorial, precise. ${name ? `The user's name is ${name}. ` : ''}${genderDirective(g)} The user is refining ONE day of an existing capsule lookbook for ${dest}${brief ? ` (trip brief: "${String(brief).slice(0, 300)}")` : ''}. Never output a generic outfit — ban flat phrasing; every "how" line is hyper-specific (cut, fabric, styling move).

THE PACKED CAPSULE (referenced by "item_index"):
${capList}

RULES:
1. Re-dress Day ${dayNum} for the user's REAL plan: "${act}". A "Day" slot always comes first; add an "Evening" slot ONLY when the plan names an evening moment (a dinner, a night out, an event — or the plan explicitly asks for the evening) — otherwise return just the "Day" slot and the evening stays free. When the plan IS a single evening event, style the lead-up as "Day" and the event itself as "Evening".
2. RE-MIX FIRST. Build every outfit ONLY from the capsule via "item_index" and the 4-step formula: "The Anchor" ×1, "The Canvas" ×1–2, "The Texture" ×1, "The Exclamation Point" ×1–2 (3 entries minimum for swim/undone moments). Each entry's "note" is that piece's ROW NOTE. ${ROW_NOTE_RULE}
3. Set "new_item_needed": true ONLY if the plan genuinely cannot be dressed from the capsule (e.g. a formal wedding with nothing remotely formal packed). Then give "new_item" — one real gap piece with retailer_hint, a realistic EUR price_point and a "bridge" clause (what it connects + looks it unlocks) — and reference it in the formulas as item_index ${capIn.length}. Otherwise "new_item_needed": false.
4. "day_label": "Day ${dayNum} · {2–4 word title of the plan}". "title" per slot: 3–6 words naming the scene. "transition_tip" per slot: ONE concrete subtractive-styling or hardware-swap move that shifts the look into its next scene.${anchorsIn.length ? `\n5. ANCHORED PIECES — the user has LOCKED these into this day: ${anchorsIn.map(a => `item_index ${a.item_index} (${capIn[a.item_index].name})`).join(', ')}. Each anchored piece MUST appear in at least one of the two slots' formulas, exactly as packed — restyle everything AROUND them, never replace them.` : ''}${dnaBlock ? '\n\n' + dnaBlock : ''}

${BANNED_CONSTRUCTIONS_RULE}
${wxLine}`;

  try {
    const t0 = Date.now();
    const r = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: `Restyle Day ${dayNum} for: "${act}".` }] }],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: TRAVEL_DAY_SCHEMA,
        thinkingConfig: { thinkingBudget: 0 },
        maxOutputTokens: 2800,
      },
    });
    const parsed = JSON.parse(r.text);

    let newItem = parsed.new_item_needed === true && parsed.new_item && parsed.new_item.name
      ? { ...parsed.new_item, tier: TRAVEL_TIERS.includes(parsed.new_item.tier) ? parsed.new_item.tier : TRAVEL_TIERS[1], wardrobe_index: -1 }
      : null;
    const maxIdx = capIn.length - 1 + (newItem ? 1 : 0);
    const slots = (Array.isArray(parsed.slots) ? parsed.slots : [])
      .slice(0, 2)
      .map(s => {
        s.formula = (Array.isArray(s.formula) ? s.formula : [])
          .filter(f => f && TRAVEL_ROLES.includes(f.role) && Number.isInteger(f.item_index) && f.item_index >= 0 && f.item_index <= maxIdx)
          .slice(0, 6);
        return s;
      })
      .filter(s => s.formula.length);
    if (!slots.length) throw new Error('empty day restyle');
    // A suggested gap piece that no formula actually uses is dropped
    if (newItem && !slots.some(s => s.formula.some(f => f.item_index === capIn.length))) newItem = null;

    logAI({ feature: 'travel-day', stage: 'text', model: 'gemini-2.5-flash', ms: Date.now() - t0, day: dayNum, slots: slots.length, newItem: !!newItem });
    res.json({
      day_label: parsed.day_label || `Day ${dayNum}`,
      slots,
      new_item: newItem,
    });
  } catch (err) {
    logAI({ feature: 'travel-day', stage: 'text', success: false, reason: err.message });
    console.error('[travel-day] Gemini error:', err.message);
    res.status(500).json({ error: err.message || 'Day restyle failed' });
  }
});

/* ── travel edit: deferred outfit planning. When she took the packing
   edit first (editOnly) and gathered pieces over days, this call dresses
   the WHOLE trip from the capsule as it stands now — her packed ticks,
   swaps and added pieces intact. Re-mix only: no new items (the per-day
   restyle handles genuine gaps). ── */
const TRAVEL_OUTFITS_SCHEMA = {
  type: 'object',
  properties: { days: TRAVEL_SCHEMA.properties.days },
  required: ['days'],
};

app.post('/api/travel/outfits', rateLimit({ windowMs: 60_000, max: 6 }), async (req, res) => {
  const { destination, brief, dateFrom, dateTo, dayPlan, weather, name, styleDna, styleIcons, capsule, gender } = req.body;
  const g = normGender(gender);
  const capIn = (Array.isArray(capsule) ? capsule : []).filter(c => c && c.name).slice(0, 20);
  if (!capIn.length) return res.status(400).json({ error: 'Missing capsule.' });
  const dest = String(destination || '').trim().slice(0, 120) || 'the trip';
  const from = new Date(String(dateFrom || '') + 'T00:00:00Z');
  const to = new Date(String(dateTo || '') + 'T00:00:00Z');
  const validDates = !isNaN(from) && !isNaN(to) && to >= from;
  const tripDays = validDates ? Math.min(10, Math.round((to - from) / 86400000) + 1) : 7;
  const fmt = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const planDays = (Array.isArray(dayPlan) ? dayPlan : [])
    .slice(0, tripDays)
    .map(s => s === null ? null : String(s || '').trim().slice(0, 140));
  const restIdx = new Set(planDays.map((p, i) => p === null ? i : -1).filter(i => i >= 0));
  const dnaBlock = styleDnaPromptBlock(styleDna, capIn.filter(c => c.owned).length, styleIcons);
  const capList = capIn.map((c, i) =>
    `${i}: ${c.name}${c.category ? ' [' + c.category + ']' : ''}${c.brand ? ', ' + c.brand : ''}${c.owned ? ' (hers)' : ''}`
  ).join('\n');
  const wxLine = weather && weather.tempRange
    ? `MICRO-CLIMATE: ${weather.city || dest} — ${weather.tempRange}, mostly ${weather.condition || 'mixed conditions'}.`
    : '';
  const planDate = i => validDates ? fmt(new Date(from.getTime() + i * 86400000)) : '';
  const planList = Array.from({ length: tripDays }, (_, i) =>
    `Day ${i + 1}${planDate(i) ? ' (' + planDate(i) + ')' : ''}: ${planDays[i] === null
      ? 'DELIBERATELY LEFT FREE — she needs NO looks this day; return this day with "slots": []'
      : planDays[i] || '(no plan given — infer a plausible day from the brief and destination)'}`
  ).join('\n');

  const systemInstruction = `You are Robes' head stylist — elite, editorial, precise. ${name ? `The user's name is ${name}. ` : ''}${genderDirective(g)} The user packed a capsule for ${dest}${brief ? ` (trip brief: "${String(brief).slice(0, 300)}")` : ''} and is now planning the outfits, day by day. Never output a generic outfit — ban flat phrasing; every "how" line is hyper-specific (cut, fabric, styling move).

THE PACKED CAPSULE (referenced by "item_index" — build ONLY from these, never invent an item):
${capList}

THE ITINERARY — authoritative: dress each planned day for EXACTLY what she is doing; for a planned day "day_label" is "Day N · {2–4 word title of her plan}":
${planList}

RULES:
1. Exactly ${tripDays} entries in "days" — one per trip day, in order. Each dressed day gets a "Day" slot; add an "Evening" slot ONLY when that day's plan names an evening moment (a dinner, a night out, an event) — by default the evening is LEFT FREE. A day marked deliberately left free gets "slots": [].
2. Every formula entry is built ONLY from the capsule via "item_index", using the 4-step formula: "The Anchor" ×1, "The Canvas" ×1–2, "The Texture" ×1, "The Exclamation Point" ×1–2 (3 entries minimum for swim/undone moments). Each entry's "note" is that piece's ROW NOTE. ${ROW_NOTE_RULE}
3. THE 1:3 RULE: spread the lookbook so every capsule item appears in at least three different outfits where the trip length allows it — no single-outfit passengers.
4. Each slot: "title" (3–6 words naming the scene), "how" (ONE hyper-specific styling sentence), "transition_tip" (ONE concrete subtractive-styling or hardware-swap move that shifts the look into its next scene).${dnaBlock ? '\n\n' + dnaBlock : ''}

${BANNED_CONSTRUCTIONS_RULE}
${wxLine}`;

  try {
    const t0 = Date.now();
    const r = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: `Dress all ${tripDays} days of the trip from the packed capsule.` }] }],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: TRAVEL_OUTFITS_SCHEMA,
        thinkingConfig: { thinkingBudget: 0 },
        maxOutputTokens: 7200,
      },
    });
    const parsed = JSON.parse(r.text);
    const days = (Array.isArray(parsed.days) ? parsed.days : [])
      .filter(d => d && Array.isArray(d.slots))
      .slice(0, tripDays)
      .map(d => {
        d.slots = d.slots.slice(0, 2).map(s => {
          s.formula = (Array.isArray(s.formula) ? s.formula : [])
            .filter(f => f && TRAVEL_ROLES.includes(f.role) && Number.isInteger(f.item_index) && f.item_index >= 0 && f.item_index < capIn.length)
            .slice(0, 6);
          return s;
        }).filter(s => s.formula.length);
        return d;
      })
      .filter((d, i) => d.slots.length || restIdx.has(i));
    days.forEach((d, i) => {
      if (restIdx.has(i)) days[i] = { day_label: `Day ${i + 1} · Left free`, rest: true, slots: [] };
      else if (planDays[i]) d.user_activity = planDays[i];
    });
    if (!days.length || !days.some(d => (d.slots || []).length)) throw new Error('empty outfit plan');

    logAI({ feature: 'travel-outfits', stage: 'text', model: 'gemini-2.5-flash', ms: Date.now() - t0, days: days.length, looks: days.reduce((a, d) => a + (d.slots || []).length, 0), rest: restIdx.size });
    res.json({ days });
  } catch (err) {
    logAI({ feature: 'travel-outfits', stage: 'text', success: false, reason: err.message });
    console.error('[travel-outfits] Gemini error:', err.message);
    res.status(500).json({ error: err.message || 'Outfit planning failed' });
  }
});

/* ── look share ──────────────────────────────────────────────────── */
const BASE_URL = process.env.PUBLIC_URL || 'https://www.byrobes.com';

app.post('/api/look', (req, res) => {
  const { name, piece, photoUrl, ways, generatedImages, fallback, prompt, email } = req.body;
  if (!ways || !Array.isArray(ways) || ways.length === 0) {
    return res.status(400).json({ error: 'No look data' });
  }
  const id = randomBytes(5).toString('hex');
  lookStore.set(id, { name: name || '', piece: piece || '', photoUrl: photoUrl || null, ways, generatedImages: generatedImages || [], fallback: !!fallback, created: Date.now() });
  console.log(`Look saved: ${id} — ${piece || 'untitled'}`);
  res.json({ id });

  // async: upload generated images to Cloudinary, then persist to Airtable as structured JSON
  (async () => {
    const lookUrl = `${BASE_URL}/look/${id}`;
    const photoAttachments = [];
    if (photoUrl) photoAttachments.push({ url: photoUrl });

    const genUrls = await Promise.all(
      (generatedImages || []).map(src => {
        if (!src) return Promise.resolve(null);
        const m = src.match(/^data:([^;]+);base64,(.+)$/);
        return m ? cloudinaryUpload(m[2], m[1]) : Promise.resolve(null);
      })
    );
    genUrls.filter(Boolean).forEach(url => photoAttachments.push({ url }));

    // store full structured data so the look can be rebuilt after a server restart
    const lookData = JSON.stringify({ name: name || '', piece: piece || '', fallback: !!fallback, photoUrl: photoUrl || null, genImageUrls: genUrls, ways });

    await airtableCreate('Feedback', {
      'Email': email || '',
      'Prompt': prompt || '',
      'Piece Link': lookUrl,
      ...(photoAttachments.length ? { 'Photo': photoAttachments } : {}),
      'Looks Output': lookData,
      'Created At': new Date().toISOString().split('T')[0],
    });
    console.log(`Look persisted to Airtable: ${id}`);
  })().catch(err => console.warn('Look log error:', err.message));
});

app.get('/api/look/:id', async (req, res) => {
  const cached = lookStore.get(req.params.id);
  if (cached) return res.json(cached);

  // not in memory (server restarted) — try Airtable
  if (AT_TOKEN && AT_BASE) {
    try {
      const lookUrl = `${BASE_URL}/look/${req.params.id}`;
      const filter = encodeURIComponent(`{Piece Link} = "${lookUrl}"`);
      const atRes = await fetch(
        `https://api.airtable.com/v0/${AT_BASE}/${encodeURIComponent('Feedback')}?filterByFormula=${filter}&maxRecords=1`,
        { headers: { 'Authorization': `Bearer ${AT_TOKEN}` } }
      );
      if (atRes.ok) {
        const data = await atRes.json();
        if (data.records && data.records.length > 0) {
          const fields = data.records[0].fields;
          let lookData = {};
          try { lookData = JSON.parse(fields['Looks Output'] || '{}'); } catch { /* old text format */ }
          if (lookData.ways && Array.isArray(lookData.ways)) {
            const look = {
              name: lookData.name || '',
              piece: lookData.piece || '',
              photoUrl: lookData.photoUrl || null,
              ways: lookData.ways,
              generatedImages: lookData.genImageUrls || [],
              fallback: lookData.fallback || false,
              created: Date.now(),
            };
            lookStore.set(req.params.id, look); // re-cache
            console.log(`Look restored from Airtable: ${req.params.id}`);
            return res.json(look);
          }
        }
      }
    } catch (err) { console.warn('Airtable look lookup error:', err.message); }
  }

  res.status(404).json({ error: 'Look not found or expired' });
});

app.get('/look/:id', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'look.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'dashboard.html'));
});

// Internal admin record panel — the page itself gates on session +
// profiles.is_admin (non-admins bounce to the marketing lander).
app.get('/admin', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'admin.html'));
});

app.get('/wardrobe', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'dashboard.html'));
});

// Wishlist nests under the wardrobe panel — same shell, client opens the view
app.get('/wishlist', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'dashboard.html'));
});

app.get('/lookbook', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'dashboard.html'));
});

app.get('/moodboards', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'dashboard.html'));
});

app.get('/moodboard/:slug', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'dashboard.html'));
});

/* ── Public share pages — moodboards + lookbook (/board/:shareId) ──
   Reads lookbook_items through the anon key: RLS only exposes rows the
   owner explicitly flipped to is_public = true. The page is a single
   template with server-injected OG/Twitter meta (crawlers don't run JS)
   and the sanitized payload embedded inline — one Supabase round trip,
   no app shell. */
const SHARE_SUPA_URL = process.env.SUPABASE_URL || 'https://ayowpaknssulsqqvwpqx.supabase.co';
const SHARE_SUPA_ANON = process.env.SUPABASE_ANON_KEY || 'sb_publishable_D_iIPtp_R6kjN_711jfyTg_sFmRdpwJ';

function htmlEsc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const isHttpUrl = (u) => typeof u === 'string' && /^https:\/\//.test(u);

// Whitelist-only public payload: no user ids, emails or account data ever
// leave this function — just the content that is explicitly in the board.
function publicSharePayload(row) {
  const d = row.data && typeof row.data === 'object' ? row.data : {};
  const type = row.type || 'key-piece';
  const images = [];
  const addImg = (u) => { if (isHttpUrl(u) && !images.includes(u) && images.length < 10) images.push(u); };
  const pieces = [];
  const addPiece = (name, brand, price) => {
    if (typeof name === 'string' && name.trim() && pieces.length < 24) {
      pieces.push({ name: name.trim(), brand: typeof brand === 'string' ? brand : '', price: typeof price === 'string' ? price : '' });
    }
  };
  let tags = [];
  let editorial = '';

  addImg(row.img);
  if (type === 'moodboard') {
    addImg(d.hero_image);
    (Array.isArray(d.grid_images) ? d.grid_images : []).forEach(g => addImg(g && g.url));
    (Array.isArray(d.the_look) ? d.the_look : []).forEach(i => i && addPiece(i.name, i.brand_name || i.retailer_hint, i.price_point));
    if (Array.isArray(d.aesthetic_tags)) tags = d.aesthetic_tags.filter(t => typeof t === 'string').slice(0, 6);
    if (typeof d.editorial_direction === 'string') editorial = d.editorial_direction;
  } else if (type === 'daily-look') {
    const dl = d.dlData || {};
    (Array.isArray(dl.steps) ? dl.steps : []).forEach(s => (Array.isArray(s && s.items) ? s.items : []).forEach(i => {
      if (!i) return;
      addPiece(i.name, i.brand, i.price_point);
      addImg((i.wardrobe_match && i.wardrobe_match.image_url) || (Number.isInteger(i.image_index) ? (dl.generatedImages || [])[i.image_index] : null) || i.image_url || i.img);
    }));
    if (typeof dl.stylist_summary === 'string') editorial = dl.stylist_summary;
  } else if (type === 'travel-edit') {
    const tv = d.tvData || {};
    (Array.isArray(tv.capsule) ? tv.capsule : []).forEach(i => {
      if (!i) return;
      addPiece(i.name, i.brand, i.price_point);
      addImg((i.wardrobe_match && i.wardrobe_match.image_url) || (Number.isInteger(i.image_index) ? (tv.generatedImages || [])[i.image_index] : null) || i.image_url || i.img);
    });
    if (typeof tv.stylist_summary === 'string') editorial = tv.stylist_summary;
  } else if (type === 'weekly-plan') {
    const wk = d.wkData || {};
    (Array.isArray(wk.days) ? wk.days : []).forEach(day => (Array.isArray(day && day.items) ? day.items : []).forEach(i => {
      if (!i) return;
      addPiece(i.name, i.brand, i.price_point);
      addImg((i.wardrobe_match && i.wardrobe_match.image_url) || (Number.isInteger(i.image_index) ? (wk.generatedImages || [])[i.image_index] : null));
    }));
    if (typeof wk.stylist_summary === 'string') editorial = wk.stylist_summary;
  } else {
    const kp = d.kpData || {};
    (Array.isArray(kp.generatedImages) ? kp.generatedImages : []).forEach(addImg);
    addImg(kp.photoUrl);
    (Array.isArray(kp.ways) ? kp.ways : []).forEach(w => w && addPiece(w.title, w.eyebrow, ''));
    if (kp.ways && kp.ways[0] && typeof kp.ways[0].outfit === 'string') editorial = kp.ways[0].outfit;
  }

  return {
    type,
    title: row.title || 'A look by Robes',
    subtitle: row.subtitle || '',
    images,
    pieces,
    tags,
    editorial: editorial.slice(0, 400),
  };
}

let _boardTpl = null;
app.get('/board/:shareId', rateLimit({ windowMs: 60_000, max: 40 }), async (req, res) => {
  const shareId = String(req.params.shareId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48);
  if (!_boardTpl) {
    try { _boardTpl = readFileSync(join(__dirname, 'public', 'board.html'), 'utf8'); }
    catch (e) { return res.status(500).send('Share pages unavailable'); }
  }
  const send = (status, payload, og) => {
    const json = JSON.stringify(payload).replace(/</g, '\\u003c');
    res.status(status).type('html').send(_boardTpl.replace('<!--__OG__-->', og).replace('__BOARD_JSON__', json));
  };
  const notFound = () => send(404, { notFound: true },
    `<title>Robes — this look isn’t shared any more</title>\n<meta name="robots" content="noindex">\n<meta property="og:title" content="Robes — styled for you">`);

  if (!shareId) return notFound();
  try {
    const r = await fetch(
      `${SHARE_SUPA_URL}/rest/v1/lookbook_items?share_id=eq.${encodeURIComponent(shareId)}&is_public=eq.true&limit=1&select=type,title,subtitle,img,data,created_at`,
      { headers: { apikey: SHARE_SUPA_ANON, Authorization: `Bearer ${SHARE_SUPA_ANON}` } }
    );
    const rows = r.ok ? await r.json() : [];
    const row = Array.isArray(rows) && rows.length ? rows[0] : null;
    if (!row) return notFound();
    const payload = publicSharePayload(row);
    const pageUrl = `${process.env.PUBLIC_URL || 'https://www.byrobes.com'}/board/${shareId}`;
    const ogImage = payload.images[0] || '';
    const desc = payload.editorial || payload.subtitle || 'One prompt. Dressed for anything.';
    const og = [
      `<title>${htmlEsc(payload.title)} — styled by Robes</title>`,
      `<meta name="description" content="${htmlEsc(desc)}">`,
      `<link rel="canonical" href="${htmlEsc(pageUrl)}">`,
      `<meta property="og:type" content="website">`,
      `<meta property="og:site_name" content="Robes">`,
      `<meta property="og:title" content="${htmlEsc(payload.title)} — styled by Robes">`,
      `<meta property="og:description" content="${htmlEsc(desc)}">`,
      ogImage ? `<meta property="og:image" content="${htmlEsc(ogImage)}">` : '',
      `<meta property="og:url" content="${htmlEsc(pageUrl)}">`,
      `<meta name="twitter:card" content="${ogImage ? 'summary_large_image' : 'summary'}">`,
      `<meta name="twitter:title" content="${htmlEsc(payload.title)} — styled by Robes">`,
      `<meta name="twitter:description" content="${htmlEsc(desc)}">`,
      ogImage ? `<meta name="twitter:image" content="${htmlEsc(ogImage)}">` : '',
    ].filter(Boolean).join('\n');
    send(200, payload, og);
  } catch (e) {
    console.warn('[board] share fetch failed:', e.message);
    notFound();
  }
});

app.get('/stylenotes', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'stylenotes.html'));
});

app.get('/onboarding', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'onboarding.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'signup.html'));
});

app.get('/reset', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'reset.html'));
});

app.get('/terms', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'terms.html'));
});

app.get('/privacy', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'privacy.html'));
});

const ANALYSE_SCHEMA = {
  type: 'object',
  properties: {
    no_item_detected: { type: 'boolean' },
    label:                { type: 'string' },
    category:             { type: 'string', enum: ['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Bags', 'Accessories', 'Swimwear', 'Other'] },
    color:                { type: 'string' },
    primary_color_hex:    { type: 'string' },
    editorial_color_name: { type: 'string' },
    brand:                { type: 'string' },
    silhouette_fit:       { type: 'array', items: { type: 'string' } },
    ai_generated_notes:   { type: 'string' },
  },
  required: ['no_item_detected', 'label', 'category', 'color', 'primary_color_hex', 'editorial_color_name', 'brand', 'silhouette_fit', 'ai_generated_notes'],
};

app.post('/api/wardrobe/analyse', async (req, res) => {
  const { data, mimeType } = req.body;
  if (!data || !mimeType) return res.status(400).json({ error: 'Missing data or mimeType' });
  const t0 = Date.now();
  try {
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType, data } },
          { text: `You are a fashion intelligence engine for a luxury wardrobe app. Analyze this photo.

IMPORTANT: If no clothing item, garment, or accessory is clearly visible (e.g. the photo shows a face, a room, a screenshot, or unidentifiable content), set "no_item_detected": true and return all other fields as empty strings or empty arrays.

If a clothing item IS present, set "no_item_detected": false and fill every field:
"label": concise item name (e.g. "Camel wool coat", "Grey straight-leg jeans")
"category": one of — Tops, Bottoms, Dresses, Outerwear, Shoes, Bags, Accessories, Swimwear, Other
"color": pick ONE from this list only —
  Foundations: White, Cream, Navy, Charcoal, Black, Espresso
  Dimension Builders: Camel, Taupe, Olive, Aubergine, Forest, Bordeaux, Blush
  Exclamation Points: Ochre, Magenta, Cobalt, Emerald, Vermillion, Acid
  Multi-pattern: Print
"primary_color_hex": hex code of the dominant color (e.g. "#D2B48C")
"editorial_color_name": evocative color name (e.g. "Warm Caramel", "Washed Slate")
"brand": brand if visible, else ""
"silhouette_fit": array of 2-4 short descriptors (e.g. ["Blazer", "Single-breasted", "Relaxed"])
"ai_generated_notes": one editorial sentence under 15 words` }
        ]
      }],
      config: { responseMimeType: 'application/json', responseSchema: ANALYSE_SCHEMA, maxOutputTokens: 600, temperature: 0, thinkingConfig: { thinkingBudget: 0 } },
    });

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const parsed = JSON.parse(text);
    logAI({ feature: 'wardrobe_analyse', ms: Date.now() - t0, no_item_detected: parsed.no_item_detected, success: true });

    if (parsed.no_item_detected) {
      return res.json({ noItemDetected: true, label: '', category: 'Other', color: '', brand: '', notes: '', item_dna: { display: {}, structural_dna: { silhouette_fit: [] }, llm_styling_context: {}, ai_generated_notes: '' } });
    }

    const item_dna = {
      display: {
        title: parsed.label || '',
        editorial_color_name: parsed.editorial_color_name || '',
        primary_color_hex: parsed.primary_color_hex || '',
        brand_raw: parsed.brand || '',
      },
      structural_dna: {
        silhouette_fit: Array.isArray(parsed.silhouette_fit) ? parsed.silhouette_fit : [],
      },
      llm_styling_context: {},
      ai_generated_notes: parsed.ai_generated_notes || '',
    };

    res.json({
      label: parsed.label || '',
      category: parsed.category || 'Other',
      color: parsed.color || '',
      brand: parsed.brand || '',
      notes: parsed.ai_generated_notes || '',
      item_dna,
    });
  } catch (err) {
    logAI({ feature: 'wardrobe_analyse', ms: Date.now() - t0, success: false, reason: err.message });
    console.error('[analyse] Gemini error:', err.message);
    res.json({ analysisFailed: true, label: '', category: 'Other', color: '', brand: '', notes: '', item_dna: { display: {}, structural_dna: { silhouette_fit: [] }, llm_styling_context: {}, ai_generated_notes: '' } });
  }
});

const SEASON_ENUM = ['Light Spring', 'Warm Spring', 'Clear Spring', 'Light Summer', 'True Summer', 'Soft Summer', 'Soft Autumn', 'True Autumn', 'Dark Autumn', 'Clear Winter', 'True Winter', 'Dark Winter'];
const BODY_ENUM = ['Hourglass', 'Pear', 'Rectangle', 'Inverted Triangle', 'Apple'];

// Observation fields come FIRST (propertyOrdering) so the model commits to
// evidence before classifying — the JSON doubles as its chain of reasoning.
const COLOUR_EXTRACT_SCHEMA = {
  type: 'object',
  properties: {
    no_face_detected: { type: 'boolean' },
    lighting_assessment: { type: 'string' },
    hair_observation: { type: 'string' },
    skin_observation: { type: 'string' },
    eye_observation:  { type: 'string' },
    undertone_reasoning: { type: 'string' },
    season_reasoning: { type: 'string' },
    undertone: { type: 'string', enum: ['Warm', 'Cool', 'Neutral-Warm', 'Neutral-Cool'] },
    contrast:  { type: 'string', enum: ['Low', 'Medium', 'High', 'Extremely High'] },
    chroma:    { type: 'string', enum: ['Low', 'Medium', 'High'] },
    lightness: { type: 'string', enum: ['Low', 'Medium', 'High'] },
    season:    { type: 'string', enum: SEASON_ENUM },
    skin_tone_hex:  { type: 'string' },
    hair_color_hex: { type: 'string' },
    eye_color_hex:  { type: 'string' },
    low_confidence: { type: 'boolean' },
  },
  propertyOrdering: ['no_face_detected', 'lighting_assessment', 'hair_observation', 'skin_observation', 'eye_observation', 'undertone_reasoning', 'season_reasoning', 'undertone', 'contrast', 'chroma', 'lightness', 'season', 'skin_tone_hex', 'hair_color_hex', 'eye_color_hex', 'low_confidence'],
  required: ['no_face_detected', 'lighting_assessment', 'hair_observation', 'skin_observation', 'eye_observation', 'undertone_reasoning', 'season_reasoning', 'undertone', 'contrast', 'chroma', 'lightness', 'season', 'skin_tone_hex', 'hair_color_hex', 'eye_color_hex', 'low_confidence'],
};

const SIL_EXTRACT_SCHEMA = {
  type: 'object',
  properties: {
    no_person_detected: { type: 'boolean' },
    pose_assessment: { type: 'string' },
    shoulder_observation: { type: 'string' },
    waist_observation: { type: 'string' },
    hip_observation: { type: 'string' },
    shape_reasoning: { type: 'string' },
    shoulder_waist: { type: 'number' },
    hip_waist:      { type: 'number' },
    shoulder_hip:   { type: 'number' },
    body_shape:     { type: 'string', enum: BODY_ENUM },
    loose_clothing: { type: 'boolean' },
  },
  propertyOrdering: ['no_person_detected', 'pose_assessment', 'shoulder_observation', 'waist_observation', 'hip_observation', 'shape_reasoning', 'shoulder_waist', 'hip_waist', 'shoulder_hip', 'body_shape', 'loose_clothing'],
  required: ['no_person_detected', 'pose_assessment', 'shoulder_observation', 'waist_observation', 'hip_observation', 'shape_reasoning', 'shoulder_waist', 'hip_waist', 'shoulder_hip', 'body_shape', 'loose_clothing'],
};

const COLOUR_EXTRACT_PROMPT = `You are a master personal colour analyst trained in 12-season analysis. Analyse the person in this portrait the way you would in a live draping consultation.

IMPORTANT: If no human face is clearly visible (a garment, a room, a screenshot), set "no_face_detected": true and return every other field as empty string / false / any enum value.

ANALYSIS PROTOCOL — work through it in this exact order, writing your observations into the corresponding fields BEFORE committing to any classification:

1. "lighting_assessment": judge the photo's colour cast against the sclera (whites of the eyes) and any visible teeth — they are naturally near-neutral. Note any warm/cool cast, filters, mixed light or shadows, and mentally subtract that cast from every judgement below.
2. "hair_observation": describe the NATURAL hair colour and — critically — its temperature. Golden, honey, strawberry, caramel or copper tones → warm evidence. Ash, mousy, cool-beige, blue-black or silvery tones → cool evidence. Hair temperature is one of the strongest undertone signals; visible roots are the most natural reference.
3. "skin_observation": describe the cast-corrected skin — golden/peachy/olive vs rosy/pink/bluish; how it flushes; freckles (warm evidence) vs an even porcelain quality. Ignore clothing, background and makeup entirely.
4. "eye_observation": describe iris colour AND pattern. Warm eyes: golden brown, amber, hazel with gold flecks, warm green. Cool eyes: clear blue, grey-blue, grey, cool dark brown.
5. "undertone_reasoning": weigh ALL the evidence above (never a single cue) and argue for the undertone the way an analyst would.
6. "season_reasoning": combine undertone with the three dimensions below and argue for ONE of the 12 seasons.

THE THREE DIMENSIONS:
"contrast": value gap between skin, hair and eyes. Very dark hair on fair skin → "High"/"Extremely High". Blended values (e.g. blonde hair, light-to-medium skin) → "Low". Otherwise "Medium".
"chroma": clarity of the colouring after cast correction. Vivid, jewel-like, saturated features → "High". Soft, dusty, muted, greyed features → "Low". Otherwise "Medium".
"lightness": overall depth. Fair skin + light hair → "High". Deep skin or very dark hair → "Low". Otherwise "Medium".

THE 12 SEASONS — pick the single best fit:
- Light Spring: warm, VERY light, luminous — pale clear golden blonde, porcelain-fair warm skin, fresh and bright with zero mutedness.
- Warm Spring: distinctly golden, mid-toned, clear — golden blonde/copper hair, warm glow.
- Clear Spring: warm-leaning, HIGH chroma, high contrast — bright, vivid features.
- Light Summer: cool, very light, delicate — ash blonde, cool fair skin, low contrast.
- True Summer: fully cool, mid-toned, soft — ash hair, rosy skin, grey/blue eyes, no warmth anywhere.
- Soft Summer: cool-neutral and MUTED — greyed, misty colouring, low chroma.
- Soft Autumn: warm-neutral and MUTED — dark blonde/soft brown hair whose gold is blended with beige or ash, low-medium contrast, dusty warmth. The most common season for warm-leaning blondes whose colouring is soft rather than vivid.
- True Autumn: fully warm, rich, earthy — red/auburn/golden brown hair, golden skin.
- Dark Autumn: warm and DEEP — dark brown hair with warmth, deep eyes, high contrast.
- Clear Winter: cool, HIGH chroma, very high contrast — dark hair, bright eyes, vivid.
- True Winter: fully cool, saturated, stark — blue-black/dark ash hair, high contrast.
- Dark Winter: cool and DEEP — near-black hair, deep cool eyes, extremely high contrast.

DISCIPLINE RULES:
- A blonde with ANY golden or honey quality to her hair is warm-family (a Spring or Autumn), not a Summer — never read sun-lightened or highlighted golden blonde as ash.
- WITHIN the warm family, chroma is the axis that separates Spring from Autumn: genuinely clear, luminous, fresh colouring → a Spring; ANY dustiness, ashiness or mutedness blended with the warmth → an Autumn. Mutedness outranks lightness: a muted warm blonde is Soft Autumn, never Light Spring, no matter how light her hair.
- Muted + warm → Soft Autumn, not a Summer. Muted + cool → Soft Summer.
- "lightness": "High" requires very light blonde hair AND porcelain-fair skin together; mid-depth dark blonde is "Medium".
- Transient facial redness, flush, sunburn or rosacea is NOT evidence of coolness, brightness or high chroma — look past it to the underlying tone and judge chroma from hair and eyes.
- High contrast is impossible for blended blonde colouring — reserve it for genuinely dark hair on light skin.
- The final "undertone", "contrast", "chroma", "lightness" and "season" fields MUST be consistent with each other and with your written reasoning.

Also sample:
"skin_tone_hex": average cast-corrected skin hex from an evenly lit cheek (e.g. "#E0D6C4").
"hair_color_hex": dominant hair hex (e.g. "#8A7458").
"eye_color_hex": dominant iris hex (e.g. "#5A5836").
"low_confidence": true if a strong colour cast, heavy filter, mixed lighting or shadow makes the analysis unreliable even after correction.`;

const SIL_EXTRACT_PROMPT = `You are a master stylist assessing body architecture from a full-length photograph, the way you would in a live fitting.

IMPORTANT: If no full-length human figure is clearly visible (head-and-shoulders only, a garment, a room), set "no_person_detected": true, return 1 for every ratio and any enum value for "body_shape".

ANALYSIS PROTOCOL — write your observations into the corresponding fields BEFORE committing to any numbers or classification:

1. "pose_assessment": describe the pose and its distortions. CRITICAL: in mirror selfies one arm is raised to hold the phone — a raised arm lifts and visually widens that shoulder and can make balanced shoulders read broad. Judge shoulder width from the BONE STRUCTURE of the resting shoulder line, never from a raised arm, a hand on a hip, or a twisted torso. Note camera angle (a low camera widens hips, a high camera widens shoulders) and correct for it.
2. "shoulder_observation": the corrected skeletal shoulder width and slope.
3. "waist_observation": whether the waist visibly nips in relative to ribcage and hips ("defined"), curves gently ("soft"), or runs straight ("undefined"). Fitted clothing (leggings, tucked or close-fitting tops) makes this readable; note if loose garments hide it.
4. "hip_observation": the widest hip/thigh line relative to the corrected shoulder line.
5. "shape_reasoning": weigh the corrected observations and argue for ONE archetype.

THE 5 ARCHETYPES:
- Hourglass: shoulders and hips visually balanced, waist clearly narrower and defined. A defined waist with balanced shoulders and hips is Hourglass even when the shoulders look athletic.
- Pear: hips clearly wider than shoulders, defined waist, fuller hips/thighs.
- Rectangle: shoulders, waist and hips on one line — minimal waist definition, lean and straight.
- Inverted Triangle: shoulders GENUINELY and skeletally broader than hips (swimmer's build), narrow lean hips, little waist emphasis. Do NOT choose this just because an arm is raised or the person is lean — it requires an unmistakably broader corrected shoulder line AND a waist that does not nip in.
- Apple: volume carried at the midsection, waist wider than or equal to hips, lean legs.

Then estimate the CORRECTED ratios from visible landmarks (outer shoulder margins at rest, narrowest natural waist plane, widest hip boundary):
"shoulder_waist": shoulder width ÷ waist width (e.g. 1.35)
"hip_waist": hip width ÷ waist width (e.g. 1.32)
"shoulder_hip": shoulder width ÷ hip width (e.g. 1.02)
"body_shape": the archetype your reasoning concluded — it MUST be consistent with your written observations and ratios.
"loose_clothing": true if oversized or loose garments hide the natural waistline, making the read unreliable.`;

app.post('/api/stylenotes/analyse', async (req, res) => {
  const { kind, data, mimeType } = req.body;
  if (!data || !mimeType || !['colour', 'silhouette'].includes(kind)) {
    return res.status(400).json({ error: 'Missing kind, data or mimeType' });
  }
  const colour = kind === 'colour';
  const t0 = Date.now();
  try {
    // Gemini writes stylist-grade observations, a direct archetype call AND the
    // measurable primitives; style_dna.js reconciles them (holistic call wins,
    // the primitive mapping is the deterministic fallback + cross-check) and
    // owns every palette/design rule the user sees (PRD: Style DNA).
    // Pro leads (this is a once-per-user judgement call worth the latency and
    // it cannot disable thinking, so its budget is bounded instead); flash is
    // the fallback, last attempt drops the schema and trusts JSON mode.
    // Onboarding sends fast:true — there, first-session momentum beats the
    // marginal judgement gain, so flash answers first and pro is the rescue.
    const ATTEMPTS = req.body.fast ? [
      { model: 'gemini-2.5-flash', schema: true },
      { model: 'gemini-2.5-pro', schema: true },
      { model: 'gemini-2.5-flash', schema: false },
    ] : [
      { model: 'gemini-2.5-pro', schema: true },
      { model: 'gemini-2.5-flash', schema: true },
      { model: 'gemini-2.5-flash', schema: false },
    ];
    let parsed, lastErr, used, finishReason;
    for (const a of ATTEMPTS) {
      const config = {
        responseMimeType: 'application/json',
        maxOutputTokens: a.model === 'gemini-2.5-pro' ? 4096 : 2048,
        temperature: 0,
        thinkingConfig: { thinkingBudget: a.model === 'gemini-2.5-pro' ? 1024 : 0 },
      };
      if (a.schema) config.responseSchema = colour ? COLOUR_EXTRACT_SCHEMA : SIL_EXTRACT_SCHEMA;
      try {
        // A hung model call must fall through to the next attempt, never hang
        // the request — the client is sitting on "Reading your colouring…".
        const attemptMs = a.model === 'gemini-2.5-pro' ? 45000 : 25000;
        const result = await Promise.race([
          ai.models.generateContent({
            model: a.model,
            contents: [{
              role: 'user',
              parts: [
                { inlineData: { mimeType, data } },
                { text: colour ? COLOUR_EXTRACT_PROMPT : SIL_EXTRACT_PROMPT },
              ],
            }],
            config,
          }),
          new Promise((_, rej) => setTimeout(() => rej(new Error('analyse timeout (' + a.model + ')')), attemptMs)),
        ]);
        finishReason = result.candidates?.[0]?.finishReason;
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        try {
          parsed = JSON.parse(text);
        } catch (parseErr) {
          console.error('[stylenotes/analyse] JSON parse failed —', { kind, model: a.model, finishReason, textLength: text.length, tail: text.slice(-120) });
          throw new Error('truncated_response:' + finishReason);
        }
        used = a;
        break;
      } catch (e) {
        lastErr = e;
        console.error(`[stylenotes/analyse] ${a.model} (${a.schema ? 'with' : 'without'} schema) failed:`, e.message);
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    if (!parsed) throw lastErr;
    const rejected = colour ? parsed.no_face_detected : parsed.no_person_detected;
    if (rejected) {
      logAI({ feature: 'stylenotes_analyse', kind, model: used.model, ms: Date.now() - t0, finishReason, rejected: true, success: true });
      return res.json(colour ? { no_face_detected: true } : { no_person_detected: true });
    }
    const { render, dna } = colour ? buildColorHarmony(parsed) : buildSilhouette(parsed);
    logAI({ feature: 'stylenotes_analyse', kind, model: used.model, ms: Date.now() - t0, finishReason, rejected: false, success: true, archetype: colour ? dna.archetype_name : dna.body_type });
    res.json({ ...render, style_dna: dna });
  } catch (err) {
    logAI({ feature: 'stylenotes_analyse', kind, ms: Date.now() - t0, success: false, reason: err.message });
    console.error('[stylenotes/analyse] Gemini error:', err.message);
    res.status(502).json({ error: 'analysis_failed', reason: String(err.message || '').slice(0, 200) });
  }
});

/* ── style notes try-on imagery ──────────────────────────────────── */
// Fills the Style Notes placeholder frames with real imagery of the user:
// colour → the proof pair (best vs avoid drape), silhouette → the four dress
// silhouettes. Same background-job + Cloudinary + polling infra as /api/style;
// only hosted URLs are written to the job so results can persist in profiles.
app.post('/api/stylenotes/tryon', rateLimit({ windowMs: 60_000, max: 6 }), async (req, res) => {
  const { kind, data, mimeType, photoUrl, analysis } = req.body;
  if (!['colour', 'silhouette'].includes(kind) || !analysis || typeof analysis !== 'object') {
    return res.status(400).json({ error: 'Missing kind or analysis' });
  }

  let photo = data && mimeType ? { data, mimeType } : null;
  if (!photo && typeof photoUrl === 'string' && /^https:\/\/res\.cloudinary\.com\//.test(photoUrl)) {
    try {
      const r = await fetch(photoUrl);
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer());
        photo = { data: buf.toString('base64'), mimeType: r.headers.get('content-type') || 'image/jpeg' };
      }
    } catch (err) {
      console.error('[stylenotes/tryon] photo fetch failed:', err.message);
    }
  }
  if (!photo) return res.status(400).json({ error: 'Missing photo' });

  const IDENTITY = 'Edit the provided photograph. Keep the SAME person — identical face, hair and skin; a faithful likeness. Photorealistic editorial photography, soft even daylight, clean warm-grey studio backdrop, no text overlays, no collage, one single image.';
  let prompts;
  if (kind === 'colour') {
    const best = (analysis.best_colours || [])[0];
    const avoid = (analysis.avoid_colours || [])[0];
    if (!best || !avoid) return res.status(400).json({ error: 'Missing colours' });
    prompts = [best, avoid].map(c =>
      `${IDENTITY} Chest-up portrait, facing the camera with a calm expression. Change only the clothing: an elegant simple crew-neck knit top in ${c.name} (${c.hex}). The top must fill the frame below the face so its colour reads clearly against the skin.`);
  } else {
    const dresses = (analysis.dress_silhouettes || []).slice(0, 4);
    if (!dresses.length) return res.status(400).json({ error: 'Missing dress silhouettes' });
    const tone = typeof analysis.dress_colour === 'string' && analysis.dress_colour ? analysis.dress_colour : 'a deep elegant neutral tone';
    prompts = dresses.map(d =>
      `${IDENTITY} Full-length editorial photograph, head to toe, standing naturally. Change only the clothing: a ${String(d.name || '').toLowerCase()} — ${String(d.note || '').toLowerCase()} — in ${tone}, styled with simple elegant shoes. The dress silhouette must read clearly.`);
  }

  const jobId = randomBytes(6).toString('hex');
  imageJobs.set(jobId, { images: prompts.map(() => null), done: false, created: Date.now() });
  res.json({ jobId, count: prompts.length });

  const t0 = Date.now();
  (async () => {
    for (let i = 0; i < prompts.length; i++) {
      if (i > 0) await new Promise(r => setTimeout(r, 3000)); // stagger under Gemini's rate limit
      try {
        const r = await Promise.race([
          ai.models.generateContent({
            model: 'gemini-3.1-flash-image',
            contents: [{ role: 'user', parts: [
              { inlineData: { mimeType: photo.mimeType, data: photo.data } },
              { text: prompts[i] },
            ] }],
            config: { responseModalities: ['TEXT', 'IMAGE'] },
          }),
          new Promise(resolve => setTimeout(() => resolve(null), 50000)),
        ]);
        const part = r?.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (!part?.inlineData) {
          logAI({ feature: 'stylenotes_tryon', kind, index: i, success: false, reason: r ? 'no_inline_data' : 'timeout_50s' });
          continue;
        }
        const url = await cloudinaryUpload(part.inlineData.data, part.inlineData.mimeType);
        if (!url) {
          logAI({ feature: 'stylenotes_tryon', kind, index: i, success: false, reason: 'cloudinary_failed' });
          continue;
        }
        logAI({ feature: 'stylenotes_tryon', kind, index: i, success: true, ms: Date.now() - t0 });
        const job = imageJobs.get(jobId);
        if (job) job.images[i] = url;
      } catch (err) {
        logAI({ feature: 'stylenotes_tryon', kind, index: i, success: false, reason: err.message });
      }
    }
    const job = imageJobs.get(jobId);
    if (job) job.done = true;
    logAI({ feature: 'stylenotes_tryon', kind, stage: 'complete', totalMs: Date.now() - t0 });
  })();
});

/* ── moodboard ───────────────────────────────────────────────────── */
app.post('/api/moodboard', rateLimit({ windowMs: 60_000, max: 10 }), async (req, res) => {
  const { prompt, wardrobeItems = [], styleDna = null, styleIcons = [], gender } = req.body;
  const g = normGender(gender);
  if (!prompt?.trim()) return res.status(400).json({ error: 'prompt required' });

  const wardrobeCtx = wardrobeItems.length
    ? `The user's wardrobe contains these pieces: ${wardrobeItems.map(i => `${i.label} (${i.category}${i.color ? ', ' + i.color : ''})`).join('; ')}.`
    : 'The user has not yet digitised their wardrobe.';

  const systemPrompt = `You are Robes, an elite personal stylist AI. ${genderDirective(g)} The user has given you a specific styling brief — your entire response must be tailored to THAT brief. Return ONLY valid JSON with no markdown fences.`;

  const userPrompt = `USER'S STYLING BRIEF: "${prompt}"

Everything you generate must be specific to the brief above — destination, climate, occasion, and aesthetic must all reflect it directly.

${wardrobeCtx}
${styleDnaPromptBlock(styleDna, wardrobeItems.length, styleIcons)}

Return this JSON shape (all fields must reflect the user's brief, not a generic example):
{
  "title": "Short poetic moodboard title (max 6 words, specific to the brief)",
  "location_context": "Location from the brief · Month | estimated temp range | one-line styling directive",
  "aesthetic_tags": ["TAG1","TAG2","TAG3","TAG4"],
  "editorial_direction": "2 sentences of hyper-specific editorial direction for THIS brief — reference relevant fashion house DNA or style muse.",
  "the_look": [
    {
      "name": "Item name",
      "category": "One of: Tops, Bottoms, Dresses, Outerwear, Shoes, Bags, Accessories",
      "description": "Hyper-specific: cut, fabric, colour — suited to this brief",
      "styling_note": "One sentence on how to wear it in this specific context",
      "retailer_hint": "Best contemporary/luxury retailer for this piece (e.g. 'Net-a-Porter', 'ASOS', 'Zara', 'Matches', 'MatchesFashion', 'Mytheresa')",
      "price_point": "Realistic price in EUR with € symbol (e.g. '€89', '€245', '€1,200')"
    }
  ],
  "image_prompts": {
    "hero_looks": [
      "Editorial campaign shot 1 — full outfit formula on model in a setting specific to this brief, with garments, environment, and lighting described in precise detail. Portrait orientation. No text overlays.",
      "Editorial campaign shot 2 — second angle or styling variant specific to this brief. Different environment or lighting mood from shot 1. Portrait orientation. No text overlays.",
      "Editorial campaign shot 3 — third outfit formula or close campaign frame specific to this brief. Portrait orientation. No text overlays."
    ],
    "flat_lays": [
      "Studio flat-lay — key garments from this look arranged artfully on a surface, highlighting fabric drape and construction detail specific to this brief. Top-down. No text.",
      "Accessory or texture flat-lay — specific bag, shoes, or luxury accessory from this look in a studio setting. Surface texture and lighting mood specific to this brief. No text."
    ],
    "atmosphere": [
      "Macro detail crop — specific hardware buckle, stitching, fabric weave, or luxury accessory texture from this look. Square crop. Extreme detail. No text.",
      "Atmosphere scene — destination or mood-setting location texture specific to this brief (e.g. a terracotta wall, sun-bleached cobblestone, sea light on linen). Cinematic crop. No text."
    ]
  }
}

Rules:
- the_look: exactly 8 items
- hero_looks image prompts: the model depicted must be a ${wearerNoun(g)}
- aesthetic_tags: ALL CAPS, 3–5 tags, relevant to THIS brief
- Never use generic descriptions — name cuts, fabrics, colours precisely
- Do NOT default to a London or Wimbledon aesthetic unless the brief says so`;

  const t0 = Date.now();

  let moodboardData;
  try {
    const MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro'];
    const geminiCall = (model) => ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      // thinkingBudget:0 is mandatory here — gemini-2.5-flash counts thinking
      // tokens inside maxOutputTokens, so without it the large the_look JSON
      // truncates mid-object (JSON.parse throws / body arrives cut off) and the
      // call is slow enough to fall through to the pro model and blow the
      // gateway timeout. Every other JSON endpoint sets this; this one didn't.
      config: { systemInstruction: systemPrompt, maxOutputTokens: 5000, thinkingConfig: { thinkingBudget: 0 } },
    });
    let textResult;
    let lastErr;
    for (const model of MODELS) {
      for (let attempt = 0; attempt < 1; attempt++) {
        try {
          const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('text gen timeout')), 30000));
          textResult = await Promise.race([geminiCall(model), timeout]);
          const finishReason = textResult.candidates?.[0]?.finishReason;
          logAI({ feature: 'moodboard', stage: 'text', model, ms: Date.now() - t0, finishReason });
          if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
            throw new Error(`Gemini stopped: ${finishReason}`);
          }
          break;
        } catch (err) {
          lastErr = err;
          const errStr = err.message || '';
          const is503 = errStr.includes('503') || errStr.includes('UNAVAILABLE') || errStr.includes('high demand') || errStr.includes('currently experiencing');
          const is429 = errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED') || errStr.includes('quota');
          const isTimeout = errStr.includes('timeout');
          if (is503 || is429 || isTimeout) { console.warn(`[moodboard] retryable error on ${model} attempt ${attempt + 1}: ${errStr.slice(0, 80)}`); continue; }
          throw err;
        }
      }
      if (textResult) break;
      console.warn(`[moodboard] falling back from ${model}`);
    }
    if (!textResult) throw lastErr || new Error('All models unavailable');
    const raw = textResult.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!raw) throw new Error('Empty response from Gemini');
    let jsonStr = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonStr = jsonMatch[0];
    moodboardData = JSON.parse(jsonStr);
    if (!Array.isArray(moodboardData.the_look) || moodboardData.the_look.length < 6) {
      throw new Error(`Incomplete look data — got ${moodboardData.the_look?.length ?? 0} items`);
    }
  } catch (e) {
    logAI({ feature: 'moodboard', stage: 'text', success: false, ms: Date.now() - t0, reason: e.message });
    return res.status(500).json({ error: e.message || 'Failed to generate moodboard brief' });
  }

  // Match wardrobe items by category to look items
  const lookItems = moodboardData.the_look;
  for (const lookItem of lookItems) {
    const catLower = (lookItem.category || '').toLowerCase();
    const match = wardrobeItems.find(wi => {
      const wiCat = (wi.category || '').toLowerCase();
      const wiLabel = (wi.label || '').toLowerCase();
      return wiCat === catLower || catLower.includes(wiCat) || wiCat.includes(catLower) ||
             wiLabel.includes(catLower.replace(/s$/, ''));
    });
    lookItem.wardrobe_match = match
      ? { id: match.id, label: match.label, image_url: match.image_url || null, color: match.color || '' }
      : null;
  }

  // Respond immediately with text + look data — generate images in background
  // to avoid blocking the request and exhausting Gemini image quota during the
  // same window the style endpoint needs it.
  const mbJobId = randomBytes(6).toString('hex');
  imageJobs.set(mbJobId, { images: [], done: false, created: Date.now() });
  logAI({ feature: 'moodboard', stage: 'text_complete', totalMs: Date.now() - t0 });
  res.json({ ...moodboardData, the_look: lookItems, hero_image: null, grid_images: [], mb_job_id: mbJobId });

  // Background image generation — staggered to avoid bursting the Gemini rate limit
  const t1 = Date.now();
  const ip = moodboardData.image_prompts || {};
  const heroPrompts = Array.isArray(ip.hero_looks) ? ip.hero_looks.slice(0, 3) : [];
  const flatPrompts = Array.isArray(ip.flat_lays) ? ip.flat_lays.slice(0, 2) : [];
  const atmPrompts = Array.isArray(ip.atmosphere) ? ip.atmosphere.slice(0, 2) : [];

  const mbImageJobs = [
    ...heroPrompts.map(p => ({ type: 'hero_look', prompt: p })),
    ...flatPrompts.map(p => ({ type: 'flat_lay', prompt: p })),
    ...atmPrompts.map(p => ({ type: 'atmosphere', prompt: p })),
  ];

  (async () => {
    const results = [];
    for (let i = 0; i < mbImageJobs.length; i++) {
      const { type, prompt } = mbImageJobs[i];
      if (i > 0) await new Promise(r => setTimeout(r, 3000)); // 3s stagger between requests
      try {
        const r = await Promise.race([
          ai.models.generateContent({
            model: 'gemini-3.1-flash-image',
            contents: [{ role: 'user', parts: [{ text: `Editorial fashion photography. No text overlays. ${type === 'hero_look' ? `One woman, alone. ${FULL_BODY_FRAME} ` : ''}${prompt}` }] }],
            config: { responseModalities: ['TEXT', 'IMAGE'] },
          }),
          new Promise(resolve => setTimeout(() => resolve(null), 45000)),
        ]);
        if (!r) { logAI({ feature: 'moodboard', stage: 'image', type, success: false, reason: 'timeout' }); results.push({ type, url: null }); continue; }
        const part = r.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (!part?.inlineData) { logAI({ feature: 'moodboard', stage: 'image', type, success: false, reason: 'no_inline_data' }); results.push({ type, url: null }); continue; }
        const url = await cloudinaryUpload(part.inlineData.data, part.inlineData.mimeType);
        logAI({ feature: 'moodboard', stage: 'image', type, success: true, ms: Date.now() - t1 });
        results.push({ type, url });
        // Update job incrementally so client can poll for partial results
        const job = imageJobs.get(mbJobId);
        if (job) job.images = [...results];
      } catch (err) {
        logAI({ feature: 'moodboard', stage: 'image', type, success: false, reason: err.message });
        results.push({ type, url: null });
      }
    }
    const job = imageJobs.get(mbJobId);
    if (job) { job.images = results; job.done = true; }
    logAI({ feature: 'moodboard', stage: 'images_complete', totalMs: Date.now() - t0, count: results.filter(g => g.url).length });
  })();
});

app.post('/api/wardrobe/upload', async (req, res) => {
  const { data, mimeType } = req.body;
  if (!data || !mimeType) return res.status(400).json({ error: 'Missing data or mimeType' });
  if (!CLD_CLOUD || !CLD_KEY || !CLD_SECRET) {
    return res.status(500).json({ error: 'Cloudinary env vars not set on this deployment' });
  }
  const url = await cloudinaryUpload(data, mimeType);
  if (!url) return res.status(500).json({ error: 'Cloudinary upload failed — check server logs' });
  res.json({ url });
});

app.listen(port, () => {
  console.log(`Robes running at http://localhost:${port}`);
});

