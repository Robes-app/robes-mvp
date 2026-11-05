'use client';

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
const row =
  'flex min-h-14 w-full items-center gap-3.5 border-t border-hairline px-1 text-left font-sans text-[13px] text-ink';
const disc =
  'flex size-10 shrink-0 items-center justify-center rounded-pill border border-rule-mid bg-surface text-ink';

// The `Robes model` tag (plan 2026-11-05 §1.3, design 3a/3b) on a look whose picture stands on a
// Robes model: a quiet chip on the photograph. Tapped, it pulls up a sheet — never a navigation,
// so an undecided deck is never thrown away — with Capture Selfie (the camera) and Adjust Robes
// Model (her model page). `stopTap`: on the deck's top card, where a tap that reached the card
// would be read as a keep, a pass or an open. Native twin: features/looks/RobesModelBadge.tsx.
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
  const [open, setOpen] = useState(false);
  if (!on) return null;
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
        aria-label={copy.deck.robesModelLabel}
        aria-haspopup="dialog"
        {...stop}
        onClick={(e: ReactMouseEvent) => {
          if (stopTap) e.stopPropagation();
          setOpen(true);
        }}
        className={`absolute top-3 right-3 z-10 inline-flex min-h-11 items-center rounded-pill border border-hairline bg-bg/90 px-3.5 font-sans text-[9.5px] text-ink uppercase tracking-[0.16em] ${focus}`}
      >
        {copy.deck.robesModel}
      </button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        eyebrow={copy.deck.twin.eyebrow}
        title={
          <>
            {copy.deck.twin.title} <em>{copy.deck.twin.titleEm}</em>
          </>
        }
      >
        <div className="flex flex-col" data-testid="robes-model-sheet">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              selfie.start();
            }}
            disabled={selfie.busy}
            className={`${row} ${focus}`}
            data-testid="robes-model-capture"
          >
            <span className={disc}>
              <Icon name="camera" size={17} />
            </span>
            <span className="flex-1">{copy.deck.twin.capture}</span>
            <Icon name="forward" size={15} className="text-ink-faint" />
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push('/you/model');
            }}
            className={`${row} border-b ${focus}`}
            data-testid="robes-model-adjust"
          >
            <span className={disc}>
              <Icon name="user" size={17} />
            </span>
            <span className="flex-1">{copy.deck.twin.adjust}</span>
            <Icon name="forward" size={15} className="text-ink-faint" />
          </button>
        </div>
      </Sheet>
      {selfie.field}
    </>
  );
}
