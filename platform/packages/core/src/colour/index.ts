// The colour and pattern model (legacy colour_model.cjs, 2026-10-22): ONE source for every
// surface — 13 families, 74 named shades (each in exactly one family) and 13 patterns. The
// analyse prompt, the piece sheet, Refine, Your colours / Your prints and the database's check
// constraints (gen:sql) all read this list, so they can never drift.

export interface Shade {
  id: string;
  name: string;
  hex: string;
  family: string;
  neon: boolean;
  metallic: boolean;
  // What a swatch paints with: the hex, or a metallic's sheen gradient (web only).
  css: string;
  // A light shade needs a hairline edge to read on cream.
  light: boolean;
}

export interface ColourFamily {
  id: string;
  name: string;
  shades: Shade[];
  // The four shades the family tile is built from.
  tile: Shade[];
}

export interface Pattern {
  id: string;
  name: string;
  // Offered as a preference (Your prints); tie-dye, camouflage and other only tag a piece.
  pref: boolean;
  css: string;
}

type Row = [id: string, name: string, hex: string, neon?: 1 | 0, gradient?: string];

const SH: Record<string, Row[]> = {
  blacks: [
    ['jet', 'Jet', '#0D0D0E'],
    ['softblack', 'Soft black', '#1F1E1D'],
    ['blueblack', 'Blue-black', '#151922'],
    ['brownblack', 'Brown-black', '#241D1A'],
  ],
  greys: [
    ['charcoal', 'Charcoal', '#46464A'],
    ['slate', 'Slate', '#6B6E73'],
    ['ash', 'Ash', '#8E8C88'],
    ['greymarl', 'Grey marl', '#A7A5A1'],
    ['dove', 'Dove', '#C4C2BE'],
  ],
  whites: [
    ['optic', 'Optic white', '#FFFFFF'],
    ['ivory', 'Ivory', '#FBF7EC'],
    ['chalk', 'Chalk', '#F3F1EC'],
    ['cream', 'Cream', '#F5EDDC'],
    ['ecru', 'Ecru', '#EDE5D2'],
  ],
  neutrals: [
    ['oat', 'Oat', '#E4D9C4'],
    ['sand', 'Sand', '#D6C3A0'],
    ['camel', 'Camel', '#C19A6B'],
    ['stone', 'Stone', '#BDB3A2'],
    ['taupe', 'Taupe', '#A08E7C'],
    ['khaki', 'Khaki', '#B3A57E'],
  ],
  browns: [
    ['espresso', 'Espresso', '#3A2620'],
    ['chocolate', 'Chocolate', '#4E3024'],
    ['mocha', 'Mocha', '#6E4C3C'],
    ['cognac', 'Cognac', '#9A5B32'],
    ['rust', 'Rust', '#9C4A2B'],
    ['tan', 'Tan', '#B07A4F'],
  ],
  greens: [
    ['bottle', 'Bottle', '#1F3D2E'],
    ['forest', 'Forest', '#2F4A36'],
    ['olive', 'Olive', '#6B6A3A'],
    ['emerald', 'Emerald', '#1E7A55'],
    ['sage', 'Sage', '#9AA284'],
    ['mint', 'Mint', '#BFDCC7'],
    ['lime', 'Lime', '#A6E22E', 1],
  ],
  blues: [
    ['navy', 'Navy', '#1F2A44'],
    ['denim', 'Denim', '#4B6C92'],
    ['cobalt', 'Cobalt', '#1F4FB0'],
    ['teal', 'Teal', '#2D6E73'],
    ['sky', 'Sky', '#8DB6DA'],
    ['powder', 'Powder blue', '#C9DBEA'],
    ['electricblue', 'Electric blue', '#2E5BFF', 1],
  ],
  purples: [
    ['aubergine', 'Aubergine', '#3F2338'],
    ['plum', 'Plum', '#6B3557'],
    ['violet', 'Violet', '#5B2A86'],
    ['mauve', 'Mauve', '#9C7C8C'],
    ['lavender', 'Lavender', '#A898C4'],
    ['lilac', 'Lilac', '#D2C4DE'],
  ],
  reds: [
    ['oxblood', 'Oxblood', '#4A1519'],
    ['bordeaux', 'Bordeaux', '#5E1A24'],
    ['burgundy', 'Burgundy', '#74202F'],
    ['cherry', 'Cherry', '#A31F2E'],
    ['scarlet', 'Scarlet', '#C8262E'],
    ['brick', 'Brick', '#A3473A'],
  ],
  pinks: [
    ['powderpink', 'Powder pink', '#F4D9DE'],
    ['blush', 'Blush', '#EBCBC4'],
    ['dustyrose', 'Dusty rose', '#C99A9A'],
    ['rose', 'Rose', '#D97A93'],
    ['fuchsia', 'Fuchsia', '#C2246F'],
    ['hotpink', 'Hot pink', '#FF3E9A', 1],
  ],
  oranges: [
    ['terracotta', 'Terracotta', '#B8603F'],
    ['burntorange', 'Burnt orange', '#C0561E'],
    ['coral', 'Coral', '#E9765E'],
    ['apricot', 'Apricot', '#F0B07A'],
    ['neonorange', 'Neon orange', '#FF6A13', 1],
  ],
  yellows: [
    ['ochre', 'Ochre', '#C2922A'],
    ['mustard', 'Mustard', '#CFA33A'],
    ['saffron', 'Saffron', '#E8A92A'],
    ['lemon', 'Lemon', '#F1D84A'],
    ['butter', 'Butter', '#F2E2A0'],
    ['acid', 'Acid', '#DDF23A', 1],
  ],
  metallics: [
    [
      'gold',
      'Gold',
      '#C9A24A',
      0,
      'linear-gradient(135deg,#F1E0A6 0%,#B8923A 45%,#EBD48C 65%,#8E6E28 100%)',
    ],
    [
      'silver',
      'Silver',
      '#BFC1C5',
      0,
      'linear-gradient(135deg,#F4F4F5 0%,#A6A8AC 45%,#E4E5E8 65%,#7F8287 100%)',
    ],
    [
      'bronze',
      'Bronze',
      '#A8703F',
      0,
      'linear-gradient(135deg,#E0AA72 0%,#8C5A2E 45%,#C98D55 65%,#5E391C 100%)',
    ],
    [
      'rosegold',
      'Rose gold',
      '#D9A592',
      0,
      'linear-gradient(135deg,#F6D3C4 0%,#BF8775 45%,#EBC0AE 65%,#94604F 100%)',
    ],
    [
      'gunmetal',
      'Gunmetal',
      '#5A5D63',
      0,
      'linear-gradient(135deg,#9A9DA3 0%,#45484E 45%,#7A7E85 65%,#26282C 100%)',
    ],
  ],
};

