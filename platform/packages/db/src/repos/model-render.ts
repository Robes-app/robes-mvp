import { stoodOnOf } from '@robes/core/avatar';
import { sql } from 'kysely';
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
        .select(['id', 'name', 'renderKey', 'renderStatus', 'styling', 'pictureNote'])
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
    // The key names the model it stood on; the row remembers (plan 2026-11-05 §2.4). A fresh
    // picture is shown again; it leads only when she had hidden Robes' picture, else the cover
    // she chose stays in front (D19; Annie, 6 Nov).
    async setRender(userId: UserId, lookId: string, renderKey: string, assetId: string) {
      await db
        .updateTable('looks')
        .set({
          renderStatus: 'ready',
          renderAssetId: assetId,
          renderClaimedAt: null,
          stoodOn: stoodOnOf(renderKey),
          robesHidden: false,
          recordImage: sql<
            string | null
          >`case when robes_hidden then 'model' else record_image end`,
        })
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

    // A twin that landed too late to be hers: marked deleted for the maintenance sweep.
    async discardTwin(userId: UserId, assetId: string): Promise<void> {
      await db
        .updateTable('assets')
        .set({ status: 'deleted', deletedAt: sql`now()` })
        .where('userId', '=', userId)
        .where('id', '=', assetId)
        .where('kind', '=', 'generated')
        .where('deletedAt', 'is', null)
        .execute();
    },

    failTwin(userId: UserId, key: string) {
      return failTwin(db, userId, key);
    },

    // Her selfie's twin landed: she stands on it, over a Robes model she chose (the selfie wins).
    async standOnTwin(userId: UserId): Promise<void> {
      await db
        .updateTable('profiles')
        .set({ modelPreset: null })
        .where('id', '=', userId)
        .execute();
    },

    // The close-up a twin started early is drawn from: hers, a headshot, and how its render stands.
    closeUp(userId: UserId, assetId: string) {
      return db
        .selectFrom('assets')
        .select(['status'])
        .where('userId', '=', userId)
        .where('id', '=', assetId)
        .where('kind', '=', 'headshot')
        .executeTakeFirst();
    },

    // How her colour read of that close-up ended: an early twin is kept only once the read has
    // taken the photo as hers ('read'); no face, a failed read or a lost job is 'refused'.
    async colourRead(userId: UserId, jobId: string): Promise<'reading' | 'read' | 'refused'> {
      const job = await db
        .selectFrom('generationJobs')
        .select([
          'status',
          sql<boolean>`coalesce((output ->> 'noSubject')::boolean, false)`.as('noSubject'),
        ])
        .where('userId', '=', userId)
        .where('id', '=', jobId)
        .where('kind', '=', 'stylenotes_analyse')
        .executeTakeFirst();
      if (!job) return 'refused';
      if (job.status === 'queued' || job.status === 'running') return 'reading';
      return job.status === 'succeeded' && !job.noSubject ? 'read' : 'refused';
    },
  };
}
