'use client';

import { useApi } from '@robes/api-client/react';
import { lookbook as copy } from '@robes/copy';
import { Button, Dialog } from '@robes/ui';
import { useRouter } from 'next/navigation';
import {
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  useState,
} from 'react';

// Robes' frame stands on a generic model until she has her own (legacy 0.4): the badge on the
// frame is the door to building it — and it opens a drawer, never a navigation, so an undecided
// deck is never thrown away by a tap.
// `stopTap`: on the deck's top card, where a tap that reached the card would be read as a keep,
// a pass or an open (legacy `stop`).
export function GenericModelBadge({ stopTap = false }: { stopTap?: boolean }) {
  const router = useRouter();
  const { data: model } = useApi('me.model.get');
  const [open, setOpen] = useState(false);
  if (!model || model.filed) return null;
  const stop = stopTap
    ? {
        onPointerDown: (e: ReactPointerEvent) => e.stopPropagation(),
        onPointerUp: (e: ReactPointerEvent) => e.stopPropagation(),
      }
    : {};
  return (
    <>
      <button
        type="button"
        aria-label={copy.deck.genericModelLabel}
        {...stop}
        onClick={(e: ReactMouseEvent) => {
          if (stopTap) e.stopPropagation();
          setOpen(true);
        }}
        className="absolute top-3 right-3 z-10 inline-flex min-h-11 items-center rounded-pill border border-hairline bg-bg/90 px-4 font-sans text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
      >
        {copy.deck.genericModel}
      </button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        eyebrow={copy.deck.twin.eyebrow}
        title={
          <>
            {copy.deck.twin.title} <em>{copy.deck.twin.titleEm}</em>
          </>
        }
        description={copy.deck.twin.body}
        footer={
          <>
            <Button variant="primary" onClick={() => router.push('/you/model')}>
              {copy.deck.twin.upload}
            </Button>
            <Button variant="quiet" onClick={() => setOpen(false)}>
              {copy.deck.twin.keep}
            </Button>
          </>
        }
      />
    </>
  );
}
