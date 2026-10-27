import type { Db } from '../client';
import type { UserId } from '../ids';
import { failTwin, modelRow } from './model';

// Worker side of "see it on me": the look's pieces and where the render lands. Scoped by the job
// owner's id (SEC-16/22): only her own look, her own pieces and her own model.
export function modelRenderRepo(db: Db) {
  return {
    async look(userId: UserId, lookId: string) {
      const look = await db
        .selectFrom('looks')
        .select(['id', 'name', 'renderKey', 'renderStatus', 'styling'])
        .where('userId', '=', userId)
        .where('id', '=', lookId)
        .where('deletedAt', 'is', null)
        .executeTakeFirst();
      if (!look) return undefined;
      const pieces = await db
        .selectFrom('lookPieces as lp')
        .innerJoin('wardrobeItems as w', (j) =>
          j.onRef('w.id', '=', 'lp.wardrobeItemId').onRef('w.userId', '=', 'lp.userId'),
        )
        .leftJoin('assets as a', (j) =>
          j.onRef('a.id', '=', 'w.imageAssetId').onRef('a.userId', '=', 'w.userId'),
        )
        .select([
          'w.id',
          'w.label',
          'w.category',
          'w.color',
          'w.brand',
          'w.imageAssetId',
          'a.status as assetStatus',
        ])
        .where('lp.userId', '=', userId)
        .where('lp.lookId', '=', lookId)
        .where('w.deletedAt', 'is', null)
        .orderBy('lp.position')
        .execute();
      return { look, pieces };
    },

    // Lands only if the look still wants this render (she may have changed model or rack since).
    async setRender(userId: UserId, lookId: string, renderKey: string, assetId: string) {
      await db
        .updateTable('looks')
        .set({ renderStatus: 'ready', renderAssetId: assetId, renderClaimedAt: null })
        .where('userId', '=', userId)
        .where('id', '=', lookId)
        .where('renderKey', '=', renderKey)
        .execute();
    },

    async failRender(userId: UserId, lookId: string, renderKey: string) {
      await db
        .updateTable('looks')
        .set({ renderStatus: 'failed' })
        .where('userId', '=', userId)
        .where('id', '=', lookId)
        .where('renderKey', '=', renderKey)
        .where('renderStatus', '=', 'pending')
        .execute();
    },

    // The cell the render stands on; the catalog is shared (no user data in it).
    cell(key: string) {
      return db
        .selectFrom('avatarCells')
        .select(['id', 'status', 'bucketKey', 'contentType'])
        .where('id', '=', key)
        .executeTakeFirst();
    },

    // Her model and twin inputs, read by the job owner's id.
    model(userId: UserId) {
      return modelRow(db, userId);
    },

    // Lands only if this is still the twin she asked for.
    async setTwin(userId: UserId, key: string, assetId: string): Promise<boolean> {
      const row = await db
        .updateTable('avatars')
        .set({ twinAssetId: assetId, twinKey: key, twinDrawKey: null, twinDrawStatus: null })
        .where('userId', '=', userId)
        .where('twinDrawKey', '=', key)
        .returning('userId')
        .executeTakeFirst();
      return row !== undefined;
    },

    failTwin(userId: UserId, key: string) {
      return failTwin(db, userId, key);
    },
  };
}
