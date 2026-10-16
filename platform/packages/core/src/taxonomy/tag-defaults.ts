import { TAXONOMY_GROUPS } from './groups';
import type { SeasonBand, TagDefaultRow, TagDefaults } from './types';

// ADR-002 §4 seeds; tag rows are minted on first use, never pre-created.
export const WEAR_SEEDS = [
  { slug: 'everyday', label: 'Everyday' },
  { slug: 'work', label: 'Work' },
  { slug: 'evening', label: 'Evening' },
  { slug: 'occasion', label: 'Occasion' },
  { slug: 'travel', label: 'Travel' },
  { slug: 'active', label: 'Active' },
  { slug: 'lounge', label: 'Lounge' },
] as const;

interface Rule {
  wear: string[];
  band: SeasonBand;
  l2?: Record<string, { wear: string[]; band: SeasonBand }>;
}

// Keyed by the sheet L1; per-L2 overrides only where one category spans different uses.
const CATEGORY_DEFAULTS: Record<string, Rule> = {
  Tops: { wear: ['everyday'], band: 'year_round' },
  Knitwear: { wear: ['everyday'], band: 'autumn_winter' },
  Bottoms: { wear: ['everyday'], band: 'year_round' },
  'Dresses & jumpsuits': {
    wear: ['everyday'],
    band: 'year_round',
    l2: { 'Occasion & evening': { wear: ['evening', 'occasion'], band: 'year_round' } },
  },
  Outerwear: {
    wear: ['everyday'],
    band: 'autumn_winter',
    l2: { Blazers: { wear: ['work', 'everyday'], band: 'year_round' } },
  },
  'Tailoring & suiting': { wear: ['work'], band: 'year_round' },
  Shoes: { wear: ['everyday'], band: 'year_round' },
  Bags: { wear: ['everyday'], band: 'year_round' },
  Accessories: { wear: ['everyday'], band: 'year_round' },
  Jewellery: { wear: ['everyday'], band: 'year_round' },
  Activewear: { wear: ['active'], band: 'year_round' },
  'Loungewear & sleepwear': { wear: ['lounge'], band: 'year_round' },
  'Underwear & intimates': { wear: ['everyday'], band: 'year_round' },
  'Swim & beach': { wear: ['travel'], band: 'spring_summer' },
};

// Pieces filed before L2 existed key on the legacy nine; 'Other' means unfiled, so no default.
const LEGACY_DEFAULTS: Record<string, string> = {
  Tops: 'Tops',
  Bottoms: 'Bottoms',
  Dresses: 'Dresses & jumpsuits',
  Outerwear: 'Outerwear',
  Shoes: 'Shoes',
  Bags: 'Bags',
  Accessories: 'Accessories',
  Swimwear: 'Swim & beach',
};

export function defaultTagsFor(
  sheetL1: string | null | undefined,
  l2?: string | null,
): TagDefaults | null {
  const raw = (sheetL1 ?? '').trim();
  const key = CATEGORY_DEFAULTS[raw] ? raw : (LEGACY_DEFAULTS[raw] ?? '');
  const base = CATEGORY_DEFAULTS[key];
  if (!base) return null;
  const rule = base.l2?.[(l2 ?? '').trim()] ?? base;
  return { wear: [...rule.wear], band: rule.band };
}

// One row per (sheet_l1, l2) node plus a null-l2 fallback per sheet and legacy category.
export function tagDefaultRows(): TagDefaultRow[] {
  const rows: TagDefaultRow[] = [];
  const seen = new Set<string>();
  const push = (sheetL1: string, l2: string | null): void => {
    const key = `${sheetL1}\u0000${l2 ?? ''}`;
    if (seen.has(key)) return;
    const d = defaultTagsFor(sheetL1, l2);
    if (!d) return;
    seen.add(key);
    rows.push({ sheetL1, l2, seasonBand: d.band, wearSlugs: d.wear });
  };
  for (const g of TAXONOMY_GROUPS) {
    push(g.sheetL1, null);
    push(g.sheetL1, g.l2);
  }
  for (const legacy of Object.keys(LEGACY_DEFAULTS)) push(legacy, null);
  return rows;
}
