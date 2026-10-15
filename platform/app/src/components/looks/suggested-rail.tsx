'use client';

import { lookbook as copy } from '@robes/copy';
import { Text } from '@robes/ui';
import { useLetGo, useLooksByStatus, useRestyle } from '@/lib/look-states';
import { SuggestedTile } from './look-tiles';

// The piece page's "Robes suggested" rail (legacy F11): the looks styled around this piece, with
// ✕ and ↻ and no corner mark (the piece is the page). Nothing renders when there are none.
export function SuggestedRail({ pieceId }: { pieceId: string }) {
  const { data } = useLooksByStatus('suggested', { anchorPieceId: pieceId });
  const restyle = useRestyle();
  const letGo = useLetGo();
  const items = data?.items ?? [];
  if (items.length === 0) return null;
  return (
    <section
      aria-labelledby="suggested-rail"
      className="flex flex-col gap-2"
      data-testid="suggested-rail"
    >
      <Text id="suggested-rail" size="caption" tone="muted" className="uppercase tracking-wider">
        {copy.pieceRail}
      </Text>
      <ul className="flex gap-3 overflow-x-auto pb-1">
        {items.map((look) => (
          <li key={look.id} className="w-44 shrink-0">
            <SuggestedTile
              look={look}
              showMark={false}
              onRemove={() => letGo(look.id)}
              onSwap={() => restyle.restyle(look.id)}
              swapping={restyle.busyId === look.id}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
