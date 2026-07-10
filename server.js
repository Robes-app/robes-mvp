import 'dotenv/config';
import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash, randomBytes } from 'crypto';
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

const STYLE_SCHEMA = {
  type: 'object',
  properties: {
    fallback: { type: 'boolean' },
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
  required: ['fallback', 'ways'],
};

app.post('/api/style', rateLimit({ windowMs: 60_000, max: 10 }), async (req, res) => {
  const { photo, link, prompt, name, pieceName, styleDna, styleIcons, wardrobeCount, wardrobeItems, intent, context: rtContext } = req.body;

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

  const formulaBlock = `Every look follows the four-tier layer formula: 1) THE ANCHOR — the weather/agenda hero piece; 2) THE CANVAS — premium supporting basics; 3) THE TEXTURE — one depth-adding element; 4) THE EXCLAMATION POINT — the accessories, footwear and hardware that inject identity. Never give generic output like "jeans and a top" — name exact cuts, fabrications and styling techniques (e.g. "French-tuck a heavyweight silk button-down into high-waisted, wide-leg wool trousers").`;

  const brief = daily
    ? `The user is dressing for a real day, happening now. You build three complete, wearable outfits for that day — each a distinct mood or register, all appropriate to the occasion and the real-time weather context provided.`
    : `When given a key fashion piece, you create three distinct, wearable looks around it — each with a clear occasion and mood. Your descriptions are specific: you name real item types, describe drape and texture, and explain why each pairing works.`;

  const fallbackRule = daily
    ? `IMPORTANT: Set "fallback": true ONLY if the input is gibberish or random characters. A plain occasion, agenda or mood (e.g. "brunch", "a day of meetings") is a valid daily brief — set "fallback": false and dress the user for it.`
    : `IMPORTANT: You must set "fallback": true if ANY of these apply — the input is gibberish or random characters; no specific clothing item, garment, or accessory can be identified; the request is too vague to style (e.g. just a colour, a single generic word, or a non-fashion concept). When fallback is true, style a ${FALLBACK_PIECE} instead. Only set "fallback": false when a real, nameable fashion piece is clearly present.`;

  const systemInstruction = `You are an expert fashion stylist known for elegant, directional styling advice. Your tone is warm, precise, and editorial — like a trusted stylist who truly understands clothes. Your user is a stylish, fashion-forward woman — unless the input clearly indicates a male wearer, style all looks for a woman. ${who}

${brief}

${formulaBlock}

${fallbackRule}${dnaBlock ? '\n\n' + dnaBlock : ''}${closetBlock ? '\n\n' + closetBlock : ''}${closetDirective ? '\n' + closetDirective : ''}`;

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
    Promise.all(ways.map((w, i) => {
      const imgParts = [];
      if (!fallback && photoMatch) {
        imgParts.push({ inlineData: { mimeType: photoMatch[1], data: photoMatch[2] } });
      }
      const pieceLabel = fallback ? FALLBACK_PIECE : (pieceName || 'the clothing item');
      const pieceLine = daily && !fallback ? '' : `The key piece is ${pieceLabel}. `;
      imgParts.push({
        text: `PORTRAIT ORIENTATION ONLY. Single fashion editorial photograph — one person, one scene, no collage, no split panels, no side-by-side images. ${pieceLine}Look: "${w.title}" — ${w.eyebrow}. Outfit: ${w.outfit}. Show the full outfit clearly. Tall portrait crop, subject centred.`,
      });

      const imgCall = ai.models.generateContent({
        model: 'gemini-3.1-flash-image',
        contents: [{ role: 'user', parts: imgParts }],
        config: { responseModalities: ['TEXT', 'IMAGE'] },
      }).then(async r => {
        const part = r.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (!part?.inlineData) {
          logAI({ feature: 'style', stage: 'image', index: i, success: false, reason: 'no_inline_data' });
          return null;
        }
        // Host on Cloudinary so the client can persist a small URL in the
        // lookbook instead of a multi-MB base64 blob; fall back to data URL
        const hosted = await cloudinaryUpload(part.inlineData.data, part.inlineData.mimeType);
        const src = hosted || `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        logAI({ feature: 'style', stage: 'image', index: i, success: true, hosted: !!hosted, ms: Date.now() - t1 });
        const job = imageJobs.get(jobId);
        if (job) job.images[i] = src;
        return src;
      }).catch(err => {
        logAI({ feature: 'style', stage: 'image', index: i, success: false, reason: err.message });
        return null;
      });

      const timeout = new Promise(resolve => setTimeout(() => {
        logAI({ feature: 'style', stage: 'image', index: i, success: false, reason: 'timeout_50s' });
        resolve(null);
      }, 50000));
      return Promise.race([imgCall, timeout]);
    })).then(images => {
      const job = imageJobs.get(jobId);
      // Merge — an image may have landed on the job after its race timed out
      if (job) { job.images = job.images.map((v, i) => v || images[i]); job.done = true; }
      logAI({ feature: 'style', stage: 'images_complete', jobId, totalMs: Date.now() - t0, successCount: images.filter(Boolean).length });
    });
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
              required: ['name', 'category', 'brand', 'description', 'wardrobe_index', 'retailer_hint', 'price_point', 'alternates'],
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
  const { prompt, name, styleDna, styleIcons, wardrobeItems, context: rtContext, locked } = req.body;

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
        `${idx}: ${i.label}${i.category ? ' [' + i.category + ']' : ''}${i.color ? ', ' + i.color : ''}${i.brand ? ', ' + i.brand : ''}${Number(i.times_worn) > 0 ? `, worn ${i.times_worn}×` : ''}`
      ).join('\n')}`
    : 'THE USER HAS NOT CATALOGUED ANY WARDROBE PIECES YET.';

  const stateDirective = n === 0
    ? `WARDROBE STATE: EMPTY. Build a fully aspirational, editorial look — this look doubles as a shopping brief. Every item gets "wardrobe_index": -1 plus a real "retailer_hint" and "price_point".`
    : n < 15
      ? `WARDROBE STATE: GROWING (${n}/15). Hybrid build: wherever an owned piece genuinely serves the brief, use it — set its "wardrobe_index" and use its exact label as the name. Fill true gaps with aspirational pieces (wardrobe_index -1, real retailer_hint + price_point). When an owned piece and a hypothetical piece would both work, ALWAYS choose the owned piece.`
      : `WARDROBE STATE: COMPLETE (${n} pieces). Closet-first build: compose the look primarily from the digitised wardrobe — nearly every item should carry a valid "wardrobe_index" and its exact owned label. Introduce a new piece (wardrobe_index -1) only for a true gap or the finishing exclamation point.`;

  const rtLine = rtContext && (rtContext.city || rtContext.tempRange)
    ? `REAL-TIME CONTEXT: ${[rtContext.city, rtContext.month].filter(Boolean).join(' · ')}${rtContext.tempRange ? ' | ' + rtContext.tempRange : ''}${rtContext.condition ? ' | ' + rtContext.condition : ''}. This is the atmospheric reality — fabric weight, layers and footwear must answer to it.`
    : '';

  const systemInstruction = `You are Robes' head stylist — elite, editorial, precise. ${name ? `The user's name is ${name}. ` : ''}Unless the brief clearly indicates a male wearer, style for a woman. You dress clients for real days using the Context-to-Core Framework. Never output a generic outfit — name exact cuts, fabrications and styling techniques (e.g. "French-tuck a heavyweight silk button-down into high-waisted wide-leg wool trousers").

THE FRAMEWORK — work through it in this order:
1. THE CONTEXT FILTERS. Fix the day's parameters before pulling a single garment: the agenda & mobility in the brief (what she physically does today), the atmospheric reality (the real-time weather provided — it dictates fabric weight and outerwear), and the psychological goal (how she needs to feel and be perceived).
2. THE ARCHITECTURAL FORMULA. Build the outfit as exactly four steps, in this exact order:
   - "The Anchor" — exactly 1 item: the hero structural piece that sets the register (blazer, coat, statement skirt, dress).
   - "The Canvas" — 1 or 2 items: the supporting, high-quality basics beneath the anchor (shirt, tee, knit, trousers, skirt).
   - "The Texture" — exactly 1 item: the layering element that adds tactile dimension (scarf, cardigan, fine knit, belt).
   - "The Accents" — exactly 2 items: the definitive footwear plus one piece of hardware (bag, jewellery) that finish the look.
3. THE GOLDEN RATIOS. Balance the build through body architecture: the Rule of Thirds (never a 50/50 visual split — aim for 1/3 : 2/3, e.g. a high-waisted trouser with a tucked-in top lengthens the leg line), Volume Balancing (an oversized or voluminous piece demands a point of structure or compression elsewhere), and Textural Contrast (mix matte, sheen and rough — silk + wool + leather — so the look never falls flat). Let this thinking show in the stylist_summary and item descriptions.
4. THE TRANSITION PROTOCOL. She moves between environments without going home. "transition_tip" is ONE concrete move — subtractive styling (drop a layer to lower the formality) or hardware swapping (daytime tote + sneakers → clutch + kitten heel) — that shifts today's look into its next scene.

${stateDirective}${lockedBlock ? '\n\n' + lockedBlock : ''}

FIELD RULES:
- "occasion_label": 1–3 words, ALL CAPS, naming the day's occasion (e.g. "GARDEN PARTY", "STUDIO DAY").
- "headline": a short serif-worthy line naming place and occasion, sentence case, ending in a full stop (e.g. "A Dublin garden-party look."). Max 8 words.
- "stylist_summary": 2–3 sentences of stylist reasoning that open with the weather/agenda read, reference the steps by name (The Anchor, The Canvas, The Texture) with their items in parentheses, and show the golden-ratio thinking.
- "palette": exactly 3 hex colours drawn from the look, ordered neutral to accent.
- Each item: "name" is the piece itself (e.g. "Cream check blazer"); "brand" is ONE real brand suited to the piece's register (for owned pieces, the owned brand or ""); "description" is one hyper-specific sentence — cut, fabric, colour, and how it is worn.
- Owned pieces: set "wardrobe_index" to the wardrobe list index, use the exact owned label as the name, and set retailer_hint and price_point to "". New pieces: "wardrobe_index": -1 with a real "retailer_hint" (e.g. "COS", "Net-a-Porter", "Arket") and a realistic EUR "price_point" (e.g. "€89").
- "alternates": exactly 2 per item — similar-but-distinct options for the SAME slot (a different colour, fabrication or register that still honours the palette, the weather and the DNA below), each with its own real brand, retailer_hint and EUR price_point. These power the flick-through rail, so make them genuinely wearable alternatives, never filler.
- "fallback": true ONLY if the brief is gibberish or random characters — then dress her for a pleasant, unremarkable day in the given context instead. A plain occasion, agenda or mood is a valid daily brief.${dnaBlock ? '\n\n' + dnaBlock : ''}

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
    logAI({ feature: 'daily', stage: 'text', model: 'gemini-2.5-flash', ms: Date.now() - t0, items: flat.length, owned: flat.filter(f => f.item.wardrobe_match).length, fallback: parsed.fallback === true });

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
          ? `PORTRAIT ORIENTATION ONLY. Single editorial fashion photograph — one woman, one scene, no collage, no split panels, no text overlays. She wears the complete outfit: ${allNames}. The ${item.name} leads the frame. ${scene ? `Setting: ${scene}. ` : ''}Soft natural light, luxury campaign aesthetic, full outfit clearly visible, subject centred.`
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
    const from = new Date(dateFrom + 'T00:00:00Z');
    const to = new Date(dateTo + 'T00:00:00Z');
    if (isNaN(from) || isNaN(to)) return { city: loc.name, country: loc.country || '' };
    const daysAhead = Math.round((to - Date.now()) / 86400000);
    const daily = 'temperature_2m_max,temperature_2m_min,weather_code';
    let data, seasonal = false;
    if (daysAhead >= 0 && daysAhead <= 14 && from >= new Date(Date.now() - 86400000)) {
      data = await fetchJson(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&daily=${daily}&start_date=${dateFrom}&end_date=${dateTo}&temperature_unit=celsius`);
    } else {
      seasonal = true;
      const shift = d => { const x = new Date(d); x.setUTCFullYear(x.getUTCFullYear() - 1); return x.toISOString().slice(0, 10); };
      data = await fetchJson(`https://archive-api.open-meteo.com/v1/archive?latitude=${loc.latitude}&longitude=${loc.longitude}&daily=${daily}&start_date=${shift(from)}&end_date=${shift(to)}&temperature_unit=celsius`);
    }
    const maxes = (data?.daily?.temperature_2m_max || []).filter(Number.isFinite);
    const mins = (data?.daily?.temperature_2m_min || []).filter(Number.isFinite);
    const codes = (data?.daily?.weather_code || []).filter(Number.isFinite);
    if (!maxes.length || !mins.length) return { city: loc.name, country: loc.country || '' };
    const counts = new Map();
    codes.forEach(c => counts.set(c, (counts.get(c) || 0) + 1));
    const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    return {
      city: loc.name,
      country: loc.country || '',
      minC: Math.round(Math.min(...mins)),
      maxC: Math.round(Math.max(...maxes)),
      tempRange: `${Math.round(Math.min(...mins))}–${Math.round(Math.max(...maxes))}°C`,
      condition: wxCondition(dominant),
      eveningMinC: Math.round(Math.min(...mins)),
      seasonal,
    };
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
  const { destination, dateFrom, dateTo, brief, name, styleDna, styleIcons, wardrobeItems, shortlistIds, anchorIds } = req.body;
  if (!destination || !String(destination).trim()) {
    return res.status(400).json({ error: 'Tell us where you’re going first.' });
  }

  const dest = String(destination).trim().slice(0, 120);
  const closetItems = Array.isArray(wardrobeItems) ? wardrobeItems.slice(0, 60) : [];
  const n = closetItems.length;
  const dnaBlock = styleDnaPromptBlock(styleDna, n, styleIcons);

  // The shortlist (wardrobe-first PRD, curatorial revision) — everything
  // she is TEMPTED to bring, multi-selected from her catalogued wardrobe.
  // Robes' job is Keep vs Leave Behind vs Worth Adding, not invention.
  // (`anchorIds` accepted for back-compat with older clients.)
  const shortIdxs = (Array.isArray(shortlistIds) ? shortlistIds : (Array.isArray(anchorIds) ? anchorIds : []))
    .map(id => closetItems.findIndex(it => String(it.id) === String(id)))
    .filter(i => i >= 0);

  const from = new Date(String(dateFrom || '') + 'T00:00:00Z');
  const to = new Date(String(dateTo || '') + 'T00:00:00Z');
  const validDates = !isNaN(from) && !isNaN(to) && to >= from;
  const tripDays = validDates ? Math.min(10, Math.round((to - from) / 86400000) + 1) : 7;
  const fmt = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const dateLine = validDates ? `${fmt(from)} – ${fmt(to)}${from.getUTCFullYear() !== new Date().getUTCFullYear() ? ' ' + from.getUTCFullYear() : ''}` : '';
  const monthName = validDates ? from.toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' }) : '';

  const weather = validDates ? await fetchTripWeather(dest, String(dateFrom), String(dateTo)) : await fetchTripWeather(dest, '', '');

  const closetBlock = n
    ? `THE USER'S DIGITISED WARDROBE (${n} pieces, referenced by wardrobe_index):\n${closetItems.map((i, idx) =>
        `${idx}: ${i.label}${i.category ? ' [' + i.category + ']' : ''}${i.color ? ', ' + i.color : ''}${i.brand ? ', ' + i.brand : ''}${Number(i.times_worn) > 0 ? `, worn ${i.times_worn}×` : ''}`
      ).join('\n')}`
    : 'THE USER HAS NOT CATALOGUED ANY WARDROBE PIECES YET.';

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
    return `You are Robes' head stylist — elite, editorial, precise. ${name ? `The user's name is ${name}. ` : ''}Unless the brief clearly indicates a male wearer, style for a woman. You are building a Capsule Packing Edit & Lookbook for a trip, governed by the StyleAlchemist 4-Core Pillars. Never output a generic outfit — ban flat phrasing ("jeans and a top"); render every look with high descriptive specificity (e.g. "Deep-V tuck the oversized alabaster silk button-down into the wide-leg linen trousers, cinched with the molten gold waist-belt").

THE PILLARS — all four are hard constraints:
1. THE 1:3 HIGH-YIELD RULE. Every capsule item must appear in AT LEAST THREE different outfits across the lookbook, in at least two distinct dress codes. No single-outfit passengers — if a piece can't earn three wears, it doesn't get packed.
2. THE CAPSULE MATRIX. YOU decide the pack count — the smallest capsule that dresses every day of the trip under the 1:3 rule. For this ${tripDays}-day trip that is typically around ${suggest} items (never more than 16); the maths must hold: pieces × 3 wears ≥ ${tripDays * 2} looks × ~4 formula slots. Split the capsule across the three tiers: "${TRAVEL_TIERS[0]}" (~${foundations} items — architectural basics, tailoring, versatile one-pieces), "${TRAVEL_TIERS[1]}" (~${statements} items — the tactile hero pieces: statement dresses, crochet, plissé, prints), "${TRAVEL_TIERS[2]}" (~${hardware} items — shoes, bags, belts, jewellery that seal silhouettes).${shortIdxs.length ? ' The tier targets are guidance for shaping what you KEEP — never pad the capsule to hit a number.' : ''}
3. THE 4-STEP DRESSING FORMULA. Every outfit's "formula" is built ONLY from capsule items referenced by "item_index" (0-based index into the capsule array — never invent an item that isn't packed): "The Anchor" ×1 (the context-driven hero), "The Canvas" ×1–2 (the grounding basics), "The Texture" ×1 (the tactile dimension layer), "The Exclamation Point" ×1–2 (footwear/hardware that finish it). Swim or sleep-adjacent looks may drop to 3 entries, never fewer. Each entry's "note" says how that piece is worn in THIS look.
4. CONTEXT ENGINEERING. Ingest three vectors at once: the Location Vibe (name it in "location_vibe", e.g. "Refined Mediterranean Minimalism"), the Micro-Climate provided, and the client's proportional architecture / style DNA below. Everything packed answers to all three.

THE LOOKBOOK: exactly ${tripDays} entries in "days" — one per trip day, "day_label" like "Day 1 · Arrival"${dateLine ? ` (the trip runs ${dateLine})` : ''}. Each day has exactly 2 slots: "Day" and "Evening", mapped to a plausible itinerary drawn from the brief. Each slot: "title" (3–6 words naming the scene), "how" (ONE hyper-specific styling sentence — the anti-generic constraint applies), and the "formula".

${stateDirective}

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

${shortIdxs.length ? `THE SHORTLIST — everything she is TEMPTED to bring (${shortIdxs.length} owned pieces, by wardrobe_index):
${shortIdxs.map(i => `${i}: ${closetItems[i].label}${closetItems[i].category ? ' [' + closetItems[i].category + ']' : ''}${closetItems[i].color ? ', ' + closetItems[i].color : ''}`).join('\n')}
YOU ARE THE EDITOR, NOT A SHOPPER. Curate this shortlist — every shortlisted piece must land in exactly one of three places:
- KEEP: it earns at least 3 wears across the lookbook. Kept pieces go in "capsule" with their wardrobe_index, exact owned label and a one-line "reason" naming why it made the cut.
- LEAVE BEHIND: it doesn't earn its place — a duplicate of a stronger piece, wrong for the micro-climate, a single-outfit passenger. List each in "left_behind" with its wardrobe_index and one honest, kind "reason". Cutting is a service, not a failure — a tight edit beats an overpacked case.
- No shortlisted piece may silently vanish: capsule or left_behind, always.
WORTH ADDING — the SMALLEST group, and it may be EMPTY: suggest a new piece (wardrobe_index -1, real retailer_hint + price_point) ONLY for a genuine gap the kept pieces expose that no shortlisted piece can fill. Never more than 3. Every NEW piece must justify itself as a bridge: set its "bridge" field to one clause naming what it connects and how many looks it unlocks (e.g. "Bridges the linen tailoring and the evening slip — unlocks 5 looks").
Do not pack owned pieces she did not shortlist — she chose from her full wardrobe already.

` : ''}${closetBlock}${correctiveNote ? '\n\n' + correctiveNote : ''}`;
  }

  const userText = `${wxLine ? wxLine + '\n\n' : ''}THE TRIP BRIEF: ${dest}${dateLine ? ', ' + dateLine : ''}${monthName ? ' (' + monthName + ')' : ''}, ${tripDays} day${tripDays > 1 ? 's' : ''}. ${String(brief || '').trim() || 'No further notes — read the destination and season for the vibe.'}

${shortIdxs.length ? `Curate the shortlist — keep what earns its place, leave behind what doesn't, add only what's genuinely missing — and build` : 'Build the capsule and'} the full ${tripDays}-day lookbook.`;

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
      .slice(0, 16)
      .map(it => {
        if (!TRAVEL_TIERS.includes(it.tier)) it.tier = TRAVEL_TIERS[0];
        const wi = Number.isInteger(it.wardrobe_index) && it.wardrobe_index >= 0 ? closetItems[it.wardrobe_index] : null;
        it.wardrobe_match = wi
          ? { id: wi.id, label: wi.label, image_url: wi.image_url || null, color: wi.color || '' }
          : null;
        return it;
      });
    const days = (Array.isArray(parsed.days) ? parsed.days : [])
      .filter(d => d && Array.isArray(d.slots) && d.slots.length)
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
      .filter(d => d.slots.length);
    // Leave Behind (curatorial PRD): shortlisted pieces that didn't make
    // the cut, resolved back to real wardrobe rows. Anything that also
    // landed in the capsule is a model contradiction — the capsule wins.
    const keptIds = new Set(capsule.filter(it => it.wardrobe_match).map(it => String(it.wardrobe_match.id)));
    const seenLeft = new Set();
    const leftBehind = (Array.isArray(parsed.left_behind) ? parsed.left_behind : [])
      .filter(l => l && Number.isInteger(l.wardrobe_index) && l.wardrobe_index >= 0 && l.wardrobe_index < closetItems.length)
      .map(l => {
        const wi = closetItems[l.wardrobe_index];
        return { id: wi.id, label: wi.label, category: wi.category || '', image_url: wi.image_url || null, reason: String(l.reason || '').slice(0, 240) };
      })
      .filter(l => {
        const id = String(l.id);
        if (keptIds.has(id) || seenLeft.has(id)) return false;
        seenLeft.add(id);
        return true;
      });
    return { capsule, days, leftBehind };
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
        maxOutputTokens: 8000,
      },
    }));
    return JSON.parse(r.text);
  }

  // Shortlisted pieces the model neither kept nor cut — every shortlist
  // piece must be accounted for (capsule or left_behind), never dropped.
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

    // PRD §2 validation parser: one corrective pass when the 1:3 matrix
    // is materially violated (more than two under-used items) or a
    // shortlisted piece went unaccounted for (neither kept nor cut).
    const under = travelUnderusedItems(capsule, days);
    const missing = unaccounted(capsule, leftBehind);
    if (!capsule.length || !days.length || under.length > 2 || missing.length) {
      const note = capsule.length && days.length
        ? `VALIDATION FAILURE ON YOUR LAST ATTEMPT — ${[
            under.length ? `these packed items were worn in fewer than 3 outfits: ${under.map(i => capsule[i].name).join(', ')}` : '',
            missing.length ? `these shortlisted pieces were neither kept nor listed in left_behind: ${missing.map(i => closetItems[i].label).join(', ')}` : '',
          ].filter(Boolean).join('; ')}. Rework the edit so every shortlisted piece is either kept or left behind with a reason, and EVERY capsule item earns at least three wears.`
        : '';
      logAI({ feature: 'travel', stage: 'validate', retry: true, underused: under.length, unaccounted: missing.length, empty: !capsule.length || !days.length });
      try {
        const second = await generate(note);
        const norm2 = normalise(second);
        const under2 = travelUnderusedItems(norm2.capsule, norm2.days);
        const missing2 = unaccounted(norm2.capsule, norm2.leftBehind);
        if (norm2.capsule.length && norm2.days.length &&
            (!capsule.length || !days.length || (missing2.length + under2.length) < (missing.length + under.length))) {
          parsed = second; capsule = norm2.capsule; days = norm2.days; leftBehind = norm2.leftBehind;
        }
      } catch { /* keep first attempt */ }
    }
    if (!capsule.length || !days.length) throw new Error('empty travel edit');

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
          ? `PORTRAIT ORIENTATION ONLY. Single editorial travel-fashion photograph — one woman, one scene, no collage, no split panels, no text overlays. ${parsed.location_vibe ? parsed.location_vibe + ' aesthetic. ' : ''}Setting: ${dest}${monthName ? ' in ' + monthName : ''}. She wears a complete look drawn from this capsule: ${capsuleNames}. Soft natural light, luxury resort campaign aesthetic, full outfit clearly visible, subject centred.`
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
  const { destination, brief, dayIndex, activity, capsule, weather, name, styleDna, styleIcons } = req.body;
  const act = String(activity || '').trim().slice(0, 200);
  const capIn = (Array.isArray(capsule) ? capsule : []).filter(c => c && c.name).slice(0, 20);
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

  const systemInstruction = `You are Robes' head stylist — elite, editorial, precise. ${name ? `The user's name is ${name}. ` : ''}Unless the brief clearly indicates a male wearer, style for a woman. The user is refining ONE day of an existing capsule lookbook for ${dest}${brief ? ` (trip brief: "${String(brief).slice(0, 300)}")` : ''}. Never output a generic outfit — ban flat phrasing; every "how" line is hyper-specific (cut, fabric, styling move).

THE PACKED CAPSULE (referenced by "item_index"):
${capList}

RULES:
1. Re-dress Day ${dayNum} for the user's REAL plan: "${act}". Exactly 2 slots — "Day" then "Evening" — mapping the plan sensibly across them (a single big event: style the lead-up as "Day" and the event itself as "Evening", or vice versa if it's a daytime event).
2. RE-MIX FIRST. Build every outfit ONLY from the capsule via "item_index" and the 4-step formula: "The Anchor" ×1, "The Canvas" ×1–2, "The Texture" ×1, "The Exclamation Point" ×1–2 (3 entries minimum for swim/undone moments). Each entry's "note" says how the piece is worn in THIS look.
3. Set "new_item_needed": true ONLY if the plan genuinely cannot be dressed from the capsule (e.g. a formal wedding with nothing remotely formal packed). Then give "new_item" — one real gap piece with retailer_hint, a realistic EUR price_point and a "bridge" clause (what it connects + looks it unlocks) — and reference it in the formulas as item_index ${capIn.length}. Otherwise "new_item_needed": false.
4. "day_label": "Day ${dayNum} · {2–4 word title of the plan}". "title" per slot: 3–6 words naming the scene.${dnaBlock ? '\n\n' + dnaBlock : ''}
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
        maxOutputTokens: 2500,
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

app.get('/wardrobe', (req, res) => {
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
      addImg(i.image_url || i.img);
    }));
    if (typeof dl.stylist_summary === 'string') editorial = dl.stylist_summary;
  } else if (type === 'travel-edit') {
    const tv = d.tvData || {};
    (Array.isArray(tv.capsule) ? tv.capsule : []).forEach(i => {
      if (!i) return;
      addPiece(i.name, i.brand, i.price_point);
      addImg(i.image_url || i.img);
    });
    if (typeof tv.stylist_summary === 'string') editorial = tv.stylist_summary;
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
    `<title>Robes — this look isn’t shared any more</title>\n<meta property="og:title" content="Robes — styled for you">`);

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
    const ATTEMPTS = [
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
        const result = await ai.models.generateContent({
          model: a.model,
          contents: [{
            role: 'user',
            parts: [
              { inlineData: { mimeType, data } },
              { text: colour ? COLOUR_EXTRACT_PROMPT : SIL_EXTRACT_PROMPT },
            ],
          }],
          config,
        });
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
  const { prompt, wardrobeItems = [], styleDna = null, styleIcons = [] } = req.body;
  if (!prompt?.trim()) return res.status(400).json({ error: 'prompt required' });

  const wardrobeCtx = wardrobeItems.length
    ? `The user's wardrobe contains these pieces: ${wardrobeItems.map(i => `${i.label} (${i.category}${i.color ? ', ' + i.color : ''})`).join('; ')}.`
    : 'The user has not yet digitised their wardrobe.';

  const systemPrompt = `You are Robes, an elite personal stylist AI. The user has given you a specific styling brief — your entire response must be tailored to THAT brief. Return ONLY valid JSON with no markdown fences.`;

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
            contents: [{ role: 'user', parts: [{ text: `Editorial fashion photography. No text overlays. ${prompt}` }] }],
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

