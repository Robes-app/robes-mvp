import { wardrobe as copy, ui } from '@robes/copy';
import { Button, EmptyState, Field, IconButton, Image, PrimaryScope, Text } from '@robes/ui-native';
import { useState } from 'react';
import { FlatList, Keyboard, RefreshControl, View } from 'react-native';
import { errorMessage } from '@/lib/errors';
import { renditionUri } from '@/lib/images';
import { useAddWish, usePromoteWish, useRemoveWish, useWishes } from './wishlist';

function AddWish() {
  const [label, setLabel] = useState('');
  const add = useAddWish();
  return (
    <PrimaryScope>
      <View className="gap-3 pb-4">
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

export function WishlistView() {
  const { wishes, isPending, isError, error, refetch, isRefetching, fetchNextPage, hasNextPage } =
    useWishes();
  const promote = usePromoteWish();
  const remove = useRemoveWish();
  if (isError) {
    return (
      <EmptyState
        title={errorMessage(error)}
        action={{ label: ui.retry, onPress: () => void refetch() }}
      />
    );
  }
  return (
    <FlatList
      testID="wishlist"
      data={wishes}
      keyExtractor={(w) => w.id}
      contentContainerClassName="px-6 pb-8"
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={<AddWish />}
      onEndReachedThreshold={0.5}
      onEndReached={() => (hasNextPage ? void fetchNextPage() : undefined)}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
      renderItem={({ item }) => {
        const uri = renditionUri(item.image, 64);
        return (
          <View className="flex-row items-center gap-3 border-b border-hairline py-3">
            {uri ? (
              <View style={{ width: 56 }}>
                <Image source={uri} alt="" blurhash={item.image?.blurhash} />
              </View>
            ) : null}
            <View className="flex-1 gap-1">
              <Text numberOfLines={2}>{item.label}</Text>
              {item.brand ? (
                <Text size="caption" tone="muted">
                  {item.brand}
                </Text>
              ) : null}
            </View>
            <Button
              variant="secondary"
              loading={promote.isPending && promote.variables?.params.id === item.id}
              onPress={() => promote.mutate({ params: { id: item.id } })}
            >
              {copy.wishlist.bought}
            </Button>
            <IconButton
              icon="trash"
              label={copy.wishlist.remove(item.label)}
              tone="ink-muted"
              onPress={() => remove.mutate({ params: { id: item.id } })}
            />
          </View>
        );
      }}
      ListEmptyComponent={
        isPending ? null : (
          <EmptyState title={copy.wishlistEmpty.title} body={copy.wishlistEmpty.body} />
        )
      }
    />
  );
}
