import { dressGarments, type Garment } from '../garments';
import type { RenderPiece as V3Piece } from './v3';
import { buildRenderPrompt as v4Render } from './v4';
import { type FrameAnchor, buildFrameRenderPrompt as v5Frame } from './v5';

// v7 (a tester's looks, 19–21 Nov): two tops layered as the model liked (a tee cropped over a
// turtleneck; a crew jumper redrawn as a V-neck over a polo neck), garments leaking in from
// photographs of her wearing a piece with the rest of an outfit, and a coat's padded shoulder —
// the point of it — drawn as a generic trench. v7 names the layers from the skin out whenever a
// look has more than one (v6 named only outerwear), takes ONLY the piece from each photograph,
// and gives each piece its shape as her photo read it. v5 (v4 on her model) underneath.
export * from './v5';
export const VERSION = 7;

export type RenderPiece = V3Piece & Pick<Garment, 'shape'>;

export function buildFrameRenderPrompt(
  gender: 'woman' | 'man',
  pieces: readonly RenderPiece[],
  note?: string | null,
  anchor?: FrameAnchor,
): string {
  return dressGarments(v5Frame(gender, pieces, note, anchor), pieces);
}

export function buildRenderPrompt(
  gender: 'woman' | 'man',
  pieces: readonly RenderPiece[],
  twin?: { face: boolean; figure: string },
  note?: string | null,
): string {
  return dressGarments(v4Render(gender, pieces, twin, note), pieces);
}
