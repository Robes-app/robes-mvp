import { randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { UserId } from '../../src/ids';
import { createRepositories, createSystemRepositories } from '../../src/repos';
import { createTestDb, createTestUser, deleteTestUsers } from '../fixtures';

const db = createTestDb();
const repos = createRepositories(db);
const { overnight } = createSystemRepositories(db);
// 03:30 UTC: 04:30 in Dublin (IST), 12:30 in Tokyo, 23:30 the day before in New York.
const NOW = new Date('2026-09-24T03:30:00Z');
const users: UserId[] = [];

async function person(opts: {
  timezone: string;
  sessionDaysAgo?: number;
  jobDaysAgo?: number;
  onboarded?: boolean;
}): Promise<UserId> {
  const id = await createTestUser(db, 'Niall Maher');
  users.push(id);
  await db.updateTable('profiles').set({ timezone: opts.timezone }).where('id', '=', id).execute();
  if (opts.onboarded !== false) await repos.profiles.completeOnboarding(id);
  if (opts.sessionDaysAgo !== undefined) {
    await db
      .insertInto('sessions')
      .values({
        userId: id,
        token: randomUUID(),
        expiresAt: new Date(NOW.getTime() + 30 * 86_400_000),
        updatedAt: new Date(NOW.getTime() - opts.sessionDaysAgo * 86_400_000),
      })
      .execute();
  }
  if (opts.jobDaysAgo !== undefined) {
    const { job } = await repos.jobs.create(id, { kind: 'fake', input: {} });
    await db
      .updateTable('generationJobs')
      .set({ createdAt: new Date(NOW.getTime() - opts.jobDaysAgo * 86_400_000) })
      .where('id', '=', job.id)
      .execute();
  }
  return id;
}

let dublin: UserId;
let tokyo: UserId;
let stale: UserId;
let jobOnly: UserId;
let notOnboarded: UserId;
let badZone: UserId;

beforeAll(async () => {
  dublin = await person({ timezone: 'Europe/Dublin', sessionDaysAgo: 3 });
  tokyo = await person({ timezone: 'Asia/Tokyo', sessionDaysAgo: 1 });
  stale = await person({ timezone: 'Europe/Dublin', sessionDaysAgo: 10 });
  jobOnly = await person({ timezone: 'Europe/London', jobDaysAgo: 2 });
  notOnboarded = await person({ timezone: 'Europe/Dublin', sessionDaysAgo: 1, onboarded: false });
  badZone = await person({ timezone: 'Not/AZone', sessionDaysAgo: 1 });
});
afterAll(async () => {
  await db.deleteFrom('batchSubmissions').where(sql<boolean>`true`).execute();
  await deleteTestUsers(db, ...users);
  await db.destroy();
});

const candidates = () => overnight.candidates({ now: NOW, limit: 50, userIds: users });

describe('overnight selection (M5 task 3)', () => {
  it('picks active, onboarded people whose local time is 04:00, with their local date', async () => {
    const rows = await candidates();
    expect(rows.map((r) => r.userId).sort()).toEqual([dublin, jobOnly].sort());
    expect(rows.find((r) => r.userId === dublin)?.localDate).toBe('2026-09-24');
    // Not picked: Tokyo is at 12:30, a 10-day-old session, not onboarded, an unknown zone.
    for (const id of [tokyo, stale, notOnboarded, badZone]) {
      expect(rows.map((r) => r.userId)).not.toContain(id);
    }
  });

  it('creates one overnight job per person per local date', async () => {
    const first = await overnight.createJob(dublin, '2026-09-24', { closetIds: [] });
    expect(first).toBeDefined();
    expect(await overnight.createJob(dublin, '2026-09-24', {})).toBeUndefined();
    expect((await candidates()).map((r) => r.userId)).not.toContain(dublin);
    const job = await db
      .selectFrom('generationJobs')
      .select([
        'kind',
        'status',
        'input',
        sql<boolean>`lease_until > now() + interval '3 hours'`.as('longLease'),
      ])
      .where('id', '=', first ?? '')
      .executeTakeFirstOrThrow();
    expect(job).toMatchObject({ kind: 'daily', status: 'running', longLease: true });
    expect(job.input).toMatchObject({ overnight: true, date: '2026-09-24' });
    // An overnight job doesn't count as her own activity.
    const rows = await overnight.candidates({
      now: new Date('2026-09-25T03:30:00Z'),
      limit: 50,
      userIds: [stale],
    });
    expect(rows).toEqual([]);
  });

  it('hands each job to exactly one path: batch apply or the interactive fallback', async () => {
    const a = (await overnight.createJob(jobOnly, '2026-09-24', {})) ?? '';
    expect((await overnight.claimForApply(a))?.userId).toBe(jobOnly);
    expect(await overnight.claimForApply(a)).toBeUndefined();
    expect(await overnight.releaseToInteractive([a])).toEqual([]);

    const b = (await overnight.createJob(jobOnly, '2026-09-25', {})) ?? '';
    expect(await overnight.releaseToInteractive([b])).toEqual([b]);
    // The sweeper now sees an expired lease; the interactive claim bumps attempts, so a late
    // batch result can no longer apply.
    const stale = await createSystemRepositories(db).jobs.stale(60, 1000);
    expect(stale).toContain(b);
    await createSystemRepositories(db).jobs.claim(b, 60);
    expect(await overnight.claimForApply(b)).toBeUndefined();
  });

  it('keeps open submissions until they finish', async () => {
    const id = await overnight.recordSubmission({
      provider: 'fake',
      providerBatchId: 'fake|today.daily|text.fast|x',
      feature: 'today.daily',
      jobIds: [randomUUID()],
    });
    expect((await overnight.open()).map((s) => s.id)).toContain(id);
    await overnight.finishSubmission(id, 'applied');
    expect((await overnight.open()).map((s) => s.id)).not.toContain(id);
  });

  it('finds her overnight look for her date, keeps it off the tray, and feeds the morning cue', async () => {
    const jobId = (await overnight.createJob(dublin, '2026-09-26', {})) ?? '';
    const lookId = await createSystemRepositories(db).styling.createDailyLook(dublin, {
      jobId,
      title: 'Studio',
      subtitle: 'Linen and loafers',
      data: { overnight: true, date: '2026-09-26', images: [] },
    });
    expect(await repos.dailyLooks.overnightFor(dublin, '2026-09-26')).toMatchObject({
      id: lookId,
      subtitle: 'Linen and loafers',
    });
    expect(await repos.dailyLooks.overnightFor(dublin, '2026-09-27')).toBeUndefined();
    expect(await repos.dailyLooks.overnightFor(tokyo, '2026-09-26')).toBeUndefined();
    expect((await repos.jobs.recent(dublin, ['daily'])).map((j) => j.id)).not.toContain(jobId);

    const state = await createSystemRepositories(db).notifier.state([dublin], {
      from: '2026-09-25',
      to: '2026-09-27',
    });
    expect(state.overnight).toEqual([
      { userId: dublin, id: lookId, date: '2026-09-26', headline: 'Linen and loafers' },
    ]);
  });
});
