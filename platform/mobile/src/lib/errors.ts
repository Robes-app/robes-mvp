import { isApiClientError } from '@robes/api-client';
import { errors } from '@robes/copy';
import { report } from './report';

// Maps any failure to the user-facing line for its API error code, and reports it (every caught
// failure she sees passes through here; uncaught ones are autocaptured).
export function errorMessage(err: unknown): string {
  report(err, 'errorMessage');
  return isApiClientError(err) ? errors[err.code] : errors.internal;
}
