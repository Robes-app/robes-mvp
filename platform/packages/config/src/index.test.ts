import { describe, expect, it } from 'vitest';
import { appServerEnv, parseEnv } from './index';

const base = {
  NODE_ENV: 'production',
  APP_ENV: 'staging',
  SUPABASE_URL: 'https://abc.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_xxxxxxxxxxxxxxxxxxxx',
  UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'token-value',
};

describe('parseEnv(appServerEnv)', () => {
  it('parses a valid environment and derives auth endpoints', () => {
    const env = parseEnv(appServerEnv, base);
    expect(env.SUPABASE_JWKS_URL).toBe('https://abc.supabase.co/auth/v1/.well-known/jwks.json');
    expect(env.SUPABASE_JWT_ISSUER).toBe('https://abc.supabase.co/auth/v1');
  });

  it('requires Upstash outside dev', () => {
    const { UPSTASH_REDIS_REST_URL: _u, UPSTASH_REDIS_REST_TOKEN: _t, ...rest } = base;
    expect(() => parseEnv(appServerEnv, rest)).toThrow(/UPSTASH_REDIS_REST_URL/);
  });

  it('allows missing Upstash in dev', () => {
    const { UPSTASH_REDIS_REST_URL: _u, UPSTASH_REDIS_REST_TOKEN: _t, ...rest } = base;
    expect(() => parseEnv(appServerEnv, { ...rest, APP_ENV: 'dev' })).not.toThrow();
  });

  it('refuses dev-only flags in production', () => {
    expect(() =>
      parseEnv(appServerEnv, { ...base, APP_ENV: 'production', ALLOW_PRIVATE_FETCH: '1' }),
    ).toThrow(/ALLOW_PRIVATE_FETCH/);
  });

  it('never echoes secret values in errors', () => {
    try {
      parseEnv(appServerEnv, { ...base, SUPABASE_URL: 'not-a-url-SECRET123' });
      expect.unreachable();
    } catch (e) {
      expect(String(e)).toContain('SUPABASE_URL');
      expect(String(e)).not.toContain('SECRET123');
    }
  });
});
