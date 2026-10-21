import type { Piece } from '@robes/contracts';
import { wardrobe } from '@robes/copy';
import { Image, Skeleton } from '@robes/ui';
import { imageSources } from '@/lib/image';
import { localPreview } from '@/lib/local-previews';

export function PieceImage({
  piece,
  sizes,
  priority = false,
  className,
}: {
  piece: Pick<Piece, 'label' | 'image'> & { status?: Piece['status'] };
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const sources = piece.image ? imageSources(piece.image.renditions) : null;
  const local = sources ? null : localPreview(piece.image?.assetId);
  if (local) {
    return (
      <Image
        src={local}
        alt={wardrobe.photoAlt(piece.label)}
        aspect="4:5"
        {...(className ? { frameClassName: className } : {})}
      />
    );
  }
  if (!sources) {
    return piece.status === 'reading' ? (
      <Skeleton className={`aspect-[4/5] ${className ?? ''}`} />
    ) : (
      <div aria-hidden className={`aspect-[4/5] bg-surface-sunk ${className ?? ''}`} />
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
      {...(className ? { frameClassName: className } : {})}
    />
  );
}