const FAMS: [id: string, name: string, tile: string[]][] = [
  ['blacks', 'Blacks', ['jet', 'softblack', 'brownblack', 'blueblack']],
  ['greys', 'Greys', ['charcoal', 'ash', 'slate', 'dove']],
  ['whites', 'Whites', ['optic', 'ivory', 'ecru', 'chalk']],
  ['neutrals', 'Neutrals', ['oat', 'sand', 'camel', 'taupe']],
  ['browns', 'Browns', ['espresso', 'mocha', 'cognac', 'tan']],
  ['greens', 'Greens', ['olive', 'forest', 'sage', 'emerald']],
  ['blues', 'Blues', ['navy', 'cobalt', 'denim', 'powder']],
  ['purples', 'Purples', ['aubergine', 'plum', 'lavender', 'lilac']],
  ['reds', 'Reds', ['bordeaux', 'cherry', 'scarlet', 'brick']],
  ['pinks', 'Pinks', ['blush', 'dustyrose', 'rose', 'fuchsia']],
  ['oranges', 'Oranges', ['terracotta', 'burntorange', 'apricot', 'coral']],
  ['yellows', 'Yellows', ['ochre', 'mustard', 'butter', 'lemon']],
  ['metallics', 'Metallics', ['gold', 'silver', 'bronze', 'rosegold']],
];

