import type { Season } from '@robes/core/taxonomy';
import { sql } from 'kysely';
import type { Db } from '../client';
import type { UserId } from '../ids';

// One seeded look as the server lands it in her account (plan "Seeded Christmas looks", 23 Nov):
// the drop's look with its pieces already shaped as proposals (her currency's price on each).
export interface SeedLanding {
  lookId: string;
  name: string;
  tags: readonly string[];
  seasons: readonly Season[];
  image: {
    catalogBase: string;
    width: number;
    height: number;
    blurhash: string | null;
    renditions: { v: 1; master: { width: number; height: number }; widths: number[] };
  } | null;
  frameKey: string | null;
  proposals: readonly Record<string, unknown>[];
}

// Seeded drops in her account: which she has had, landing a live one once, and taking an ended
// one's unsaved looks away. Every query is scoped by her id.
export function seedsRepo(db: Db) {
  return {
    async had(userId: UserId): Promise<Set<string>> {
      const rows = await db
        .selectFrom('userSeeds')
        .select('seedId')
        .where('userId', '=', userId)
        .execute();
      return new Set(rows.map((r) => r.seedId));
    },

    // Lands a drop's looks as her suggestions, the first first in the Lookbook. False (and nothing
    // written) when she has had the drop already: a drop lands once, even after she deletes it all.
    async land(userId: UserId, seedId: string, looks: readonly SeedLanding[]): Promise<boolean> {
      return db.transaction().execute(async (trx) => {
        const first = await trx
          .insertInto('userSeeds')
          .values({ userId, seedId })
          .onConflict((oc) => oc.columns(['userId', 'seedId']).doNothing())
          .returning('seedId')
          .executeTakeFirst();
        if (!first) return false;
        for (const [i, look] of looks.entries()) {
          const asset = look.image
            ? await trx
                .insertInto('assets')
                .values({
                  userId,
                  kind: 'generated',
                  status: 'ready',
                  contentType: 'image/jpeg',
                  width: look.image.width,
                  height: look.image.height,
                  blurhash: look.image.blurhash,
                  renditions: JSON.stringify(look.image.renditions),
                  catalogBase: look.image.catalogBase,
                })
                .returning('id')
                .executeTakeFirstOrThrow()
            : null;
          const row = await trx
            .insertInto('looks')
            .values({
              userId,
              name: look.name.slice(0, 120),
              nameProvisional: false,
              source: 'seed',
              status: 'suggested',
              seedId,
              seedLookId: look.lookId,
              seasons: [...look.seasons],
              proposals: look.proposals.length ? JSON.stringify(look.proposals) : null,
              frameAssetId: asset?.id ?? null,
              frameKey: asset ? look.frameKey : null,
              // The drop's order is the Lookbook's: newest first, so the first look a second newer.
              createdAt: sql`now() - make_interval(secs => ${i})`,
            })
            .returning('id')
            .executeTakeFirstOrThrow();
          for (const label of look.tags) {
            await trx
              .insertInto('tags')
              .values({ userId, kind: 'wear_for', label, isSeed: false })
              .onConflict((oc) => oc.columns(['userId', 'kind', 'slug']).doNothing())
              .execute();
            const tag = await trx
              .selectFrom('tags')
              .select('id')
              .where('userId', '=', userId)
              .where('kind', '=', 'wear_for')
              .where(sql`slug`, '=', sql`private.tag_slug(${label})`)
              .executeTakeFirst();
            if (!tag) continue;
            await trx
              .insertInto('tagLooks')
              .values({ userId, lookId: row.id, tagId: tag.id, source: 'inferred' })
              .onConflict((oc) => oc.columns(['tagId', 'lookId']).doNothing())
              .execute();
          }
        }
        return true;
      });
    },

    // An ended drop's looks she never saved leave the Lookbook (soft-deleted, as a passed
    // suggestion is). A look she saved, or made her draft, is hers and stays.
    async retire(userId: UserId, seedIds: readonly string[]): Promise<number> {
      if (seedIds.length === 0) return 0;
      const res = await db
        .updateTable('looks')
        .set({ deletedAt: sql`now()` })
        .where('userId', '=', userId)
        .where('seedId', 'in', [...seedIds])
        .where('status', '=', 'suggested')
        .where('deletedAt', 'is', null)
        .executeTakeFirst();
      return Number(res.numUpdatedRows);
    },
  };
}
