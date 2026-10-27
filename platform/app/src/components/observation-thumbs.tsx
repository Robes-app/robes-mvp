'use client';

import type { Observation } from '@robes/contracts';
import { twin } from '@robes/copy';
import { Icon } from '@robes/icons/web';
import { useDnaMutations } from '@/lib/use-dna';

const copy = twin.observations;

// An observation is hers to confirm: thumbs up files it under her Style DNA, down strikes it.
export function ObservationThumbs({ line }: { line: Observation }) {
  const { keep, dismiss } = useDnaMutations();
  const busy = keep.isPending || dismiss.isPending;
  const thumb = (icon: 'thumbsUp' | 'thumbsDown', label: string, onClick: () => void) => (
    <button
      type="button"
      disabled={busy}
      aria-label={label}
      title={label}
      onClick={onClick}
      className="relative flex size-[30px] items-center justify-center rounded-full border border-rule-mid text-ink-muted after:absolute after:-inset-[7px] after:content-[''] hover:border-border-control hover:text-ink disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
    >
      <Icon name={icon} size={14} />
    </button>
  );
  // Two 30px hairline circles at the card's foot, right (each a 44px target); native twin
  // mobile/src/features/you/ObservationThumbs.tsx.
  return (
    <div className="flex items-center justify-end gap-3.5">
      {thumb('thumbsUp', copy.answer(copy.keep, line.text), () =>
        keep.mutate({ params: { id: line.id } }),
      )}
      {thumb('thumbsDown', copy.answer(copy.notMe, line.text), () =>
        dismiss.mutate({ params: { id: line.id } }),
      )}
    </div>
  );
}
