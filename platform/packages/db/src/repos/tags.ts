import { type Kysely, sql, type Transaction } from 'kysely';
import type { Db } from '../client';
import type { DB } from '../database.types';
import type { UserId } from '../ids';

// Her tags (tags cleanup, 26 Nov): one list per account (kind wear_for), shared by her looks and
// her pieces. Every account starts with the eight defaults (her_tags migration); she adds her own
// by typing them and deletes any of them.

// The ids of her tags for these labels, each made if it is new. A label she deleted comes back
// as a fresh tag of her own: its looks and pieces were let go when she deleted it.
export async function mintTags(
  tx: Kysely<DB> | Transaction<DB>,
  userId: UserId,
  labels: readonly string[],
): Promise<string[]> {
  const ids: string[] = [];
  for (const label of labels) {
    await tx
      .insertInto('tags')
      .values({ userId, kind: 'wear_for', label, isSeed: false })
      .onConflict((oc) =>
        oc
          .columns(['userId', 'kind', 'slug'])
          .doUpdateSet({ label, isSeed: false, deletedAt: null, createdAt: sql`now()` })
          .where('tags.deletedAt', 'is not', null),
      )
      .execute();
    const tag = await tx
      .selectFrom('tags')
      .select('id')
      .where('userId', '=', userId)
      .where('kind', '=', 'wear_for')
      .where(sql`slug`, '=', sql`private.tag_slug(${label})`)
      .where('deletedAt', 'is', null)
      .executeTakeFirst();
    if (tag && !ids.includes(tag.id)) ids.push(tag.id);
  }
  return ids;
}

export function tagsRepo(db: Db) {
  return {
    // Every tag in her list, with how many of her looks and pieces carry it (the delete asks
    // with these). The drawer orders them (`drawerOrder` in @robes/core/filters).
    async list(userId: UserId) {
      const rows = await db
        .selectFrom('tags')
        .select((eb) => [
          'tags.id',
          'tags.label',
          'tags.isSeed',
          'tags.createdAt',
          eb
            .selectFrom('tagLooks')
            .innerJoin('looks', (j) =>
              j
                .onRef('looks.id', '=', 'tagLooks.lookId')
                .onRef('looks.userId', '=', 'tagLooks.userId'),
            )
            .select((e) => e.fn.countAll<string>().as('n'))
            .whereRef('tagLooks.tagId', '=', 'tags.id')
            .where('tagLooks.userId', '=', userId)
            .where('looks.deletedAt', 'is', null)
            .as('looks'),
          eb
            .selectFrom('tagPieces')
            .innerJoin('wardrobeItems', (j) =>
              j
                .onRef('wardrobeItems.id', '=', 'tagPieces.wardrobeItemId')
                .onRef('wardrobeItems.userId', '=', 'tagPieces.userId'),
            )
            .select((e) => e.fn.countAll<string>().as('n'))
            .whereRef('tagPieces.tagId', '=', 'tags.id')
            .where('tagPieces.userId', '=', userId)
            .where('wardrobeItems.deletedAt', 'is', null)
            .as('pieces'),
        ])
        .where('tags.userId', '=', userId)
        .where('tags.kind', '=', 'wear_for')
        .where('tags.deletedAt', 'is', null)
        .execute();
      return rows.map((r) => ({
        id: r.id,
        label: r.label,
        isSeed: r.isSeed,
        createdAt: new Date(r.createdAt).toISOString(),
        looks: Number(r.looks ?? 0),
        pieces: Number(r.pieces ?? 0),
      }));
    },

    // She deletes a tag: it leaves her list and comes off every look and piece that carried it.
    // False when it is not hers (or already gone), and nothing is written.
    async remove(userId: UserId, tagId: string): Promise<boolean> {
      return db.transaction().execute(async (tx) => {
        const gone = await tx
          .updateTable('tags')
          .set({ deletedAt: sql`now()` })
          .where('userId', '=', userId)
          .where('id', '=', tagId)
          .where('kind', '=', 'wear_for')
          .where('deletedAt', 'is', null)
          .returning('id')
          .executeTakeFirst();
        if (!gone) return false;
        await tx
          .deleteFrom('tagLooks')
          .where('userId', '=', userId)
          .where('tagId', '=', tagId)
          .execute();
        await tx
          .deleteFrom('tagPieces')
          .where('userId', '=', userId)
          .where('tagId', '=', tagId)
          .execute();
        return true;
      });
    },
  };
}
