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

  return {
    // A generation's three looks, minted together as suggestions (legacy _lkSuggLand). A piece she
    // no longer owns drops out; the anchor stays only while it is hers.
    // `claim` marks the look whose frame this job draws as already drawing, before any client sees
    // the set, so nobody asks for that frame a second time.
    async mintSet(
      userId: UserId,
      setId: string,
      specs: readonly SuggestedSpec[],
      claim?: { setIndex: number; frameKey: string; jobId: string },
    ) {
      return db.transaction().execute(async (trx) => {
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
              status: 'suggested',
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

    // ↻ on a suggestion: the same row re-written in place (the frame comes again).
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
          .where('status', '=', 'suggested')
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
    async setFrame(userId: UserId, lookId: string, frameKey: string, assetId: string) {
      const res = await db
        .updateTable('looks')
        .set({ frameAssetId: assetId, frameKey, renderStatus: 'ready', renderClaimedAt: null })
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
