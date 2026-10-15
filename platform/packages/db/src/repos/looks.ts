import { type LookStatus, MAX_DRAFTS } from '@robes/core/looks';
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
  'renderStatus',
  'renderKey',
  'status',
  'anchorPieceId',
  'setId',
  'setIndex',
  'frameAssetId',
  'frameKey',
  'proposals',
  'styling',
  'edits',
  'photoAssetId',
  'createdAt',
  'updatedAt',
] as const;
// A calendar day: read as text so no timezone can move it (CLAUDE.md rule 23).
const DATE_HINT = sql<string | null>`date_hint::text`.as('dateHint');
const LOOK_SELECT = [...LOOK_COLUMNS, DATE_HINT] as const;

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
  // The pieces Robes proposes (not hers yet), how each row is worn, and a draft's working notes.
  proposals?: readonly Record<string, unknown>[] | null | undefined;
  styling?: Record<string, string> | null | undefined;
  edits?: Record<string, unknown> | null | undefined;
  dateHint?: string | null | undefined;
}

export class LookPiecesNotFound extends Error {
  constructor() {
    super('look references pieces the user does not own');
  }
}

// A sixth draft while five wait: she lets the oldest go, or keeps them.
export class DraftsFull extends Error {
  constructor() {
    super('drafts_full');
  }
}

