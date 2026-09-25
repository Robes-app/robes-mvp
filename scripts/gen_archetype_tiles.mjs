#!/usr/bin/env node
// The Style type deck's imagery — two frames per archetype, generated
// ONCE with the app's own image model and hosted on Cloudinary (the same
// host every look frame lives on), then written into
// public/images/archetypes/manifest.json which the deck reads at open.
//
//   GEMINI_API_KEY=… CLOUDINARY_CLOUD_NAME=… CLOUDINARY_API_KEY=… CLOUDINARY_API_SECRET=… \
//     node scripts/gen_archetype_tiles.mjs [--only Minimal,Utility] [--force] [--dry-run] [--local]
//
// The keys live on Railway, not in a checkout — `railway run node
// scripts/gen_archetype_tiles.mjs` pulls the service's environment in.
// Re-running skips archetypes the manifest already holds unless --force;
// --local writes the PNG bytes beside the manifest instead of hosting
// (heavier in the repo — Cloudinary is the intended home). No faces, no
// people, no logos: each frame is a garment still — the deck asks "does
// this feel like you?", and a face would answer a different question.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'public', 'images', 'archetypes');
const MANIFEST = path.join(OUT_DIR, 'manifest.json');
const args = process.argv.slice(2);
const flag = f => args.includes(f);
const only = (args[args.indexOf('--only') + 1] || '').split(',').map(s => s.trim()).filter(Boolean);
const DRY = flag('--dry-run'), FORCE = flag('--force'), LOCAL = flag('--local');

// Keep the names in step with ARCHETYPES in public/stylenotes.html —
// the deck looks its frames up by name.
const ARCHETYPES = [
  { name: 'Minimal', frames: [
    'a single ivory cashmere crew-neck knit folded on a pale stone surface, one fine gold hoop earring beside it',
    'a pair of straight-leg ecru wool trousers hung on a plain wooden hanger against a warm white wall' ] },
  { name: 'Bohemian', frames: [
    'a tiered cotton maxi skirt in a faded block print laid loosely over a rattan chair, a woven raffia bag at its foot',
    'a cluster of layered thin gold chains and a turquoise pendant on a crumpled linen cloth' ] },
  { name: 'Classic', frames: [
    'a camel double-breasted wool coat on a hanger beside a crisp white poplin shirt, a black leather belt coiled below',
    'a pair of polished black leather loafers and a structured tan leather top-handle bag on a pale wood floor' ] },
  { name: 'Romantic', frames: [
    'a blush silk slip dress with a lace hem pooled on cream bed linen, a pearl drop earring beside it',
    'a rose-pink chiffon blouse with soft gathered sleeves hung in a shaft of morning light' ] },
  { name: 'Sculptural', frames: [
    'an architectural black wool coat with an exaggerated rounded shoulder standing on a form, seen from the side',
    'a pleated ivory dress with a dramatic sculpted volume at the hip, shot flat against a dark grey wall' ] },
  { name: 'Utility', frames: [
    'an olive cotton chore jacket with patch pockets and brass hardware laid flat on a concrete floor',
    'a khaki canvas cargo trouser and a pair of worn tan work boots, a canvas tote beside them' ] },
  { name: 'Heritage', frames: [
    'a fair isle wool jumper in oatmeal and russet folded on a tartan blanket, a leather satchel behind',
    'a brown tweed blazer with elbow patches on a hanger beside a cream cable-knit scarf' ] },
  { name: 'Eclectic', frames: [
    'a leopard-print coat, a cobalt silk scarf and a red patent bag piled together on a velvet chair',
    'a mismatched stack of vintage brooches, chunky resin bangles and a striped knit on a lacquered tray' ] },
  { name: 'Off-duty', frames: [
    'a grey marl hooded sweatshirt and black technical nylon track trousers folded on a bench, white leather trainers below',
    'a black quilted nylon puffer jacket hung on a hook beside a baseball cap and a nylon crossbody bag' ] },
  { name: 'Avant-garde', frames: [
    'an asymmetric black draped jersey top with a single raw-edged sleeve on a form, deep shadow to one side',
    'a pair of black leather square-toed boots and a matte black sculptural cuff on a black stone slab' ] },
];

