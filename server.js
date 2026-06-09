import 'dotenv/config';
import express from 'express';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '20mb' }));
app.use(express.static(join(__dirname, 'public')));

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/* ── waitlist ────────────────────────────────────────────────────── */
const WAITLIST_FILE = join(__dirname, 'data', 'waitlist.json');

function loadWaitlist() {
  if (!existsSync(WAITLIST_FILE)) return [];
  try { return JSON.parse(readFileSync(WAITLIST_FILE, 'utf8')); } catch { return []; }
}

function saveWaitlist(list) {
  writeFileSync(WAITLIST_FILE, JSON.stringify(list, null, 2));
}

app.post('/api/waitlist', async (req, res) => {
  const { email } = req.body;
  if (!email || !/.+@.+\..+/.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  const list = loadWaitlist();
  const existing = list.find(e => e.email.toLowerCase() === email.toLowerCase());
  if (!existing) {
    list.push({ email, joinedAt: new Date().toISOString() });
    saveWaitlist(list);
  }

  // Optional: send confirmation email via Resend
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.RESEND_FROM || 'Robes <hello@my-robes.com>',
        to: email,
        subject: "You're on the Robes waitlist",
        html: `<p>You're on the list. We'll be in touch soon.</p><p>— Robes</p>`,
      });
    } catch (err) {
      console.warn('Resend error (non-fatal):', err.message);
    }
  }

  res.json({ ok: true, position: list.length });
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

  // attach image if present
  if (photo) {
    const match = photo.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: match[1], data: match[2] },
      });
    }
  }

  content.push({ type: 'text', text: userText });

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 2048,
      thinking: { type: 'adaptive' },
      system: systemPrompt,
      messages: [{ role: 'user', content }],
      output_config: {
        format: {
          type: 'json_schema',
          name: 'styling_looks',
          schema: STYLE_SCHEMA,
        },
      },
    });

    const text = message.content.find(b => b.type === 'text')?.text ?? '{}';
    const data = JSON.parse(text);
    res.json(data);
  } catch (err) {
    console.error('Claude API error:', err.message);
    res.status(500).json({ error: err.message || 'Styling failed' });
  }
});

app.listen(port, () => {
  console.log(`Robes running at http://localhost:${port}`);
});
