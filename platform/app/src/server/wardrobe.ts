import 'server-only';
import { ApiError } from '@robes/api';
import { type BatchPiecesOutput, Piece } from '@robes/contracts';
import { wardrobe as copy } from '@robes/copy';
import type { UserId } from '@robes/db';
import { toImage } from './asset-urls';
import { repos } from './db';
import { createAndEnqueueJob } from './jobs';
import { mediaDelivery } from './media';

type PieceRow = NonNullable<Awaited<ReturnType<typeof repos.wardrobe.get>>>;
type AssetRow = Awaited<ReturnType<typeof repos.assets.getManyForUser>>[number];

async function toPiece(
  userId: UserId,
  row: PieceRow,
  asset: AssetRow | undefined,
  wearCount: number,
): Promise<Piece> {
  const image = asset ? await toImage(mediaDelivery, userId, asset) : null;
  // Rows never leave as-is (CLAUDE.md rule 8): parse through the contract.
  return Piece.parse({
    id: row.id,
    label: row.label,
    category: row.category,
    categoryL2: row.categoryL2,
    categoryL3: row.categoryL3,
    color: row.color,
    colourShade: row.colourShade,
    colourExtra: row.colourExtra,
    print: row.print,
    colourCheck: (row.itemDna as { colour_check?: unknown } | null)?.colour_check === true,
    brand: row.brand,
    notes: row.notes,
    status: row.status,
    heroPosition: row.heroPosition,
    seasonBand: row.seasonBand,
    price: row.price === null ? null : Number(row.price),
    currency: row.currency,
    size: row.size,
    image,
    wearCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export async function toPieces(userId: UserId, rows: PieceRow[]): Promise<Piece[]> {
  const assetIds = rows.flatMap((r) => (r.imageAssetId ? [r.imageAssetId] : []));
  const [assetRows, wears] = await Promise.all([
    repos.assets.getManyForUser(userId, assetIds),
    repos.wardrobe.wearCounts(
      userId,
      rows.map((r) => r.id),
    ),
  ]);
  const assets = new Map(assetRows.map((a) => [a.id, a]));
  return Promise.all(
    rows.map((r) =>
      toPiece(
        userId,
        r,
        r.imageAssetId ? assets.get(r.imageAssetId) : undefined,
        wears.get(r.id) ?? 0,
      ),
    ),
  );
}

export async function loadPiece(userId: UserId, id: string): Promise<Piece> {
  const row = await repos.wardrobe.get(userId, id);
  if (!row) throw new ApiError('not_found');
  const [piece] = await toPieces(userId, [row]);
  if (!piece) throw new ApiError('not_found');
  return piece;
}

// Photos → reading pieces + one analyse job each. Re-sending the same photos returns the
// pieces already made from them, so a retried batch never duplicates (natural idempotency).
export async function createBatch(
  userId: UserId,
  assetIds: string[],
  traceparent?: string,
): Promise<BatchPiecesOutput> {
  const unique = [...new Set(assetIds)];
  if (await repos.capacity.isExhausted(['gemini-flash-lite'])) throw new ApiError('capacity');

  const assets = await repos.assets.getManyForUser(userId, unique);
  const usable = new Map(
    assets.filter((a) => a.kind === 'wardrobe' && a.status !== 'failed').map((a) => [a.id, a]),
  );
  if (usable.size !== unique.length) throw new ApiError('not_found');

  const existing = await repos.wardrobe.byImageAssets(userId, unique);
  const done = new Set(existing.map((p) => p.imageAssetId));
  const created: PieceRow[] = [];
  const jobs: BatchPiecesOutput['jobs'] = [];
  for (const assetId of unique.filter((id) => !done.has(id))) {
    const piece = await repos.wardrobe.create(userId, {
      label: copy.newPiece,
      imageAssetId: assetId,
      status: 'reading',
      acquiredVia: 'photo',
    });
    try {
      const job = await createAndEnqueueJob(
        userId,
        {
          kind: 'wardrobe_analyse',
          input: { pieceId: piece.id },
          quota: { metric: 'analyse.photo', cost: 1 },
        },
        traceparent,
      );
      created.push(piece);
      jobs.push({ pieceId: piece.id, jobId: job.jobId });
    } catch (err) {
      // No job means no reader; don't leave a piece stuck in "reading".
      await repos.wardrobe.remove(userId, piece.id);
      throw err;
    }
  }
  return { pieces: await toPieces(userId, [...existing, ...created]), jobs };
}
