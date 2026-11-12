import type { ConsentSource } from '@robes/core';
import type { Presence } from '@robes/core/avatar';
import { sql } from 'kysely';
import type { Db } from '../client';
import type { UserId } from '../ids';

const STALE_DRAW = sql<Date>`now() - interval '10 minutes'`;

// Her model as it stands: picks, presence, what her photo reads say, the facts the twin is drawn
// from, her close-up, the filed cell and the twin on file. Shared by the API and the worker.
export function modelRow(db: Db, userId: UserId) {
  return db
    .selectFrom('profiles as p')
    .leftJoin('styleProfiles as s', 's.userId', 'p.id')
    .leftJoin('avatars as a', 'a.userId', 'p.id')
    .select([
      'p.genderIdentity',
      'p.avatarPrefs',
      'p.heightCm',
      'p.sizeUk',
      'p.bustBand',
      'p.bustCup',
      'p.bustCm',
      'p.waistCm',
      'p.ageBand',
      'p.modelPreset',
      'a.avatarId as filedCellId',
      'a.twinAssetId',
      'a.twinKey',
      'a.twinDrawKey',
      'a.twinDrawStatus',
      'a.twinDrawAt',
      's.bodyType',
      's.headshotAssetId',
      sql<string | null>`s.color_harmony->'extracted_values'->>'skin_tone_hex'`.as('skinHex'),
      sql<string | null>`s.color_harmony->'extracted_values'->>'hair_color_hex'`.as('hairHex'),
      sql<boolean>`s.color_harmony is not null`.as('colourRead'),
      sql<boolean>`s.silhouette_proportions is not null`.as('silhouetteRead'),
    ])
    .where('p.id', '=', userId)
    .executeTakeFirst();
}
export type ModelRow = NonNullable<Awaited<ReturnType<typeof modelRow>>>;

export async function failTwin(db: Db, userId: UserId, key: string): Promise<void> {
  await db
    .updateTable('avatars')
    .set({ twinDrawStatus: 'failed' })
    .where('userId', '=', userId)
    .where('twinDrawKey', '=', key)
    .where('twinDrawStatus', '=', 'pending')
    .execute();
}

// Her hand picks, stored on profiles.avatar_prefs; presence is profiles.gender_identity.
export interface StoredModelPicks {
  skin?: number;
  hair?: number;
  line?: 'soft' | 'straight' | null;
  frame?: 'fuller' | 'narrower' | null;
  // The twin's three sliders; null on a scale is "from your facts".
  adj?: { shoulders: number | null; bust: number | null; hips: number | null };
}

