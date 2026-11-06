'use client';

import { lookbook } from '@robes/copy';
import { Icon } from '@robes/icons/web';
import type { ReactNode } from 'react';

const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// Felix's PieceList: the garments in a look as one `white` list on a 0.5px `rule-mid` edge, rows
// divided by 0.5px rules (each row is a RackRowCard). In edit mode the list takes the top corners
// and the dashed add row hangs underneath. Native twin: mobile/src/features/looks/PieceList.tsx.
export function PieceList({
  children,
  onAdd,
  empty,
  label,
}: {
  children: ReactNode;
  // Edit mode: the dashed + row under the list.
  onAdd?: () => void;
  empty?: ReactNode;
  label?: string;
}) {
  return (
    <div data-testid="piece-list">
      <ul
        aria-label={label}
        className={`divide-y divide-hairline overflow-hidden border-[0.5px] border-rule-mid bg-surface-raised ${onAdd ? 'rounded-t-soft' : 'rounded-soft'}`}
      >
        {children}
      </ul>
      {empty}
      {onAdd ? (
        <div className="flex justify-center border-border-control border-x-[0.5px] border-b border-dashed py-2.5">
          <button
            type="button"
            onClick={onAdd}
            aria-label={lookbook.rack.addPiece}
            className={`relative flex size-7 items-center justify-center rounded-pill bg-surface-sunk text-ink-muted after:absolute after:-inset-2 after:content-[''] hover:text-ink ${focus}`}
          >
            <Icon name="plus" size={13} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
