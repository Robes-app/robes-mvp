import 'server-only';
import { ApiError } from '@robes/api';
import { Look, LookRole } from '@robes/contracts';
import { looks as copy } from '@robes/copy';
import { LookPiecesNotFound, type UserId } from '@robes/db';
import { repos } from './db';
import { toPieces } from './wardrobe';

type LookRow = NonNullable<Awaited<ReturnType<typeof repos.looks.get>>>;

export async function toLooks(userId: UserId, rows: LookRow[]): Promise<Look[]> {
  const ids = rows.map((r) => r.id);
  const [pieceRows, stats] = await Promise.all([
    repos.looks.piecesFor(userId, ids),
    repos.looks.wearStats(userId, ids),
  ]);
  const pieces = await toPieces(userId, pieceRows);
  const byLook = new Map<string, Look['pieces']>();
  pieceRows.forEach((row, i) => {
    const piece = pieces[i];
    if (!piece) return;
    const list = byLook.get(row.lookId) ?? [];
    list.push({ piece, slot: row.slot, role: LookRole.nullable().parse(row.role) });
    byLook.set(row.lookId, list);
  });
  const wears = new Map(stats.map((s) => [s.lookId, s]));
  // Rows never leave as-is (CLAUDE.md rule 8): parse through the contract.
  return rows.map((row) =>
    Look.parse({
      id: row.id,
      name: row.name,
      nameProvisional: row.nameProvisional,
      note: row.note,
      source: row.source,
      originLookId: row.originLookId,
      climateBand: row.climateBand,
      pieces: byLook.get(row.id) ?? [],
      timesWorn: Number(wears.get(row.id)?.timesWorn ?? 0),
      lastWornOn: wears.get(row.id)?.lastWornOn ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }),
  );
}

export async function toLook(userId: UserId, row: LookRow | undefined): Promise<Look> {
  if (!row) throw new ApiError('not_found');
  const [look] = await toLooks(userId, [row]);
  if (!look) throw new ApiError('not_found');
  return look;
}

// Someone else's piece is indistinguishable from a missing one.
export async function withOwnedPieces<T>(write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (err) {
    if (err instanceof LookPiecesNotFound) throw new ApiError('not_found');
    throw err;
  }
}

export async function suggestedName(userId: UserId, firstPieceId: string | undefined) {
  const first = firstPieceId ? await repos.wardrobe.get(userId, firstPieceId) : undefined;
  return copy.suggestedName(first?.label ?? null);
}
