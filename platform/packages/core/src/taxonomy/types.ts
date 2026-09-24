export const LEGACY_CATEGORIES = [
  'Tops',
  'Bottoms',
  'Dresses',
  'Outerwear',
  'Shoes',
  'Bags',
  'Accessories',
  'Swimwear',
  'Other',
] as const;
export type LegacyCategory = (typeof LEGACY_CATEGORIES)[number];

export const SEASON_BANDS = ['spring_summer', 'autumn_winter', 'year_round'] as const;
export type SeasonBand = (typeof SEASON_BANDS)[number];

export interface TaxonomyGroup {
  sheetL1: string;
  l2: string;
  // Legacy single-level category this node folds into.
  l1: LegacyCategory;
  l3: readonly string[];
}

export interface TaxonomyRow {
  l1: LegacyCategory;
  sheetL1: string;
  l2: string;
  l3: string;
}

export interface ResolvedTaxonomy {
  category: LegacyCategory;
  categoryL2: string;
  categoryL3: string | null;
}

export interface TagDefaults {
  wear: string[];
  band: SeasonBand;
}

export interface TagDefaultRow {
  sheetL1: string;
  l2: string | null;
  seasonBand: SeasonBand;
  wearSlugs: string[];
}
