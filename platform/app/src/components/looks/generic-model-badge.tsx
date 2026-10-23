'use client';

import { useApi } from '@robes/api-client/react';
import { lookbook as copy } from '@robes/copy';
import Link from 'next/link';

// Robes' frame stands on a generic model until she has her own (legacy 0.4): the badge on the
// frame is the door to building it.
export function GenericModelBadge() {
  const { data: model } = useApi('me.model.get');
  if (!model || model.filed) return null;
  return (
    <Link
      href="/you/model"
      aria-label={copy.deck.genericModelLabel}
      className="absolute top-3 right-3 inline-flex min-h-11 items-center rounded-pill border border-hairline bg-bg/90 px-4 font-sans text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
    >
      {copy.deck.genericModel}
    </Link>
  );
}
