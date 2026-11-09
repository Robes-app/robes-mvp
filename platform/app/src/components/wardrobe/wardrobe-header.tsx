'use client';

import { useApi } from '@robes/api-client/react';
import { wardrobe, you } from '@robes/copy';
import type { WardrobeLayout } from '@robes/core/wardrobe';
import { buttonClasses, SegmentedControl, Tabs } from '@robes/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

export { AddCircle } from '../add-circle';

// Owned · Wishlist · Shop: Shop stands disabled until the Shop PRD lands (plan R10). The Inbox is a
// notice that shows while a receipt waits. The native twin is
// mobile/src/features/wardrobe/WardrobeHeader.tsx.
const VIEWS = [
  { value: '/wardrobe', label: wardrobe.segments.owned },
  { value: '/wardrobe/wishlist', label: wardrobe.segments.wishlist },
] as const;
export type WardrobeView = (typeof VIEWS)[number]['value'];
const TABS = [wardrobe.segments.owned, wardrobe.segments.wishlist, wardrobe.segments.shop] as const;

// The tab's pinned toolbar (Front Door PRD rev 3 §7.1): underline tabs with their glyphs and the
// framed + at the right, under the app header while the grid scrolls; the receipt notice follows
// while one waits.
export function WardrobeHeader({
  current,
  add,
  children,
}: {
  current: WardrobeView;
  add?: ReactNode;
  // The filter row, pinned with the tabs.
  children?: ReactNode;
}) {
  const router = useRouter();
  return (
    <header className="flex flex-col gap-3">
      <h1 className="sr-only">{wardrobe.title}</h1>
      <div className="sticky top-11 z-30 -mx-5 flex flex-col gap-3 bg-bg px-5 pt-1.5 pb-3 md:top-16 md:mx-0 md:px-0">
        <Tabs
          items={TABS}
          value={VIEWS.find((v) => v.value === current)?.label ?? wardrobe.segments.owned}
          onChange={(label) =>
            router.push(VIEWS.find((v) => v.label === label)?.value ?? '/wardrobe')
          }
          label={wardrobe.title}
          icons={{
            [wardrobe.segments.owned]: 'wardrobe',
            [wardrobe.segments.wishlist]: 'heart',
            [wardrobe.segments.shop]: 'bag',
          }}
          disabled={[wardrobe.segments.shop]}
          trailing={add}
        />
        {children}
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
      <Link href="/wardrobe/inbox" className={buttonClasses({ variant: 'outline' })}>
        {you.receipts.review(pieces)}
      </Link>
    </section>
  );
}

// The count row: a FIXED 32pt so the grid never jumps between tabs; the count and the grid | list
// toggle (the Filter moved into the row of chips, PRD §7.1).
export function CountRow({
  count,
  layout,
  onLayout,
}: {
  count: string | null;
  layout: WardrobeLayout | null;
  onLayout: (next: WardrobeLayout) => void;
}) {
  return (
    <div className="flex h-9 items-center justify-between gap-3">
      <p className="font-display font-light text-[19px] text-ink-faint italic" aria-live="polite">
        {count}
      </p>
      {layout ? <LayoutToggle layout={layout} onLayout={onLayout} /> : null}
    </div>
  );
}

// The small grid | list control, the wardrobe's and The Rack's (Front Door PRD rev 3 §4.6).
export function LayoutToggle({
  layout,
  onLayout,
}: {
  layout: WardrobeLayout;
  onLayout: (next: WardrobeLayout) => void;
}) {
  return (
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
  );
}
