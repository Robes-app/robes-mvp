import type { UsageMetric } from '@robes/core';
import { type RawBuilder, sql } from 'kysely';
import type { Db } from '../client';
import type { DB } from '../database.types';
import type { UserId } from '../ids';
import { TWIN_ARCHIVE_DAYS, twinArchivesRepo } from './twin-archives';
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

// Every column that can hold an asset id, and how it is matched: `owner` within her own rows
// (composite FK, or hers by construction), `any` by id alone, `array` inside a uuid[]. Keyed by the
// generated schema, so typecheck fails when a new `…AssetId(s)` column isn't listed here; the DB
// test checks every foreign key into app.assets against it too.
type AssetIdColumn<T> = {
  [K in keyof T & string]: K extends `${string}${'assetId' | 'AssetId' | 'assetIds' | 'AssetIds'}`
    ? K
    : never;
}[keyof T & string];
type AssetIdRef = { [T in keyof DB & string]: `${T}.${AssetIdColumn<DB[T]>}` }[keyof DB & string];

export const ASSET_ID_COLUMNS = {
  'artifacts.coverAssetId': 'owner',
  'assets.sourceAssetId': 'owner',
  'avatars.twinAssetId': 'owner',
  // Its FK is on the id alone and nulls on delete, so it would never stop one.
  'feedback.photoAssetId': 'any',
  'generationAssets.assetId': 'owner',
  'generationCache.assetIds': 'array',
  'lookImages.assetId': 'owner',
  'looks.frameAssetId': 'owner',
  'looks.photoAssetId': 'owner',
  'looks.renderAssetId': 'owner',
  'styleProfiles.fullLengthAssetId': 'owner',
  'styleProfiles.headshotAssetId': 'owner',
  'wardrobeItems.cutoutAssetId': 'owner',
  'wardrobeItems.imageAssetId': 'owner',
  'wardrobeItems.sourceAssetId': 'owner',
  'wishlistItems.imageAssetId': 'owner',
} as const satisfies Record<AssetIdRef, 'owner' | 'any' | 'array'>;

const snake = (name: string) => name.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

// True while nothing holds asset `a` (callers alias app.assets as `a`): no column above, no job
// that was handed it (a photo read's input and output), no idea's frame. One `not exists` per
// place, so Postgres can anti-join them.
// A photo she deleted outright (her twin's, REMOVED_KINDS) is held by rows alone: the jobs that
// read or drew it are history, and must not keep its files.
function unheld(opts: { jobs: boolean } = { jobs: true }): RawBuilder<boolean> {
  const checks = Object.entries(ASSET_ID_COLUMNS).map(([ref, scope]) => {
    const [table, column] = ref.split('.').map(snake) as [string, string];
    const col = sql.id('r', column);
    const match =
      scope === 'array'
        ? sql`a.id = any(${col})`
        : scope === 'owner'
          ? sql`${col} = a.id and r.user_id = a.user_id`
          : sql`${col} = a.id`;
    return sql`not exists (select 1 from ${sql.id('app', table)} r where ${match})`;
  });
  if (!opts.jobs) return sql<boolean>`(${sql.join(checks, sql` and `)})`;
  checks.push(
    sql`not exists (select 1 from app.generation_jobs r where r.user_id = a.user_id and a.id::text in (lower(r.input ->> 'assetId'), lower(r.output ->> 'assetId')))`,
    sql`not exists (select 1 from app.artifacts r where r.user_id = a.user_id and r.data -> 'images' @> jsonb_build_array(jsonb_build_object('assetId', a.id::text)))`,
  );
  return sql<boolean>`(${sql.join(checks, sql` and `)})`;
}

// Only a look photo is ever discarded (D20: picked in image mode, never accepted).
const DISCARDABLE = 'look_photo';
// What deleting her twin marks deleted (model.deleteTwin): her photos and the twins drawn from them.
const REMOVED_KINDS = ['headshot', 'full_length', 'generated'] as const;

