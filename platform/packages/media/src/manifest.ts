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
