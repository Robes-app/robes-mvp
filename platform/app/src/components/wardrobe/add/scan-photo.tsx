import type { PieceBox } from '@robes/contracts';
import { scanCover, scanFrame, TAG_SPOTS } from '@robes/core/add-flow';

export interface ScanSource {
  url: string;
  width: number;
  height: number;
  box: PieceBox;
}

const pct = (n: number) => `${n * 100}%`;

function coverOf(source: ScanSource) {
  const c = scanCover(source);
  return { width: pct(c.width), height: pct(c.height), left: pct(c.left), top: pct(c.top) };
}

// Review's photograph (design 3a): the piece's own crop of her photo, filling a 4:5 frame, with
// the scan line sweeping it and the tags popping in one a step. No photo (a link) is a monogram.
// `scanning`: the read is still out — the line falls top to bottom, again and again, with a
// fading trail behind it (redline 01).
// Native twin: mobile/src/features/wardrobe/add/ScanPhoto.tsx.
export function ScanPhoto({
  source,
  monogram,
  step,
  tags,
  caption,
  alt,
  scanning = false,
}: {
  source: ScanSource | null;
  monogram: string;
  step: number;
  tags: readonly string[];
  caption: string;
  alt: string;
  scanning?: boolean;
}) {
  const frame = scanFrame(step);
  return (
    <div
      role="img"
      aria-label={alt}
      className="relative aspect-[4/5] w-full overflow-hidden rounded-soft border border-hairline bg-surface-sunk"
    >
      {source ? (
        // biome-ignore lint/performance/noImgElement: a local object URL of her own photo
        <img
          src={source.url}
          alt=""
          className="absolute max-w-none"
          style={coverOf(source)}
          draggable={false}
        />
      ) : (
        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center font-display text-7xl text-ink-faint"
        >
          {monogram.charAt(0).toUpperCase()}
        </span>
      )}
      {scanning ? (
        <span
          aria-hidden
          data-testid="scan-line"
          className="pointer-events-none absolute inset-x-0 top-0 h-8 border-accent-warm border-b bg-linear-to-b from-transparent to-accent-warm/15 motion-safe:animate-scan-down"
        />
      ) : frame.lineVisible ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 h-0.5 bg-accent-warm motion-safe:transition-[top] motion-safe:duration-300"
          style={{ top: `${frame.lineTop}%` }}
        />
      ) : null}
      {tags.map((label, i) => {
        const spot = TAG_SPOTS[i];
        if (!spot || frame.tagsShown <= i) return null;
        return (
          <span
            key={label}
            aria-hidden
            className="absolute max-w-[45%] truncate rounded-pill bg-bg px-3 py-1 font-sans text-ink text-xs motion-safe:animate-fade-in"
            style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
          >
            {label}
          </span>
        );
      })}
      {frame.ready && caption ? (
        <span className="absolute inset-x-0 bottom-0 truncate bg-bg/90 px-4 py-3 font-display text-ink text-lg italic">
          {caption}
        </span>
      ) : null}
    </div>
  );
}
