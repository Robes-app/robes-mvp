import { resolveTaxonomy, type SeasonBand } from '@robes/core';
import { familyShadeIds, shade, shadeByName } from '@robes/core/colour';
import {
  type ExpressionBuilder,
  type Insertable,
  type Kysely,
  sql,
  type Transaction,
  type Updateable,
} from 'kysely';
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
  'material',
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
  material?: string | null;
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
  // Her answers from Review's colour and material rows (undefined = Robes' read stands).
  colourShade?: string | null | undefined;
  colourExtra?: string[] | undefined;
  print?: string | null | undefined;
  material?: string | null | undefined;
}

export interface ListPiecesQuery {
  limit: number;
  // Opaque cursor from the previous page: `${createdAt ISO}|${id}`.
  cursor?: string | undefined;
  category?: string | undefined;
  categoryL2?: string | undefined;
  seasonBand?: SeasonBand | undefined;
  colourFamily?: string | undefined;
  wearFor?: string | undefined;
  brand?: string | undefined;
}

export type PieceFilters = Omit<ListPiecesQuery, 'limit' | 'cursor'>;
// The band in season: in-season heroes lead the list (`seasonBandOn` in @robes/core/wardrobe).
export type LeadBand = Exclude<SeasonBand, 'year_round'>;

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

// Her answer clears Robes' "check it" flag on that field: a colour, or a material ("Not sure"
// included — she has looked at it).
function checksAnswered(fields: PieceFields) {
  const keys = [
    ...(fields.colourShade === undefined ? [] : ['colour_check']),
    ...(fields.material === undefined ? [] : ['material_check']),
  ];
  return keys.length === 0 ? {} : { itemDna: sql<string>`item_dna - ${sql.val(keys)}::text[]` };
}

const WEAR_TAG_MAX = 6;

