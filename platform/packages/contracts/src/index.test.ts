import { describe, expect, it } from 'vitest';
import { ErrorBody, ErrorCode, HealthOutput } from './index';

describe('contracts', () => {
  it('accepts a well-formed error body', () => {
    expect(
      ErrorBody.parse({
        error: { code: 'invalid_input', message: 'Check the highlighted fields.', requestId: 'r1' },
      }),
    ).toBeTruthy();
  });
  it('has the codes the API spec lists', () => {
    expect(ErrorCode.options).toEqual([
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
  });
  it('health is literally ok', () => {
    expect(() => HealthOutput.parse({ ok: false })).toThrow();
  });
});
