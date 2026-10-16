import type { Db } from '../client';
import type { UserId } from '../ids';

export interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

// The pieces the read may match against (legacy sent at most 80).
export const CLOSET_FOR_READ = 80;

// Worker-side access for the wardrobe_pieces job; always scoped by the job owner's id.
export function photoReadRepo(db: Db) {
  return {
    source(userId: UserId, assetId: string) {
      return db
        .selectFrom('assets')
        .select(['id', 'kind', 'status'])
        .where('userId', '=', userId)
        .where('id', '=', assetId)
        .where('deletedAt', 'is', null)
        .executeTakeFirst();
    },

    closet(userId: UserId) {
      return db
        .selectFrom('wardrobeItems')
        .select(['id', 'label', 'category', 'color', 'brand'])
        .where('userId', '=', userId)
        .where('status', '=', 'ready')
        .where('deletedAt', 'is', null)
        .orderBy('createdAt', 'desc')
        .orderBy('id', 'desc')
        .limit(CLOSET_FOR_READ)
        .execute();
    },

    // A pending wardrobe asset the rendition pipeline cuts out of its source photo.
    async createCrop(userId: UserId, sourceAssetId: string, crop: CropBox): Promise<string> {
      const row = await db
        .insertInto('assets')
        .values({
          userId,
          kind: 'wardrobe',
          contentType: 'image/jpeg',
          provider: 's3',
          sourceAssetId,
          crop: JSON.stringify(crop),
        })
        .returning('id')
        .executeTakeFirstOrThrow();
      return row.id;
    },
  };
}
