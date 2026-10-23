'use client';

import { useApi } from '@robes/api-client/react';
import { lookbook as copy } from '@robes/copy';
import Link from 'next/link';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';

// Robes' frame stands on a generic model until she has her own (legacy 0.4): the badge on the
// frame is the door to building it.
// `stopTap`: on the deck's top card, where a tap that reached the card would be read as a keep,
// a pass or an open (legacy `stop`).
export function GenericModelBadge({ stopTap = false }: { stopTap?: boolean }) {
  const { data: model } = useApi('me.model.get');
  if (!model || model.filed) return null;
  const stop = stopTap
    ? {
        onPointerDown: (e: ReactPointerEvent) => e.stopPropagation(),
        onPointerUp: (e: ReactPointerEvent) => e.stopPropagation(),
        onClick: (e: ReactMouseEvent) => e.stopPropagation(),
      }
    : {};
  return (
    <Link
      href="/you/model"
      aria-label={copy.deck.genericModelLabel}
      {...stop}
      className="absolute top-3 right-3 z-10 inline-flex min-h-11 items-center rounded-pill border border-hairline bg-bg/90 px-4 font-sans text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
    >
      {copy.deck.genericModel}
    </Link>
  );
}
