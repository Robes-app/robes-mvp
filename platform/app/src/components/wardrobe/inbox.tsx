'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { InboxEntry } from '@robes/contracts';
import { wardrobe } from '@robes/copy';
import { Button, CardSkeleton, EmptyState, Text, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
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

function Entry({ entry }: { entry: InboxEntry }) {
  const queryClient = useQueryClient();
  const toast = useToast();
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
    <li className="flex flex-col gap-3 border-b border-hairline py-4">
      {entry.retailer ? (
        <Text size="small" tone="muted">
          {copy.from(entry.retailer)}
        </Text>
      ) : null}
      <ul className="flex flex-col gap-2">
        {entry.items.map((item) => (
          <li key={item.index}>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 size-5"
                checked={keep.includes(item.index)}
                aria-label={copy.keep(item.label)}
                onChange={(e) =>
                  setKeep((k) =>
                    e.target.checked ? [...k, item.index] : k.filter((i) => i !== item.index),
                  )
                }
              />
              <span className="flex flex-col">
                <Text>{item.label}</Text>
                <Text size="small" tone="muted">
                  {[item.brand, money(item.price, item.currency)].filter(Boolean).join(' · ')}
                </Text>
              </span>
            </label>
          </li>
        ))}
      </ul>
      {decide.isError ? (
        <Text role="alert" tone="danger">
          {errorCopy(decide.error)}
        </Text>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={decide.isPending || keep.length === 0}
          onClick={() => file('wardrobe')}
        >
          {copy.toWardrobe}
        </Button>
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
    </li>
  );
}

// Wardrobe › Inbox (M3 task 4): pasted links (and later receipts) waiting for a yes or no.
export function Inbox() {
  const query = useApi('inbox.list');
  if (query.isError) {
    return (
      <Text role="alert" tone="danger">
        {errorCopy(query.error)}
      </Text>
    );
  }
  if (!query.data) return <CardSkeleton />;
  if (query.data.items.length === 0) {
    return (
      <EmptyState
        title={wardrobe.inboxEmpty.title}
        body={wardrobe.inboxEmpty.body}
        action={
          <Link href="/wardrobe/link" className="underline underline-offset-4">
            {wardrobe.link.eyebrow}
          </Link>
        }
      />
    );
  }
  return (
    <ul aria-label={wardrobe.segments.inbox} className="flex flex-col">
      {query.data.items.map((entry) => (
        <Entry key={entry.id} entry={entry} />
      ))}
    </ul>
  );
}
