import { useApi } from '@robes/api-client/react';
import type { Piece } from '@robes/contracts';
import { wardrobe as copy, filters as filterCopy, ui } from '@robes/copy';
import { SEASON_OPTIONS, type SeasonOption, WEAR_FOR_ALL } from '@robes/core/filters';
import { rankCategories } from '@robes/core/wardrobe';
import { Button, CardSkeleton, EmptyState, PrimaryScope, Text } from '@robes/ui-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { TabScreen, useTabScroll } from '@/components/TabScreen';
import { BrandSelect } from '@/features/filters/BrandSelect';
import { FilterRow } from '@/features/filters/FilterRow';
import { FilterSheet } from '@/features/filters/FilterSheet';
import { SwatchGrid } from '@/features/filters/SwatchGrid';
import { useWardrobeFilters, type WardrobeFilters } from '@/features/filters/use-wardrobe-filters';
import { errorMessage } from '@/lib/errors';
import { AddPiecesSheet } from './add/AddPiecesSheet';
import { DeletePieceDialog } from './DeletePieceDialog';
import { useWardrobeLayout } from './layout';
import { AddRow, CardRow, type CardStatus, CardTile, StarButton } from './PieceCard';
import { useDeletePiece, usePieces, useStarPiece } from './pieces';
import { CountRow, HeaderRow, type Segment } from './WardrobeHeader';
import { WishlistView } from './WishlistView';

const SEGMENTS: readonly Segment[] = ['pieces', 'wishlist'];

function pieceStatus(piece: Piece): CardStatus {
  if (piece.status === 'reading') return { text: copy.reading, warm: false };
  if (piece.status === 'failed') return { text: copy.noPieceFound, warm: false, error: true };
  return piece.wearCount > 0
    ? { text: copy.card.worn(piece.wearCount), warm: false }
    : { text: copy.card.neverWorn, warm: true };
}

// The wardrobe's filter sheet (Front Door PRD rev 3 §7.1a): SEASON and WEAR IT FOR as pills with
// no counts, COLOUR as the swatch grid, BRAND as the select. Filters apply live; the one button
// reads what they leave. Web twin: WardrobeFilterSheet in app/src/components/wardrobe/piece-grid.tsx.
export function WardrobeFilterSheet({
  open,
  onClose,
  filters,
  brands,
  wearChoices,
  count,
}: {
  open: boolean;
  onClose: () => void;
  filters: WardrobeFilters;
  brands: readonly string[];
  wearChoices: readonly string[];
  count: number | null;
}) {
  return (
    <FilterSheet
      open={open}
      onClose={onClose}
      sections={[
        {
          key: 'season',
          title: filterCopy.season,
          counts: false,
          options: SEASON_OPTIONS.map((value) => ({
            value,
            label: filterCopy.seasons[value],
            count: 0,
          })),
          selected: filters.state.seasons,
          onToggle: (v) => filters.toggleSeason(v as SeasonOption),
        },
        {
          key: 'wear',
          title: filterCopy.wearFor,
          counts: false,
          options: wearChoices.map((value) => ({ value, label: value, count: 0 })),
          selected: filters.state.wearFor,
          onToggle: filters.toggleWear,
        },
        {
          key: 'colour',
          title: copy.filter.colour,
          custom: <SwatchGrid selected={filters.state.families} onToggle={filters.toggleFamily} />,
        },
        ...(brands.length
          ? [
              {
                key: 'brand',
                title: copy.filter.brand,
                custom: (
                  <BrandSelect
                    brands={brands}
                    value={filters.state.brand}
                    onChange={filters.setBrand}
                  />
                ),
              },
            ]
          : []),
      ]}
      onClear={filters.clearSheet}
      clearable={filters.sheetCount > 0}
      cta={filterCopy.showPieces(count ?? 0)}
      ctaDisabled={count === 0}
      testID="wardrobe-filter-sheet"
    />
  );
}

// One list for the wear-it-for section: the shared list, then her own tags.
export function wearChoicesOf(own: readonly string[]): string[] {
  const seen = new Set(WEAR_FOR_ALL.map((w) => w.toLowerCase()));
  const extra = own.filter((w) => !seen.has(w.toLowerCase()));
  return [...WEAR_FOR_ALL, ...extra];
}

