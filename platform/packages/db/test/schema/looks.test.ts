import { describe, expect, it } from 'vitest';
import { expectPgError, insertUsers, inTx, type Query, USER_A, USER_B } from '../pg';

const ITEM_A = 'bbbbbbbb-0000-4000-8000-000000000001';
const ITEM_B = 'bbbbbbbb-0000-4000-8000-000000000002';
const LOOK = 'cccccccc-0000-4000-8000-000000000001';

async function setup(q: Query): Promise<void> {
  await insertUsers(q, USER_A, USER_B);
  await q(
    "insert into app.wardrobe_items (id, user_id, label, price) values ($1, $2, 'Coat', 300), ($3, $4, 'Her coat', 10)",
    [ITEM_A, USER_A, ITEM_B, USER_B],
  );
  await q("insert into app.looks (id, user_id, name) values ($1, $2, 'Monday')", [LOOK, USER_A]);
}

async function wear(q: Query, day: string): Promise<void> {
  await q('insert into app.wears (user_id, look_id, worn_on, piece_ids) values ($1, $2, $3, $4)', [
    USER_A,
    LOOK,
    day,
    [ITEM_A],
  ]);
}

describe('looks and planning schema', () => {
  it('lets a look hold only its owner’s pieces', () =>
    inTx(async (q) => {
      await setup(q);
      await q(
        'insert into app.look_pieces (look_id, user_id, wardrobe_item_id) values ($1, $2, $3)',
        [LOOK, USER_A, ITEM_A],
      );
      await expectPgError(
        q,
        '23503',
        'insert into app.look_pieces (look_id, user_id, wardrobe_item_id) values ($1, $2, $3)',
        [LOOK, USER_A, ITEM_B],
      );
    }));

  it('makes wears immutable and one per look per day', () =>
    inTx(async (q) => {
      await setup(q);
      await wear(q, '2026-09-20');
      await expectPgError(q, '55000', "update app.wears set note = 'edited' where look_id = $1", [
        LOOK,
      ]);
      await q('savepoint dup');
      await expect(wear(q, '2026-09-20')).rejects.toMatchObject({ code: '23505' });
      await q('rollback to savepoint dup');
    }));

  it('derives times worn and cost per wear', () =>
    inTx(async (q) => {
      await setup(q);
      await wear(q, '2026-09-20');
      await wear(q, '2026-09-21');
      const [stats] = await q(
        'select times_worn, cost_per_wear from app.wardrobe_item_stats where wardrobe_item_id = $1',
        [ITEM_A],
      );
      expect(stats).toEqual({ times_worn: 2, cost_per_wear: '150.00' });
    }));

  it('requires a planned day to reference exactly one source', () =>
    inTx(async (q) => {
      await setup(q);
      await expectPgError(
        q,
        '23514',
        "insert into app.planned_days (user_id, day_date, source_kind) values ($1, '2026-09-22', 'look')",
        [USER_A],
      );
      await q(
        "insert into app.planned_days (user_id, day_date, source_kind, look_id) values ($1, '2026-09-22', 'look', $2)",
        [USER_A, LOOK],
      );
    }));

  it('hard-deletes tombstones after 30 days via run_maintenance', () =>
    inTx(async (q) => {
      await setup(q);
      await q("update app.looks set deleted_at = now() - interval '31 days' where id = $1", [LOOK]);
      await q('select private.run_maintenance()');
      expect(await q('select id from app.looks where id = $1', [LOOK])).toEqual([]);
    }));

  it('holds look states: a known status, working notes off saved looks, her own anchor', () =>
    inTx(async (q) => {
      await setup(q);
      await expectPgError(q, '23514', "update app.looks set status = 'kept' where id = $1", [LOOK]);
      await expectPgError(
        q,
        '23514',
        `update app.looks set edits = '{"a":{"back":true}}' where id = $1`,
        [LOOK],
      );
      await q(
        `update app.looks set status = 'draft', edits = '{"a":{"back":true}}', anchor_piece_id = $2 where id = $1`,
        [LOOK, ITEM_A],
      );
      await expectPgError(q, '23503', 'update app.looks set anchor_piece_id = $2 where id = $1', [
        LOOK,
        ITEM_B,
      ]);
      await expectPgError(q, '23514', "update app.looks set styling = '[]' where id = $1", [LOOK]);
      await expectPgError(q, '23514', 'update app.looks set set_index = 3 where id = $1', [LOOK]);
    }));

  it('names the record as her photograph or her model, nothing else', () =>
    inTx(async (q) => {
      await setup(q);
      await q("update app.looks set record_image = 'model' where id = $1", [LOOK]);
      await q("update app.looks set record_image = 'photo' where id = $1", [LOOK]);
      await expectPgError(q, '23514', "update app.looks set record_image = 'cover' where id = $1", [
        LOOK,
      ]);
    }));
});
