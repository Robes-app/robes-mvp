import type { Wish } from '@robes/contracts';
import { wardrobe as copy, ui } from '@robes/copy';
import { countByCategory, formatPrice, rankCategories } from '@robes/core/wardrobe';
import { Button, EmptyState, Text } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { errorMessage } from '@/lib/errors';
import { useWardrobeLayout } from './layout';
import { BoughtButton, CardRow, type CardStatus, CardTile } from './PieceCard';
import { CategoryTabs, CountRow } from './WardrobeHeader';
import { usePromoteWish, useRemoveWish, useWishes } from './wishlist';

function wishStatus(wish: Wish): CardStatus {
  return { text: copy.card.notYours(formatPrice(wish.price, wish.currency)), warm: true };
}

// Wardrobe › Wishlist: the same tabs, count row and card as the pieces (legacy 809b13e R5).
// Wishes are added through the Add pieces sheet, opened on the Wishlist (the + on this tab).
export function WishlistView() {
  const router = useRouter();
  const { wishes, isPending, isError, error, refetch, isRefetching, fetchNextPage, hasNextPage } =
    useWishes();
  const promote = usePromoteWish();
  const remove = useRemoveWish();
  const [layout, setLayout] = useWardrobeLayout();
  const [category, setCategory] = useState<string | null>(null);
  if (isError) {
    return (
      <EmptyState
        title={errorMessage(error)}
        action={{ label: ui.retry, onPress: () => void refetch() }}
      />
    );
  }
  const visible = category ? wishes.filter((w) => w.category === category) : wishes;
  const grid = layout === 'grid';
  return (
    <View className="flex-1">
      {wishes.length > 0 ? (
        <>
          <CategoryTabs
            categories={rankCategories(countByCategory(wishes))}
            value={category}
            onChange={setCategory}
          />
          <CountRow
            count={copy.header.wishCount(visible.length)}
            layout={layout}
            onLayout={setLayout}
          />
        </>
      ) : null}
      <FlatList
        testID="wishlist"
        key={layout}
        data={visible}
        keyExtractor={(w) => w.id}
        numColumns={grid ? 2 : 1}
        {...(grid ? { columnWrapperClassName: 'gap-3' } : {})}
        contentContainerClassName={grid ? 'gap-5 px-6 pb-8' : 'gap-2 px-6 pb-8'}
        keyboardShouldPersistTaps="handled"
        onEndReachedThreshold={0.5}
        onEndReached={() => (hasNextPage ? void fetchNextPage() : undefined)}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
        }
        renderItem={({ item }) => {
          const action = (
            <BoughtButton
              label={item.label}
              busy={promote.isPending && promote.variables?.params.id === item.id}
              onBought={() => promote.mutate({ params: { id: item.id } })}
            />
          );
          return grid ? (
            <CardTile piece={item} status={wishStatus(item)} action={action} />
          ) : (
            <CardRow
              piece={item}
              status={wishStatus(item)}
              action={action}
              removeLabel={copy.wishlist.remove(item.label)}
              onRemove={() => remove.mutate({ params: { id: item.id } })}
            />
          );
        }}
        ListEmptyComponent={
          isPending ? undefined : wishes.length === 0 ? (
            <EmptyState
              title={copy.wishlistEmpty.title}
              body={copy.wishlistEmpty.body}
              action={{
                label: copy.header.savePiece,
                onPress: () =>
                  router.push({ pathname: '/wardrobe/add', params: { to: 'wishlist' } }),
              }}
            />
          ) : (
            <View className="items-start gap-3 py-6">
              <Text tone="muted">{copy.filter.wishNothing}</Text>
              <Button variant="quiet" onPress={() => setCategory(null)}>
                {copy.filter.showEverything}
              </Button>
            </View>
          )
        }
      />
    </View>
  );
}
