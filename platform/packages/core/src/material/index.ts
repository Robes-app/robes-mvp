// The material model (legacy material_model.cjs, design "Colour & material, one section",
// 2026-10-24): seven families, 40 materials, ONE material per piece — the one it is mostly made
// of. Its own list, never part of the colour model or the taxonomy: a black waistcoat is as
// easily wool as polyester. A piece stores `material` (one id or null); the family is derived from
// the id, never stored. The ids are a contract shared with the legacy app.

export interface Material {
  id: string;
  name: string;
  // A grey line under the name for the words a label uses instead ("Also nylon").
  hint: string;
  family: string;
}

export interface MaterialFamily {
  id: string;
  name: string;
  materials: Material[];
}

type Row = [id: string, name: string, hint?: string];

// Ordered by how often each turns up in a wardrobe, not alphabetically. A blend files under its
// main fibre; a cloth (denim, velvet…) is named for the cloth.
const FAMS: [id: string, name: string, rows: Row[]][] = [
  [
    'natural',
    'Natural',
    [
      ['cotton', 'Cotton'],
      ['wool', 'Wool'],
      ['linen', 'Linen'],
      ['silk', 'Silk'],
      ['cashmere', 'Cashmere'],
      ['merino', 'Merino'],
      ['mohair', 'Mohair'],
      ['alpaca', 'Alpaca'],
      ['hemp', 'Hemp'],
    ],
  ],
  [
    'cloth',
    'Cloths',
    [
      ['denim', 'Denim'],
      ['jersey', 'Jersey'],
      ['satin', 'Satin'],
      ['velvet', 'Velvet'],
      ['lace', 'Lace'],
      ['corduroy', 'Corduroy'],
      ['tweed', 'Tweed'],
      ['sequin', 'Sequins & glitter'],
    ],
  ],
  [
    'synthetic',
    'Synthetic',
    [
      ['polyester', 'Polyester'],
      ['polyamide', 'Polyamide', 'Also nylon'],
      ['elastane', 'Elastane', 'Also spandex, Lycra'],
      ['acrylic', 'Acrylic'],
    ],
  ],
  [
    'leather',
    'Leather & skins',
    [
      ['leather', 'Leather'],
      ['suede', 'Suede'],
      ['patent', 'Patent leather'],
      ['shearling', 'Shearling'],
      ['nubuck', 'Nubuck'],
      ['exotic', 'Exotic leather', 'Croc, snake, ostrich'],
    ],
  ],
  [
    'regenerated',
    'Plant-based',
    [
      ['viscose', 'Viscose', 'Also rayon'],
      ['lyocell', 'Lyocell', 'Also Tencel'],
      ['modal', 'Modal'],
      ['acetate', 'Acetate'],
      ['cupro', 'Cupro'],
    ],
  ],
  [
    'faux',
    'Faux',
    [
      ['vegan_leather', 'Vegan leather', 'Also PU, faux leather'],
      ['faux_fur', 'Faux fur'],
      ['faux_suede', 'Faux suede'],
      ['vinyl', 'Vinyl & PVC'],
    ],
  ],
  [
    'hard',
    'Accessories',
    [
      ['straw', 'Straw & raffia'],
      ['metal', 'Metal'],
      ['resin', 'Plastic & resin'],
      ['wood', 'Wood'],
    ],
  ],
];

export const MATERIALS: readonly Material[] = [];
export const MATERIAL_FAMILIES: readonly MaterialFamily[] = [];
const BY = new Map<string, Material>();
const FAM_BY = new Map<string, MaterialFamily>();
for (const [fid, fname, rows] of FAMS) {
  const materials = rows.map(([id, name, hint]): Material => {
    const m: Material = { id, name, hint: hint ?? '', family: fid };
    (MATERIALS as Material[]).push(m);
    BY.set(id, m);
    return m;
  });
  const f: MaterialFamily = { id: fid, name: fname, materials };
  (MATERIAL_FAMILIES as MaterialFamily[]).push(f);
  FAM_BY.set(fid, f);
}

export const MATERIAL_IDS: readonly string[] = MATERIALS.map((m) => m.id);
export const MATERIAL_FAMILY_IDS: readonly string[] = MATERIAL_FAMILIES.map((f) => f.id);
// The sheet opens here when nothing is filed.
export const DEFAULT_MATERIAL_FAMILY = 'natural';

// Words people (and care labels) use for a material that isn't its list name. A null maps a word
// that names no one material ("knit" is a construction, not a fibre).
const SYNONYMS: Readonly<Record<string, string | null>> = {
  nylon: 'polyamide',
  spandex: 'elastane',
  lycra: 'elastane',
  rayon: 'viscose',
  tencel: 'lyocell',
  pu: 'vegan_leather',
  'pu leather': 'vegan_leather',
  'faux leather': 'vegan_leather',
  pleather: 'vegan_leather',
  sequins: 'sequin',
  glitter: 'sequin',
  raffia: 'straw',
  pvc: 'vinyl',
  plastic: 'resin',
  croc: 'exotic',
  crocodile: 'exotic',
  snake: 'exotic',
  snakeskin: 'exotic',
  ostrich: 'exotic',
  sheepskin: 'shearling',
  lambswool: 'wool',
  'lambs wool': 'wool',
  'merino wool': 'merino',
  'organic cotton': 'cotton',
  knit: null,
};

// Every way a material is written down: its id, its name, its id with spaces, then a synonym.
const WORDS = new Map<string, string | null>();
for (const m of MATERIALS) {
  WORDS.set(m.id, m.id);
  WORDS.set(m.name.toLowerCase(), m.id);
  WORDS.set(m.id.replaceAll('_', ' '), m.id);
}
for (const [word, id] of Object.entries(SYNONYMS)) if (!WORDS.has(word)) WORDS.set(word, id);

export function material(id: string | null | undefined): Material | null {
  return (id && BY.get(id.toLowerCase())) || null;
}

export function materialFamily(id: string | null | undefined): MaterialFamily | null {
  return (id && FAM_BY.get(id.toLowerCase())) || null;
}

// The family a material sits in (derived, never stored).
export function familyOfMaterial(id: string | null | undefined): MaterialFamily | null {
  const m = material(id);
  return m ? (FAM_BY.get(m.family) ?? null) : null;
}

// The one resolver every write goes through: an id, a display name or a synonym → an id, else
// null. A blend ("95% cotton, 5% elastane") files under the first material it names — the main
// fibre comes first on a label.
export function resolveMaterial(v: string | null | undefined): string | null {
  const s = (v ?? '').trim().toLowerCase();
  if (!s) return null;
  const whole = WORDS.get(s);
  if (whole !== undefined) return whole;
  const parts = s
    .replace(/[0-9%]+/g, ' ')
    .split(/[,/+&;]|\band\b/)
    .map((p) => p.trim())
    .filter(Boolean);
  for (const part of parts) {
    const id = WORDS.get(part);
    if (id) return id;
  }
  return null;
}

// For the analyse prompt: one line per family, "id — Name (hint)".
export function materialPromptBlock(): string {
  return MATERIAL_FAMILIES.map(
    (f) =>
      `${f.name}: ${f.materials
        .map((m) => `${m.id} — ${m.name}${m.hint ? ` (${m.hint.toLowerCase()})` : ''}`)
        .join('; ')}`,
  ).join('\n');
}
