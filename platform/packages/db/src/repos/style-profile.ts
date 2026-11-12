import type { Palette } from '@robes/core/colour';
import { type Insertable, sql } from 'kysely';
import type { Db } from '../client';
import type { DB } from '../database.types';
import type { UserId } from '../ids';

const PROFILE_COLUMNS = [
  'season',
  'undertone',
  'contrast',
  'bodyType',
  'colourRender',
  'silhouetteRender',
  'headshotAssetId',
  'fullLengthAssetId',
  'userOverrides',
  'palette',
  'updatedAt',
] as const;

export interface StyleOverrides {
  loved_colors?: string[];
  rejected_colors?: string[];
  measurements?: Record<string, string>;
}

// Her style profile as she sees it; only the analysis job writes the derived fields (M4 task 2).
export function styleProfileRepo(db: Db) {
  return {
    get(userId: UserId) {
      return db
        .selectFrom('styleProfiles')
        .select(PROFILE_COLUMNS)
        .where('userId', '=', userId)
        .executeTakeFirst();
    },

    // Her corrections (outrank the photo read in every prompt); merged key by key.
    async setOverrides(userId: UserId, overrides: StyleOverrides) {
      const patch = JSON.stringify(overrides);
      return db
        .insertInto('styleProfiles')
        .values({ userId, userOverrides: patch })
        .onConflict((oc) =>
          oc
            .column('userId')
            .doUpdateSet({ userOverrides: sql`style_profiles.user_overrides || ${patch}::jsonb` }),
        )
        .returning(PROFILE_COLUMNS)
        .executeTakeFirstOrThrow();
    },

    // Her colours and prints (Avoid · No view · Love). Saving them retires the free-text colour
    // lists, which the palette replaced (they were mapped into it when she opened the sheet).
    async setPalette(userId: UserId, palette: Palette) {
      const value = JSON.stringify(palette);
      return db
        .insertInto('styleProfiles')
        .values({ userId, palette: value })
        .onConflict((oc) =>
          oc.column('userId').doUpdateSet({
            palette: value,
            userOverrides: sql`style_profiles.user_overrides - 'loved_colors' - 'rejected_colors'`,
          }),
        )
        .returning(PROFILE_COLUMNS)
        .executeTakeFirstOrThrow();
    },

    colourDna(userId: UserId) {
      return db
        .selectFrom('styleProfiles')
        .select('colorHarmony')
        .where('userId', '=', userId)
        .executeTakeFirst();
    },

    // A season she chose by hand replaces the read's render; the photograph stays hers.
    async chooseSeason(
      userId: UserId,
      v: { season: string; undertone: string; contrast: string; dna: unknown; render: unknown },
    ) {
      return db
        .updateTable('styleProfiles')
        .set({
          season: v.season,
          undertone: v.undertone,
          contrast: v.contrast,
          colorHarmony: JSON.stringify(v.dna),
          colourRender: JSON.stringify(v.render),
        })
        .where('userId', '=', userId)
        .where('colorHarmony', 'is not', null)
        .returning(PROFILE_COLUMNS)
        .executeTakeFirst();
    },
  };
}

// Worker side of the analysis job; scoped by the job owner's id (SEC-16).
export function styleAnalysisRepo(db: Db) {
  return {
    photo(userId: UserId, assetId: string) {
      return db
        .selectFrom('assets')
        .select(['id', 'kind', 'status'])
        .where('userId', '=', userId)
        .where('id', '=', assetId)
        .executeTakeFirst();
    },

    async saveColour(
      userId: UserId,
      v: {
        season: string;
        undertone: string;
        contrast: string;
        dna: unknown;
        render: unknown;
        assetId: string;
        modelVersion: string;
      },
    ): Promise<boolean> {
      const values = {
        season: v.season,
        undertone: v.undertone,
        contrast: v.contrast,
        colorHarmony: JSON.stringify(v.dna),
        colourRender: JSON.stringify(v.render),
        headshotAssetId: v.assetId,
        modelVersion: v.modelVersion,
      };
      return saveRead(db, userId, v.assetId, values);
    },

    async saveSilhouette(
      userId: UserId,
      v: { bodyType: string; dna: unknown; render: unknown; assetId: string; modelVersion: string },
    ): Promise<boolean> {
      const values = {
        bodyType: v.bodyType,
        silhouetteProportions: JSON.stringify(v.dna),
        silhouetteRender: JSON.stringify(v.render),
        fullLengthAssetId: v.assetId,
        modelVersion: v.modelVersion,
      };
      return saveRead(db, userId, v.assetId, values);
    },
  };
}

// A read lands only while its photo is still hers: one she deleted with her twin while it was
// read (model.deleteTwin) leaves nothing behind. The share lock makes a delete alongside wait.
async function saveRead(
  db: Db,
  userId: UserId,
  assetId: string,
  values: Omit<Insertable<DB['styleProfiles']>, 'userId'>,
): Promise<boolean> {
  return db.transaction().execute(async (trx) => {
    const photo = await trx
      .selectFrom('assets')
      .select('id')
      .where('id', '=', assetId)
      .where('userId', '=', userId)
      .where('deletedAt', 'is', null)
      .forShare()
      .executeTakeFirst();
    if (!photo) return false;
    await trx
      .insertInto('styleProfiles')
      .values({ userId, ...values })
      .onConflict((oc) => oc.column('userId').doUpdateSet(values))
      .execute();
    return true;
  });
}
