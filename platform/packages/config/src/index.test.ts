import { describe, expect, it } from 'vitest';
import { appServerEnv, parseEnv } from './index';

const base = {
  NODE_ENV: 'production',
  APP_ENV: 'staging',
  DATABASE_URL: 'postgres://robes_app:pw@db.example.com:5432/robes',
  BETTER_AUTH_SECRET: 'x'.repeat(40),
  BETTER_AUTH_URL: 'https://staging.byrobes.com',
  RESEND_API_KEY: 're_test',
  UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'token-value',
  MEDIA_BUCKET: 'robes-staging-media',
  MEDIA_PUBLIC_ORIGIN: 'https://media.staging.byrobes.com',
  MEDIA_CLOUDFRONT_KEY_PAIR_ID: 'K2TESTKEY',
  MEDIA_CLOUDFRONT_PRIVATE_KEY:
    '-----BEGIN RSA PRIVATE KEY-----\\nabc\\n-----END RSA PRIVATE KEY-----',
};

const localMedia = {
  MEDIA_BUCKET: 'robes-dev-media',
  MEDIA_S3_ENDPOINT: 'http://127.0.0.1:59000',
  MEDIA_S3_ACCESS_KEY_ID: 'robes',
  MEDIA_S3_SECRET_ACCESS_KEY: 'robes-local-secret',
};

function devEnv(overrides: Record<string, string | undefined> = {}) {
  const {
    UPSTASH_REDIS_REST_URL: _u,
    UPSTASH_REDIS_REST_TOKEN: _t,
    RESEND_API_KEY: _r,
    MEDIA_PUBLIC_ORIGIN: _o,
    MEDIA_CLOUDFRONT_KEY_PAIR_ID: _k,
    MEDIA_CLOUDFRONT_PRIVATE_KEY: _p,
    ...rest
  } = base;
  return {
    ...rest,
    ...localMedia,
    APP_ENV: 'dev',
    SMTP_URL: 'smtp://127.0.0.1:51025',
    ...overrides,
  };
}

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
    expect(() => parseEnv(appServerEnv, devEnv())).not.toThrow();
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

describe('media env', () => {
  it('uses CloudFront outside dev and unescapes the private key', () => {
    const { media } = parseEnv(appServerEnv, base);
    expect(media.cloudfront).toMatchObject({
      origin: 'https://media.staging.byrobes.com',
      keyPairId: 'K2TESTKEY',
    });
    expect(media.cloudfront?.privateKey.split('\n')).toHaveLength(3);
    expect(media.s3).toEqual({
      bucket: 'robes-staging-media',
      region: 'eu-west-1',
      endpoint: undefined,
      credentials: undefined,
    });
    expect(media.deliveryOrigin).toBe('https://media.staging.byrobes.com');
    expect(media.uploadOrigin).toBe('https://robes-staging-media.s3.eu-west-1.amazonaws.com');
  });

  it('requires CloudFront signing outside dev and refuses static S3 keys', () => {
    const {
      MEDIA_CLOUDFRONT_KEY_PAIR_ID: _k,
      MEDIA_CLOUDFRONT_PRIVATE_KEY: _p,
      ...unsigned
    } = base;
    expect(() => parseEnv(appServerEnv, { ...unsigned, APP_ENV: 'production' })).toThrow(
      /MEDIA_CLOUDFRONT_KEY_PAIR_ID/,
    );
    expect(() =>
      parseEnv(appServerEnv, {
        ...base,
        MEDIA_S3_ACCESS_KEY_ID: 'a',
        MEDIA_S3_SECRET_ACCESS_KEY: 'b',
      }),
    ).toThrow(/MEDIA_S3_ACCESS_KEY_ID/);
    expect(() =>
      parseEnv(appServerEnv, { ...base, MEDIA_PUBLIC_ORIGIN: 'http://media.byrobes.com' }),
    ).toThrow(/MEDIA_PUBLIC_ORIGIN/);
  });

  it('requires the MinIO endpoint in dev and serves images from it', () => {
    expect(() => parseEnv(appServerEnv, devEnv({ MEDIA_S3_ENDPOINT: undefined }))).toThrow(
      /MEDIA_S3_ENDPOINT/,
    );
    const { media } = parseEnv(appServerEnv, devEnv());
    expect(media.cloudfront).toBeUndefined();
    expect(media.s3.credentials).toEqual({
      accessKeyId: 'robes',
      secretAccessKey: 'robes-local-secret',
    });
    expect(media.deliveryOrigin).toBe('http://127.0.0.1:59000');
    expect(media.uploadOrigin).toBe('http://127.0.0.1:59000');
  });

  it('rejects half-configured signing and bad bucket names', () => {
    expect(() => parseEnv(appServerEnv, devEnv({ MEDIA_CLOUDFRONT_KEY_PAIR_ID: 'K1' }))).toThrow(
      /MEDIA_CLOUDFRONT_PRIVATE_KEY.*MEDIA_PUBLIC_ORIGIN/,
    );
    expect(() => parseEnv(appServerEnv, devEnv({ MEDIA_S3_SECRET_ACCESS_KEY: undefined }))).toThrow(
      /MEDIA_S3_SECRET_ACCESS_KEY/,
    );
    expect(() => parseEnv(appServerEnv, devEnv({ MEDIA_BUCKET: 'Bad_Bucket' }))).toThrow(
      /MEDIA_BUCKET/,
    );
  });
});
