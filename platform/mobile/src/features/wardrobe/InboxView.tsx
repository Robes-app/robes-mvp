import { useApi } from '@robes/api-client/react';
import type { InboxEntry, InboxItemState } from '@robes/contracts';
import { wardrobe as copy, you } from '@robes/copy';
import { receivedDay, splitAddress } from '@robes/core/inbox';
import { Icon } from '@robes/icons/native';
import {
  Button,
  ErrorText,
  fonts,
  Image,
  MIN_TOUCH,
  Skeleton,
  Tabs,
  Text,
  useColor,
  useToast,
} from '@robes/ui-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { errorMessage } from '@/lib/errors';
import { renditionUri } from '@/lib/images';
import { usePullRefresh } from '@/lib/pull-refresh';
import { useDecideInbox, useInbox } from './inbox';

const rc = copy.receipts;
const TABS = [rc.tabs.inbox, rc.tabs.added, rc.tabs.discarded] as const;
type Tab = (typeof TABS)[number];
const STATE_OF: Record<Tab, InboxItemState> = {
  [rc.tabs.inbox]: 'inbox',
  [rc.tabs.added]: 'added',
  [rc.tabs.discarded]: 'discarded',
};

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

// A receipt line's meta (beta's review row): the brand when it isn't the shop the group already
// names, then the price and the size as printed. Twin: InboxView.tsx / inbox.tsx.
function lineMeta(
  item: {
    brand: string | null;
    price: number | null;
    currency: string | null;
    size: string | null;
  },
  retailer: string | null,
): string {
  const brand =
    item.brand && item.brand.toLowerCase() !== retailer?.toLowerCase() ? item.brand : null;
  return [brand, money(item.price, item.currency), item.size ? rc.size(item.size) : null]
    .filter(Boolean)
    .join(' · ');
}

function dayOf(iso: string): string {
  const day = receivedDay(iso);
  return day.kind === 'date' ? day.label : copy.inbox[day.kind];
}

// FORWARD RECEIPTS TO (PRD rev 3 §7.5): her address, Copy, and what happens next. The address
// itself is minted and managed under You › Receipts; this card only reads it.
function ForwardCard() {
  const toast = useToast();
  const address = useApi('me.inboxAddress.get');
  const [copied, setCopied] = useState(false);
  const value = address.data?.address ?? null;
  const copyAddress = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.show({ message: you.receipts.copyFailed(text) });
    }
  };
  if (!value) return null;
  const parts = splitAddress(value);
  return (
    <View
      className="gap-2 rounded-soft border border-hairline bg-surface-raised px-4 py-3.5"
      testID="receipts-forward"
    >
      <Text
        className="text-[9px] text-accent-warm uppercase"
        style={{ fontFamily: fonts.sansMedium, letterSpacing: 2.16 }}
      >
        {rc.forwardTo}
      </Text>
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} style={{ fontFamily: fonts.sans }}>
            {parts.local}
          </Text>
          <Text size="small" tone="muted" numberOfLines={1}>
            {parts.domain}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copied ? you.receipts.copied : you.receipts.copy}
          onPress={() => void copyAddress(value)}
          hitSlop={(MIN_TOUCH - 36) / 2}
          className="h-9 flex-row items-center rounded-pill border border-rule-mid bg-surface-raised px-4"
          testID="receipts-copy"
        >
          <Text size="caption">{copied ? you.receipts.copied : you.receipts.copy}</Text>
        </Pressable>
      </View>
      <Text size="caption" tone="muted">
        {rc.extracted}
      </Text>
    </View>
  );
}

