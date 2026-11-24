import { z } from 'zod';
import { mediaKeys } from './keys';

// Stored in `app.assets.renditions`; keys are derived from it, never stored, so the layout has one owner.
export const RenditionManifest = z.object({
  v: z.literal(1),
  master: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }),
  widths: z.array(z.number().int().positive()),
});
export type RenditionManifest = z.infer<typeof RenditionManifest>;

export interface RenditionKeys {
  master: string;
  renditions: Array<{ width: number; avif: string; webp: string }>;
}

// A shared seed picture's files live once under its catalog base (catalog/seeds/<drop>/<look>),
// never under any one user's prefix; her asset row only points at them.
const CATALOG_BASE = /^catalog\/seeds\/[a-z0-9-]{1,40}\/[a-z0-9-]{1,60}$/;

export function catalogRenditionKeys(base: string, manifest: RenditionManifest): RenditionKeys {
  if (!CATALOG_BASE.test(base)) throw new Error('invalid catalog base');
  return {
    master: `${base}/master.jpg`,
    renditions: manifest.widths.map((width) => ({
      width,
      avif: `${base}/${width}.avif`,
      webp: `${base}/${width}.webp`,
    })),
  };
}

export function renditionKeys(
  userId: string,
  assetId: string,
  manifest: RenditionManifest,
): RenditionKeys {
  return {
    master: mediaKeys.master(userId, assetId),
    renditions: manifest.widths.map((width) => ({
      width,
      avif: mediaKeys.rendition(userId, assetId, width, 'avif'),
      webp: mediaKeys.rendition(userId, assetId, width, 'webp'),
    })),
  };
}
