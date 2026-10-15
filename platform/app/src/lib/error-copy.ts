import { isApiClientError } from '@robes/api-client';
import { errors } from '@robes/copy';

// Any thrown value → the user-facing sentence for its API error code.
export function errorCopy(err: unknown): string {
  return isApiClientError(err) ? errors[err.code] : errors.internal;
}
