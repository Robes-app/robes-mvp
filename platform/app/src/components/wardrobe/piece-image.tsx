import type { Piece } from '@robes/contracts';
import { wardrobe } from '@robes/copy';
import { Image, Skeleton } from '@robes/ui';
import { imageSources } from '@/lib/image';

export function PieceImage({
  piece,
  sizes,
  priority = false,
}: {
  piece: Piece;
  sizes: string;
  priority?: boolean;
}) {
  const sources = piece.image ? imageSources(piece.image.renditions) : null;
  if (!sources) {
    return piece.status === 'reading' ? (
      <Skeleton className="aspect-[4/5]" />
    ) : (
      <div aria-hidden className="aspect-[4/5] bg-surface-sunk" />
    );
  }
  return (
    <Image
      src={sources.src}
      srcSet={sources.srcSet}
      sizes={sizes}
      alt={wardrobe.photoAlt(piece.label)}
      aspect="4:5"
      blurhash={piece.image?.blurhash ?? null}
      priority={priority}
    />
  );
}
