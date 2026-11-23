import { mediaKeys } from '@robes/media';
import type { MediaStorage } from '@robes/media/storage';

// The picture of a piece the drawing step is shown (cutout brief, 21 Nov 2026): the piece cut
// out of her photograph, on white, wherever one was stored; else the rectangle, as before. The
// rectangle carries whatever else was in the frame (her, the bed, the piece beside it) to the
// image model; the cutout carries the piece alone. Both are JPEGs. Every job that hands a
// piece's photograph to the image model reads it here.
export async function pieceReference(
  storage: Pick<MediaStorage, 'getObject'>,
  userId: string,
  assetId: string,
): Promise<Uint8Array | null> {
  const cutout = await storage
    .getObject(mediaKeys.cutoutReference(userId, assetId))
    .catch(() => null);
  return cutout ?? storage.getObject(mediaKeys.master(userId, assetId));
}
