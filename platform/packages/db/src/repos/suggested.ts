import { MAX_DRAFTS } from '@robes/core/looks';
import { sql, type Transaction } from 'kysely';
import type { Db } from '../client';
import type { DB } from '../database.types';
import type { UserId } from '../ids';
import type { LookRole } from './looks';

// One suggested look as a generation writes it: her pieces resolved to ids, the rest proposals.
export interface SuggestedSpec {
  setIndex: number;
  name: string;
  note: string | null;
  pieces: readonly { pieceId: string; role: LookRole | null }[];
  proposals: readonly Record<string, unknown>[];
  anchorPieceId: string | null;
  dateHint: string | null;
}

// Worker side of look states (SEC-16): scoped by the job owner's id, addressed by record id.
export function suggestedLooksRepo(db: Db) {
  async function ownedOnly(trx: Transaction<DB>, userId: UserId, ids: readonly string[]) {
    if (ids.length === 0) return new Set<string>();
    const rows = await trx
      .selectFrom('wardrobeItems')
      .select('id')
      .where('userId', '=', userId)
      .where('id', 'in', [...new Set(ids)])
      .where('deletedAt', 'is', null)
      .execute();
    return new Set(rows.map((r) => r.id));
  }

  async function writePieces(
    trx: Transaction<DB>,
    userId: UserId,
    lookId: string,
    pieces: SuggestedSpec['pieces'],
  ) {
    const owned = await ownedOnly(
      trx,
      userId,
      pieces.map((p) => p.pieceId),
    );
    const seen = new Set<string>();
    const rows = pieces.filter((p) => {
      if (!owned.has(p.pieceId) || seen.has(p.pieceId)) return false;
      seen.add(p.pieceId);
      return true;
    });
    await trx
      .deleteFrom('lookPieces')
      .where('userId', '=', userId)
      .where('lookId', '=', lookId)
      .execute();
    if (rows.length === 0) return;
    await trx
      .insertInto('lookPieces')
      .values(
        rows.map((p, position) => ({
          lookId,
          userId,
          wardrobeItemId: p.pieceId,
          role: p.role,
          position,
        })),
      )
      .execute();
  }

  // A draft Robes makes has no one to ask (plan 2026-11-03): the day's earlier unsaved draft from
  // the prompt box gives way to the new one, and past five drafts the oldest goes, as Save's
  // letGoOldest would.
  async function makeDraftRoom(
    trx: Transaction<DB>,
    userId: UserId,
    dates: readonly string[],
    incoming: number,
  ) {
    if (dates.length) {
      await trx
        .updateTable('looks')
        .set({ deletedAt: sql`now()` })
        .where('userId', '=', userId)
        .where('status', '=', 'draft')
        .where('source', '=', 'generated')
        .where('deletedAt', 'is', null)
        .where(sql<boolean>`date_hint = any(${[...dates]}::date[])`)
        .execute();
    }
    const drafts = await trx
      .selectFrom('looks')
      .select('id')
      .where('userId', '=', userId)
      .where('status', '=', 'draft')
      .where('deletedAt', 'is', null)
      .orderBy('createdAt')
      .forUpdate()
      .execute();
    const over = drafts.length + incoming - MAX_DRAFTS;
    if (over <= 0) return;
    await trx
      .updateTable('looks')
      .set({ deletedAt: sql`now()` })
      .where('userId', '=', userId)
      .where(
        'id',
        'in',
        drafts.slice(0, over).map((d) => d.id),
      )
      .execute();
  }

  return {
    // A generation's three looks, minted together as suggestions (legacy _lkSuggLand) — or, from
    // the prompt box, one look minted as her draft for the day (plan 2026-11-03). A piece she no
    // longer owns drops out; the anchor stays only while it is hers.
    // `claim` marks the look whose frame this job draws as already drawing, before any client sees
    // the set, so nobody asks for that frame a second time.
    async mintSet(
      userId: UserId,
      setId: string,
      specs: readonly SuggestedSpec[],
      claim?: { setIndex: number; frameKey: string; jobId: string },
      opts: { status?: 'suggested' | 'draft' } = {},
    ) {
      const status = opts.status ?? 'suggested';
      return db.transaction().execute(async (trx) => {
        if (status === 'draft') {
          await makeDraftRoom(
            trx,
            userId,
            [...new Set(specs.flatMap((s) => (s.dateHint ? [s.dateHint] : [])))],
            specs.length,
          );
        }
        const anchors = await ownedOnly(
          trx,
          userId,
          specs.flatMap((s) => (s.anchorPieceId ? [s.anchorPieceId] : [])),
        );
        const ids: string[] = [];
        for (const spec of specs) {
          const row = await trx
            .insertInto('looks')
            .values({
              userId,
              name: spec.name.slice(0, 120) || 'A look',
              nameProvisional: true,
              note: spec.note?.slice(0, 2000) ?? null,
              source: 'generated',
              status,
              setId,
              setIndex: spec.setIndex,
              anchorPieceId:
                spec.anchorPieceId && anchors.has(spec.anchorPieceId) ? spec.anchorPieceId : null,
              dateHint: spec.dateHint,
              proposals: spec.proposals.length ? JSON.stringify(spec.proposals) : null,
              ...(claim && claim.setIndex === spec.setIndex
                ? {
                    renderKey: `frame:${claim.frameKey}`,
                    renderStatus: 'pending',
                    renderJobId: claim.jobId,
                    renderClaimedAt: sql`now()`,
                  }
                : {}),
            })
            .returning('id')
            .executeTakeFirstOrThrow();
          await writePieces(trx, userId, row.id, spec.pieces);
          ids.push(row.id);
        }
        return ids;
      });
    },

    // ↻ on a suggestion, or Dress it again on a draft from the prompt box: the same row re-written
    // in place (the frame comes again; a draft's working notes go with the old rack).
    // The frame it draws next is claimed in the same write (see mintSet).
    async rewrite(
      userId: UserId,
      lookId: string,
      spec: Pick<SuggestedSpec, 'name' | 'note' | 'pieces' | 'proposals'>,
      claim: { frameKey: string; jobId: string },
    ): Promise<boolean> {
      return db.transaction().execute(async (trx) => {
        const res = await trx
          .updateTable('looks')
          .set({
            name: spec.name.slice(0, 120) || 'A look',
            nameProvisional: true,
            note: spec.note?.slice(0, 2000) ?? null,
            proposals: spec.proposals.length ? JSON.stringify(spec.proposals) : null,
            styling: null,
            edits: null,
            frameAssetId: null,
            frameKey: null,
            renderStatus: 'pending',
            renderKey: `frame:${claim.frameKey}`,
            renderJobId: claim.jobId,
            renderClaimedAt: sql`now()`,
            updatedAt: sql`now()`,
          })
          .where('userId', '=', userId)
          .where('id', '=', lookId)
          .where('status', 'in', ['suggested', 'draft'])
          .where('deletedAt', 'is', null)
          .executeTakeFirst();
        if (res.numUpdatedRows === 0n) return false;
        await writePieces(trx, userId, lookId, spec.pieces);
        return true;
      });
    },

    // The look a restyle or a frame re-draw reads: the row, its pieces with photos, its set.
    async look(userId: UserId, lookId: string) {
      const look = await db
        .selectFrom('looks')
        .select([
          'id',
          'name',
          'status',
          'setId',
          'setIndex',
          'anchorPieceId',
          'proposals',
          'styling',
          'frameAssetId',
          'renderKey',
          'pictureNote',
          sql<string | null>`date_hint::text`.as('dateHint'),
        ])
        .where('userId', '=', userId)
        .where('id', '=', lookId)
        .where('deletedAt', 'is', null)
        .executeTakeFirst();
      if (!look) return undefined;
      const pieces = await db
        .selectFrom('lookPieces as lp')
        .innerJoin('wardrobeItems as w', (j) =>
          j.onRef('w.id', '=', 'lp.wardrobeItemId').onRef('w.userId', '=', 'lp.userId'),
        )
        .leftJoin('assets as a', (j) =>
          j.onRef('a.id', '=', 'w.imageAssetId').onRef('a.userId', '=', 'w.userId'),
        )
        .select([
          'w.id',
          'w.label',
          'w.category',
          'w.color',
          'w.brand',
          'w.imageAssetId',
          'lp.role',
          'a.status as assetStatus',
        ])
        .where('lp.userId', '=', userId)
        .where('lp.lookId', '=', lookId)
        .where('w.deletedAt', 'is', null)
        .orderBy('lp.position')
        .execute();
      const siblings = look.setId
        ? await db
            .selectFrom('looks')
            .select(['id', 'name'])
            .where('userId', '=', userId)
            .where('setId', '=', look.setId)
            .where('id', '<>', lookId)
            .where('deletedAt', 'is', null)
            .execute()
        : [];
      return { look, pieces, siblings };
    },

    // Lands a drawn frame only if the look still wants the rack it was drawn for.
    // `stoodOn` is what the frame was drawn on (plan 2026-11-05 §2.4); left out, a re-dressed
    // frame keeps the model its first drawing stood on. A fresh frame is shown again; it leads only
    // when she had hidden Robes' picture, else the cover she chose stays in front (D19).
    async setFrame(
      userId: UserId,
      lookId: string,
      frameKey: string,
      assetId: string,
      stoodOn?: 'twin' | 'cell' | 'robes' | null,
    ) {
      const res = await db
        .updateTable('looks')
        .set({
          frameAssetId: assetId,
          frameKey,
          renderStatus: 'ready',
          renderClaimedAt: null,
          robesHidden: false,
          recordImage: sql<
            string | null
          >`case when robes_hidden then 'model' else record_image end`,
          ...(stoodOn === undefined ? {} : { stoodOn }),
        })
        .where('userId', '=', userId)
        .where('id', '=', lookId)
        .where('renderKey', '=', `frame:${frameKey}`)
        .where('deletedAt', 'is', null)
        .executeTakeFirst();
      return res.numUpdatedRows > 0n;
    },

    async failFrame(userId: UserId, lookId: string, frameKey: string) {
      await db
        .updateTable('looks')
        .set({ renderStatus: 'failed' })
        .where('userId', '=', userId)
        .where('id', '=', lookId)
        .where('renderKey', '=', `frame:${frameKey}`)
        .where('renderStatus', '=', 'pending')
        .execute();
    },
  };
}
