import type { PieceImage } from '@robes/contracts';

// Smallest rendition at least `width` pt wide (×2 for retina); the largest when none is.
export function renditionUri(image: PieceImage | null | undefined, width: number): string | null {
  const sorted = [...(image?.renditions ?? [])].sort((a, b) => a.width - b.width);
  const pick = sorted.find((r) => r.width >= width * 2) ?? sorted.at(-1);
  return pick?.webp ?? null;
}
