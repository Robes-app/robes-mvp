import { describe, expect, it } from 'vitest';
import { expectPgError, insertUsers, inTx, USER_A } from '../pg';

// Plan 2026-11-05: the Robes model she chose, and the catalog's grammar for a Robes model's key
// and for silver hair.
describe('robes models schema', () => {
  it('keeps model_preset to the five, or none', () =>
    inTx(async (q) => {
      await insertUsers(q, USER_A);
      await q('update app.profiles set model_preset = 4 where id = $1', [USER_A]);
      const [row] = await q('select model_preset from app.profiles where id = $1', [USER_A]);
      expect(row?.model_preset).toBe(4);
      await expectPgError(q, '23514', 'update app.profiles set model_preset = 6 where id = $1', [
        USER_A,
      ]);
      await q('update app.profiles set model_preset = null where id = $1', [USER_A]);
    }));

  it('takes a Robes model key and silver hair in the catalog, and nothing outside the grammar', () =>
    inTx(async (q) => {
      await q("insert into app.avatar_cells (id) values ('w-r4@v1'), ('m-s2-h5-nt@v2')");
      const rows = await q('select count(*)::int as n from app.avatar_cells where id in ($1, $2)', [
        'w-r4@v1',
        'm-s2-h5-nt@v2',
      ]);
      expect(rows[0]?.n).toBe(2);
      await expectPgError(q, '23514', "insert into app.avatar_cells (id) values ('w-r6@v1')");
      await expectPgError(q, '23514', "insert into app.avatar_cells (id) values ('preset:w4@v1')");
    }));
});
