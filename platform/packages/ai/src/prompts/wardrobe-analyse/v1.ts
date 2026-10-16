import { resolveTaxonomy, taxonomyPromptBlock } from '@robes/core';
import { z } from 'zod';

// Ported from legacy server.js /api/wardrobe/analyse (2026-09-22 prompt), versioned here.
export const FEATURE = 'wardrobe.analyse';
export const VERSION = 1;

const COLOURS = [
  'White',
  'Cream',
  'Navy',
  'Charcoal',
  'Black',
  'Espresso',
  'Camel',
  'Taupe',
  'Olive',
  'Aubergine',
  'Forest',
  'Bordeaux',
  'Blush',
  'Ochre',
  'Magenta',
  'Cobalt',
  'Emerald',
  'Vermillion',
  'Acid',
  'Print',
] as const;

export const Output = z.object({
  no_item_detected: z.boolean(),
  label: z.string().max(80),
  category: z.enum([
    'Tops',
    'Bottoms',
    'Dresses',
    'Outerwear',
    'Shoes',
    'Bags',
    'Accessories',
    'Swimwear',
    'Other',
  ]),
  category_l2: z.string().max(60),
  category_l3: z.string().max(60),
  color: z.string().max(20),
  primary_color_hex: z.string().max(9),
  editorial_color_name: z.string().max(40),
  brand: z.string().max(60),
  silhouette_fit: z.array(z.string().max(30)).max(4),
  formality: z.enum(['casual', 'smart', 'formal', 'black_tie']),
  price: z.string().max(12),
  currency: z.string().max(3),
  size: z.string().max(40),
  ai_generated_notes: z.string().max(160),
});
export type Output = z.infer<typeof Output>;

export const SYSTEM = `You are the fashion reader for Robes, a luxury wardrobe app. You look at one photo and file the piece in it. You never invent details that are not visible.`;

export function buildUser(): string {
  return `Analyse this photo.

If no clothing item, garment or accessory is clearly visible (a face, a room, a screenshot, unidentifiable content), set "no_item_detected": true and return every other field empty ("" or []), with category "Other" and formality "casual".

If a piece IS present, set "no_item_detected": false and fill every field:
"label": concise item name (e.g. "Camel wool coat", "Grey straight-leg jeans")
"category": one of Tops, Bottoms, Dresses, Outerwear, Shoes, Bags, Accessories, Swimwear, Other
"formality": casual (jeans, tees, trainers), smart (tailoring, a silk shirt, a loafer), formal (cocktail dress, a tuxedo blazer, an evening shoe), black_tie (a gown, a dinner suit). Judge the GARMENT, not how it is styled in the photo.
"category_l2" and "category_l3": file the piece in the taxonomy below. Each line reads Category › Subcategory: item types. Pick the ONE line whose subcategory fits best, copy the subcategory name EXACTLY into category_l2, then the best-fitting item type from that line EXACTLY into category_l3. If no item type fits, category_l3 is "". If no subcategory fits, both are "".
TAXONOMY:
${taxonomyPromptBlock()}
"color": ONE of ${COLOURS.join(', ')}
"primary_color_hex": hex of the dominant colour (e.g. "#D2B48C")
"editorial_color_name": an evocative colour name (e.g. "Warm Caramel")
"brand": the brand if visible, else ""
"silhouette_fit": 2-4 short descriptors (e.g. ["Blazer", "Single-breasted", "Relaxed"])
"price": ONLY if a price is legibly printed in the photo (a swing tag, a receipt), digits only, else ""
"currency": the ISO code of that printed price, else ""
"size": ONLY if a size is legibly printed (a care label, a swing tag), else ""
"ai_generated_notes": one editorial sentence under 15 words`;
}

export interface AnalysedPiece {
  noItemDetected: boolean;
  label: string;
  categoryL2: string | null;
  categoryL3: string | null;
  color: string | null;
  brand: string | null;
  price: number | null;
  currency: string | null;
  size: string | null;
  notes: string | null;
  itemDna: Record<string, unknown>;
}

// The taxonomy decides the category; printed values are parsed defensively (legacy rules).
export function toPiece(out: Output): AnalysedPiece {
  const tax = out.no_item_detected ? null : resolveTaxonomy(out.category_l2, out.category_l3);
  const price = Number.parseFloat(out.price.replace(/[^0-9.]/g, ''));
  const currency = out.currency
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3);
  return {
    noItemDetected: out.no_item_detected,
    label: out.label.trim().slice(0, 120),
    categoryL2: tax?.categoryL2 ?? null,
    categoryL3: tax?.categoryL3 ?? null,
    color: (COLOURS as readonly string[]).includes(out.color) ? out.color : null,
    brand: out.brand.trim() || null,
    price: Number.isFinite(price) && price > 0 ? price : null,
    currency: currency.length === 3 ? currency : null,
    size: out.size.trim().slice(0, 40) || null,
    notes: out.ai_generated_notes.trim() || null,
    itemDna: {
      display: {
        title: out.label,
        editorial_color_name: out.editorial_color_name,
        primary_color_hex: /^#[0-9a-f]{6}$/i.test(out.primary_color_hex)
          ? out.primary_color_hex
          : '',
        brand_raw: out.brand,
      },
      structural_dna: { silhouette_fit: out.silhouette_fit },
      formality: out.formality,
      ai_generated_notes: out.ai_generated_notes,
      prompt_version: VERSION,
    },
  };
}

// Offline fixture: a plausible, schema-valid read so the whole flow works without Gemini.
export function fakeOutput(): Output {
  return {
    no_item_detected: false,
    label: 'Camel wool coat',
    category: 'Outerwear',
    category_l2: 'Coats',
    category_l3: 'Wool coat',
    color: 'Camel',
    primary_color_hex: '#C19A6B',
    editorial_color_name: 'Warm Caramel',
    brand: '',
    silhouette_fit: ['Longline', 'Single-breasted', 'Relaxed'],
    formality: 'smart',
    price: '',
    currency: '',
    size: '',
    ai_generated_notes: 'A camel coat that makes everything underneath look deliberate.',
  };
}
