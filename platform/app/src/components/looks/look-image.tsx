import type { Look } from '@robes/contracts';
import { looks } from '@robes/copy';
import { Image } from '@robes/ui';
import { imageSources } from '@/lib/image';

// Robes' render when there is one, else the first piece's photo, else a quiet frame.
export function LookImage({
  look,
  sizes,
  priority = false,
}: {
  look: Look;
  sizes: string;
  priority?: boolean;
}) {
  const image = look.image ?? look.pieces.find((p) => p.piece.image)?.piece.image ?? null;
  const sources = image ? imageSources(image.renditions) : null;
  if (!sources) return <div aria-hidden className="aspect-[4/5] rounded-crisp bg-surface-sunk" />;
  return (
    <Image
      src={sources.src}
      srcSet={sources.srcSet}
      sizes={sizes}
      alt={looks.page.imageAlt(look.name)}
      aspect="4:5"
      blurhash={image?.blurhash ?? null}
      priority={priority}
    />
  );
}
