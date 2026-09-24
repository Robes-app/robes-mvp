import { sql } from 'kysely';
import type { Db } from '../client';
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
    ): Promise<void> {
      const values = {
        season: v.season,
        undertone: v.undertone,
        contrast: v.contrast,
        colorHarmony: JSON.stringify(v.dna),
        colourRender: JSON.stringify(v.render),
        headshotAssetId: v.assetId,
        modelVersion: v.modelVersion,
      };
      await db
        .insertInto('styleProfiles')
        .values({ userId, ...values })
        .onConflict((oc) => oc.column('userId').doUpdateSet(values))
        .execute();
    },

    async saveSilhouette(
      userId: UserId,
      v: { bodyType: string; dna: unknown; render: unknown; assetId: string; modelVersion: string },
    ): Promise<void> {
      const values = {
        bodyType: v.bodyType,
        silhouetteProportions: JSON.stringify(v.dna),
        silhouetteRender: JSON.stringify(v.render),
        fullLengthAssetId: v.assetId,
        modelVersion: v.modelVersion,
      };
      await db
        .insertInto('styleProfiles')
        .values({ userId, ...values })
        .onConflict((oc) => oc.column('userId').doUpdateSet(values))
        .execute();
    },
  };
}
