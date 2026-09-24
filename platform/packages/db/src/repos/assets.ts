import type { UsageMetric } from '@robes/core';
import type { Db } from '../client';
import type { UserId } from '../ids';
import { usageRepo } from './usage';

export type AssetKind =
  | 'wardrobe'
  | 'wishlist'
  | 'headshot'
  | 'full_length'
  | 'look_photo'
  | 'generated'
  | 'render'
  | 'receipt';

// Face and body photos are sensitive (SEC-21).
const SENSITIVE: ReadonlySet<AssetKind> = new Set(['headshot', 'full_length']);

const ASSET_COLUMNS = [
  'id',
  'kind',
  'status',
  'contentType',
  'width',
  'height',
  'blurhash',
  'bytes',
  'renditions',
  'hasCutout',
  'createdAt',
] as const;

export function assetsRepo(db: Db) {
  const usage = usageRepo(db);

  return {
    // Quota + insert commit together, so a refused upload never leaves a pending row.
    createPending(
      userId: UserId,
      asset: { kind: AssetKind; contentType: string; bytes: number },
      opts: { quota?: { metric: UsageMetric; cost: number } } = {},
    ) {
      return db.transaction().execute(async (trx) => {
        if (opts.quota) {
          await usage.consume(userId, opts.quota.metric, opts.quota.cost, { executor: trx });
        }
        return trx
          .insertInto('assets')
          .values({
            userId,
            kind: asset.kind,
            contentType: asset.contentType,
            bytes: asset.bytes,
            sensitive: SENSITIVE.has(asset.kind),
            provider: 's3',
          })
          .returning(['id', 'kind', 'status'])
          .executeTakeFirstOrThrow();
      });
    },

    async getManyForUser(userId: UserId, assetIds: readonly string[]) {
      if (assetIds.length === 0) return [];
      return db
        .selectFrom('assets')
        .select(ASSET_COLUMNS)
        .where('id', 'in', [...assetIds])
        .where('userId', '=', userId)
        .where('deletedAt', 'is', null)
        .execute();
    },

    getForUser(userId: UserId, assetId: string) {
      return db
        .selectFrom('assets')
        .select(ASSET_COLUMNS)
        .where('id', '=', assetId)
        .where('userId', '=', userId)
        .where('deletedAt', 'is', null)
        .executeTakeFirst();
    },
  };
}

// Rendition worker: addresses assets by id and bucket key.
export function assetProcessingRepo(db: Db) {
  return {
    get(assetId: string) {
      return db
        .selectFrom('assets')
        .select(['id', 'userId', 'kind', 'status', 'contentType', 'bucketKey'])
        .where('id', '=', assetId)
        .executeTakeFirst();
    },

    async markReady(
      assetId: string,
      meta: {
        bucketKey: string;
        width: number;
        height: number;
        blurhash: string;
        renditions: Record<string, unknown>;
      },
    ): Promise<void> {
      await db
        .updateTable('assets')
        .set({
          status: 'ready',
          bucketKey: meta.bucketKey,
          width: meta.width,
          height: meta.height,
          blurhash: meta.blurhash,
          renditions: JSON.stringify(meta.renditions),
          error: null,
        })
        .where('id', '=', assetId)
        .execute();
    },

    async markFailed(assetId: string, error: string): Promise<void> {
      await db
        .updateTable('assets')
        .set({ status: 'failed', error: error.slice(0, 200) })
        .where('id', '=', assetId)
        .execute();
    },
  };
}
