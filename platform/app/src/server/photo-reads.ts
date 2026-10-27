import 'server-only';
import { ApiError } from '@robes/api';
import {
  type FileAnswer,
  type FileReadOutput,
  type Look,
  type LookAnswer,
  type LookFromPhotoInput,
  ReadPiece,
  type StartJobOutput,
} from '@robes/contracts';
import type { ReadPieceRow, UserId } from '@robes/db';
import { z } from 'zod';
import { repos } from './db';
import { startJob } from './jobs';
import { suggestedName, toLook, withOwnedPieces } from './looks-entity';
import { toPieces } from './wardrobe';
import { toWishes } from './wishlist';

const READABLE_KINDS = new Set(['wardrobe', 'look_photo']);

// What the wardrobe_pieces job stores on its row: the contract's piece plus what filing needs.
const StoredPiece = ReadPiece.extend({
  price: z.number().nullable(),
  currency: z.string().nullable(),
  size: z.string().nullable(),
  itemDna: z.record(z.string(), z.unknown()),
});
type StoredPiece = z.infer<typeof StoredPiece>;
const StoredRead = z.object({ assetId: z.uuid(), readPieces: z.array(StoredPiece) });
type StoredRead = z.infer<typeof StoredRead>;

// Her photo → the read job (one model call, charged like a single read).
export async function startPhotoRead(
  userId: UserId,
  req: Request,
  assetId: string,
): Promise<StartJobOutput> {
  if (await repos.capacity.isExhausted(['gemini-flash-lite'])) throw new ApiError('capacity');
  const asset = await repos.assets.getForUser(userId, assetId);
  if (!asset || !READABLE_KINDS.has(asset.kind) || asset.status === 'failed') {
    throw new ApiError('not_found');
  }
  return startJob(userId, req, {
    kind: 'wardrobe_pieces',
    input: { assetId },
    quota: { metric: 'analyse.photo', cost: 1 },
  });
}

// A finished read of hers; anything else (another kind, still reading, someone else's) is 404/409.
export async function loadRead(userId: UserId, jobId: string): Promise<StoredRead> {
  const job = await repos.jobs.getForUser(userId, jobId);
  if (job?.kind !== 'wardrobe_pieces') throw new ApiError('not_found');
  if (job.status !== 'succeeded' && job.status !== 'partial') throw new ApiError('conflict');
  const read = StoredRead.safeParse(job.output);
  if (!read.success) throw new ApiError('conflict');
  return read.data;
}

// Every piece answered exactly once, as on the screen; answers address the read by index.
function answered<A extends { index: number }>(read: StoredRead, answers: readonly A[]) {
  const byIndex = new Map(answers.map((a) => [a.index, a]));
  if (
    byIndex.size !== answers.length ||
    byIndex.size !== read.readPieces.length ||
    read.readPieces.some((p) => !byIndex.has(p.index))
  ) {
    throw new ApiError('invalid_input', {
      details: [{ path: 'answers', message: 'answer every piece once' }],
    });
  }
  return read.readPieces.map((piece) => ({ piece, answer: byIndex.get(piece.index) as A }));
}

async function assertOwned(userId: UserId, pieceIds: readonly string[]) {
  const rows = await Promise.all(pieceIds.map((id) => repos.wardrobe.get(userId, id)));
  if (rows.some((r) => !r)) throw new ApiError('not_found');
  return new Map(rows.flatMap((r) => (r ? [[r.id, r] as const] : [])));
}

function toRow(
  piece: StoredPiece,
  source: { kind: 'photo_multi' | 'look_photo'; of: number },
  edits?: Extract<FileAnswer, { state: 'add' }>['edits'],
): ReadPieceRow {
  return {
    sourceIndex: piece.index,
    label: edits?.label ?? piece.label,
    category: piece.category,
    categoryL2: edits?.categoryL2 !== undefined ? edits.categoryL2 : piece.categoryL2,
    categoryL3: edits?.categoryL3 !== undefined ? edits.categoryL3 : piece.categoryL3,
    color: edits?.color !== undefined ? edits.color : piece.color,
    brand: edits?.brand !== undefined ? edits.brand : piece.brand,
    notes: edits?.notes !== undefined ? edits.notes : piece.notes,
    price: edits?.price !== undefined ? edits.price : piece.price,
    currency: edits?.currency !== undefined ? edits.currency : piece.currency,
    size: edits?.size !== undefined ? edits.size : piece.size,
    seasonBand: edits?.seasonBand,
    colourShade: edits?.colourShade,
    colourExtra: edits?.colourExtra,
    print: edits?.print,
    material: edits?.material,
    itemDna: { ...piece.itemDna, source },
    imageAssetId: piece.cropAssetId,
  };
}

// Owned pieces with no photograph take the crop; every crop nobody took is discarded.
async function settleOwned(
  userId: UserId,
  read: StoredRead,
  owned: ReadonlyArray<{ piece: StoredPiece; pieceId: string }>,
  used: Set<string>,
): Promise<string[]> {
  const photoAdded: string[] = [];
  for (const { piece, pieceId } of owned) {
    if (await repos.wardrobe.adoptPhoto(userId, pieceId, piece.cropAssetId)) {
      photoAdded.push(pieceId);
      used.add(piece.cropAssetId);
    }
  }
  const spare = read.readPieces.map((p) => p.cropAssetId).filter((id) => !used.has(id));
  await repos.assets.discardCrops(userId, read.assetId, spare);
  return photoAdded;
}