const I = '#202021';
const C = '#FAF8F5';
const SAND = '#E4D3B4';
const TIEDYE = ['#8E7077', '#D4C8C4', '#7E7C5A', '#E7E0CF'] as const;
const CAMO = ['#8C8A63', '#4E5134', '#6E5B3E'] as const;

// The colours a print is drawn in, for a surface that can't paint its css (native draws each print
// as SVG from these). Model data, like a shade's hex, not design tokens.
export const PATTERN_PAINT = {
  ink: I,
  ground: C,
  sand: SAND,
  tiedye: TIEDYE,
  camo: CAMO,
} as const;
const PATS: [id: string, name: string, pref: boolean, css: string][] = [
  ['stripes', 'Stripes', true, `repeating-linear-gradient(0deg,${I} 0 3px,${C} 3px 7px)`],
  [
    'checks',
    'Checks & gingham',
    true,
    `repeating-linear-gradient(0deg,rgba(32,32,33,.42) 0 6px,transparent 6px 12px),repeating-linear-gradient(90deg,rgba(32,32,33,.42) 0 6px,transparent 6px 12px),${C}`,
  ],
  [
    'plaid',
    'Plaid & tartan',
    true,
    `repeating-linear-gradient(90deg,rgba(32,32,33,.75) 0 4px,transparent 4px 10px,rgba(32,32,33,.22) 10px 19px,transparent 19px 24px),repeating-linear-gradient(0deg,rgba(32,32,33,.75) 0 4px,transparent 4px 10px,rgba(32,32,33,.22) 10px 19px,transparent 19px 24px),${C}`,
  ],
  [
    'houndstooth',
    'Houndstooth',
    true,
    `linear-gradient(45deg,${I} 25%,transparent 25%,transparent 75%,${I} 75%) 0 0/10px 10px,linear-gradient(45deg,${I} 25%,${C} 25%,${C} 75%,${I} 75%) 5px 5px/10px 10px`,
  ],
  ['dots', 'Dots', true, `radial-gradient(${I} 2.4px,transparent 2.9px) 0 0/10px 10px,${C}`],
  [
    'florals',
    'Florals',
    true,
    `radial-gradient(circle at 50% 30%,${I} 0 2.6px,transparent 3px) 0 0/16px 16px,radial-gradient(circle at 30% 50%,${I} 0 2.6px,transparent 3px) 0 0/16px 16px,${C}`,
  ],
  [
    'animal',
    'Animal prints',
    true,
    `radial-gradient(ellipse 5px 3.5px at 22% 28%,${I} 85%,transparent 100%) 0 0/22px 22px,radial-gradient(ellipse 3.5px 5px at 72% 40%,${I} 85%,transparent 100%) 0 0/22px 22px,${SAND}`,
  ],
  [
    'paisley',
    'Paisley',
    true,
    `radial-gradient(ellipse 5px 7px at 36% 44%,${I} 92%,transparent 100%) 0 0/20px 20px,${C}`,
  ],
  [
    'graphic',
    'Graphic & logo',
    true,
    `radial-gradient(circle at 50% 50%,${I} 0 8px,${C} 8.5px 12px,${I} 12.5px 14px,transparent 14.5px),${C}`,
  ],
  [
    'abstract',
    'Abstract & geometric',
    true,
    `conic-gradient(from 45deg,${I} 0 25%,${C} 0 50%,${I} 0 75%,${C} 0) 0 0/24px 24px`,
  ],
  [
    'tiedye',
    'Tie-dye',
    false,
    `repeating-radial-gradient(circle at 50% 50%,${TIEDYE[0]} 0 3px,${TIEDYE[1]} 3px 6px,${TIEDYE[2]} 6px 9px,${TIEDYE[3]} 9px 12px)`,
  ],
  [
    'camo',
    'Camouflage',
    false,
    `radial-gradient(ellipse 8px 6px at 20% 30%,${CAMO[1]} 90%,transparent) 0 0/24px 24px,radial-gradient(ellipse 7px 9px at 65% 70%,${CAMO[2]} 90%,transparent) 0 0/24px 24px,${CAMO[0]}`,
  ],
  [
    'other',
    'Other',
    false,
    `repeating-linear-gradient(45deg,rgba(32,32,33,.5) 0 1px,transparent 1px 6px),${C}`,
  ],
];

