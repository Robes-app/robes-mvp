// Liberty's landscapes in the prompt (2026-10-29): the place she names decides the weather, and a
// landscape is a practical input, never a style. Three layers:
//  1. landscapes.js is the generated copy of platform/packages/core/src/landscape (drift check —
//     skipped, with a note, when platform/ has no node_modules).
//  2. the reader and the weather line, on their own.
//  3. the REAL server.js, booted with Gemini and Open-Meteo stubbed by a fetch preload: the prompt
//     /api/style and /api/daily send is captured and read.
// Exit code 0 = all passed.
import { spawn } from 'child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { placeWeatherLine, readPlace, PLACE_RULE } from '../landscapes.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0;
let fail = 0;
const ok = (cond, label) => {
  if (cond) pass++;
  else {
    fail++;
    console.log('  ✗', label);
  }
};

// 1 · drift
const pnpmDir = join(root, 'platform/node_modules/.pnpm');
if (existsSync(pnpmDir)) {
  const pkg = readdirSync(pnpmDir).filter((d) => /^esbuild@/.test(d)).sort().pop();
  const require = createRequire(join(pnpmDir, pkg, 'node_modules/esbuild/package.json'));
  const { code } = require('esbuild').transformSync(
    readFileSync(join(root, 'platform/packages/core/src/landscape/index.ts'), 'utf8'),
    { loader: 'ts', format: 'esm', target: 'es2022' },
  );
  const copy = readFileSync(join(root, 'landscapes.js'), 'utf8');
  ok(copy.endsWith(code), 'landscapes.js matches the platform source (run node scripts/gen_landscapes.mjs)');
} else {
  console.log('  (drift check skipped: no platform/node_modules)');
}

// 2 · the reader
ok(readPlace('a weekend by the sea').landscapes.join() === 'coast', 'by the sea → coast');
ok(readPlace('a city by the sea').landscapes.join() === 'city,coast', 'two landscapes coexist');
ok(readPlace('a casual Thursday').landscapes.length === 0, 'an ordinary day names no place');
ok(readPlace('A weekend in Lisbon').destination === 'Lisbon', 'a capitalised place is captured');
ok(readPlace('drinks at Sketch').destination === null, '"at" a restaurant is never a place');
ok(readPlace('the resort collection').landscapes.length === 0, 'resort the season is not a place');
const home = { city: 'London', tempRange: '8°C – 13°C', condition: 'Rain' };
ok(
  placeWeatherLine({ dayLabel: null, month: 'October', home, read: readPlace('a casual Thursday'), there: null }).line ===
    'Real-time context: London · October | 8°C – 13°C | Rain. Dress the user for exactly this weather and place.',
  'an ordinary day keeps the line it always had',
);

// 3 · the real server
const dir = mkdtempSync(join(tmpdir(), 'rb-place-'));
const capture = join(dir, 'gemini.jsonl');
const stub = join(dir, 'stub.mjs');
writeFileSync(
  stub,
  `import { appendFileSync } from 'fs';
const real = globalThis.fetch;
const json = (b) => new Response(JSON.stringify(b), { status: 200, headers: { 'content-type': 'application/json' } });
globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input.url;
  if (url.includes('generativelanguage.googleapis.com')) {
    appendFileSync(${JSON.stringify(capture)}, (init && init.body ? String(init.body) : '{}').replace(/\\n/g, ' ') + '\\n');
    return json({ candidates: [{ content: { parts: [{ text: '{}' }], role: 'model' } }] });
  }
  if (url.includes('geocoding-api.open-meteo.com')) {
    const name = new URL(url).searchParams.get('name') || '';
    if (/^london$/i.test(name)) return json({ results: [{ name: 'London', country: 'United Kingdom', latitude: 51.51, longitude: -0.13, feature_code: 'PPLC', population: 8900000 }] });
    if (/^lisbon$/i.test(name)) return json({ results: [{ name: 'Lisbon', country: 'Portugal', latitude: 38.72, longitude: -9.14, feature_code: 'PPLC', population: 500000 }] });
    return json({});
  }
  if (url.includes('open-meteo.com')) return json({ daily: { temperature_2m_max: [21.2], temperature_2m_min: [14.6], weather_code: [0] } });
  if (url.startsWith('http://127.0.0.1') || url.startsWith('http://localhost')) return real(input, init);
  return json({});
};`,
);
const PORT = 4391;
const server = spawn(process.execPath, ['--import', stub, 'server.js'], {
  cwd: root,
  env: { ...process.env, PORT: String(PORT), GEMINI_API_KEY: 'test', SUPABASE_SERVICE_ROLE_KEY: '', NOTIFY_TICK: '' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let out = '';
server.stdout.on('data', (d) => (out += d));
server.stderr.on('data', (d) => (out += d));
const base = `http://127.0.0.1:${PORT}`;
const up = async () => {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(base + '/api/health')).ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
};
const sent = () =>
  existsSync(capture)
    ? readFileSync(capture, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))
    : [];
const promptOf = (body) =>
  JSON.stringify([body.systemInstruction, body.contents]).replace(/\\n/g, '\n');
const post = (path, body) =>
  fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
const ctx = { city: 'London', month: 'October', tempRange: '8°C – 13°C', condition: 'Rain' };

try {
  ok(await up(), 'server.js boots with landscapes.js');
  let n = sent().length;
  await post('/api/style', { intent: 'dress-me', prompt: 'A weekend in Lisbon, walking a lot', context: ctx });
  let p = promptOf(sent()[n] || {});
  ok(p.includes('She is dressing for Lisbon, Portugal. Forecast there: 15–21°C, clear skies.'), '/api/style: the forecast there');
  ok(!p.includes('London'), '/api/style: never her home city');
  ok(p.includes('the hero piece for the weather, the place and what she does there'), '/api/style: the anchor reads the place');
  ok(p.includes(PLACE_RULE), '/api/style: the place rule');

  n = sent().length;
  await post('/api/style', { intent: 'dress-me', prompt: 'a coastal walk then lunch', context: ctx });
  p = promptOf(sent()[n] || {});
  ok(p.includes('THE PLACE — the coast · walking.'), '/api/style: THE PLACE for a landscape');
  ok(p.includes('Where she is now: London · October | 8°C – 13°C | Rain.'), '/api/style: her weather demoted to a guide');

  n = sent().length;
  await post('/api/style', { intent: 'dress-me', prompt: 'a casual Thursday', context: ctx });
  p = promptOf(sent()[n] || {});
  ok(p.includes('Real-time context: London · October | 8°C – 13°C | Rain. Dress the user for exactly this weather and place.'), '/api/style: an ordinary day unchanged');
  ok(!p.includes('THE PLACE —'), '/api/style: no place block on an ordinary day');

  n = sent().length;
  await post('/api/daily', { prompt: 'Lunch in Lisbon', context: ctx, noImages: true });
  p = promptOf(sent()[n] || {});
  ok(p.includes('She is dressing for Lisbon, Portugal. Forecast there: 15–21°C, clear skies.'), '/api/daily: the forecast there');
  ok(!p.includes('REAL-TIME CONTEXT'), '/api/daily: not her home forecast');
  ok(p.includes(PLACE_RULE), '/api/daily: the place rule');
} finally {
  server.kill();
}
if (fail) console.log(out.split('\n').slice(-15).join('\n'));
console.log(`landscape_test: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
