'use client';

import { wardrobe } from '@robes/copy';
import { DEFAULT_MATERIAL_FAMILY, familyOfMaterial, MATERIAL_FAMILIES } from '@robes/core/material';
import { FamilyList } from './colour-field';

const copy = wardrobe.material;

// The material families as a FamilyList (canvas 3b), the same list as the colours without the
// tiles: it opens on the family of what is filed (Natural when nothing is), a pick is the answer.
// "Not sure" sits under the card and is the warm one while nothing is filed.
// The native twin is mobile/src/features/wardrobe/MaterialField.tsx.
export function MaterialPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (next: string | null) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <FamilyList
        initial={familyOfMaterial(value)?.id ?? DEFAULT_MATERIAL_FAMILY}
        itemRole="radio"
        groups={MATERIAL_FAMILIES.map((f) => ({
          id: f.id,
          name: f.name,
          items: f.materials.map((m) => ({
            id: m.id,
            name: m.name,
            hint: m.hint || null,
            selected: m.id === value,
            onPick: () => onChange(m.id),
          })),
        }))}
      />
      <button
        type="button"
        aria-pressed={value === null}
        onClick={() => onChange(null)}
        className={`flex min-h-11 w-full items-center justify-center rounded-pill border font-sans text-ink-muted text-sm focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${
          value === null ? 'border-selected-line bg-selected' : 'border-rule-mid bg-surface-raised'
        }`}
      >
        {copy.notSure}
      </button>
    </div>
  );
}
