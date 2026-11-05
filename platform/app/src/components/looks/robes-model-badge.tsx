'use client';

import { useApi } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { lookbook as copy } from '@robes/copy';
import { Icon } from '@robes/icons/web';
import { Sheet } from '@robes/ui';
import { useRouter } from 'next/navigation';
import {
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  useState,
} from 'react';
import { useSelfie } from '@/lib/use-selfie';

const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';
// The sheet's two rows (redlines 2026-11-05): equal, boxed, transparent, the serif title.
const row = `flex min-h-[62px] w-full items-center gap-3.5 rounded-soft px-4 py-3 text-left font-display text-ink text-lg leading-tight ${focus}`;

// The `Robes model` tag (plan 2026-11-05 §1.3, design 3a/3b; redlines 2026-11-05) on a saved
// look whose picture stands on a Robes model: a 28px glass pill, top-right of the picture — a dot,
// the words, a chevron — in a 44px hit area. Tapped, it pulls up the floating sheet — never a
// navigation, so an undecided deck is never thrown away — with Capture Selfie (the camera or her
// photos) and Adjust Robes Model (her model page, with her current model's thumbnail). `stopTap`:
// on the deck's top card, where a tap that reached the card would be read as a keep, a pass or an
// open. Native twin: features/looks/RobesModelBadge.tsx.
export function RobesModelBadge({
  look,
  on = look?.onRobesModel ?? false,
  stopTap = false,
}: {
  look?: Look;
  // An empty draft has no picture yet: the tag follows the stand she is about to be dressed on.
  on?: boolean;
  stopTap?: boolean;
}) {
  const router = useRouter();
  const selfie = useSelfie();
  const model = useApi('me.model.get', undefined, { enabled: on });
  const [open, setOpen] = useState(false);
  if (!on) return null;
  const stop = stopTap
    ? {
        onPointerDown: (e: ReactPointerEvent) => e.stopPropagation(),
        onPointerUp: (e: ReactPointerEvent) => e.stopPropagation(),
      }
    : {};
  const thumb = model.data?.stand?.imageUrl ?? null;
  return (
    <>
      <button
        type="button"
        aria-label={copy.deck.robesModelLabel}
        aria-haspopup="dialog"
        {...stop}
        onClick={(e: ReactMouseEvent) => {
          if (stopTap) e.stopPropagation();
          setOpen(true);
        }}
        className={`absolute top-3 right-3 z-10 flex h-7 items-center gap-2 rounded-pill bg-glass pr-2.5 pl-3 backdrop-blur-[22px] after:absolute after:-inset-x-1 after:-inset-y-2 after:content-[''] ${focus}`}
      >
        <span aria-hidden className="size-1.5 shrink-0 rounded-pill bg-ink-faint" />
        <span className="app-caps text-ink">{copy.deck.robesModel}</span>
        <Icon name="forward" size={12} className="shrink-0 text-ink-muted" />
      </button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        floating
        eyebrow={copy.deck.twin.eyebrow}
        eyebrowTone="warm"
        title={`${copy.deck.twin.title} ${copy.deck.twin.titleEm}`}
      >
        <div className="flex flex-col gap-2.5" data-testid="robes-model-sheet">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              selfie.start();
            }}
            disabled={selfie.busy}
            className={`${row} border border-border-warm border-dashed`}
            data-testid="robes-model-capture"
          >
            <Icon name="selfie" size={20} className="shrink-0 text-ink-muted" />
            <span className="flex-1">{copy.deck.twin.capture}</span>
            <Icon name="forward" size={16} className="shrink-0 text-ink-muted" />
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push('/you/model');
            }}
            className={`${row} border-[0.5px] border-hairline-strong`}
            data-testid="robes-model-adjust"
          >
            {thumb ? (
              // biome-ignore lint/performance/noImgElement: a catalog portrait, fixed frame
              <img
                src={thumb}
                alt=""
                className="h-[25px] w-5 shrink-0 rounded-[2px] object-cover object-[50%_12%]"
              />
            ) : (
              <Icon name="user" size={20} className="shrink-0 text-ink-muted" />
            )}
            <span className="flex-1">{copy.deck.twin.adjust}</span>
            <Icon name="forward" size={16} className="shrink-0 text-ink-muted" />
          </button>
        </div>
      </Sheet>
      {selfie.field}
    </>
  );
}
