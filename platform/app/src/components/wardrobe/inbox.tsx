'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { InboxEntry, InboxItemState } from '@robes/contracts';
import { wardrobe, you } from '@robes/copy';
import { receivedDay, splitAddress } from '@robes/core/inbox';
import { Icon } from '@robes/icons/web';
import {
  buttonClasses,
  CardSkeleton,
  EmptyState,
  ErrorText,
  Tabs,
  Text,
  useToast,
} from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { errorCopy } from '@/lib/error-copy';

const copy = wardrobe.inbox;
const rc = wardrobe.receipts;
const TABS = [rc.tabs.inbox, rc.tabs.added, rc.tabs.discarded] as const;
type Tab = (typeof TABS)[number];
const STATE_OF: Record<Tab, InboxItemState> = {
  [rc.tabs.inbox]: 'inbox',
  [rc.tabs.added]: 'added',
  [rc.tabs.discarded]: 'discarded',
};
const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';
const discBase = `flex size-8 items-center justify-center rounded-pill disabled:opacity-40 ${focus}`;

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

function dayOf(iso: string): string {
  const day = receivedDay(iso);
  return day.kind === 'date' ? day.label : copy[day.kind];
}

// FORWARD RECEIPTS TO (PRD rev 3 §7.5): her address, Copy, and what happens next. The address
// itself is minted and managed under You › Receipts; this card only reads it.
function ForwardCard() {
  const toast = useToast();
  const address = useApi('me.inboxAddress.get');
  const [copied, setCopied] = useState(false);
  const value = address.data?.address ?? null;
  if (!value) return null;
  const parts = splitAddress(value);
  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ message: you.receipts.copyFailed(value) });
    }
  };
  return (
    <section
      aria-label={rc.forwardTo}
      className="flex flex-col gap-2 rounded-soft border border-hairline bg-surface-raised px-4 py-3.5"
      data-testid="receipts-forward"
    >
      <span className="font-sans text-[9px] text-accent-warm uppercase tracking-[0.24em]">
        {rc.forwardTo}
      </span>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex min-w-0 flex-1 flex-col font-sans text-ink text-sm">
          <span className="truncate">{parts.local}</span>
          <span className="truncate text-ink-muted">{parts.domain}</span>
        </span>
        <button
          type="button"
          onClick={() => void copyAddress()}
          className={`relative inline-flex h-9 items-center gap-1.5 rounded-pill border border-rule-mid bg-surface-raised px-4 font-sans text-ink text-xs after:absolute after:inset-x-0 after:-inset-y-1 hover:border-border-control ${focus}`}
          data-testid="receipts-copy"
        >
          <Icon name={copied ? 'check' : 'link'} size={14} />
          <span aria-live="polite">{copied ? you.receipts.copied : you.receipts.copy}</span>
        </button>
      </div>
      <Text size="caption" tone="muted">
        {rc.extracted}
      </Text>
    </section>
  );
}

