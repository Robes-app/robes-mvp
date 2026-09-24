import { sql, type Transaction } from 'kysely';
import type { Db } from '../client';
import type { DB } from '../database.types';
import type { UserId } from '../ids';
import { afterCursor, createdMs, toPage } from './paging';
import { PIECE_COLUMNS } from './wardrobe';

const LOOK_COLUMNS = [
  'id',
  'name',
  'nameProvisional',
  'note',
  'source',
  'originLookId',
  'climateBand',
  'renderAssetId',
  'createdAt',
  'updatedAt',
] as const;

export type LookRole = 'canvas' | 'anchor' | 'texture' | 'exclamation';
export interface LookPieceInput {
  pieceId: string;
  slot?: string | null | undefined;
  role?: LookRole | null | undefined;
}

export interface LookFields {
  // A name she typed; Robes' suggestion stays provisional until she accepts it (M4 task 6).
  name?: string | undefined;
  note?: string | null | undefined;
  climateBand?: 'spring_summer' | 'autumn_winter' | 'year_round' | undefined;
}

export class LookPiecesNotFound extends Error {
  constructor() {
    super('look references pieces the user does not own');
  }
}

// Wear dates are calendar days: read as text so no timezone can move them.
const wornOnText = sql<string>`worn_on::text`;

