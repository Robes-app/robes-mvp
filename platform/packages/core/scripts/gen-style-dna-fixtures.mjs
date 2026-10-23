// Regenerates src/style-dna/fixtures/legacy.json by running the legacy style_dna.js (repo root)
// over a fixed input set, so the parity tests prove the TypeScript port. Run after a legacy change:
//   node packages/core/scripts/gen-style-dna-fixtures.mjs [path/to/style_dna.js]   (from platform/)
// Remove with the legacy app at cutover (the fixtures stay).
import { copyFileSync, existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const legacy =
  process.argv[2] ?? fileURLToPath(new URL('../../../../style_dna.js', import.meta.url));
const out = fileURLToPath(new URL('../src/style-dna/fixtures/legacy.json', import.meta.url));
const copy = join(mkdtempSync(join(tmpdir(), 'style-dna-')), 'legacy.mjs');
copyFileSync(legacy, copy);
// Legacy style_dna.js requires its sibling colour model (2026-10-22); it rides along.
const model = join(dirname(legacy), 'colour_model.cjs');
if (existsSync(model)) copyFileSync(model, join(dirname(copy), 'colour_model.cjs'));
const L = await import(pathToFileURL(copy).href);

const U = ['Warm', 'Cool', 'Neutral-Warm', 'Neutral-Cool', undefined];
const C = ['Low', 'Medium', 'High', 'Extremely High', undefined];
const LV = ['Low', 'Medium', 'High'];
const seasons = [];
for (const undertone of U)
  for (const contrast of C)
    for (const chroma of LV)
      for (const lightness of LV)
        seasons.push({
          input: { undertone, contrast, chroma, lightness },
          output: L.classifySeason({ undertone, contrast, chroma, lightness }),
        });
const R = [0.8, 0.95, 1, 1.05, 1.1, 1.15, 1.2, 1.3];
const bodies = [];
for (const shoulder_waist of R)
  for (const hip_waist of R)
    for (const shoulder_hip of R)
      for (const loose_clothing of [false, true])
        bodies.push({
          input: { shoulder_waist, hip_waist, shoulder_hip, loose_clothing },
          output: L.classifyBody({ shoulder_waist, hip_waist, shoulder_hip, loose_clothing }),
        });
const harmony = [
  {
    undertone: 'Warm',
    contrast: 'Low',
    chroma: 'Low',
    lightness: 'Medium',
    skin_tone_hex: '#C8A080',
  },
  {
    undertone: 'Cool',
    contrast: 'High',
    chroma: 'High',
    lightness: 'Medium',
    season: 'True Autumn',
    season_reasoning: 'olive cast',
  },
  { undertone: 'bogus', contrast: 'bogus', low_confidence: true },
  { undertone: 'Neutral-Cool', contrast: 'Extremely High', season: 'Not a season' },
].map((input) => ({ input, output: L.buildColorHarmony(input) }));
const silhouette = [
  { shoulder_waist: 1.3, hip_waist: 1.3, shoulder_hip: 1 },
  {
    shoulder_waist: 1.02,
    hip_waist: 1.03,
    shoulder_hip: 0.98,
    loose_clothing: true,
    body_shape: 'Pear',
    shape_reasoning: 'hips wider',
  },
  { shoulder_waist: 'x', hip_waist: null, shoulder_hip: undefined },
].map((input) => ({ input, output: L.buildSilhouette(input) }));

const ch = L.buildColorHarmony(harmony[0].input).dna;
const sp = L.buildSilhouette(silhouette[0].input).dna;
const brief = {
  loves: ['Long coats', { text: '  wide   trousers ', source: 'edited' }, '', 7],
  avoids: ['Crop tops'],
  rules: [{ text: 'Flat shoes on weekdays', source: 'typed' }],
  notes: 'I dress for  a long commute.',
  colours: { loved: ['navy', 'Camel'], rejected: ['Mustard'] },
};
const memory = {
  entries: [
    { k: 'verdict', v: 1, on: 'Gallery opening', text: 'Exactly me' },
    { k: 'verdict', v: 0, look: 'Brunch', text: '' },
    { k: 'strike', text: 'Loves florals' },
    { k: 'ask', text: 'Make it warmer', on: 'Office look' },
    { k: 'swap', out: 'Heels', in: 'loafers', cat: 'Shoes' },
    { k: 'swap', out: 'Pumps', in: 'trainers', cat: 'shoes' },
    { k: 'swap', out: 'Mules', cat: 'Shoes' },
    { k: 'swap', out: 'Blazer', in: 'cardigan', cat: 'Outerwear' },
    { k: 'wear', look: 'Weekend navy', pieces: 4 },
    { k: 'nonsense', text: 'ignored' },
  ],
};
const prompts = [
  { args: [null, 0, []] },
  { args: [{}, 3, ['Phoebe Philo', '  ', 7, 'The Row']] },
  { args: [{ color_harmony: ch }, 0, []] },
  {
    args: [
      {
        color_harmony: ch,
        silhouette_proportions: sp,
        user_overrides: {
          loved_colors: ['Navy'],
          rejected_colors: ['Mustard'],
          measurements: { waist: '70cm', hips: '' },
        },
      },
      7,
      ['Jane Birkin'],
    ],
  },
  { args: [{ silhouette_proportions: sp }, 20, []] },
  // Synced 2026-10-13: brief, memory, style type, brands, investment + spend, facts, icon tags.
  { args: [{ brief, memory }, 0, []] },
  {
    args: [
      {
        style_archetypes: ['Minimalist', 'Classic'],
        style_archetypes_soft: ['Classic', 'Bohemian'],
      },
      0,
      [],
    ],
  },
  { args: [{ style_archetypes_soft: ['Romantic'] }, 0, ['Zendaya']] },
  {
    args: [
      { icon_tags: { 'Jane Birkin': ' ease ' }, brands: ['Toteme', 'COS'] },
      2,
      ['Jane Birkin', 'Kate Moss'],
    ],
  },
  {
    args: [
      { investment: '€2,000–€5,000', spend: { n: 6, total: 4200, median: 520, verdict: 'above' } },
      0,
      [],
    ],
  },
  {
    args: [
      { investment: '€500', spend: { n: 2, total: 100, median: 50, verdict: 'above' } },
      0,
      [],
    ],
  },
  { args: [{ facts: { height_cm: 168.4, size_uk: 10, shoe_uk: 6, age_band: '35–44' } }, 0, []] },
  { args: [{ facts: { height_cm: 90, size_uk: 50 } }, 0, []] },
  {
    args: [
      {
        color_harmony: ch,
        silhouette_proportions: sp,
        brief,
        memory,
        style_archetypes: ['Minimalist'],
        brands: ['Khaite'],
        investment: '€1,000',
        facts: { size_uk: 12 },
        user_overrides: { loved_colors: ['NAVY', 'Olive'] },
      },
      16,
      ['Phoebe Philo'],
    ],
  },
  { args: [{ brief: { colours: { loved: ['Sage'] } } }, 0, ['Icon']] },
  // Synced 2026-10-19: the hierarchy (hard nos first, rejected colours among them), letterless and
  // duplicate brief lines dropped, a repeated ask once, the balance answer steering the directive.
  {
    args: [
      {
        color_harmony: ch,
        brief: {
          avoids: ['Combat boots', 'combat boots.', '6'],
          rules: ['Covered arms', '  '],
          colours: { rejected: ['Red'] },
        },
        memory: {
          entries: [
            { k: 'ask', text: 'Button up the jacket', on: 'Desk day' },
            { k: 'ask', text: 'Button up the jacket', on: 'Desk day' },
          ],
        },
      },
      9,
      [],
      { balance: 'new' },
    ],
  },
  { args: [{ brief: { avoids: ['Heels'] } }, 0, []] },
].map(({ args }) => ({ args, output: L.styleDnaPromptBlock(...args) }));

const helpers = {
  briefList: [
    brief.loves,
    'nope',
    [{ text: 'x'.repeat(200) }],
    ['6', 'No prints', 'no prints.', { text: '  ' }],
  ].map((a) => ({
    input: a,
    output: L.briefList(a),
  })),
  briefIsEmpty: [null, {}, { notes: '  ' }, brief].map((b) => ({
    input: b,
    output: L.briefIsEmpty(b),
  })),
  factsLines: [{ height_cm: '170' }, null, { age_band: ' 25–34 ' }].map((f) => ({
    input: f,
    output: L.factsLines(f),
  })),
};

writeFileSync(
  out,
  `${JSON.stringify({ seasons, bodies, harmony, silhouette, prompts, helpers }, null, 1)}\n`,
);
console.log(`wrote ${out}: ${prompts.length} prompt cases`);
