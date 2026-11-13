import type { ConsentSource } from '@robes/core';
import type { Presence } from '@robes/core/avatar';
import { type ExpressionBuilder, sql } from 'kysely';
import type { Db } from '../client';
import type { DB } from '../database.types';
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
    // Robes read from those photos (her season with them), her measurements and her picks. Her
    // age band stays: she gives it under Style DNA › You, not for her twin (Annie, 12 Nov). The
    // photos are marked deleted at once (gone from every read) and the maintenance sweep deletes
    // their files (staleUploads.dueRemoved). Her looks stay; Robes' pictures of them drawn on her
    // twin go.
    // Her yes to the twin goes too, so the next selfie asks again. One transaction: the row locks
    // it takes make a colour read finishing alongside wait, then find its photo gone
    // (styleAnalysis.saveColour).
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
        // Robes' pictures of her looks drawn on her twin carry her face: they go too, and each
        // look is drawn again on a Robes model when it is next opened (useDressOnOpen). The looks
        // themselves, her photographs of them and her wears stay.
        const onTwin = (eb: ExpressionBuilder<DB, 'looks'>) =>
          eb.or([
            eb('stoodOn', '=', 'twin'),
            eb.and([eb('stoodOn', 'is', null), eb('renderKey', 'like', 'twin:%')]),
          ]);
        const pictured = await trx
          .selectFrom('looks')
          .select([
            'id',
            'renderAssetId',
            'renderKey',
            'renderStatus',
            'frameAssetId',
            'frameKey',
            'stoodOn',
          ])
          .where('userId', '=', userId)
          .where(onTwin)
          .forUpdate()
          .execute();
        const twins = [
          ...drawn.rows.map((r) => r.id),
          ...pictured.flatMap((l) => [l.renderAssetId, l.frameAssetId]).filter((id) => id !== null),
        ].map((id) => id.toLowerCase());
        const goes = (eb: ExpressionBuilder<DB, 'assets'>) =>
          eb.or([
            eb('kind', 'in', ['headshot', 'full_length']),
            ...(twins.length > 0
              ? [eb.and([eb('kind', '=', 'generated'), eb(sql`id::text`, 'in', twins)])]
              : []),
          ]);
        const going = await trx
          .selectFrom('assets')
          .select(['id', 'status'])
          .where('userId', '=', userId)
          .where('deletedAt', 'is', null)
          .where(goes)
          .forUpdate()
          .execute();
        // Held for 30 days in case she deleted it by mistake (owner, 13 Nov 2026): everything
        // cleared below, as it stood, so twinArchivesRepo.restore can put it back at her ask. Her
        // photographs wait the same 30 days (staleUploads.dueRemoved). Nothing reads the archive
        // but that restore, and the sweep removes it when its days are up.
        await sql`
          insert into app.twin_archives (user_id, snapshot)
          select ${userId}, jsonb_build_object(
            'assets', ${JSON.stringify(going)}::jsonb,
            'avatar', (select to_jsonb(a) from app.avatars a where a.user_id = ${userId}),
            'style', (select to_jsonb(x) from (
              select s.headshot_asset_id, s.full_length_asset_id, s.season, s.undertone, s.contrast,
                s.color_harmony, s.colour_render, s.body_type, s.silhouette_proportions,
                s.silhouette_render, s.user_overrides -> 'measurements' as measurements
              from app.style_profiles s where s.user_id = ${userId}) x),
            'profile', (select to_jsonb(x) from (
              select p.height_cm, p.size_uk, p.bust_band, p.bust_cup, p.bust_cm, p.waist_cm,
                p.avatar_prefs
              from app.profiles p where p.id = ${userId}) x),
            'looks', ${JSON.stringify(
              pictured.map((l) => ({
                id: l.id,
                render_asset_id: l.renderAssetId,
                render_key: l.renderKey,
                render_status: l.renderStatus,
                frame_asset_id: l.frameAssetId,
                frame_key: l.frameKey,
                stood_on: l.stoodOn,
              })),
            )}::jsonb)
          where ${going.length > 0}
            or exists (select 1 from app.avatars a where a.user_id = ${userId})`.execute(trx);
        await trx
          .updateTable('looks')
          .set({
            renderAssetId: null,
            renderKey: null,
            renderStatus: null,
            renderClaimedAt: null,
            frameAssetId: null,
            frameKey: null,
            stoodOn: null,
          })
          .where('userId', '=', userId)
          .where(onTwin)
          .execute();
        // A draw on her twin still running lands nowhere (setRender wants its key).
        await trx
          .updateTable('looks')
          .set({ renderKey: null, renderStatus: null, renderClaimedAt: null })
          .where('userId', '=', userId)
          .where('renderKey', 'like', 'twin:%')
          .execute();
        await trx
          .updateTable('assets')
          .set({ status: 'deleted', deletedAt: sql`now()` })
          .where('userId', '=', userId)
          .where('deletedAt', 'is', null)
          .where(goes)
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
