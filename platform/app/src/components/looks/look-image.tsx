import type { Look } from '@robes/contracts';
import { looks } from '@robes/copy';
import { type Aspect, aspects, Image } from '@robes/ui';
import { imageSources } from '@/lib/image';

// Robes' render when there is one, else the first piece's photo, else a quiet frame. The aspect
// is the surface's: 4:5 on the look page, 3:4 in the Lookbook grid and on a day (beta).
export function LookImage({
  look,
  sizes,
  priority = false,
  aspect = '4:5',
}: {
  look: Look;
  sizes: string;
  priority?: boolean;
  aspect?: Aspect;
}) {
  const image = look.image ?? look.pieces.find((p) => p.piece.image)?.piece.image ?? null;
  const sources = image ? imageSources(image.renditions) : null;
  if (!sources)
    return <div aria-hidden className={`${aspects[aspect]} rounded-crisp bg-surface-sunk`} />;
  return (
    <Image
      src={sources.src}
      srcSet={sources.srcSet}
      sizes={sizes}
      alt={looks.page.imageAlt(look.name)}
      aspect={aspect}
      blurhash={image?.blurhash ?? null}
      priority={priority}
    />
  );
}
