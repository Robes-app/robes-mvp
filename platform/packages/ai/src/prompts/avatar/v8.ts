import type { Garment } from '../garments';
import type { FrameAnchor } from './v5';
import * as v7 from './v7';

// v8 (2026-11-21, PR 242's follow-up): each piece's one defining detail on its garment line,
// straight after its shape. v7 gave a coat "Longline, Single-breasted"; the padded, extended
// shoulder that "is the essence of the style" was never in those words, so it was still drawn
// soft. The detail is read with the piece (wardrobe-analyse v6) or is her own words for it.
// Everything else is v7's.
export * from './v7';
export const VERSION = 8;

export type RenderPiece = v7.RenderPiece & Pick<Garment, 'detail'>;

export function buildFrameRenderPrompt(
  gender: 'woman' | 'man',
  pieces: readonly RenderPiece[],
  note?: string | null,
  anchor?: FrameAnchor,
): string {
  return v7.buildFrameRenderPrompt(gender, pieces, note, anchor);
}

export function buildRenderPrompt(
  gender: 'woman' | 'man',
  pieces: readonly RenderPiece[],
  twin?: { face: boolean; figure: string },
  note?: string | null,
): string {
  return v7.buildRenderPrompt(gender, pieces, twin, note);
}
