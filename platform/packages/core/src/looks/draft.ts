// The draft look's composer (legacy 2026-10-15 "the draft look for an early account" + 2026-09-03
// "dressing your model"): her model on a 4:5 canvas with a hotspot per part of her, the rack beside
// it, and the one wardrobe sheet behind every + and every swap. Pure, shared by both clients.

import { sheetL1For } from '../taxonomy';

// A settled composition asks for one frame; flicking through pieces asks for none in between.
export const DRESS_DEBOUNCE_MS = 1_800;

export type HotspotSlot = 'top' | 'bottom' | 'shoes';

// Where each hotspot sits on the figure, which pieces (by their stored category) fill it, and the
// sheet's chip it opens on. A dress answers both the top and the bottom.
export const HOTSPOTS: readonly {
  slot: HotspotSlot;
  top: string;
  fills: readonly string[];
  opensOn: string;
}[] = [
  { slot: 'top', top: '31%', fills: ['Tops', 'Dresses'], opensOn: 'Tops' },
  { slot: 'bottom', top: '58%', fills: ['Bottoms', 'Dresses'], opensOn: 'Bottoms' },
  { slot: 'shoes', top: '86%', fills: ['Shoes'], opensOn: 'Shoes' },
];

// The slot a piece lands in when she picks it (a top picked from + Bottom goes to Top).
export function hotspotFor(category: string): HotspotSlot | null {
  return HOTSPOTS.find((h) => h.fills.includes(category))?.slot ?? null;
}

export function filledSlots(categories: readonly string[]): Set<HotspotSlot> {
  const filled = new Set<HotspotSlot>();
  for (const h of HOTSPOTS) if (categories.some((c) => h.fills.includes(c))) filled.add(h.slot);
  return filled;
}

// A pick from the sheet: it swaps the row already holding its slot, else it joins the look. The
// rack's own "+ Add a piece" always adds (`fromSlot` false).
export function placePick<R extends { key: string; category: string }>(
  rows: readonly R[],
  category: string,
  fromSlot: boolean,
): { swap: string } | { add: true } {
  const slot = fromSlot ? hotspotFor(category) : null;
  const holder = slot ? rows.find((r) => hotspotFor(r.category) === slot) : undefined;
  return holder ? { swap: holder.key } : { add: true };
}

// The category a piece is filed under on the wardrobe's own sheet (Knitwear, Jewellery…), falling
// back to the stored category for a piece read before the three levels.
export function sheetCategoryOf(p: { category: string; categoryL2?: string | null }): string {
  return (p.categoryL2 ? sheetL1For(p.categoryL2) : null) ?? p.category;
}

// The sheet's chips (legacy 2026-10-15): Tops · Bottoms · Shoes always, then every category she
// has filed, in the order the sheet first meets them. All leads them on screen.
export function sheetChips(categories: readonly string[]): string[] {
  const chips = ['Tops', 'Bottoms', 'Shoes'];
  for (const c of categories) if (!chips.includes(c)) chips.push(c);
  return chips;
}

// The sheet's search: the whole wardrobe, by name, brand, category, colour or subcategory.
export function pieceMatches(
  p: {
    label: string;
    brand?: string | null;
    category: string;
    color?: string | null;
    categoryL2?: string | null;
    categoryL3?: string | null;
  },
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [p.label, p.brand, p.category, p.color, p.categoryL2, p.categoryL3, sheetCategoryOf(p)]
    .filter((v): v is string => typeof v === 'string')
    .some((v) => v.toLowerCase().includes(q));
}

// One render per composition: the same pieces in any order are the same frame.
export function compositionKey(pieceIds: readonly string[]): string {
  return [...pieceIds].sort().join(',');
}

// A draft she builds by hand opens in the composer; a draft from Robes' suggestion keeps its
// frame on the working page, and a look from her own photograph keeps the photograph.
export function isHandBuiltDraft(look: {
  status: string;
  setId: string | null;
  frame: boolean;
  image: unknown;
  onModel?: string | null;
}): boolean {
  if (look.status !== 'draft' || look.setId || look.frame) return false;
  return !look.image || Boolean(look.onModel);
}
