import { sql } from 'kysely';
import type { Db } from '../client';
import type { UserId } from '../ids';
import { fileWear } from './looks';

// D23: a saved look pinned to a day becomes worn once that day has ended in her timezone.
// Worker-only. Her override is final because it leaves nothing for this to find: the × on a
// planned pin soft-deletes it (plan.remove), and the × on a worn day or a date in WornView takes
// the wear back and soft-deletes the pin with it (looks.unwear). Only a live `planned` pin with
// no wear on its day is ever filed.
export function passedPinsRepo(db: Db) {
  return {
    // Live planned pins of saved looks on days in [max(earliest, her today − catchUpDays),
    // her today), with no wear on that day yet; keyset-paged by pin id. A profile whose timezone
    // Postgres does not know is skipped rather than guessed: a wrong day would be a false record.
    due(opts: {
      now: Date;
      earliest: string;
      catchUpDays: number;
      limit: number;
      afterId?: string | undefined;
      userIds?: readonly string[] | undefined;
    }) {
      const now = sql<Date>`${opts.now.toISOString()}::timestamptz`;
      const today = sql<Date>`(case when pr.timezone in (select name from pg_timezone_names) then (${now} at time zone pr.timezone)::date end)`;
      let q = db
        .selectFrom('plannedDays as p')
        .innerJoin('profiles as pr', 'pr.id', 'p.userId')
        .innerJoin('looks as l', (j) =>
          j.onRef('l.id', '=', 'p.lookId').onRef('l.userId', '=', 'p.userId'),
        )
        .select(['p.id', 'p.userId'])
        .where('p.deletedAt', 'is', null)
        .where('p.sourceKind', '=', 'look')
        .where('p.status', '=', 'planned')
        .where('l.status', '=', 'saved')
        .where('l.deletedAt', 'is', null)
        .where('p.dayDate', '>=', sql<Date>`${opts.earliest}::date`)
        .where(sql<boolean>`p.day_date < ${today}`)
        .where(sql<boolean>`p.day_date >= ${today} - ${opts.catchUpDays}::int`)
        .where(
          sql<boolean>`not exists (select 1 from app.wears w where w.user_id = p.user_id and w.look_id = p.look_id and w.worn_on = p.day_date)`,
        )
        .orderBy('p.id')
        .limit(opts.limit);
      if (opts.afterId) q = q.where('p.id', '>', opts.afterId);
      if (opts.userIds?.length) q = q.where('p.userId', 'in', [...opts.userIds]);
      return q.execute();
    },

    // Files the pin's look as worn on its day (source `plan`), through the same path as her own
    // wears. The pin is locked first, so an unpin racing the job either lands before (nothing is
    // filed) or after (it removes a pin that is already worn). False when the pin is no longer a
    // live planned pin of hers, or its look is no longer saved.
    async file(userId: UserId, pinId: string): Promise<boolean> {
      return db.transaction().execute(async (trx) => {
        const pin = await trx
          .selectFrom('plannedDays')
          .select(['lookId', sql<string>`day_date::text`.as('dayDate')])
          .where('userId', '=', userId)
          .where('id', '=', pinId)
          .where('deletedAt', 'is', null)
          .where('sourceKind', '=', 'look')
          .where('status', '=', 'planned')
          .forUpdate()
          .executeTakeFirst();
        if (!pin?.lookId) return false;
        return (await fileWear(trx, userId, pin.lookId, pin.dayDate, 'plan')) !== undefined;
      });
    },
  };
}
