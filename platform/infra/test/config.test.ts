import { afterEach, describe, expect, it } from 'vitest';
import { mediaBucketName, reservedConcurrency } from '../config/env';

describe('stage config helpers', () => {
  afterEach(() => {
    delete process.env.ROBES_STAGING_GENERATE_RESERVED_CONCURRENCY;
  });

  it('suffixes bucket names with the account so stages and accounts never collide', () => {
    expect(mediaBucketName('robes-staging', '259887029472')).toBe(
      'robes-staging-media-259887029472',
    );
    expect(mediaBucketName('robes-staging', undefined)).toBe('robes-staging-media');
  });

  it('lets an account without concurrency headroom turn the reservation off', () => {
    expect(reservedConcurrency('staging', 5)).toBe(5);
    process.env.ROBES_STAGING_GENERATE_RESERVED_CONCURRENCY = '0';
    expect(reservedConcurrency('staging', 5)).toBeUndefined();
    process.env.ROBES_STAGING_GENERATE_RESERVED_CONCURRENCY = 'many';
    expect(() => reservedConcurrency('staging', 5)).toThrow(/invalid/);
  });
});
