import { z } from 'zod';

export const ErrorCode = z.enum([
  'unauthenticated',
  'forbidden',
  'not_found',
  'invalid_input',
  'conflict',
  'payload_too_large',
  'rate_limited',
  'quota_exceeded',
  'capacity',
  'disabled',
  'upgrade_required',
  'internal',
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const ErrorBody = z.object({
  error: z.object({
    code: ErrorCode,
    message: z.string(),
    requestId: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ErrorBody = z.infer<typeof ErrorBody>;

export const EmptyInput = z.object({});
export const HealthOutput = z.object({ ok: z.literal(true) });

export * from './jobs';
export * from './me';