export type DiscardOutcome = 'discarded' | 'held' | 'not_found';
// Removes the asset's files; runs once its row is deleted, before the deletion commits.
export type RemoveAssetFiles = (userId: UserId, assetId: string) => Promise<unknown>;

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

    // Crops cut from a photo read that no piece took (skipped, or her piece kept its photo).
    async discardCrops(userId: UserId, sourceAssetId: string, assetIds: readonly string[]) {
      if (assetIds.length === 0) return 0;
      const res = await db
        .updateTable('assets')
        .set({ status: 'deleted', deletedAt: sql`now()` })
        .where('userId', '=', userId)
        .where('sourceAssetId', '=', sourceAssetId)
        .where('id', 'in', [...assetIds])
        .where('deletedAt', 'is', null)
        // A crop a piece or a wish took is theirs now, whatever the caller thought was spare.
        .where(({ not, exists, selectFrom, or }) =>
          not(
            or([
              exists(
                selectFrom('wardrobeItems as w')
                  .select('w.id')
                  .whereRef('w.imageAssetId', '=', 'assets.id')
                  .where('w.userId', '=', userId),
              ),
              exists(
                selectFrom('wishlistItems as l')
                  .select('l.id')
                  .whereRef('l.imageAssetId', '=', 'assets.id')
                  .where('l.userId', '=', userId),
              ),
            ]),
          ),
        )
        .executeTakeFirst();
      return Number(res.numUpdatedRows);
    },

    // D20: a look photo she uploaded in image mode and discarded before it was ever accepted.
    // Marked deleted at once (gone from every read); the maintenance worker, which alone may
    // delete media, removes its files and the row within the hour (staleUploads). Anyone else's,
    // another kind, or one already gone is `not_found`; one anything holds stays (`held`). The
    // row lock serialises a racing attach: its foreign key waits on the lock.
    async discardUpload(userId: UserId, assetId: string): Promise<DiscardOutcome> {
      return db.transaction().execute(async (trx) => {
        const row = await trx
          .selectFrom('assets')
          .select('id')
          .where('id', '=', assetId)
          .where('userId', '=', userId)
          .where('kind', '=', DISCARDABLE)
          .where('deletedAt', 'is', null)
          .forUpdate()
          .executeTakeFirst();
        if (!row) return 'not_found';
        const marked = await trx
          .updateTable('assets as a')
          .set({ status: 'deleted', deletedAt: sql`now()` })
          .where('a.id', '=', assetId)
          .where('a.userId', '=', userId)
          .where(unheld())
          .executeTakeFirst();
        return Number(marked.numUpdatedRows) > 0 ? 'discarded' : 'held';
      });
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
        .select(['id', 'userId', 'kind', 'status', 'contentType', 'bucketKey', 'crop'])
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
    ): Promise<boolean> {
      // False once it is discarded (marked deleted, or gone) mid-render: the caller removes what
      // it wrote, and the row stays deleted rather than coming back as ready.
      const res = await db
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
        .where('deletedAt', 'is', null)
        .executeTakeFirst();
      return Number(res.numUpdatedRows) > 0;
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

// Worker side (D20): deletes, files and row, every look photo nothing holds that she discarded
// (marked deleted by uploads.discard) or that has waited `olderThanHours` unattached (the app closed
// before Discard, or the discard failed). Only uploads from the last `withinDays` are looked at, so
// the photos on her looks aren't re-checked on every run forever.
function staleCandidate(opts: { olderThanHours: number; withinDays: number }): RawBuilder<boolean> {
  return sql<boolean>`(a.deleted_at is not null or (a.created_at < now() - make_interval(hours => ${opts.olderThanHours}) and a.created_at > now() - make_interval(days => ${opts.withinDays})))`;
}

export function staleUploadsRepo(db: Db) {
  return {
    // Keyset-paged by id.
    due(opts: {
      olderThanHours: number;
      withinDays: number;
      limit: number;
      afterId?: string | undefined;
    }) {
      let q = db
        .selectFrom('assets as a')
        .select(['a.id', 'a.userId'])
        .where('a.kind', '=', DISCARDABLE)
        .where('a.userId', 'is not', null)
        .where(staleCandidate(opts))
        .where(unheld())
        .orderBy('a.id')
        .limit(opts.limit)
        .$narrowType<{ userId: string }>();
      if (opts.afterId) q = q.where('a.id', '>', opts.afterId);
      return q.execute();
    },

    // One transaction: lock her row, delete it only while nothing holds it (an attach since `due`
    // keeps it), then remove its files. A storage failure rolls the row back, so the next run
    // tries again; a commit that fails after the files went leaves a row the next run finds.
    async discard(
      userId: UserId,
      assetId: string,
      opts: { olderThanHours: number; withinDays: number },
      removeFiles: RemoveAssetFiles,
    ): Promise<DiscardOutcome> {
      try {
        return await db.transaction().execute(async (trx) => {
          const row = await trx
            .selectFrom('assets as a')
            .select('a.id')
            .where('a.id', '=', assetId)
            .where('a.userId', '=', userId)
            .where('a.kind', '=', DISCARDABLE)
            .where(staleCandidate(opts))
            .forUpdate()
            .executeTakeFirst();
          if (!row) return 'not_found';
          const gone = await trx
            .deleteFrom('assets as a')
            .where('a.id', '=', assetId)
            .where('a.userId', '=', userId)
            .where(unheld())
            .returning('a.id')
            .executeTakeFirst();
          if (!gone) return 'held';
          await removeFiles(userId, assetId);
          return 'discarded';
        });
      } catch (err) {
        // 23503: a foreign key still points at it. unheld() should have caught it first.
        if ((err as { code?: string }).code === '23503') return 'held';
        throw err;
      }
    },

    // Her twin's photos, marked deleted when she deleted it: due once the 30 days in which it can
    // be put back are up (twin-archives.ts). Keyset-paged by id.
    dueRemoved(opts: { limit: number; afterId?: string | undefined }) {
      let q = db
        .selectFrom('assets as a')
        .select(['a.id', 'a.userId'])
        .where('a.kind', 'in', REMOVED_KINDS)
        .where('a.deletedAt', '<', sql<Date>`now() - make_interval(days => ${TWIN_ARCHIVE_DAYS})`)
        .where('a.userId', 'is not', null)
        .where(unheld({ jobs: false }))
        .orderBy('a.id')
        .limit(opts.limit)
        .$narrowType<{ userId: string }>();
      if (opts.afterId) q = q.where('a.id', '>', opts.afterId);
      return q.execute();
    },

    // A deleted twin's archive goes when its photographs do, its 30 days up.
    purgeTwinArchives: () => twinArchivesRepo(db).purge(),

    // As discard: the row goes only while nothing holds it, and a storage failure rolls it back.
    async discardRemoved(
      userId: UserId,
      assetId: string,
      removeFiles: RemoveAssetFiles,
    ): Promise<DiscardOutcome> {
      try {
        return await db.transaction().execute(async (trx) => {
          const gone = await trx
            .deleteFrom('assets as a')
            .where('a.id', '=', assetId)
            .where('a.userId', '=', userId)
            .where('a.kind', 'in', REMOVED_KINDS)
            .where(
              'a.deletedAt',
              '<',
              sql<Date>`now() - make_interval(days => ${TWIN_ARCHIVE_DAYS})`,
            )
            .where(unheld({ jobs: false }))
            .returning('a.id')
            .executeTakeFirst();
          if (!gone) return 'held';
          await removeFiles(userId, assetId);
          return 'discarded';
        });
      } catch (err) {
        if ((err as { code?: string }).code === '23503') return 'held';
        throw err;
      }
    },
  };
}
