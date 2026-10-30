// The digital twin's vocabulary (legacy settings.html 2026-10-07/08): style types, the brand and icon
// walls, the investment level, the facts and the season wheel. Names and labels reach prompts, so
// they live here; the explanatory lines beside them are copy.
import { buildColorHarmony } from './compose';
import type { SeasonName } from './types';

// The eight style archetypes (Annie, 30 Oct), in the order onboarding shows them.
export const STYLE_TYPES = [
  'Minimal',
  'Modern',
  'Classic',
  'Sculptural',
  'Bohemian',
  'Eclectic',
  'Heritage',
  'Utility',
] as const;
export type StyleType = (typeof STYLE_TYPES)[number];

// The types retired on 30 Oct, read as their nearest archetype wherever a stored or older client's
// value arrives.
export const RETIRED_STYLE_TYPES: Readonly<Record<string, StyleType>> = {
  Romantic: 'Bohemian',
  'Off-duty': 'Modern',
  'Avant-garde': 'Sculptural',
};

export function styleTypeOf(name: string): StyleType | null {
  if ((STYLE_TYPES as readonly string[]).includes(name)) return name as StyleType;
  return Object.hasOwn(RETIRED_STYLE_TYPES, name) ? (RETIRED_STYLE_TYPES[name] ?? null) : null;
}

