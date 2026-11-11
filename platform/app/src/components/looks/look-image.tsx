import type { Look } from '@robes/contracts';
import { looks } from '@robes/copy';
import { type Aspect, aspects, Image } from '@robes/ui';
import { imageSources } from '@/lib/image';
import { localPreview } from '@/lib/local-previews';

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
  // A photograph she has just taken shows from the file in hand until its renditions are made
  // (a look from Home's Capture opens on it at once).
  const sources = image
    ? (imageSources(image.renditions) ?? previewSources(localPreview(image.assetId)))
    : null;
  if (!sources)
    return <div aria-hidden className={`${aspects[aspect]} rounded-crisp bg-surface-sunk`} />;
  return (
    <Image
      src={sources.src}
      {...(sources.srcSet ? { srcSet: sources.srcSet } : {})}
      sizes={sizes}
      alt={looks.page.imageAlt(look.name)}
      aspect={aspect}
      blurhash={image?.blurhash ?? null}
      priority={priority}
    />
  );
}

const previewSources = (src: string | null | undefined) => (src ? { src, srcSet: '' } : null);