// One piece read from a receipt (§7.5): a thumb, the serif name, its meta, and in the Inbox the
// circular × (discard) and the ink ✓ (add to the wardrobe).
function ItemRow({
  item,
  retailer,
  decidable,
  busy,
  onAdd,
  onDiscard,
}: {
  item: InboxEntry['items'][number];
  retailer: string | null;
  decidable: boolean;
  busy: boolean;
  onAdd: () => void;
  onDiscard: () => void;
}) {
  const ink = useColor('ink');
  const onInk = useColor('bg');
  const muted = useColor('ink-muted');
  const meta = lineMeta(item, retailer);
  const thumb = renditionUri(item.image, 96);
  return (
    <View
      className="flex-row items-center gap-3 border-hairline border-t px-3 py-2.5"
      testID={`receipt-item-${item.index}`}
    >
      {/* The line's photo once Robes has read it (her own copy, SEC-40); the hanger until then. */}
      {thumb ? (
        <View
          testID={`receipt-photo-${item.index}`}
          className="w-12 overflow-hidden rounded-crisp bg-surface-raised"
        >
          <Image
            source={thumb}
            alt=""
            aspect="4:5"
            contentFit="contain"
            blurhash={item.image?.blurhash}
          />
        </View>
      ) : (
        <View className="size-11 items-center justify-center rounded-crisp bg-surface-sunk">
          <Icon name="wardrobe" size={14} color={muted} />
        </View>
      )}
      <View className="min-w-0 flex-1 gap-0.5">
        <Text numberOfLines={2} style={{ fontFamily: fonts.display, fontSize: 17 }}>
          {item.label}
        </Text>
        {meta ? (
          <Text size="caption" tone="muted" numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      {decidable ? (
        <View className="flex-row items-center gap-1.5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={rc.discard(item.label)}
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={onDiscard}
            hitSlop={6}
            className="size-8 items-center justify-center rounded-pill border border-rule-mid bg-surface-raised"
          >
            <Icon name="close" size={13} color={ink} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={rc.add(item.label)}
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={onAdd}
            hitSlop={6}
            className="size-8 items-center justify-center rounded-pill bg-ink"
          >
            <Icon name="check" size={13} color={onInk} />
          </Pressable>
        </View>
      ) : (
        <Icon name={item.state === 'added' ? 'check' : 'close'} size={14} color={muted} />
      )}
    </View>
  );
}

// One receipt as a group (§7.5): the retailer and its count in the serif, the pieces, then the
// footer — order, sender, dates — with the group's own × and ✓ acting on every piece waiting.
function Group({ entry, decidable }: { entry: InboxEntry; decidable: boolean }) {
  const decide = useDecideInbox();
  const ink = useColor('ink');
  const onInk = useColor('bg');
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
  return (
    <View
      className="overflow-hidden rounded-soft border border-hairline bg-surface-raised"
      testID={`receipt-${entry.id}`}
    >
      <View className="px-3 pt-3 pb-2">
        <Text style={{ fontFamily: fonts.display, fontSize: 19 }}>
          {rc.group(entry.retailer ?? rc.unknownRetailer, entry.items.length)}
        </Text>
      </View>
      {entry.items.map((item) => (
        <ItemRow
          key={item.index}
          item={item}
          retailer={entry.retailer}
          decidable={decidable}
          busy={decide.isPending}
          onAdd={() => act('wardrobe', [item.index])}
          onDiscard={() => act('dismiss', [item.index])}
        />
      ))}
      <View className="flex-row items-center gap-3 border-hairline border-t px-3 py-2.5">
        <View className="min-w-0 flex-1">
          {footer.map((line) => (
            <Text key={line} size="caption" tone="faint" numberOfLines={1}>
              {line}
            </Text>
          ))}
        </View>
        {decidable ? (
          <View className="flex-row items-center gap-1.5">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={rc.discardAll}
              accessibilityState={{ disabled: decide.isPending }}
              disabled={decide.isPending}
              onPress={() => act('dismiss')}
              hitSlop={6}
              className="size-8 items-center justify-center rounded-pill border border-rule-mid bg-surface-raised"
              testID={`receipt-${entry.id}-discard`}
            >
              <Icon name="close" size={13} color={ink} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={rc.addAll}
              accessibilityState={{ disabled: decide.isPending }}
              disabled={decide.isPending}
              onPress={() => act('wardrobe')}
              hitSlop={6}
              className="size-8 items-center justify-center rounded-pill bg-ink"
              testID={`receipt-${entry.id}-add`}
            >
              <Icon name="check" size={13} color={onInk} />
            </Pressable>
          </View>
        ) : null}
      </View>
      {decide.isError ? (
        <View className="px-3 pb-3">
          <ErrorText>{errorMessage(decide.error)}</ErrorText>
        </View>
      ) : null}
    </View>
  );
}

// Receipts (Front Door PRD rev 3 §7.5; Wardrobe › Inbox): INBOX · ADDED · DISCARDED with their
// counts, the forwarding card, then the receipts as groups by retailer. Each piece is decided on
// its own; a pasted link never lands here. Web twin: app/src/components/wardrobe/inbox.tsx.
export function InboxView() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(TABS[0]);
  const state = STATE_OF[tab];
  const query = useInbox(state);
  const pull = usePullRefresh(query.refetch);
  const counts = query.data?.counts;
  if (query.isError) return <ErrorText>{errorMessage(query.error)}</ErrorText>;
  const entries = query.data?.items ?? [];
  return (
    <ScrollView
      contentContainerClassName="gap-4 px-5 pb-10"
      refreshControl={<RefreshControl {...pull} />}
      testID="receipts"
    >
      <Tabs
        items={TABS}
        value={tab}
        onChange={setTab}
        {...(counts
          ? {
              counts: {
                [rc.tabs.inbox]: counts.inbox,
                [rc.tabs.added]: counts.added,
                [rc.tabs.discarded]: counts.discarded,
              },
            }
          : {})}
        testID="receipts-tabs"
      />
      <ForwardCard />
      {!query.data ? (
        <Skeleton width="100%" height={120} />
      ) : entries.length === 0 ? (
        // An empty Inbox says nothing more: the forwarding card above is the way in.
        state === 'inbox' ? null : (
          <Text tone="muted" className="py-6 text-center">
            {state === 'added' ? rc.addedEmpty : rc.discardedEmpty}
          </Text>
        )
      ) : (
        entries.map((entry) => <Group key={entry.id} entry={entry} decidable={state === 'inbox'} />)
      )}
      {state === 'inbox' && entries.length > 0 ? (
        <Button variant="quiet" onPress={() => router.push('/wardrobe/receipt')}>
          {copy.add.doors.receipt}
        </Button>
      ) : null}
    </ScrollView>
  );
}