// "Your model" (M6 task 1): her picks, what her photo reads say, and the model she has filed.
export function modelRepo(db: Db) {
  return {
    get(userId: UserId) {
      return modelRow(db, userId);
    },

    // True when this caller should draw the twin for `key`: it is not the twin on file and no draw
    // of it is under way (a pending claim older than ten minutes is abandoned).
    async claimTwin(userId: UserId, key: string): Promise<boolean> {
      const row = await db
        .updateTable('avatars')
        .set({ twinDrawKey: key, twinDrawStatus: 'pending', twinDrawAt: sql`now()` })
        .where('userId', '=', userId)
        .where((eb) => eb.or([eb('twinKey', 'is', null), eb('twinKey', '<>', key)]))
        .where((eb) =>
          eb.or([
            eb('twinDrawKey', 'is', null),
            eb('twinDrawKey', '<>', key),
            eb('twinDrawStatus', '=', 'failed'),
            eb('twinDrawAt', '<', STALE_DRAW),
          ]),
        )
        .returning('userId')
        .executeTakeFirst();
      return row !== undefined;
    },

    // A draw that could not start (capacity, quota): the next visit may try again.
    async failTwin(userId: UserId, key: string): Promise<void> {
      await failTwin(db, userId, key);
    },

    // Merged key by key in SQL, so two quick picks never lose one another.
    async savePicks(userId: UserId, picks: StoredModelPicks, presence?: Presence): Promise<void> {
      await db
        .updateTable('profiles')
        .set({
          avatarPrefs: sql`coalesce(avatar_prefs, '{}'::jsonb) || ${JSON.stringify(picks)}::jsonb`,
          ...(presence ? { genderIdentity: presence } : {}),
        })
        .where('id', '=', userId)
        .execute();
    },

    // The Robes model she chose (plan 2026-11-05); null hands her looks back to her own twin or
    // cell. A number into a fixed catalog, checked again by the column.
    async savePreset(userId: UserId, n: number | null): Promise<void> {
      await db.updateTable('profiles').set({ modelPreset: n }).where('id', '=', userId).execute();
    },

    // Files the model she sees now (legacy auto-file on every pick).
    async file(userId: UserId, cellId: string, derivedFrom: Record<string, unknown>) {
      await db
        .insertInto('avatars')
        .values({ userId, avatarId: cellId, derivedFrom: JSON.stringify(derivedFrom) })
        .onConflict((oc) =>
          oc.column('userId').doUpdateSet({
            avatarId: cellId,
            derivedFrom: JSON.stringify(derivedFrom),
          }),
        )
        .execute();
    },

    // Her digital twin, deleted at her ask (Annie, 12 Nov 2026): every close-up and full-length
    // photo she gave, every twin drawn for her (the one on file and any a redraw replaced), what
    // Robes read from those photos, and the facts and picks a twin is drawn from. The photos are
    // marked deleted at once (gone from every read) and the maintenance sweep deletes their files
    // (staleUploads.dueRemoved). Her looks and their pictures are hers and stay. Her yes to the
    // twin goes too, so the next selfie asks again. One transaction: the row locks it takes make a
    // colour read finishing alongside wait, then find its photo gone (styleAnalysis.saveColour).
    async deleteTwin(userId: UserId, source: ConsentSource): Promise<void> {
      await db.transaction().execute(async (trx) => {
        const drawn = await sql<{ id: string }>`
          select distinct img ->> 'assetId' as id
          from app.generation_jobs j,
            jsonb_array_elements(
              case when jsonb_typeof(j.output -> 'images') = 'array'
                then j.output -> 'images' else '[]'::jsonb end
            ) img
          where j.user_id = ${userId}
            and j.kind = 'avatar_cell'
            and j.input ->> 'target' = 'twin'
            and img ->> 'assetId' is not null
          union
          select twin_asset_id::text from app.avatars
          where user_id = ${userId} and twin_asset_id is not null`.execute(trx);
        const twins = drawn.rows.map((r) => r.id.toLowerCase());
        await trx
          .updateTable('assets')
          .set({ status: 'deleted', deletedAt: sql`now()` })
          .where('userId', '=', userId)
          .where('deletedAt', 'is', null)
          .where((eb) =>
            eb.or([
              eb('kind', 'in', ['headshot', 'full_length']),
              ...(twins.length > 0
                ? [eb.and([eb('kind', '=', 'generated'), eb(sql`id::text`, 'in', twins)])]
                : []),
            ]),
          )
          .execute();
        await trx.deleteFrom('avatars').where('userId', '=', userId).execute();
        await trx
          .updateTable('styleProfiles')
          .set({
            headshotAssetId: null,
            fullLengthAssetId: null,
            season: null,
            undertone: null,
            contrast: null,
            colorHarmony: null,
            colourRender: null,
            bodyType: null,
            silhouetteProportions: null,
            silhouetteRender: null,
            userOverrides: sql`user_overrides - 'measurements'`,
          })
          .where('userId', '=', userId)
          .execute();
        await trx
          .updateTable('profiles')
          .set({
            heightCm: null,
            sizeUk: null,
            bustBand: null,
            bustCup: null,
            bustCm: null,
            waistCm: null,
            ageBand: null,
            avatarPrefs: null,
          })
          .where('id', '=', userId)
          .execute();
        await trx
          .insertInto('consents')
          .values({ userId, kind: 'photo_analysis', granted: false, source })
          .execute();
      });
    },

    async hasModel(userId: UserId): Promise<boolean> {
      const row = await db
        .selectFrom('avatars')
        .select('avatarId')
        .where('userId', '=', userId)
        .executeTakeFirst();
      return row !== undefined;
    },
  };
}
