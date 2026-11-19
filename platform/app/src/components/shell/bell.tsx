'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { BellCard, BellCardKind, Notifications } from '@robes/contracts';
import { bell as copy } from '@robes/copy';
import { Icon } from '@robes/icons/web';
import { Sheet } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { useAnalytics } from '@/components/analytics-provider';

const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// Each kind's glyph (Felix NotificationsSheet; design "Onboarding notifications", 19 Nov).
const ICON = {
  twin: 'user',
  dna: 'dna',
  observations: 'eye',
  receipts: 'receipt',
  diary: 'calendar',
  overnight: 'looks',
} as const satisfies Record<BellCardKind, string>;

// Where each card leads: the twin to You › Model, Style DNA to its first missing answer,
// Observations to theirs, receipts to the Wardrobe inbox, a diary nudge to that day on home, the
// overnight look to its page.
export function notificationHref(card: BellCard): string {
  if (card.kind === 'twin') return '/you/model';
  if (card.kind === 'dna') return card.section ? `/you/style?open=${card.section}` : '/you/style';
  if (card.kind === 'observations') return '/you/observations';
  if (card.kind === 'receipts') return '/wardrobe/inbox';
  if (card.kind === 'overnight') return `/today/looks/${card.lookId ?? ''}`;
  return `/?day=${card.date ?? ''}`;
}

// What waits behind the bell, shared with Settings' Notifications row ("2 new").
export function useNotifications() {
  return useApi('notifications.list', undefined, { staleTime: 60_000 });
}

// The cards she has not seen yet: they light the dot and make the count (design 19 Nov).
export const unseenCount = (data: Notifications | undefined): number =>
  data?.cards.filter((c) => !c.seen).length ?? 0;

// The bell (design 3k, plan §1.12; PRD rev 3 §2.2): Felix's 36px bell beside the avatar, the 17px
// glyph at 1.2, a 7px rose dot and the count in its label; its hit area reaches 44. It stands only
// while something waits — with nothing there is no bell (the Settings row still lists
// Notifications). The dot and the count are the cards she hasn't seen; opening the sheet sees them
// all (design 19 Nov). The native twin is mobile/src/components/Bell.tsx.
export function Bell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { track } = useAnalytics().analytics;
  const { data } = useNotifications();
  const cards = data?.cards ?? [];
  const count = unseenCount(data);
  const seen = useApiMutation('notifications.seen');
  if (cards.length === 0 && !open) return null;
  return (
    <>
      <button
        type="button"
        aria-label={copy.openNew(count)}
        title={copy.open}
        onClick={() => {
          setOpen(true);
          track('bell_opened', { unseen: count });
          if (count > 0) {
            queryClient.setQueryData(queryKeys.call('notifications.list'), (old: unknown) => {
              const n = old as Notifications | undefined;
              return n ? { ...n, cards: n.cards.map((c) => ({ ...c, seen: true })) } : old;
            });
            seen.mutate({ input: {} });
          }
        }}
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
      <NotificationsSheet open={open} onOpenChange={setOpen} cards={cards} />
    </>
  );
}

// Felix's NotificationsSheet: the drawer header (× · Notifications), then each card — its glyph on
// a `cream-200` tile, the task in Cormorant 16, where it leads as a tracked line, a › — with a ×
// beside it that dismisses it, one at a time. No Clear all (design "Onboarding notifications",
// 19 Nov, over PRD rev 3 §10 12); × and the scrim close without touching them. A dismissed receipts
// line leaves the receipts themselves waiting in the Wardrobe; the Twin and Style DNA cards come
// back once, a week later. Native twin: mobile/src/components/Bell.tsx.
function NotificationsSheet({
  open,
  onOpenChange,
  cards,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: readonly BellCard[];
}) {
  const { track } = useAnalytics().analytics;
  const queryClient = useQueryClient();
  const refresh = () =>
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('notifications.list') });
  const dismiss = useApiMutation('notifications.dismiss', { onSuccess: refresh, onError: refresh });
  // The card leaves at once; the server read follows.
  const dismissItem = (card: BellCard) => {
    queryClient.setQueryData(queryKeys.call('notifications.list'), (old: unknown) => {
      const n = old as Notifications | undefined;
      return n
        ? {
            items: n.items.filter((i) => i.key !== card.key),
            cards: n.cards.filter((c) => c.key !== card.key),
          }
        : old;
    });
    track('bell_card_dismissed', { kind: card.kind });
    dismiss.mutate({ input: { key: card.key } });
  };
  return (
    <Sheet title={copy.title} open={open} onOpenChange={onOpenChange}>
      {cards.length === 0 ? (
        <p
          className="py-14 text-center font-display text-2xl text-ink italic"
          data-testid="bell-empty"
        >
          {copy.empty}
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5" data-testid="bell-items">
          {cards.map((item) => (
            <li key={item.key} className="flex items-center gap-2">
              <Link
                href={notificationHref(item)}
                onClick={() => {
                  track('bell_card_tapped', { kind: item.kind });
                  onOpenChange(false);
                }}
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
                onClick={() => dismissItem(item)}
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
