// The capture rack (Capture PRD 1c, 10 Nov 2026): the pieces found in her photograph of a look,
// each a row she matches to a piece of hers, adds to her wardrobe or wishlist, or removes. An unfiled row is a
// proposal that carries its read (`capture`); a filed one is an ordinary piece row. Pure, shared
// by web and native.
import { shade } from '../colour';
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
  // Her other pieces it may be, likeliest first (absent on a read from before wardrobe-pieces v5).
  alsoMatches?: readonly string[];
}

// The read's pieces as rack rows, in the read's order. A match below the threshold is no
// suggestion, and then her other pieces are none either.
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
      const suggested = p.match && p.match.confidence >= MATCH_THRESHOLD ? p.match.pieceId : null;
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
            suggestedPieceId: suggested,
            alsoSuggestedIds: suggested
              ? [...new Set(p.alsoMatches ?? [])].filter((id) => id !== suggested).slice(0, 4)
              : [],
          },
        },
      };
    });
}

export const isCaptureRow = (row: RackRow): boolean => !!row.proposal?.capture;

// What a row of a look is, which decides the one control at its right (Annie, 27 Nov): a piece
// she owns swaps, a piece found in her photograph files, a wish opens, and a piece Robes
// proposes carries its price and a heart.
export type RowKind = 'owned' | 'found' | 'wish' | 'shop';

export function rowKind(row: RackRow): RowKind {
  if (row.pieceId !== null || !row.proposal) return 'owned';
  if (row.proposal.capture) return 'found';
  return row.proposal.wishlisted ? 'wish' : 'shop';
}

// Her pieces a found row may be, likeliest first.
export function suggestedIds(row: RackRow): string[] {
  const capture = row.proposal?.capture;
  return capture?.suggestedPieceId
    ? [capture.suggestedPieceId, ...(capture.alsoSuggestedIds ?? [])]
    : [];
}

// "Looks like your …" dismissed for this look: the likeliest piece goes from the row, and the
// next one, when the read has one, stands in its place. `shown`: the piece the strip named, when
// it was not the likeliest (that one is on the rack already, or gone from her wardrobe); it goes
// with every piece before it.
export function dismissSuggestion(
  rows: readonly RackRow[],
  key: string,
  shown?: string,
): RackRow[] {
  return rows.map((r) => {
    const capture = r.proposal?.capture;
    if (r.key !== key || !r.proposal || !capture) return r;
    const ids = suggestedIds(r);
    const [next = null, ...rest] = ids.slice(Math.max(shown ? ids.indexOf(shown) : 0, 0) + 1);
    return {
      ...r,
      proposal: {
        ...r.proposal,
        capture: { ...capture, suggestedPieceId: next, alsoSuggestedIds: rest },
      },
    };
  });
}

// A proposal row under a new key. A found row that was filed as a wish and is put back by Undo
// takes one: the server keeps a key's wish once filed (`keepServerFields`), so under its old key
// the row would come back still marked as that wish.
export function rekeyed(row: RackRow, key: string = newProposalKey()): RackRow {
  return row.proposal ? { ...row, key, proposal: { ...row.proposal, key } } : row;
}

// Undo for one row: back on the rack as it stands now, where it stood (`at`), and the row it
// became in a filing (`became`) taken off. Whatever else she changed since stays.
export function putBack(
  rows: readonly RackRow[],
  row: RackRow,
  at: number,
  became: string | null = null,
): RackRow[] {
  if (rows.some((r) => r.key === row.key)) return [...rows];
  const out = rows.filter((r) => r.key !== became);
  out.splice(Math.min(Math.max(at, 0), out.length), 0, row);
  return out;
}

// Matched or added: the row becomes her piece, or a wish from her wishlist as a piece to find
// (TestFlight 20 Nov), in the same place. Neither is hung twice; the found row just goes. The
// filed row remembers the found row it was, so her picture, drawn wearing the found piece, stays
// current: it is the same piece, now filed (Annie, 26 Nov). `worn` is false for a match to
// another piece of hers than the one in the photograph: that is a change the picture is behind
// on, like any swap (Annie, 27 Nov).
export function fileRow(
  rows: readonly RackRow[],
  key: string,
  piece: RackRow,
  worn = true,
): RackRow[] {
  const wishId = piece.proposal?.wishlistItemId ?? null;
  const same = (r: RackRow) =>
    piece.pieceId !== null
      ? r.pieceId === piece.pieceId
      : wishId !== null && r.proposal?.wishlistItemId === wishId;
  if (rows.some(same)) return rows.filter((r) => r.key !== key);
  const from = rows.find((r) => r.key === key);
  const filedFrom = worn && from && isCaptureRow(from) ? { filedFrom: key } : {};
  return rows.map((r) => (r.key === key ? { ...piece, ...filedFrom } : r));
}

// True when `after` is `before` with found rows filed in place (`fileRow`) and nothing else
// changed: the picture still wears it, so the change does not count against the picture.
export function filesOnly(before: readonly RackRow[], after: readonly RackRow[]): boolean {
  if (before.length !== after.length) return false;
  let filed = false;
  for (const [i, row] of after.entries()) {
    const was = before[i] as RackRow;
    if (row === was) continue;
    if (!row.filedFrom || row.filedFrom !== was.key || !isCaptureRow(was)) return false;
    filed = true;
  }
  return filed;
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
// for. Every look writes its rows through at once and comes back with their crops; on a saved
// look a row just written, before the look comes back, has none there yet.
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
