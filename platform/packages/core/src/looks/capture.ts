// The capture rack (Capture PRD 1c, 10 Nov 2026): the pieces found in her photograph of a look,
// each a row she matches to a piece of hers, adds to her wardrobe, or removes. An unfiled row is a
// proposal that carries its read (`capture`); a filed one is an ordinary piece row. Pure, shared
// by web and native.
import { shade } from '../colour';
import { material } from '../material';
import { MATCH_THRESHOLD } from '../photo-pieces';
import { newProposalKey, type RackRow } from './index';

// One piece of a photo read, as the rack needs it (the contract's ReadPiece is a superset).
export interface FoundPiece {
  index: number;
  label: string;
  category: string;
  categoryL2: string | null;
  color: string | null;
  colourShade: string | null;
  brand: string | null;
  material: string | null;
  cropAssetId: string;
  match: { pieceId: string; confidence: number } | null;
}

// The read's pieces as rack rows, in the read's order. A match below the threshold is no
// suggestion: the row reads "No close match in your wardrobe" instead.
export function captureRows(
  readId: string,
  pieces: readonly FoundPiece[],
  newKey: () => string = () => newProposalKey(),
): RackRow[] {
  return [...pieces]
    .sort((a, b) => a.index - b.index)
    .map((p) => {
      const key = newKey();
      const name = p.label.trim().slice(0, 120) || p.category;
      const brand = (p.brand ?? '').trim().slice(0, 60);
      return {
        key,
        pieceId: null,
        name,
        category: p.category,
        categoryL2: p.categoryL2,
        brand: brand || null,
        role: null,
        proposal: {
          key,
          name,
          category: p.category,
          color: (shade(p.colourShade)?.name ?? p.color ?? '').slice(0, 40),
          brand,
          retailerHint: '',
          pricePoint: '',
          role: null,
          wishlisted: false,
          wishlistItemId: null,
          capture: {
            readId,
            index: p.index,
            cropAssetId: p.cropAssetId,
            material: p.material,
            suggestedPieceId:
              p.match && p.match.confidence >= MATCH_THRESHOLD ? p.match.pieceId : null,
          },
        },
      };
    });
}

export const isCaptureRow = (row: RackRow): boolean => !!row.proposal?.capture;

// The unfiled row's small caps: CATEGORY · COLOUR · MATERIAL, each only when the read saw it.
export function captureEyebrow(row: RackRow, category: string): string {
  const colour = row.proposal?.color?.trim() ?? '';
  const made = material(row.proposal?.capture?.material)?.name ?? '';
  return [category, colour, made].filter(Boolean).join(' · ');
}

// Rows she removed, each with where it stood, so Undo puts every one back in place (1c.6).
export interface RemovedRow {
  row: RackRow;
  at: number;
}

export function removeRow(
  rows: readonly RackRow[],
  removed: readonly RemovedRow[],
  key: string,
): { rows: RackRow[]; removed: RemovedRow[] } {
  const at = rows.findIndex((r) => r.key === key);
  const row = rows[at];
  if (!row) return { rows: [...rows], removed: [...removed] };
  return { rows: rows.filter((r) => r.key !== key), removed: [...removed, { row, at }] };
}

// Undo: every removed row back where it stood, last removed first so the places still hold.
export function restoreRows(rows: readonly RackRow[], removed: readonly RemovedRow[]): RackRow[] {
  const out = [...rows];
  for (const { row, at } of [...removed].reverse()) {
    if (out.some((r) => r.key === row.key)) continue;
    out.splice(Math.min(at, out.length), 0, row);
  }
  return out;
}

