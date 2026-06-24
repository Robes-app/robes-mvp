import 'dotenv/config';
import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash, randomBytes } from 'crypto';
import { GoogleGenAI } from '@google/genai';

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

app.use(express.json({ limit: '20mb' }));
app.use(express.static(join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js') || filePath.endsWith('.css') || filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  },
}));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
  const { photo, link, prompt, name, pieceName } = req.body;

  if (!photo && !link && !prompt) {
    return res.status(400).json({ error: 'Provide at least a photo, link, or prompt.' });
  }

  const who = name ? `The user's name is ${name}.` : '';
  const piece = pieceName ? `The key piece is described as: "${pieceName}".` : '';
  const context = prompt ? `Additional context from the user: "${prompt}".` : '';
  const linkCtx = link ? `The user provided a product link for reference: ${link}.` : '';

  const systemInstruction = `You are an expert fashion stylist known for elegant, directional styling advice. Your tone is warm, precise, and editorial — like a trusted stylist who truly understands clothes. Your user is a stylish, fashion-forward woman — unless the input clearly indicates a male wearer, style all looks for a woman. ${who}

When given a key fashion piece, you create three distinct, wearable looks around it — each with a clear occasion and mood. Your descriptions are specific: you name real item types, describe drape and texture, and explain why each pairing works.

IMPORTANT: You must set "fallback": true if ANY of these apply — the input is gibberish or random characters; no specific clothing item, garment, or accessory can be identified; the request is too vague to style (e.g. just a colour, a single generic word, or a non-fashion concept). When fallback is true, style a ${FALLBACK_PIECE} instead. Only set "fallback": false when a real, nameable fashion piece is clearly present.`;

  const userText = `${piece} ${context} ${linkCtx}

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

    console.log(`Text: ${Date.now() - t0}ms`);

    const parsed = JSON.parse(textResponse.text);
    const fallback = parsed.fallback === true;
    const ways = parsed.ways;

    const t1 = Date.now();
    const generatedImages = await Promise.all(ways.map((w, i) => {
      const imgParts = [];
      if (!fallback && photoMatch) {
        imgParts.push({ inlineData: { mimeType: photoMatch[1], data: photoMatch[2] } });
      }
      const pieceLabel = fallback ? FALLBACK_PIECE : (pieceName || 'the clothing item');
      imgParts.push({
        text: `PORTRAIT ORIENTATION ONLY. Single fashion editorial photograph — one person, one scene, no collage, no split panels, no side-by-side images. The key piece is ${pieceLabel}. Look: "${w.title}" — ${w.eyebrow}. Outfit: ${w.outfit}. Show the full outfit clearly. Tall portrait crop, subject centred.`,
      });

      const imgCall = ai.models.generateContent({
        model: 'gemini-3.1-flash-image',
        contents: [{ role: 'user', parts: imgParts }],
        config: { responseModalities: ['TEXT', 'IMAGE'] },
      }).then(r => {
        const part = r.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (!part?.inlineData) return null;
        console.log(`Image ${i}: ${Date.now() - t1}ms`);
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }).catch(err => { console.warn(`Image ${i} failed:`, err.message); return null; });

      // Never wait more than 40s for any single image
      const timeout = new Promise(resolve => setTimeout(() => { console.warn(`Image ${i} timed out`); resolve(null); }, 40000));
      return Promise.race([imgCall, timeout]);
    }));

    console.log(`Total: ${Date.now() - t0}ms`);
    res.json({ ways, generatedImages, photoUrl, fallback });
  } catch (err) {
    if (res.headersSent) return; // client already disconnected
    console.error('Gemini API error:', err.message);
    res.status(500).json({ error: err.message || 'Styling failed' });
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

app.post('/api/wardrobe/analyse', async (req, res) => {
  const { data, mimeType } = req.body;
  if (!data || !mimeType) return res.status(400).json({ error: 'Missing data or mimeType' });
  try {
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType, data } },
          { text: `You are a fashion intelligence engine for a luxury wardrobe app. Analyze this clothing item photo and return a JSON object with these keys:

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
"ai_generated_notes": one editorial sentence under 15 words

