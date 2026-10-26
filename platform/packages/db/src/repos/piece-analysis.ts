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
        .select(['status', 'label', 'brand', 'price', 'currency', 'size', 'notes', 'material'])
        .where('userId', '=', userId)
        .where('id', '=', pieceId)
        .executeTakeFirst();
      if (!current) return;
      // Robes' doubt about a material she has already answered is no doubt at all.
      const { material_check: _, ...answered } = a.itemDna;
      const itemDna = current.material ? answered : a.itemDna;
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
