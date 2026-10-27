import { EVENT_SOURCE_CLOSED, type EventSourceLike } from '@robes/api-client/sse';
import { JOB_EVENT, type JobSnapshot } from '@robes/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { followJob } from './follow-job';

const JOB_ID = '6f1d7e38-5a55-4f43-9d6b-6f0c4d7f2a10';
const snap = (status: string): JobSnapshot =>
  ({
    id: JOB_ID,
    kind: 'fake',
    status,
    stage: 'text',
    output: {},
    error: null,
    cancelRequested: false,
    createdAt: '2026-09-24T10:00:00.000Z',
    updatedAt: '2026-09-24T10:00:01.000Z',
    finishedAt: status === 'succeeded' ? '2026-09-24T10:00:02.000Z' : null,
  }) as JobSnapshot;

class FakeSource implements EventSourceLike {
  readyState = 0;
  closed = false;
  listeners = new Map<string, Array<(event: { data?: unknown }) => void>>();
  addEventListener(type: string, listener: (event: { data?: unknown }) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  close() {
    this.closed = true;
    this.readyState = EVENT_SOURCE_CLOSED;
  }
  emit(type: string, data?: string) {
    for (const l of this.listeners.get(type) ?? []) l({ data });
  }
}

function setup(rows: Array<JobSnapshot | Error>) {
  let source: FakeSource | undefined;
  const call = vi.fn(async () => {
    const next = rows.length > 1 ? rows.shift() : rows[0];
    if (next instanceof Error) throw next;
    return next as JobSnapshot;
  });
  const api = { url: () => 'https://api.test/jobs/x/events', call } as never;
  const onJob = vi.fn();
  const onLost = vi.fn();
  const followed = followJob(api, JOB_ID, {
    onJob,
    onLost,
    pollMs: 100,
    silentMs: 500,
    reconcileMs: 10_000,
    eventSource: () => {
      source = new FakeSource();
      return source;
    },
  });
  if (!source) throw new Error('not opened');
  return { source, call, onJob, onLost, followed };
}

describe('followJob', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('takes the stream when it delivers, and stops on a settled job', async () => {
    const { source, call, onJob } = setup([snap('running')]);
    source.emit(JOB_EVENT, JSON.stringify(snap('running')));
    source.emit(JOB_EVENT, JSON.stringify(snap('succeeded')));
    await vi.advanceTimersByTimeAsync(2000);
    expect(onJob).toHaveBeenCalledTimes(2);
    expect(onJob.mock.lastCall?.[0].status).toBe('succeeded');
    expect(source.closed).toBe(true);
    expect(call).not.toHaveBeenCalled();
  });

  it('reads the row when the stream errors, until the job settles', async () => {
    const { source, call, onJob } = setup([snap('running'), snap('succeeded')]);
    source.emit('error');
    await vi.advanceTimersByTimeAsync(500);
    expect(source.closed).toBe(true);
    expect(call).toHaveBeenCalledTimes(2);
    expect(onJob.mock.lastCall?.[0].status).toBe('succeeded');
    await vi.advanceTimersByTimeAsync(1000);
    expect(call).toHaveBeenCalledTimes(2);
  });

  it('reads the row when the stream stays silent', async () => {
    const { call, onJob } = setup([snap('succeeded')]);
    await vi.advanceTimersByTimeAsync(600);
    expect(call).toHaveBeenCalledTimes(1);
    expect(onJob.mock.lastCall?.[0].status).toBe('succeeded');
  });

  it('reads the row when a payload fails the contract', async () => {
    const { source, call } = setup([snap('succeeded')]);
    source.emit(JOB_EVENT, JSON.stringify({ nope: true }));
    await vi.advanceTimersByTimeAsync(50);
    expect(call).toHaveBeenCalledTimes(1);
  });

  it('gives the job up when she cannot read it', async () => {
    const gone = Object.assign(new Error('not found'), { status: 404 });
    const { source, onLost, call } = setup([gone]);
    source.emit('error');
    await vi.advanceTimersByTimeAsync(1000);
    expect(onLost).toHaveBeenCalledTimes(1);
    expect(call).toHaveBeenCalledTimes(1);
  });

  it('stops everything on close', async () => {
    const { source, call, followed } = setup([snap('running')]);
    followed.close();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(source.closed).toBe(true);
    expect(call).not.toHaveBeenCalled();
  });
});
