import { sql } from 'kysely';
import type { Db } from '../client';
import type { UserId } from '../ids';

// Calendar days are read as text so no timezone can move them (CLAUDE.md rule 23).
const dayDate = sql<string>`day_date::text`;
// Whether she wore this look on this day: a wear on the same look and date.
const wornHere = (t: string) =>
  sql<boolean>`exists (select 1 from app.wears w where w.user_id = ${sql.ref(`${t}.user_id`)} and w.look_id = ${sql.ref(`${t}.look_id`)} and w.worn_on = ${sql.ref(`${t}.day_date`)})`;

const ENTRY_COLUMNS = [
  'id',
  'lookId',
  'slot',
  'pinned',
  'status',
  'activity',
  'createdAt',
] as const;

export type PlanSlot = 'day' | 'evening';

// Plan: looks pinned to days (M5 task 4). All derivation is server-side; clients never sweep.
export function planRepo(db: Db) {
  const active = () =>
    db.selectFrom('plannedDays').where('deletedAt', 'is', null).where('sourceKind', '=', 'look');

  const entry = (userId: UserId, id: string) =>
    active()
      .select([...ENTRY_COLUMNS, dayDate.as('dayDate'), wornHere('planned_days').as('worn')])
      .where('userId', '=', userId)
      .where('id', '=', id)
      .executeTakeFirst();

  return {
    // Entries on [from, to] whose look still exists, in day then slot order.
    range(userId: UserId, from: string, to: string) {
      return db
        .selectFrom('plannedDays as p')
        .innerJoin('looks as l', (j) =>
          j.onRef('l.id', '=', 'p.lookId').onRef('l.userId', '=', 'p.userId'),
        )
        .select([
          'p.id',
          'p.lookId',
          'p.slot',
          'p.pinned',
          'p.status',
          'p.activity',
          'p.createdAt',
          sql<string>`p.day_date::text`.as('dayDate'),
          wornHere('p').as('worn'),
        ])
        .where('p.userId', '=', userId)
        .where('p.deletedAt', 'is', null)
        .where('p.sourceKind', '=', 'look')
        .where('l.deletedAt', 'is', null)
        .where('p.dayDate', '>=', sql<Date>`${from}::date`)
        .where('p.dayDate', '<=', sql<Date>`${to}::date`)
        .orderBy('p.dayDate')
        .orderBy(sql`case p.slot when 'day' then 0 else 1 end`)
        .orderBy('p.createdAt')
        .execute();
    },

    get: entry,

    // Pins a look to each day; a look already on that day and slot keeps its entry (idempotent).
    async pin(
      userId: UserId,
      lookId: string,
      days: readonly string[],
      opts: { slot: PlanSlot; activity?: string | null | undefined },
    ) {
      return db.transaction().execute(async (trx) => {
        // Only a saved look reaches a day (legacy 2026-10-10): a suggestion or a draft is saved first.
        const look = await trx
          .selectFrom('looks')
          .select(['id'])
          .where('userId', '=', userId)
          .where('id', '=', lookId)
          .where('status', '=', 'saved')
          .where('deletedAt', 'is', null)
          .executeTakeFirst();
        if (!look) return undefined;
        const pieces = await trx
          .selectFrom('lookPieces')
          .select('wardrobeItemId')
          .where('userId', '=', userId)
          .where('lookId', '=', lookId)
          .orderBy('position')
          .execute();
        // A named day lends its name to the look she pins there.
        const named = days.length
          ? await trx
              .selectFrom('dayNames')
              .select([dayDate.as('dayDate'), 'name'])
              .where('userId', '=', userId)
              .where(sql<boolean>`day_date = any(${days}::date[])`)
              .execute()
          : [];
        const nameOf = new Map(named.map((n) => [n.dayDate, n.name]));
        const ids: string[] = [];
        for (const day of days) {
          const row = await trx
            .insertInto('plannedDays')
            .values({
              userId,
              dayDate: day,
              sourceKind: 'look',
              lookId,
              slot: opts.slot,
              pinned: true,
              activity: opts.activity ?? nameOf.get(day) ?? null,
              itemIds: pieces.map((p) => p.wardrobeItemId),
            })
            .onConflict((oc) =>
              oc
                .columns(['userId', 'lookId', 'dayDate', 'slot'])
                .where('lookId', 'is not', null)
                .where('deletedAt', 'is', null)
                .doUpdateSet({ updatedAt: sql`now()` }),
            )
            .returning('id')
            .executeTakeFirstOrThrow();
          ids.push(row.id);
        }
        return ids;
      });
    },

    async update(
      userId: UserId,
      id: string,
      fields: { activity?: string | null | undefined; slot?: PlanSlot | undefined },
    ) {
      const values = {
        ...(fields.activity !== undefined ? { activity: fields.activity } : {}),
        ...(fields.slot !== undefined ? { slot: fields.slot } : {}),
      };
      if (Object.keys(values).length === 0) return entry(userId, id);
      const res = await db
        .updateTable('plannedDays')
        .set(values)
        .where('userId', '=', userId)
        .where('id', '=', id)
        .where('deletedAt', 'is', null)
        .where('sourceKind', '=', 'look')
        .executeTakeFirst();
      return res.numUpdatedRows > 0n ? entry(userId, id) : undefined;
    },

    // Her names for the days on [from, to], with or without looks on them.
    names(userId: UserId, from: string, to: string) {
      return db
        .selectFrom('dayNames')
        .select([dayDate.as('dayDate'), 'name'])
        .where('userId', '=', userId)
        .where('dayDate', '>=', sql<Date>`${from}::date`)
        .where('dayDate', '<=', sql<Date>`${to}::date`)
        .orderBy('dayDate')
        .execute();
    },

    // Names a day (null clears it); every look on it carries the name, as before day names existed.
    async nameDay(userId: UserId, day: string, name: string | null): Promise<void> {
      await db.transaction().execute(async (trx) => {
        if (name === null) {
          await trx
            .deleteFrom('dayNames')
            .where('userId', '=', userId)
            .where('dayDate', '=', sql<Date>`${day}::date`)
            .execute();
        } else {
          await trx
            .insertInto('dayNames')
            .values({ userId, dayDate: day, name })
            .onConflict((oc) => oc.columns(['userId', 'dayDate']).doUpdateSet({ name }))
            .execute();
        }
        await trx
          .updateTable('plannedDays')
          .set({ activity: name })
          .where('userId', '=', userId)
          .where('dayDate', '=', sql<Date>`${day}::date`)
          .where('sourceKind', '=', 'look')
          .where('deletedAt', 'is', null)
          .execute();
      });
    },

    // Unpin (soft); undone by restore unless the same look was pinned there again meanwhile.
    async remove(userId: UserId, id: string): Promise<boolean> {
      const res = await db
        .updateTable('plannedDays')
        .set({ deletedAt: sql`now()` })
        .where('userId', '=', userId)
        .where('id', '=', id)
        .where('deletedAt', 'is', null)
        .executeTakeFirst();
      return res.numUpdatedRows > 0n;
    },

    async restore(userId: UserId, id: string): Promise<boolean> {
      try {
        const res = await db
          .updateTable('plannedDays')
          .set({ deletedAt: null })
          .where('userId', '=', userId)
          .where('id', '=', id)
          .where('deletedAt', 'is not', null)
          .executeTakeFirst();
        return res.numUpdatedRows > 0n;
      } catch (err) {
        // 23505: the look is already back on that day; the undo has nothing left to do.
        if ((err as { code?: string }).code === '23505') return true;
        throw err;
      }
    },
  };
}
