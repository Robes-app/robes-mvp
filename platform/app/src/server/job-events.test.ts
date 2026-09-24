import type { JobSnapshot } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { describe, expect, it, vi } from 'vitest';
import { createPollingJobEvents } from './job-events';

const USER = verifiedUserId('0b8f6a0e-3c1f-4d9b-8a57-2d2b6f9e4c11');
const base: JobSnapshot = {
  id: '6f1d7e38-5a55-4f43-9d6b-6f0c4d7f2a10',
  kind: 'fake',
  status: 'queued',
  stage: 'queued',
  output: {},
  error: null,
  cancelRequested: false,
  createdAt: '2026-09-24T10:00:00.000Z',
  updatedAt: '2026-09-24T10:00:00.000Z',
  finishedAt: null,
};

async function collect(iterable: AsyncIterable<JobSnapshot>): Promise<JobSnapshot[]> {
  const out: JobSnapshot[] = [];
  for await (const item of iterable) out.push(item);
  return out;
}

describe('polling job events', () => {
  it('yields the first snapshot, then only changes, and ends when terminal', async () => {
    const running = { ...base, status: 'running' as const, stage: 'text' as const };
    const done = { ...running, status: 'succeeded' as const, stage: 'done' as const };
    const load = vi
      .fn()
      .mockResolvedValueOnce(base)
      .mockResolvedValueOnce(running)
      .mockResolvedValueOnce(running)
      .mockResolvedValueOnce(done);
    const events = createPollingJobEvents(load, 1);
    const seen = await collect(events.watch(USER, base, new AbortController().signal));
    expect(seen.map((s) => s.status)).toEqual(['queued', 'running', 'succeeded']);
    expect(load).toHaveBeenCalledTimes(4);
    expect(load).toHaveBeenCalledWith(USER, base.id);
  });

  it('does not poll a job that is already terminal', async () => {
    const load = vi.fn();
    const done = { ...base, status: 'cancelled' as const };
    const seen = await collect(
      createPollingJobEvents(load, 1).watch(USER, done, new AbortController().signal),
    );
    expect(seen).toEqual([done]);
    expect(load).not.toHaveBeenCalled();
  });

  it('stops when the stream is aborted or the row disappears', async () => {
    const stop = new AbortController();
    const load = vi.fn(async () => {
      stop.abort();
      return base;
    });
    expect(await collect(createPollingJobEvents(load, 1).watch(USER, base, stop.signal))).toEqual([
      base,
    ]);
    const gone = createPollingJobEvents(async () => undefined, 1);
    expect(await collect(gone.watch(USER, base, new AbortController().signal))).toEqual([base]);
  });
});
