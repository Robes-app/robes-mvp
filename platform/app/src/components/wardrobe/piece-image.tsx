import type { Piece } from '@robes/contracts';
import { wardrobe } from '@robes/copy';
import { Image, Skeleton } from '@robes/ui';
import { imageSources } from '@/lib/image';
import { localPreview } from '@/lib/local-previews';

export function PieceImage({
  piece,
  sizes,
  priority = false,
  mat = false,
  contain = false,
  className,
}: {
  piece: Pick<Piece, 'label' | 'image'> & { status?: Piece['status'] };
  sizes: string;
  priority?: boolean;
  // A grid tile's photograph: the whole piece contained on a 3:4 white mat (beta's card).
  mat?: boolean;
  // The piece page's photograph: the whole piece contained on white in a 4:5 frame, never
  // cropped at the hem (beta's record card).
  contain?: boolean;
  className?: string;
}) {
  const aspect = mat ? '3:4' : '4:5';
  const ratio = mat ? 'aspect-3/4' : 'aspect-[4/5]';
  const onWhite = mat || contain;
  const frame = [onWhite ? 'bg-surface-raised!' : '', className ?? ''].filter(Boolean).join(' ');
  const fit = onWhite ? { className: 'object-contain!' } : {};
  const sources = piece.image ? imageSources(piece.image.renditions) : null;
  const local = sources ? null : localPreview(piece.image?.assetId);
  if (local) {
    return (
      <Image
        src={local}
        alt={wardrobe.photoAlt(piece.label)}
        aspect={aspect}
        {...fit}
        {...(frame ? { frameClassName: frame } : {})}
      />
    );
  }
  if (!sources) {
    return piece.status === 'reading' ? (
      <Skeleton className={`${ratio} ${className ?? ''}`} />
    ) : (
      <div aria-hidden className={`${ratio} bg-surface-sunk ${className ?? ''}`} />
    );
  }
  return (
    <Image
      src={sources.src}
      srcSet={sources.srcSet}
      sizes={sizes}
      alt={wardrobe.photoAlt(piece.label)}
      aspect={aspect}
      blurhash={piece.image?.blurhash ?? null}
      priority={priority}
      {...fit}
      {...(frame ? { frameClassName: frame } : {})}
    />
  );
}
