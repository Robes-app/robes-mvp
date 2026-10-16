import type { AssetRendition, PieceImage } from '@robes/contracts';
import { RenditionManifest, renditionKeys } from '@robes/media';
import type { MediaDelivery } from '@robes/media/delivery';

// Signs every rendition of a ready asset for its owner; one place for assets and pieces alike.
export async function signedRenditions(
  delivery: Pick<MediaDelivery, 'url'>,
  userId: string,
  asset: { id: string; status: string; renditions: unknown },
): Promise<{ master: string | null; renditions: AssetRendition[] }> {
  if (asset.status !== 'ready') return { master: null, renditions: [] };
  const manifest = RenditionManifest.safeParse(asset.renditions);
  if (!manifest.success) return { master: null, renditions: [] };
  const keys = renditionKeys(userId, asset.id, manifest.data);
  const [master, renditions] = await Promise.all([
    delivery.url(keys.master),
    Promise.all(
      keys.renditions.map(async (r) => ({
        width: r.width,
        avif: await delivery.url(r.avif),
        webp: await delivery.url(r.webp),
      })),
    ),
  ]);
  return { master, renditions };
}

// The client-facing image of an asset (pieces, idea frames): dimensions, placeholder, signed renditions.
export async function toImage(
  delivery: Pick<MediaDelivery, 'url'>,
  userId: string,
  asset: {
    id: string;
    status: string;
    renditions: unknown;
    width: number | null;
    height: number | null;
    blurhash: string | null;
  },
): Promise<PieceImage> {
  return {
    assetId: asset.id,
    status: asset.status as PieceImage['status'],
    width: asset.width,
    height: asset.height,
    blurhash: asset.blurhash,
    renditions: (await signedRenditions(delivery, userId, asset)).renditions,
  };
}
