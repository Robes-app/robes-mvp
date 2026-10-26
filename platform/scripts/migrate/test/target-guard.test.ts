import { describe, expect, test } from 'vitest';
import { targetUrl } from '../src/db';

const prod = 'postgresql://postgres.ref:pw@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
const host = 'aws-1-eu-west-1.pooler.supabase.com';
const local = 'postgres://postgres:postgres@127.0.0.1:55432/robes_migrate';
const flagged = ['node', 'cli.ts', '--target=production'];

describe('targetUrl', () => {
  test('a local target needs no confirmation', () => {
    expect(targetUrl({ TARGET_DATABASE_URL: local }, [])).toBe(local);
  });

  test('the default target is the local rehearsal database', () => {
    expect(targetUrl({}, [])).toMatch(/@127\.0\.0\.1:55432\/\w+_migrate\?/);
  });

  test('a remote target is refused without --target=production, even with its host named', () => {
    expect(() =>
      targetUrl({ TARGET_DATABASE_URL: prod, ROBES_MIGRATE_PRODUCTION: host }, []),
    ).toThrow(/--target=production/);
  });

  test('a remote target is refused without naming its exact host', () => {
    expect(() => targetUrl({ TARGET_DATABASE_URL: prod }, flagged)).toThrow(
      /ROBES_MIGRATE_PRODUCTION=aws-1/,
    );
    expect(() =>
      targetUrl(
        { TARGET_DATABASE_URL: prod, ROBES_MIGRATE_PRODUCTION: 'some-other-host' },
        flagged,
      ),
    ).toThrow(/not local/);
  });

  test('a remote target runs once the flag and its exact host are both given', () => {
    expect(targetUrl({ TARGET_DATABASE_URL: prod, ROBES_MIGRATE_PRODUCTION: host }, flagged)).toBe(
      prod,
    );
  });

  test('--target=production against a local or unset URL refuses (it would not write production)', () => {
    expect(() => targetUrl({ TARGET_DATABASE_URL: local }, flagged)).toThrow(/is local/);
    expect(() => targetUrl({}, flagged)).toThrow(/is local/);
  });

  test('an unknown --target value refuses', () => {
    expect(() => targetUrl({ TARGET_DATABASE_URL: local }, ['--target=staging'])).toThrow(
      /unknown --target=staging/,
    );
    expect(() => targetUrl({ TARGET_DATABASE_URL: local }, ['--target'])).toThrow(/unknown/);
  });
});
