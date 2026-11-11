'use client';

import type { PieceBox } from '@robes/contracts';
import { cropRegion } from '@robes/core/photo-pieces';

export interface Natural {
  width: number;
  height: number;
}

// The piece's own crop of her photo, drawn from the photo itself until the crop asset renders.
export function CropThumb({
  src,
  box,
  natural,
  className = 'size-16',
}: {
  src: string;
  box: PieceBox;
  natural: Natural | null;
  className?: string;
}) {
  const r = cropRegion(box);
  const aspect = natural ? (r.w * natural.width) / (r.h * natural.height) : 1;
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-crisp bg-surface-sunk ${className}`}
    >
      <span
        className="block max-h-full max-w-full"
        style={{
          aspectRatio: String(aspect),
          width: aspect >= 1 ? '100%' : 'auto',
          height: aspect >= 1 ? 'auto' : '100%',
          backgroundImage: `url("${src}")`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: `${100 / r.w}% ${100 / r.h}%`,
          backgroundPosition: `${r.w < 1 ? (r.x / (1 - r.w)) * 100 : 0}% ${r.h < 1 ? (r.y / (1 - r.h)) * 100 : 0}%`,
        }}
      />
    </span>
  );
}
