import 'dotenv/config';
import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash, randomBytes } from 'crypto';
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
    return data.secure_url;
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
  const { photo, link, prompt, name, pieceName, styleDna, wardrobeCount, wardrobeItems, intent, context: rtContext } = req.body;

  if (!photo && !link && !prompt) {
    return res.status(400).json({ error: 'Provide at least a photo, link, or prompt.' });
  }

  const daily = intent === 'dress-me';
  const who = name ? `The user's name is ${name}.` : '';
  const piece = pieceName ? `The key piece is described as: "${pieceName}".` : '';
  const context = prompt ? `Additional context from the user: "${prompt}".` : '';
  const linkCtx = link ? `The user provided a product link for reference: ${link}.` : '';
  const dnaBlock = styleDnaPromptBlock(styleDna, Number(wardrobeCount) || 0);

  const closetItems = Array.isArray(wardrobeItems) ? wardrobeItems.slice(0, 60) : [];
  const closetBlock = closetItems.length
    ? `THE USER'S DIGITISED WARDROBE (${closetItems.length} pieces): ${closetItems.map(i =>
        `${i.label}${i.category ? ' [' + i.category + ']' : ''}${i.color ? ', ' + i.color : ''}${Number(i.times_worn) > 0 ? `, worn ${i.times_worn}×` : ''}`
      ).join('; ')}.`
    : '';
  const closetDirective = daily && closetItems.length >= 15
    ? 'Build each outfit primarily from the digitised wardrobe above — reference owned pieces by their exact labels, and add new pieces only where the closet has a true gap or for the Exclamation Point.'
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
- Light Spring: warm, light, fresh — light golden blonde, fair warm skin, low-medium contrast.
- Warm Spring: distinctly golden, mid-toned, clear — golden blonde/copper hair, warm glow.
- Clear Spring: warm-leaning, HIGH chroma, high contrast — bright, vivid features.
- Light Summer: cool, very light, delicate — ash blonde, cool fair skin, low contrast.
- True Summer: fully cool, mid-toned, soft — ash hair, rosy skin, grey/blue eyes, no warmth anywhere.
- Soft Summer: cool-neutral and MUTED — greyed, misty colouring, low chroma.
- Soft Autumn: warm-neutral and MUTED — dark blonde/soft brown hair with a golden cast, low-medium contrast, dusty warmth. The most common season for warm-leaning blondes whose colouring is soft rather than vivid.
- True Autumn: fully warm, rich, earthy — red/auburn/golden brown hair, golden skin.
- Dark Autumn: warm and DEEP — dark brown hair with warmth, deep eyes, high contrast.
- Clear Winter: cool, HIGH chroma, very high contrast — dark hair, bright eyes, vivid.
- True Winter: fully cool, saturated, stark — blue-black/dark ash hair, high contrast.
- Dark Winter: cool and DEEP — near-black hair, deep cool eyes, extremely high contrast.

DISCIPLINE RULES:
- A blonde with ANY golden or honey quality to her hair is warm-family (a Spring or Autumn), not a Summer — never read sun-lightened or highlighted golden blonde as ash.
- Muted + warm → Soft Autumn, not a Summer. Muted + cool → Soft Summer.
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
    // Attempt 1 uses a responseSchema; attempt 2 drops it and trusts JSON mode.
    let result, lastErr;
    for (let attempt = 0; attempt < 2 && !result; attempt++) {
      const config = {
        responseMimeType: 'application/json',
        maxOutputTokens: 2048,
        temperature: 0,
        thinkingConfig: { thinkingBudget: 0 },
      };
      if (attempt === 0) config.responseSchema = colour ? COLOUR_EXTRACT_SCHEMA : SIL_EXTRACT_SCHEMA;
      try {
        result = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{
            role: 'user',
            parts: [
              { inlineData: { mimeType, data } },
              { text: colour ? COLOUR_EXTRACT_PROMPT : SIL_EXTRACT_PROMPT },
            ],
          }],
          config,
        });
      } catch (e) {
        lastErr = e;
        console.error(`[stylenotes/analyse] attempt ${attempt + 1} (${attempt === 0 ? 'with' : 'without'} schema) failed:`, e.message);
        if (attempt === 0) await new Promise(r => setTimeout(r, 1000));
      }
    }
    if (!result) throw lastErr;
    const finishReason = result.candidates?.[0]?.finishReason;
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (parseErr) {
      console.error('[stylenotes/analyse] JSON parse failed —', { kind, finishReason, textLength: text.length, tail: text.slice(-120) });
      throw new Error('truncated_response:' + finishReason);
    }
    const rejected = colour ? parsed.no_face_detected : parsed.no_person_detected;
    if (rejected) {
      logAI({ feature: 'stylenotes_analyse', kind, ms: Date.now() - t0, finishReason, rejected: true, success: true });
      return res.json(colour ? { no_face_detected: true } : { no_person_detected: true });
    }
    const { render, dna } = colour ? buildColorHarmony(parsed) : buildSilhouette(parsed);
    logAI({ feature: 'stylenotes_analyse', kind, ms: Date.now() - t0, finishReason, rejected: false, success: true, archetype: colour ? dna.archetype_name : dna.body_type });
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
  const { prompt, wardrobeItems = [], styleDna = null } = req.body;
  if (!prompt?.trim()) return res.status(400).json({ error: 'prompt required' });

  const wardrobeCtx = wardrobeItems.length
    ? `The user's wardrobe contains these pieces: ${wardrobeItems.map(i => `${i.label} (${i.category}${i.color ? ', ' + i.color : ''})`).join('; ')}.`
    : 'The user has not yet digitised their wardrobe.';

  const systemPrompt = `You are Robes, an elite personal stylist AI. The user has given you a specific styling brief — your entire response must be tailored to THAT brief. Return ONLY valid JSON with no markdown fences.`;

  const userPrompt = `USER'S STYLING BRIEF: "${prompt}"

Everything you generate must be specific to the brief above — destination, climate, occasion, and aesthetic must all reflect it directly.

${wardrobeCtx}
${styleDnaPromptBlock(styleDna, wardrobeItems.length)}

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
      config: { systemInstruction: systemPrompt, maxOutputTokens: 5000 },
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

