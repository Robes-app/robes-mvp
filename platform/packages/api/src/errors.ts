import type { ErrorCode } from '@robes/contracts';
import { errors } from '@robes/copy';

export const STATUS: Record<ErrorCode, number> = {
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  invalid_input: 400,
  conflict: 409,
  payload_too_large: 413,
  rate_limited: 429,
  quota_exceeded: 429,
  capacity: 503,
  disabled: 503,
  upgrade_required: 426,
  internal: 500,
};

// Product voice, never provider text (SEC-31).
export const MESSAGES: Record<ErrorCode, string> = errors;

export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly extra: { details?: unknown; retryAfterSeconds?: number } = {},
  ) {
    super(code);
  }
}
