import { LEGACY_CATEGORIES, type LegacyCategory, sheetL1For } from '../taxonomy';

// The piece card everywhere (legacy b4b051a "the rack card as the wardrobe's row"): one anatomy
// for a list row and a grid tile, on the wardrobe and the wishlist, web and native.

export type WardrobeLayout = 'list' | 'grid';

// The phone opens on the list, the web on the grid, until she picks.
export function defaultLayout(isPhone: boolean): WardrobeLayout {
  return isPhone ? 'list' : 'grid';
}

export function isWardrobeLayout(value: unknown): value is WardrobeLayout {
  return value === 'list' || value === 'grid';
}

// Eyebrow "Category · Brand": the sheet's category when the taxonomy knows the type.
export function pieceEyebrow(p: {
  category: string;
  categoryL2: string | null;
  brand: string | null;
}): { category: string; brand: string | null } {
  const category = (p.categoryL2 && sheetL1For(p.categoryL2)) || p.category || 'Other';
  const brand = p.brand?.trim() || null;
  return { category, brand };
}

// The brand rides in the eyebrow, so the name doesn't repeat it ("COS Wool coat" → "Wool coat").
export function nameWithoutBrand(label: string, brand: string | null): string {
  const b = brand?.trim();
  if (!b) return label;
  const lower = label.toLowerCase();
  const prefix = b.toLowerCase();
  if (!lower.startsWith(prefix)) return label;
  const rest = label.slice(b.length).replace(/^[\s·:–—-]+/, '');
  return rest.length > 0 ? rest : label;
}

// The category tabs: categories she has, most pieces first, ties in the canonical order.
export function rankCategories(
  counts: ReadonlyArray<{ category: string; count: number }>,
): LegacyCategory[] {
  const order = (c: string) => LEGACY_CATEGORIES.indexOf(c as LegacyCategory);
  return counts
    .filter((c): c is { category: LegacyCategory; count: number } => order(c.category) >= 0)
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count || order(a.category) - order(b.category))
    .map((c) => c.category);
}

// Counts per category from a loaded list (the wishlist holds every wish client-side).
export function countByCategory(
  items: ReadonlyArray<{ category: string }>,
): { category: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const i of items) counts.set(i.category, (counts.get(i.category) ?? 0) + 1);
  return [...counts].map(([category, count]) => ({ category, count }));
}

// A wish's price on its status line ("€27.95"); nothing when there's no price.
export function formatPrice(amount: number | null, currency: string | null): string | null {
  if (amount === null || !(amount > 0)) return null;
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency ?? 'EUR',
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount);
  } catch {
    return amount.toFixed(2);
  }
}

// The Price drawer's currencies (beta: £ GBP / € EUR / $ USD), in the order the chips read.
export const PRICE_CURRENCIES = [
  { code: 'GBP', symbol: '£' },
  { code: 'EUR', symbol: '€' },
  { code: 'USD', symbol: '$' },
] as const;
export type PriceCurrency = (typeof PRICE_CURRENCIES)[number]['code'];

export function isPriceCurrency(code: string | null | undefined): code is PriceCurrency {
  return PRICE_CURRENCIES.some((c) => c.code === code);
}

const GBP_REGIONS = new Set(['GB', 'UK', 'GG', 'JE', 'IM']);

// The chip a fresh price opens on, from the device's locale ("en-GB" → GBP, "en-US" → USD);
// euro otherwise, the house currency.
export function currencyForLocale(locale: string | null | undefined): PriceCurrency {
  const region = (locale ?? '')
    .split(/[-_]/)
    .slice(1)
    .find((part) => /^[A-Za-z]{2}$/.test(part))
    ?.toUpperCase();
  if (region && GBP_REGIONS.has(region)) return 'GBP';
  if (region === 'US') return 'USD';
  return 'EUR';
}

// What she typed in the Price field as a number: "89.99", "89,99", "1,200", "€ 340". Null when it
// isn't a price (blank, negative, letters).
export function parsePriceInput(text: string): number | null {
  let t = text.replace(/[\s£€$]/g, '');
  if (!t) return null;
  if (t.includes(',') && !t.includes('.')) {
    // One comma with one or two digits after it is a decimal comma; otherwise it groups thousands.
    t = /^\d+,\d{1,2}$/.test(t) ? t.replace(',', '.') : t.replace(/,/g, '');
  } else {
    t = t.replace(/,/g, '');
  }
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) && n <= 10_000_000 ? n : null;
}

// The name Robes offers when she hasn't given one (redline 06/07): the colour and the leaf of
// the category, "Navy crew neck jumper". Offered as a placeholder, never applied.
export function suggestPieceName(p: {
  colourName?: string | null;
  categoryL2?: string | null;
  categoryL3?: string | null;
}): string | null {
  const leaf = (p.categoryL3 ?? p.categoryL2 ?? '').trim();
  if (!leaf) return null;
  const colour = p.colourName?.trim();
  return colour ? `${colour} ${leaf.toLowerCase()}` : leaf;
}
