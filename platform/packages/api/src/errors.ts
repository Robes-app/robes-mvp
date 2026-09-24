import type { ErrorCode } from '@robes/contracts';

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

// Moves to @robes/copy in M2; product voice, never provider text (SEC-31).
export const MESSAGES: Record<ErrorCode, string> = {
  unauthenticated: 'Please sign in again.',
  forbidden: 'That isn’t available on your account.',
  not_found: 'We couldn’t find that.',
  invalid_input: 'Something in that request wasn’t quite right.',
  conflict: 'That changed while you were working. Refresh and try again.',
  payload_too_large: 'That was too large to send.',
  rate_limited: 'You’re going quickly. Give it a moment.',
  quota_exceeded: 'You’ve reached today’s limit for this.',
  capacity: 'Robes is busy right now. Try again shortly.',
  disabled: 'This is paused for a moment.',
  upgrade_required: 'Update Robes to keep going.',
  internal: 'Something went wrong on our side.',
};

export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly extra: { details?: unknown; retryAfterSeconds?: number } = {},
  ) {
    super(code);
  }
}
