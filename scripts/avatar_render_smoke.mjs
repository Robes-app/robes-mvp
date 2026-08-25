#!/usr/bin/env node
/*
 * Avatar render smoke — live validation of POST /api/avatar/render against
 * a deployed server (the Gemini + Cloudinary keys live on Railway, so this
 * runs against beta rather than locally). Prints Cloudinary URLs to eyeball.
 *
 *   node scripts/avatar_render_smoke.mjs                         # one look
 *   node scripts/avatar_render_smoke.mjs --runs 5                # drift: same avatar, five outfits
 *   node scripts/avatar_render_smoke.mjs --avatar w-s2-h0-pe     # any catalog cell
 *   node scripts/avatar_render_smoke.mjs --base http://localhost:8080
 *
 * The first run on a fresh cell generates the avatar reference too, so it
 * takes ~2 generations (~90s). Subsequent runs re-feed the stored reference.
 * Drift is the check that matters: does she read as the SAME woman across
 * every outfit? (Proposal §4.3 — the highest unmitigated risk.)
 */
const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : dflt; };
const BASE = (opt('base', 'https://beta.byrobes.com')).replace(/\/$/, '');
const AVATAR = opt('avatar', 'w-s5-h1-hg');
const RUNS = Math.max(1, Number(opt('runs', 1)));

// Deliberately includes the brief's failure modes: fine tailoring detail
// (the five gold buttons), distinctive footwear, prints, texture.
const OUTFITS = [
  [ { name: 'black tailored waistcoat with five gold buttons', category: 'Outerwear', color: 'Black', brand: 'Balmain' },
    { name: 'pink barrel-leg jeans', category: 'Bottoms', color: 'Pink' },
    { name: 'red canvas high-top plimsolls with white toe cap', category: 'Shoes', color: 'Red', brand: 'Converse' } ],
  [ { name: 'cream silk slip dress', category: 'Dresses', color: 'Cream' },
    { name: 'black leather biker jacket', category: 'Outerwear', color: 'Black' },
    { name: 'gold strappy flat sandals', category: 'Shoes', color: 'Gold' } ],
  [ { name: 'navy pinstripe blazer', category: 'Outerwear', color: 'Navy' },
    { name: 'white ribbed tank top', category: 'Tops', color: 'White' },
    { name: 'wide-leg ecru linen trousers', category: 'Bottoms', color: 'Ecru' },
    { name: 'woven raffia tote bag', category: 'Bags', color: 'Natural' } ],
  [ { name: 'leopard-print midi skirt', category: 'Bottoms', color: 'Multi' },
    { name: 'black fine-knit polo neck', category: 'Tops', color: 'Black' },
    { name: 'black knee-high leather boots', category: 'Shoes', color: 'Black' } ],
  [ { name: 'oversized grey wool coat', category: 'Outerwear', color: 'Grey' },
    { name: 'sheer white organza blouse', category: 'Tops', color: 'White' },
    { name: 'straight-leg dark indigo jeans', category: 'Bottoms', color: 'Indigo' },
    { name: 'white leather trainers', category: 'Shoes', color: 'White' } ],
];

async function renderOne(pieces, n) {
  const t0 = Date.now();
  const res = await fetch(BASE + '/api/avatar/render', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ avatarId: AVATAR, pieces }),
  });
  if (!res.ok) { console.log(`  run ${n}: HTTP ${res.status} — ${(await res.text()).slice(0, 200)}`); return null; }
  const { jobId } = await res.json();
  process.stdout.write(`  run ${n}: job ${jobId} `);
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    process.stdout.write('.');
    const jr = await fetch(BASE + '/api/images/' + jobId);
    if (!jr.ok) { console.log(' job expired'); return null; }
    const job = await jr.json();
    if (job.images && job.images[0]) {
      console.log(`\n  run ${n} → ${job.images[0]}  (${Math.round((Date.now() - t0) / 1000)}s)`);
      return job.images[0];
    }
    if (job.done) { console.log(' failed (job done, no image — check generation_log / Railway logs)'); return null; }
  }
  console.log(' timed out (5 min)');
  return null;
}

console.log(`Avatar render smoke → ${BASE}  avatar ${AVATAR}  ${RUNS} run(s)`);
const urls = [];
for (let i = 0; i < RUNS; i++) {
  const u = await renderOne(OUTFITS[i % OUTFITS.length], i + 1);
  if (u) urls.push(u);
}
console.log(`\n${urls.length}/${RUNS} rendered.`);
if (RUNS > 1 && urls.length > 1) console.log('Drift check: open these side by side — is she the same woman in every frame?');
urls.forEach(u => console.log('  ' + u));
process.exit(urls.length ? 0 : 1);