Return only valid JSON, no markdown.` }
        ]
      }],
      config: { responseMimeType: 'application/json', maxOutputTokens: 600 }
    });
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    console.log('[analyse] raw:', text.slice(0, 400));

    let parsed = {};
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch (parseErr) {
      console.warn('[analyse] JSON parse failed, returning partial:', parseErr.message);
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
    console.error('[analyse] Gemini error:', err.message);
    // Return empty-field response so step 3 still renders rather than bouncing back to step 1
    res.json({ label: '', category: 'Other', color: '', brand: '', notes: '', item_dna: { display: {}, structural_dna: { silhouette_fit: [] }, llm_styling_context: {}, ai_generated_notes: '' } });
  }
});

/* ── moodboard ───────────────────────────────────────────────────── */
app.post('/api/moodboard', rateLimit({ windowMs: 60_000, max: 10 }), async (req, res) => {
  const { prompt, wardrobeItems = [] } = req.body;
  if (!prompt?.trim()) return res.status(400).json({ error: 'prompt required' });

  const wardrobeCtx = wardrobeItems.length
    ? `The user's wardrobe contains these pieces: ${wardrobeItems.map(i => `${i.label} (${i.category}${i.color ? ', ' + i.color : ''})`).join('; ')}.`
    : 'The user has not yet digitised their wardrobe.';

  const systemPrompt = `You are Robes, an elite personal stylist AI. The user has given you a specific styling brief — your entire response must be tailored to THAT brief. Return ONLY valid JSON with no markdown fences.`;

  const userPrompt = `USER'S STYLING BRIEF: "${prompt}"

Everything you generate must be specific to the brief above — destination, climate, occasion, and aesthetic must all reflect it directly.

${wardrobeCtx}

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
      "styling_note": "One sentence on how to wear it in this specific context"
    }
  ],
  "image_prompt": "Detailed editorial fashion photography brief reflecting the user's destination and brief: garments, setting, lighting, mood. Portrait orientation. No text overlays."
}

Rules:
- the_look: exactly 8 items
- aesthetic_tags: ALL CAPS, 3–5 tags, relevant to THIS brief
- Never use generic descriptions — name cuts, fabrics, colours precisely
- Do NOT default to a London or Wimbledon aesthetic unless the brief says so`;

  console.log('[moodboard] prompt received:', prompt);

  let moodboardData;
  try {
    const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    // No responseMimeType — JSON mode can truncate responses; parse manually instead
    const geminiCall = (model) => ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      config: { systemInstruction: systemPrompt, maxOutputTokens: 4000 },
    });
    let textResult;
    let lastErr;
    for (const model of MODELS) {
      for (let attempt = 0; attempt < 2; attempt++) {
        if (attempt > 0) await new Promise(r => setTimeout(r, 2000));
        try {
          const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('text gen timeout')), 35000));
          textResult = await Promise.race([geminiCall(model), timeout]);
          const finishReason = textResult.candidates?.[0]?.finishReason;
          console.log(`[moodboard] text ok with ${model}, finishReason: ${finishReason}`);
          if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
            throw new Error(`Gemini stopped: ${finishReason}`);
          }
          break;
        } catch (err) {
          lastErr = err;
          const errStr = err.message || '';
          const is503 = errStr.includes('503') || errStr.includes('UNAVAILABLE') || errStr.includes('high demand') || errStr.includes('currently experiencing');
          if (is503) { console.warn(`[moodboard] 503 on ${model} attempt ${attempt + 1}`); continue; }
          throw err;
        }
      }
      if (textResult) break;
      console.warn(`[moodboard] falling back from ${model}`);
    }
    if (!textResult) throw lastErr || new Error('All models unavailable');
    const raw = textResult.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('[moodboard] raw response length:', raw.length, '| preview:', raw.slice(0, 200));
    if (!raw) throw new Error('Empty response from Gemini');
    let jsonStr = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    // Extract JSON object if model wrapped it in prose
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonStr = jsonMatch[0];
    moodboardData = JSON.parse(jsonStr);
    console.log('[moodboard] parsed ok — title:', moodboardData.title);
  } catch (e) {
    console.error('[moodboard] text gen failed:', e.message, e.stack?.split('\n')[1]);
    return res.status(500).json({ error: e.message || 'Failed to generate moodboard brief' });
  }

  // Match wardrobe items by category to look items
  const lookItems = Array.isArray(moodboardData.the_look) ? moodboardData.the_look : [];
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

  // Generate hero editorial image (best-effort, 40s timeout)
  let heroImage = null;
  try {
    const imgCall = ai.models.generateContent({
      model: 'gemini-3.1-flash-image',
      contents: [{ role: 'user', parts: [{ text: `Editorial fashion photography, portrait orientation, no text. ${moodboardData.image_prompt}` }] }],
      config: { responseModalities: ['TEXT', 'IMAGE'] },
    }).then(r => {
      const part = r.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (!part?.inlineData) return null;
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }).catch(err => { console.warn('[moodboard] image failed:', err.message); return null; });

    const timeout = new Promise(resolve => setTimeout(() => resolve(null), 40000));
    heroImage = await Promise.race([imgCall, timeout]);
  } catch (e) {
    console.warn('[moodboard] image error:', e.message);
  }

  console.log('[moodboard] done — image:', heroImage ? 'yes' : 'no');
  res.json({ ...moodboardData, the_look: lookItems, hero_image: heroImage });
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

