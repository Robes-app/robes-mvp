#!/usr/bin/env node
// The material model's own checks (2026-10-24): the list's shape and order,
// the resolver (ids, names, synonyms, blends), the prompt block, the browser
// file served by the real server and evaluating as a classic script, and the
// analyse route's degrade shape carrying `material`.
// `node scripts/material_model_test.mjs` (port 4336).
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { spawn } from 'child_process';
import vm from 'vm';
const require = createRequire(import.meta.url);
const MM = require('../material_model.cjs');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m); } };

// 1 · the shape
ok(MM.families.length === 7, 'seven families');
ok(MM.families.map(f => f.id).join(',') === 'natural,cloth,synthetic,leather,regenerated,faux,hard', 'families in the design order');
ok(MM.materials.length === 40, '40 materials (got ' + MM.materials.length + ')');
ok(new Set(MM.ids).size === 40, 'material ids unique');
ok(new Set(MM.materials.map(m => m.name.toLowerCase())).size === 40, 'material names unique');
ok(MM.materials.every(m => MM.family(m.family).materials.includes(m.id)), 'each material in exactly one family');
ok(MM.families[0].materials[0] === 'cotton' && MM.families[1].materials[0] === 'denim', 'ordered by how often they turn up (cotton, denim lead)');
ok(MM.familyOf('wool').id === 'natural' && MM.familyOf('vegan_leather').id === 'faux' && MM.familyOf('nope') === null, 'family derived from the id');
ok(MM.material('polyamide').hint === 'Also nylon' && MM.material('cotton').hint === '', 'hints ride the materials that need them');
ok(MM.ids.every(id => /^[a-z_]+$/.test(id)), 'ids are lower snake case (the platform contract)');

// 2 · the resolver
ok(MM.resolve('wool') === 'wool' && MM.resolve('Wool') === 'wool', 'an id or a name, any case');
ok(MM.resolve('Sequins & glitter') === 'sequin' && MM.resolve('Patent leather') === 'patent', 'display names resolve');
ok(MM.resolve('nylon') === 'polyamide' && MM.resolve('Lycra') === 'elastane' && MM.resolve('rayon') === 'viscose' && MM.resolve('Tencel') === 'lyocell', 'synonyms land');
ok(MM.resolve('PU') === 'vegan_leather' && MM.resolve('faux leather') === 'vegan_leather', 'PU / faux leather are vegan leather');
ok(MM.resolve('95% cotton, 5% elastane') === 'cotton', 'a blend files under its main fibre');
ok(MM.resolve('lambswool blend') === 'wool' && MM.resolve('100% silk') === 'silk', 'a label line resolves');
ok(MM.resolve('') === null && MM.resolve(null) === null && MM.resolve('gibberish') === null, 'nothing in, nothing out');

// 3 · the prompt block
const pb = MM.promptBlock();
ok(pb.split('\n').length === 7 && /^Natural: cotton — Cotton; wool — Wool/.test(pb) && /polyamide — Polyamide \(also nylon\)/.test(pb), 'prompt block: seven family lines with ids and hints');

// 4 · the migration adds the column on both tables
const sql = readFileSync(new URL('../supabase/material_migration.sql', import.meta.url), 'utf8');
ok(/wardrobe_items add column if not exists material text/.test(sql) && /wishlist_items add column if not exists material text/.test(sql), 'migration adds material on both tables');

// 5 · the real server serves the file and the analyse degrade carries the key
const PORT = 4336;
const srv = spawn('node', ['server.js'], { env: { ...process.env, PORT: String(PORT), GEMINI_API_KEY: 'x', NOTIFY_TICK: 'off' }, stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise(res => { const on = b => { if (String(b).includes(String(PORT))) res(); }; srv.stdout.on('data', on); srv.stderr.on('data', on); setTimeout(res, 6000); });
try {
  const r = await fetch(`http://127.0.0.1:${PORT}/js/material-model.js`);
  ok(r.ok && /javascript/.test(r.headers.get('content-type') || ''), '/js/material-model.js served as JavaScript');
  const src = await r.text();
  const ctx = { window: {} }; ctx.globalThis = ctx.window;
  vm.runInNewContext(src, ctx);
  ok(ctx.window.RB_MATERIALS && ctx.window.RB_MATERIALS.materials.length === 40, 'the file sets window.RB_MATERIALS as a classic script');
  const a = await fetch(`http://127.0.0.1:${PORT}/api/wardrobe/analyse`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: 'AAAA', mimeType: 'image/png' }) });
  const j = await a.json();
  ok(a.ok && j.analysisFailed === true && 'material' in j && j.material === null, 'analyse degrade carries material: null');
} finally { srv.kill(); }

console.log(`material_model_test: ${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
