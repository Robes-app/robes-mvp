import 'dotenv/config';
import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '20mb' }));
app.use(express.static(join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  },
}));

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
  const { email, rating, comment, prompt, pieceName, pieceLink, looksOutput } = req.body;
  await airtableCreate('Feedback', {
    'Email': email || '',
    ...(rating != null ? { 'Rating': Number(rating) } : {}),
    'User Feedback': comment || '',
    'Prompt': prompt || '',
    'Piece Name': pieceName || '',
    'Piece Link': pieceLink || '',
    'Looks Output': looksOutput || '',
    'Created At': new Date().toISOString().split('T')[0],
  });
  res.json({ ok: true });
});

/* ── style ───────────────────────────────────────────────────────── */
const STYLE_SCHEMA = {
  type: 'object',
  properties: {
    ways: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          eyebrow:     { type: 'string', description: 'Short mood/occasion label e.g. "Corporate to cocktails"' },
          title:       { type: 'string', description: 'Look title e.g. "The sharp three-piece"' },
          outfit:      { type: 'string', description: 'How the piece is worn — what it\'s paired with and why' },
          details:     { type: 'string', description: 'What makes this look work stylistically' },
          accessories: { type: 'string', description: 'Specific accessories to complete the look' },
          tags:        { type: 'array', items: { type: 'string' },
                         description: 'Three key items/concepts for this look' },
        },
        required: ['eyebrow', 'title', 'outfit', 'details', 'accessories', 'tags'],
        additionalProperties: false,
      },
    },
  },
  required: ['ways'],
  additionalProperties: false,
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

  const systemPrompt = `You are an expert fashion stylist known for elegant, directional styling advice. Your tone is warm, precise, and editorial — like a trusted stylist who truly understands clothes. ${who}

When given a key fashion piece, you create three distinct, wearable looks around it — each with a clear occasion and mood. Your descriptions are specific: you name real item types, describe drape and texture, and explain why each pairing works.`;

  const userText = `${piece} ${context} ${linkCtx}

Style this key piece three ways. Make each look genuinely distinct — different occasions, moods, and dressing codes. Be specific about how the piece is worn and what surrounds it. Each look should feel complete and real.`;

  const content = [];
  let photoMatch = null;

  if (photo) {
    photoMatch = photo.match(/^data:([^;]+);base64,(.+)$/);
    if (photoMatch) {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: photoMatch[1], data: photoMatch[2] },
      });
    }
  }

  content.push({ type: 'text', text: userText });

  try {
    // run Claude API + Cloudinary upload in parallel
    const [message, photoUrl] = await Promise.all([
      client.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 2048,
        thinking: { type: 'adaptive' },
        system: systemPrompt,
        messages: [{ role: 'user', content }],
        output_config: {
          format: {
            type: 'json_schema',
            schema: STYLE_SCHEMA,
          },
        },
      }),
      photoMatch ? cloudinaryUpload(photoMatch[2], photoMatch[1]) : Promise.resolve(null),
    ]);

    const text = message.content.find(b => b.type === 'text')?.text ?? '{}';
    const data = JSON.parse(text);
    res.json({ ...data, photoUrl });
  } catch (err) {
    console.error('Claude API error:', err.message);
    res.status(500).json({ error: err.message || 'Styling failed' });
  }
});

app.listen(port, () => {
  console.log(`Robes running at http://localhost:${port}`);
});
