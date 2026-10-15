import { sql } from 'kysely';
import type { Db } from '../client';
import type { UserId } from '../ids';

// Her hand picks, stored on profiles.avatar_prefs; presence is profiles.gender_identity.
export interface StoredModelPicks {
  skin?: number;
  hair?: number;
  line?: 'soft' | 'straight' | null;
  frame?: 'fuller' | 'narrower' | null;
}

// "Your model" (M6 task 1): her picks, what her photo reads say, and the model she has filed.
export function modelRepo(db: Db) {
  return {
    async get(userId: UserId) {
      const row = await db
        .selectFrom('profiles as p')
        .leftJoin('styleProfiles as s', 's.userId', 'p.id')
        .leftJoin('avatars as a', 'a.userId', 'p.id')
        .select([
          'p.genderIdentity',
          'p.avatarPrefs',
          'a.avatarId as filedCellId',
          's.bodyType',
          sql<string | null>`s.color_harmony->'extracted_values'->>'skin_tone_hex'`.as('skinHex'),
          sql<string | null>`s.color_harmony->'extracted_values'->>'hair_color_hex'`.as('hairHex'),
          sql<boolean>`s.color_harmony is not null`.as('colourRead'),
          sql<boolean>`s.silhouette_proportions is not null`.as('silhouetteRead'),
        ])
        .where('p.id', '=', userId)
        .executeTakeFirst();
      return row;
    },

    // Merged key by key in SQL, so two quick picks never lose one another.
    async savePicks(
      userId: UserId,
      picks: StoredModelPicks,
      presence?: 'woman' | 'man' | 'unspecified',
    ): Promise<void> {
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
