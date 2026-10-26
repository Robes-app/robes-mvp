import type { ApiClient } from '@robes/api-client';
import { type EventSourceFactory, openEvents } from '@robes/api-client/sse';
import { JOB_EVENT, type JobSnapshot } from '@robes/contracts';
import { isTerminalJobStatus } from '@robes/core/jobs';

// A job's snapshots, live over SSE (UX-05), with the row itself as the fallback: when the stream
// errors, sends a payload that fails the contract, or stays silent, the job is read with
// `jobs.get` until it settles. A stream that drops on a deployed host must never leave a screen
// waiting on a job that has already finished.
export const FOLLOW_POLL_MS = 2500;
// No first snapshot from the stream in this long → read the row instead.
export const FOLLOW_SILENT_MS = 4000;
// While the stream is open, the row is still read this often, in case a change never arrives.
export const FOLLOW_RECONCILE_MS = 20_000;

export interface FollowJobOptions {
  onJob: (job: JobSnapshot) => void;
  // The job can't be read at all (not hers, or signed out).
  onLost?: () => void;
  // Connection state for the screens that show it.
  onState?: (state: 'open' | 'reconnecting' | 'polling') => void;
  eventSource?: EventSourceFactory;
  pollMs?: number;
  silentMs?: number;
  reconcileMs?: number;
}

export interface FollowedJob {
  close(): void;
}

export function followJob(
  api: Pick<ApiClient, 'url' | 'call'>,
  jobId: string,
  options: FollowJobOptions,
): FollowedJob {
  const pollMs = options.pollMs ?? FOLLOW_POLL_MS;
  let done = false;
  let heard = false;
  let polling = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let watch: ReturnType<typeof setInterval> | undefined;
  let misses = 0;
  let stream: { close(): void } | undefined;

  const settle = (job: JobSnapshot) => {
    if (done) return;
    if (isTerminalJobStatus(job.status)) finish();
    options.onJob(job);
  };

  function finish() {
    done = true;
    if (timer) clearTimeout(timer);
    if (watch) clearInterval(watch);
    stream?.close();
  }

  async function poll() {
    if (done) return;
    try {
      const job = await api.call('jobs.get', { params: { id: jobId } });
      misses = 0;
      settle(job);
    } catch (error) {
      const status = (error as { status?: number }).status;
      // A job she can't read is gone for good; anything else (a blip, a 5xx) is retried.
      if (status === 401 || status === 403 || status === 404 || ++misses >= 6) {
        finish();
        options.onLost?.();
        return;
      }
    }
    if (!done) timer = setTimeout(() => void poll(), pollMs);
  }

  function fallBack() {
    if (done || polling) return;
    polling = true;
    stream?.close();
    if (timer) clearTimeout(timer);
    if (watch) clearInterval(watch);
    options.onState?.('polling');
    void poll();
  }

  try {
    stream = openEvents(api, 'jobs.events', {
      params: { id: jobId },
      ...(options.eventSource ? { eventSource: options.eventSource } : {}),
      on: {
        [JOB_EVENT]: (job) => {
          if (polling) return;
          heard = true;
          options.onState?.('open');
          settle(job);
        },
      },
      onInvalid: () => fallBack(),
      onError: () => {
        options.onState?.('reconnecting');
        fallBack();
      },
    });
  } catch {
    fallBack();
  }
  if (!polling) {
    timer = setTimeout(() => {
      if (!heard) fallBack();
    }, options.silentMs ?? FOLLOW_SILENT_MS);
    watch = setInterval(() => {
      if (done || polling) return;
      api.call('jobs.get', { params: { id: jobId } }).then(settle, () => undefined);
    }, options.reconcileMs ?? FOLLOW_RECONCILE_MS);
  }

  return { close: finish };
}
