'use client';

import { useApi } from '@robes/api-client/react';
import { wardrobe, you } from '@robes/copy';
import type { WardrobeLayout } from '@robes/core/wardrobe';
import { Icon } from '@robes/icons/web';
import { buttonClasses, SegmentedControl } from '@robes/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

export { AddCircle } from '../add-circle';

const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// Pieces | Wishlist only: the Inbox is a notice that shows while a receipt waits (Native parity
// handoff; the native twin is mobile/src/features/wardrobe/WardrobeHeader.tsx).
const VIEWS = [
  { value: '/wardrobe', label: wardrobe.segments.pieces },
  { value: '/wardrobe/wishlist', label: wardrobe.segments.wishlist },
] as const;
export type WardrobeView = (typeof VIEWS)[number]['value'];

// The tab's pinned toolbar (beta's header row): the segmented track and the framed + circle stay
// put under the app header while the grid scrolls; the receipt notice follows while one waits.
export function WardrobeHeader({ current, add }: { current: WardrobeView; add?: ReactNode }) {
  const router = useRouter();
  return (
    <header className="flex flex-col gap-3">
      <h1 className="sr-only">{wardrobe.title}</h1>
      <div className="sticky top-11 z-30 -mx-5 flex items-center justify-between gap-4 bg-bg px-5 py-1.5 md:top-16 md:mx-0 md:px-0">
        <SegmentedControl
          label={wardrobe.title}
          options={VIEWS}
          value={current}
          onChange={(href) => router.push(href)}
        />
        {add}
      </div>
      <InboxNotice />
    </header>
  );
}

// Shown only while a forwarded receipt waits (beta's receipt notice, Add Piece redline 05b): a
// cream card on a hairline that says what Robes read, and one hairline pill into the Inbox.
// The native twin is InboxNotice in mobile/src/features/wardrobe/WardrobeHeader.tsx.
function InboxNotice() {
  const { data } = useApi('inbox.list');
  const receipts = data?.items.length ?? 0;
  const pieces = data?.count ?? 0;
  if (receipts === 0 || pieces === 0) return null;
  return (
    <section
      aria-label={wardrobe.segments.inbox}
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-soft border border-hairline bg-surface py-2.5 pr-2.5 pl-4"
    >
      <p className="font-sans text-[13px] text-ink-muted">
        {wardrobe.inbox.notice(receipts)} · {you.receipts.waiting(pieces)}
      </p>
      <Link href="/wardrobe/inbox" className={buttonClasses({ variant: 'secondary' })}>
        {you.receipts.review(pieces)}
      </Link>
    </section>
  );
}

// The category tabs: 13px underline tabs on one hairline baseline, scrolling on a phone. "Other"
// isn't a place to browse to; its pieces stay under All (beta's sheet).
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
    ...categories.filter((c) => c !== 'Other').map((c) => ({ key: c, label: c })),
  ];
  return (
    <nav
      aria-label={wardrobe.header.categories}
      className="-mx-5 overflow-x-auto border-b border-hairline px-5 md:mx-0 md:px-0"
    >
      <ul className="flex min-w-max gap-5">
        {tabs.map((t) => {
          const on = t.key === value;
          return (
            <li key={t.key ?? 'all'}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onChange(t.key)}
                className={`-mb-px inline-flex min-h-10 items-center border-b-[1.5px] font-sans text-[13px] ${
                  on
                    ? 'border-ink font-medium text-ink'
                    : 'border-transparent text-ink-muted hover:text-ink'
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
    <div className="flex h-9 items-center justify-between gap-3">
      <p className="font-display text-[19px] font-light text-ink-faint italic" aria-live="polite">
        {count}
      </p>
      <div className="flex items-center gap-2">
        {filter ? (
          <button
            type="button"
            onClick={filter.onOpen}
            aria-pressed={filter.on}
            className={`relative inline-flex h-9 items-center gap-1.5 rounded-pill border bg-surface-raised px-3 font-sans text-xs after:absolute after:-inset-y-1 after:inset-x-0 ${
              filter.on ? 'border-selected-line text-ink' : 'border-rule-mid text-ink-muted'
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
