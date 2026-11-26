'use client';

import { lookbook as copy } from '@robes/copy';
import { Text } from '@robes/ui';
import { useState } from 'react';
import { useLooksByStatus, useSaveLook } from '@/lib/look-states';
import { DeleteSuggestion } from './delete-suggestion';
import { SuggestedTile } from './look-tiles';

// The piece page's "Robes suggested" rail (legacy F11): the looks styled around this piece, with
// each the suggested card (Save look · Delete look on its long press). Nothing renders when there
// are none. Native twin: SuggestedRail.tsx.
export function SuggestedRail({ pieceId }: { pieceId: string }) {
  const { data } = useLooksByStatus('suggested', { anchorPieceId: pieceId });
  const save = useSaveLook(undefined, 'suggested');
  const [deleting, setDeleting] = useState<string | null>(null);
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
              onSave={() => save.mutate({ params: { id: look.id }, input: {} })}
              onDelete={() => setDeleting(look.id)}
            />
          </li>
        ))}
      </ul>
      <DeleteSuggestion id={deleting} onClose={() => setDeleting(null)} />
    </section>
  );
}
