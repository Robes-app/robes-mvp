import { sql } from 'kysely';
import type { Db } from '../client';
import type { UserId } from '../ids';

export interface PieceAnalysis {
  label: string;
  categoryL2: string | null;
  categoryL3: string | null;
  category: string;
  color: string | null;
  colourShade: string | null;
  colourExtra: string[];
  print: string | null;
  material: string | null;
  brand: string | null;
  price: number | null;
  currency: string | null;
  size: string | null;
  notes: string | null;
  itemDna: Record<string, unknown>;
}

const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

// Her own words for a piece's defining detail (or her clearing it) outlive any read of its photo.
function keepHerDetail(stored: unknown, readShape: unknown): Record<string, unknown> {
  const prior = asRecord(stored);
  if (prior.detail_hers !== true) return {};
  const { defining_detail: _read, ...shape } = asRecord(readShape);
  const hers = asRecord(prior.structural_dna).defining_detail;
  return {
    detail_hers: true,
    structural_dna: { ...shape, ...(typeof hers === 'string' ? { defining_detail: hers } : {}) },
  };
}

// A piece whose photograph has not been asked for its defining detail: filed before the read
// asked (wardrobe-analyse v6 stamps `detail_read`), not answered by her, and with a photograph
// of hers in the bucket to read.
const detailDue = (db: Db) =>
  db
    .selectFrom('wardrobeItems as w')
    .innerJoin('assets as a', (join) =>
      join.onRef('a.id', '=', 'w.imageAssetId').onRef('a.userId', '=', 'w.userId'),
    )
    .where('w.deletedAt', 'is', null)
    .where('w.status', '=', 'ready')
    .where('a.status', '=', 'ready')
    .where('a.provider', '=', 's3')
    .where('a.deletedAt', 'is', null)
    .where(sql<boolean>`not (w.item_dna ?| array['detail_read', 'detail_hers'])`);

// The one-off re-read of existing wardrobes for the defining detail (cutout brief §8). System
// work across users: it reads ids and labels, and writes one key through `addDetail` alone.
export function detailRereadRepo(db: Db) {
  return {
    async count(): Promise<{ pieces: number; users: number }> {
      const row = await detailDue(db)
        .select(({ fn }) => [
          fn.countAll<string>().as('pieces'),
          fn.count<string>('w.userId').distinct().as('users'),
        ])
        .executeTakeFirst();
      return { pieces: Number(row?.pieces ?? 0), users: Number(row?.users ?? 0) };
    },

    // Keyset-paged by piece id.
    due(opts: { limit: number; afterId?: string | undefined }) {
      let q = detailDue(db)
        .select(['w.id', 'w.userId', 'w.label', 'w.category', 'w.imageAssetId'])
        .orderBy('w.id')
        .limit(opts.limit)
        .$narrowType<{ imageAssetId: string }>();
      if (opts.afterId) q = q.where('w.id', '>', opts.afterId);
      return q.execute();
    },

    // The narrow write: the detail, and that the photograph has now been asked. Nothing else on
    // the piece is touched, and a piece she has answered (or that gained a detail meanwhile) is
    // only marked as read. `null`: a plain piece, nothing to file.
    async addDetail(userId: UserId, pieceId: string, detail: string | null): Promise<boolean> {
      const filed =
        detail === null
          ? sql`'{}'::jsonb`
          : sql`case when (item_dna -> 'structural_dna' ->> 'defining_detail') is null then jsonb_build_object('structural_dna', coalesce(item_dna -> 'structural_dna', '{}'::jsonb) || jsonb_build_object('defining_detail', ${detail}::text)) else '{}'::jsonb end`;
      const res = await db
        .updateTable('wardrobeItems')
        .set({
          itemDna: sql<string>`item_dna || jsonb_build_object('detail_read', true) || ${filed}`,
        })
        .where('userId', '=', userId)
        .where('id', '=', pieceId)
        .where('deletedAt', 'is', null)
        .where(sql<boolean>`not (item_dna ? 'detail_hers')`)
        .executeTakeFirst();
      return res.numUpdatedRows > 0n;
    },
  };
}

// Worker-side access for the wardrobe_analyse job; always scoped by the job owner's id.
export function pieceAnalysisRepo(db: Db) {
  return {
    forAnalysis(userId: UserId, pieceId: string) {
      return db
        .selectFrom('wardrobeItems as w')
        .leftJoin('assets as a', (join) =>
          join.onRef('a.id', '=', 'w.imageAssetId').onRef('a.userId', '=', 'w.userId'),
        )
        .select(['w.id', 'w.status', 'w.label', 'w.imageAssetId', 'a.status as assetStatus'])
        .where('w.userId', '=', userId)
        .where('w.id', '=', pieceId)
        .where('w.deletedAt', 'is', null)
        .executeTakeFirst();
    },

    // Fills a reading piece; anything she already typed (or picked, like a material) is kept.
    async apply(userId: UserId, pieceId: string, a: PieceAnalysis): Promise<void> {
      const current = await db
        .selectFrom('wardrobeItems')
        .select([
          'status',
          'label',
          'brand',
          'price',
          'currency',
          'size',
          'notes',
          'material',
          'itemDna',
        ])
        .where('userId', '=', userId)
        .where('id', '=', pieceId)
        .executeTakeFirst();
      if (!current) return;
      // Robes' doubt about a material or a brand she has already answered is no doubt at all.
      const { material_check, brand_check, ...rest } = a.itemDna;
      const itemDna = {
        ...rest,
        ...(current.material ? {} : { material_check }),
        ...(current.brand ? {} : { brand_check }),
        ...keepHerDetail(current.itemDna, rest.structural_dna),
      };
      await db
        .updateTable('wardrobeItems')
        .set({
          // A reading piece carries a placeholder label; one she typed is kept.
          label:
            current.status === 'reading' || !current.label.trim()
              ? a.label || current.label
              : current.label,
          category: a.category,
          categoryL2: a.categoryL2,
          categoryL3: a.categoryL3,
          color: a.color,
          colourShade: a.colourShade,
          colourExtra: a.colourExtra,
          print: a.print,
          material: current.material ?? a.material,
          brand: current.brand ?? a.brand,
          price: current.price ?? a.price,
          currency: current.currency ?? a.currency,
          size: current.size ?? a.size,
          notes: current.notes ?? a.notes,
          itemDna: JSON.stringify(itemDna),
          status: 'ready',
        })
        .where('userId', '=', userId)
        .where('id', '=', pieceId)
        .execute();
    },

    // A read that found nothing (or could not run) leaves no piece behind: the row only ever
    // held a placeholder while it read, so it goes rather than sitting in the wardrobe as a
    // failed "New piece" (Add Piece redline 04c). A piece the read already filled is kept.
    // A read she asked for again on a piece she already has (Try again, audit F3): it never goes;
    // a read that still finds nothing leaves it as it was, "couldn't see a piece", hers to name.
    async markFailed(userId: UserId, pieceId: string): Promise<boolean> {
      const res = await db
        .updateTable('wardrobeItems')
        .set({ status: 'failed' })
        .where('userId', '=', userId)
        .where('id', '=', pieceId)
        .where('status', '=', 'reading')
        .executeTakeFirst();
      return res.numUpdatedRows > 0n;
    },

    async discard(userId: UserId, pieceId: string): Promise<boolean> {
      const res = await db
        .deleteFrom('wardrobeItems')
        .where('userId', '=', userId)
        .where('id', '=', pieceId)
        .where('status', '=', 'reading')
        .executeTakeFirst();
      return res.numDeletedRows > 0n;
    },
  };
}
