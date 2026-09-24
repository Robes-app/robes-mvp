import { describe, expect, it } from 'vitest';
import { expectPgError, insertUsers, inTx, USER_A, USER_B } from '../pg';

describe('identity schema', () => {
  it('creates profile and ui state on signup, first name from the name', () =>
    inTx(async (q) => {
      await insertUsers(q, USER_A);
      const [profile] = await q('select first_name from app.profiles where id = $1', [USER_A]);
      expect(profile?.first_name).toBe('Ann');
      const [state] = await q(
        'select count(*)::int as n from app.user_ui_state where user_id = $1',
        [USER_A],
      );
      expect(state?.n).toBe(1);
    }));

  it('validates the instagram handle', () =>
    inTx(async (q) => {
      await insertUsers(q, USER_A);
      await expectPgError(
        q,
        '23514',
        "update app.profiles set instagram_handle = 'bad handle!' where id = $1",
        [USER_A],
      );
    }));

  it('cascades a user deletion to their rows', () =>
    inTx(async (q) => {
      await insertUsers(q, USER_A, USER_B);
      await q('delete from app.users where id = $1', [USER_B]);
      const rows = await q('select id from app.profiles where id = $1', [USER_B]);
      expect(rows).toEqual([]);
    }));

  it('treats emails case-insensitively', () =>
    inTx(async (q) => {
      await insertUsers(q, USER_A);
      await expectPgError(
        q,
        '23505',
        'insert into app.users (id, email) values (gen_random_uuid(), upper($1))',
        [`${USER_A}@test.dev`],
      );
    }));
});
