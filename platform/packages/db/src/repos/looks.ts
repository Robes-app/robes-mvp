import type { Season } from '@robes/core';
import { type LookStatus, MAX_DRAFTS } from '@robes/core/looks';
import { normaliseSeasons } from '@robes/core/wardrobe';
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
  'seasons',
  'renderAssetId',
  'renderStatus',
  'renderKey',
  'renderClaimedAt',
  'status',
  'anchorPieceId',
  'setId',
  'setIndex',
  'frameAssetId',
  'frameKey',
  'stoodOn',
  'proposals',
  'styling',
  'edits',
  'photoAssetId',
  'recordImage',
  'robesHidden',
  'pictureNote',
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
  // The season as a band (older clients) or as seasons (D12); the database keeps the two in step,
  // and seasons win when both are given.
  climateBand?: 'spring_summer' | 'autumn_winter' | 'year_round' | undefined;
  seasons?: readonly Season[] | undefined;
  // The pieces Robes proposes (not hers yet), how each row is worn, and a draft's working notes.
  proposals?: readonly Record<string, unknown>[] | null | undefined;
  styling?: Record<string, string> | null | undefined;
  edits?: Record<string, unknown> | null | undefined;
  dateHint?: string | null | undefined;
  // Which picture is the record (her photograph or the render on her model); she sets it.
  record?: 'photo' | 'model' | undefined;
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

// A look's stack holds at most LOOK_IMAGES_MAX photographs (the position check in the database).
export const LOOK_IMAGES_MAX = 20;
export class LookImagesFull extends Error {
  constructor() {
    super('look_images_full');
  }
}

// A look always keeps one image (D19): Robes' picture is hidden only behind a photograph of hers,
// and her last photograph stays while Robes' picture is hidden.
export class LookNeedsImage extends Error {
  constructor() {
    super('look_needs_image');
  }
}

const json = (v: unknown) => (v == null ? null : JSON.stringify(v));
const emptyToNull = (v: Record<string, unknown> | readonly unknown[] | null | undefined) =>
  v == null || (Array.isArray(v) ? v.length === 0 : Object.keys(v).length === 0) ? null : v;

// Her season, in whichever spelling she sent: seasons set the band (the trigger derives it), a
// band alone sets the seasons the same way. Nothing sent leaves the row's own.
function seasonColumns(fields: Pick<LookFields, 'climateBand' | 'seasons'>) {
  if (fields.seasons !== undefined) {
    return { seasons: normaliseSeasons(fields.seasons), climateSource: 'user' as const };
  }
  if (fields.climateBand !== undefined) {
    return { climateBand: fields.climateBand, climateSource: 'user' as const };
  }
  return {};
}

// Keeps `photo_asset_id` the stack's first photograph, so code and phone builds from before the
// stack read the one in front; a photograph in front is the record, none is Robes' picture.
async function syncLeadPhoto(trx: Transaction<DB>, userId: UserId, lookId: string) {
  const first = await trx
    .selectFrom('lookImages')
    .select('assetId')
    .where('userId', '=', userId)
    .where('lookId', '=', lookId)
    .orderBy('position')
    .limit(1)
    .executeTakeFirst();
  await trx
    .updateTable('looks')
    .set({
      photoAssetId: first?.assetId ?? null,
      ...(first
        ? {}
        : { recordImage: sql`case when record_image = 'photo' then null else record_image end` }),
    })
    .where('userId', '=', userId)
    .where('id', '=', lookId)
    .execute();
}

// Positions run 0..n-1 in the order given.
async function renumberImages(trx: Transaction<DB>, userId: UserId, ids: readonly string[]) {
  for (const [position, id] of ids.entries()) {
    await trx
      .updateTable('lookImages')
      .set({ position })
      .where('userId', '=', userId)
      .where('id', '=', id)
      .where('position', '!=', position)
      .execute();
  }
}

// Wear dates are calendar days: read as text so no timezone can move them.
const wornOnText = sql<string>`worn_on::text`;
// A look's record is read whole; a wardrobe cannot hold enough wears for a page.
const WEARS_MAX = 200;

