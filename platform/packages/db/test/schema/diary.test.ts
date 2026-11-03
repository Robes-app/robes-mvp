import { describe, expect, it } from 'vitest';
import { expectPgError, insertUsers, inTx, type Query, USER_A, USER_B } from '../pg';

async function setup(q: Query): Promise<void> {
  await insertUsers(q, USER_A, USER_B);
}

describe('diary schema (plan 2026-11-02)', () => {
  it('holds one place per day, inside the world, named', () =>
    inTx(async (q) => {
      await setup(q);
      await q(
        `insert into app.day_places (user_id, day_date, city, country, lat, lon)
         values ($1, '2026-11-03', 'Paris', 'France', 48.86, 2.35)`,
        [USER_A],
      );
      await expectPgError(
        q,
        '23505',
        `insert into app.day_places (user_id, day_date, city, lat, lon)
         values ($1, '2026-11-03', 'Lyon', 45.76, 4.84)`,
        [USER_A],
      );
      await expectPgError(
        q,
        '23514',
        `insert into app.day_places (user_id, day_date, city, lat, lon)
         values ($1, '2026-11-04', 'Nowhere', 91, 0)`,
        [USER_A],
      );
      await expectPgError(
        q,
        '23514',
        `insert into app.day_places (user_id, day_date, city, lat, lon)
         values ($1, '2026-11-04', '', 1, 1)`,
        [USER_A],
      );
      // Another user's row on the same day is her own.
      await q(
        `insert into app.day_places (user_id, day_date, city, lat, lon)
         values ($1, '2026-11-03', 'Bergen', 60.39, 5.32)`,
        [USER_B],
      );
      const rows = await q<{ city: string }>(
        'select city from app.day_places where day_date = $1 order by city',
        ['2026-11-03'],
      );
      expect(rows.map((r) => r.city)).toEqual(['Bergen', 'Paris']);
      await q('delete from app.users where id = $1', [USER_A]);
      expect(await q('select 1 from app.day_places where user_id = $1', [USER_A])).toEqual([]);
    }));

  it('gives every planned look a position from zero', () =>
    inTx(async (q) => {
      await setup(q);
      await q(
        `insert into app.looks (id, user_id, name) values ('cccccccc-0000-4000-8000-000000000001', $1, 'Office')`,
        [USER_A],
      );
      await q(
        `insert into app.planned_days (user_id, day_date, source_kind, look_id)
         values ($1, '2026-11-03', 'look', 'cccccccc-0000-4000-8000-000000000001')`,
        [USER_A],
      );
      const [row] = await q<{ position: number }>(
        'select position from app.planned_days where user_id = $1',
        [USER_A],
      );
      expect(row?.position).toBe(0);
      await expectPgError(
        q,
        '23514',
        `update app.planned_days set position = -1 where user_id = $1`,
        [USER_A],
      );
    }));
});
