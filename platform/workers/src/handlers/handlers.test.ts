import type { JobTransport } from '@robes/jobs';
import { describe, expect, it, vi } from 'vitest';
import type { WorkerContext } from '../context';
import { createGenerateHandler } from './generate';
import { createMaintenanceHandler } from './maintenance';

const JOB_A = '6f1d7e38-5a55-4f43-9d6b-6f0c4d7f2a10';
const JOB_B = 'b0e8f0c6-1d2f-4a6b-9c3d-4e5f6a7b8c9d';
const logger = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() });
const record = (messageId: string, body: unknown) => ({ messageId, body: JSON.stringify(body) });

describe('generate handler', () => {
  it('runs each job and reports only infrastructure failures for retry', async () => {
    const run = vi.fn(async (jobId: string) => {
      if (jobId === JOB_B) throw new Error('db unreachable');
      return 'succeeded' as const;
    });
    const log = logger();
    const handler = createGenerateHandler(async () => ({ run, logger: log }));
    const res = await handler({
      Records: [
        record('m1', { jobId: JOB_A }),
        record('m2', { jobId: JOB_B }),
        record('m3', { userId: JOB_A }),
      ],
    });
    expect(run.mock.calls.map((c) => c[0])).toEqual([JOB_A, JOB_B]);
    expect(res).toEqual({ batchItemFailures: [{ itemIdentifier: 'm2' }] });
    expect(log.warn).toHaveBeenCalledWith({ messageId: 'm3' }, 'job_message_invalid');
  });
});

describe('maintenance handler', () => {
  function context({ storage = true } = {}) {
    const sent: string[] = [];
    const transport: JobTransport = { send: async (m) => void sent.push(m.jobId) };
    const queue = [JOB_A];
    const ctx = {
      system: {
        maintenance: { run: vi.fn(async () => {}) },
        jobs: { stale: vi.fn(async () => [JOB_A]) },
        accountDeletion: {
          claimNext: vi.fn(async () => queue.shift()),
          complete: vi.fn(async () => {}),
          fail: vi.fn(async () => {}),
        },
      },
      storage: storage ? { deletePrefix: vi.fn(async () => 1) } : null,
      logger: logger(),
      transport: () => transport,
    } as unknown as Pick<WorkerContext, 'system' | 'storage' | 'logger' | 'transport'>;
    return { ctx, sent };
  }

  it('runs account deletions, and refuses to without the bucket', async () => {
    const { ctx } = context();
    await createMaintenanceHandler(async () => ctx)({
      Records: [record('d', { kind: 'account-deletion' })],
    });
    expect(ctx.system.accountDeletion.complete).toHaveBeenCalledWith(JOB_A, { objects: 3 });

    const bare = context({ storage: false });
    const res = await createMaintenanceHandler(async () => bare.ctx)({
      Records: [record('d', { kind: 'account-deletion' })],
    });
    expect(res).toEqual({ batchItemFailures: [{ itemIdentifier: 'd' }] });
    expect(bare.ctx.system.accountDeletion.claimNext).not.toHaveBeenCalled();
  });

  it('routes scheduled kinds to retention and the outbox sweep', async () => {
    const { ctx, sent } = context();
    const handler = createMaintenanceHandler(async () => ctx);
    await handler({ Records: [record('r', { kind: 'retention' })] });
    expect(ctx.system.maintenance.run).toHaveBeenCalledTimes(1);
    expect(sent).toEqual([]);

    await handler({ Records: [record('s', { kind: 'job-sweeper' })] });
    expect(sent).toEqual([JOB_A]);
    expect(ctx.system.maintenance.run).toHaveBeenCalledTimes(1);
  });

  it('ignores unknown tasks and retries failed ones', async () => {
    const { ctx } = context();
    vi.mocked(ctx.system.maintenance.run).mockRejectedValueOnce(new Error('timeout'));
    const handler = createMaintenanceHandler(async () => ctx);
    const res = await handler({
      Records: [record('u', { kind: 'nope' }), record('r', { kind: 'retention' })],
    });
    expect(res).toEqual({ batchItemFailures: [{ itemIdentifier: 'r' }] });
  });
});
