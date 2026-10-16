import type { InboxEntry } from '@robes/contracts';
import { wardrobe as copy } from '@robes/copy';
import { Button, EmptyState, Text } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { ToggleRow } from '@/components/ToggleRow';
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

function Entry({ entry }: { entry: InboxEntry }) {
  const decide = useDecideInbox();
  const [keep, setKeep] = useState(entry.items.map((i) => i.index));
  const file = (action: 'wardrobe' | 'wishlist' | 'dismiss') =>
    decide.mutate({ params: { id: entry.id }, input: { action, itemIndexes: keep } });
  return (
    <View className="gap-3 border-b border-hairline py-4" testID={`inbox-${entry.id}`}>
      {entry.retailer ? (
        <Text size="small" tone="muted">
          {copy.inbox.from(entry.retailer)}
        </Text>
      ) : null}
      {entry.items.map((item) => (
        <ToggleRow
          key={item.index}
          label={item.label}
          hint={
            [item.brand, money(item.price, item.currency)].filter(Boolean).join(' · ') || undefined
          }
          value={keep.includes(item.index)}
          onChange={(on) =>
            setKeep((k) => (on ? [...k, item.index] : k.filter((i) => i !== item.index)))
          }
        />
      ))}
      {decide.isError ? <Text tone="danger">{errorMessage(decide.error)}</Text> : null}
      <View className="flex-row flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={decide.isPending || keep.length === 0}
          onPress={() => file('wardrobe')}
        >
          {copy.inbox.toWardrobe}
        </Button>
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
  );
}

// Wardrobe › Inbox (M3 task 4): pasted links waiting for a yes or no.
export function InboxView() {
  const router = useRouter();
  const query = useInbox();
  if (query.isError) {
    return <Text tone="danger">{errorMessage(query.error)}</Text>;
  }
  return (
    <FlatList
      data={query.data?.items ?? []}
      keyExtractor={(e) => e.id}
      contentContainerClassName="px-6 pb-8"
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
      }
      renderItem={({ item }) => <Entry entry={item} />}
      ListEmptyComponent={
        query.isPending ? null : (
          <EmptyState
            title={copy.inboxEmpty.title}
            body={copy.inboxEmpty.body}
            action={{ label: copy.link.eyebrow, onPress: () => router.push('/wardrobe/link') }}
          />
        )
      }
    />
  );
}
