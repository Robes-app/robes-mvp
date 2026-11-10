import { describe, expect, it } from 'vitest';
import { expectPgError, insertUsers, inTx, type Query, USER_A, USER_B } from '../pg';

const ITEM_A = 'bbbbbbbb-0000-4000-8000-000000000001';
const ITEM_B = 'bbbbbbbb-0000-4000-8000-000000000002';
const LOOK = 'cccccccc-0000-4000-8000-000000000001';
const ASSET_A = 'aaaaaaaa-0000-4000-8000-000000000011';
const ASSET_B = 'aaaaaaaa-0000-4000-8000-000000000012';

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

  // The image stack (Felix rebuild D13).
  it('holds her photographs of a look, hers alone, each once, in twenty places', () =>
    inTx(async (q) => {
      await setup(q);
      await q(
        "insert into app.assets (id, user_id, kind) values ($1, $2, 'look_photo'), ($3, $4, 'look_photo')",
        [ASSET_A, USER_A, ASSET_B, USER_B],
      );
      await q('insert into app.look_images (user_id, look_id, asset_id) values ($1, $2, $3)', [
        USER_A,
        LOOK,
        ASSET_A,
      ]);
      // Another woman's photograph can't be stacked on her look, nor her look stacked by another.
      await expectPgError(
        q,
        '23503',
        'insert into app.look_images (user_id, look_id, asset_id) values ($1, $2, $3)',
        [USER_A, LOOK, ASSET_B],
      );
      await expectPgError(
        q,
        '23503',
        'insert into app.look_images (user_id, look_id, asset_id) values ($1, $2, $3)',
        [USER_B, LOOK, ASSET_B],
      );
      await expectPgError(
        q,
        '23505',
        'insert into app.look_images (user_id, look_id, asset_id, position) values ($1, $2, $3, 1)',
        [USER_A, LOOK, ASSET_A],
      );
      await expectPgError(
        q,
        '23514',
        'update app.look_images set position = 20 where look_id = $1',
        [LOOK],
      );
      // The look goes, its stack goes with it.
      await q('delete from app.looks where id = $1', [LOOK]);
      expect(await q('select 1 from app.look_images where look_id = $1', [LOOK])).toEqual([]);
    }));

  // Seasons (D12): the four seasons and the band, kept in step both ways.
  it('derives the band from the seasons and the seasons from the band, on a look', () =>
    inTx(async (q) => {
      await setup(q);
      const read = async () =>
        (await q('select seasons, climate_band from app.looks where id = $1', [LOOK]))[0];
      // A look made by older code, band only, reads as its seasons.
      await q("update app.looks set climate_band = 'spring_summer' where id = $1", [LOOK]);
      expect(await read()).toEqual({
        seasons: ['spring', 'summer'],
        climate_band: 'spring_summer',
      });
      // Seasons she picks set the band; spelled once each, in the order of the year.
      await q("update app.looks set seasons = '{winter,autumn,winter}' where id = $1", [LOOK]);
      expect(await read()).toEqual({
        seasons: ['autumn', 'winter'],
        climate_band: 'autumn_winter',
      });
      await q("update app.looks set seasons = '{summer,winter}' where id = $1", [LOOK]);
      expect(await read()).toEqual({ seasons: ['summer', 'winter'], climate_band: 'year_round' });
      await q("update app.looks set seasons = '{}' where id = $1", [LOOK]);
      expect(await read()).toEqual({ seasons: [], climate_band: 'year_round' });
      await expectPgError(q, '23514', "update app.looks set seasons = '{monsoon}' where id = $1", [
        LOOK,
      ]);
      // On an insert, whichever side was given wins.
      const [made] = await q(
        "insert into app.looks (user_id, name, seasons) values ($1, 'Winter', '{winter}') returning climate_band",
        [USER_A],
      );
      expect(made?.climate_band).toBe('autumn_winter');
      const [banded] = await q(
        "insert into app.looks (user_id, name, climate_band) values ($1, 'Band', 'spring_summer') returning seasons",
        [USER_A],
      );
      expect(banded?.seasons).toEqual(['spring', 'summer']);
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

  // D21: her note on Robes' picture; D19: Robes' picture hidden, never destroyed.
  it('keeps a picture note to 280 characters, and Robes’ picture shown by default', () =>
    inTx(async (q) => {
      await setup(q);
      const [fresh] = await q('select picture_note, robes_hidden from app.looks where id = $1', [
        LOOK,
      ]);
      expect(fresh).toEqual({ picture_note: null, robes_hidden: false });
      await q('update app.looks set picture_note = $2, robes_hidden = true where id = $1', [
        LOOK,
        'x'.repeat(280),
      ]);
      await expectPgError(q, '23514', 'update app.looks set picture_note = $2 where id = $1', [
        LOOK,
        'x'.repeat(281),
      ]);
      await expectPgError(q, '23514', "update app.looks set picture_note = '' where id = $1", [
        LOOK,
      ]);
      await expectPgError(q, '23502', 'update app.looks set robes_hidden = null where id = $1', [
        LOOK,
      ]);
    }));

  it('takes a look from her photograph as its own source, and no source it does not know', () =>
    inTx(async (q) => {
      await setup(q);
      await q("update app.looks set source = 'capture' where id = $1", [LOOK]);
      const [row] = await q('select source from app.looks where id = $1', [LOOK]);
      expect(row).toEqual({ source: 'capture' });
      await expectPgError(q, '23514', "update app.looks set source = 'camera' where id = $1", [
        LOOK,
      ]);
    }));
});
