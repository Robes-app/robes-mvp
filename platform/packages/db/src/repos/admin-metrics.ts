import { type RawBuilder, sql } from 'kysely';
import type { Db } from '../client';

// Operating metrics for the admin Metrics page: aggregates only, never a row of anyone's content.
// Days are UTC; the window is today and the days - 1 before it.

export interface MetricsDay {
  day: string;
  signups: number;
  active: number;
}

export interface MetricsJobKind {
  kind: string;
  total: number;
  succeeded: number;
  failed: number;
  cancelled: number;
  p50Ms: number | null;
  p95Ms: number | null;
  costMicros: number;
}

const n = (v: unknown): number => Number(v ?? 0);
const ms = (v: unknown): number | null =>
  v === null || v === undefined ? null : Math.round(Number(v));

// Anything she did that counts as being there that day (sessions keep only their last touch).
const activity = (since: RawBuilder<Date>) => sql`
  select user_id, created_at as at from app.generation_jobs where created_at >= ${since}
  union all select user_id, created_at from app.wardrobe_items where created_at >= ${since}
  union all select user_id, updated_at from app.looks where updated_at >= ${since}
  union all select user_id, confirmed_at from app.wears where confirmed_at >= ${since}
  union all select user_id, created_at from app.style_memory where created_at >= ${since}
  union all select user_id, updated_at from app.sessions where updated_at >= ${since}`;

