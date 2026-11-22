import type { AssetRendition, PieceImage } from '@robes/contracts';

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

// A piece's picture for a thumbnail drawn by hand (PieceImage in components/wardrobe does this
// itself), ready to spread onto `Image` after its other props: the piece cut out of her
// photograph, whole on white, where one was made (cutout brief); else the photograph, as before.
// The blurhash is the photograph's, so a cutout loads without one. Native twin: pieceSource in
// mobile/src/lib/images.ts.
export function pieceSources(image: Pick<PieceImage, 'renditions' | 'cutout'> | null | undefined):
  | { src: string; srcSet: string }
  | {
      src: string;
      className: string;
      frameClassName: string;
      blurhash: null;
      'data-cutout': true;
    }
  | null {
  if (!image) return null;
  if (image.cutout) {
    return {
      src: image.cutout,
      className: 'object-contain!',
      frameClassName: 'bg-surface-raised!',
      blurhash: null,
      'data-cutout': true,
    };
  }
  return imageSources(image.renditions);
}
