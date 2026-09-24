import { resolveTaxonomy, type SeasonBand } from '@robes/core';
import { type Insertable, sql, type Updateable } from 'kysely';
import type { Db } from '../client';
import type { WardrobeItems } from '../database.types';
import type { UserId } from '../ids';
import { afterCursor, createdMs, toPage } from './paging';

export const PIECE_COLUMNS = [
  'id',
  'label',
  'category',
  'categoryL2',
  'categoryL3',
  'color',
  'brand',
  'notes',
  'imageAssetId',
  'cutoutAssetId',
  'itemDna',
  'status',
  'heroPosition',
  'seasonBand',
  'seasonSource',
  'price',
  'currency',
  'size',
  'acquiredVia',
  'createdAt',
  'updatedAt',
] as const;

export interface PieceFields {
  label?: string;
  categoryL2?: string | null;
  categoryL3?: string | null;
  color?: string | null;
  brand?: string | null;
  notes?: string | null;
  seasonBand?: SeasonBand;
  price?: number | null;
  currency?: string | null;
  size?: string | null;
}

export interface ListPiecesQuery {
  limit: number;
  // Opaque cursor from the previous page: `${createdAt ISO}|${id}`.
  cursor?: string | undefined;
  category?: string | undefined;
  categoryL2?: string | undefined;
  seasonBand?: SeasonBand | undefined;
}

// The taxonomy decides the legacy category so category and L2 can never disagree.
type PieceColumns = Updateable<WardrobeItems>;

function withTaxonomy(fields: PieceFields): PieceColumns {
  const out: PieceColumns = { ...fields };
  if (fields.categoryL2 !== undefined) {
    const tax = fields.categoryL2 ? resolveTaxonomy(fields.categoryL2, fields.categoryL3) : null;
    out.category = tax?.category ?? 'Other';
    out.categoryL2 = tax?.categoryL2 ?? null;
    out.categoryL3 = tax?.categoryL3 ?? null;
  }
  if (fields.seasonBand !== undefined) out.seasonSource = 'user';
  return out;
}

export function wardrobeRepo(db: Db) {
  const active = () => db.selectFrom('wardrobeItems').where('deletedAt', 'is', null);

  return {
    async list(userId: UserId, q: ListPiecesQuery) {
      let query = active()
        .select(PIECE_COLUMNS)
        .where('userId', '=', userId)
        .orderBy(createdMs, 'desc')
        .orderBy('id', 'desc')
        .limit(q.limit + 1);
      if (q.category) query = query.where('category', '=', q.category);
      if (q.categoryL2) query = query.where('categoryL2', '=', q.categoryL2);
      if (q.seasonBand) query = query.where('seasonBand', '=', q.seasonBand);
      const after = afterCursor(q.cursor);
      if (after) query = query.where(after);
      return toPage(await query.execute(), q.limit);
    },

    get(userId: UserId, id: string) {
      return active()
        .select(PIECE_COLUMNS)
        .where('userId', '=', userId)
        .where('id', '=', id)
        .executeTakeFirst();
    },

    async create(
      userId: UserId,
      piece: PieceFields & {
        label: string;
        imageAssetId?: string | null;
        status?: 'reading' | 'ready';
        acquiredVia?: 'photo' | 'onboarding' | 'wishlist';
      },
    ) {
      const values: Insertable<WardrobeItems> = {
        ...withTaxonomy(piece),
        userId,
        label: piece.label,
        imageAssetId: piece.imageAssetId ?? null,
        status: piece.status ?? 'ready',
        acquiredVia: piece.acquiredVia ?? 'photo',
      };
      return db
        .insertInto('wardrobeItems')
        .values(values)
        .returning(PIECE_COLUMNS)
        .executeTakeFirstOrThrow();
    },

    async update(userId: UserId, id: string, fields: PieceFields) {
      const values = withTaxonomy(fields);
      if (Object.keys(values).length === 0) return this.get(userId, id);
      return db
        .updateTable('wardrobeItems')
        .set(values)
        .where('userId', '=', userId)
        .where('id', '=', id)
        .where('deletedAt', 'is', null)
        .returning(PIECE_COLUMNS)
        .executeTakeFirst();
    },

    // Soft delete (UX-15): undone by restore; purged after 30 days by maintenance.
    async remove(userId: UserId, id: string): Promise<boolean> {
      const res = await db
        .updateTable('wardrobeItems')
        .set({ deletedAt: sql`now()`, heroPosition: null })
        .where('userId', '=', userId)
        .where('id', '=', id)
        .where('deletedAt', 'is', null)
        .executeTakeFirst();
      return res.numUpdatedRows > 0n;
    },

    async restore(userId: UserId, id: string) {
      return db
        .updateTable('wardrobeItems')
        .set({ deletedAt: null })
        .where('userId', '=', userId)
        .where('id', '=', id)
        .where('deletedAt', 'is not', null)
        .returning(PIECE_COLUMNS)
        .executeTakeFirst();
    },

    // Places a piece in the top ten (1..10) or removes it (null), shifting nobody silently.
    async setHero(userId: UserId, id: string, position: number | null) {
      return db.transaction().execute(async (trx) => {
        if (position !== null) {
          await trx
            .updateTable('wardrobeItems')
            .set({ heroPosition: null })
            .where('userId', '=', userId)
            .where('heroPosition', '=', position)
            .execute();
        }
        return trx
          .updateTable('wardrobeItems')
          .set({ heroPosition: position })
          .where('userId', '=', userId)
          .where('id', '=', id)
          .where('deletedAt', 'is', null)
          .returning(PIECE_COLUMNS)
          .executeTakeFirst();
      });
    },

    // Batch idempotency: pieces already made from these photos.
    byImageAssets(userId: UserId, assetIds: readonly string[]) {
      if (assetIds.length === 0) return Promise.resolve([]);
      return active()
        .select(PIECE_COLUMNS)
        .where('userId', '=', userId)
        .where('imageAssetId', 'in', [...assetIds])
        .execute();
    },

    async count(userId: UserId): Promise<number> {
      const row = await active()
        .select((eb) => eb.fn.countAll<string>().as('n'))
        .where('userId', '=', userId)
        .executeTakeFirst();
      return Number(row?.n ?? 0);
    },
  };
}
