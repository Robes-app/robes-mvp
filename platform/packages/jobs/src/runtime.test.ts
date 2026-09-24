import { describe, expect, it, vi } from 'vitest';
import { createFakeHandler } from './handlers/fake';
import type { JobLogger } from './logger';
import { JobError, type JobHandler, type RunJobDeps, runJob } from './runtime';

const JOB_ID = '6f1d7e38-5a55-4f43-9d6b-6f0c4d7f2a10';
const USER_ID = '0b8f6a0e-3c1f-4d9b-8a57-2d2b6f9e4c11';

function memoryJobs(kind = 'fake') {
  const row = {
    status: 'queued',
    attempts: 0,
    leaseUntil: 0,
    cancelRequested: false,
    stages: [] as { stage: string; output: Record<string, unknown> }[],
    finished: null as null | { status: string; error?: string | undefined },
  };
  const jobs: RunJobDeps['jobs'] = {
    async claim(jobId, leaseSeconds) {
      const leaseFree = row.status === 'running' && row.leaseUntil < Date.now();
      if (row.cancelRequested || !(row.status === 'queued' || leaseFree)) return undefined;
      Object.assign(row, {
        status: 'running',
        attempts: row.attempts + 1,
        leaseUntil: Date.now() + leaseSeconds * 1000,
      });
      return { id: jobId, userId: USER_ID, kind, input: {}, output: {}, attempts: row.attempts };
    },
    async writeStage(_id, stage, output) {
      if (row.status === 'running') row.stages.push({ stage, output });
    },
    async finish(_id, result) {
      if (row.status !== 'running') return;
      row.status = result.status;
      row.finished = { status: result.status, error: result.error };
    },
    async isCancelRequested() {
      return row.cancelRequested;
    },
  };
  return { row, jobs };
}

const logger: JobLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

function deps(jobs: RunJobDeps['jobs'], handler: JobHandler): RunJobDeps {
  return { jobs, handlers: { fake: handler }, logger, cancelPollMs: 5 };
}

describe('runJob', () => {
  it('claims, writes the fake stages in order and succeeds', async () => {
    const { row, jobs } = memoryJobs();
    expect(await runJob(JOB_ID, deps(jobs, createFakeHandler({ stepMs: 3 })))).toBe('succeeded');
    expect(row.stages.map((s) => s.stage)).toEqual(['text', 'images', 'images', 'images']);
    expect(row.stages[0]?.output).toEqual({
      text: {
        title: expect.any(String),
        lines: [expect.any(String), expect.any(String), expect.any(String)],
      },
    });
    expect(row.stages.at(-1)?.output).toEqual({
      images: [0, 1, 2].map((idx) => ({ idx, status: 'placeholder' })),
    });
    expect(row.finished).toEqual({ status: 'succeeded', error: undefined });
  });

  it('is a no-op for a duplicate delivery while the lease is held', async () => {
    const { row, jobs } = memoryJobs();
    const run = vi.fn(async () => ({}));
    const handler = { budgetMs: 1000, run };
    const [a, b] = await Promise.all([
      runJob(JOB_ID, deps(jobs, handler)),
      runJob(JOB_ID, deps(jobs, handler)),
    ]);
    expect([a, b].sort()).toEqual(['skipped', 'succeeded']);
    expect(run).toHaveBeenCalledTimes(1);
    expect(await runJob(JOB_ID, deps(jobs, handler))).toBe('skipped');
    expect(row.attempts).toBe(1);
  });

  it('stops and records cancelled when the user cancels mid-run', async () => {
    const { row, jobs } = memoryJobs();
    const handler = createFakeHandler({ stepMs: 30 });
    const running = runJob(JOB_ID, deps(jobs, handler));
    await vi.waitFor(() => expect(row.stages).toHaveLength(1));
    row.cancelRequested = true;
    expect(await running).toBe('cancelled');
    expect(row.stages.length).toBeLessThan(4);
    expect(row.finished?.status).toBe('cancelled');
  });

  it('aborts the signal when the cancel poll sees a request', async () => {
    const { row, jobs } = memoryJobs();
    const handler: JobHandler = {
      budgetMs: 5000,
      run: (ctx) =>
        new Promise((_, reject) => {
          row.cancelRequested = true;
          ctx.signal.addEventListener('abort', () => reject(ctx.signal.reason));
        }),
    };
    expect(await runJob(JOB_ID, deps(jobs, handler))).toBe('cancelled');
  });

  it('stores a generic code when a handler throws, never the message', async () => {
    const { row, jobs } = memoryJobs();
    const secret = 'upstream said: prompt was "blue dress for Ann"';
    const handler = { budgetMs: 1000, run: vi.fn().mockRejectedValue(new Error(secret)) };
    expect(await runJob(JOB_ID, deps(jobs, handler))).toBe('failed');
    expect(row.finished).toEqual({ status: 'failed', error: 'internal' });
    expect(JSON.stringify(vi.mocked(logger.error).mock.calls)).not.toContain('blue dress');
  });

  it('keeps a known JobError code and rejects malformed ones', async () => {
    const known = memoryJobs();
    await runJob(
      JOB_ID,
      deps(known.jobs, { budgetMs: 1000, run: () => Promise.reject(new JobError('no_pieces')) }),
    );
    expect(known.row.finished?.error).toBe('no_pieces');
    const bad = memoryJobs();
    await runJob(
      JOB_ID,
      deps(bad.jobs, {
        budgetMs: 1000,
        run: () => Promise.reject(new JobError('Model 500: quota')),
      }),
    );
    expect(bad.row.finished?.error).toBe('internal');
  });

  it('fails with timeout when the time budget runs out', async () => {
    const { row, jobs } = memoryJobs();
    const handler: JobHandler = {
      budgetMs: 20,
      run: (ctx) =>
        new Promise((_, reject) =>
          ctx.signal.addEventListener('abort', () => reject(ctx.signal.reason)),
        ),
    };
    expect(await runJob(JOB_ID, deps(jobs, handler))).toBe('failed');
    expect(row.finished?.error).toBe('timeout');
  });

  it('refuses stage writes after the signal aborts', async () => {
    const { row, jobs } = memoryJobs();
    const handler: JobHandler = {
      budgetMs: 10,
      async run(ctx) {
        await new Promise((resolve) => ctx.signal.addEventListener('abort', resolve));
        await ctx.writeStage('text', { text: {} });
        return {};
      },
    };
    expect(await runJob(JOB_ID, deps(jobs, handler))).toBe('failed');
    expect(row.stages).toEqual([]);
  });

  it('fails unknown kinds and jobs that exhausted their attempts', async () => {
    const unknown = memoryJobs('daily');
    expect(await runJob(JOB_ID, deps(unknown.jobs, createFakeHandler()))).toBe('failed');
    expect(unknown.row.finished?.error).toBe('unsupported_kind');

    const crashed = memoryJobs();
    crashed.row.attempts = 3;
    expect(await runJob(JOB_ID, deps(crashed.jobs, createFakeHandler()))).toBe('failed');
    expect(crashed.row.finished?.error).toBe('attempts_exhausted');
  });

  it('lets a DB outage on claim propagate so the message is retried', async () => {
    const { jobs } = memoryJobs();
    jobs.claim = () => Promise.reject(new Error('connection refused'));
    await expect(runJob(JOB_ID, deps(jobs, createFakeHandler()))).rejects.toThrow();
  });
});
