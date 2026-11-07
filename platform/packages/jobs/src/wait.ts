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

// A photo is readable once its master is stored: the renderer writes it before the renditions,
// which are most of its time, so a read never waits for `ready`. A failed render is never read.
export async function waitForMaster<T>(
  load: () => Promise<T | undefined>,
  status: (row: T) => string | null,
  masterStored: (row: T) => Promise<boolean>,
  opts: { timeoutMs: number; pollMs: number; signal: AbortSignal },
): Promise<{ row: T | undefined; readable: boolean }> {
  const check = async () => {
    const row = await load();
    const state = row ? status(row) : null;
    const readable =
      state === 'ready' || (state === 'pending' && !!row && (await masterStored(row)));
    return { row, readable, pending: state === 'pending' };
  };
  const { row, readable } = await waitFor(check, (s) => s.pending && !s.readable, opts);
  return { row, readable };
}