// The retired 21-swatch wheel (and the v1/v2 analyse's colour list) → a shade.
export const LEGACY_COLOURS: Readonly<Record<string, string>> = {
  white: 'optic',
  cream: 'cream',
  navy: 'navy',
  charcoal: 'charcoal',
  black: 'jet',
  espresso: 'espresso',
  camel: 'camel',
  taupe: 'taupe',
  olive: 'olive',
  aubergine: 'aubergine',
  forest: 'forest',
  bordeaux: 'bordeaux',
  blush: 'blush',
  ochre: 'ochre',
  magenta: 'fuchsia',
  cobalt: 'cobalt',
  emerald: 'emerald',
  vermillion: 'scarlet',
  acid: 'acid',
};

// Plain colour words a preference may carry → a family.
const WORDS: Readonly<Record<string, string>> = Object.fromEntries(
  [
    ['black', 'blacks'],
    ['grey', 'greys'],
    ['gray', 'greys'],
    ['white', 'whites'],
    ['neutral', 'neutrals'],
    ['beige', 'neutrals'],
    ['brown', 'browns'],
    ['green', 'greens'],
    ['blue', 'blues'],
    ['purple', 'purples'],
    ['red', 'reds'],
    ['pink', 'pinks'],
    ['orange', 'oranges'],
    ['yellow', 'yellows'],
    ['metallic', 'metallics'],
  ].flatMap(([w, f]) => [
    [w, f],
    [`${w}s`, f],
  ]),
);

const lum = (hex: string): number => {
  const n = Number.parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};

export const SHADES: readonly Shade[] = [];
export const COLOUR_FAMILIES: readonly ColourFamily[] = [];
const BY = new Map<string, Shade>();
const BY_NAME = new Map<string, Shade>();
const FAM_BY = new Map<string, ColourFamily>();
for (const [id, name, tileIds] of FAMS) {
  const shades = (SH[id] ?? []).map(([sid, sname, hex, neon, grad]): Shade => {
    const s: Shade = {
      id: sid,
      name: sname,
      hex,
      family: id,
      neon: neon === 1,
      metallic: id === 'metallics',
      css: grad ?? hex,
      light: lum(hex) > 0.8,
    };
    (SHADES as Shade[]).push(s);
    BY.set(sid, s);
    BY_NAME.set(sname.toLowerCase(), s);
    return s;
  });
  const f: ColourFamily = {
    id,
    name,
    shades,
    tile: tileIds.map((t) => BY.get(t)).filter((s): s is Shade => !!s),
  };
  (COLOUR_FAMILIES as ColourFamily[]).push(f);
  FAM_BY.set(id, f);
}

export const PATTERNS: readonly Pattern[] = PATS.map(([id, name, pref, css]) => ({
  id,
  name,
  pref,
  css,
}));
const PAT_BY = new Map(PATTERNS.map((p) => [p.id, p]));

export const SHADE_IDS: readonly string[] = SHADES.map((s) => s.id);
export const PATTERN_IDS: readonly string[] = PATTERNS.map((p) => p.id);
export const COLOUR_FAMILY_IDS: readonly string[] = COLOUR_FAMILIES.map((f) => f.id);
// A piece carries at most three further shades beside its main one.
export const COLOUR_EXTRA_MAX = 3;

