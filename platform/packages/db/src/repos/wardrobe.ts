import { resolveTaxonomy, type SeasonBand } from '@robes/core';
import { familyShadeIds, shade, shadeByName } from '@robes/core/colour';
import { type Insertable, type Kysely, sql, type Transaction, type Updateable } from 'kysely';
import type { Db } from '../client';
import type { DB, WardrobeItems } from '../database.types';
import { HeroRackFull } from '../errors';
import type { UserId } from '../ids';
import { afterCursor, createdMs, toPage } from './paging';

export const PIECE_COLUMNS = [
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
  colourShade?: string | null;
  colourExtra?: string[];
  print?: string | null;
  brand?: string | null;
  notes?: string | null;
  seasonBand?: SeasonBand;
  price?: number | null;
  currency?: string | null;
  size?: string | null;
}

export interface ReadPieceRow {
  sourceIndex: number;
  label: string;
  category: string;
  categoryL2: string | null;
  categoryL3: string | null;
  color: string | null;
  brand: string | null;
  notes: string | null;
  price: number | null;
  currency: string | null;
  size: string | null;
  itemDna: Record<string, unknown>;
  imageAssetId: string | null;
  // Set when she chose it on the single-piece screen.
  seasonBand?: SeasonBand | undefined;
}

export interface ListPiecesQuery {
  limit: number;
  // Opaque cursor from the previous page: `${createdAt ISO}|${id}`.
  cursor?: string | undefined;
  category?: string | undefined;
  categoryL2?: string | undefined;
  seasonBand?: SeasonBand | undefined;
  colourFamily?: string | undefined;
}

export const HERO_RACK_SIZE = 10;

// What a piece edit does to the Hero Rack: an explicit place, a star on (first free place) or off.
export interface HeroChange {
  position?: number | null | undefined;
  star?: boolean | undefined;
}

// Places a piece at a rack position (1..10) or takes it off (null), shifting nobody silently.
async function placeHero(
  q: Kysely<DB> | Transaction<DB>,
  userId: UserId,
  id: string,
  position: number | null,
): Promise<void> {
  if (position !== null) {
    await q
      .updateTable('wardrobeItems')
      .set({ heroPosition: null })
      .where('userId', '=', userId)
      .where('heroPosition', '=', position)
      .execute();
  }
  await q
    .updateTable('wardrobeItems')
    .set({ heroPosition: position })
    .where('userId', '=', userId)
    .where('id', '=', id)
    .where('deletedAt', 'is', null)
    .execute();
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
  // `color` stays the shade's display name, so every reader of the plain word agrees with it.
  if (fields.colourShade) out.color = shade(fields.colourShade)?.name ?? fields.color ?? null;
  return out;
}

