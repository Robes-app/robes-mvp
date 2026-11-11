'use client';

import { lookbook } from '@robes/copy';
import { Icon } from '@robes/icons/web';
import type { ReactNode } from 'react';

const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// The garments in a look as the Front Door canvas draws them (PRD §6.1): each row its own lifted
// card (RackRowCard), 3px apart. On a saved look the small "+ hanger" chip under the list adds a
// piece. Native twin: mobile/src/features/looks/PieceList.tsx.
export function PieceList({
  children,
  onAdd,
  empty,
  label,
}: {
  children: ReactNode;
  // A saved look: the + hanger chip under the list.
  onAdd?: () => void;
  empty?: ReactNode;
  label?: string;
}) {
  return (
    <div data-testid="piece-list" className="flex flex-col gap-2.5">
      <ul aria-label={label} className="flex flex-col gap-[3px] empty:hidden">
        {children}
      </ul>
      {empty}
      {onAdd ? (
        <button
          type="button"
          onClick={onAdd}
          aria-label={lookbook.rack.addPiece}
          data-testid="rack-add"
          className={`relative flex h-7 items-center justify-center gap-1 self-center rounded-[6px] bg-surface-sunk px-2.5 text-ink-muted after:absolute after:-inset-2 after:content-[''] hover:text-ink ${focus}`}
        >
          <Icon name="plus" size={12} />
          <Icon name="wardrobe" size={14} />
        </button>
      ) : null}
    </div>
  );
}
