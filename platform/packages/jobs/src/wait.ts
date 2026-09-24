import { setTimeout as sleep } from 'node:timers/promises';

// Polls `load` until `ready` says so or the deadline passes; aborts with the job's signal.
export async function waitFor<T>(
  load: () => Promise<T>,
  pending: (value: T) => boolean,
  opts: { timeoutMs: number; pollMs: number; signal: AbortSignal },
): Promise<T> {
  const deadline = Date.now() + opts.timeoutMs;
  let value = await load();
  while (pending(value) && Date.now() < deadline) {
    await sleep(opts.pollMs, undefined, { signal: opts.signal });
    value = await load();
  }
  return value;
}