// Files a wear of a saved look, its pieces as they stand now: the one path every wear takes,
// whether she records it (`looks`) or the day she pinned it to passes (`plan`, D23). Undefined
// when the look is not hers, not saved or deleted; a repeat on the same day returns the existing
// wear.
export async function fileWear(
  trx: Transaction<DB>,
  userId: UserId,
  lookId: string,
  wornOn: string,
  source: 'looks' | 'plan',
) {
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
    .values({ userId, lookId, wornOn, pieceIds: pieces.map((p) => p.wardrobeItemId), source })
    .onConflict((oc) => oc.columns(['userId', 'lookId', 'wornOn']).doNothing())
    .execute();
  // Recording a wear and pinning to a day are one act (beta): the day she wore it holds the
  // look, unless it is already there in either slot, where its planned pin turns worn. A named
  // day lends the look its name.
  const onDay = await trx
    .selectFrom('plannedDays')
    .select('id')
    .where('userId', '=', userId)
    .where('lookId', '=', lookId)
    .where('dayDate', '=', sql<Date>`${wornOn}::date`)
    .where('deletedAt', 'is', null)
    .executeTakeFirst();
  if (onDay) {
    await trx
      .updateTable('plannedDays')
      .set({ status: 'worn' })
      .where('userId', '=', userId)
      .where('lookId', '=', lookId)
      .where('dayDate', '=', sql<Date>`${wornOn}::date`)
      .where('deletedAt', 'is', null)
      .where('status', '=', 'planned')
      .execute();
  } else {
    const named = await trx
      .selectFrom('dayNames')
      .select('name')
      .where('userId', '=', userId)
      .where('dayDate', '=', sql<Date>`${wornOn}::date`)
      .executeTakeFirst();
    await trx
      .insertInto('plannedDays')
      .values({
        userId,
        dayDate: wornOn,
        sourceKind: 'look',
        lookId,
        slot: 'day',
        pinned: true,
        status: 'worn',
        activity: named?.name ?? null,
        itemIds: pieces.map((p) => p.wardrobeItemId),
      })
      .execute();
  }
  return trx
    .selectFrom('wears')
    .select(['id', 'lookId', 'pieceIds', 'confirmedAt', wornOnText.as('wornOn')])
    .where('userId', '=', userId)
    .where('lookId', '=', lookId)
    .where('wornOn', '=', sql<Date>`${wornOn}::date`)
    .executeTakeFirstOrThrow();
}

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
        pieceId?: string | undefined;
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
      const { pieceId } = q;
      if (pieceId) {
        query = query.where((eb) =>
          eb.exists(
            eb
              .selectFrom('lookPieces as lp')
              .select('lp.lookId')
              .whereRef('lp.lookId', '=', 'looks.id')
              .where('lp.userId', '=', userId)
              .where('lp.wardrobeItemId', '=', pieceId),
          ),
        );
      }
      return toPage(await query.execute(), q.limit);
    },

    get(userId: UserId, id: string) {
      return active()
        .select(LOOK_SELECT)
        .where('userId', '=', userId)
        .where('id', '=', id)
        .executeTakeFirst();
    },

    // The look already saved from one photograph (a retry of "save the look" finds it).
    byPhoto(userId: UserId, photoAssetId: string) {
      return active()
        .select(LOOK_SELECT)
        .where('userId', '=', userId)
        .where('photoAssetId', '=', photoAssetId)
        .orderBy('createdAt')
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

    // A saved look from HERS (the home's first-look step): a Robes build, or her pieces and
    // nothing proposed.
    async hasOwnLook(userId: UserId): Promise<boolean> {
      const row = await active()
        .select('id')
        .where('userId', '=', userId)
        .where('status', '=', 'saved')
        .where((eb) =>
          eb.or([
            eb('source', '=', 'robes-build'),
            eb.and([
              eb('proposals', 'is', null),
              eb.exists(
                eb
                  .selectFrom('lookPieces as lp')
                  .select('lp.lookId')
                  .whereRef('lp.lookId', '=', 'looks.id')
                  .where('lp.userId', '=', userId),
              ),
            ]),
          ]),
        )
        .limit(1)
        .executeTakeFirst();
      return row !== undefined;
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
    // `force` is her picture note sent (D21): she asked for a fresh picture, so a ready one for the
    // same key draws again and a newer key takes over a claim still drawing an older one (as a
    // frame does); only the same key already drawing stands.
    async claimRender(
      userId: UserId,
      id: string,
      renderKey: string,
      opts: { force?: boolean } = {},
    ): Promise<boolean> {
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
          opts.force
            ? sql<boolean>`not coalesce(
                render_key = ${renderKey} and render_status = 'pending'
                  and render_claimed_at > now() - interval '10 minutes',
                false
              )`
            : sql<boolean>`not coalesce(
                (render_status = 'ready' and render_key = ${renderKey})
                or (render_status = 'pending' and render_claimed_at > now() - interval '10 minutes'),
                false
              )`,
        )
        .executeTakeFirst();
      return res.numUpdatedRows > 0n;
    },

    // Robes' frame for one rack: true when this call should draw it. Unlike a render on her model,
    // a newer rack takes over a claim still drawing an older one, so the latest rack always wins
    // (the older job stands down: it no longer matches render_key when it lands). `force` (her
    // picture note sent, D21) draws a ready frame for the same key again.
    async claimFrame(
      userId: UserId,
      id: string,
      frameKey: string,
      opts: { force?: boolean } = {},
    ): Promise<boolean> {
      const renderKey = `frame:${frameKey}`;
      const ready = opts.force ? sql<boolean>`false` : sql<boolean>`render_status = 'ready'`;
      const res = await db
        .updateTable('looks')
        .set({ renderStatus: 'pending', renderKey, renderJobId: null, renderClaimedAt: sql`now()` })
        .where('userId', '=', userId)
        .where('id', '=', id)
        .where('deletedAt', 'is', null)
        .where(
          sql<boolean>`not coalesce(
            render_key = ${renderKey} and (${ready}
              or (render_status = 'pending' and render_claimed_at > now() - interval '10 minutes')),
            false
          )`,
        )
        .executeTakeFirst();
      return res.numUpdatedRows > 0n;
    },

    // Her note on how Robes' picture is drawn (D21), or none. Written before the redraw that reads
    // it; the pieces are never touched. False when the look is not hers.
    async setPictureNote(userId: UserId, id: string, note: string | null): Promise<boolean> {
      const trimmed = note?.trim();
      const res = await db
        .updateTable('looks')
        .set({ pictureNote: trimmed ? trimmed : null })
        .where('userId', '=', userId)
        .where('id', '=', id)
        .where('deletedAt', 'is', null)
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
    // The drafts Robes made from the prompt box for the days in a window (plan 2026-11-03),
    // newest first: the diary shows the newest per day until she saves or discards it.
    draftsFor(userId: UserId, from: string, to: string) {
      return active()
        .select(LOOK_SELECT)
        .where('userId', '=', userId)
        .where('status', '=', 'draft')
        .where('source', '=', 'generated')
        .where(sql<boolean>`date_hint between ${from}::date and ${to}::date`)
        .orderBy('createdAt', 'desc')
        .execute();
    },

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

    // The days each look is pinned on from yesterday on, earliest first (a day can hold a look in
    // both slots, so a day may repeat). The client drops the days before her own today; the day of
    // slack covers time zones behind the server's.
    async pinnedDays(userId: UserId, lookIds: readonly string[]) {
      if (lookIds.length === 0) return [];
      return db
        .selectFrom('plannedDays')
        .select(['lookId', sql<string>`day_date::text`.as('dayDate')])
        .where('userId', '=', userId)
        .where('lookId', 'in', [...lookIds])
        .where('deletedAt', 'is', null)
        .where('dayDate', '>=', sql<Date>`current_date - 1`)
        .orderBy('dayDate')
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
            ...seasonColumns(look),
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
        // A look made from her photograph starts its stack with it (D13).
        if (look.photoAssetId) {
          await trx
            .insertInto('lookImages')
            .values({ userId, lookId: row.id, assetId: look.photoAssetId, position: 0 })
            .execute();
        }
        return row;
      });
    },

    // Edits in place ("Update"); pieces, when given, replace the whole set atomically. A suggestion
    // becomes a draft the moment she changes its rack (unless keepSuggested); a saved look never
    // carries working notes.
    async update(
      userId: UserId,
      id: string,
      fields: LookFields & {
        pieces?: readonly LookPieceInput[] | undefined;
        letGoOldest?: boolean | undefined;
        keepSuggested?: boolean | undefined;
      },
    ) {
      // keepSuggested: a swap from a suggested look's rack lands on it, and it stays suggested.
      const rackChanged =
        fields.keepSuggested !== true &&
        (fields.pieces !== undefined ||
          fields.proposals !== undefined ||
          fields.styling !== undefined);
      return db.transaction().execute(async (trx) => {
        // A suggestion becoming a draft counts against the five drafts like a new one.
        if (rackChanged) {
          const cur = await trx
            .selectFrom('looks')
            .select('status')
            .where('userId', '=', userId)
            .where('id', '=', id)
            .where('deletedAt', 'is', null)
            .forUpdate()
            .executeTakeFirst();
          if (cur?.status === 'suggested') {
            await makeDraftRoom(trx, userId, fields.letGoOldest === true);
          }
        }
        const row = await trx
          .updateTable('looks')
          .set({
            ...(fields.name !== undefined ? { name: fields.name, nameProvisional: false } : {}),
            ...(fields.note !== undefined ? { note: fields.note } : {}),
            ...seasonColumns(fields),
            ...(fields.proposals !== undefined
              ? { proposals: json(emptyToNull(fields.proposals)) }
              : {}),
            ...(fields.styling !== undefined ? { styling: json(emptyToNull(fields.styling)) } : {}),
            ...(fields.dateHint !== undefined ? { dateHint: fields.dateHint } : {}),
            ...(fields.record !== undefined ? { recordImage: fields.record } : {}),
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

    // Undo. A draft coming back counts against the five like a new one.
    restore(userId: UserId, id: string, opts: { letGoOldest?: boolean } = {}) {
      return db.transaction().execute(async (trx) => {
        const gone = await trx
          .selectFrom('looks')
          .select('status')
          .where('userId', '=', userId)
          .where('id', '=', id)
          .where('deletedAt', 'is not', null)
          .executeTakeFirst();
        if (!gone) return undefined;
        if (gone.status === 'draft') await makeDraftRoom(trx, userId, opts.letGoOldest === true);
        return trx
          .updateTable('looks')
          .set({ deletedAt: null })
          .where('userId', '=', userId)
          .where('id', '=', id)
          .where('deletedAt', 'is not', null)
          .returning(LOOK_SELECT)
          .executeTakeFirst();
      });
    },

    // Suggested or draft → saved (one tap from a suggestion, or the draft's Save). Saved never goes
    // back; saving a saved look changes nothing. A name she typed is hers; `datedName` (an unnamed
    // hand-built draft) replaces the offer but stays provisional, hers to change.
    save(
      userId: UserId,
      id: string,
      opts: { name?: string | undefined; datedName?: string | undefined } = {},
    ) {
      return db
        .updateTable('looks')
        .set({
          status: 'saved',
          edits: null,
          ...(opts.name !== undefined
            ? { name: opts.name, nameProvisional: false }
            : opts.datedName !== undefined
              ? { name: opts.datedName, nameProvisional: true }
              : {}),
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
    wear(userId: UserId, lookId: string, wornOn: string) {
      return db.transaction().execute((trx) => fileWear(trx, userId, lookId, wornOn, 'looks'));
    },

    // Her tags on each look (Details › Tags), oldest first.
    async tagsFor(userId: UserId, lookIds: readonly string[]): Promise<Map<string, string[]>> {
      if (lookIds.length === 0) return new Map();
      const rows = await db
        .selectFrom('tagLooks')
        .innerJoin('tags', (j) =>
          j.onRef('tags.id', '=', 'tagLooks.tagId').onRef('tags.userId', '=', 'tagLooks.userId'),
        )
        .select(['tagLooks.lookId', 'tags.label'])
        .where('tagLooks.userId', '=', userId)
        .where('tagLooks.lookId', 'in', [...lookIds])
        .where('tags.deletedAt', 'is', null)
        .orderBy('tagLooks.createdAt')
        .execute();
      const out = new Map<string, string[]>();
      for (const r of rows) out.set(r.lookId, [...(out.get(r.lookId) ?? []), r.label]);
      return out;
    },

    // Her tags on a look, replaced as a set: a label she types joins her tag namespace (the
    // same `wear_for` tags her pieces wear); a tag not in the set comes off this look only.
    // False when the look is not hers, and nothing is written.
    async setTags(userId: UserId, lookId: string, labels: readonly string[]): Promise<boolean> {
      const clean = [...new Set(labels.map((l) => l.trim()).filter(Boolean))].slice(0, 6);
      return db.transaction().execute(async (tx) => {
        const owns = await tx
          .selectFrom('looks')
          .select('id')
          .where('userId', '=', userId)
          .where('id', '=', lookId)
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
        let drop = tx
          .deleteFrom('tagLooks')
          .where('userId', '=', userId)
          .where('lookId', '=', lookId);
        if (ids.length) drop = drop.where('tagId', 'not in', ids);
        await drop.execute();
        if (ids.length) {
          await tx
            .insertInto('tagLooks')
            .values(ids.map((tagId) => ({ userId, lookId, tagId, source: 'user' })))
            .onConflict((oc) => oc.columns(['tagId', 'lookId']).doNothing())
            .execute();
        }
        return true;
      });
    },

    // Her photographs of a look, the one in front first (D13).
    imagesFor(userId: UserId, lookIds: readonly string[]) {
      if (lookIds.length === 0) return Promise.resolve([]);
      return db
        .selectFrom('lookImages')
        .select(['id', 'lookId', 'assetId', 'position'])
        .where('userId', '=', userId)
        .where('lookId', 'in', [...lookIds])
        .orderBy('lookId')
        .orderBy('position')
        .execute();
    },

    // A photograph joins the back of the stack; the same asset twice is the one row. Both the look
    // and the asset must be hers: the composite keys refuse the pairing even if a caller ever got
    // past this filter. `lead` brings it to the front (the camera on a look: the new photograph
    // is the one she means).
    addImage(userId: UserId, lookId: string, assetId: string, opts: { lead?: boolean } = {}) {
      return db.transaction().execute(async (trx) => {
        const look = await trx
          .selectFrom('looks')
          .select('id')
          .where('userId', '=', userId)
          .where('id', '=', lookId)
          .where('deletedAt', 'is', null)
          .forUpdate()
          .executeTakeFirst();
        if (!look) return undefined;
        const rows = await trx
          .selectFrom('lookImages')
          .select(['id', 'assetId'])
          .where('userId', '=', userId)
          .where('lookId', '=', lookId)
          .orderBy('position')
          .execute();
        let row = rows.find((r) => r.assetId === assetId);
        if (!row) {
          if (rows.length >= LOOK_IMAGES_MAX) throw new LookImagesFull();
          row = await trx
            .insertInto('lookImages')
            .values({ userId, lookId, assetId, position: rows.length })
            .returning(['id', 'assetId'])
            .executeTakeFirstOrThrow();
          rows.push(row);
        }
        if (opts.lead) {
          const { id } = row;
          await renumberImages(trx, userId, [
            id,
            ...rows.filter((r) => r.id !== id).map((r) => r.id),
          ]);
          await trx
            .updateTable('looks')
            .set({ recordImage: 'photo' })
            .where('userId', '=', userId)
            .where('id', '=', lookId)
            .execute();
        }
        await syncLeadPhoto(trx, userId, lookId);
        return trx
          .selectFrom('looks')
          .select(LOOK_SELECT)
          .where('userId', '=', userId)
          .where('id', '=', lookId)
          .executeTakeFirst();
      });
    },

    // A photograph leaves the stack; the rest close up. Robes' picture is not a row here, so it
    // can never be removed this way. Undefined when the look or the photograph is not hers; her
    // last photograph stays while Robes' picture is hidden (LookNeedsImage, D19).
    removeImage(userId: UserId, lookId: string, imageId: string) {
      return db.transaction().execute(async (trx) => {
        const look = await trx
          .selectFrom('looks')
          .select('robesHidden')
          .where('userId', '=', userId)
          .where('id', '=', lookId)
          .where('deletedAt', 'is', null)
          .forUpdate()
          .executeTakeFirst();
        if (!look) return undefined;
        if (look.robesHidden) {
          const rows = await trx
            .selectFrom('lookImages')
            .select('id')
            .where('userId', '=', userId)
            .where('lookId', '=', lookId)
            .execute();
          if (!rows.some((r) => r.id === imageId)) return undefined;
          if (rows.length === 1) throw new LookNeedsImage();
        }
        const gone = await trx
          .deleteFrom('lookImages')
          .where('userId', '=', userId)
          .where('lookId', '=', lookId)
          .where('id', '=', imageId)
          .executeTakeFirst();
        if (gone.numDeletedRows === 0n) return undefined;
        const rest = await trx
          .selectFrom('lookImages')
          .select('id')
          .where('userId', '=', userId)
          .where('lookId', '=', lookId)
          .orderBy('position')
          .execute();
        await renumberImages(
          trx,
          userId,
          rest.map((r) => r.id),
        );
        await syncLeadPhoto(trx, userId, lookId);
        return trx
          .selectFrom('looks')
          .select(LOOK_SELECT)
          .where('userId', '=', userId)
          .where('id', '=', lookId)
          .where('deletedAt', 'is', null)
          .executeTakeFirst();
      });
    },

    // The front of the stack: one of her photographs leads the look (and is the record), or Robes'
    // picture does (`null`) and her photographs keep their order behind it.
    setCover(userId: UserId, lookId: string, imageId: string | null) {
      return db.transaction().execute(async (trx) => {
        const look = await trx
          .selectFrom('looks')
          .select('id')
          .where('userId', '=', userId)
          .where('id', '=', lookId)
          .where('deletedAt', 'is', null)
          .forUpdate()
          .executeTakeFirst();
        if (!look) return undefined;
        if (imageId !== null) {
          const rows = await trx
            .selectFrom('lookImages')
            .select('id')
            .where('userId', '=', userId)
            .where('lookId', '=', lookId)
            .orderBy('position')
            .execute();
          if (!rows.some((r) => r.id === imageId)) return undefined;
          await renumberImages(trx, userId, [
            imageId,
            ...rows.filter((r) => r.id !== imageId).map((r) => r.id),
          ]);
        }
        // Robes' picture brought to the front is shown again (D19).
        await trx
          .updateTable('looks')
          .set(
            imageId === null
              ? { recordImage: 'model', robesHidden: false }
              : { recordImage: 'photo' },
          )
          .where('userId', '=', userId)
          .where('id', '=', lookId)
          .execute();
        await syncLeadPhoto(trx, userId, lookId);
        return trx
          .selectFrom('looks')
          .select(LOOK_SELECT)
          .where('userId', '=', userId)
          .where('id', '=', lookId)
          .executeTakeFirst();
      });
    },

    // Robes' picture off the stack, or back on it (D19). Hidden, it is kept (the frame or render
    // stays on the row) and her photograph in front is the cover; it can be hidden only behind a
    // photograph of hers (LookNeedsImage). Shown again, it takes its place without leading; the
    // next redraw that lands shows it too, as the cover. Undefined when the look is not hers.
    setRobesHidden(userId: UserId, lookId: string, hidden: boolean) {
      return db.transaction().execute(async (trx) => {
        const look = await trx
          .selectFrom('looks')
          .select('id')
          .where('userId', '=', userId)
          .where('id', '=', lookId)
          .where('deletedAt', 'is', null)
          .forUpdate()
          .executeTakeFirst();
        if (!look) return undefined;
        if (hidden) {
          const photo = await trx
            .selectFrom('lookImages')
            .select('id')
            .where('userId', '=', userId)
            .where('lookId', '=', lookId)
            .limit(1)
            .executeTakeFirst();
          if (!photo) throw new LookNeedsImage();
        }
        await trx
          .updateTable('looks')
          .set(hidden ? { robesHidden: true, recordImage: 'photo' } : { robesHidden: false })
          .where('userId', '=', userId)
          .where('id', '=', lookId)
          .execute();
        return trx
          .selectFrom('looks')
          .select(LOOK_SELECT)
          .where('userId', '=', userId)
          .where('id', '=', lookId)
          .executeTakeFirst();
      });
    },

    // One look's record, newest first: the day and the pieces she wore that day, named from the
    // wear's own snapshot — so the row keeps saying what she wore after the look moves on. A piece
    // she has let go of still names itself (the record is true); one whose row is gone is counted.
    async wears(userId: UserId, lookId: string) {
      const rows = await db
        .selectFrom('wears')
        .select(['id', 'pieceIds', wornOnText.as('wornOn')])
        .where('userId', '=', userId)
        .where('lookId', '=', lookId)
        .orderBy('wornOn', 'desc')
        .limit(WEARS_MAX)
        .execute();
      const ids = [...new Set(rows.flatMap((r) => r.pieceIds))];
      const labels = new Map<string, string>();
      if (ids.length) {
        const pieces = await db
          .selectFrom('wardrobeItems')
          .select(['id', 'label'])
          .where('userId', '=', userId)
          .where('id', 'in', ids)
          .execute();
        for (const p of pieces) labels.set(p.id, p.label);
      }
      return rows.map((r) => ({
        id: r.id,
        wornOn: r.wornOn,
        pieces: r.pieceIds.map((id) => ({ id, label: labels.get(id) ?? null })),
      }));
    },

    // Looks she recorded wearing on a calendar day.
    // The days on [from, to] she logged any wear (the bell's nudges read the gaps).
    async wornDays(userId: UserId, from: string, to: string): Promise<string[]> {
      const rows = await db
        .selectFrom('wears')
        .select(wornOnText.as('wornOn'))
        .distinct()
        .where('userId', '=', userId)
        .where('wornOn', '>=', sql<Date>`${from}::date`)
        .where('wornOn', '<=', sql<Date>`${to}::date`)
        .orderBy('wornOn')
        .execute();
      return rows.map((r) => r.wornOn);
    },

    async wornOn(userId: UserId, day: string): Promise<string[]> {
      const rows = await db
        .selectFrom('wears')
        .select('lookId')
        .where('userId', '=', userId)
        .where('wornOn', '=', sql<Date>`${day}::date`)
        .execute();
      return rows.map((r) => r.lookId);
    },

    // Taking a wear back takes the look off that day too: the two are one act.
    async unwear(userId: UserId, lookId: string, wornOn: string): Promise<boolean> {
      return db.transaction().execute(async (trx) => {
        const res = await trx
          .deleteFrom('wears')
          .where('userId', '=', userId)
          .where('lookId', '=', lookId)
          .where('wornOn', '=', sql<Date>`${wornOn}::date`)
          .executeTakeFirst();
        if (res.numDeletedRows === 0n) return false;
        await trx
          .updateTable('plannedDays')
          .set({ deletedAt: sql`now()` })
          .where('userId', '=', userId)
          .where('lookId', '=', lookId)
          .where('dayDate', '=', sql<Date>`${wornOn}::date`)
          .where('deletedAt', 'is', null)
          .execute();
        return true;
      });
    },
  };
}
