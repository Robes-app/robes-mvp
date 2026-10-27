import { describe, expect, it } from 'vitest';
import { expectPgError, insertUsers, inTx, type Query, USER_A, USER_B } from '../pg';

const ITEM = 'bbbbbbbb-0000-4000-8000-000000000001';
const ITEM_2 = 'bbbbbbbb-0000-4000-8000-000000000002';
const ASSET_B = 'aaaaaaaa-0000-4000-8000-000000000002';

async function setup(q: Query): Promise<void> {
  await insertUsers(q, USER_A, USER_B);
  await q("insert into app.assets (id, user_id, kind) values ($1, $2, 'wardrobe')", [
    ASSET_B,
    USER_B,
  ]);
  await q(
    `insert into app.wardrobe_items (id, user_id, label, category, category_l2, category_l3)
     values ($1, $2, 'Navy blazer', 'Outerwear', 'Blazers', 'Single-breasted blazer')`,
    [ITEM, USER_A],
  );
}

describe('wardrobe schema', () => {
  it('pre-fills season band and wear-for tags from the taxonomy', () =>
    inTx(async (q) => {
      await setup(q);
      const [item] = await q('select season_band from app.wardrobe_items where id = $1', [ITEM]);
      expect(item?.season_band).toBe('year_round');
      const tags = await q<{ slug: string; source: string }>(
        `select t.slug, tp.source from app.tag_pieces tp join app.tags t on t.id = tp.tag_id
         where tp.wardrobe_item_id = $1 order by t.slug`,
        [ITEM],
      );
      expect(tags).toEqual([
        { slug: 'everyday', source: 'inferred' },
        { slug: 'work', source: 'inferred' },
      ]);
    }));

  it('never overwrites a season she chose', () =>
    inTx(async (q) => {
      await setup(q);
      await q(
        `insert into app.wardrobe_items (id, user_id, label, category, category_l2, season_band, season_source)
         values ($1, $2, 'Wool coat', 'Outerwear', 'Coats', 'spring_summer', 'user')`,
        [ITEM_2, USER_A],
      );
      const [item] = await q('select season_band from app.wardrobe_items where id = $1', [ITEM_2]);
      expect(item?.season_band).toBe('spring_summer');
    }));

  it('cannot attach another user’s asset (composite FK)', () =>
    inTx(async (q) => {
      await setup(q);
      await expectPgError(
        q,
        '23503',
        "insert into app.wardrobe_items (user_id, label, image_asset_id) values ($1, 'x', $2)",
        [USER_A, ASSET_B],
      );
    }));

  it('rejects unknown taxonomy nodes', () =>
    inTx(async (q) => {
      await setup(q);
      await expectPgError(
        q,
        '23503',
        "insert into app.wardrobe_items (user_id, label, category_l2, category_l3) values ($1, 'x', 'Jeans', 'Hovercraft')",
        [USER_A],
      );
    }));

  it('keeps hero positions unique per user', () =>
    inTx(async (q) => {
      await setup(q);
      await q("insert into app.wardrobe_items (id, user_id, label) values ($1, $2, 'Tee')", [
        ITEM_2,
        USER_A,
      ]);
      await q('update app.wardrobe_items set hero_position = 1 where id = $1', [ITEM]);
      await expectPgError(
        q,
        '23505',
        'update app.wardrobe_items set hero_position = 1 where id = $1',
        [ITEM_2],
      );
    }));

  it('slugs tags, folding accents and punctuation', () =>
    inTx(async (q) => {
      await setup(q);
      await q("insert into app.tags (user_id, kind, label) values ($1, 'vibe', 'Café  Noir!')", [
        USER_A,
      ]);
      const [tag] = await q("select slug from app.tags where label = 'Café  Noir!'");
      expect(tag?.slug).toBe('cafe-noir');
    }));

  it('cannot tag across users (composite FK)', () =>
    inTx(async (q) => {
      await setup(q);
      const [tag] = await q<{ id: string }>(
        "insert into app.tags (user_id, kind, label) values ($1, 'vibe', 'Mine') returning id",
        [USER_A],
      );
      await expectPgError(
        q,
        '23503',
        'insert into app.tag_pieces (user_id, tag_id, wardrobe_item_id) values ($1, $2, $3)',
        [USER_B, tag?.id, ITEM],
      );
    }));

  it('holds a piece to the colour model: one known shade, up to three more, a known print', () =>
    inTx(async (q) => {
      await setup(q);
      await q(
        `update app.wardrobe_items set colour_shade = 'navy', colour_extra = '{optic,gold}',
         print = 'stripes' where id = $1`,
        [ITEM],
      );
      for (const set of [
        "colour_shade = 'chartreuse'",
        "colour_extra = '{optic,jet,ivory,chalk}'",
        "colour_extra = '{nope}'",
        "print = 'plain'",
      ]) {
        await expectPgError(q, '23514', `update app.wardrobe_items set ${set} where id = $1`, [
          ITEM,
        ]);
      }
      await expectPgError(
        q,
        '23514',
        "insert into app.wishlist_items (user_id, label, colour_shade) values ($1, 'x', 'nope')",
        [USER_A],
      );
      await expectPgError(
        q,
        '23514',
        `insert into app.style_profiles (user_id, palette) values ($1, '[]')`,
        [USER_A],
      );
    }));

  it('holds a piece and a wish to the material model: one known material, or none', () =>
    inTx(async (q) => {
      await setup(q);
      await q(`update app.wardrobe_items set material = 'vegan_leather' where id = $1`, [ITEM]);
      await q(`update app.wardrobe_items set material = null where id = $1`, [ITEM]);
      for (const value of ['nylon', 'other', '']) {
        await expectPgError(
          q,
          '23514',
          'update app.wardrobe_items set material = $2 where id = $1',
          [ITEM, value],
        );
      }
      await expectPgError(
        q,
        '23514',
        "insert into app.wishlist_items (user_id, label, material) values ($1, 'x', 'Cotton')",
        [USER_A],
      );
    }));
});
