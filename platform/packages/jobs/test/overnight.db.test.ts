import { randomUUID } from 'node:crypto';
import { type BatchProvider, createFakeBatchProvider, createFakeProvider } from '@robes/ai';
import { FEATURE, fakeOutput } from '@robes/ai/prompts/daily';
import { createRepositories, createSystemRepositories, type UserId } from '@robes/db';
import { createTestDb, createTestUser, deleteTestUsers } from '@robes/db/testing';
import { afterAll, describe, expect, it, vi } from 'vitest';
import type { JobLogger } from '../src/logger';
import {
  createAnchorRenderer,
  type OvernightDeps,
  overnightTick,
  pollOvernight,
} from '../src/overnight';

const db = createTestDb();
const repos = createRepositories(db);
const system = createSystemRepositories(db);
const logger: JobLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
// 03:10 UTC is 04:10 in Dublin (IST).
const NOW = new Date('2026-09-24T03:10:00Z');
const users: UserId[] = [];

async function sleeper(): Promise<UserId> {
  const id = await createTestUser(db, 'Niall Maher');
  users.push(id);
  await db
    .updateTable('profiles')
    .set({ timezone: 'Europe/Dublin' })
    .where('id', '=', id)
    .execute();
  await repos.profiles.completeOnboarding(id);
  await db
    .insertInto('sessions')
    .values({
      userId: id,
      token: randomUUID(),
      expiresAt: new Date(NOW.getTime() + 86_400_000 * 30),
      updatedAt: NOW,
    })
    .execute();
  await repos.wardrobe.create(id, { label: 'Camel coat' });
  return id;
}

function deps(batch: BatchProvider, sent: string[]): OvernightDeps {
  const transport = { send: async (m: { jobId: string }) => void sent.push(m.jobId) };
  return {
    overnight: system.overnight,
    jobs: system.jobs,
    capacity: { isExhausted: async () => false },
    daily: {
      ai: createFakeProvider({}),
      storage: { putObject: vi.fn(async () => {}) },
      styling: system.styling,
      ledger: system.ledger,
      weather: (async () => null) as never,
    },
    batch,
    transport,
    renderAnchor: createAnchorRenderer({ repos, transport, logger }),
    logger,
  };
}

const fixtures = { [FEATURE]: () => fakeOutput(1) };

afterAll(async () => {
  await deleteTestUsers(db, ...users);
  await db.destroy();
});

describe('overnight Today look (M5 task 3)', () => {
  it('submits her prompt as a batch, then applies the result into a draft look for her date', async () => {
    const niall = await sleeper();
    const sent: string[] = [];
    const d = deps(createFakeBatchProvider(fixtures), sent);

    expect(await overnightTick(d, NOW, { userIds: [niall] })).toEqual({
      selected: 1,
      submitted: 1,
    });
    // A second tick in the same hour finds nothing new (one per local date).
    expect(await overnightTick(d, NOW, { userIds: [niall] })).toEqual({
      selected: 0,
      submitted: 0,
    });

    expect(await pollOvernight(d)).toMatchObject({ applied: 1, failed: 0 });
    const look = await db
      .selectFrom('artifacts')
      .select(['id', 'data', 'generationJobId'])
      .where('userId', '=', niall)
      .where('type', '=', 'daily_look')
      .executeTakeFirstOrThrow();
    expect(look.data).toMatchObject({ overnight: true, date: '2026-09-24' });
    const job = await db
      .selectFrom('generationJobs')
      .select(['status', 'artifactId'])
      .where('id', '=', look.generationJobId ?? '')
      .executeTakeFirstOrThrow();
    expect(job).toEqual({ status: 'succeeded', artifactId: look.id });

    // The anchor frame is drawn by a look_render job, enqueued for the interactive worker.
    const render = await db
      .selectFrom('generationJobs')
      .select(['id', 'input'])
      .where('userId', '=', niall)
      .where('kind', '=', 'look_render')
      .executeTakeFirstOrThrow();
    expect(render.input).toMatchObject({ target: 'daily', dailyLookId: look.id });
    expect(sent).toEqual([render.id]);
    expect(await pollOvernight(d)).toEqual({ applied: 0, failed: 0 });
  });

  it('falls back to the interactive path when the batch cannot be submitted', async () => {
    const niall = await sleeper();
    const sent: string[] = [];
    const broken: BatchProvider = {
      name: 'fake',
      submit: async () => {
        throw new Error('quota');
      },
      poll: async () => ({ state: 'running' }),
    };
    await overnightTick(deps(broken, sent), NOW, { userIds: [niall] });
    const job = await db
      .selectFrom('generationJobs')
      .select('id')
      .where('userId', '=', niall)
      .where('kind', '=', 'daily')
      .executeTakeFirstOrThrow();
    expect(sent).toEqual([job.id]);
    // The interactive worker can claim it now.
    expect(await system.jobs.claim(job.id, 60)).toBeDefined();
  });

  it('falls back when the batch fails, and for any job the batch left unanswered', async () => {
    const a = await sleeper();
    const b = await sleeper();
    const sent: string[] = [];
    let state: 'failed' | 'partial' = 'failed';
    const flaky: BatchProvider = {
      name: 'fake',
      submit: async (req) => ({ batchId: `flaky|${req.requests.map((r) => r.key).join(',')}` }),
      poll: async (_id, keys) =>
        state === 'failed'
          ? { state: 'failed' }
          : {
              state: 'succeeded',
              results: [{ key: keys[0] ?? '', text: JSON.stringify(fakeOutput(1)), usage: null }],
            },
    };
    const d = deps(flaky, sent);
    await overnightTick(d, NOW, { userIds: [a] });
    await pollOvernight(d);
    expect(sent).toHaveLength(1);

    state = 'partial';
    sent.length = 0;
    await overnightTick(d, new Date('2026-09-25T03:10:00Z'), { userIds: [a, b] });
    const res = await pollOvernight(d);
    expect(res.applied).toBe(1);
    // The answered job's anchor render, and the unanswered daily job going interactive.
    const kinds = await db
      .selectFrom('generationJobs')
      .select('kind')
      .where('id', 'in', sent)
      .execute();
    expect(kinds.map((k) => k.kind).sort()).toEqual(['daily', 'look_render']);
  });
});
