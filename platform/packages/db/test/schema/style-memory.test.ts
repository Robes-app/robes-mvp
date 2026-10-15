import { describe, expect, it } from 'vitest';
import { expectPgError, insertUsers, inTx, USER_A, USER_B } from '../pg';

const LOOK_B = 'cccccccc-0000-4000-8000-0000000000b1';

describe('style memory and brief schema', () => {
  it('holds the facts to the prototype’s ranges, size never weight', () =>
    inTx(async (q) => {
      await insertUsers(q, USER_A);
      await q(
        "update app.profiles set height_cm = 168, size_uk = 10, shoe_uk = 5.5, age_band = '45_54', investment_level = '500_1500' where id = $1",
        [USER_A],
      );
      await expectPgError(q, '23514', 'update app.profiles set size_uk = 11 where id = $1', [
        USER_A,
      ]);
      await expectPgError(q, '23514', 'update app.profiles set shoe_uk = 5.25 where id = $1', [
        USER_A,
      ]);
      await expectPgError(q, '23514', 'update app.profiles set height_cm = 250 where id = $1', [
        USER_A,
      ]);
      await expectPgError(
        q,
        '23514',
        "update app.profiles set investment_level = 'lots' where id = $1",
        [USER_A],
      );
    }));

  it('keeps one live line per text and list, and only brief lists can be kept', () =>
    inTx(async (q) => {
      await insertUsers(q, USER_A);
      const line =
        "insert into app.style_brief_lines (user_id, list, state, text, kept_at) values ($1, 'rules', $2, 'No heels', $3)";
      await q(line, [USER_A, 'kept', new Date()]);
      await expectPgError(q, '23505', line.replace('No heels', 'no heels'), [
        USER_A,
        'pending',
        null,
      ]);
      await q(line, [USER_A, 'struck', null]);
      await expectPgError(
        q,
        '23514',
        "insert into app.style_brief_lines (user_id, list, state, text, kept_at) values ($1, 'notes', 'kept', 'x', now())",
        [USER_A],
      );
      await expectPgError(
        q,
        '23514',
        "insert into app.style_brief_lines (user_id, list, state, text) values ($1, 'loves', 'kept', 'x')",
        [USER_A],
      );
    }));

  it('makes the memory immutable and never links another user’s look', () =>
    inTx(async (q) => {
      await insertUsers(q, USER_A, USER_B);
      await q("insert into app.looks (id, user_id, name) values ($1, $2, 'Hers')", [
        LOOK_B,
        USER_B,
      ]);
      await q(
        "insert into app.style_memory (user_id, kind, body) values ($1, 'strike', 'Robes had it wrong')",
        [USER_A],
      );
      await expectPgError(q, '55000', "update app.style_memory set body = 'edited'", []);
      await expectPgError(
        q,
        '23503',
        "insert into app.style_memory (user_id, kind, verdict, look_id) values ($1, 'verdict', 1, $2)",
        [USER_A, LOOK_B],
      );
      await expectPgError(
        q,
        '23514',
        "insert into app.style_memory (user_id, kind) values ($1, 'verdict')",
        [USER_A],
      );
    }));

  it('accepts the style_brief job kind', () =>
    inTx(async (q) => {
      await insertUsers(q, USER_A);
      const [row] = await q<{ kind: string }>(
        "insert into app.generation_jobs (user_id, kind) values ($1, 'style_brief') returning kind",
        [USER_A],
      );
      expect(row?.kind).toBe('style_brief');
    }));
});
