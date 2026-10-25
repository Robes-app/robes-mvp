import type { Wish } from '@robes/contracts';
import { wardrobe as copy, ui } from '@robes/copy';
import { countByCategory, formatPrice, rankCategories } from '@robes/core/wardrobe';
import { Button, EmptyState, Field, PrimaryScope, Text } from '@robes/ui-native';
import { useEffect, useState } from 'react';
import { FlatList, Keyboard, RefreshControl, View } from 'react-native';
import { errorMessage } from '@/lib/errors';
import { useWardrobeLayout } from './layout';
import { BoughtButton, CardRow, type CardStatus, CardTile } from './PieceCard';
import { CategoryTabs, CountRow } from './WardrobeHeader';
import { useAddWish, usePromoteWish, useRemoveWish, useWishes } from './wishlist';

function wishStatus(wish: Wish): CardStatus {
  return { text: copy.card.notYours(formatPrice(wish.price, wish.currency)), warm: true };
}

function AddWish() {
  const [label, setLabel] = useState('');
  const add = useAddWish();
  return (
    <PrimaryScope>
      <View className="gap-3 px-6 pt-5">
        <Field
          label={copy.wishlist.addLabel}
          placeholder={copy.wishlist.addPlaceholder}
          value={label}
          maxLength={120}
          onChangeText={setLabel}
          error={add.isError ? errorMessage(add.error) : null}
        />
        <Button
          icon="plus"
          disabled={label.trim() === ''}
          loading={add.isPending}
          loadingLabel={ui.loading}
          onPress={() =>
            add
              .mutateAsync({ input: { label: label.trim() } })
              .then(() => {
                setLabel('');
                // Added: put the keyboard away so the list and tab bar are visible again.
                Keyboard.dismiss();
              })
              .catch(() => undefined)
          }
        >
          {copy.wishlist.add}
        </Button>
      </View>
    </PrimaryScope>
  );
}

// Wardrobe › Wishlist: the same tabs, count row and card as the pieces (legacy 809b13e R5).
export function WishlistView({ adding = false }: { adding?: boolean }) {
  const { wishes, isPending, isError, error, refetch, isRefetching, fetchNextPage, hasNextPage } =
    useWishes();
  const promote = usePromoteWish();
  const remove = useRemoveWish();
  const [layout, setLayout] = useWardrobeLayout();
  const [category, setCategory] = useState<string | null>(null);
  // Once the form shows it stays while she keeps adding.
  const wantsForm = adding || (!isPending && wishes.length === 0);
  const [formOpen, setFormOpen] = useState(wantsForm);
  useEffect(() => {
    if (wantsForm) setFormOpen(true);
  }, [wantsForm]);
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
  const showForm = wantsForm || formOpen;
  return (
    <View className="flex-1">
      {showForm ? <AddWish /> : null}
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
            <EmptyState title={copy.wishlistEmpty.title} body={copy.wishlistEmpty.body} />
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
