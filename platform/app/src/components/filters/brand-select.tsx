'use client';

import { wardrobe as copy } from '@robes/copy';
import { Icon } from '@robes/icons/web';
import { useId, useState } from 'react';

const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// The Front Door's BRAND select (PRD rev 3 §7.1a): a white field reading the brand in play ("All
// brands" at rest) with an up-down chevron; a click opens the list beneath — All brands, then every
// brand A–Z, the current one ticked — and a pick closes it. One brand at a time. Twin of native
// features/filters/BrandSelect.tsx.
export function BrandSelect({
  brands,
  value,
  onChange,
}: {
  brands: readonly string[];
  value: string | null;
  onChange: (brand: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const pick = (brand: string | null) => {
    onChange(brand);
    setOpen(false);
  };
  const options: Array<{ key: string; label: string; brand: string | null }> = [
    { key: 'all', label: copy.filter.allBrands, brand: null },
    ...brands.map((b) => ({ key: b, label: b, brand: b })),
  ];
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={copy.filter.brand}
        onClick={() => setOpen((o) => !o)}
        data-testid="brand-select"
        className={`flex min-h-11 items-center justify-between rounded-sm border-[0.5px] border-rule-mid bg-surface-raised px-3.5 font-sans text-[13px] text-ink ${focus}`}
      >
        {value ?? copy.filter.allBrands}
        <Icon name={open ? 'down' : 'sort'} size={14} className="text-ink-muted" />
      </button>
      {open ? (
        <ul
          id={listId}
          aria-label={copy.filter.brands}
          className="flex flex-col rounded-sm border-[0.5px] border-rule-mid bg-surface-raised"
        >
          {options.map((option, i) => {
            const on = option.brand === value;
            return (
              <li key={option.key} className={i === 0 ? undefined : 'border-hairline border-t'}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => pick(option.brand)}
                  className={`flex min-h-11 w-full items-center justify-between px-3.5 text-left font-sans text-[13px] text-ink ${on ? 'font-medium' : ''} ${focus}`}
                >
                  {option.label}
                  {on ? <Icon name="check" size={14} /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
