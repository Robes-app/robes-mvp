import 'server-only';
import { ApiError } from '@robes/api';
import { Wish } from '@robes/contracts';
import type { UserId } from '@robes/db';
import { toImage } from './asset-urls';
import { repos } from './db';
import { mediaDelivery } from './media';

type WishRow = NonNullable<Awaited<ReturnType<typeof repos.wishlist.get>>>;

export async function toWishes(userId: UserId, rows: WishRow[]): Promise<Wish[]> {
  const assetIds = rows.flatMap((r) => (r.imageAssetId ? [r.imageAssetId] : []));
  const assets = new Map(
    (await repos.assets.getManyForUser(userId, assetIds)).map((a) => [a.id, a]),
  );
  return Promise.all(
    rows.map(async (row) => {
      const asset = row.imageAssetId ? assets.get(row.imageAssetId) : undefined;
      // Rows never leave as-is (CLAUDE.md rule 8): parse through the contract.
      return Wish.parse({
        id: row.id,
        label: row.label,
        category: row.category,
        categoryL2: row.categoryL2,
        categoryL3: row.categoryL3,
        color: row.color,
        colourShade: row.colourShade,
        colourExtra: row.colourExtra,
        print: row.print,
        material: row.material,
        brand: row.brand,
        note: row.note,
        price: row.price === null ? null : Number(row.price),
        currency: row.currency,
        size: row.size,
        sourceUrl: row.sourceUrl,
        sourceLabel: row.sourceLabel,
        image: asset ? await toImage(mediaDelivery, userId, asset) : null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      });
    }),
  );
}

export async function toWish(userId: UserId, row: WishRow | undefined): Promise<Wish> {
  if (!row) throw new ApiError('not_found');
  const [wish] = await toWishes(userId, [row]);
  if (!wish) throw new ApiError('not_found');
  return wish;
}
