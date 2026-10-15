import type { FeatureFlag } from '@robes/core';
import type { Db } from '../client';

export function flagsRepo(db: Db) {
  return {
    // Unknown flags are off: a typo must fail closed.
    async isEnabled(key: FeatureFlag): Promise<boolean> {
      const row = await db
        .selectFrom('featureFlags')
        .select('enabled')
        .where('key', '=', key)
        .executeTakeFirst();
      return row?.enabled ?? false;
    },
  };
}