export function wardrobeRepo(db: Db) {
  const active = () => db.selectFrom('wardrobeItems').where('deletedAt', 'is', null);

  // Her live pieces under the wardrobe's filters: one place for the list and its count row.
  const matching = (userId: UserId, q: PieceFilters) => {
    let query = active().where('userId', '=', userId);
    if (q.category) query = query.where('category', '=', q.category);
    if (q.categoryL2) query = query.where('categoryL2', '=', q.categoryL2);
    if (q.seasonBand) query = query.where('seasonBand', '=', q.seasonBand);
    // Refine by colour family: the pieces whose shade sits in it (an unknown family matches none).
    if (q.colourFamily) {
      query = query.where('colourShade', 'in', [...familyShadeIds(q.colourFamily), '']);
    }
    // Refine by brand (case-insensitive) and by what she wears it for (a wear_for tag of hers).
    if (q.brand) query = query.where(sql<boolean>`lower(brand) = lower(${q.brand})`);
    const { wearFor } = q;
    if (wearFor) {
      query = query.where((eb) =>
        eb.exists(
          eb
            .selectFrom('tagPieces')
            .innerJoin('tags', (j) =>
              j
                .onRef('tags.id', '=', 'tagPieces.tagId')
                .onRef('tags.userId', '=', 'tagPieces.userId'),
            )
            .select('tagPieces.wardrobeItemId')
            .whereRef('tagPieces.wardrobeItemId', '=', 'wardrobeItems.id')
            .where('tagPieces.userId', '=', userId)
            .where('tags.kind', '=', 'wear_for')
            .where(sql<boolean>`lower(tags.label) = lower(${wearFor})`),
        ),
      );
    }
    return query;
  };

  return {
    // Newest first. On the first page, her in-season heroes lead in rack order (beta _waRender):
    // a hero whose band is `leadBand` or year-round. Off-season heroes keep their place. The lead
    // rides on top of the page's `limit` (the rack holds at most HERO_RACK_SIZE), so the keyset
    // cursor only ever walks the rest.
    async list(userId: UserId, q: ListPiecesQuery, leadBand?: LeadBand) {
      const inSeasonHero = (eb: ExpressionBuilder<DB, 'wardrobeItems'>) =>
        eb.and([
          eb('heroPosition', 'is not', null),
          eb('seasonBand', 'in', [leadBand ?? 'year_round', 'year_round']),
        ]);
      let rest = matching(userId, q)
        .select(PIECE_COLUMNS)
        .orderBy(createdMs, 'desc')
        .orderBy('id', 'desc')
        .limit(q.limit + 1);
      if (leadBand) rest = rest.where((eb) => eb.not(inSeasonHero(eb)));
      const after = afterCursor(q.cursor);
      if (after) rest = rest.where(after);
      const page = toPage(await rest.execute(), q.limit);
      if (!leadBand || q.cursor) return page;
      const lead = await matching(userId, q)
        .select(PIECE_COLUMNS)
        .where(inSeasonHero)
        .orderBy('heroPosition')
        .execute();
      return { items: [...lead, ...page.items], nextCursor: page.nextCursor };
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
                color: p.colourShade ? (shade(p.colourShade)?.name ?? p.color) : p.color,
                colourShade:
                  p.colourShade !== undefined ? p.colourShade : (shadeByName(p.color)?.id ?? null),
                ...(p.colourExtra !== undefined ? { colourExtra: p.colourExtra } : {}),
                ...(p.print !== undefined ? { print: p.print } : {}),
                ...(p.material !== undefined ? { material: p.material } : {}),
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

    // Change photo: her photograph replaces the piece's, whatever it had. The composite FK keeps
    // the asset hers; the caller checks its kind.
    async setPhoto(userId: UserId, id: string, assetId: string): Promise<boolean> {
      const res = await db
        .updateTable('wardrobeItems')
        .set({ imageAssetId: assetId })
        .where('userId', '=', userId)
        .where('id', '=', id)
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
        .set(checksAnswered(fields))
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
            .set(checksAnswered(fields))
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
    async countMatching(userId: UserId, q: PieceFilters) {
      const row = await matching(userId, q)
        .select((eb) => eb.fn.countAll<string>().as('n'))
        .executeTakeFirst();
      return Number(row?.n ?? 0);
    },

    // The Filter's brand choices: every brand on her pieces, once, in alphabetical order.
    async brands(userId: UserId): Promise<string[]> {
      const rows = await active()
        .select('brand')
        .distinct()
        .where('userId', '=', userId)
        .where('brand', 'is not', null)
        .where('brand', '!=', '')
        .orderBy('brand')
        .execute();
      return rows.flatMap((r) => (r.brand ? [r.brand] : []));
    },

    // The Filter's "Wear it for" choices: the wear_for labels on her pieces.
    async wearLabels(userId: UserId): Promise<string[]> {
      const rows = await db
        .selectFrom('tagPieces')
        .innerJoin('tags', (j) =>
          j.onRef('tags.id', '=', 'tagPieces.tagId').onRef('tags.userId', '=', 'tagPieces.userId'),
        )
        .innerJoin('wardrobeItems', 'wardrobeItems.id', 'tagPieces.wardrobeItemId')
        .select('tags.label')
        .distinct()
        .where('tagPieces.userId', '=', userId)
        .where('tags.kind', '=', 'wear_for')
        .where('wardrobeItems.deletedAt', 'is', null)
        .orderBy('tags.label')
        .execute();
      return rows.map((r) => r.label);
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

    // What each piece is worn for (app.tag_pieces, kind wear_for). The trigger seeds these from
    // the category when a piece is filed; her own picks replace them.
    async wearTags(userId: UserId, pieceIds: readonly string[]): Promise<Map<string, string[]>> {
      if (pieceIds.length === 0) return new Map();
      const rows = await db
        .selectFrom('tagPieces')
        .innerJoin('tags', (j) =>
          j.onRef('tags.id', '=', 'tagPieces.tagId').onRef('tags.userId', '=', 'tagPieces.userId'),
        )
        .select(['tagPieces.wardrobeItemId as pieceId', 'tags.label'])
        .where('tagPieces.userId', '=', userId)
        .where('tags.kind', '=', 'wear_for')
        .where('tagPieces.wardrobeItemId', 'in', [...pieceIds])
        .orderBy('tags.label')
        .execute();
      const out = new Map<string, string[]>();
      for (const r of rows) out.set(r.pieceId, [...(out.get(r.pieceId) ?? []), r.label]);
      return out;
    },

    // Her answer replaces whatever was inferred: the tags are minted if new, then this piece's
    // wear_for set is made to match exactly. The piece must be hers or nothing is written.
    async setWearTags(
      userId: UserId,
      pieceId: string,
      labels: readonly string[],
    ): Promise<boolean> {
      const clean = [...new Set(labels.map((l) => l.trim()).filter(Boolean))].slice(
        0,
        WEAR_TAG_MAX,
      );
      return db.transaction().execute(async (tx) => {
        const owns = await tx
          .selectFrom('wardrobeItems')
          .select('id')
          .where('userId', '=', userId)
          .where('id', '=', pieceId)
          .where('deletedAt', 'is', null)
          .executeTakeFirst();
        if (!owns) return false;
        const ids: string[] = [];
        for (const label of clean) {
          await tx
            .insertInto('tags')
            .values({ userId, kind: 'wear_for', label, isSeed: false })
            .onConflict((oc) => oc.columns(['userId', 'kind', 'slug']).doNothing())
            .execute();
          const tag = await tx
            .selectFrom('tags')
            .select('id')
            .where('userId', '=', userId)
            .where('kind', '=', 'wear_for')
            .where(sql`slug`, '=', sql`private.tag_slug(${label})`)
            .executeTakeFirst();
          if (tag) ids.push(tag.id);
        }
        // Everything this piece wore that she did not pick comes off, inferred or not.
        let drop = tx
          .deleteFrom('tagPieces')
          .where('userId', '=', userId)
          .where('wardrobeItemId', '=', pieceId);
        if (ids.length) drop = drop.where('tagId', 'not in', ids);
        await drop.execute();
        if (ids.length) {
          await tx
            .insertInto('tagPieces')
            .values(
              ids.map((tagId) => ({ userId, tagId, wardrobeItemId: pieceId, source: 'user' })),
            )
            .onConflict((oc) =>
              oc.columns(['tagId', 'wardrobeItemId']).doUpdateSet({ source: 'user' }),
            )
            .execute();
        }
        return true;
      });
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
