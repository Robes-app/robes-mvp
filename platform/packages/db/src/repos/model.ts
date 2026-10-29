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
