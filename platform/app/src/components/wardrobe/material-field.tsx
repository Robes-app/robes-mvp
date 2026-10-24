'use client';

import { wardrobe } from '@robes/copy';
import { DEFAULT_MATERIAL_FAMILY, familyOfMaterial, MATERIAL_FAMILIES } from '@robes/core/material';
import { Icon } from '@robes/icons/web';
import { pillClasses, Text } from '@robes/ui';
import { useState } from 'react';

const copy = wardrobe.material;

// Built like the colour picker (colour-field.tsx): the families as one scrolling row of chips,
// a hairline, then the family's materials as a list she picks one from. It opens on the family of
// what is filed (Natural when nothing is). A pick is the answer; "Not sure" files nothing.
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
  const fam = MATERIAL_FAMILIES.find((f) => f.id === family);
  return (
    <div className="flex flex-col gap-4">
      <ul
        aria-label={copy.families}
        className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none]"
      >
        {MATERIAL_FAMILIES.map((f) => (
          <li key={f.id} className="shrink-0">
            <button
              type="button"
              aria-pressed={f.id === family}
              onClick={() => setFamily(f.id)}
              className={`${pillClasses({ selected: f.id === family })} whitespace-nowrap`}
            >
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
        {fam?.materials.map((m) => {
          const on = m.id === value;
          return (
            // biome-ignore lint/a11y/useSemanticElements: a WAI-ARIA radio group of buttons; a native radio can't take the row styling. Every row is its own tab stop (no arrow-key selection), because a pick commits and closes the drawer.
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(m.id)}
              className={`flex min-h-11 items-center gap-3 rounded-crisp border px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${
                on ? 'border-selected-line bg-selected' : 'border-transparent hover:bg-surface'
              }`}
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <Text size="small">{m.name}</Text>
                {m.hint ? (
                  <Text size="caption" tone="muted">
                    {m.hint}
                  </Text>
                ) : null}
              </span>
              {on ? <Icon name="check" size={18} className="shrink-0 text-ink" /> : null}
            </button>
          );
        })}
      </div>
      {value ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`${pillClasses()} self-center`}
        >
          {copy.notSure}
        </button>
      ) : null}
    </div>
  );
}
