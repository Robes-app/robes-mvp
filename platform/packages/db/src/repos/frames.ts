import { type RawBuilder, sql } from 'kysely';
import type { Db } from '../client';
import type { UserId } from '../ids';

// Frames of an idea (`data.images`) or a daily look, rendered on demand (UX-09, cost lever 1).
// Every write replaces one element of the jsonb array in a single UPDATE — never read-modify-write.
export type FramedType = 'idea' | 'daily_look';
export type StoredFrameStatus = 'pending' | 'ready' | 'failed' | 'deferred';
export interface StoredFrame {
  idx: number;
  assetId: string | null;
  status: StoredFrameStatus;
  jobId: string | null;
  claimedAt?: string;
}

// A pending claim older than this is treated as abandoned (the job died), so it can be retried.
const STALE_CLAIM = sql<Date>`now() - interval '10 minutes'`;

const images = sql`coalesce(data->'images', '[]'::jsonb)`;

// Generic so Kysely infers the column's type at each call site.
function withFrame<T>(idx: number, frame: RawBuilder<unknown>): RawBuilder<T> {
  return sql<T>`jsonb_set(data, '{images}', (
    select coalesce(jsonb_agg(e order by (e->>'idx')::int), '[]'::jsonb) from (
      select e from jsonb_array_elements(${images}) e where (e->>'idx')::int <> ${idx}
      union all select ${frame}
    ) s(e)
  ))`;
}

export function framesRepo(db: Db) {
  const target = (userId: UserId, id: string, type: FramedType) =>
    db
      .updateTable('artifacts')
      .where('userId', '=', userId)
      .where('id', '=', id)
      .where('type', '=', type)
      .where('deletedAt', 'is', null);

  return {
    get(userId: UserId, id: string, type: FramedType) {
      return db
        .selectFrom('artifacts')
        .select(['id', 'title', 'data', 'generationJobId'])
        .where('userId', '=', userId)
        .where('id', '=', id)
        .where('type', '=', type)
        .where('deletedAt', 'is', null)
        .executeTakeFirst();
    },

    async frame(
      userId: UserId,
      id: string,
      type: FramedType,
      idx: number,
    ): Promise<StoredFrame | undefined> {
      const row = await db
        .selectFrom('artifacts')
        .select(
          sql<StoredFrame | null>`(select e from jsonb_array_elements(${images}) e where (e->>'idx')::int = ${idx} limit 1)`.as(
            'frame',
          ),
        )
        .where('userId', '=', userId)
        .where('id', '=', id)
        .where('type', '=', type)
        .where('deletedAt', 'is', null)
        .executeTakeFirst();
      return row?.frame ?? undefined;
    },

    // Marks the frame pending unless it is ready or already rendering; true if this call claimed it.
    async claim(userId: UserId, id: string, type: FramedType, idx: number): Promise<boolean> {
      const frame = sql`jsonb_build_object('idx', ${idx}::int, 'assetId', null, 'status', 'pending', 'jobId', null, 'claimedAt', now())`;
      const res = await target(userId, id, type)
        .set({ data: withFrame(idx, frame) })
        .where(
          sql<boolean>`not exists (
            select 1 from jsonb_array_elements(${images}) e
            where (e->>'idx')::int = ${idx}
              and (e->>'status' = 'ready'
                or (e->>'status' = 'pending' and (e->>'claimedAt')::timestamptz > ${STALE_CLAIM}))
          )`,
        )
        .executeTakeFirst();
      return res.numUpdatedRows > 0n;
    },

    // Records which job renders a claimed frame; a frame that already finished is left alone.
    async setJob(userId: UserId, id: string, type: FramedType, idx: number, jobId: string) {
      const frame = sql`(select e || jsonb_build_object('jobId', ${jobId}::text) from jsonb_array_elements(${images}) e where (e->>'idx')::int = ${idx} limit 1)`;
      await target(userId, id, type)
        .set({ data: withFrame(idx, frame) })
        .where(
          sql<boolean>`exists (select 1 from jsonb_array_elements(${images}) e where (e->>'idx')::int = ${idx} and e->>'status' = 'pending')`,
        )
        .execute();
    },

    // Gives a claim back (the job couldn't be started), so she can ask again.
    async release(userId: UserId, id: string, type: FramedType, idx: number) {
      const frame = sql`jsonb_build_object('idx', ${idx}::int, 'assetId', null, 'status', 'deferred', 'jobId', null)`;
      await target(userId, id, type)
        .set({ data: withFrame(idx, frame) })
        .where(
          sql<boolean>`exists (select 1 from jsonb_array_elements(${images}) e where (e->>'idx')::int = ${idx} and e->>'status' = 'pending')`,
        )
        .execute();
    },

    async set(userId: UserId, id: string, type: FramedType, frame: StoredFrame): Promise<void> {
      await target(userId, id, type)
        .set({ data: withFrame(frame.idx, sql`${JSON.stringify(frame)}::jsonb`) })
        .execute();
    },
  };
}
