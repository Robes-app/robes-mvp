import type { InboxEntry } from '@robes/contracts';
import { wardrobe as copy } from '@robes/copy';
import { receivedDay, toggleKept } from '@robes/core/inbox';
import { Icon } from '@robes/icons/native';
import {
  Button,
  EmptyState,
  ErrorText,
  Eyebrow,
  Heading,
  MIN_TOUCH,
  Text,
  useColor,
} from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { errorMessage } from '@/lib/errors';
import { useDecideInbox, useInbox } from './inbox';

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

function receiptEyebrow(entry: InboxEntry): string {
  const day = receivedDay(entry.receivedAt);
  const when = day.kind === 'date' ? day.label : copy.inbox[day.kind];
  return entry.retailer ? `${copy.inbox.from(entry.retailer)} · ${when}` : when;
}

// One piece read from the receipt: white on a hairline at rest, the warm line and a ✓ when ticked.
function ItemRow({
  item,
  on,
  onToggle,
}: {
  item: InboxEntry['items'][number];
  on: boolean;
  onToggle: () => void;
}) {
  const ink = useColor('ink');
  const meta = [item.brand, money(item.price, item.currency)].filter(Boolean).join(' · ');
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={item.label}
      onPress={onToggle}
      style={{ minHeight: MIN_TOUCH + 12 }}
      className={`flex-row items-center gap-3 rounded-soft border px-4 py-3 ${on ? 'border-selected-line bg-selected' : 'border-hairline bg-surface-raised'}`}
    >
      <View className="flex-1">
        <Text>{item.label}</Text>
        {meta ? (
          <Text size="small" tone="muted">
            {meta}
          </Text>
        ) : null}
      </View>
      <View
        className={`size-6 items-center justify-center rounded-pill border ${on ? 'border-selected-line' : 'border-border-control'}`}
      >
        {on ? <Icon name="check" size={14} color={ink} /> : null}
      </View>
    </Pressable>
  );
}

// One receipt (beta's receipt review, Add Piece redline 05c): every piece ticked until she unticks
// what went back. The one ink pill, pinned to the foot, files the ticked pieces and counts them.
// Web twin: app/src/components/wardrobe/inbox.tsx.
function Receipt({
  entry,
  more,
  refreshing,
  onRefresh,
}: {
  entry: InboxEntry;
  more: number;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const decide = useDecideInbox();
  const [keep, setKeep] = useState(entry.items.map((i) => i.index));
  const file = (action: 'wardrobe' | 'wishlist' | 'dismiss') =>
    decide.mutate({ params: { id: entry.id }, input: { action, itemIndexes: keep } });
  return (
    <View className="flex-1" testID={`inbox-${entry.id}`}>
      <ScrollView
        contentContainerClassName="gap-5 px-6 pb-6"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="gap-2">
          <Eyebrow>{receiptEyebrow(entry)}</Eyebrow>
          <Heading style={{ fontSize: 28 }}>{copy.inbox.read(entry.items.length)}</Heading>
          <Text size="small" tone="muted">
            {copy.inbox.untick}
          </Text>
        </View>
        <View className="gap-2">
          {entry.items.map((item) => (
            <ItemRow
              key={item.index}
              item={item}
              on={keep.includes(item.index)}
              onToggle={() => setKeep((k) => toggleKept(k, item.index))}
            />
          ))}
        </View>
        {more > 0 ? (
          <Text size="small" tone="muted">
            {copy.inbox.more(more)}
          </Text>
        ) : null}
      </ScrollView>
      <View className="gap-2 border-hairline border-t bg-bg px-6 pt-3 pb-2">
        {decide.isError ? <ErrorText>{errorMessage(decide.error)}</ErrorText> : null}
        <Button
          disabled={decide.isPending || keep.length === 0}
          onPress={() => file('wardrobe')}
          testID="inbox-file"
        >
          {copy.inbox.file(keep.length)}
        </Button>
        <View className="flex-row items-center justify-between gap-3">
          <Button
            variant="secondary"
            disabled={decide.isPending || keep.length === 0}
            onPress={() => file('wishlist')}
          >
            {copy.inbox.toWishlist}
          </Button>
          <Button variant="quiet" disabled={decide.isPending} onPress={() => file('dismiss')}>
            {copy.inbox.skip}
          </Button>
        </View>
      </View>
    </View>
  );
}

// Wardrobe › Inbox: forwarded receipts, one at a time (a pasted link goes straight to Review and
// never lands here). Reached from the receipt notice on Wardrobe and from the receipt mail.
export function InboxView() {
  const router = useRouter();
  const query = useInbox();
  if (query.isError) {
    return <ErrorText>{errorMessage(query.error)}</ErrorText>;
  }
  if (!query.data) return null;
  const [first, ...rest] = query.data.items;
  if (!first) {
    return (
      <ScrollView
        contentContainerClassName="px-6 pb-8"
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
        }
      >
        <EmptyState
          title={copy.inboxEmpty.title}
          body={copy.inboxEmpty.body}
          action={{
            label: copy.add.doors.receipt,
            onPress: () => router.push('/wardrobe/receipt'),
          }}
        />
      </ScrollView>
    );
  }
  return (
    <Receipt
      key={first.id}
      entry={first}
      more={rest.length}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
    />
  );
}
