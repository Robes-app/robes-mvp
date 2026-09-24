import { describe, expect, it } from 'vitest';
import { appServerEnv, parseEnv } from './index';

const base = {
  NODE_ENV: 'production',
  APP_ENV: 'staging',
  DATABASE_URL: 'postgres://robes_app:pw@db.example.com:5432/robes',
  BETTER_AUTH_SECRET: 'x'.repeat(40),
  BETTER_AUTH_URL: 'https://staging.byrobes.com',
  AWS_REGION: 'eu-west-1',
  AWS_ACCESS_KEY_ID: 'AKIAEXAMPLE',
  AWS_SECRET_ACCESS_KEY: 'secret-value',
  UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'token-value',
};

describe('parseEnv(appServerEnv)', () => {
  it('parses a valid environment and derives trusted origins', () => {
    const env = parseEnv(appServerEnv, { ...base, AUTH_TRUSTED_ORIGINS: 'robes://, exp://x' });
    expect(env.authTrustedOrigins).toEqual(['https://staging.byrobes.com', 'robes://', 'exp://x']);
  });

  it('requires Upstash and SES credentials outside dev, and sends via SES there', () => {
    const { UPSTASH_REDIS_REST_URL: _u, AWS_ACCESS_KEY_ID: _k, ...rest } = base;
    expect(() => parseEnv(appServerEnv, rest)).toThrow(/UPSTASH_REDIS_REST_URL.*AWS_ACCESS_KEY_ID/);
    expect(parseEnv(appServerEnv, base).mail).toMatchObject({
      transport: 'ses',
      region: 'eu-west-1',
    });
    expect(() => parseEnv(appServerEnv, { ...base, SMTP_URL: 'smtp://x:25' })).toThrow(/SES/);
  });

  it('allows local services in dev', () => {
    const {
      UPSTASH_REDIS_REST_URL: _u,
      UPSTASH_REDIS_REST_TOKEN: _t,
      AWS_ACCESS_KEY_ID: _k,
      AWS_SECRET_ACCESS_KEY: _s,
      ...rest
    } = base;
    const env = parseEnv(appServerEnv, {
      ...rest,
      APP_ENV: 'dev',
      SMTP_URL: 'smtp://127.0.0.1:51025',
    });
    expect(env.mail).toEqual({
      transport: 'smtp',
      url: 'smtp://127.0.0.1:51025',
      from: 'Robes <hello@byrobes.com>',
    });
  });

  it('rejects a short auth secret and half-configured OAuth', () => {
    expect(() => parseEnv(appServerEnv, { ...base, BETTER_AUTH_SECRET: 'short' })).toThrow(
      /BETTER_AUTH_SECRET/,
    );
    expect(() => parseEnv(appServerEnv, { ...base, APPLE_CLIENT_ID: 'id' })).toThrow(
      /APPLE_CLIENT_SECRET/,
    );
  });

  it('refuses dev-only flags and http auth URLs in production', () => {
    expect(() =>
      parseEnv(appServerEnv, { ...base, APP_ENV: 'production', ALLOW_PRIVATE_FETCH: '1' }),
    ).toThrow(/ALLOW_PRIVATE_FETCH/);
    expect(() =>
      parseEnv(appServerEnv, { ...base, APP_ENV: 'production', BETTER_AUTH_URL: 'http://x.com' }),
    ).toThrow(/https/);
  });

  it('never echoes secret values in errors', () => {
    try {
      parseEnv(appServerEnv, { ...base, DATABASE_URL: 'not-a-url-SECRET123' });
      expect.unreachable();
    } catch (e) {
      expect(String(e)).toContain('DATABASE_URL');
      expect(String(e)).not.toContain('SECRET123');
    }
  });
});
