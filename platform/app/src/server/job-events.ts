import 'server-only';
import { setTimeout as sleep } from 'node:timers/promises';
import type { JobSnapshot } from '@robes/contracts';
import { isTerminalJobStatus } from '@robes/core';
import type { UserId } from '@robes/db';

// Server-side change feed behind the SSE route; swap for LISTEN/NOTIFY or Redis without
// touching clients, which only ever see full snapshots.
export interface JobEvents {
  // Yields `first`, then each changed snapshot, until terminal, gone, or `signal` aborts.
  watch(userId: UserId, first: JobSnapshot, signal: AbortSignal): AsyncIterable<JobSnapshot>;
}

export function createPollingJobEvents(
  load: (userId: UserId, jobId: string) => Promise<JobSnapshot | undefined>,
  intervalMs = 400,
): JobEvents {
  return {
    async *watch(userId, first, signal) {
      let last = first;
      yield first;
      while (!isTerminalJobStatus(last.status)) {
        try {
          await sleep(intervalMs, undefined, { signal });
        } catch {
          return;
        }
        const next = await load(userId, first.id);
        if (!next) return;
        if (JSON.stringify(next) === JSON.stringify(last)) continue;
        last = next;
        yield next;
      }
    },
  };
}
