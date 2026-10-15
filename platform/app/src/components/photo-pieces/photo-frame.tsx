'use client';

import type { PieceBox } from '@robes/contracts';
import { photoPieces as copy } from '@robes/copy';
import { boxCentre, cropRegion, nudgeTags } from '@robes/core/photo-pieces';
import { type ReactNode, useCallback, useLayoutEffect, useRef, useState } from 'react';

export interface Natural {
  width: number;
  height: number;
}

export interface FrameTag {
  index: number;
  box: PieceBox;
  label: string;
}

// Her photo whole, with a numbered tag (or dot) at the centre of each piece still to answer,
// nudged clear of each other (Annie's live pass: tags piled up on a portrait photo).
export function PhotoFrame({
  src,
  tags,
  onNatural,
  dots = false,
  footer,
}: {
  src: string;
  tags: readonly FrameTag[];
  onNatural?: (natural: Natural) => void;
  dots?: boolean;
  footer?: ReactNode;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [placed, setPlaced] = useState<Record<number, { left: number; top: number }>>({});

  const place = useCallback(() => {
    const el = frame.current;
    if (!el) return;
    const width = el.clientWidth;
    const height = el.clientHeight;
    if (!width || !height) return;
    const nodes = [...el.querySelectorAll<HTMLElement>('[data-tag]')];
    const rects = nodes.map((node) => {
      const tag = tags.find((t) => String(t.index) === node.dataset.tag);
      const { cx, cy } = boxCentre(tag?.box ?? { x: 0, y: 0, w: 1, h: 1 });
      return { cx: cx * width, cy: cy * height, w: node.offsetWidth, h: node.offsetHeight };
    });
    const out = nudgeTags(rects, width, height);
    setPlaced(
      Object.fromEntries(
        nodes.map((node, i) => [
          Number(node.dataset.tag),
          { left: out[i]?.cx ?? 0, top: out[i]?.cy ?? 0 },
        ]),
      ),
    );
  }, [tags]);

  useLayoutEffect(place, [place]);

  return (
    <figure className="flex flex-col gap-2">
      <div ref={frame} className="relative mx-auto w-full max-w-md overflow-hidden rounded-crisp">
        {/* biome-ignore lint/performance/noImgElement: a local object URL of her own photo */}
        <img
          src={src}
          alt={copy.photoAlt}
          className="block h-auto w-full"
          onLoad={(e) => {
            onNatural?.({
              width: e.currentTarget.naturalWidth,
              height: e.currentTarget.naturalHeight,
            });
            place();
          }}
        />
        {tags.map((tag) => {
          const { cx, cy } = boxCentre(tag.box);
          const at = placed[tag.index];
          return (
            <span
              key={tag.index}
              data-tag={tag.index}
              role="img"
              aria-label={copy.tag(tag.index + 1, tag.label)}
              style={{
                left: at ? `${at.left}px` : `${cx * 100}%`,
                top: at ? `${at.top}px` : `${cy * 100}%`,
              }}
              className={`absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 whitespace-nowrap rounded-pill bg-bg/90 font-sans text-xs text-ink shadow-sm ${dots ? 'size-6 justify-center' : 'py-1 pr-2 pl-1'}`}
            >
              <b className="flex size-4 items-center justify-center rounded-pill bg-ink text-bg">
                {tag.index + 1}
              </b>
              {dots ? null : tag.label}
            </span>
          );
        })}
      </div>
      {footer}
    </figure>
  );
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
