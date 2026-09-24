import { createRepositories, createSystemRepositories, type UserId } from '@robes/db';
import { createTestDb, createTestUser, deleteTestUsers } from '@robes/db/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createHandlers } from '../src/handlers';
import type { JobLogger } from '../src/logger';
import { sweep } from '../src/outbox';
import { type RunJobDeps, runJob } from '../src/runtime';
import { createInlineTransport } from '../src/transport';

const db = createTestDb();
const repos = createRepositories(db);
const system = createSystemRepositories(db);
const logger: JobLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
const deps = (stepMs: number): RunJobDeps => ({
  jobs: system.jobs,
  handlers: createHandlers({ fake: { stepMs } }),
  logger,
  cancelPollMs: 10,
});
let alice: UserId;
let bob: UserId;

beforeAll(async () => {
  alice = await createTestUser(db, 'Alice Jobs');
  bob = await createTestUser(db, 'Bob Jobs');
});
afterAll(async () => {
  await deleteTestUsers(db, alice, bob);
  await db.destroy();
});

describe('job pipeline against Postgres', () => {
  it('create → inline transport → fake stages → succeeded, visible only to the owner', async () => {
    const { job } = await repos.jobs.create(alice, {
      kind: 'fake',
      input: {},
      quota: { metric: 'generation.text', cost: 1 },
    });
    const tasks: Array<() => Promise<void>> = [];
    const transport = createInlineTransport({
      run: (id) => runJob(id, deps(5)),
      schedule: (t) => tasks.push(t),
      logger,
    });
    await transport.send({ jobId: job.id });
    expect((await repos.jobs.getForUser(alice, job.id))?.status).toBe('queued');
    await Promise.all(tasks.map((t) => t()));

    const done = await repos.jobs.getForUser(alice, job.id);
    expect(done).toMatchObject({ status: 'succeeded', stage: 'done', error: null });
    expect(done?.output).toMatchObject({
      text: { title: expect.any(String), lines: expect.any(Array) },
      images: [0, 1, 2].map((idx) => ({ idx, status: 'placeholder' })),
    });
    expect(done?.finishedAt).toBeInstanceOf(Date);
    expect(await repos.jobs.getForUser(bob, job.id)).toBeUndefined();
  });

  it('treats a redelivered message as a no-op once the job has run', async () => {
    const { job } = await repos.jobs.create(alice, { kind: 'fake', input: {} });
    expect(await runJob(job.id, deps(1))).toBe('succeeded');
    expect(await runJob(job.id, deps(1))).toBe('skipped');
    const row = await db
      .selectFrom('generationJobs')
      .select('attempts')
      .where('id', '=', job.id)
      .executeTakeFirstOrThrow();
    expect(row.attempts).toBe(1);
  });

  it('cancels a running job at the next checkpoint', async () => {
    const { job } = await repos.jobs.create(alice, { kind: 'fake', input: {} });
    const running = runJob(job.id, deps(40));
    await vi.waitFor(async () =>
      expect((await repos.jobs.getForUser(alice, job.id))?.stage).toBe('text'),
    );
    expect(await repos.jobs.requestCancel(alice, job.id)).toBe(true);
    expect(await running).toBe('cancelled');
    expect(await repos.jobs.getForUser(alice, job.id)).toMatchObject({
      status: 'cancelled',
      stage: 'done',
    });
  });

  it('sweeps a job whose enqueue was lost', async () => {
    const { job } = await repos.jobs.create(alice, { kind: 'fake', input: {} });
    await db
      .updateTable('generationJobs')
      .set({ createdAt: new Date(Date.now() - 5 * 60_000) })
      .where('id', '=', job.id)
      .execute();
    const sent: string[] = [];
    await sweep({
      jobs: system.jobs,
      transport: { send: async (m) => void sent.push(m.jobId) },
      logger,
      limit: 10_000,
    });
    expect(sent).toContain(job.id);
  });
});
