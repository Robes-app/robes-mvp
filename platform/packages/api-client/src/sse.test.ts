import { JOB_EVENT } from '@robes/contracts';
import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from './index';
import { EVENT_SOURCE_CLOSED, type EventSourceLike, openEvents } from './sse';

const JOB_ID = '6f1d7e38-5a55-4f43-9d6b-6f0c4d7f2a10';
const snapshot = {
  id: JOB_ID,
  kind: 'fake',
  status: 'running',
  stage: 'text',
  output: { text: { title: 'T', lines: ['a'] } },
  error: null,
  cancelRequested: false,
  createdAt: '2026-09-24T10:00:00.000Z',
  updatedAt: '2026-09-24T10:00:01.000Z',
  finishedAt: null,
};

class FakeEventSource implements EventSourceLike {
  readyState = 0;
  closed = false;
  listeners = new Map<string, Array<(event: { data?: unknown }) => void>>();
  constructor(readonly url: string) {}
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

function open(on: Parameters<typeof openEvents<'jobs.events'>>[2]['on'] = {}) {
  let source: FakeEventSource | undefined;
  const client = createApiClient({ baseUrl: 'https://api.test' });
  const onError = vi.fn();
  const onInvalid = vi.fn();
  const stream = openEvents(client, 'jobs.events', {
    params: { id: JOB_ID },
    on,
    onError,
    onInvalid,
    eventSource: (url) => {
      source = new FakeEventSource(url);
      return source;
    },
  });
  if (!source) throw new Error('not opened');
  return { stream, source, onError, onInvalid };
}

describe('openEvents', () => {
  it('opens the route URL and delivers typed, contract-parsed events', () => {
    const received: unknown[] = [];
    const { source } = open({
      [JOB_EVENT]: (job) => {
        received.push(job.status);
      },
    });
    expect(source.url).toBe(`https://api.test/api/v1/jobs/${JOB_ID}/events`);
    source.emit(JOB_EVENT, JSON.stringify({ ...snapshot, userId: 'leak' }));
    expect(received).toEqual(['running']);
  });

  it('drops payloads that break the contract', () => {
    const job = vi.fn();
    const { source, onInvalid } = open({ [JOB_EVENT]: job });
    source.emit(JOB_EVENT, JSON.stringify({ ...snapshot, status: 'paused' }));
    source.emit(JOB_EVENT, 'not json');
    expect(job).not.toHaveBeenCalled();
    expect(onInvalid).toHaveBeenCalledTimes(2);
  });

  it('reports reconnects and terminal errors', () => {
    const { source, onError, stream } = open();
    source.emit('error');
    expect(onError).toHaveBeenLastCalledWith({ closed: false });
    source.readyState = EVENT_SOURCE_CLOSED;
    source.emit('error');
    expect(onError).toHaveBeenLastCalledWith({ closed: true });
    expect(stream.closed).toBe(true);
  });

  it('stops delivering after close', () => {
    const job = vi.fn();
    const { source, stream } = open({ [JOB_EVENT]: job });
    stream.close();
    expect(source.closed).toBe(true);
    source.emit(JOB_EVENT, JSON.stringify(snapshot));
    expect(job).not.toHaveBeenCalled();
  });

  it('fails clearly when no EventSource exists', () => {
    const client = createApiClient({ baseUrl: '' });
    const original = globalThis.EventSource;
    vi.stubGlobal('EventSource', undefined);
    expect(() => openEvents(client, 'jobs.events', { params: { id: JOB_ID }, on: {} })).toThrow(
      /EventSource/,
    );
    vi.stubGlobal('EventSource', original);
  });
});
