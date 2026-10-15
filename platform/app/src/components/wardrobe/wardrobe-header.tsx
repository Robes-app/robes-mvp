'use client';

import { wardrobe } from '@robes/copy';
import type { WardrobeLayout } from '@robes/core/wardrobe';
import { Icon } from '@robes/icons/web';
import { SegmentedControl } from '@robes/ui';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

export { AddCircle } from '../add-circle';

const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

const VIEWS = [
  { value: '/wardrobe', label: wardrobe.segments.pieces },
  { value: '/wardrobe/wishlist', label: wardrobe.segments.wishlist },
  { value: '/wardrobe/inbox', label: wardrobe.segments.inbox },
] as const;
export type WardrobeView = (typeof VIEWS)[number]['value'];

// Row 1 of the one header (legacy a268ef0/809b13e): the track and the circle, 32px under the nav.
export function WardrobeHeader({ current, add }: { current: WardrobeView; add?: ReactNode }) {
  const router = useRouter();
  return (
    <header className="flex flex-col gap-5 pt-2">
      <h1 className="sr-only">{wardrobe.title}</h1>
      <div className="flex items-center justify-between gap-4">
        <SegmentedControl
          label={wardrobe.title}
          options={VIEWS}
          value={current}
          onChange={(href) => router.push(href)}
        />
        {add}
      </div>
    </header>
  );
}

// The category tabs: 13px underline tabs on one hairline baseline, scrolling on a phone.
export function CategoryTabs({
  categories,
  value,
  onChange,
}: {
  categories: readonly string[];
  value: string | null;
  onChange: (category: string | null) => void;
}) {
  const tabs: Array<{ key: string | null; label: string }> = [
    { key: null, label: wardrobe.header.all },
    ...categories.map((c) => ({ key: c, label: c })),
  ];
  return (
    <nav
      aria-label={wardrobe.header.categories}
      className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0"
    >
      <ul className="flex min-w-max gap-[22px] border-b border-hairline">
        {tabs.map((t) => {
          const on = t.key === value;
          return (
            <li key={t.key ?? 'all'}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onChange(t.key)}
                className={`-mb-px inline-flex min-h-11 items-center border-b font-sans text-[13px] ${
                  on ? 'border-ink text-ink' : 'border-transparent text-ink-muted hover:text-ink'
                } ${focus}`}
              >
                {t.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// The count row: a FIXED 32pt so the grid never jumps between tabs.
export function CountRow({
  count,
  filter,
  layout,
  onLayout,
}: {
  count: string | null;
  filter?: { on: boolean; onOpen: () => void } | undefined;
  layout: WardrobeLayout | null;
  onLayout: (next: WardrobeLayout) => void;
}) {
  return (
    <div className="flex h-8 items-center justify-between gap-3">
      <p className="font-display text-[19px] font-normal text-ink-faint italic" aria-live="polite">
        {count}
      </p>
      <div className="flex items-center gap-2">
        {filter ? (
          <button
            type="button"
            onClick={filter.onOpen}
            aria-pressed={filter.on}
            className={`relative inline-flex h-8 items-center gap-2 rounded-pill border px-3.5 font-sans text-xs text-ink-muted after:absolute after:-inset-y-1.5 after:inset-x-0 ${
              filter.on ? 'border-border-control bg-surface-sunk' : 'border-hairline bg-bg'
            } ${focus}`}
          >
            <Icon name="filter" size={14} />
            {wardrobe.header.filter}
          </button>
        ) : null}
        {layout ? (
          <SegmentedControl
            size="sm"
            label={wardrobe.header.layout}
            options={[
              { value: 'grid', label: wardrobe.header.grid, icon: 'grid' },
              { value: 'list', label: wardrobe.header.list, icon: 'list' },
            ]}
            value={layout}
            onChange={onLayout}
          />
        ) : null}
      </div>
    </div>
  );
}
