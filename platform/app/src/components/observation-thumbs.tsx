'use client';

import type { Observation } from '@robes/contracts';
import { twin } from '@robes/copy';
import { IconButton } from '@robes/ui';
import { useDnaMutations } from '@/lib/use-dna';

const copy = twin.observations;

// An observation is hers to confirm: thumbs up files it under her Style DNA, down strikes it.
export function ObservationThumbs({ line }: { line: Observation }) {
  const { keep, dismiss } = useDnaMutations();
  const busy = keep.isPending || dismiss.isPending;
  return (
    <div className="flex items-center gap-2">
      <IconButton
        icon="thumbsUp"
        outlined
        disabled={busy}
        label={copy.answer(copy.keep, line.text)}
        onClick={() => keep.mutate({ params: { id: line.id } })}
      />
      <IconButton
        icon="thumbsDown"
        outlined
        disabled={busy}
        label={copy.answer(copy.notMe, line.text)}
        onClick={() => dismiss.mutate({ params: { id: line.id } })}
      />
    </div>
  );
}
