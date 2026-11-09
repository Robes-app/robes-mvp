import type { Wish } from '@robes/contracts';
import { wardrobe as copy, ui } from '@robes/copy';
import { shade } from '@robes/core/colour';
import { countByCategory, formatPrice, rankCategories } from '@robes/core/wardrobe';
import { Button, EmptyState, Text } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { FilterRow } from '@/features/filters/FilterRow';
import { useWardrobeFilters } from '@/features/filters/use-wardrobe-filters';
import { errorMessage } from '@/lib/errors';
import { useWardrobeLayout } from './layout';
import { BoughtButton, CardRow, type CardStatus, CardTile, HeartButton } from './PieceCard';
import { CountRow } from './WardrobeHeader';
import { WardrobeFilterSheet, wearChoicesOf } from './WardrobeView';
import { usePromoteWish, useRemoveWish, useWishes } from './wishlist';

function wishStatus(wish: Wish): CardStatus {
  return { text: formatPrice(wish.price, wish.currency) ?? copy.card.notYours(null), warm: true };
}

// A wish under the wardrobe's filters, here on the phone: the list is small and whole. A wish
// carries no seasons or wear-for yet, so those sections leave it be (plan PR 3 note).
function wishMatches(
  wish: Wish,
  f: { category: string | null; families: readonly string[]; brand: string | null },
): boolean {
  if (f.category && wish.category !== f.category) return false;
  if (f.families.length) {
    const family = shade(wish.colourShade)?.family;
    if (!family || !f.families.includes(family)) return false;
  }
  if (f.brand && (wish.brand ?? wish.sourceLabel ?? '').toLowerCase() !== f.brand.toLowerCase())
    return false;
  return true;
}

// Wardrobe › Wishlist (Front Door PRD rev 3 §7.2): the same tabs, filter row and 3-up tiles as
// Owned; a wish shows its price, and the filled heart on its photograph lets it go. The list view
// keeps Bought and the swipe to remove. Web twin: app/src/components/wardrobe/wishlist.tsx.
export function WishlistView() {
  const router = useRouter();
  const { wishes, isPending, isError, error, refetch, isRefetching, fetchNextPage, hasNextPage } =
    useWishes();
  const promote = usePromoteWish();
  const remove = useRemoveWish();
  const [layout, setLayout] = useWardrobeLayout();
  const filters = useWardrobeFilters();
  const [sheet, setSheet] = useState(false);
  const sheetMatched = useMemo(
    () => wishes.filter((w) => wishMatches(w, { ...filters.state, category: null })),
    [wishes, filters.state],
  );
  const visible = useMemo(
    () => sheetMatched.filter((w) => wishMatches(w, filters.state)),
    [sheetMatched, filters.state],
  );
  const categories = useMemo(() => {
    const counts = countByCategory(sheetMatched);
    return rankCategories(counts).map((c) => ({
      value: c,
      label: c,
      count: counts.find((x) => x.category === c)?.count ?? 0,
    }));
  }, [sheetMatched]);
  // A wish's retailer counts as its brand (PRD §7.1a).
  const brands = useMemo(
    () =>
      [
        ...new Set(
          wishes.flatMap((w) => ((w.brand ?? w.sourceLabel) ? [w.brand ?? w.sourceLabel] : [])),
        ),
      ]
        .filter((b): b is string => !!b)
        .sort((a, b) => a.localeCompare(b, 'en-GB')),
    [wishes],
  );
  if (isError) {
    return (
      <EmptyState
        title={errorMessage(error)}
        action={{ label: ui.retry, onPress: () => void refetch() }}
      />
    );
  }
  const grid = layout === 'grid';
  return (
    <View className="flex-1">
      {wishes.length > 0 ? (
        <View className="px-5 pt-3">
          <FilterRow
            sheetCount={filters.sheetCount}
            onOpenSheet={() => setSheet(true)}
            seasons={[]}
            onRemoveSeason={() => undefined}
            quick={categories}
            active={filters.state.category ? [filters.state.category] : []}
            onToggle={filters.setCategory}
            allCount={sheetMatched.length}
            onAll={() => filters.setCategory(null)}
            testID="wishlist-filter-row"
          />
        </View>
      ) : null}
      <FlatList
        testID="wishlist"
        key={layout}
        data={visible}
        keyExtractor={(w) => w.id}
        numColumns={grid ? 3 : 1}
        {...(grid ? { columnWrapperClassName: 'gap-2' } : {})}
        contentContainerClassName={grid ? 'gap-2 px-5 pt-3 pb-8' : 'gap-2 px-5 pt-3 pb-8'}
        keyboardShouldPersistTaps="handled"
        onEndReachedThreshold={0.5}
        onEndReached={() => (hasNextPage ? void fetchNextPage() : undefined)}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
        }
        renderItem={({ item }) =>
          grid ? (
            <CardTile
              piece={item}
              status={wishStatus(item)}
              compact
              onImage={
                <HeartButton
                  label={copy.wishlist.unwish(item.label)}
                  onPress={() => remove.mutate({ params: { id: item.id } })}
                />
              }
            />
          ) : (
            <CardRow
              piece={item}
              status={wishStatus(item)}
              action={
                <BoughtButton
                  label={item.label}
                  busy={promote.isPending && promote.variables?.params.id === item.id}
                  onBought={() => promote.mutate({ params: { id: item.id } })}
                />
              }
              removeLabel={copy.wishlist.remove(item.label)}
              onRemove={() => remove.mutate({ params: { id: item.id } })}
            />
          )
        }
        ListHeaderComponent={
          wishes.length > 0 ? (
            <View className="-mx-5 -mt-3">
              <CountRow
                count={copy.header.wishCount(visible.length)}
                layout={layout}
                onLayout={setLayout}
              />
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          isPending ? undefined : wishes.length === 0 ? (
            <EmptyState
              icon="heart"
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
              <Button variant="quiet" onPress={filters.clear}>
                {copy.filter.showEverything}
              </Button>
            </View>
          )
        }
      />
      <WardrobeFilterSheet
        open={sheet}
        onClose={() => setSheet(false)}
        filters={filters}
        brands={brands}
        wearChoices={wearChoicesOf([])}
        count={visible.length}
      />
    </View>
  );
}