export function looksRepo(db: Db) {
  const active = () => db.selectFrom('looks').where('deletedAt', 'is', null);

  async function writePieces(
    trx: Transaction<DB>,
    userId: UserId,
    lookId: string,
    pieces: readonly LookPieceInput[],
  ): Promise<void> {
    const ids = [...new Set(pieces.map((p) => p.pieceId))];
    if (ids.length !== pieces.length) throw new LookPiecesNotFound();
    if (ids.length > 0) {
      const owned = await trx
        .selectFrom('wardrobeItems')
        .select('id')
        .where('userId', '=', userId)
        .where('id', 'in', ids)
        .where('deletedAt', 'is', null)
        .execute();
      if (owned.length !== ids.length) throw new LookPiecesNotFound();
    }
    await trx
      .deleteFrom('lookPieces')
      .where('userId', '=', userId)
      .where('lookId', '=', lookId)
      .execute();
    if (pieces.length === 0) return;
    await trx
      .insertInto('lookPieces')
      .values(
        pieces.map((p, position) => ({
          lookId,
          userId,
          wardrobeItemId: p.pieceId,
          slot: p.slot ?? null,
          role: p.role ?? null,
          position,
        })),
      )
      .execute();
  }

  return {
    async list(userId: UserId, q: { limit: number; cursor?: string | undefined }) {
      let query = active()
        .select(LOOK_COLUMNS)
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
        .select(LOOK_COLUMNS)
        .where('userId', '=', userId)
        .where('id', '=', id)
        .executeTakeFirst();
    },

    async count(userId: UserId): Promise<number> {
      const row = await active()
        .select((eb) => eb.fn.countAll<string>().as('n'))
        .where('userId', '=', userId)
        .executeTakeFirst();
      return Number(row?.n ?? 0);
    },

    getMany(userId: UserId, ids: readonly string[]) {
      if (ids.length === 0) return Promise.resolve([]);
      return active()
        .select(LOOK_COLUMNS)
        .where('userId', '=', userId)
        .where('id', 'in', [...ids])
        .execute();
    },

    // Pieces for many looks at once, in look order; deleted pieces drop out of the look.
    piecesFor(userId: UserId, lookIds: readonly string[]) {
      if (lookIds.length === 0) return Promise.resolve([]);
      return db
        .selectFrom('lookPieces as lp')
        .innerJoin('wardrobeItems as w', (j) =>
          j.onRef('w.id', '=', 'lp.wardrobeItemId').onRef('w.userId', '=', 'lp.userId'),
        )
        .select(['lp.lookId', 'lp.slot', 'lp.role', 'lp.position'])
        .select(PIECE_COLUMNS.map((c) => `w.${c}` as const))
        .where('lp.userId', '=', userId)
        .where('lp.lookId', 'in', [...lookIds])
        .where('w.deletedAt', 'is', null)
        .orderBy('lp.lookId')
        .orderBy('lp.position')
        .execute();
    },

    // Wear counts per look (times worn, last worn day).
    async wearStats(userId: UserId, lookIds: readonly string[]) {
      if (lookIds.length === 0) return [];
      return db
        .selectFrom('wears')
        .select((eb) => [
          'lookId',
          eb.fn.countAll<string>().as('timesWorn'),
          sql<string | null>`max(worn_on)::text`.as('lastWornOn'),
        ])
        .where('userId', '=', userId)
        .where('lookId', 'in', [...lookIds])
        .groupBy('lookId')
        .execute();
    },

    async create(
      userId: UserId,
      look: LookFields & {
        name: string;
        nameProvisional: boolean;
        pieces: readonly LookPieceInput[];
        source?: 'manual' | 'variant' | 'generated' | 'today';
        originLookId?: string | null;
        renderAssetId?: string | null;
      },
    ) {
      return db.transaction().execute(async (trx) => {
        const row = await trx
          .insertInto('looks')
          .values({
            userId,
            name: look.name,
            nameProvisional: look.nameProvisional,
            note: look.note ?? null,
            climateBand: look.climateBand ?? 'year_round',
            climateSource: look.climateBand ? 'user' : 'derived',
            source: look.source ?? 'manual',
            originLookId: look.originLookId ?? null,
            renderAssetId: look.renderAssetId ?? null,
          })
          .returning(LOOK_COLUMNS)
          .executeTakeFirstOrThrow();
        await writePieces(trx, userId, row.id, look.pieces);
        return row;
      });
    },

    // Edits in place ("Update"); pieces, when given, replace the whole set atomically.
    async update(
      userId: UserId,
      id: string,
      fields: LookFields & { pieces?: readonly LookPieceInput[] | undefined },
    ) {
      return db.transaction().execute(async (trx) => {
        const row = await trx
          .updateTable('looks')
          .set({
            ...(fields.name !== undefined ? { name: fields.name, nameProvisional: false } : {}),
            ...(fields.note !== undefined ? { note: fields.note } : {}),
            ...(fields.climateBand !== undefined
              ? { climateBand: fields.climateBand, climateSource: 'user' }
              : {}),
            updatedAt: sql`now()`,
          })
          .where('userId', '=', userId)
          .where('id', '=', id)
          .where('deletedAt', 'is', null)
          .returning(LOOK_COLUMNS)
          .executeTakeFirst();
        if (!row) return undefined;
        if (fields.pieces) await writePieces(trx, userId, id, fields.pieces);
        return row;
      });
    },

    async remove(userId: UserId, id: string): Promise<boolean> {
      const res = await db
        .updateTable('looks')
        .set({ deletedAt: sql`now()` })
        .where('userId', '=', userId)
        .where('id', '=', id)
        .where('deletedAt', 'is', null)
        .executeTakeFirst();
      return res.numUpdatedRows > 0n;
    },

    restore(userId: UserId, id: string) {
      return db
        .updateTable('looks')
        .set({ deletedAt: null })
        .where('userId', '=', userId)
        .where('id', '=', id)
        .where('deletedAt', 'is not', null)
        .returning(LOOK_COLUMNS)
        .executeTakeFirst();
    },

    // Wears are immutable facts: one per look per day; a repeat returns the existing one.
    async wear(userId: UserId, lookId: string, wornOn: string) {
      return db.transaction().execute(async (trx) => {
        const look = await trx
          .selectFrom('looks')
          .select('id')
          .where('userId', '=', userId)
          .where('id', '=', lookId)
          .where('deletedAt', 'is', null)
          .executeTakeFirst();
        if (!look) return undefined;
        const pieces = await trx
          .selectFrom('lookPieces')
          .select('wardrobeItemId')
          .where('userId', '=', userId)
          .where('lookId', '=', lookId)
          .orderBy('position')
          .execute();
        await trx
          .insertInto('wears')
          .values({
            userId,
            lookId,
            wornOn,
            pieceIds: pieces.map((p) => p.wardrobeItemId),
            source: 'looks',
          })
          .onConflict((oc) => oc.columns(['userId', 'lookId', 'wornOn']).doNothing())
          .execute();
        return trx
          .selectFrom('wears')
          .select(['id', 'lookId', 'pieceIds', 'confirmedAt', wornOnText.as('wornOn')])
          .where('userId', '=', userId)
          .where('lookId', '=', lookId)
          .where('wornOn', '=', sql<Date>`${wornOn}::date`)
          .executeTakeFirstOrThrow();
      });
    },

    // Looks she recorded wearing on a calendar day.
    async wornOn(userId: UserId, day: string): Promise<string[]> {
      const rows = await db
        .selectFrom('wears')
        .select('lookId')
        .where('userId', '=', userId)
        .where('wornOn', '=', sql<Date>`${day}::date`)
        .execute();
      return rows.map((r) => r.lookId);
    },

    async unwear(userId: UserId, lookId: string, wornOn: string): Promise<boolean> {
      const res = await db
        .deleteFrom('wears')
        .where('userId', '=', userId)
        .where('lookId', '=', lookId)
        .where('wornOn', '=', sql<Date>`${wornOn}::date`)
        .executeTakeFirst();
      return res.numDeletedRows > 0n;
    },
  };
}
