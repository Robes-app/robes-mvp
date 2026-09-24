import { sql } from 'kysely';
import type { Db } from '../client';

// The overnight Today look (M5 task 3). Worker-side only: selection, batch bookkeeping, and the
// handover of each job between the batch path and the interactive fallback.
export const OVERNIGHT_LOCAL_HOUR = 4;
// While a batch is out, its jobs hold a lease this long; when it lapses the sweeper runs them
// interactively, so a stuck batch still produces the look before she wakes.
export const OVERNIGHT_LEASE_HOURS = 4;
export const overnightKey = (date: string): string => `overnight:${date}`;

export function overnightRepo(db: Db) {
  return {
    // Onboarded people whose local time is 04:xx at `now`, active in the last 7 days (a session
    // refreshed or a job started), without an overnight look for their local date yet.
    async candidates(opts: { now: Date; limit: number; userIds?: readonly string[] | undefined }) {
      const now = sql<Date>`${opts.now.toISOString()}::timestamptz`;
      // CASE guards evaluation order: an unknown zone yields null instead of an error.
      const local = sql`(case when p.timezone in (select name from pg_timezone_names) then ${now} at time zone p.timezone end)`;
      let q = db
        .selectFrom('profiles as p')
        .innerJoin('users as u', 'u.id', 'p.id')
        .select([
          'p.id as userId',
          'p.timezone',
          sql<string>`(${local})::date::text`.as('localDate'),
        ])
        .where('p.onboardedAt', 'is not', null)
        .where(sql<boolean>`extract(hour from ${local}) = ${OVERNIGHT_LOCAL_HOUR}`)
        .where((eb) =>
          eb.or([
            eb.exists(
              eb
                .selectFrom('sessions as s')
                .select('s.id')
                .whereRef('s.userId', '=', 'p.id')
                .where('s.updatedAt', '>', sql<Date>`${now} - interval '7 days'`),
            ),
            eb.exists(
              eb
                .selectFrom('generationJobs as j')
                .select('j.id')
                .whereRef('j.userId', '=', 'p.id')
                .where('j.createdAt', '>', sql<Date>`${now} - interval '7 days'`)
                .where(sql<boolean>`coalesce(j.input->>'overnight', 'false') <> 'true'`),
            ),
          ]),
        )
        .where(({ not, exists, selectFrom }) =>
          not(
            exists(
              selectFrom('generationJobs as o')
                .select('o.id')
                .whereRef('o.userId', '=', 'p.id')
                .where(
                  'o.idempotencyKey',
                  '=',
                  sql<string>`'overnight:' || (${local})::date::text`,
                ),
            ),
          ),
        )
        .orderBy('p.id')
        .limit(opts.limit);
      if (opts.userIds?.length) q = q.where('p.id', 'in', [...opts.userIds]);
      return q.execute();
    },

    // One overnight job per person per local date (the idempotency key); running with a long lease
    // so neither the transport nor the sweeper touches it while the batch is out.
    async createJob(
      userId: string,
      date: string,
      input: Record<string, unknown>,
    ): Promise<string | undefined> {
      const row = await db
        .insertInto('generationJobs')
        .values({
          userId,
          kind: 'daily',
          status: 'running',
          stage: 'queued',
          input: JSON.stringify({ ...input, overnight: true, date }),
          idempotencyKey: overnightKey(date),
          leaseUntil: sql`now() + make_interval(hours => ${OVERNIGHT_LEASE_HOURS})`,
          startedAt: sql`now()`,
        })
        .onConflict((oc) => oc.columns(['userId', 'idempotencyKey']).doNothing())
        .returning('id')
        .executeTakeFirst();
      return row?.id;
    },

    async recordSubmission(s: {
      provider: 'gemini' | 'fake';
      providerBatchId: string;
      feature: string;
      jobIds: readonly string[];
    }): Promise<string> {
      const row = await db
        .insertInto('batchSubmissions')
        .values({
          provider: s.provider,
          providerBatchId: s.providerBatchId,
          feature: s.feature,
          jobIds: [...s.jobIds],
        })
        .returning('id')
        .executeTakeFirstOrThrow();
      return row.id;
    },

    open(limit = 20) {
      return db
        .selectFrom('batchSubmissions')
        .select(['id', 'provider', 'providerBatchId', 'feature', 'jobIds', 'submittedAt'])
        .where('status', '=', 'submitted')
        .orderBy('submittedAt')
        .limit(limit)
        .execute();
    },

    async finishSubmission(id: string, status: 'applied' | 'failed'): Promise<void> {
      await db
        .updateTable('batchSubmissions')
        .set({ status, finishedAt: sql`now()` })
        .where('id', '=', id)
        .where('status', '=', 'submitted')
        .execute();
    },

    // Takes a batch result's job back for applying, unless the interactive fallback already has it
    // (it bumps `attempts`). Returns the owner and input to finish the job with.
    claimForApply(jobId: string) {
      return db
        .updateTable('generationJobs')
        .set({ attempts: sql`attempts + 1`, leaseUntil: sql`now() + interval '10 minutes'` })
        .where('id', '=', jobId)
        .where('status', '=', 'running')
        .where('attempts', '=', 0)
        .where('cancelRequestedAt', 'is', null)
        .where(sql<boolean>`input->>'overnight' = 'true'`)
        .returning(['id', 'userId', 'input'])
        .executeTakeFirst();
    },

    // Batch submission failed or the batch failed: expire the leases so the jobs run interactively
    // at once (the caller enqueues them); returns the ids that were still waiting.
    async releaseToInteractive(jobIds: readonly string[]): Promise<string[]> {
      if (jobIds.length === 0) return [];
      const rows = await db
        .updateTable('generationJobs')
        .set({ leaseUntil: sql`now() - interval '1 second'` })
        .where('id', 'in', [...jobIds])
        .where('status', '=', 'running')
        .where('attempts', '=', 0)
        .returning('id')
        .execute();
      return rows.map((r) => r.id);
    },
  };
}
