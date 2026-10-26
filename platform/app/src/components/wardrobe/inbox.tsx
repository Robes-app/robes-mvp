'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { InboxEntry } from '@robes/contracts';
import { wardrobe } from '@robes/copy';
import { receivedDay, toggleKept } from '@robes/core/inbox';
import { Icon } from '@robes/icons/web';
import {
  Button,
  CardSkeleton,
  EmptyState,
  ErrorText,
  Eyebrow,
  Heading,
  Text,
  useToast,
} from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useId, useState } from 'react';
import { errorCopy } from '@/lib/error-copy';

const copy = wardrobe.inbox;

function money(price: number | null, currency: string | null): string | null {
  if (price === null) return null;
  try {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: currency ?? 'EUR',
    }).format(price);
  } catch {
    return String(price);
  }
}

function receiptEyebrow(entry: InboxEntry, now?: Date): string {
  const day = receivedDay(entry.receivedAt, now);
  const when = day.kind === 'date' ? day.label : copy[day.kind];
  return entry.retailer ? `${copy.from(entry.retailer)} · ${when}` : when;
}

// One receipt (beta's receipt review, Add Piece redline 05c): every piece read from it, all
// ticked, and she unticks what went back. A resting row is white on a hairline; a ticked one
// takes the warm line and a ✓. The one ink pill, pinned above the tab bar, files the ticked
// pieces and counts them as she goes. Native twin: features/wardrobe/InboxView.tsx.
function Receipt({ entry, more }: { entry: InboxEntry; more: number }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const headingId = useId();
  const [keep, setKeep] = useState<number[]>(entry.items.map((i) => i.index));
  const decide = useApiMutation('inbox.decide', {
    onSuccess: (result) => {
      toast({ message: result.status === 'dismissed' ? copy.skipped : copy.filed });
      void Promise.all(
        (['inbox.list', 'today.get', 'wardrobe.list', 'wishlist.list'] as const).map((key) =>
          queryClient.invalidateQueries({ queryKey: queryKeys.route(key) }),
        ),
      );
    },
  });
  const file = (action: 'wardrobe' | 'wishlist' | 'dismiss') =>
    decide.mutate({ params: { id: entry.id }, input: { action, itemIndexes: keep } });

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <Eyebrow>{receiptEyebrow(entry)}</Eyebrow>
        <Heading level={2} size="lg" id={headingId}>
          {copy.read(entry.items.length)}
        </Heading>
        <Text size="small" tone="muted">
          {copy.untick}
        </Text>
      </header>
      <ul className="flex flex-col gap-2">
        {entry.items.map((item) => {
          const on = keep.includes(item.index);
          const meta = [item.brand, money(item.price, item.currency)].filter(Boolean).join(' · ');
          return (
            <li key={item.index}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => setKeep((k) => toggleKept(k, item.index))}
                className={`flex min-h-14 w-full items-center gap-3 rounded-soft border px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-2 ${on ? 'border-selected-line bg-selected' : 'border-hairline bg-surface-raised hover:border-border-control'}`}
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <Text>{item.label}</Text>
                  {meta ? (
                    <Text size="small" tone="muted">
                      {meta}
                    </Text>
                  ) : null}
                </span>
                <span
                  aria-hidden
                  className={`flex size-6 shrink-0 items-center justify-center rounded-pill border ${on ? 'border-selected-line text-ink' : 'border-border-control'}`}
                >
                  {on ? <Icon name="check" size={14} /> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {more > 0 ? (
        <Text size="small" tone="muted">
          {copy.more(more)}
        </Text>
      ) : null}
      {/* Pinned above the phone's tab bar so the action is always in view, however long the list. */}
      <div className="sticky bottom-[calc(max(env(safe-area-inset-bottom),12px)+76px)] z-30 -mx-5 flex flex-col gap-2 border-hairline border-t bg-bg px-5 pt-3 pb-3 md:bottom-0 md:mx-0 md:px-0">
        {decide.isError ? <ErrorText>{errorCopy(decide.error)}</ErrorText> : null}
        <Button
          variant="primary"
          block
          disabled={decide.isPending || keep.length === 0}
          onClick={() => file('wardrobe')}
        >
          {copy.file(keep.length)}
        </Button>
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="secondary"
            disabled={decide.isPending || keep.length === 0}
            onClick={() => file('wishlist')}
          >
            {copy.toWishlist}
          </Button>
          <Button variant="quiet" disabled={decide.isPending} onClick={() => file('dismiss')}>
            {copy.skip}
          </Button>
        </div>
      </div>
    </section>
  );
}

// Wardrobe › Inbox: forwarded receipts, one at a time (a pasted link goes straight to Review and
// never lands here).
export function Inbox() {
  const query = useApi('inbox.list');
  if (query.isError) {
    return <ErrorText>{errorCopy(query.error)}</ErrorText>;
  }
  if (!query.data) return <CardSkeleton />;
  const [first, ...rest] = query.data.items;
  if (!first) {
    return (
      <EmptyState
        title={wardrobe.inboxEmpty.title}
        body={wardrobe.inboxEmpty.body}
        action={
          <Link href="/wardrobe/receipt" className="underline underline-offset-4">
            {wardrobe.add.doors.receipt}
          </Link>
        }
      />
    );
  }
  return <Receipt key={first.id} entry={first} more={rest.length} />;
}
