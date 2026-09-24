import type { IdeaFrame as Frame } from '@robes/contracts';
import { Button, Image, Skeleton } from '@robes/ui';
import { imageSources } from '@/lib/image';

// A 4:5 frame that holds its space from the first paint (UX: no layout shift).
export function IdeaFrame({
  frame,
  alt,
  priority = false,
  sizes,
  show,
}: {
  frame: Frame | undefined;
  alt: string;
  priority?: boolean;
  sizes: string;
  // Deferred or failed frames render on demand (UX-09).
  show?: { label: string; ariaLabel: string; busy: boolean; onShow: () => void };
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
  if ((frame?.status === 'deferred' || frame?.status === 'failed') && show) {
    return (
      <div
        data-frame={frame.status}
        className="flex aspect-[4/5] items-center justify-center rounded-crisp border border-hairline"
      >
        <Button
          variant="quiet"
          loading={show.busy}
          onClick={show.onShow}
          aria-label={show.ariaLabel}
        >
          {show.label}
        </Button>
      </div>
    );
  }
  if (frame?.status === 'failed' || frame?.status === 'deferred') {
    return <div aria-hidden className="aspect-[4/5] rounded-crisp bg-surface-sunk" />;
  }
  return <Skeleton data-frame="pending" className="aspect-[4/5]" />;
}
