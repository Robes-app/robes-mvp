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
    async mintSet(userId: UserId, setId: string, specs: readonly SuggestedSpec[]) {
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
    async rewrite(
      userId: UserId,
      lookId: string,
      spec: Pick<SuggestedSpec, 'name' | 'note' | 'pieces' | 'proposals'>,
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
            renderStatus: null,
            renderKey: null,
            renderJobId: null,
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

    // The frame a generation drew for a set's look; never over a frame she already has.
    async setFirstFrame(userId: UserId, setId: string, setIndex: number, assetId: string) {
      await db
        .updateTable('looks')
        .set({ frameAssetId: assetId })
        .where('userId', '=', userId)
        .where('setId', '=', setId)
        .where('setIndex', '=', setIndex)
        .where('frameAssetId', 'is', null)
        .where('deletedAt', 'is', null)
        .execute();
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

const NOTICED_CAP = 12;

// Robes-noticed lines: a rule she said in a look's prompt waits here until she keeps it
// (legacy 2026-10-13). Keeping one files it in her brief, which the style memory owns.
export function noticedRepo(db: Db) {
  const active = () => db.selectFrom('noticedLines').where('deletedAt', 'is', null);
  return {
    list(userId: UserId) {
      return active()
        .select(['id', 'list', 'text', 'because', 'source', 'lookId', 'createdAt'])
        .where('userId', '=', userId)
        .orderBy('createdAt', 'desc')
        .limit(NOTICED_CAP)
        .execute();
    },

    // Deduped on the words; the oldest past the cap lets go. False when the line already waits.
    async add(
      userId: UserId,
      line: { text: string; because: string | null; lookId: string | null },
    ): Promise<boolean> {
      const text = line.text.replace(/\s+/g, ' ').trim().slice(0, 160);
      if (!text) return false;
      return db.transaction().execute(async (trx) => {
        const look = line.lookId
          ? await trx
              .selectFrom('looks')
              .select('id')
              .where('userId', '=', userId)
              .where('id', '=', line.lookId)
              .executeTakeFirst()
          : undefined;
        const res = await trx
          .insertInto('noticedLines')
          .values({
            userId,
            text,
            because: line.because?.slice(0, 200) ?? null,
            lookId: look?.id ?? null,
          })
          .onConflict((oc) =>
            oc
              .expression(sql`user_id, list, lower(text)`)
              .where('deletedAt', 'is', null)
              .doNothing(),
          )
          .returning('id')
          .executeTakeFirst();
        const added = res !== undefined;
        if (added) {
          await trx
            .updateTable('noticedLines')
            .set({ deletedAt: sql`now()` })
            .where('userId', '=', userId)
            .where('deletedAt', 'is', null)
            .where(
              'id',
              'not in',
              trx
                .selectFrom('noticedLines')
                .select('id')
                .where('userId', '=', userId)
                .where('deletedAt', 'is', null)
                .orderBy('createdAt', 'desc')
                .limit(NOTICED_CAP),
            )
            .execute();
        }
        return added;
      });
    },

    async remove(userId: UserId, id: string): Promise<boolean> {
      const res = await db
        .updateTable('noticedLines')
        .set({ deletedAt: sql`now()` })
        .where('userId', '=', userId)
        .where('id', '=', id)
        .where('deletedAt', 'is', null)
        .executeTakeFirst();
      return res.numUpdatedRows > 0n;
    },
  };
}
