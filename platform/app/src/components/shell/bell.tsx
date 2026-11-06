'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { NotificationItem, Notifications } from '@robes/contracts';
import { bell as copy } from '@robes/copy';
import { Icon } from '@robes/icons/web';
import { Sheet } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// Where each line leads: receipts to the Wardrobe inbox, a diary nudge to that day on home, the
// overnight look to its page.
export function notificationHref(item: NotificationItem): string {
  if (item.kind === 'receipts') return '/wardrobe/inbox';
  if (item.kind === 'overnight') return `/today/looks/${item.lookId ?? ''}`;
  return `/?day=${item.date ?? ''}`;
}

// The bell (design 3k, plan §1.12): in the header beside the avatar, a 6pt ink dot while anything
// waits, and the count in its label (iOS navigation redline); its sheet lists each item as a card
// with where it leads and a × that dismisses it.
// The native twin is mobile/src/components/Bell.tsx.
export function Bell() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data } = useApi('notifications.list', undefined, { staleTime: 60_000 });
  const refresh = () =>
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('notifications.list') });
  const dismiss = useApiMutation('notifications.dismiss', { onSuccess: refresh, onError: refresh });
  const items = data?.items ?? [];
  // The card leaves at once; the server read follows.
  const dismissItem = (key: string) => {
    queryClient.setQueryData(queryKeys.call('notifications.list'), (old: unknown) => {
      const n = old as Notifications | undefined;
      return n ? { items: n.items.filter((i) => i.key !== key) } : old;
    });
    dismiss.mutate({ input: { key } });
  };
  return (
    <>
      <button
        type="button"
        aria-label={copy.openNew(items.length)}
        title={copy.open}
        onClick={() => setOpen(true)}
        data-testid="bell"
        data-alert={items.length > 0 ? 'true' : undefined}
        className={`relative flex size-11 items-center justify-center rounded-pill text-ink transition-colors duration-100 active:text-ink-muted ${focus}`}
      >
        <Icon name="bell" size={20} />
        {items.length ? (
          // 6 of ink inside a 1.5 ring of the page, at the glyph's shoulder.
          <span
            aria-hidden
            className="absolute top-[8.5px] right-[9.5px] size-[9px] rounded-pill border-[1.5px] border-bg bg-ink"
          />
        ) : null}
      </button>
      <Sheet title={copy.title} open={open} onOpenChange={setOpen}>
        {items.length === 0 ? (
          <p className="font-sans text-ink-muted text-xs" data-testid="bell-empty">
            {copy.empty}
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5" data-testid="bell-items">
            {items.map((item) => (
              <li key={item.key} className="flex items-center gap-2">
                <Link
                  href={notificationHref(item)}
                  onClick={() => setOpen(false)}
                  className={`flex min-w-0 flex-1 items-center gap-3 rounded-soft border border-hairline bg-surface-raised py-3 pr-3.5 pl-3 hover:border-selected-line ${focus}`}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-input bg-surface-sunk text-ink-muted">
                    <Icon
                      name={
                        item.kind === 'receipts'
                          ? 'receipt'
                          : item.kind === 'overnight'
                            ? 'looks'
                            : 'plan'
                      }
                      size={14}
                    />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-display text-base text-ink leading-tight">
                      {item.text}
                    </span>
                    <span className="mt-1 font-sans text-[9px] font-medium text-ink-faint uppercase tracking-[0.16em]">
                      {copy.dest[item.kind]}
                    </span>
                  </span>
                  <Icon name="forward" size={14} className="shrink-0 text-ink-muted" />
                </Link>
                <button
                  type="button"
                  aria-label={`${copy.dismiss}: ${item.text}`}
                  title={copy.dismiss}
                  onClick={() => dismissItem(item.key)}
                  className={`flex size-9 shrink-0 items-center justify-center rounded-pill border border-rule-mid bg-bg text-ink-faint hover:text-ink ${focus}`}
                >
                  <Icon name="close" size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </>
  );
}
