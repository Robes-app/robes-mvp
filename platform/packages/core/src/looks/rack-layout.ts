import type { WardrobeLayout } from '../wardrobe';

// A look's Rack opens on its pieces' photographs when Robes made the look, and on the list when she
// built it (Annie, 16 Nov). The tiles only read when the pieces have photographs: once more than
// two in five have none (a Shop proposal often has none yet) a wall of hangers is worse than the
// list, which still names each piece, so the Rack opens on the list (Annie, 18 Nov). Her own pick on
// the toggle always stands over this.
export const MISSING_PHOTO_SHARE = 2 / 5;

// A piece's image as both clients hold it: none, or one whose status says whether it will show.
// A pending one is on its way (the skeleton, then the photograph); a failed one never shows.
type RackImage = { status: 'pending' | 'ready' | 'failed' } | null | undefined;

export function rackLayoutFor(
  composedByRobes: boolean,
  images: readonly RackImage[],
): WardrobeLayout {
  if (!composedByRobes || images.length === 0) return 'list';
  const missing = images.filter((image) => !image || image.status === 'failed').length;
  return missing / images.length > MISSING_PHOTO_SHARE ? 'list' : 'grid';
}