export async function collectMetrics(db: Db, days: number) {
  const start = sql`((now() at time zone 'utc')::date - ${days - 1}::int)`;
  const since = sql<Date>`(${start}::timestamp at time zone 'utc')`;

  const daily = sql<{ day: string; signups: string; active: string }>`
    with d as (
      select generate_series(${start}, (now() at time zone 'utc')::date, interval '1 day')::date as day
    ),
    s as (
      select (created_at at time zone 'utc')::date as day, count(*) as n
      from app.users where created_at >= ${since} group by 1
    ),
    a as (
      select (at at time zone 'utc')::date as day, count(distinct user_id) as n
      from (${activity(since)}) x group by 1
    )
    select d.day::text as day, coalesce(s.n, 0) as signups, coalesce(a.n, 0) as active
    from d left join s using (day) left join a using (day) order by d.day`.execute(db);

  // Of the people who signed up in the window: filed a piece, saved a look, came back on a
  // later day within their first seven.
  const funnel = sql<{
    cohort: string;
    pieced: string;
    saved: string;
    returned: string;
  }>`
    with cohort as (select id, created_at from app.users where created_at >= ${since}),
    act as (
      select user_id, created_at as at from app.generation_jobs where user_id in (select id from cohort)
      union all select user_id, created_at from app.wardrobe_items where user_id in (select id from cohort)
      union all select user_id, updated_at from app.looks where user_id in (select id from cohort)
      union all select user_id, confirmed_at from app.wears where user_id in (select id from cohort)
      union all select user_id, created_at from app.style_memory where user_id in (select id from cohort)
      union all select user_id, updated_at from app.sessions where user_id in (select id from cohort)
    )
    select
      count(*) as cohort,
      count(*) filter (where exists (select 1 from app.wardrobe_items w where w.user_id = c.id)) as pieced,
      count(*) filter (where exists (
        select 1 from app.looks l where l.user_id = c.id and l.status = 'saved')) as saved,
      count(*) filter (where exists (
        select 1 from act where act.user_id = c.id
          and act.at >= date_trunc('day', c.created_at at time zone 'utc') at time zone 'utc' + interval '1 day'
          and act.at < c.created_at + interval '7 days')) as returned
    from cohort c`.execute(db);

  const pieces = db
    .selectFrom('wardrobeItems')
    .select((eb) => ['acquiredVia as source', eb.fn.countAll<string>().as('n')])
    .where('createdAt', '>=', since)
    .groupBy('acquiredVia')
    .orderBy(sql`count(*)`, 'desc')
    .execute();

  const looks = db
    .selectFrom('looks')
    .select((eb) => ['source', eb.fn.countAll<string>().as('n')])
    .where('createdAt', '>=', since)
    .where('status', '=', 'saved')
    .where('deletedAt', 'is', null)
    .groupBy('source')
    .orderBy(sql`count(*)`, 'desc')
    .execute();

  // The keep-or-pass deck: a keep saves the suggestion, a pass deletes it, an edit makes a draft.
  const deck = db
    .selectFrom('looks')
    .select([
      sql<string>`count(*) filter (where status = 'saved' and deleted_at is null)`.as('kept'),
      sql<string>`count(*) filter (where status = 'draft' and deleted_at is null)`.as('edited'),
      sql<string>`count(*) filter (where deleted_at is not null)`.as('passed'),
      sql<string>`count(*) filter (where status = 'suggested' and deleted_at is null)`.as(
        'waiting',
      ),
    ])
    .where('setId', 'is not', null)
    .where('createdAt', '>=', since)
    .executeTakeFirstOrThrow();

  // look_render is split by what it draws (a look's frame, her model wearing a look, a daily item).
  const jobs = sql<{
    kind: string;
    total: string;
    succeeded: string;
    failed: string;
    cancelled: string;
    p50: number | null;
    p95: number | null;
    cost: string | null;
  }>`
    with cost as (
      select job_id, sum(cost_micros) as c from app.generation_calls
      where job_id is not null and created_at >= ${since} - interval '1 day' group by job_id
    )
    select
      case when j.kind = 'look_render' then 'look_render:' || coalesce(j.input ->> 'target', 'other')
        else j.kind end as kind,
      count(*) as total,
      count(*) filter (where j.status in ('succeeded', 'partial')) as succeeded,
      count(*) filter (where j.status = 'failed') as failed,
      count(*) filter (where j.status = 'cancelled') as cancelled,
      percentile_cont(0.5) within group (order by extract(epoch from j.finished_at - j.started_at) * 1000)
        filter (where j.started_at is not null and j.finished_at is not null) as p50,
      percentile_cont(0.95) within group (order by extract(epoch from j.finished_at - j.started_at) * 1000)
        filter (where j.started_at is not null and j.finished_at is not null) as p95,
      sum(cost.c) as cost
    from app.generation_jobs j left join cost on cost.job_id = j.id
    where j.created_at >= ${since}
    group by 1 order by 1`.execute(db);

  // Right now, not the window: what waits, and what looks stuck.
  const queue = db
    .selectFrom('generationJobs')
    .select([
      sql<string>`count(*) filter (where status = 'queued')`.as('queued'),
      sql<string>`count(*) filter (where status = 'running')`.as('running'),
      sql<
        number | null
      >`extract(epoch from now() - min(created_at) filter (where status = 'queued'))`.as(
        'oldestQueuedSeconds',
      ),
      sql<string>`count(*) filter (where status = 'queued' and created_at < now() - interval '5 minutes')`.as(
        'staleQueued',
      ),
      sql<string>`count(*) filter (where status = 'running' and lease_until < now())`.as(
        'expiredLeases',
      ),
    ])
    .where('status', 'in', ['queued', 'running'])
    .executeTakeFirstOrThrow();

  const email = db
    .selectFrom('notifications')
    .select((eb) => ['status', eb.fn.countAll<string>().as('n')])
    .where('channel', '=', 'email')
    .where('sentAt', '>=', since)
    .groupBy('status')
    .execute();

  const suppressions = db
    .selectFrom('emailSuppressions')
    .select((eb) => ['reason', eb.fn.countAll<string>().as('n')])
    .where('createdAt', '>=', since)
    .groupBy('reason')
    .execute();

  const [d, f, p, l, dk, j, q, e, s] = await Promise.all([
    daily,
    funnel,
    pieces,
    looks,
    deck,
    jobs,
    queue,
    email,
    suppressions,
  ]);
  const fr = f.rows[0];
  const byKey = <T extends { n: string }>(rows: T[], key: keyof T) =>
    Object.fromEntries(rows.map((r) => [String(r[key]), n(r.n)]));
  const sent = byKey(e, 'status');
  const supp = byKey(s, 'reason');
  return {
    daily: d.rows.map(
      (r): MetricsDay => ({ day: r.day, signups: n(r.signups), active: n(r.active) }),
    ),
    funnel: {
      signedUp: n(fr?.cohort),
      firstPiece: n(fr?.pieced),
      firstSavedLook: n(fr?.saved),
      returned: n(fr?.returned),
    },
    piecesBySource: p.map((r) => ({ source: r.source, n: n(r.n) })),
    looksBySource: l.map((r) => ({ source: r.source, n: n(r.n) })),
    deck: { kept: n(dk.kept), edited: n(dk.edited), passed: n(dk.passed), waiting: n(dk.waiting) },
    jobs: j.rows.map(
      (r): MetricsJobKind => ({
        kind: r.kind,
        total: n(r.total),
        succeeded: n(r.succeeded),
        failed: n(r.failed),
        cancelled: n(r.cancelled),
        p50Ms: ms(r.p50),
        p95Ms: ms(r.p95),
        costMicros: n(r.cost),
      }),
    ),
    queue: {
      queued: n(q.queued),
      running: n(q.running),
      oldestQueuedSeconds:
        q.oldestQueuedSeconds === null ? null : Math.round(Number(q.oldestQueuedSeconds)),
      staleQueued: n(q.staleQueued),
      expiredLeases: n(q.expiredLeases),
    },
    email: {
      sent: sent.sent ?? 0,
      failed: sent.failed ?? 0,
      suppressed: sent.suppressed ?? 0,
      bounces: supp.bounce ?? 0,
      complaints: supp.complaint ?? 0,
      unsubscribes: supp.unsubscribe ?? 0,
    },
  };
}
