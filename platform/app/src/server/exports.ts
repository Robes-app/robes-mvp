import 'server-only';
import { DataExport } from '@robes/contracts';
import type { UserId } from '@robes/db';
import { repos } from './db';
import { mediaStorage } from './media';

type Row = NonNullable<Awaited<ReturnType<typeof repos.exports.latest>>>;

export const DOWNLOAD_TTL_SECONDS = 60 * 60;

export async function toExport(row: Row, now = new Date()): Promise<DataExport> {
  const expired = row.status === 'ready' && row.expiresAt !== null && row.expiresAt <= now;
  const ready = row.status === 'ready' && !expired && row.assetKey !== null;
  return DataExport.parse({
    id: row.id,
    status: expired ? 'expired' : row.status,
    requestedAt: row.requestedAt.toISOString(),
    readyAt: row.status === 'ready' ? row.updatedAt.toISOString() : null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    downloadUrl:
      ready && row.assetKey
        ? await mediaStorage.presignDownload(row.assetKey, {
            filename: `robes-data-${row.requestedAt.toISOString().slice(0, 10)}.json`,
            expiresIn: DOWNLOAD_TTL_SECONDS,
          })
        : null,
  });
}

export async function latestExport(userId: UserId): Promise<DataExport | null> {
  const row = await repos.exports.latest(userId);
  return row ? toExport(row) : null;
}
