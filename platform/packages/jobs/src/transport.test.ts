import { SendMessageCommand } from '@aws-sdk/client-sqs';
import { describe, expect, it, vi } from 'vitest';
import type { JobLogger } from './logger';
import { parseJobMessage } from './message';
import { enqueueJob, sweep } from './outbox';
import { createInlineTransport, createSqsTransport, type JobTransport } from './transport';

const JOB_ID = '6f1d7e38-5a55-4f43-9d6b-6f0c4d7f2a10';
const logger = (): JobLogger => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() });

describe('inline transport', () => {
  it('schedules the run instead of running it during the request', async () => {
    const tasks: Array<() => Promise<void>> = [];
    const run = vi.fn(async () => 'succeeded');
    const transport = createInlineTransport({
      run,
      schedule: (t) => tasks.push(t),
      logger: logger(),
    });
    await transport.send({ jobId: JOB_ID });
    expect(run).not.toHaveBeenCalled();
    await tasks[0]?.();
    expect(run).toHaveBeenCalledWith(JOB_ID);
  });

  it('logs a failed run without throwing from the scheduled task', async () => {
    const log = logger();
    const tasks: Array<() => Promise<void>> = [];
    const transport = createInlineTransport({
      run: () => Promise.reject(new Error('db down')),
      schedule: (t) => tasks.push(t),
      logger: log,
    });
    await transport.send({ jobId: JOB_ID });
    await expect(tasks[0]?.()).resolves.toBeUndefined();
    expect(log.error).toHaveBeenCalledWith(
      { jobId: JOB_ID, err: 'Error' },
      'job_inline_run_failed',
    );
  });
});

describe('sqs transport', () => {
  it('sends only the job id, with traceparent as a message attribute', async () => {
    const send = vi.fn(async () => ({}));
    const transport = createSqsTransport({ client: { send } as never, queueUrl: 'https://sqs/q' });
    await transport.send({ jobId: JOB_ID, traceparent: '00-abc-def-01' });
    await transport.send({ jobId: JOB_ID });
    const [first, second] = send.mock.calls.map((c) => (c as unknown[])[0] as SendMessageCommand);
    expect(first).toBeInstanceOf(SendMessageCommand);
    expect(first?.input).toEqual({
      QueueUrl: 'https://sqs/q',
      MessageBody: JSON.stringify({ jobId: JOB_ID }),
      MessageAttributes: { traceparent: { DataType: 'String', StringValue: '00-abc-def-01' } },
    });
    expect(second?.input.MessageAttributes).toBeUndefined();
  });
});

describe('enqueueJob', () => {
  it('never throws when the transport fails', async () => {
    const log = logger();
    const failing: JobTransport = { send: () => Promise.reject(new Error('sqs down')) };
    expect(await enqueueJob(failing, { jobId: JOB_ID }, log)).toBe(false);
    expect(log.warn).toHaveBeenCalledWith({ jobId: JOB_ID, err: 'Error' }, 'job_enqueue_failed');
  });
});

describe('sweep', () => {
  it('re-enqueues stale jobs and counts failures', async () => {
    const ids = [JOB_ID, 'b0e8f0c6-1d2f-4a6b-9c3d-4e5f6a7b8c9d'];
    const stale = vi.fn(async () => ids);
    const sent: string[] = [];
    const transport: JobTransport = {
      async send({ jobId }) {
        if (jobId !== JOB_ID) throw new Error('sqs down');
        sent.push(jobId);
      },
    };
    expect(await sweep({ jobs: { stale }, transport, logger: logger() })).toEqual({
      found: 2,
      enqueued: 1,
    });
    expect(stale).toHaveBeenCalledWith(60, 100);
    expect(sent).toEqual([JOB_ID]);
  });
});

describe('parseJobMessage', () => {
  it('accepts a job id and nothing else', () => {
    expect(parseJobMessage(JSON.stringify({ jobId: JOB_ID, userId: 'x' }))).toEqual({
      jobId: JOB_ID,
    });
    expect(parseJobMessage('{"jobId":"nope"}')).toBeNull();
    expect(parseJobMessage('not json')).toBeNull();
    expect(parseJobMessage('null')).toBeNull();
  });
});
