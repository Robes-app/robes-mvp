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

app.post('/api/style', async (req, res) => {
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

      // Never wait more than 25s for any single image
      const timeout = new Promise(resolve => setTimeout(() => { console.warn(`Image ${i} timed out`); resolve(null); }, 25000));
      return Promise.race([imgCall, timeout]);
    }));

    console.log(`Total: ${Date.now() - t0}ms`);
    res.json({ ways, generatedImages, photoUrl, fallback });
  } catch (err) {
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

  // async: upload generated images to Cloudinary, then log to Airtable
  (async () => {
    const lookUrl = `${BASE_URL}/look/${id}`;
    const photoAttachments = [];
    if (photoUrl) photoAttachments.push({ url: photoUrl });

    const genUrls = await Promise.all(
      (generatedImages || []).filter(Boolean).map(src => {
        const m = src.match(/^data:([^;]+);base64,(.+)$/);
        return m ? cloudinaryUpload(m[2], m[1]) : Promise.resolve(null);
      })
    );
    genUrls.filter(Boolean).forEach(url => photoAttachments.push({ url }));

    const looksOutput = ways.map((w, i) =>
      `Look ${i + 1}: ${w.title} (${w.eyebrow})\n${w.outfit}\n${w.details}\n${w.accessories}`
    ).join('\n\n');

    await airtableCreate('Feedback', {
      'Email': email || '',
      'Prompt': prompt || '',
      'Piece Link': lookUrl,
      ...(photoAttachments.length ? { 'Photo': photoAttachments } : {}),
      'Looks Output': looksOutput,
      'Created At': new Date().toISOString().split('T')[0],
    });
  })().catch(err => console.warn('Look log error:', err.message));
});

app.get('/api/look/:id', (req, res) => {
  const look = lookStore.get(req.params.id);
  if (!look) return res.status(404).json({ error: 'Look not found or expired' });
  res.json(look);
});

app.get('/look/:id', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'look.html'));
});

app.listen(port, () => {
  console.log(`Robes running at http://localhost:${port}`);
});
