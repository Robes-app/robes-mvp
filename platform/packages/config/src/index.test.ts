import { describe, expect, it } from 'vitest';
import { appServerEnv, parseEnv, workerEnv } from './index';

const base = {
  NODE_ENV: 'production',
  APP_ENV: 'staging',
  DATABASE_URL: 'postgres://robes_app:pw@db.example.com:5432/robes',
  BETTER_AUTH_SECRET: 'x'.repeat(40),
  BETTER_AUTH_URL: 'https://staging.byrobes.com',
  RESEND_API_KEY: 're_test',
  UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'token-value',
  JOBS_INTERACTIVE_QUEUE_URL:
    'https://sqs.eu-west-1.amazonaws.com/123456789012/robes-staging-jobs-interactive',
};

describe('parseEnv(appServerEnv)', () => {
  it('parses a valid environment and derives trusted origins', () => {
    const env = parseEnv(appServerEnv, { ...base, AUTH_TRUSTED_ORIGINS: 'robes://, exp://x' });
    expect(env.authTrustedOrigins).toEqual(['https://staging.byrobes.com', 'robes://', 'exp://x']);
  });

  it('requires Upstash and Resend outside dev', () => {
    const { UPSTASH_REDIS_REST_URL: _u, RESEND_API_KEY: _r, ...rest } = base;
    expect(() => parseEnv(appServerEnv, rest)).toThrow(/UPSTASH_REDIS_REST_URL.*RESEND_API_KEY/);
  });

  it('allows local services in dev', () => {
    const {
      UPSTASH_REDIS_REST_URL: _u,
      UPSTASH_REDIS_REST_TOKEN: _t,
      RESEND_API_KEY: _r,
      ...rest
    } = base;
    expect(() =>
      parseEnv(appServerEnv, { ...rest, APP_ENV: 'dev', SMTP_URL: 'smtp://127.0.0.1:51025' }),
    ).not.toThrow();
  });

  it('requires a job queue outside dev unless inline jobs are explicitly allowed', () => {
    const { JOBS_INTERACTIVE_QUEUE_URL: _q, ...rest } = base;
    expect(() => parseEnv(appServerEnv, rest)).toThrow(/JOBS_INTERACTIVE_QUEUE_URL/);
    expect(() => parseEnv(appServerEnv, { ...rest, JOBS_TRANSPORT_INLINE: '1' })).not.toThrow();
    expect(() =>
      parseEnv(appServerEnv, { ...rest, APP_ENV: 'production', JOBS_TRANSPORT_INLINE: '1' }),
    ).toThrow(/JOBS_TRANSPORT_INLINE/);
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

describe('parseEnv(workerEnv)', () => {
  const arn = 'arn:aws:secretsmanager:eu-west-1:123456789012:secret:robes-db-AbCdEf';

  it('takes the DB URL from a secret ARN in AWS or directly in dev', () => {
    expect(parseEnv(workerEnv, { APP_ENV: 'staging', DATABASE_URL_SECRET_ARN: arn })).toEqual({
      APP_ENV: 'staging',
      DATABASE_URL_SECRET_ARN: arn,
    });
    expect(() =>
      parseEnv(workerEnv, { APP_ENV: 'dev', DATABASE_URL: base.DATABASE_URL }),
    ).not.toThrow();
  });

  it('needs exactly one DB source and no plain URL in production', () => {
    expect(() => parseEnv(workerEnv, { APP_ENV: 'dev' })).toThrow(/DATABASE_URL/);
    expect(() =>
      parseEnv(workerEnv, {
        APP_ENV: 'staging',
        DATABASE_URL: base.DATABASE_URL,
        DATABASE_URL_SECRET_ARN: arn,
      }),
    ).toThrow(/exactly one/);
    expect(() =>
      parseEnv(workerEnv, { APP_ENV: 'production', DATABASE_URL: base.DATABASE_URL }),
    ).toThrow(/SECRET_ARN/);
  });

  it('validates the queue URL', () => {
    expect(() =>
      parseEnv(workerEnv, {
        APP_ENV: 'dev',
        DATABASE_URL: base.DATABASE_URL,
        JOBS_INTERACTIVE_QUEUE_URL: 'nope',
      }),
    ).toThrow(/JOBS_INTERACTIVE_QUEUE_URL/);
  });
});
