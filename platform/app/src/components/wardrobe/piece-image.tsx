import type { Piece } from '@robes/contracts';
import { wardrobe } from '@robes/copy';
import { Icon } from '@robes/icons/web';
import { Image, Skeleton } from '@robes/ui';
import { imageSources } from '@/lib/image';
import { localPreview } from '@/lib/local-previews';

// A piece with no picture — one Robes suggested, or hers with no photo yet — stands as a hanger
// on the sunk cream, so its tile reads as a piece without a photo and never as one still loading
// (testing, 14 Nov). Native twin: features/wardrobe/PieceCard.tsx NoPhoto.
export function NoPhoto({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <div
      aria-hidden
      data-testid="no-photo"
      className={`flex items-center justify-center bg-surface-sunk text-warm-line ${className ?? ''}`}
    >
      <Icon name="wardrobe" size={size} />
    </div>
  );
}

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
  // The piece cut out of her photograph, wherever one was made (cutout brief, 21 Nov): the whole
  // piece on white at every size, a small row thumb included. Without one, the photograph as
  // before. Native twin: features/wardrobe/PieceCard.tsx Photo.
  const cutout = piece.image?.cutout ?? null;
  if (cutout) {
    return (
      <Image
        src={cutout}
        alt={wardrobe.photoAlt(piece.label)}
        aspect={aspect}
        priority={priority}
        className="object-contain!"
        frameClassName={`bg-surface-raised! ${className ?? ''}`.trim()}
        data-cutout
      />
    );
  }
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
      <NoPhoto className={`${ratio} ${className ?? ''}`} />
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
