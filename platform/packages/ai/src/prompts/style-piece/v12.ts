import { detailOf } from '@robes/core';
import { fenceUserText } from '../../fence';
import type { Garment } from '../garments';
import * as v11 from './v11';

// v12 (2026-11-21, PR 242's follow-up): her pieces' defining details. v11 gave the look prompt
// each piece's shape words, but those are generic ("Blazer, Single-breasted, Relaxed"); the one
// feature that makes a piece itself (a coat's strong padded shoulder) was never read. It is now
// (wardrobe-analyse v6), and she can put it in her own words. v12:
//   1. The look prompt lists each piece's defining detail by wardrobe number, to style around.
//   2. The image prompt carries it on the piece's garment line (shared with avatar v8).
// Everything else is v11's.
export * from './v11';
export const VERSION = 12;

export type ClosetPiece = v11.ClosetPiece & { detail?: string | null };
export type FramePiece = v11.FramePiece & Pick<Garment, 'detail'>;

function detailsBlock(closet: readonly ClosetPiece[]): string {
  const rows = closet.slice(0, 60).flatMap((p, n) => {
    const detail = detailOf(p.detail);
    return detail ? [`[${n}] ${detail}`] : [];
  });
  if (!rows.length) return '';
  return `THE DEFINING DETAIL OF HER PIECES — the one feature that makes each piece itself, by wardrobe number. It is why she owns the piece: keep it in view (never covered by a layer, a scarf or a bag strap), choose the pieces around it so it reads, and say so in how the piece is worn:\n${fenceUserText(rows.join('\n'), 3600)}`;
}

export function buildSystem(
  ctx: Omit<Parameters<typeof v11.buildSystem>[0], 'closet'> & { closet: ClosetPiece[] },
  mode: Parameters<typeof v11.buildSystem>[1],
  steer: Parameters<typeof v11.buildSystem>[2] = {},
  place: Parameters<typeof v11.buildSystem>[3] = null,
  opts: Parameters<typeof v11.buildSystem>[4] = {},
): string {
  const base = v11.buildSystem(ctx, mode, steer, place, opts);
  return [base, detailsBlock(ctx.closet)].filter(Boolean).join('\n\n');
}

export function buildImagePrompt(
  opts: Omit<Parameters<typeof v11.buildImagePrompt>[0], 'pieces'> & {
    pieces: readonly FramePiece[];
  },
): string {
  return v11.buildImagePrompt(opts);
}