// Her types as archetypes: retired names mapped, unknown dropped, first pick kept.
export function styleTypesOf(names: readonly string[]): StyleType[] {
  const out: StyleType[] = [];
  for (const n of names) {
    const t = styleTypeOf(n);
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

// Whose houses the walls lead with. 'unspecified' (Prefer not to say) is styled as a woman.
export const SEED_WEARERS = ['woman', 'man', 'non_binary'] as const;
export type SeedWearer = (typeof SEED_WEARERS)[number];
export const seedWearerOf = (presence: string | null | undefined): SeedWearer =>
  presence === 'man' || presence === 'non_binary' ? presence : 'woman';

// The names the app carried, the prototype's fifty, Liberty's list and the archetype houses
// (30 Oct), deduped by name.
export const BRAND_POOL: readonly string[] = [
  'The Row',
  'Totême',
  'Khaite',
  'Loewe',
  'Celine',
  'Prada',
  'Miu Miu',
  'Bottega Veneta',
  'Jil Sander',
  'Lemaire',
  'Max Mara',
  'Chloé',
  'Dôen',
  'Sézane',
  'Ganni',
  'Acne Studios',
  'Jacquemus',
  'Alaïa',
  'Maison Margiela',
  'Dries Van Noten',
  'Marni',
  'Simone Rocha',
  'Isabel Marant',
  'Saint Laurent',
  'Valentino',
  'Gucci',
  'Hermès',
  'Chanel',
  'Dior',
  'Fendi',
  'Victoria Beckham',
  'Gabriela Hearst',
  'Proenza Schouler',
  'Staud',
  'Reformation',
  'COS',
  'Arket',
  'Me+Em',
  'Joseph',
  'Vince',
  'Agolde',
  'Ulla Johnson',
  'Zimmermann',
  'Nili Lotan',
  'Loro Piana',
  'Brunello Cucinelli',
  'Comme des Garçons',
  'Yohji Yamamoto',
  'Paloma Wool',
  'Courrèges',
  'Cou Cou',
  'The Frankie Shop',
  'Phoebe Philo',
  'Auralee',
  'Rick Owens',
  'Carolina Herrera',
  'Adidas',
  'Nike',
  'H&M',
  'Zara',
  'Uniqlo',
  'Louis Vuitton',
  'Ralph Lauren',
  'CAMILLA AND MARC',
  'Carven',
  'Chopova Lowena',
  'Julie Kegels',
  'Kallmeyer',
  'LABRUM London',
  'Matières Fécales',
  'Marks & Spencer',
  '& Other Stories',
  'Mango',
  'Dunnes Stores',
  'Penneys',
  'Studio Nicholson',
  'Our Legacy',
  'Aimé Leon Dore',
  'Universal Works',
  'M&S Autograph',
  'Zegna',
  'Reiss',
  'SuitSupply',
  'Tom Ford',
  'J.Crew',
  'Margaret Howell',
  'Wales Bonner',
  'Story mfg.',
  'Bode',
  'Collina Strada',
  'Sandy Liang',
  'Craig Green',
  'Supreme',
  'Stüssy',
  'Charles Jeffrey Loverboy',
  'Telfar',
  'Vivienne Westwood',
  'Dr. Martens',
  'Joules',
  'Barbour',
  "Drake's",
  'Belstaff',
  'Carhartt WIP',
  'Stone Island',
  'A-Cold-Wall*',
  'Orslow',
  'Dickies',
  'Filson',
  'Patagonia',
  'The North Face',
  "Levi's",
  'Uniqlo U',
];

// Each archetype's houses by who she is (Annie's table, 30 Oct); her picks lead the brand walls.
export const BRAND_SEED: Record<StyleType, Record<SeedWearer, readonly string[]>> = {
  Minimal: {
    woman: ['COS', 'Lemaire', 'Studio Nicholson', 'Jil Sander'],
    man: ['COS', 'Lemaire', 'The Row', 'Jil Sander'],
    non_binary: ['COS', 'Lemaire', 'Studio Nicholson', 'Jil Sander'],
  },
  Modern: {
    woman: ['Zara', 'Lemaire', 'Auralee', 'Our Legacy', 'Celine', 'Rick Owens'],
    man: ['Auralee', 'Our Legacy', 'Celine', 'Rick Owens', 'Aimé Leon Dore', 'Universal Works'],
    non_binary: ['Celine', 'Auralee', 'Our Legacy', 'The Row'],
  },
  Classic: {
    woman: ['M&S Autograph', 'Ralph Lauren', 'Brunello Cucinelli', 'Zegna'],
    man: [
      'Ralph Lauren',
      'Brunello Cucinelli',
      'Zegna',
      'Reiss',
      'SuitSupply',
      'Tom Ford',
      'J.Crew',
    ],
    non_binary: ['Margaret Howell', 'COS', 'Auralee'],
  },
  Sculptural: {
    woman: ['COS', '& Other Stories'],
    man: ['Lemaire', 'Rick Owens', 'Celine'],
    non_binary: ['Celine', 'Lemaire', 'The Row', 'Jil Sander', 'Dries Van Noten'],
  },
  Bohemian: {
    woman: ['Dôen', 'Wales Bonner', 'Zimmermann'],
    man: ['Wales Bonner', 'Story mfg.', 'Bode'],
    non_binary: ['Marni', 'Dries Van Noten', 'Collina Strada', 'Sandy Liang'],
  },
  Eclectic: {
    woman: [
      '& Other Stories',
      'Comme des Garçons',
      'Craig Green',
      'Dries Van Noten',
      'Marni',
      'Gucci',
    ],
    man: [
      'Comme des Garçons',
      'Craig Green',
      'Dries Van Noten',
      'Marni',
      'Gucci',
      'Supreme',
      'Stüssy',
    ],
    non_binary: [
      'Comme des Garçons',
      'Rick Owens',
      'Charles Jeffrey Loverboy',
      'Telfar',
      'Vivienne Westwood',
      'Dr. Martens',
    ],
  },
  Heritage: {
    woman: ['Joules', 'Barbour', "Drake's", 'Belstaff'],
    man: ['Barbour', "Drake's", 'Belstaff', 'Joules'],
    non_binary: ['Universal Works', 'Carhartt WIP', 'Margaret Howell'],
  },
  Utility: {
    woman: ['Carhartt WIP', 'Stone Island', 'A-Cold-Wall*'],
    man: [
      'Stone Island',
      'Carhartt WIP',
      'A-Cold-Wall*',
      'Orslow',
      'Dickies',
      'Filson',
      'Patagonia',
      'The North Face',
      "Levi's",
    ],
    non_binary: ['Carhartt WIP', 'Universal Works', 'Uniqlo U', 'Dickies', "Levi's"],
  },
};

// Each icon carries the one tag Robes reads as a register.
export const ICON_POOL: readonly (readonly [name: string, tag: string])[] = [
  ['Carolyn Bessette-Kennedy', 'Nineties minimal'],
  ['Jane Birkin', 'French undone'],
  ['Hailey Bieber', 'Clean-girl minimal'],
  ['Zoë Kravitz', 'Rock-and-roll ease'],
  ['Sienna Miller', 'Boho polish'],
  ['Sophia Loren', 'Italian glamour'],
  ['Phoebe Philo', 'Intellectual minimal'],
  ['Audrey Hepburn', 'Gamine classic'],
  ['Lauren Hutton', 'American ease'],
  ['Caroline de Maigret', 'Parisian cool'],
  ['Charlotte Gainsbourg', 'Undone tailoring'],
  ['Grace Kelly', 'Polished classic'],
  ['Lee Radziwill', 'Society precision'],
  ['Olivia Dean', 'Soft modern'],
  ['Gwyneth Paltrow', 'Mature minimal'],
  ['Kendall Jenner', 'Designer, fashion-forward'],
  ['Sofia Coppola', 'Quiet preppy'],
  ['Tilda Swinton', 'Avant-garde'],
  ['Iris Apfel', 'Maximal eclectic'],
  ['Diane Keaton', 'Tailored heritage'],
  ['Margot Robbie', 'Modern utility'],
];

export const ICON_SEED: Record<StyleType, readonly string[]> = {
  Minimal: ['Carolyn Bessette-Kennedy', 'Phoebe Philo', 'Gwyneth Paltrow'],
  Modern: ['Olivia Dean', 'Kendall Jenner', 'Hailey Bieber'],
  Classic: ['Grace Kelly', 'Carolyn Bessette-Kennedy', 'Lee Radziwill', 'Audrey Hepburn'],
  Sculptural: ['Tilda Swinton', 'Phoebe Philo'],
  Bohemian: ['Jane Birkin', 'Sienna Miller'],
  Eclectic: ['Iris Apfel', 'Zoë Kravitz'],
  Heritage: ['Diane Keaton', 'Lauren Hutton', 'Sofia Coppola'],
  Utility: ['Margot Robbie', 'Lauren Hutton'],
};

export const normName = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, ' ');
const sameName = (a: string, b: string): boolean => normName(a) === normName(b);

export function iconTag(name: string): string {
  return ICON_POOL.find(([n]) => sameName(n, name))?.[1] ?? '';
}

export type WallKind = 'brands' | 'icons';

const seedFor = (kind: WallKind, type: StyleType, wearer: SeedWearer): readonly string[] =>
  kind === 'brands' ? BRAND_SEED[type][wearer] : ICON_SEED[type];

// Her types' houses first, then every house seeded for who she is, then the whole wall; deduped by
// name. Retired type names read as their archetype.
export function wallPool(
  kind: WallKind,
  types: readonly string[],
  presence?: string | null,
): string[] {
  const wearer = seedWearerOf(presence);
  const out: string[] = [];
  const push = (n: string) => {
    if (n && !out.some((x) => sameName(x, n))) out.push(n);
  };
  for (const t of styleTypesOf(types)) for (const n of seedFor(kind, t, wearer)) push(n);
  for (const t of STYLE_TYPES) for (const n of seedFor(kind, t, wearer)) push(n);
  for (const n of kind === 'brands' ? BRAND_POOL : ICON_POOL.map(([n]) => n)) push(n);
  return out;
}

function seedTypes(kind: WallKind, name: string, wearer: SeedWearer): StyleType[] {
  return STYLE_TYPES.filter((t) => seedFor(kind, t, wearer).some((x) => sameName(x, name)));
}

// The unkept names she would reach for rise first: her types weigh 2, each kept name's types 1;
// ties keep the pool's order. A client rule, never a model call (legacy 2026-10-09).
export function wallRanked(
  kind: WallKind,
  types: readonly string[],
  kept: readonly string[],
  presence?: string | null,
) {
  const wearer = seedWearerOf(presence);
  const pool = wallPool(kind, types, presence).filter((n) => !kept.some((k) => sameName(k, n)));
  const score = new Map<StyleType, number>();
  for (const t of styleTypesOf(types)) score.set(t, (score.get(t) ?? 0) + 2);
  for (const n of kept)
    for (const t of seedTypes(kind, n, wearer)) score.set(t, (score.get(t) ?? 0) + 1);
  if (score.size === 0) return pool;
  return pool
    .map((n, i) => ({
      n,
      i,
      s: seedTypes(kind, n, wearer).reduce((a, t) => a + (score.get(t) ?? 0), 0),
    }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.n);
}

// The onboarding wall: eighteen houses, hers first.
export const ONBOARDING_BRAND_COUNT = 18;
export const onboardingBrands = (types: readonly string[], presence?: string | null): string[] =>
  wallPool('brands', types, presence).slice(0, ONBOARDING_BRAND_COUNT);

// One mandatory answer by yearly spend; the label is what the prompt reads.
export const INVESTMENT_LEVELS = [
  { key: 'under_500', label: 'Under €500' },
  { key: '500_1500', label: '€500–1,500' },
  { key: '1500_5000', label: '€1,500–5,000' },
  { key: '5000_plus', label: '€5,000+' },
] as const;
export type InvestmentLevel = (typeof INVESTMENT_LEVELS)[number]['key'];
export const INVESTMENT_KEYS = INVESTMENT_LEVELS.map((l) => l.key) as [
  InvestmentLevel,
  ...InvestmentLevel[],
];
export const investmentLabel = (key: string | null | undefined): string =>
  INVESTMENT_LEVELS.find((l) => l.key === key)?.label ?? '';

// The facts: size, never weight. Ranges per the prototype.
export const AGE_BANDS = [
  { key: 'under_25', label: 'Under 25' },
  { key: '25_34', label: '25–34' },
  { key: '35_44', label: '35–44' },
  { key: '45_54', label: '45–54' },
  { key: '55_64', label: '55–64' },
  { key: '65_plus', label: '65+' },
] as const;
export type AgeBand = (typeof AGE_BANDS)[number]['key'];
export const AGE_BAND_KEYS = AGE_BANDS.map((a) => a.key) as [AgeBand, ...AgeBand[]];
export const ageBandLabel = (key: string | null | undefined): string =>
  AGE_BANDS.find((a) => a.key === key)?.label ?? '';
export const FACT_RANGES = {
  heightCm: { min: 140, max: 210, step: 1, start: 168 },
  sizeUk: { min: 4, max: 16, step: 2, start: 10 },
  shoeUk: { min: 2, max: 8, step: 0.5, start: 5 },
} as const;
export type FactStep = keyof typeof FACT_RANGES;

// A stepper's next value, clamped; null starts from the prototype's middle.
export function stepFact(kind: FactStep, value: number | null, dir: 1 | -1): number {
  const r = FACT_RANGES[kind];
  const next = value === null ? r.start : value + dir * r.step;
  return Math.min(r.max, Math.max(r.min, Math.round(next * 2) / 2));
}
export const euSize = (uk: number): number => uk + 28;
export const euShoe = (uk: number): number => Math.round(uk + 33);
export function feetInches(cm: number): string {
  const inches = Math.round(cm / 2.54);
  return `${Math.floor(inches / 12)}′${inches % 12}″`;
}

// Musts and hard nos as chips: a tap files the line with the chip as its prompt. Head covered is a
// must (a rule Robes keeps on every look), never a no.
export const MUST_CHIPS = {
  rules: ['Head covered', 'Covered arms', 'Covered legs'],
  avoids: ['Heels', 'Polo necks', 'Metals', 'Sheer', 'Prints'],
} as const;

// The twelve seasons round the wheel; a misread usually lands next door.
export const SEASON_WHEEL: readonly SeasonName[] = [
  'Light Spring',
  'Warm Spring',
  'Clear Spring',
  'Clear Winter',
  'True Winter',
  'Dark Winter',
  'Dark Autumn',
  'True Autumn',
  'Soft Autumn',
  'Soft Summer',
  'True Summer',
  'Light Summer',
];

// The read season, its two neighbours, then (on "Another season") the rest. Anchored on what her
// photograph read, never on a season she has since picked, so the list holds still under her.
export function seasonChoices(read: string | null, more: boolean): SeasonName[] {
  const i = SEASON_WHEEL.indexOf(read as SeasonName);
  if (i < 0) return [...SEASON_WHEEL];
  const near = [SEASON_WHEEL[i], SEASON_WHEEL[(i + 11) % 12], SEASON_WHEEL[(i + 1) % 12]].filter(
    (s): s is SeasonName => s !== undefined,
  );
  return more ? [...near, ...SEASON_WHEEL.filter((s) => !near.includes(s))] : near;
}

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : {};

// A season she chose by hand: that season's catalog render, no model call; the photograph's
// undertone, contrast and hexes ride along (legacy /api/stylenotes/season).
export function chooseSeason(season: SeasonName, current: unknown) {
  const c = obj(current);
  const ev = obj(c.extracted_values);
  const built = buildColorHarmony({
    season,
    undertone: c.verified_undertone,
    contrast: c.calculated_contrast,
    skin_tone_hex: ev.skin_tone_hex,
    hair_color_hex: ev.hair_color_hex,
    eye_color_hex: ev.eye_color_hex,
    season_reasoning: 'Chosen by hand in Settings.',
  });
  const prior = obj(c.classification);
  const primitive = prior.primitive_season;
  // The photograph's own call survives every hand pick: it anchors the season list.
  const read =
    typeof prior.read_season === 'string'
      ? prior.read_season
      : prior.source !== 'chosen' && typeof c.archetype_name === 'string'
        ? c.archetype_name
        : null;
  const classification = {
    ...built.dna.classification,
    source: 'chosen',
    ...(typeof primitive === 'string'
      ? { primitive_season: primitive, agreement: primitive === season }
      : {}),
    ...(read ? { read_season: read } : {}),
  };
  return {
    render: { ...built.render, ...(read ? { read_season: read } : {}) },
    dna: { ...built.dna, classification },
  };
}

// Onboarding's four photographs per archetype, chosen by who she is; each app bundles the files
// under these keys (web public/archetypes, native assets/archetypes).
export const ARCHETYPE_IMAGE_COUNT = 4;
export function archetypeImageKeys(type: StyleType, presence?: string | null): string[] {
  const slug = type.toLowerCase().replace(/[^a-z]+/g, '-');
  return Array.from(
    { length: ARCHETYPE_IMAGE_COUNT },
    (_, i) => `${seedWearerOf(presence).replace('_', '-')}/${slug}-${i + 1}`,
  );
}
