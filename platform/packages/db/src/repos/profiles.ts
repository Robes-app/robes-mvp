import { sql, type Updateable } from 'kysely';
import type { Db } from '../client';
import type { Profiles } from '../database.types';
import type { UserId } from '../ids';

// The only profile columns a user may change; everything else is server-owned (SEC-10).
export const EDITABLE_PROFILE_FIELDS = [
  'firstName',
  'lastName',
  'mobile',
  'genderIdentity',
  'styleIcons',
  'styleArchetypes',
  'budget',
  'annualSpend',
  'splurgeCategories',
  'wardrobeDescription',
  'instagramHandle',
  'notificationPrefs',
  'avatarPrefs',
  'locale',
  'timezone',
  'currency',
  'homeCity',
  'homeLat',
  'homeLon',
] as const;
export type ProfilePatch = Pick<Updateable<Profiles>, (typeof EDITABLE_PROFILE_FIELDS)[number]>;

function pickEditable(patch: ProfilePatch): ProfilePatch {
  const out: Record<string, unknown> = {};
  for (const key of EDITABLE_PROFILE_FIELDS) if (patch[key] !== undefined) out[key] = patch[key];
  return out as ProfilePatch;
}

export function profilesRepo(db: Db) {
  return {
    get(userId: UserId) {
      return db
        .selectFrom('profiles')
        .innerJoin('users', 'users.id', 'profiles.id')
        .selectAll('profiles')
        .select(['users.email', 'users.emailVerified'])
        .where('profiles.id', '=', userId)
        .executeTakeFirst();
    },

    async update(userId: UserId, patch: ProfilePatch) {
      const values = pickEditable(patch);
      if (Object.keys(values).length === 0) return this.get(userId);
      await db.updateTable('profiles').set(values).where('id', '=', userId).execute();
      return this.get(userId);
    },

    async completeOnboarding(userId: UserId): Promise<Date | null> {
      const row = await db
        .updateTable('profiles')
        .set({ onboardedAt: sql<Date>`coalesce(onboarded_at, now())` })
        .where('id', '=', userId)
        .returning('onboardedAt')
        .executeTakeFirst();
      return row?.onboardedAt ?? null;
    },
  };
}