// One receipt as a group (§7.5): the retailer and its count in the serif, the pieces with their
// × (discard) and ink ✓ (add) in the Inbox, then the footer — order, sender, dates — with the
// group's own × and ✓ acting on every piece waiting.
function Group({ entry, decidable }: { entry: InboxEntry; decidable: boolean }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const decide = useApiMutation('inbox.decide', {
    onSuccess: (_result, args) => {
      toast({ message: args.input.action === 'dismiss' ? rc.discarded : rc.added });
      void Promise.all(
        (
          ['inbox.list', 'today.get', 'wardrobe.list', 'wardrobe.summary', 'wishlist.list'] as const
        ).map((key) => queryClient.invalidateQueries({ queryKey: queryKeys.route(key) })),
      );
    },
  });
  const act = (action: 'wardrobe' | 'dismiss', itemIndexes?: number[]) =>
    decide.mutate({
      params: { id: entry.id },
      input: { action, ...(itemIndexes ? { itemIndexes } : {}) },
    });
  const footer = [
    entry.orderRef ? rc.order(entry.orderRef) : null,
    entry.fromEmail ? rc.sender(entry.fromEmail) : null,
    rc.received(dayOf(entry.receivedAt)),
    entry.decidedAt && !decidable ? rc.decided(dayOf(entry.decidedAt)) : null,
  ].filter((x): x is string => x !== null);
  const title = rc.group(entry.retailer ?? rc.unknownRetailer, entry.items.length);
  return (
    <section
      aria-label={title}
      className="overflow-hidden rounded-soft border border-hairline bg-surface-raised"
      data-testid={`receipt-${entry.id}`}
    >
      <h2 className="px-3 pt-3 pb-2 font-display text-[19px] text-ink">{title}</h2>
      <ul>
        {entry.items.map((item) => {
          const meta = [item.brand, money(item.price, item.currency)].filter(Boolean).join(' · ');
          return (
            <li
              key={item.index}
              className="flex items-center gap-3 border-hairline border-t px-3 py-2.5"
              data-testid={`receipt-item-${item.index}`}
            >
              <span
                aria-hidden
                className="flex size-11 shrink-0 items-center justify-center rounded-crisp bg-surface-sunk text-ink-muted"
              >
                <Icon name="wardrobe" size={14} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-display text-[17px] text-ink">{item.label}</span>
                {meta ? (
                  <Text size="caption" tone="muted" className="truncate">
                    {meta}
                  </Text>
                ) : null}
              </span>
              {decidable ? (
                <span className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label={rc.discard(item.label)}
                    title={rc.discard(item.label)}
                    disabled={decide.isPending}
                    onClick={() => act('dismiss', [item.index])}
                    className={`${discBase} border border-rule-mid bg-surface-raised text-ink hover:border-border-control`}
                  >
                    <Icon name="close" size={13} />
                  </button>
                  <button
                    type="button"
                    aria-label={rc.add(item.label)}
                    title={rc.add(item.label)}
                    disabled={decide.isPending}
                    onClick={() => act('wardrobe', [item.index])}
                    className={`${discBase} bg-ink text-bg`}
                  >
                    <Icon name="check" size={13} />
                  </button>
                </span>
              ) : (
                <Icon
                  name={item.state === 'added' ? 'check' : 'close'}
                  size={14}
                  className="shrink-0 text-ink-muted"
                />
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex items-center gap-3 border-hairline border-t px-3 py-2.5">
        <span className="flex min-w-0 flex-1 flex-col">
          {footer.map((line) => (
            <Text key={line} size="caption" tone="faint" className="truncate">
              {line}
            </Text>
          ))}
        </span>
        {decidable ? (
          <span className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label={rc.discardAll}
              title={rc.discardAll}
              disabled={decide.isPending}
              onClick={() => act('dismiss')}
              className={`${discBase} border border-rule-mid bg-surface-raised text-ink hover:border-border-control`}
              data-testid={`receipt-${entry.id}-discard`}
            >
              <Icon name="close" size={13} />
            </button>
            <button
              type="button"
              aria-label={rc.addAll}
              title={rc.addAll}
              disabled={decide.isPending}
              onClick={() => act('wardrobe')}
              className={`${discBase} bg-ink text-bg`}
              data-testid={`receipt-${entry.id}-add`}
            >
              <Icon name="check" size={13} />
            </button>
          </span>
        ) : null}
      </div>
      {decide.isError ? (
        <div className="px-3 pb-3">
          <ErrorText>{errorCopy(decide.error)}</ErrorText>
        </div>
      ) : null}
    </section>
  );
}

// Receipts (Front Door PRD rev 3 §7.5; Wardrobe › Inbox): INBOX · ADDED · DISCARDED with their
// counts, the forwarding card, then the receipts as groups by retailer. Each piece is decided on
// its own; a pasted link never lands here. Native twin: mobile/src/features/wardrobe/InboxView.tsx.
export function Inbox() {
  const [tab, setTab] = useState<Tab>(TABS[0]);
  const state = STATE_OF[tab];
  const query = useApi('inbox.list', { input: { state } }, { placeholderData: (prev) => prev });
  const counts = query.data?.counts;
  if (query.isError) return <ErrorText>{errorCopy(query.error)}</ErrorText>;
  const entries = query.data?.items ?? [];
  return (
    <div className="flex flex-col gap-4" data-testid="receipts">
      <Tabs
        items={TABS}
        value={tab}
        onChange={setTab}
        label={rc.title}
        {...(counts
          ? {
              counts: {
                [rc.tabs.inbox]: counts.inbox,
                [rc.tabs.added]: counts.added,
                [rc.tabs.discarded]: counts.discarded,
              },
            }
          : {})}
      />
      <ForwardCard />
      {!query.data ? (
        <CardSkeleton />
      ) : entries.length === 0 ? (
        state === 'inbox' ? (
          <EmptyState
            title={wardrobe.inboxEmpty.title}
            body={wardrobe.inboxEmpty.body}
            action={
              <Link href="/wardrobe/receipt" className="underline underline-offset-4">
                {wardrobe.add.doors.receipt}
              </Link>
            }
          />
        ) : (
          <Text tone="muted" className="py-6 text-center">
            {state === 'added' ? rc.addedEmpty : rc.discardedEmpty}
          </Text>
        )
      ) : (
        entries.map((entry) => <Group key={entry.id} entry={entry} decidable={state === 'inbox'} />)
      )}
      {state === 'inbox' && entries.length > 0 ? (
        <Link
          href="/wardrobe/receipt"
          className={`${buttonClasses({ variant: 'quiet' })} self-center`}
        >
          {wardrobe.add.doors.receipt}
        </Link>
      ) : null}
    </div>
  );
}
