import { isApiClientError } from '@robes/api-client';
import { errors } from '@robes/copy';

// Maps any failure to the user-facing line for its API error code.
export function errorMessage(err: unknown): string {
  return isApiClientError(err) ? errors[err.code] : errors.internal;
}
