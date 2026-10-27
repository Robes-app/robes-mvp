import { TAXONOMY_GROUPS } from './groups';
import type { LegacyCategory, ResolvedTaxonomy, TaxonomyRow } from './types';

export { TAXONOMY_GROUPS } from './groups';
export * from './tag-defaults';
export * from './types';

// L2 names are unique tree-wide; a split L2 keeps its first (majority) group's legacy l1.
const L2_INDEX = new Map<string, { sheetL1: string; l1: LegacyCategory }>();
const L3_INDEX = new Map<string, Map<string, LegacyCategory>>();
for (const g of TAXONOMY_GROUPS) {
  if (!L2_INDEX.has(g.l2)) L2_INDEX.set(g.l2, { sheetL1: g.sheetL1, l1: g.l1 });
  const l3s = L3_INDEX.get(g.l2) ?? new Map<string, LegacyCategory>();
  for (const l3 of g.l3) l3s.set(l3, g.l1);
  L3_INDEX.set(g.l2, l3s);
}

export function taxonomyRows(): TaxonomyRow[] {
  return TAXONOMY_GROUPS.flatMap((g) =>
    g.l3.map((l3) => ({ l1: g.l1, sheetL1: g.sheetL1, l2: g.l2, l3 })),
  );
}

export function sheetL1For(l2: string): string | null {
  return L2_INDEX.get(l2)?.sheetL1 ?? null;
}

function findKey<V>(map: Map<string, V>, value: string): string | null {
  if (map.has(value)) return value;
  const lower = value.toLowerCase();
  for (const key of map.keys()) if (key.toLowerCase() === lower) return key;
  return null;
}

// Validates a model-emitted (l2, l3); an unknown l3 under a known l2 degrades to the l2.
export function resolveTaxonomy(
  l2: string | null | undefined,
  l3?: string | null,
): ResolvedTaxonomy | null {
  const l2Key = findKey(L2_INDEX, (l2 ?? '').trim());
  if (!l2Key) return null;
  const l3Map = L3_INDEX.get(l2Key) ?? new Map<string, LegacyCategory>();
  const l3Raw = (l3 ?? '').trim();
  const l3Key = l3Raw ? findKey(l3Map, l3Raw) : null;
  const category = (l3Key ? l3Map.get(l3Key) : undefined) ?? L2_INDEX.get(l2Key)?.l1 ?? 'Other';
  return { category, categoryL2: l2Key, categoryL3: l3Key };
}

// The picker's three levels (Category › Subcategory › Item type), in the sheet's own order.
export function sheetCategories(): string[] {
  const seen: string[] = [];
  for (const g of TAXONOMY_GROUPS) if (!seen.includes(g.sheetL1)) seen.push(g.sheetL1);
  return seen;
}

export function subcategoriesOf(sheetL1: string): string[] {
  return TAXONOMY_GROUPS.filter((g) => g.sheetL1 === sheetL1).map((g) => g.l2);
}

export function itemTypesOf(l2: string): string[] {
  return TAXONOMY_GROUPS.filter((g) => g.l2 === l2).flatMap((g) => [...g.l3]);
}

// Compact tree for the analyse prompt: one line per (l1 › l2) group.
export function taxonomyPromptBlock(): string {
  return TAXONOMY_GROUPS.map((g) => `${g.l1} › ${g.l2}: ${g.l3.join(' | ')}`).join('\n');
}