// Use case 3: each kept piece filed on its own with its crop; retrying files nothing twice.
// To the wish list instead, each kept piece becomes a wish holding its crop (no "owned" there).
export async function fileRead(
  userId: UserId,
  jobId: string,
  answers: readonly FileAnswer[],
  to: 'wardrobe' | 'wishlist' = 'wardrobe',
): Promise<FileReadOutput> {
  const read = await loadRead(userId, jobId);
  const pairs = answered(read, answers);
  const owned = pairs.flatMap(({ piece, answer }) =>
    answer.state === 'owned' ? [{ piece, pieceId: answer.pieceId }] : [],
  );
  if (to === 'wishlist' && owned.length) {
    throw new ApiError('invalid_input', {
      details: [{ path: 'answers', message: 'a wish is never one she owns' }],
    });
  }
  await assertOwned(
    userId,
    owned.map((o) => o.pieceId),
  );
  const source = { kind: 'photo_multi' as const, of: read.readPieces.length };
  const kept = pairs.flatMap(({ piece, answer }) =>
    answer.state === 'add'
      ? [{ row: toRow(piece, source, answer.edits), edits: answer.edits }]
      : [],
  );
  const rows = kept.map((k) => k.row);
  const used = new Set(rows.flatMap((r) => (r.imageAssetId ? [r.imageAssetId] : [])));
  if (to === 'wishlist') {
    const wishes = await repos.wishlist.createFromRead(
      userId,
      rows.map(({ sourceIndex: _i, itemDna: _d, seasonBand: _s, notes, imageAssetId, ...r }) => ({
        ...r,
        note: notes,
        imageAssetId: imageAssetId as string,
      })),
    );
    await settleOwned(userId, read, [], used);
    return { filed: [], wished: await toWishes(userId, wishes), photoAdded: [] };
  }
  const filed = await repos.wardrobe.createFromRead(userId, read.assetId, rows);
  // What she wears it for lives in the tag namespace, so it lands once the piece exists.
  for (const { row, edits } of kept) {
    const id = filed.find((p) => p.sourceIndex === row.sourceIndex)?.id;
    if (id && edits?.wearFor) await repos.wardrobe.setWearTags(userId, id, edits.wearFor);
  }
  const photoAdded = await settleOwned(userId, read, owned, used);
  const ordered = [...filed].sort((a, b) => (a.sourceIndex ?? 0) - (b.sourceIndex ?? 0));
  return { filed: await toPieces(userId, ordered), wished: [], photoAdded };
}

// Use case 2b: the new pieces file first, then the look saves with her photo as its record,
// pieces in the read's order; "Wearing it today" logs the wear.
export async function lookFromRead(
  userId: UserId,
  jobId: string,
  input: LookFromPhotoInput,
): Promise<Look> {
  const read = await loadRead(userId, jobId);
  // One look per photograph: a retry or a second tap returns the look already saved (its wear
  // is one per day either way), and files nothing twice.
  const existing = await repos.looks.byPhoto(userId, read.assetId);
  if (existing) {
    if (input.wornOn) await repos.looks.wear(userId, existing.id, input.wornOn);
    return toLook(userId, existing);
  }
  const pairs = answered<LookAnswer>(read, input.answers);
  const owned = pairs.flatMap(({ piece, answer }) =>
    answer.state === 'owned' ? [{ piece, pieceId: answer.pieceId }] : [],
  );
  await assertOwned(
    userId,
    owned.map((o) => o.pieceId),
  );
  const source = { kind: 'look_photo' as const, of: read.readPieces.length };
  const rows = pairs.flatMap(({ piece, answer }) =>
    answer.state === 'new' ? [toRow(piece, source)] : [],
  );
  const filed = await repos.wardrobe.createFromRead(userId, read.assetId, rows);
  const filedByIndex = new Map(filed.map((p) => [p.sourceIndex, p.id]));
  const pieceIds = [
    ...new Set(
      pairs.flatMap(({ piece, answer }) => {
        if (answer.state === 'owned') return [answer.pieceId];
        const id = answer.state === 'new' ? filedByIndex.get(piece.index) : undefined;
        return id ? [id] : [];
      }),
    ),
  ];
  const used = new Set(rows.flatMap((r) => (r.imageAssetId ? [r.imageAssetId] : [])));
  // A look keeps her own pieces' photographs; crops of pieces she owns are not needed.
  const spare = read.readPieces.map((p) => p.cropAssetId).filter((id) => !used.has(id));
  await repos.assets.discardCrops(userId, read.assetId, spare);

  const name = input.name ?? (await suggestedName(userId, pieceIds[0]));
  const row = await withOwnedPieces(() =>
    repos.looks.create(userId, {
      name,
      nameProvisional: input.name === undefined,
      pieces: pieceIds.map((pieceId) => ({ pieceId })),
      photoAssetId: read.assetId,
      // Her own outfit from her own photograph: hers from the start, never a suggestion.
      status: 'saved',
    }),
  );
  if (input.wornOn) await repos.looks.wear(userId, row.id, input.wornOn);
  return toLook(userId, row);
}
