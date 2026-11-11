'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { NotificationItem, NotificationKind, Notifications } from '@robes/contracts';
import { bell as copy } from '@robes/copy';
import { Icon } from '@robes/icons/web';
import { Sheet } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// Each kind's glyph (Felix NotificationsSheet): a receipt, the diary's calendar, and the overnight
// look's `looks`.
const ICON = {
  receipts: 'receipt',
  diary: 'calendar',
  overnight: 'looks',
} as const satisfies Record<NotificationKind, string>;

// Where each line leads: receipts to the Wardrobe inbox, a diary nudge to that day on home, the
// overnight look to its page.
export function notificationHref(item: NotificationItem): string {
  if (item.kind === 'receipts') return '/wardrobe/inbox';
  if (item.kind === 'overnight') return `/today/looks/${item.lookId ?? ''}`;
  return `/?day=${item.date ?? ''}`;
}

// What waits behind the bell, shared with Settings' Notifications row ("2 new").
export function useNotifications() {
  return useApi('notifications.list', undefined, { staleTime: 60_000 });
}

// The bell (design 3k, plan §1.12; PRD rev 3 §2.2): Felix's 36px bell beside the avatar, the 17px
// glyph at 1.2, a 7px rose dot and the count in its label; its hit area reaches 44. It stands only
// while something waits — with nothing new there is no bell (the Settings row still lists
// Notifications). The native twin is mobile/src/components/Bell.tsx.
export function Bell() {
  const [open, setOpen] = useState(false);
  const { data } = useNotifications();
  const count = data?.items.length ?? 0;
  if (count === 0 && !open) return null;
  return (
    <>
      <button
        type="button"
        aria-label={copy.openNew(count)}
        title={copy.open}
        onClick={() => setOpen(true)}
        data-testid="bell"
        data-alert={count > 0 ? 'true' : undefined}
        className={`relative flex size-9 items-center justify-center rounded-pill text-ink transition-colors duration-100 active:text-ink-muted after:absolute after:-inset-1 after:content-[''] ${focus}`}
      >
        <Icon name="bell" size={17} stroke={1.2} />
        {count ? (
          // Felix's 7px rose dot (a 1.5 ring of the page), at the glyph's shoulder.
          <span
            aria-hidden
            className="absolute top-2 right-[9px] size-[7px] rounded-pill border-[1.5px] border-bg bg-accent-inspire"
          />
        ) : null}
      </button>
      <NotificationsSheet open={open} onOpenChange={setOpen} items={data?.items ?? []} />
    </>
  );
}

// Felix's NotificationsSheet: the drawer header (× · Notifications · ✓), then each item as a card
// — its glyph on a `cream-200` tile, the task in Cormorant 16, where it leads as a tracked line,
// a › — with a × beside it that dismisses it. The ✓ clears them all (PRD rev 3 §10 12, over
// "Done only closes" of 6 Nov); × and the scrim close without touching them. A dismissed receipts
// line leaves the receipts themselves waiting in the Wardrobe. Native twin:
// mobile/src/components/Bell.tsx.
function NotificationsSheet({
  open,
  onOpenChange,
  items,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: readonly NotificationItem[];
}) {
  const queryClient = useQueryClient();
  const refresh = () =>
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('notifications.list') });
  const dismiss = useApiMutation('notifications.dismiss', { onSuccess: refresh, onError: refresh });
  // The card leaves at once; the server read follows.
  const dismissItem = (key: string) => {
    queryClient.setQueryData(queryKeys.call('notifications.list'), (old: unknown) => {
      const n = old as Notifications | undefined;
      return n ? { items: n.items.filter((i) => i.key !== key) } : old;
    });
    dismiss.mutate({ input: { key } });
  };
  // The ✓: every card goes and the sheet closes behind them.
  const dismissAll = () => {
    if (items.length > 0) {
      queryClient.setQueryData(queryKeys.call('notifications.list'), { items: [] });
      dismiss.mutate({ input: { all: true } });
    }
    onOpenChange(false);
  };
  return (
    <Sheet
      title={copy.title}
      open={open}
      onOpenChange={onOpenChange}
      done={{
        label: copy.clear,
        onClick: dismissAll,
        disabled: items.length === 0,
        testId: 'bell-done',
      }}
    >
      {items.length === 0 ? (
        <p className="-mt-1 font-sans text-ink-muted text-xs" data-testid="bell-empty">
          {copy.empty}
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5" data-testid="bell-items">
          {items.map((item) => (
            <li key={item.key} className="flex items-center gap-2">
              <Link
                href={notificationHref(item)}
                onClick={() => onOpenChange(false)}
                className={`flex min-w-0 flex-1 items-center gap-3 rounded-soft border border-hairline bg-surface-raised py-3 pr-3.5 pl-3 hover:border-selected-line ${focus}`}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-input bg-surface-sunk text-ink-muted">
                  <Icon name={ICON[item.kind]} size={14} stroke={1.3} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-display text-base text-ink leading-tight">{item.text}</span>
                  <span className="mt-[5px] font-sans text-[9px] font-medium text-ink-faint uppercase tracking-[0.16em]">
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
                className={`relative flex size-9 shrink-0 items-center justify-center rounded-pill border-[0.5px] border-rule-mid bg-bg text-ink-faint after:absolute after:-inset-1 after:content-[''] hover:text-ink ${focus}`}
              >
                <Icon name="close" size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
