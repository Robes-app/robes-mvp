import { resolveTaxonomy } from '@robes/core';
import { shade } from '@robes/core/colour';
import { type Insertable, sql, type Updateable } from 'kysely';
import type { Db } from '../client';
import type { WishlistItems } from '../database.types';
import type { UserId } from '../ids';
import { afterCursor, createdMs, toPage } from './paging';
import { PIECE_COLUMNS } from './wardrobe';

export const WISH_COLUMNS = [
  'id',
  'label',
  'category',
  'categoryL2',
  'categoryL3',
  'color',
  'colourShade',
  'colourExtra',
  'print',
  'brand',
  'note',
  'imageAssetId',
  'price',
  'currency',
  'size',
  'sourceType',
  'sourceLabel',
  'sourceUrl',
  'createdAt',
  'updatedAt',
] as const;

export interface WishFields {
  label?: string;
  categoryL2?: string | null;
  categoryL3?: string | null;
  color?: string | null;
  colourShade?: string | null;
  colourExtra?: string[];
  print?: string | null;
  brand?: string | null;
  note?: string | null;
  price?: number | null;
  currency?: string | null;
  size?: string | null;
  sourceUrl?: string | null;
  sourceLabel?: string | null;
}

// Same rule as pieces: the taxonomy decides the legacy category.
function withTaxonomy(fields: WishFields): Updateable<WishlistItems> {
  const out: Updateable<WishlistItems> = { ...fields };
  if (fields.categoryL2 !== undefined) {
    const tax = fields.categoryL2 ? resolveTaxonomy(fields.categoryL2, fields.categoryL3) : null;
    out.category = tax?.category ?? 'Other';
    out.categoryL2 = tax?.categoryL2 ?? null;
    out.categoryL3 = tax?.categoryL3 ?? null;
  }
  if (fields.colourShade) out.color = shade(fields.colourShade)?.name ?? fields.color ?? null;
  return out;
}

// Wishlist: pieces she wants. Promoted ("I bought this") and deleted wishes leave the list.
export function wishlistRepo(db: Db) {
  const active = () =>
    db
      .selectFrom('wishlistItems')
      .where('deletedAt', 'is', null)
      .where('promotedItemId', 'is', null);

  return {
    async list(userId: UserId, q: { limit: number; cursor?: string | undefined }) {
      let query = active()
        .select(WISH_COLUMNS)
        .where('userId', '=', userId)
        .orderBy(createdMs, 'desc')
        .orderBy('id', 'desc')
        .limit(q.limit + 1);
      const after = afterCursor(q.cursor);
      if (after) query = query.where(after);
      return toPage(await query.execute(), q.limit);
    },

    get(userId: UserId, id: string) {
      return active()
        .select(WISH_COLUMNS)
        .where('userId', '=', userId)
        .where('id', '=', id)
        .executeTakeFirst();
    },

    create(userId: UserId, wish: WishFields & { label: string; imageAssetId?: string | null }) {
      const values: Insertable<WishlistItems> = {
        ...withTaxonomy(wish),
        userId,
        label: wish.label,
        imageAssetId: wish.imageAssetId ?? null,
        sourceType: wish.sourceUrl ? 'url' : 'photo',
      };
      return db
        .insertInto('wishlistItems')
        .values(values)
        .returning(WISH_COLUMNS)
        .executeTakeFirstOrThrow();
    },

    async update(userId: UserId, id: string, fields: WishFields) {
      const values = withTaxonomy(fields);
      if (Object.keys(values).length === 0) return this.get(userId, id);
      return db
        .updateTable('wishlistItems')
        .set(values)
        .where('userId', '=', userId)
        .where('id', '=', id)
        .where('deletedAt', 'is', null)
        .where('promotedItemId', 'is', null)
        .returning(WISH_COLUMNS)
        .executeTakeFirst();
    },

    async remove(userId: UserId, id: string): Promise<boolean> {
      const res = await db
        .updateTable('wishlistItems')
        .set({ deletedAt: sql`now()` })
        .where('userId', '=', userId)
        .where('id', '=', id)
        .where('deletedAt', 'is', null)
        .where('promotedItemId', 'is', null)
        .executeTakeFirst();
      return res.numUpdatedRows > 0n;
    },

    restore(userId: UserId, id: string) {
      return db
        .updateTable('wishlistItems')
        .set({ deletedAt: null })
        .where('userId', '=', userId)
        .where('id', '=', id)
        .where('deletedAt', 'is not', null)
        .returning(WISH_COLUMNS)
        .executeTakeFirst();
    },

    // "I bought this": the wish becomes a piece in one transaction; the row lock makes a
    // double tap promote once.
    async promote(userId: UserId, id: string) {
      return db.transaction().execute(async (trx) => {
        const wish = await trx
          .selectFrom('wishlistItems')
          .selectAll()
          .where('userId', '=', userId)
          .where('id', '=', id)
          .where('deletedAt', 'is', null)
          .where('promotedItemId', 'is', null)
          .forUpdate()
          .executeTakeFirst();
        if (!wish) return undefined;
        const piece = await trx
          .insertInto('wardrobeItems')
          .values({
            userId,
            label: wish.label,
            category: wish.category,
            categoryL2: wish.categoryL2,
            categoryL3: wish.categoryL3,
            color: wish.color,
            colourShade: wish.colourShade,
            colourExtra: wish.colourExtra,
            print: wish.print,
            brand: wish.brand,
            notes: wish.note,
            imageAssetId: wish.imageAssetId,
            price: wish.price,
            currency: wish.currency,
            size: wish.size,
            status: 'ready',
            acquiredVia: 'wishlist',
          })
          .returning(PIECE_COLUMNS)
          .executeTakeFirstOrThrow();
        await trx
          .updateTable('wishlistItems')
          .set({ promotedItemId: piece.id })
          .where('userId', '=', userId)
          .where('id', '=', id)
          .execute();
        return piece;
      });
    },
  };
}
