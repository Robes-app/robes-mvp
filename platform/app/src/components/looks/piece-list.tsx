'use client';

import { Icon } from '@robes/icons/web';
import type { ReactNode } from 'react';

const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// The garments in a look as the Front Door canvas draws them (PRD §6.1): each row its own lifted
// card (RackRowCard), 3px apart. Under them the pill that adds from her wardrobe: the hanger and
// its words, which open the full piece picker (Annie, 27 Nov). Native twin:
// mobile/src/features/looks/PieceList.tsx.
export function PieceList({
  children,
  add,
  empty,
  label,
}: {
  children: ReactNode;
  add?: { label: string; onClick: () => void };
  empty?: ReactNode;
  label?: string;
}) {
  return (
    <div data-testid="piece-list" className="flex flex-col gap-2.5">
      <ul aria-label={label} className="flex flex-col gap-[3px] empty:hidden">
        {children}
      </ul>
      {empty}
      {add ? (
        <button
          type="button"
          onClick={add.onClick}
          data-testid="rack-add"
          className={`relative flex h-8 items-center justify-center gap-1.5 self-center rounded-pill bg-surface-sunk px-3.5 font-sans text-ink text-sm after:absolute after:-inset-1.5 after:content-[''] ${focus}`}
        >
          <Icon name="wardrobe" size={14} />
          {add.label}
        </button>
      ) : null}
    </div>
  );
}