// Her colour answers Robes' "check it" flag.
function colourChecked(fields: PieceFields) {
  return fields.colourShade === undefined
    ? {}
    : { itemDna: sql<string>`item_dna - 'colour_check'` };
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
      // Refine by colour family: the pieces whose shade sits in it (an unknown family matches none).
      if (q.colourFamily) {
        query = query.where('colourShade', 'in', [...familyShadeIds(q.colourFamily), '']);
      }
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
        acquiredVia?: 'photo' | 'onboarding' | 'wishlist' | 'url' | 'receipt';
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

    // Pieces filed from a photo read: one per (photo, piece index), so a retried filing returns
    // the pieces already made instead of filing them twice.
    async createFromRead(userId: UserId, sourceAssetId: string, pieces: readonly ReadPieceRow[]) {
      if (pieces.length === 0) return [];
      return db.transaction().execute(async (trx) => {
        await trx
          .insertInto('wardrobeItems')
          .values(
            pieces.map((p): Insertable<WardrobeItems> => {
              const tax = p.categoryL2 ? resolveTaxonomy(p.categoryL2, p.categoryL3) : null;
              return {
                userId,
                label: p.label,
                category: tax?.category ?? p.category,
                categoryL2: tax?.categoryL2 ?? null,
                categoryL3: tax?.categoryL3 ?? null,
                color: p.color,
                colourShade: shadeByName(p.color)?.id ?? null,
                brand: p.brand,
                notes: p.notes,
                price: p.price,
                currency: p.currency,
                size: p.size,
                itemDna: JSON.stringify(p.itemDna),
                imageAssetId: p.imageAssetId,
                status: 'ready',
                acquiredVia: 'photo',
                sourceAssetId,
                sourceIndex: p.sourceIndex,
                ...(p.seasonBand ? { seasonBand: p.seasonBand, seasonSource: 'user' } : {}),
              };
            }),
          )
          .onConflict((oc) =>
            oc
              .columns(['userId', 'sourceAssetId', 'sourceIndex'])
              .where('sourceAssetId', 'is not', null)
              .where('deletedAt', 'is', null)
              .doNothing(),
          )
          .execute();
        return trx
          .selectFrom('wardrobeItems')
          .select([...PIECE_COLUMNS, 'sourceIndex'])
          .where('userId', '=', userId)
          .where('sourceAssetId', '=', sourceAssetId)
          .where(
            'sourceIndex',
            'in',
            pieces.map((p) => p.sourceIndex),
          )
          .where('deletedAt', 'is', null)
          .execute();
      });
    },

    // A piece she owns, photographed for the first time, takes the crop; one with a photo keeps it.
    async adoptPhoto(userId: UserId, id: string, assetId: string): Promise<boolean> {
      const res = await db
        .updateTable('wardrobeItems')
        .set({ imageAssetId: assetId })
        .where('userId', '=', userId)
        .where('id', '=', id)
        .where('imageAssetId', 'is', null)
        .where('deletedAt', 'is', null)
        .executeTakeFirst();
      return res.numUpdatedRows > 0n;
    },

    async update(userId: UserId, id: string, fields: PieceFields) {
      const values = withTaxonomy(fields);
      if (Object.keys(values).length === 0) return this.get(userId, id);
      return db
        .updateTable('wardrobeItems')
        .set(values)
        .set(colourChecked(fields))
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
        await placeHero(trx, userId, id, position);
        return trx
          .selectFrom('wardrobeItems')
          .select(PIECE_COLUMNS)
          .where('userId', '=', userId)
          .where('id', '=', id)
          .where('deletedAt', 'is', null)
          .executeTakeFirst();
      });
    },

    // Her edit and its rack change in one transaction: a full rack (HeroRackFull) writes nothing.
    async edit(userId: UserId, id: string, fields: PieceFields, hero: HeroChange = {}) {
      return db.transaction().execute(async (trx) => {
        const current = await trx
          .selectFrom('wardrobeItems')
          .select(['id', 'heroPosition'])
          .where('userId', '=', userId)
          .where('id', '=', id)
          .where('deletedAt', 'is', null)
          .forUpdate()
          .executeTakeFirst();
        if (!current) return undefined;
        let position = hero.position;
        if (position === undefined && hero.star === false) position = null;
        if (position === undefined && hero.star === true && current.heroPosition === null) {
          // Locks her rack so two stars at once can't take the same place.
          const taken = await trx
            .selectFrom('wardrobeItems')
            .select('heroPosition')
            .where('userId', '=', userId)
            .where('deletedAt', 'is', null)
            .where('heroPosition', 'is not', null)
            .forUpdate()
            .execute();
          const used = new Set(taken.map((r) => r.heroPosition));
          position = null;
          for (let p = 1; p <= HERO_RACK_SIZE && position === null; p++) {
            if (!used.has(p)) position = p;
          }
          if (position === null) throw new HeroRackFull();
        }
        const values = withTaxonomy(fields);
        if (Object.keys(values).length > 0) {
          await trx
            .updateTable('wardrobeItems')
            .set(values)
            .set(colourChecked(fields))
            .where('userId', '=', userId)
            .where('id', '=', id)
            .execute();
        }
        if (position !== undefined) await placeHero(trx, userId, id, position);
        return trx
          .selectFrom('wardrobeItems')
          .select(PIECE_COLUMNS)
          .where('userId', '=', userId)
          .where('id', '=', id)
          .executeTakeFirstOrThrow();
      });
    },

    // The Hero Rack's first free position (1–10), or null when all ten are taken.
    async nextHeroPosition(userId: UserId): Promise<number | null> {
      const taken = await active()
        .select('heroPosition')
        .where('userId', '=', userId)
        .where('heroPosition', 'is not', null)
        .execute();
      const used = new Set(taken.map((r) => r.heroPosition));
      for (let p = 1; p <= HERO_RACK_SIZE; p++) if (!used.has(p)) return p;
      return null;
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

    // Pieces Robes has finished reading (the ladder counts these, not ones still "reading").
    // Pieces with a photograph (the home's wardrobe step), newest first, with the count.
    async photographed(userId: UserId, limit = 60) {
      const base = active()
        .where('userId', '=', userId)
        .where('status', '=', 'ready')
        .where('imageAssetId', 'is not', null);
      const [rows, total] = await Promise.all([
        base
          .select(['id', 'label', 'brand', 'imageAssetId', 'heroPosition', 'createdAt'])
          .orderBy(createdMs, 'desc')
          .orderBy('id', 'desc')
          .limit(limit)
          .execute(),
        base.select((eb) => eb.fn.countAll<string>().as('n')).executeTakeFirst(),
      ]);
      return { rows, total: Number(total?.n ?? 0) };
    },

    async countReady(userId: UserId): Promise<number> {
      const row = await active()
        .select((eb) => eb.fn.countAll<string>().as('n'))
        .where('userId', '=', userId)
        .where('status', '=', 'ready')
        .executeTakeFirst();
      return Number(row?.n ?? 0);
    },

    async count(userId: UserId): Promise<number> {
      const row = await active()
        .select((eb) => eb.fn.countAll<string>().as('n'))
        .where('userId', '=', userId)
        .executeTakeFirst();
      return Number(row?.n ?? 0);
    },

    // The wardrobe's count row: every piece matching the same filters as `list`.
    async countMatching(userId: UserId, q: Omit<ListPiecesQuery, 'limit' | 'cursor'>) {
      let query = active()
        .select((eb) => eb.fn.countAll<string>().as('n'))
        .where('userId', '=', userId);
      if (q.category) query = query.where('category', '=', q.category);
      if (q.categoryL2) query = query.where('categoryL2', '=', q.categoryL2);
      if (q.seasonBand) query = query.where('seasonBand', '=', q.seasonBand);
      // Refine by colour family: the pieces whose shade sits in it (an unknown family matches none).
      if (q.colourFamily) {
        query = query.where('colourShade', 'in', [...familyShadeIds(q.colourFamily), '']);
      }
      const row = await query.executeTakeFirst();
      return Number(row?.n ?? 0);
    },

    // The category tabs: how many pieces she has in each category.
    async categoryCounts(userId: UserId): Promise<{ category: string; count: number }[]> {
      const rows = await active()
        .select(['category', (eb) => eb.fn.countAll<string>().as('n')])
        .where('userId', '=', userId)
        .groupBy('category')
        .execute();
      return rows.map((r) => ({ category: r.category, count: Number(r.n) }));
    },

    // One piece's record, newest first: the day it was on her and the look she wore it in. The
    // wear's own snapshot decides membership, so a piece dropped from a look keeps its days.
    async wears(userId: UserId, pieceId: string) {
      const rows = await sql<{
        id: string;
        wornOn: string;
        lookId: string | null;
        lookName: string | null;
      }>`
        select w.id, w.worn_on::text as worn_on, l.id as look_id, l.name as look_name
        from app.wears w
        left join app.looks l on l.id = w.look_id and l.user_id = w.user_id
        where w.user_id = ${userId} and ${pieceId}::uuid = any(w.piece_ids)
        order by w.worn_on desc
        limit 200`.execute(db);
      return rows.rows;
    },

    // Times each piece was worn (a wear records the pieces of the look that day).
    async wearCounts(userId: UserId, pieceIds: readonly string[]): Promise<Map<string, number>> {
      if (pieceIds.length === 0) return new Map();
      const rows = await sql<{ pieceId: string; n: string }>`
        select p.id as piece_id, count(*) as n
        from app.wears w cross join lateral unnest(w.piece_ids) as p(id)
        where w.user_id = ${userId} and p.id = any(${sql.val([...pieceIds])}::uuid[])
        group by p.id`.execute(db);
      return new Map(rows.rows.map((r) => [r.pieceId, Number(r.n)]));
    },
  };
}
