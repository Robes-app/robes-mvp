import { fenceUserText } from '../../fence';
import { dressGarments, type Garment, isTopLayer, shapeWords } from '../garments';
import type { RawPiece, StoredPiece, ClosetPiece as V3Closet, FramePiece as V3Frame } from './v3';
import * as v10 from './v10';

// v11 (a tester's looks, 19–21 Nov: "two tops worn together", "the same bloody shoes", a coat's
// padded shoulder drawn as a generic trench). The prompt asked for "one top under a layer" but
// the normaliser kept any number of tops; ALREADY SHOWN kept a look's lead piece from repeating,
// never its shoes or bag, while "owned always beats hypothetical" put her one pair on every look;
// and the shape her photo read (silhouette_fit) reached no prompt. v11:
//   1. One top, or two only when the second is a layer worn open over it (normalised in code).
//   2. Shoes and bag move on from the newest look already shown.
//   3. Her pieces' shapes, by number, so the look is built around what defines them.
//   4. The image prompt names the layers, takes ONLY the piece from each photograph, and gives
//      each piece its shape (shared with avatar v7).
// Everything else is v10's.
export * from './v10';
export const VERSION = 11;

export type ClosetPiece = V3Closet & {
  categoryL2?: string | null;
  shape?: readonly string[] | null;
};
export type FramePiece = V3Frame & Pick<Garment, 'shape'>;

const ONE_TOP =
  'ONE TOP — a look carries ONE top: a tee, a shirt, a blouse, a jumper or a knit. A second top only when it is a layer worn open over the first — a cardigan, an overshirt, a waistcoat — never a jumper over a tee, never a knit over a knit, never two tops side by side. List the top first, then the layer over it.';
const MOVE_ON =
  'SHOES AND BAG MOVE ON — never give her the shoes or the bag the newest look in ALREADY SHOWN wore when her wardrobe holds another pair or another bag that suits the brief: rotate them across her looks. An owned piece still beats a new one, but a different owned pair beats the same pair again. Where only that one pair suits and a new piece is allowed above, propose a new pair.';

// Her pieces' shapes as her photographs read them (silhouette_fit), by wardrobe number.
function shapesBlock(closet: readonly ClosetPiece[]): string {
  const rows = closet.slice(0, 60).flatMap((p, n) => {
    const shape = shapeWords(p.shape);
    return shape.length ? [`[${n}] ${shape.join(', ')}`] : [];
  });
  if (!rows.length) return '';
  return `THE SHAPE OF HER PIECES — what defines each, read from her photographs, by wardrobe number. A strong shape is the point of a piece: build the look around it (a strong shoulder over a slim, plain layer, never buried), and name it in how the piece is worn:\n${fenceUserText(rows.join('\n'), 2400)}`;
}

export function buildSystem(
  ctx: Omit<Parameters<typeof v10.buildSystem>[0], 'closet'> & { closet: ClosetPiece[] },
  mode: Parameters<typeof v10.buildSystem>[1],
  steer: Parameters<typeof v10.buildSystem>[2] = {},
  place: Parameters<typeof v10.buildSystem>[3] = null,
  opts: Parameters<typeof v10.buildSystem>[4] = {},
): string {
  const base = v10.buildSystem(ctx, mode, steer, place, opts);
  const shapes = shapesBlock(ctx.closet);
  return [base, ONE_TOP, MOVE_ON, shapes].filter(Boolean).join('\n\n');
}

// v3's normaliser (one per slot for shoes, bags, bottoms and dresses), then tops: one top, kept
// as a slot is (hers beats a proposal, else the first listed), and at most one layer over it.
export function normalisePieces(
  pieces: readonly RawPiece[],
  closet: readonly ClosetPiece[],
): StoredPiece[] {
  const out = v10.normalisePieces(pieces, closet);
  const l2 = new Map(closet.map((c) => [c.id, c.categoryL2 ?? null]));
  const layer = (p: StoredPiece) => isTopLayer(p.name, p.pieceId ? l2.get(p.pieceId) : null);
  const tops = out.filter((p) => p.category === 'Tops');
  const plain = tops.filter((p) => !layer(p));
  const layers = tops.filter(layer);
  const keep = new Set<StoredPiece>();
  const top = plain.find((p) => p.pieceId) ?? plain[0];
  if (top) keep.add(top);
  const over = layers.find((p) => p.pieceId) ?? layers[0];
  if (over) keep.add(over);
  return out.filter((p) => p.category !== 'Tops' || keep.has(p));
}

export function buildImagePrompt(
  opts: Omit<Parameters<typeof v10.buildImagePrompt>[0], 'pieces'> & {
    pieces: readonly FramePiece[];
  },
): string {
  return dressGarments(v10.buildImagePrompt(opts), opts.pieces);
}
