import type { AssetRendition } from '@robes/contracts';

// WebP renditions as src + srcSet; null until the asset has rendered.
export function imageSources(
  renditions: readonly AssetRendition[],
): { src: string; srcSet: string } | null {
  if (renditions.length === 0) return null;
  const sorted = [...renditions].sort((a, b) => a.width - b.width);
  const largest = sorted.at(-1);
  if (!largest) return null;
  return {
    src: largest.webp,
    srcSet: sorted.map((r) => `${r.webp} ${r.width}w`).join(', '),
  };
}