function Pieces({ onAdd }: { onAdd: () => void }) {
  const tabScroll = useTabScroll();
  const router = useRouter();
  const [layout, setLayout] = useWardrobeLayout();
  const filters = useWardrobeFilters();
  const [sheet, setSheet] = useState(false);
  // The chips count under the sheet's filters (the category itself set aside); the last answer
  // stands while the next loads, so the sheet's brand list never blinks away between picks.
  const summary = useApi(
    'wardrobe.summary',
    { input: filters.sheetInput },
    { placeholderData: (prev) => prev },
  );
  const {
    pieces,
    total,
    isPending,
    isError,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
  } = usePieces(filters.input);
  const star = useStarPiece();
  const remove = useDeletePiece();
  // The row's swipe asks first, as the piece page does (R14).
  const [asking, setAsking] = useState<string | null>(null);
  // Every way in starts on the Add pieces sheet (Front Door PRD rev 3 §7.4), the Wardrobe's.
  const addPieces = onAdd;
  const owned = summary.data?.total ?? null;
  // "Other" isn't a place to browse to; its pieces stay under All (beta's sheet).
  const categories = useMemo(
    () =>
      rankCategories(summary.data?.categories ?? [])
        .filter((c) => c !== 'Other')
        .map((c) => ({
          value: c,
          label: c,
          count: summary.data?.categories.find((x) => x.category === c)?.count ?? 0,
        })),
    [summary.data],
  );
  const allCount = summary.data?.categories.reduce((n, c) => n + c.count, 0) ?? 0;

  if (isPending) {
    return (
      <View
        className="flex-row gap-3 px-5 pt-5"
        accessibilityLabel={copy.title}
        accessibilityState={{ busy: true }}
      >
        <CardSkeleton className="flex-1" />
        <CardSkeleton className="flex-1" />
      </View>
    );
  }
  if (isError) {
    return (
      <EmptyState
        title={errorMessage(error)}
        action={{ label: ui.retry, onPress: () => void refetch() }}
      />
    );
  }
  if (owned === 0 || (pieces.length === 0 && !filters.active && owned === null)) {
    return (
      <PrimaryScope>
        <View className="px-5 pt-8">
          <EmptyState
            icon="wardrobe"
            title={copy.empty.title}
            body={copy.empty.body}
            action={{ label: `+ ${copy.empty.action}`, variant: 'primary', onPress: addPieces }}
            testID="wardrobe-empty"
          />
        </View>
      </PrimaryScope>
    );
  }

  const grid = layout === 'grid';
  return (
    <View className="flex-1">
      <View className="px-5 pt-3">
        <FilterRow
          sheetCount={filters.sheetCount}
          onOpenSheet={() => setSheet(true)}
          seasons={[]}
          onRemoveSeason={() => undefined}
          quick={categories}
          active={filters.state.category ? [filters.state.category] : []}
          onToggle={filters.setCategory}
          allCount={allCount}
          onAll={() => filters.setCategory(null)}
          testID="wardrobe-filter-row"
        />
      </View>
      <CountRow
        count={total === null ? null : copy.header.count(total)}
        layout={layout}
        onLayout={setLayout}
      />
      <FlatList
        {...tabScroll}
        testID="pieces-list"
        key={layout}
        data={pieces}
        keyExtractor={(p) => p.id}
        numColumns={grid ? 3 : 1}
        {...(grid ? { columnWrapperClassName: 'gap-2' } : {})}
        contentContainerClassName={grid ? 'gap-2 px-5 pb-8' : 'gap-2 px-5 pb-8'}
        renderItem={({ item }) => {
          const open = () => router.push(`/piece/${item.id}`);
          return grid ? (
            <CardTile piece={item} status={pieceStatus(item)} onOpen={open} compact />
          ) : (
            <CardRow
              piece={item}
              status={pieceStatus(item)}
              action={
                <StarButton
                  label={item.label}
                  on={item.heroPosition !== null}
                  onToggle={() => star(item)}
                />
              }
              onOpen={open}
              removeText={copy.card.swipeDelete}
              removeLabel={copy.deletePiece(item.label)}
              onRemove={() => setAsking(item.id)}
            />
          );
        }}
        onEndReachedThreshold={0.5}
        onEndReached={() => (hasNextPage ? void fetchNextPage() : undefined)}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
        }
        ListFooterComponent={
          !grid && !hasNextPage && pieces.length > 0 ? (
            <View className="pt-2">
              <AddRow label={copy.card.addRow} onPress={addPieces} />
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          <View className="items-start gap-3 py-6">
            <Text tone="muted">{copy.filter.nothing}</Text>
            <Button variant="quiet" onPress={filters.clear}>
              {copy.filter.showEverything}
            </Button>
          </View>
        }
      />
      <WardrobeFilterSheet
        open={sheet}
        onClose={() => setSheet(false)}
        filters={filters}
        brands={summary.data?.brands ?? []}
        wearChoices={wearChoicesOf(summary.data?.wearFor ?? [])}
        count={total}
      />
      <DeletePieceDialog
        open={asking !== null}
        onDelete={() => {
          if (asking) remove.mutate({ params: { id: asking } });
          setAsking(null);
        }}
        onCancel={() => setAsking(null)}
      />
    </View>
  );
}

export function WardrobeView() {
  // `?segment=wishlist` opens a segment directly; the old `?segment=inbox` (Today, receipts)
  // now opens the pushed Inbox.
  const params = useLocalSearchParams<{ segment?: string }>();
  const router = useRouter();
  const [segment, setSegment] = useState<Segment>(
    SEGMENTS.includes(params.segment as Segment) ? (params.segment as Segment) : 'pieces',
  );
  useEffect(() => {
    if (params.segment === 'inbox') {
      router.setParams({ segment: undefined });
      router.push('/wardrobe/inbox');
    }
  }, [params.segment, router]);
  // The + and the empty states open the Add pieces sheet (PRD rev 3 §7.4): the three tiles over
  // the Wardrobe, filing to the segment she is on.
  const [adding, setAdding] = useState(false);
  return (
    <TabScreen
      title={copy.title}
      toolbar={
        <HeaderRow
          segment={segment}
          onSegment={setSegment}
          addLabel={segment === 'wishlist' ? copy.header.savePiece : copy.header.addPiece}
          onAdd={() => setAdding(true)}
        />
      }
    >
      {segment === 'pieces' ? <Pieces onAdd={() => setAdding(true)} /> : null}
      {segment === 'wishlist' ? <WishlistView /> : null}
      <AddPiecesSheet
        open={adding}
        onClose={() => setAdding(false)}
        to={segment === 'wishlist' ? 'wishlist' : 'wardrobe'}
      />
    </TabScreen>
  );
}