export function shade(id: string | null | undefined): Shade | null {
  return (id && BY.get(id.toLowerCase())) || null;
}

export function colourFamily(id: string | null | undefined): ColourFamily | null {
  return (id && FAM_BY.get(id.toLowerCase())) || null;
}

export function pattern(id: string | null | undefined): Pattern | null {
  return (id && PAT_BY.get(id.toLowerCase())) || null;
}

// A shade by its display name ("Soft black") or a retired wheel name ("Black", "Vermillion").
export function shadeByName(name: string | null | undefined): Shade | null {
  const k = (name ?? '').trim().toLowerCase();
  if (!k) return null;
  const legacy = LEGACY_COLOURS[k];
  return BY_NAME.get(k) ?? (legacy ? (BY.get(legacy) ?? null) : null);
}

// The nearest non-metallic shade to a hex (the analyse fallback's reach, never a display rule).
export function nearestShade(hex: string | null | undefined): Shade | null {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex ?? '').trim());
  if (!m?.[1]) return null;
  const n = Number.parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  let best: Shade | null = null;
  let bd = Number.POSITIVE_INFINITY;
  for (const s of SHADES) {
    if (s.metallic) continue;
    const q = Number.parseInt(s.hex.slice(1), 16);
    const d = (r - ((q >> 16) & 255)) ** 2 + (g - ((q >> 8) & 255)) ** 2 + (b - (q & 255)) ** 2;
    if (d < bd) {
      bd = d;
      best = s;
    }
  }
  return best;
}

// One resolver for everything that lands a colour on a piece: an id, else a name, else a hex.
export function resolveShade(o: { id?: string | null; name?: string | null; hex?: string | null }) {
  return shade(o.id) ?? shadeByName(o.name) ?? nearestShade(o.hex);
}

// A preference word → a family or a shade (the free-text loved/rejected lists, best effort).
export function colourPreference(
  word: string | null | undefined,
): { family: string } | { shade: string } | null {
  const k = (word ?? '').trim().toLowerCase();
  if (!k) return null;
  const fam = WORDS[k];
  if (fam) return { family: fam };
  const s = shadeByName(k);
  return s ? { shade: s.id } : null;
}

// The analyse prompt's block: every family with its shade ids and names, then the patterns.
export function colourPromptBlock(): string {
  const shades = COLOUR_FAMILIES.map(
    (f) => `${f.name}: ${f.shades.map((s) => `${s.id} (${s.name})`).join(', ')}`,
  ).join('\n');
  const pats = PATTERNS.map((p) => `${p.id} (${p.name})`).join(', ');
  return `${shades}\nPATTERNS: plain (no print), ${pats}`;
}

// The shades a Refine family filter matches.
export function familyShadeIds(familyId: string): string[] {
  return colourFamily(familyId)?.shades.map((s) => s.id) ?? [];
}

// Her colours and prints (style DNA's palette): -1 avoid, 1 love; a missing key is "no view".
// A shade with no key follows its family.
export type Preference = -1 | 0 | 1;
export type Leaning = -1 | 1;
export interface Palette {
  fam: Partial<Record<string, Leaning>>;
  // A shade may say No view (0) under a family she loves or avoids.
  shade: Partial<Record<string, Preference>>;
  print: Partial<Record<string, Leaning>>;
}

export function emptyPalette(): Palette {
  return { fam: {}, shade: {}, print: {} };
}

// A stored palette, cleaned: unknown ids and values drop. "No view" is no key, except on a shade
// overriding a family she loves or avoids.
export function cleanPalette(v: unknown): Palette {
  const src = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  const side = <T extends Preference>(o: unknown, known: (id: string) => boolean, zero = false) => {
    const out: Partial<Record<string, T>> = {};
    if (o && typeof o === 'object') {
      for (const [k, raw] of Object.entries(o)) {
        const n = Number(raw);
        if ((n === 1 || n === -1 || (zero && raw === 0)) && known(k)) {
          out[k] = n as T;
        }
      }
    }
    return out;
  };
  return {
    fam: side<Leaning>(src.fam, (k) => FAM_BY.has(k)),
    shade: side<Preference>(src.shade, (k) => BY.has(k), true),
    print: side<Leaning>(src.print, (k) => !!PAT_BY.get(k)?.pref),
  };
}