// Matched or added: the row becomes her piece, or a wish from her wishlist as a piece to find
// (TestFlight 20 Nov), in the same place. Neither is hung twice; the found row just goes.
export function fileRow(rows: readonly RackRow[], key: string, piece: RackRow): RackRow[] {
  const wishId = piece.proposal?.wishlistItemId ?? null;
  const same = (r: RackRow) =>
    piece.pieceId !== null
      ? r.pieceId === piece.pieceId
      : wishId !== null && r.proposal?.wishlistItemId === wishId;
  if (rows.some(same)) return rows.filter((r) => r.key !== key);
  return rows.map((r) => (r.key === key ? piece : r));
}

export const filedCount = (rows: readonly RackRow[]): number =>
  rows.filter((r) => r.pieceId !== null).length;

// What the Pieces tab of a look from her photograph shows (1c.3 to 1c.6).
//   ask      the dashed Find the pieces card, with "Skip, keep just the photo"
//   photo    the same card, optional (she skipped, or the look is saved with no pieces)
//   finding  the read is running
//   failed   the read failed: Retry, and the photo is kept
//   rack     the rows
//   clear    every found row removed
export type CaptureStage = 'ask' | 'photo' | 'finding' | 'failed' | 'rack' | 'clear';

export function captureStage(s: {
  rows: number;
  finding: boolean;
  failed: boolean;
  // She tapped Skip, or the look is already saved.
  settled: boolean;
  // Rows were found in this sitting and she removed them all.
  cleared: boolean;
}): CaptureStage {
  if (s.finding) return 'finding';
  if (s.rows > 0) return 'rack';
  if (s.failed) return 'failed';
  if (s.cleared) return 'clear';
  return s.settled ? 'photo' : 'ask';
}

// A found row's crop as the server hands it over (the contract's PieceImage is a superset). Its
// renditions are made after the read job finishes, from the S3 event, so a crop is `pending` for
// a few seconds after its row lands (tester trial 25 Nov: the found rows showed no pictures until
// the look was fetched again for something else).
export interface CropImage {
  assetId: string;
  status: 'pending' | 'ready' | 'failed';
  renditions: readonly unknown[];
}

// The row's crop before anything about it has come back: drawn as the row's loading state, never
// as a piece with no photograph.
export interface PendingCrop {
  assetId: string;
  status: 'pending';
  width: null;
  height: null;
  blurhash: null;
  renditions: never[];
}

// Whether a look holds a found row whose crop is still being made: a page showing its rack asks
// again until it lands, as `pictureLanding` does for the picture.
export function cropsLanding(
  look: { captureImages?: Readonly<Record<string, Pick<CropImage, 'status'>>> } | undefined,
): boolean {
  return Object.values(look?.captureImages ?? {}).some((c) => c.status === 'pending');
}

// The reads whose crops a rack fetches for itself: those of its found rows the look holds no crop
// for. A draft writes its rows through at once and the look comes back with their crops; a saved
// look keeps them on her phone until Update look (the editor's `live`), so its look has none.
export function cropReads(
  rows: readonly RackRow[],
  look: { status: string; captureImages: Readonly<Record<string, unknown>> },
): string[] {
  if (look.status === 'draft') return [];
  const ids = rows.flatMap((r) => {
    const capture = r.proposal?.capture;
    return capture && !(r.key in look.captureImages) ? [capture.readId] : [];
  });
  return [...new Set(ids)];
}

// The crop to draw for a found row: whichever of the look's and the read's has landed, else the
// one still being made, else a stand-in for the row's crop so the row shows its loading state. A
// crop that failed shows no photograph.
export function captureImage<I extends CropImage>(
  row: RackRow,
  fromLook: I | undefined,
  fromRead: I | undefined,
): I | PendingCrop | null {
  const ready = [fromLook, fromRead].find((c) => c?.status === 'ready');
  if (ready) return ready;
  const pending = [fromLook, fromRead].find((c) => c?.status === 'pending');
  if (pending) return pending;
  if (fromLook || fromRead) return null;
  const assetId = row.proposal?.capture?.cropAssetId;
  return assetId
    ? { assetId, status: 'pending', width: null, height: null, blurhash: null, renditions: [] }
    : null;
}
