import type { IdeaFrame as Frame } from '@robes/contracts';
import { Image, Skeleton } from '@robes/ui';
import { imageSources } from '@/lib/image';

// A 4:5 frame that holds its space from the first paint (UX: no layout shift).
export function IdeaFrame({
  frame,
  alt,
  priority = false,
  sizes,
}: {
  frame: Frame | undefined;
  alt: string;
  priority?: boolean;
  sizes: string;
}) {
  const sources = frame?.image ? imageSources(frame.image.renditions) : null;
  if (frame?.status === 'ready' && sources) {
    return (
      <Image
        src={sources.src}
        srcSet={sources.srcSet}
        sizes={sizes}
        alt={alt}
        aspect="4:5"
        blurhash={frame.image?.blurhash ?? null}
        priority={priority}
      />
    );
  }
  if (frame?.status === 'failed') {
    return <div aria-hidden className="aspect-[4/5] rounded-crisp bg-surface-sunk" />;
  }
  return <Skeleton data-frame="pending" className="aspect-[4/5]" />;
}
