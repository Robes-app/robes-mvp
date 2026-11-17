import { resolveTaxonomy } from '@robes/core';
import { shadeByName } from '@robes/core/colour';
import { resolveMaterial } from '@robes/core/material';

export interface PageHints {
  category: string | null;
  options: string | null;
  color: string | null;
  description: string | null;
}

export interface PageFields {
  categoryL2?: string;
  categoryL3?: string | null;
  material?: string;
  color?: string;
  colourShade?: string;
}

// What the shop's own words settle before its photo is read (staging, 16 Nov: a read that failed
// left category and material blank where beta filled them): its category when it names one of
// ours, a stated composition, a colour it names as one of our shades. The photo read refines
// these; when it can't run, they stand.
export function pageFields(page: PageHints | null | undefined): PageFields {
  if (!page) return {};
  const tax = resolveTaxonomy(page.category);
  const material = materialOf(page);
  const shade = shadeByName(page.color);
  return {
    ...(tax ? { categoryL2: tax.categoryL2, categoryL3: tax.categoryL3 } : {}),
    ...(material ? { material } : {}),
    ...(shade ? { color: shade.name, colourShade: shade.id } : {}),
  };
}

// A variant option ("Medium / 100% Cashmere / Vibrant Pink") or a composition in the description
// ("100% cashmere", "70% wool, 30% silk"): the first material named, as on a label.
function materialOf(page: PageHints): string | null {
  for (const part of (page.options ?? '').split('/')) {
    if (/\d\s*%/.test(part)) {
      const id = resolveMaterial(part);
      if (id) return id;
    }
  }
  for (const m of (page.description ?? '').matchAll(
    /\b\d{1,3}\s*%\s*([a-z][a-z-]*(?: [a-z][a-z-]*)?)/gi,
  )) {
    const words = m[1] ?? '';
    const id = resolveMaterial(words) ?? resolveMaterial(words.split(' ')[0]);
    if (id) return id;
  }
  return null;
}
