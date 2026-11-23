import type { PieceImage } from '@robes/contracts';

// Smallest rendition at least `width` pt wide (×2 for retina); the largest when none is.
export function renditionUri(image: PieceImage | null | undefined, width: number): string | null {
  const sorted = [...(image?.renditions ?? [])].sort((a, b) => a.width - b.width);
  const pick = sorted.find((r) => r.width >= width * 2) ?? sorted.at(-1);
  return pick?.webp ?? null;
}

// The piece cut out of its photograph, where one was made (cutout brief, 21 Nov); it is drawn
// whole, on white. Web twin: PieceImage in components/wardrobe/piece-image.tsx.
export function cutoutUri(image: PieceImage | null | undefined): string | null {
  return image?.cutout ?? null;
}

// A piece's picture for a thumbnail drawn by hand (the shared `Photo` in PieceCard does this
// itself): its cutout, contained, where one was made; else the photograph at `width`, as before.
// The blurhash is the photograph's, so a cutout loads without one.
export function pieceSource(
  image: PieceImage | null | undefined,
  width: number,
): { uri: string | null; fit: { contentFit: 'contain'; blurhash: null } | Record<string, never> } {
  const cutout = cutoutUri(image);
  return cutout
    ? { uri: cutout, fit: { contentFit: 'contain', blurhash: null } }
    : { uri: renditionUri(image, width), fit: {} };
}
