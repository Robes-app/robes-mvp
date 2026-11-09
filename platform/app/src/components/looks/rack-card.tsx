'use client';

import { lookbook } from '@robes/copy';
import { Icon } from '@robes/icons/web';

const copy = lookbook.draftLook.rackCard;
const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// The Rack card (Front Door PRD rev 3 §4.6): before the first piece the Pieces tab opens straight
// onto this dashed card — the hanger on its warm column, YOUR WARDROBE, then the way in. With
// pieces in her wardrobe it reads "Pick from your wardrobe / Or let Robes style below" and › opens
// the Add Pieces picker; with none, "Add your pieces / Photo, link or receipt" and + opens the Add
// your pieces sheet. Once a piece hangs the card moves under the list as the add slot. Native
// twin: mobile/src/features/looks/RackCard.tsx.
export function RackCard({
  hasWardrobe,
  onClick,
  testId = 'rack-card',
}: {
  hasWardrobe: boolean;
  onClick: () => void;
  testId?: string;
}) {
  const title = hasWardrobe ? copy.pick : copy.add;
  const sub = hasWardrobe ? copy.orRobes : copy.ways;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={title}
      aria-description={sub}
      data-testid={testId}
      className={`flex w-full items-stretch overflow-hidden rounded-soft border border-dashed border-selected-line text-left hover:border-accent-warm ${focus}`}
    >
      <span className="flex w-[52px] shrink-0 items-center justify-center border-r border-dashed border-selected-line bg-selected text-accent-warm">
        <Icon name="wardrobe" size={18} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 py-3 pl-3.5">
        <span className="type-label text-accent-warm">{copy.eyebrow}</span>
        <span className="truncate font-display text-[19px] text-ink leading-6">{title}</span>
        <span className="truncate font-sans text-[13px] text-ink-muted">{sub}</span>
      </span>
      <span className="flex items-center pr-3">
        <span className="flex size-8 items-center justify-center rounded-pill bg-selected text-ink">
          <Icon name={hasWardrobe ? 'forward' : 'plus'} size={14} />
        </span>
      </span>
    </button>
  );
}