const STUDIO = 'Editorial still-life fashion photograph, 3:4 portrait. No people, no faces, no hands, no mannequin heads, no text, no logos, no labels. One clean composition, soft natural window light, a warm neutral studio palette, shallow depth of field, luxury campaign aesthetic, quiet and unhurried.';

const slug = n => n.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};

async function host(base64, mime) {
  const { CLOUDINARY_CLOUD_NAME: c, CLOUDINARY_API_KEY: k, CLOUDINARY_API_SECRET: s } = process.env;
  if (!c || !k || !s) throw new Error('Cloudinary env missing (or pass --local)');
  const timestamp = Math.round(Date.now() / 1000);
  const folder = 'robes/archetypes';
  const signature = createHash('sha256').update(`folder=${folder}&timestamp=${timestamp}${s}`).digest('hex');
  const form = new FormData();
  form.append('file', `data:${mime};base64,${base64}`);
  form.append('api_key', k); form.append('timestamp', String(timestamp)); form.append('signature', signature); form.append('folder', folder);
  const r = await fetch(`https://api.cloudinary.com/v1_1/${c}/image/upload`, { method: 'POST', body: form });
  if (!r.ok) throw new Error('Cloudinary ' + r.status + ' ' + (await r.text()).slice(0, 200));
  const d = await r.json();
  // the deck asks for w_640,q_auto,f_auto itself — store the bare URL
  return d.secure_url;
}

async function main() {
  const todo = ARCHETYPES.filter(a => !only.length || only.includes(a.name)).filter(a => FORCE || !(manifest[a.name] && manifest[a.name].length === 2));
  if (!todo.length) { console.log('Nothing to do — the manifest already holds every archetype (pass --force to redo).'); return; }
  if (DRY) {
    todo.forEach(a => a.frames.forEach((f, i) => console.log(`\n[${a.name} · ${i + 1}]\n${f}. ${STUDIO}`)));
    return;
  }
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing');
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const a of todo) {
    const urls = [];
    for (let i = 0; i < a.frames.length; i++) {
      const prompt = `${a.frames[i]}. ${STUDIO}`;
      let part = null;
      for (let attempt = 1; attempt <= 3 && !part; attempt++) {
        if (attempt > 1) await new Promise(r => setTimeout(r, 8000));
        try {
          const r = await Promise.race([
            ai.models.generateContent({
              model: 'gemini-3.1-flash-image',
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              config: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: '3:4' } },
            }),
            new Promise(resolve => setTimeout(() => resolve(null), 60000)),
          ]);
          part = r?.candidates?.[0]?.content?.parts?.find(p => p.inlineData) || null;
          if (!part) console.warn(`  ${a.name} ${i + 1}: no frame (attempt ${attempt})`);
        } catch (e) { console.warn(`  ${a.name} ${i + 1}: ${e.message} (attempt ${attempt})`); }
      }
      if (!part) throw new Error(`${a.name} frame ${i + 1} never landed — re-run with --only ${a.name}`);
      if (LOCAL) {
        const ext = /jpe?g/.test(part.inlineData.mimeType) ? 'jpg' : 'png';
        const file = `${slug(a.name)}-${i + 1}.${ext}`;
        fs.writeFileSync(path.join(OUT_DIR, file), Buffer.from(part.inlineData.data, 'base64'));
        urls.push(`/images/archetypes/${file}`);
      } else {
        urls.push(await host(part.inlineData.data, part.inlineData.mimeType));
      }
      console.log(`  ${a.name} ${i + 1}: ${urls[i]}`);
      await new Promise(r => setTimeout(r, 3000));   // the image model's rate limit — serial, spaced
    }
    manifest[a.name] = urls;
    fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');   // written per archetype — a crash keeps what landed
  }
  console.log(`\nDone — ${MANIFEST}`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
