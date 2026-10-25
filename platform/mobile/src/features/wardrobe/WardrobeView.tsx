import { useApi } from '@robes/api-client/react';
import type { ListPiecesInput, Piece } from '@robes/contracts';
import { wardrobe as copy, nav, ui } from '@robes/copy';
import { COLOUR_FAMILIES } from '@robes/core/colour';
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
import { useInbox } from './inbox';
import { useWardrobeLayout } from './layout';
import { AddRow, CardRow, type CardStatus, CardTile, StarButton } from './PieceCard';
import { useDeletePiece, usePieces, useStarPiece } from './pieces';
import { CategoryTabs, CountRow, HeaderRow, InboxRow, type Segment } from './WardrobeHeader';
import { WishlistView } from './WishlistView';

const SEGMENTS: readonly Segment[] = ['pieces', 'wishlist'];
const SEASONS = ['spring_summer', 'autumn_winter', 'year_round'] as const;
type Season = (typeof SEASONS)[number];
type Category = NonNullable<ListPiecesInput['category']>;
type Refine = { season: Season | null; family: string | null };
const NO_REFINE: Refine = { season: null, family: null };
const refineInput = (r: Refine) => ({
  ...(r.season ? { seasonBand: r.season } : {}),
  ...(r.family ? { colourFamily: r.family } : {}),
});

function pieceStatus(piece: Piece): CardStatus {
  if (piece.status === 'reading') return { text: copy.reading, warm: false };
  if (piece.status === 'failed') return { text: copy.noPieceFound, warm: false, error: true };
  return piece.wearCount > 0
    ? { text: copy.card.worn(piece.wearCount), warm: false }
    : { text: copy.card.neverWorn, warm: true };
}

// Filter (legacy Refine): the season and the colour family, counted before she applies them.
function FilterSheet({
  open,
  onClose,
  category,
  refine,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  category: Category | null;
  refine: Refine;
  onApply: (refine: Refine) => void;
}) {
  const [pick, setPick] = useState<Refine>(refine);
  useEffect(() => {
    if (open) setPick(refine);
  }, [open, refine]);
  const count = useApi(
    'wardrobe.list',
    { input: { limit: 1, ...(category ? { category } : {}), ...refineInput(pick) } },
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
                <Pill
                  key={s}
                  selected={pick.season === s}
                  onPress={() => setPick({ ...pick, season: pick.season === s ? null : s })}
                >
                  {copy.filter.seasons[s]}
                </Pill>
              ))}
            </View>
          </View>
          <View className="gap-3">
            <Text size="caption" tone="muted">
              {copy.filter.colour}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {COLOUR_FAMILIES.map((f) => (
                <Pill
                  key={f.id}
                  selected={pick.family === f.id}
                  onPress={() => setPick({ ...pick, family: pick.family === f.id ? null : f.id })}
                >
                  {f.name}
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
          <Button
            variant="quiet"
            disabled={pick.season === null && pick.family === null}
            onPress={() => setPick(NO_REFINE)}
          >
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
  const [refine, setRefine] = useState<Refine>(NO_REFINE);
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
    ...refineInput(refine),
  });
  const star = useStarPiece();
  const remove = useDeletePiece();
  const { add, busy } = useAddPieces();
  const refined = refine.season !== null || refine.family !== null;
  const filtered = category !== null || refined;

  async function addFromLibrary() {
    const result = await add('library');
    if (result.status === 'denied' || result.status === 'failed')
      toast.show({ message: result.message });
  }

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
        // "Other" isn't a place to browse to; its pieces stay under All (beta's sheet).
        categories={rankCategories(summary.data?.categories ?? []).filter((c) => c !== 'Other')}
        value={category}
        onChange={(c) => setCategory(c as Category | null)}
      />
      <CountRow
        count={total === null ? null : copy.header.count(total)}
        filter={{ on: refined, onOpen: () => setFilterOpen(true) }}
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
        contentContainerClassName={grid ? 'gap-3 px-5 pb-8' : 'gap-2 px-5 pb-8'}
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
          ) : undefined
        }
        ListEmptyComponent={
          <View className="items-start gap-3 py-6">
            <Text tone="muted">{copy.filter.nothing}</Text>
            <Button
              variant="quiet"
              onPress={() => {
                setCategory(null);
                setRefine(NO_REFINE);
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
        refine={refine}
        onApply={setRefine}
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
  const [adding, setAdding] = useState(false);
  const inbox = useInbox();
  const waiting = (inbox.data?.items ?? []).reduce((n, e) => n + e.items.length, 0);
  return (
    <TabScreen
      title={nav.wardrobe}
      toolbar={
        <HeaderRow
          segment={segment}
          onSegment={setSegment}
          addLabel={segment === 'wishlist' ? copy.header.savePiece : copy.header.addPiece}
          onAdd={() => (segment === 'wishlist' ? setAdding(true) : router.push('/create'))}
        />
      }
    >
      {waiting > 0 ? (
        <InboxRow count={waiting} onOpen={() => router.push('/wardrobe/inbox')} />
      ) : null}
      {segment === 'pieces' ? <Pieces /> : null}
      {segment === 'wishlist' ? <WishlistView adding={adding} /> : null}
    </TabScreen>
  );
}
