import { WEAR_FOR_ALL } from '@robes/core/filters';
import { z } from 'zod';
import { LookRole } from './looks';
import { LEGACY_CATEGORY, Seasons } from './wardrobe';

// A seeded drop (plan "Seeded Christmas looks", 23 Nov): looks Robes' stylist made, written into
// every account as suggestions while the drop is live. The drop lives in the repo
// (`app/src/server/seeds`), never in a request: this schema is what CI holds each file to.
const SeedSlug = z.string().regex(/^[a-z0-9][a-z0-9-]{0,39}$/);
const Day = z.iso.date();
const Price = z.number().positive().max(100_000);

// A picture rendered once into catalog/seeds/<drop>/<look> (master + renditions); the numbers are
// what the render reported, so her asset row can be written without touching the files.
export const SeedImage = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  blurhash: z.string().max(100).nullable(),
  widths: z.array(z.number().int().positive()).min(1),
});
export type SeedImage = z.infer<typeof SeedImage>;

export const SeedPiece = z.object({
  name: z.string().trim().min(1).max(120),
  category: LEGACY_CATEGORY,
  brand: z.string().trim().max(60),
  // Prices as the shop shows them; she sees the one in her currency, else none.
  prices: z.object({ EUR: Price.optional(), GBP: Price.optional() }),
  url: z
    .url({ protocol: /^https$/ })
    .max(2048)
    .nullable(),
  role: LookRole.nullable().default(null),
  // The piece's still, rendered into catalog/seeds/<drop>/<look>-<n> as the look's picture is.
  image: SeedImage.nullable().default(null),
});
export type SeedPiece = z.infer<typeof SeedPiece>;

export const SeedLook = z.object({
  lookId: SeedSlug,
  // The look's name: Liberty's caption (the Caption is the name, D16).
  name: z.string().trim().min(1).max(120),
  // Wear it for, from the fixed list (WEAR_FOR_ALL): the Lookbook's filter chips.
  tags: z.array(z.enum(WEAR_FOR_ALL)).max(2),
  seasons: Seasons,
  image: SeedImage.nullable(),
  pieces: z.array(SeedPiece).min(1).max(20),
});
export type SeedLook = z.infer<typeof SeedLook>;

export const SeedDrop = z
  .object({
    seedId: SeedSlug,
    liveFrom: Day,
    // The last day the drop is live: the day after, her unsaved looks from it are taken away.
    liveUntil: Day,
    looks: z.array(SeedLook).min(1).max(20),
  })
  .refine((d) => d.liveFrom <= d.liveUntil, { message: 'live_until before live_from' })
  .refine((d) => new Set(d.looks.map((l) => l.lookId)).size === d.looks.length, {
    message: 'duplicate look id',
  });
export type SeedDrop = z.infer<typeof SeedDrop>;
