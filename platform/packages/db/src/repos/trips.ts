import { sql } from 'kysely';
import type { Db } from '../client';
import type { UserId } from '../ids';

const COLUMNS = ['id', 'title', 'subtitle', 'data', 'generationJobId', 'createdAt'] as const;

export interface TripLookToPin {
  date: string;
  name: string;
  note: string;
  pieceIds: string[];
}

// Trips (travel edits): her packed capsule and looks for a trip (M5 task 6).
export function tripsRepo(db: Db) {
  const active = () =>
    db.selectFrom('artifacts').where('type', '=', 'travel_edit').where('deletedAt', 'is', null);

  return {
    get(userId: UserId, id: string) {
      return active()
        .select(COLUMNS)
        .where('userId', '=', userId)
        .where('id', '=', id)
        .executeTakeFirst();
    },

    list(userId: UserId, limit = 20) {
      return active()
        .select(COLUMNS)
        .where('userId', '=', userId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .execute();
    },

    async remove(userId: UserId, id: string): Promise<boolean> {
      const res = await db
        .updateTable('artifacts')
        .set({ deletedAt: sql`now()` })
        .where('userId', '=', userId)
        .where('id', '=', id)
        .where('type', '=', 'travel_edit')
        .where('deletedAt', 'is', null)
        .executeTakeFirst();
      return res.numUpdatedRows > 0n;
    },

    async restore(userId: UserId, id: string): Promise<boolean> {
      const res = await db
        .updateTable('artifacts')
        .set({ deletedAt: null })
        .where('userId', '=', userId)
        .where('id', '=', id)
        .where('type', '=', 'travel_edit')
        .where('deletedAt', 'is not', null)
        .executeTakeFirst();
      return res.numUpdatedRows > 0n;
    },

    // "Pin to plan": each trip look becomes a Look (source 'travel') pinned to its day, in one
    // transaction. The trip row is locked and remembers the looks, so a repeat pins nothing twice.
    async pin(
      userId: UserId,
      tripId: string,
      looks: readonly TripLookToPin[],
    ): Promise<string[] | undefined> {
      return db.transaction().execute(async (trx) => {
        const trip = await trx
          .selectFrom('artifacts')
          .select(['id', sql<unknown>`data->'pinned'->'lookIds'`.as('pinned')])
          .where('userId', '=', userId)
          .where('id', '=', tripId)
          .where('type', '=', 'travel_edit')
          .where('deletedAt', 'is', null)
          .forUpdate()
          .executeTakeFirst();
        if (!trip) return undefined;
        if (Array.isArray(trip.pinned)) return trip.pinned as string[];

        const wanted = [...new Set(looks.flatMap((l) => l.pieceIds))];
        const owned = new Set(
          wanted.length
            ? (
                await trx
                  .selectFrom('wardrobeItems')
                  .select('id')
                  .where('userId', '=', userId)
                  .where('id', 'in', wanted)
                  .where('deletedAt', 'is', null)
                  .execute()
              ).map((r) => r.id)
            : [],
        );
        const lookIds: string[] = [];
        for (const look of looks) {
          const pieceIds = [...new Set(look.pieceIds.filter((id) => owned.has(id)))];
          const row = await trx
            .insertInto('looks')
            .values({
              userId,
              name: look.name.slice(0, 120) || 'Trip look',
              nameProvisional: false,
              note: look.note.slice(0, 2000) || null,
              source: 'travel',
            })
            .returning('id')
            .executeTakeFirstOrThrow();
          if (pieceIds.length) {
            await trx
              .insertInto('lookPieces')
              .values(
                pieceIds.map((wardrobeItemId, position) => ({
                  lookId: row.id,
                  userId,
                  wardrobeItemId,
                  position,
                })),
              )
              .execute();
          }
          await trx
            .insertInto('plannedDays')
            .values({
              userId,
              dayDate: look.date,
              sourceKind: 'look',
              lookId: row.id,
              slot: 'day',
              pinned: true,
              itemIds: pieceIds,
            })
            .execute();
          lookIds.push(row.id);
        }
        await trx
          .updateTable('artifacts')
          .set({
            data: sql`data || jsonb_build_object('pinned', jsonb_build_object('lookIds', ${JSON.stringify(lookIds)}::jsonb, 'at', now()))`,
          })
          .where('id', '=', tripId)
          .execute();
        return lookIds;
      });
    },
  };
}
