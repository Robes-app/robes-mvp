import type { Db } from '../client';
import type { UserId } from '../ids';

export interface PieceAnalysis {
  label: string;
  categoryL2: string | null;
  categoryL3: string | null;
  category: string;
  color: string | null;
  brand: string | null;
  price: number | null;
  currency: string | null;
  size: string | null;
  notes: string | null;
  itemDna: Record<string, unknown>;
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

    // Fills a reading piece; anything she already typed is kept.
    async apply(userId: UserId, pieceId: string, a: PieceAnalysis): Promise<void> {
      const current = await db
        .selectFrom('wardrobeItems')
        .select(['label', 'brand', 'price', 'currency', 'size', 'notes'])
        .where('userId', '=', userId)
        .where('id', '=', pieceId)
        .executeTakeFirst();
      if (!current) return;
      await db
        .updateTable('wardrobeItems')
        .set({
          label: current.label.trim() ? current.label : a.label,
          category: a.category,
          categoryL2: a.categoryL2,
          categoryL3: a.categoryL3,
          color: a.color,
          brand: current.brand ?? a.brand,
          price: current.price ?? a.price,
          currency: current.currency ?? a.currency,
          size: current.size ?? a.size,
          notes: current.notes ?? a.notes,
          itemDna: JSON.stringify(a.itemDna),
          status: 'ready',
        })
        .where('userId', '=', userId)
        .where('id', '=', pieceId)
        .execute();
    },

    async markFailed(userId: UserId, pieceId: string): Promise<void> {
      await db
        .updateTable('wardrobeItems')
        .set({ status: 'failed' })
        .where('userId', '=', userId)
        .where('id', '=', pieceId)
        .execute();
    },
  };
}
