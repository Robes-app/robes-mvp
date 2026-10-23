import { describe, expect, test } from 'vitest';
import { targetUrl } from '../src/db';

const prod = 'postgresql://postgres.ref:pw@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

describe('targetUrl', () => {
  test('a local target needs no confirmation', () => {
    const local = 'postgres://postgres:postgres@127.0.0.1:55432/robes_migrate';
    expect(targetUrl({ TARGET_DATABASE_URL: local })).toBe(local);
  });

  test('a remote target is refused without naming its host', () => {
    expect(() => targetUrl({ TARGET_DATABASE_URL: prod })).toThrow(/ROBES_MIGRATE_PRODUCTION=/);
    expect(() =>
      targetUrl({ TARGET_DATABASE_URL: prod, ROBES_MIGRATE_PRODUCTION: 'some-other-host' }),
    ).toThrow(/not local/);
  });

  test('a remote target runs once its exact host is confirmed', () => {
    const env = {
      TARGET_DATABASE_URL: prod,
      ROBES_MIGRATE_PRODUCTION: 'aws-1-eu-west-1.pooler.supabase.com',
    };
    expect(targetUrl(env)).toBe(prod);
  });
});
