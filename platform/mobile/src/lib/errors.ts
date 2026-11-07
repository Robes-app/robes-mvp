import { isApiClientError } from '@robes/api-client';
import { errors } from '@robes/copy';
import { nativeAnalytics } from './analytics';

// Screens call this while rendering too: each failure is reported once.
const reported = new WeakSet<object>();

// Maps any failure to the user-facing line for its API error code, and reports it to PostHog
// (every caught failure she sees passes through here; uncaught ones are autocaptured).
export function errorMessage(err: unknown): string {
  if (err && typeof err === 'object' && !reported.has(err)) {
    reported.add(err);
    nativeAnalytics.reportError(err);
  }
  return isApiClientError(err) ? errors[err.code] : errors.internal;
}