// What a shade reads as, her own setting first, then its family's.
export function shadePreference(p: Palette, shadeId: string): Preference {
  const s = shade(shadeId);
  if (!s) return 0;
  return p.shade[s.id] ?? p.fam[s.family] ?? 0;
}

// The 19 Oct free-text colour lists map into the model once, best effort.
export function paletteFromWords(loved: readonly string[], rejected: readonly string[]): Palette {
  const out = emptyPalette();
  const land = (w: string, v: Leaning) => {
    const r = colourPreference(w);
    if (!r) return;
    if ('shade' in r) out.shade[r.shade] = v;
    else out.fam[r.family] = v;
  };
  for (const w of rejected) land(w, -1);
  for (const w of loved) land(w, 1);
  return out;
}

// One piece's colour, as the piece sheet edits it.
export interface PieceColour {
  colourShade: string | null;
  colourExtra: string[];
  print: string | null;
}

// A tap on a shade: the main colour, or toggled among the additional colours (at most three).
export function pickShade(v: PieceColour, shadeId: string, slot: 'main' | 'extra'): PieceColour {
  if (slot === 'main') {
    return { ...v, colourShade: shadeId, colourExtra: v.colourExtra.filter((x) => x !== shadeId) };
  }
  if (shadeId === v.colourShade) return v;
  if (v.colourExtra.includes(shadeId)) {
    return { ...v, colourExtra: v.colourExtra.filter((x) => x !== shadeId) };
  }
  if (v.colourExtra.length >= COLOUR_EXTRA_MAX) return v;
  return { ...v, colourExtra: [...v.colourExtra, shadeId] };
}

// Avoid · No view · Love on a family, a shade or a print; no view removes the key.
export function setPreference(
  p: Palette,
  kind: keyof Palette,
  id: string,
  value: Preference,
): Palette {
  const rest = Object.fromEntries(Object.entries(p[kind]).filter(([k]) => k !== id));
  return { ...p, [kind]: value === 0 ? rest : { ...rest, [id]: value } };
}

// Match the family: every shade in it follows the family again.
export function matchFamily(p: Palette, familyId: string): Palette {
  const ids = new Set(familyShadeIds(familyId));
  return {
    ...p,
    shade: Object.fromEntries(Object.entries(p.shade).filter(([k]) => !ids.has(k))),
  };
}

// What she loves (or avoids) by name, for the Style DNA rows (legacy palWords / palPrintWords):
// families by name, then a shade set apart from its family in lower case; prints offered as a
// preference only.
export function paletteWords(p: Palette, kind: 'colours' | 'prints', value: 1 | -1): string[] {
  if (kind === 'prints') {
    return PATTERNS.filter((x) => x.pref && (p.print[x.id] ?? 0) === value).map((x) => x.name);
  }
  const out = COLOUR_FAMILIES.filter((f) => (p.fam[f.id] ?? 0) === value).map((f) => f.name);
  for (const s of SHADES) {
    if (p.shade[s.id] === value && (p.fam[s.family] ?? 0) !== value) out.push(s.name.toLowerCase());
  }
  return out;
}

// How many families and shades (or prints) she loves and avoids, for the Style DNA rows.
export function paletteTally(
  p: Palette,
  kind: 'colours' | 'prints',
): { love: number; avoid: number } {
  const values = (kind === 'colours' ? [p.fam, p.shade] : [p.print]).flatMap((o) =>
    Object.values(o),
  );
  return {
    love: values.filter((v) => v === 1).length,
    avoid: values.filter((v) => v === -1).length,
  };
}
