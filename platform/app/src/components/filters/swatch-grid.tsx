'use client';

import { COLOUR_FAMILIES } from '@robes/core/colour';
import { FamilyTile } from '@/components/wardrobe/colour-field';

const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// The Front Door's COLOUR section (PRD rev 3 §7.1a): a five-column grid of the thirteen colour
// families, each a 40px quartered swatch with its name beneath; picked = a 2px cream gap inside a
// 1.5px ink ring, the name in ink. Several at once. Twin of native features/filters/SwatchGrid.tsx.
export function SwatchGrid({
  selected,
  onToggle,
}: {
  selected: readonly string[];
  onToggle: (family: string) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-y-1">
      {COLOUR_FAMILIES.map((family) => {
        const on = selected.includes(family.id);
        return (
          <button
            key={family.id}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(family.id)}
            data-testid={`swatch-${family.id}`}
            className={`flex min-h-11 flex-col items-center gap-1.5 py-1.5 ${focus}`}
          >
            <span
              className={`rounded-[11px] p-[2px] ring-[1.5px] ${on ? 'ring-ink' : 'ring-transparent'}`}
            >
              <FamilyTile family={family} size={40} />
            </span>
            <span
              className={`font-sans text-[11px] ${on ? 'font-medium text-ink' : 'text-ink-muted'}`}
            >
              {family.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
