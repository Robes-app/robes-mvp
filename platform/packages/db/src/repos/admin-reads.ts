import { isIP } from 'node:net';
import { sql } from 'kysely';
import type { Db } from '../client';
import { NotAdmin } from '../errors';
import type { UserId } from '../ids';
import { collectMetrics } from './admin-metrics';
import { afterCursor, toPage } from './paging';

// Who is reading, from where: every admin read of user data leaves an audit row (SEC-11).
export interface AdminActor {
  admin: UserId;
  ip: string;
}

const JOB_LIMIT = 20;

// Admin-only reads and writes. Each method re-checks the actor is an admin before touching data,
// then audits, so a wiring mistake in a route can't leak or silently read.
export function adminReadsRepo(db: Db) {
  async function authorise(actor: AdminActor): Promise<void> {
    const row = await db
      .selectFrom('adminUsers')
      .select('role')
      .where('userId', '=', actor.admin)
      .executeTakeFirst();
    if (row?.role !== 'admin') throw new NotAdmin();
  }

  async function audit(
    actor: AdminActor,
    action: string,
    subject: {
      userId?: string;
      table?: string;
      id?: string;
      detail?: Record<string, unknown>;
    } = {},
  ): Promise<void> {
    await db
      .insertInto('auditLog')
      .values({
        actorId: actor.admin,
        action,
        subjectUserId: subject.userId ?? null,
        subjectTable: subject.table ?? null,
        subjectId: subject.id ?? null,
        detail: JSON.stringify(subject.detail ?? {}),
        ip: isIP(actor.ip) ? actor.ip : null,
      })
      .execute();
  }

  return {
    async listUsers(
      actor: AdminActor,
      q: { email?: string | undefined; limit: number; cursor?: string | undefined },
    ) {
      await authorise(actor);
      let query = db
        .selectFrom('users')
        .select((eb) => [
          'users.id',
          'users.email',
          'users.name',
          'users.createdAt',
          eb
            .selectFrom('wardrobeItems')
            .select((s) => s.fn.countAll<string>().as('n'))
            .whereRef('wardrobeItems.userId', '=', 'users.id')
            .where('wardrobeItems.deletedAt', 'is', null)
            .as('pieces'),
          eb
            .selectFrom('looks')
            .select((s) => s.fn.countAll<string>().as('n'))
            .whereRef('looks.userId', '=', 'users.id')
            .where('looks.deletedAt', 'is', null)
            .as('looks'),
          eb
            .selectFrom('generationJobs')
            .select((s) => s.fn.countAll<string>().as('n'))
            .whereRef('generationJobs.userId', '=', 'users.id')
            .as('jobs'),
          eb
            .selectFrom('sessions')
            .select((s) => s.fn.max('sessions.updatedAt').as('at'))
            .whereRef('sessions.userId', '=', 'users.id')
            .as('lastActiveAt'),
        ])
        .orderBy(sql`date_trunc('milliseconds', users.created_at)`, 'desc')
        .orderBy('users.id', 'desc')
        .limit(q.limit + 1);
      // Prefix match only; % and _ in her input are literals, not wildcards.
      if (q.email) {
        const prefix = q.email.toLowerCase().replace(/[\\%_]/g, (c) => `\\${c}`);
        query = query.where(sql<boolean>`lower(users.email::text) like ${`${prefix}%`}`);
      }
      const after = afterCursor(q.cursor, 'users');
      if (after) query = query.where(after);
      const page = toPage(await query.execute(), q.limit);
      await audit(actor, 'admin.users.list', {
        table: 'users',
        detail: { email: q.email ?? null },
      });
      return page;
    },

    async userDetail(actor: AdminActor, userId: string) {
      await authorise(actor);
      const user = await db
        .selectFrom('users')
        .innerJoin('profiles', 'profiles.id', 'users.id')
        .select([
          'users.id',
          'users.email',
          'users.name',
          'users.createdAt',
          'profiles.firstName',
          'profiles.lastName',
          'profiles.timezone',
          'profiles.locale',
          'profiles.onboardedAt',
        ])
        .where('users.id', '=', userId)
        .executeTakeFirst();
      if (!user) return undefined;
      const [consents, usage, jobs, deletion, role] = await Promise.all([
        db
          .selectFrom('consents')
          .distinctOn('kind')
          .select(['kind', 'granted', 'createdAt'])
          .where('userId', '=', userId)
          .orderBy('kind')
          .orderBy('createdAt', 'desc')
          .execute(),
        db
          .selectFrom('usageCounters')
          .select(['metric', 'count'])
          .where('userId', '=', userId)
          .where('periodStart', '=', sql<Date>`(now() at time zone 'utc')::date`)
          .orderBy('metric')
          .execute(),
        db
          .selectFrom('generationJobs')
          .select([
            'id',
            'kind',
            'status',
            'error',
            'createdAt',
            'finishedAt',
            sql<number | null>`(extract(epoch from finished_at - started_at) * 1000)::int`.as(
              'durationMs',
            ),
          ])
          .where('userId', '=', userId)
          .orderBy('createdAt', 'desc')
          .limit(JOB_LIMIT)
          .execute(),
        db
          .selectFrom('accountDeletionRequests')
          .select(['status', 'requestedAt'])
          .where('userId', '=', userId)
          .executeTakeFirst(),
        db.selectFrom('adminUsers').select('role').where('userId', '=', userId).executeTakeFirst(),
      ]);
      await audit(actor, 'admin.user.read', { userId, table: 'users', id: userId });
      return { user, consents, usage, jobs, deletion: deletion ?? null, role: role?.role ?? null };
    },

    // Last 24 h of jobs: counts by kind × status, duration percentiles, the commonest errors.
    async health(actor: AdminActor) {
      await authorise(actor);
      const since = sql<Date>`now() - interval '24 hours'`;
      const [counts, durations, errors] = await Promise.all([
        db
          .selectFrom('generationJobs')
          .select((eb) => ['kind', 'status', eb.fn.countAll<string>().as('n')])
          .where('createdAt', '>=', since)
          .groupBy(['kind', 'status'])
          .orderBy('kind')
          .orderBy('status')
          .execute(),
        db
          .selectFrom('generationJobs')
          .select([
            'kind',
            sql<number>`percentile_cont(0.5) within group (order by extract(epoch from finished_at - started_at) * 1000)`.as(
              'p50Ms',
            ),
            sql<number>`percentile_cont(0.95) within group (order by extract(epoch from finished_at - started_at) * 1000)`.as(
              'p95Ms',
            ),
          ])
          .where('createdAt', '>=', since)
          .where('startedAt', 'is not', null)
          .where('finishedAt', 'is not', null)
          .groupBy('kind')
          .orderBy('kind')
          .execute(),
        db
          .selectFrom('generationJobs')
          .select((eb) => ['kind', 'error', eb.fn.countAll<string>().as('n')])
          .where('createdAt', '>=', since)
          .where('error', 'is not', null)
          .groupBy(['kind', 'error'])
          .orderBy(sql`count(*)`, 'desc')
          .limit(10)
          .execute(),
      ]);
      await audit(actor, 'admin.health.read');
      return { counts, durations, errors };
    },

    // Unit economics from the call ledger (never prompts or responses).
    async costs(actor: AdminActor, days: number) {
      await authorise(actor);
      const since = sql<Date>`now() - make_interval(days => ${days})`;
      const [daily, spenders, budget] = await Promise.all([
        db
          .selectFrom('generationCalls')
          .select((eb) => [
            sql<string>`(created_at at time zone 'utc')::date::text`.as('day'),
            'feature',
            'model',
            eb.fn.countAll<string>().as('calls'),
            eb.fn.sum<string>('costMicros').as('costMicros'),
          ])
          .where('createdAt', '>=', since)
          .groupBy([sql`1`, 'feature', 'model'])
          .orderBy(sql`1`, 'desc')
          .orderBy('feature')
          .execute(),
        db
          .selectFrom('generationCalls')
          .innerJoin('users', 'users.id', 'generationCalls.userId')
          .select((eb) => [
            'users.id',
            'users.email',
            eb.fn.countAll<string>().as('calls'),
            eb.fn.sum<string>('generationCalls.costMicros').as('costMicros'),
          ])
          .where('generationCalls.createdAt', '>=', since)
          .groupBy(['users.id', 'users.email'])
          .orderBy(sql`sum(generation_calls.cost_micros)`, 'desc')
          .limit(10)
          .execute(),
        db
          .selectFrom('platformBudget')
          .select(['modelFamily', 'costMicros', 'limitMicros'])
          .where('day', '=', sql<Date>`(now() at time zone 'utc')::date`)
          .orderBy('modelFamily')
          .execute(),
      ]);
      await audit(actor, 'admin.costs.read', { detail: { days } });
      return { daily, spenders, budget };
    },

    // Operating metrics over the last `days` (aggregates only, no one's content).
    async metrics(actor: AdminActor, days: number) {
      await authorise(actor);
      const m = await collectMetrics(db, days);
      await audit(actor, 'admin.metrics.read', { detail: { days } });
      return m;
    },

    async flags(actor: AdminActor) {
      await authorise(actor);
      return db
        .selectFrom('featureFlags')
        .select(['key', 'enabled', 'description', 'updatedAt'])
        .orderBy('key')
        .execute();
    },

    // Only seeded keys can change; the previous value goes into the audit row.
    async setFlag(actor: AdminActor, key: string, enabled: boolean) {
      await authorise(actor);
      return db.transaction().execute(async (trx) => {
        const before = await trx
          .selectFrom('featureFlags')
          .select('enabled')
          .where('key', '=', key)
          .forUpdate()
          .executeTakeFirst();
        if (!before) return undefined;
        const row = await trx
          .updateTable('featureFlags')
          .set({ enabled })
          .where('key', '=', key)
          .returning(['key', 'enabled', 'description', 'updatedAt'])
          .executeTakeFirstOrThrow();
        await trx
          .insertInto('auditLog')
          .values({
            actorId: actor.admin,
            action: 'admin.flag.set',
            subjectTable: 'feature_flags',
            subjectId: key,
            detail: JSON.stringify({ from: before.enabled, to: enabled }),
            ip: isIP(actor.ip) ? actor.ip : null,
          })
          .execute();
        return row;
      });
    },

    async auditLog(
      actor: AdminActor,
      q: { limit: number; cursor?: string | undefined; userId?: string | undefined },
    ) {
      await authorise(actor);
      let query = db
        .selectFrom('auditLog as a')
        .leftJoin('users as u', 'u.id', 'a.actorId')
        .select([
          'a.id',
          'a.action',
          'a.actorId',
          'u.email as actorEmail',
          'a.subjectUserId',
          'a.subjectTable',
          'a.subjectId',
          'a.detail',
          sql<string | null>`host(a.ip)`.as('ip'),
          'a.createdAt',
        ])
        .orderBy(sql`date_trunc('milliseconds', a.created_at)`, 'desc')
        .orderBy('a.id', 'desc')
        .limit(q.limit + 1);
      if (q.userId) query = query.where('a.subjectUserId', '=', q.userId);
      const after = afterCursor(q.cursor, 'a');
      if (after) query = query.where(after);
      const page = toPage(await query.execute(), q.limit);
      await audit(actor, 'admin.audit.read', { userId: q.userId });
      return page;
    },
  };
}
