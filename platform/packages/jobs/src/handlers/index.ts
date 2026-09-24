import type { JobHandlers } from '../runtime';
import { createFakeHandler } from './fake';

// One registry for SQS workers and the inline dev transport, keyed by job kind.
export function createHandlers(opts: { fake?: { stepMs?: number } } = {}): JobHandlers {
  return { fake: createFakeHandler(opts.fake) };
}
