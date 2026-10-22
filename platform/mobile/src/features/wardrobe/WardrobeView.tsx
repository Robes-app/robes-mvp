import { useApi } from '@robes/api-client/react';
import type { ListPiecesInput, Piece } from '@robes/contracts';
import { wardrobe as copy, nav, ui } from '@robes/copy';
import { rankCategories } from '@robes/core/wardrobe';
import {
  Button,
  CardSkeleton,
  EmptyState,
  Pill,
  PrimaryScope,
  Sheet,
  Text,
  useToast,
} from '@robes/ui-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { TabScreen } from '@/components/TabScreen';
import { errorMessage } from '@/lib/errors';
import { useAddPieces } from './add-pieces';
import { InboxView } from './InboxView';
import { useWardrobeLayout } from './layout';
import { AddRow, CardRow, type CardStatus, CardTile, StarButton } from './PieceCard';
import { useDeletePiece, usePieces, useStarPiece } from './pieces';
import { CategoryTabs, CountRow, HeaderRow, type Segment } from './WardrobeHeader';
import { WishlistView } from './WishlistView';

const SEGMENTS: readonly Segment[] = ['pieces', 'wishlist', 'inbox'];
const SEASONS = ['spring_summer', 'autumn_winter', 'year_round'] as const;
type Season = (typeof SEASONS)[number];
type Category = NonNullable<ListPiecesInput['category']>;

function pieceStatus(piece: Piece): CardStatus {
  if (piece.status === 'reading') return { text: copy.reading, warm: false };
  if (piece.status === 'failed') return { text: copy.noPieceFound, warm: false, error: true };
  return piece.wearCount > 0
    ? { text: copy.card.worn(piece.wearCount), warm: false }
    : { text: copy.card.neverWorn, warm: true };
}

// Filter (legacy Refine): the season, counted before she applies it.
function FilterSheet({
  open,
  onClose,
  category,
  season,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  category: Category | null;
  season: Season | null;
  onApply: (season: Season | null) => void;
}) {
  const [pick, setPick] = useState<Season | null>(season);
  useEffect(() => {
    if (open) setPick(season);
  }, [open, season]);
  const count = useApi(
    'wardrobe.list',
    {
      input: { limit: 1, ...(category ? { category } : {}), ...(pick ? { seasonBand: pick } : {}) },
    },
    { enabled: open },
  );
  return (
    <Sheet open={open} onClose={onClose} title={copy.filter.title} testID="wardrobe-filter-sheet">
      <PrimaryScope>
        <View className="gap-6">
          <View className="gap-3">
            <Text size="caption" tone="muted">
              {copy.filter.season}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {SEASONS.map((s) => (
                <Pill key={s} selected={pick === s} onPress={() => setPick(pick === s ? null : s)}>
                  {copy.filter.seasons[s]}
                </Pill>
              ))}
            </View>
          </View>
          <Button
            onPress={() => {
              onApply(pick);
              onClose();
            }}
          >
            {count.data ? copy.filter.show(count.data.total) : copy.filter.title}
          </Button>
          <Button variant="quiet" disabled={pick === null} onPress={() => setPick(null)}>
            {copy.filter.clear}
          </Button>
        </View>
      </PrimaryScope>
    </Sheet>
  );
}

function Pieces() {
  const router = useRouter();
  const toast = useToast();
  const [layout, setLayout] = useWardrobeLayout();
  const [category, setCategory] = useState<Category | null>(null);
  const [season, setSeason] = useState<Season | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const summary = useApi('wardrobe.summary');
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
  } = usePieces({
    ...(category ? { category } : {}),
    ...(season ? { seasonBand: season } : {}),
  });
  const star = useStarPiece();
  const remove = useDeletePiece();
  const { add, busy } = useAddPieces();
  const filtered = category !== null || season !== null;

  async function addFromLibrary() {
    const result = await add('library');
    if (result.status === 'denied' || result.status === 'failed')
      toast.show({ message: result.message });
  }

  if (isPending) {
    return (
      <View
        className="flex-row gap-3 px-6 pt-5"
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
  if (pieces.length === 0 && !filtered) {
    return (
      <PrimaryScope>
        <View className="items-center gap-2 px-6 pt-8">
          <EmptyState title={copy.empty.title} body={copy.empty.body} />
          <Button icon="plus" onPress={addFromLibrary} loading={busy} loadingLabel={ui.loading}>
            {copy.empty.action}
          </Button>
        </View>
      </PrimaryScope>
    );
  }

  const grid = layout === 'grid';
  return (
    <View className="flex-1">
      <CategoryTabs
        categories={rankCategories(summary.data?.categories ?? [])}
        value={category}
        onChange={(c) => setCategory(c as Category | null)}
      />
      <CountRow
        count={total === null ? null : copy.header.count(total)}
        filter={{ on: season !== null, onOpen: () => setFilterOpen(true) }}
        layout={layout}
        onLayout={setLayout}
      />
      <FlatList
        testID="pieces-list"
        key={layout}
        data={pieces}
        keyExtractor={(p) => p.id}
        numColumns={grid ? 2 : 1}
        {...(grid ? { columnWrapperClassName: 'gap-3' } : {})}
        contentContainerClassName={grid ? 'gap-5 px-6 pb-8' : 'gap-2 px-6 pb-8'}
        renderItem={({ item }) => {
          const open = () => router.push(`/piece/${item.id}`);
          const action = (
            <StarButton
              label={item.label}
              on={item.heroPosition !== null}
              onToggle={() => star(item)}
              tile={grid}
            />
          );
          return grid ? (
            <CardTile piece={item} status={pieceStatus(item)} action={action} onOpen={open} />
          ) : (
            <CardRow
              piece={item}
              status={pieceStatus(item)}
              action={action}
              onOpen={open}
              removeLabel={copy.removePiece(item.label)}
              onRemove={() => remove.mutate({ params: { id: item.id } })}
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
              <AddRow label={copy.card.addRow} onPress={addFromLibrary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View className="items-start gap-3 py-6">
            <Text tone="muted">{copy.filter.nothing}</Text>
            <Button
              variant="quiet"
              onPress={() => {
                setCategory(null);
                setSeason(null);
              }}
            >
              {copy.filter.showEverything}
            </Button>
          </View>
        }
      />
      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        category={category}
        season={season}
        onApply={setSeason}
      />
    </View>
  );
}

export function WardrobeView() {
  // `?segment=inbox` opens a segment directly (e.g. after pasting a link).
  const params = useLocalSearchParams<{ segment?: string }>();
  const router = useRouter();
  const [segment, setSegment] = useState<Segment>(
    SEGMENTS.includes(params.segment as Segment) ? (params.segment as Segment) : 'pieces',
  );
  const [adding, setAdding] = useState(false);
  return (
    <TabScreen title={nav.wardrobe}>
      <HeaderRow
        segment={segment}
        onSegment={setSegment}
        addLabel={segment === 'wishlist' ? copy.header.savePiece : copy.header.addPiece}
        onAdd={() => (segment === 'wishlist' ? setAdding(true) : router.push('/create'))}
      />
      {segment === 'pieces' ? <Pieces /> : null}
      {segment === 'wishlist' ? <WishlistView adding={adding} /> : null}
      {segment === 'inbox' ? <InboxView /> : null}
    </TabScreen>
  );
}
