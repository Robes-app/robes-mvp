#!/usr/bin/env node
// The colour model's own checks (2026-10-22): the list's shape, the legacy
// map, the resolver, the generated migration in step with the model, the
// browser file served by the real server and evaluating as a classic
// script, and the analyse route's degrade shape carrying the new keys.
// `node scripts/colour_model_test.mjs` (port 4335).
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { spawn } from 'child_process';
import vm from 'vm';
const require = createRequire(import.meta.url);
const CM = require('../colour_model.cjs');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m); } };

// 1 · the shape
ok(CM.FAMILIES.length === 13, '13 families');
ok(CM.SHADES.length === 74, '74 shades (got ' + CM.SHADES.length + ')');
ok(CM.PATTERNS.length === 13 && CM.PATTERNS.filter(p => p.pref).length === 10, '13 patterns, 10 in preferences');
ok(new Set(CM.SHADES.map(s => s.id)).size === 74, 'shade ids unique');
ok(new Set(CM.SHADES.map(s => s.name.toLowerCase())).size === 74, 'shade names unique');
ok(CM.SHADES.every(s => CM.family(s.family) && CM.family(s.family).shades.includes(s)), 'each shade in exactly one family');
ok(CM.FAMILIES.every(f => f.tile.length === 4 && f.tile.every(t => t.family === f.id)), 'every tile is four of its own shades');
ok(CM.family('neutrals').tile.some(t => t.id === 'camel') && CM.family('greens').tile.some(t => t.id === 'olive'), 'camel on Neutrals, olive on Greens');
ok(CM.FAMILIES[12].id === 'metallics' && !CM.FAMILIES.some(f => /neon/i.test(f.name)), 'Metallics last, no Neons row');
ok(CM.SHADES.filter(s => s.neon).every(s => s.family !== 'metallics') && CM.SHADES.filter(s => s.neon).length === 5, 'five neons, inside their hue families');
ok(CM.SHADES.filter(s => s.metallic).every(s => /gradient/.test(s.css)), 'metallics draw a sheen');
ok(['optic', 'ivory', 'powder', 'chalk'].every(id => CM.shade(id).light && CM.shade(id).edge !== 'none'), 'light shades carry an edge');
ok(CM.SHADES.every(s => /^#[0-9A-F]{6}$/i.test(s.hex)), 'every shade has a 6-digit hex');

// 2 · the retired wheel maps whole
const WHEEL = ['White', 'Cream', 'Navy', 'Charcoal', 'Black', 'Espresso', 'Camel', 'Taupe', 'Olive', 'Aubergine', 'Forest', 'Bordeaux', 'Blush', 'Ochre', 'Magenta', 'Cobalt', 'Emerald', 'Vermillion', 'Acid'];
ok(WHEEL.every(n => CM.shadeByName(n)), 'all 19 coloured wheel names resolve');
ok(CM.shadeByName('Vermillion').id === 'scarlet' && CM.shadeByName('Magenta').id === 'fuchsia' && CM.shadeByName('Black').id === 'jet', 'the three renamed wheel colours land');
ok(!CM.shadeByName('Multi') && !CM.shadeByName('Print') && !CM.shadeByName(''), 'Multi / Print / empty resolve to nothing');
ok(CM.shadeByName('soft BLACK').id === 'softblack', 'display names resolve case-insensitively');

// 3 · the resolver
ok(CM.resolve({ id: 'navy' }).id === 'navy', 'resolve by id');
ok(CM.resolve({ id: 'nope', name: 'Charcoal' }).id === 'charcoal', 'a bad id falls to the name');
ok(CM.resolve({ hex: '#D2B48C' }).family === 'neutrals', 'nearest hex lands in the right family');
ok(CM.nearest('#C9A24A').id !== 'gold', 'nearest never answers a metallic');
ok(CM.resolve({}) === null, 'nothing in, nothing out');
ok(CM.pattern('plain').id === 'plain' && CM.pattern('STRIPES').id === 'stripes' && CM.pattern('zig') === null, 'pattern lookup');

// 4 · preference words (phase 4's map)
ok(CM.preference('red').family === 'reds' && !CM.preference('red').shade, 'a plain word is a family');
ok(CM.preference('Navy').shade === 'navy' && CM.preference('Navy').family === 'blues', 'a shade name is a shade');
ok(CM.preference('gold').shade === 'gold', 'gold is a shade');
ok(CM.preference('turquoise') === null, 'an unknown word is null');

// 5 · the prompt block
const pb = CM.promptBlock();
ok(pb.split('\n').length === 14 && /^Blacks: jet \(Jet\)/.test(pb) && /PATTERNS: plain \(no print\), stripes/.test(pb), 'prompt block: 13 family lines + patterns');

// 6 · the generated migration is in step with the model
const sql = readFileSync(new URL('../supabase/colour_model_migration.sql', import.meta.url), 'utf8');
ok(CM.SHADES.every(s => sql.includes(`when '${s.name.toLowerCase().replace(/'/g, "''")}' then '${s.id}'`)), 'migration maps every display name');
ok(WHEEL.every(n => sql.includes(`when '${n.toLowerCase()}' then '${CM.shadeByName(n).id}'`)), 'migration maps every wheel name');
ok(/add column if not exists colour_shade text/.test(sql) && /colour_extra text\[\]/.test(sql) && /add column if not exists print text/.test(sql), 'migration adds the three columns');

// 7 · the real server serves the file and the analyse degrade carries the keys
const PORT = 4335;
const srv = spawn('node', ['server.js'], { env: { ...process.env, PORT: String(PORT), GEMINI_API_KEY: 'x', NOTIFY_TICK: 'off' }, stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise(res => { const on = b => { if (String(b).includes(String(PORT))) res(); }; srv.stdout.on('data', on); srv.stderr.on('data', on); setTimeout(res, 6000); });
try {
  const r = await fetch(`http://127.0.0.1:${PORT}/js/colour-model.js`);
  ok(r.ok && /javascript/.test(r.headers.get('content-type') || ''), '/js/colour-model.js served as JavaScript');
  const src = await r.text();
  const ctx = { window: {} }; ctx.globalThis = ctx.window;
  vm.runInNewContext(src, ctx);
  ok(ctx.window.RB_COLOURS && ctx.window.RB_COLOURS.SHADES.length === 74, 'the file sets window.RB_COLOURS as a classic script');
  const a = await fetch(`http://127.0.0.1:${PORT}/api/wardrobe/analyse`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: 'AAAA', mimeType: 'image/png' }) });
  const j = await a.json();
  ok(a.ok && j.analysisFailed === true && 'colour_shade' in j && Array.isArray(j.colour_extra) && 'print' in j, 'analyse degrade carries colour_shade / colour_extra / print');
} finally { srv.kill(); }

console.log(`colour_model_test: ${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