const json = (v: unknown) => (v == null ? null : JSON.stringify(v));
const emptyToNull = (v: Record<string, unknown> | readonly unknown[] | null | undefined) =>
  v == null || (Array.isArray(v) ? v.length === 0 : Object.keys(v).length === 0) ? null : v;

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

  async function assertOwned(trx: Transaction<DB>, userId: UserId, ids: readonly string[]) {
    const owned = await trx
      .selectFrom('wardrobeItems')
      .select('id')
      .where('userId', '=', userId)
      .where('id', 'in', [...ids])
      .where('deletedAt', 'is', null)
      .execute();
    if (owned.length !== new Set(ids).size) throw new LookPiecesNotFound();
  }

  async function makeDraftRoom(trx: Transaction<DB>, userId: UserId, letGoOldest: boolean) {
    const drafts = await trx
      .selectFrom('looks')
      .select('id')
      .where('userId', '=', userId)
      .where('status', '=', 'draft')
      .where('deletedAt', 'is', null)
      .orderBy('createdAt')
      .forUpdate()
      .execute();
    if (drafts.length < MAX_DRAFTS) return;
    if (!letGoOldest) throw new DraftsFull();
    const extra = drafts.slice(0, drafts.length - MAX_DRAFTS + 1).map((d) => d.id);
    await trx
      .updateTable('looks')
      .set({ deletedAt: sql`now()` })
      .where('userId', '=', userId)
      .where('id', 'in', extra)
      .execute();
  }

  return {
    // One state at a time (saved by default): suggestions and drafts never reach saved readers.
    async list(
      userId: UserId,
      q: {
        limit: number;
        cursor?: string | undefined;
        status?: LookStatus | undefined;
        anchorPieceId?: string | undefined;
      },
    ) {
      let query = active()
        .select(LOOK_SELECT)
        .where('userId', '=', userId)
        .where('status', '=', q.status ?? 'saved')
        .orderBy(createdMs, 'desc')
        .orderBy('id', 'desc')
        .limit(q.limit + 1);
      const after = afterCursor(q.cursor);
      if (after) query = query.where(after);
      if (q.anchorPieceId) query = query.where('anchorPieceId', '=', q.anchorPieceId);
      return toPage(await query.execute(), q.limit);
    },

    get(userId: UserId, id: string) {
      return active()
        .select(LOOK_SELECT)
        .where('userId', '=', userId)
        .where('id', '=', id)
        .executeTakeFirst();
    },

    async count(userId: UserId, status: LookStatus = 'saved'): Promise<number> {
      const row = await active()
        .select((eb) => eb.fn.countAll<string>().as('n'))
        .where('userId', '=', userId)
        .where('status', '=', status)
        .executeTakeFirst();
      return Number(row?.n ?? 0);
    },

    // Rendered on her model: where it stands, for the look page and idempotent asks.
    renderState(userId: UserId, id: string) {
      return active()
        .select([
          'id',
          'renderKey',
          'renderStatus',
          'renderJobId',
          'renderAssetId',
          'renderClaimedAt',
        ])
        .where('userId', '=', userId)
        .where('id', '=', id)
        .executeTakeFirst();
    },

    // True when this call should start a render for `renderKey`: not already ready for that exact
    // model and rack, and not rendering right now (a claim older than 10 minutes is abandoned).
    async claimRender(userId: UserId, id: string, renderKey: string): Promise<boolean> {
      const res = await db
        .updateTable('looks')
        .set({
          renderStatus: 'pending',
          renderKey,
          renderJobId: null,
          renderClaimedAt: sql`now()`,
        })
        .where('userId', '=', userId)
        .where('id', '=', id)
        .where('deletedAt', 'is', null)
        // coalesce: a look never rendered has NULL status, and NOT (NULL) would match nothing.
        .where(
          sql<boolean>`not coalesce(
            (render_status = 'ready' and render_key = ${renderKey})
            or (render_status = 'pending' and render_claimed_at > now() - interval '10 minutes'),
            false
          )`,
        )
        .executeTakeFirst();
      return res.numUpdatedRows > 0n;
    },

    async setRenderJob(userId: UserId, id: string, jobId: string): Promise<void> {
      await db
        .updateTable('looks')
        .set({ renderJobId: jobId })
        .where('userId', '=', userId)
        .where('id', '=', id)
        .where('renderStatus', '=', 'pending')
        .execute();
    },

    // Nothing started: give the claim back so she can ask again.
    async releaseRender(userId: UserId, id: string): Promise<void> {
      await db
        .updateTable('looks')
        .set({ renderStatus: 'failed' })
        .where('userId', '=', userId)
        .where('id', '=', id)
        .where('renderStatus', '=', 'pending')
        .execute();
    },

    getMany(userId: UserId, ids: readonly string[]) {
      if (ids.length === 0) return Promise.resolve([]);
      return active()
        .select(LOOK_SELECT)
        .where('userId', '=', userId)
        .where('id', 'in', [...ids])
        .execute();
    },

    // A generation's looks (the keep-or-pass deck), in the order Robes wrote them.
    listSet(userId: UserId, setId: string) {
      return active()
        .select(LOOK_SELECT)
        .where('userId', '=', userId)
        .where('setId', '=', setId)
        .orderBy('setIndex')
        .orderBy('createdAt')
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
        // A draft is hers, unsaved; at most MAX_DRAFTS wait (letGoOldest makes room).
        status?: 'saved' | 'draft';
        letGoOldest?: boolean;
        anchorPieceId?: string | null;
        frameAssetId?: string | null;
        frameKey?: string | null;
        photoAssetId?: string | null;
      },
    ) {
      return db.transaction().execute(async (trx) => {
        const status = look.status ?? 'saved';
        if (status === 'draft') await makeDraftRoom(trx, userId, look.letGoOldest === true);
        if (look.anchorPieceId) await assertOwned(trx, userId, [look.anchorPieceId]);
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
            status,
            proposals: json(emptyToNull(look.proposals ?? null)),
            styling: json(emptyToNull(look.styling ?? null)),
            edits: status === 'saved' ? null : json(emptyToNull(look.edits ?? null)),
            dateHint: look.dateHint ?? null,
            anchorPieceId: look.anchorPieceId ?? null,
            frameAssetId: look.frameAssetId ?? null,
            frameKey: look.frameKey ?? null,
            photoAssetId: look.photoAssetId ?? null,
          })
          .returning(LOOK_SELECT)
          .executeTakeFirstOrThrow();
        await writePieces(trx, userId, row.id, look.pieces);
        return row;
      });
    },

    // Edits in place ("Update"); pieces, when given, replace the whole set atomically. A suggestion
    // becomes a draft the moment she changes its rack; a saved look never carries working notes.
    async update(
      userId: UserId,
      id: string,
      fields: LookFields & { pieces?: readonly LookPieceInput[] | undefined },
    ) {
      const rackChanged =
        fields.pieces !== undefined ||
        fields.proposals !== undefined ||
        fields.styling !== undefined;
      return db.transaction().execute(async (trx) => {
        const row = await trx
          .updateTable('looks')
          .set({
            ...(fields.name !== undefined ? { name: fields.name, nameProvisional: false } : {}),
            ...(fields.note !== undefined ? { note: fields.note } : {}),
            ...(fields.climateBand !== undefined
              ? { climateBand: fields.climateBand, climateSource: 'user' }
              : {}),
            ...(fields.proposals !== undefined
              ? { proposals: json(emptyToNull(fields.proposals)) }
              : {}),
            ...(fields.styling !== undefined ? { styling: json(emptyToNull(fields.styling)) } : {}),
            ...(fields.dateHint !== undefined ? { dateHint: fields.dateHint } : {}),
            ...(fields.edits !== undefined
              ? {
                  edits: sql`case when status = 'saved' then null else ${json(emptyToNull(fields.edits))}::jsonb end`,
                }
              : {}),
            ...(rackChanged
              ? { status: sql`case when status = 'suggested' then 'draft' else status end` }
              : {}),
            updatedAt: sql`now()`,
          })
          .where('userId', '=', userId)
          .where('id', '=', id)
          .where('deletedAt', 'is', null)
          .returning(LOOK_SELECT)
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
        .returning(LOOK_SELECT)
        .executeTakeFirst();
    },

    // Suggested or draft → saved (one tap from a suggestion, or the draft's Save). Saved never goes
    // back; saving a saved look changes nothing.
    save(userId: UserId, id: string, opts: { name?: string | undefined } = {}) {
      return db
        .updateTable('looks')
        .set({
          status: 'saved',
          edits: null,
          ...(opts.name !== undefined ? { name: opts.name, nameProvisional: false } : {}),
          updatedAt: sql`now()`,
        })
        .where('userId', '=', userId)
        .where('id', '=', id)
        .where('deletedAt', 'is', null)
        .returning(LOOK_SELECT)
        .executeTakeFirst();
    },

    // A rack piece's facts for the look prompt, only hers (SEC-16: ids in, labels from here).
    piecesById(userId: UserId, ids: readonly string[]) {
      if (ids.length === 0) return Promise.resolve([]);
      return db
        .selectFrom('wardrobeItems')
        .select(['id', 'label', 'category', 'color', 'brand'])
        .where('userId', '=', userId)
        .where('id', 'in', [...ids])
        .where('deletedAt', 'is', null)
        .execute();
    },

    // Wears are immutable facts: one per look per day; a repeat returns the existing one.
    async wear(userId: UserId, lookId: string, wornOn: string) {
      return db.transaction().execute(async (trx) => {
        const look = await trx
          .selectFrom('looks')
          .select('id')
          .where('userId', '=', userId)
          .where('id', '=', lookId)
          .where('status', '=', 'saved')
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
