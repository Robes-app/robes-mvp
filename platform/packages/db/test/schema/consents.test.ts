import { CONSENT_KINDS, CONSENT_SOURCES } from '@robes/core';
import { describe, expect, it } from 'vitest';
import { expectPgError, insertUsers, inTx, USER_A } from '../pg';

describe('consents schema (SEC-84)', () => {
  it('matches the kinds and sources in @robes/core', () =>
    inTx(async (q) => {
      await insertUsers(q, USER_A);
      for (const kind of CONSENT_KINDS) {
        for (const source of CONSENT_SOURCES) {
          await q(
            'insert into app.consents (user_id, kind, granted, source) values ($1,$2,$3,$4)',
            [USER_A, kind, true, source],
          );
        }
      }
      await expectPgError(
        q,
        '23514',
        "insert into app.consents (user_id, kind, granted, source) values ($1, 'tracking', true, 'web')",
        [USER_A],
      );
      await expectPgError(
        q,
        '23514',
        "insert into app.consents (user_id, kind, granted, source) values ($1, 'analytics', true, 'fax')",
        [USER_A],
      );
      const [defs] = await q<{ n: number }>(
        "select count(*)::int as n from pg_constraint where conrelid = 'app.consents'::regclass and contype = 'c'",
      );
      expect(defs?.n).toBe(2);
    }));

  it('is append-only: answers are never edited in place', () =>
    inTx(async (q) => {
      await insertUsers(q, USER_A);
      await q(
        "insert into app.consents (user_id, kind, granted, source) values ($1, 'analytics', true, 'web')",
        [USER_A],
      );
      await expectPgError(
        q,
        '55000',
        'update app.consents set granted = false where user_id = $1',
        [USER_A],
      );
    }));
});
