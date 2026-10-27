'use client';

import { wardrobe } from '@robes/copy';
import { DEFAULT_MATERIAL_FAMILY, familyOfMaterial, MATERIAL_FAMILIES } from '@robes/core/material';
import { Icon } from '@robes/icons/web';
import { pillClasses } from '@robes/ui';
import { useState } from 'react';
import { OptionRow, useScrollToChosen } from './colour-field';

const copy = wardrobe.material;

// Built like the colour picker (colour-field.tsx): the families as one scrolling row of chips,
// a hairline, then the family's materials as a list she picks one from. It opens on the family of
// what is filed (Natural when nothing is), scrolled to it; the chosen chip and row are warm with a
// check (redline 10). A pick is the answer; "Not sure" files nothing.
// The native twin is mobile/src/features/wardrobe/MaterialField.tsx.
export function MaterialPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (next: string | null) => void;
}) {
  const home = familyOfMaterial(value)?.id ?? null;
  const [family, setFamily] = useState(home ?? DEFAULT_MATERIAL_FAMILY);
  const chips = useScrollToChosen<HTMLUListElement>();
  const fam = MATERIAL_FAMILIES.find((f) => f.id === family);
  return (
    <div className="flex flex-col gap-4">
      <ul
        ref={chips}
        aria-label={copy.families}
        className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none]"
      >
        {MATERIAL_FAMILIES.map((f) => (
          <li key={f.id} className="shrink-0" data-chosen={f.id === family}>
            <button
              type="button"
              aria-pressed={f.id === family}
              onClick={() => setFamily(f.id)}
              className={`${pillClasses({ selected: f.id === family })} whitespace-nowrap`}
            >
              {f.id === family ? <Icon name="check" size={16} /> : null}
              {f.name}
              {/* Where her material lives, while she is looking at another family. */}
              {f.id === home && f.id !== family ? (
                <span aria-hidden className="size-1.5 rounded-pill bg-ink" />
              ) : null}
            </button>
          </li>
        ))}
      </ul>
      <div
        role="radiogroup"
        aria-label={fam?.name}
        className="flex flex-col border-hairline border-t pt-2"
      >
        {fam?.materials.map((m) => (
          // Every row is its own tab stop (no arrow-key selection), because a pick commits and
          // closes the drawer.
          <OptionRow
            key={m.id}
            role="radio"
            aria-checked={m.id === value}
            selected={m.id === value}
            label={m.name}
            hint={m.hint || null}
            onClick={() => onChange(m.id)}
          />
        ))}
      </div>
      {value ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`${pillClasses()} w-full justify-center`}
        >
          {copy.notSure}
        </button>
      ) : null}
    </div>
  );
}
