import { useApi } from '@robes/api-client/react';
import type { ListPiecesInput, Piece } from '@robes/contracts';
import { wardrobe as copy, nav, ui } from '@robes/copy';
import { COLOUR_FAMILIES } from '@robes/core/colour';
import { WEAR_SEEDS } from '@robes/core/taxonomy';
import { rankCategories } from '@robes/core/wardrobe';
import {
  Button,
  CardSkeleton,
  EmptyState,
  Eyebrow,
  Pill,
  PrimaryScope,
  Sheet,
  Text,
} from '@robes/ui-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { type ReactNode, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { TabScreen } from '@/components/TabScreen';
import { errorMessage } from '@/lib/errors';
import { FamilyTile } from './ColourField';
import { useInbox } from './inbox';
import { useWardrobeLayout } from './layout';
import { AddRow, CardRow, type CardStatus, CardTile, StarButton } from './PieceCard';
import { useDeletePiece, usePieces, useStarPiece } from './pieces';
import { CategoryTabs, CountRow, HeaderRow, InboxNotice, type Segment } from './WardrobeHeader';
import { WishlistView } from './WishlistView';

const SEGMENTS: readonly Segment[] = ['pieces', 'wishlist'];
const SEASONS = ['spring_summer', 'autumn_winter', 'year_round'] as const;
type Season = (typeof SEASONS)[number];
type Category = NonNullable<ListPiecesInput['category']>;
// Filter (legacy Refine): one season, what she wears it for, one colour family, one brand.
type Refine = {
  season: Season | null;
  wear: string | null;
  family: string | null;
  brand: string | null;
};
const NO_REFINE: Refine = { season: null, wear: null, family: null, brand: null };
const refineInput = (r: Refine) => ({
  ...(r.season ? { seasonBand: r.season } : {}),
  ...(r.wear ? { wearFor: r.wear } : {}),
  ...(r.family ? { colourFamily: r.family } : {}),
  ...(r.brand ? { brand: r.brand } : {}),
});
const isRefined = (r: Refine) => Object.values(r).some((v) => v !== null);
// What she can pick to wear it for: the seeded words first, then any of her own.
const wearChoices = (own: readonly string[]) => [
  ...new Set([...WEAR_SEEDS.map((w) => w.label), ...own]),
];

function pieceStatus(piece: Piece): CardStatus {
  if (piece.status === 'reading') return { text: copy.reading, warm: false };
  if (piece.status === 'failed') return { text: copy.noPieceFound, warm: false, error: true };
  return piece.wearCount > 0
    ? { text: copy.card.worn(piece.wearCount), warm: false }
    : { text: copy.card.neverWorn, warm: true };
}

// Filter (legacy Refine): Season · Wear it for · Colour · Brand, counted before she applies them.
// The web twin is FilterSheet in app/src/components/wardrobe/piece-grid.tsx.
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
  const summary = useApi('wardrobe.summary', undefined, { enabled: open });
  const count = useApi(
    'wardrobe.list',
    { input: { limit: 1, ...(category ? { category } : {}), ...refineInput(pick) } },
    { enabled: open },
  );
  const toggle = <K extends keyof Refine>(key: K, value: NonNullable<Refine[K]>) =>
    setPick({ ...pick, [key]: pick[key] === value ? null : value });
  const brands = summary.data?.brands ?? [];
  return (
    <Sheet open={open} onClose={onClose} title={copy.filter.title} testID="wardrobe-filter-sheet">
      <PrimaryScope>
        <View className="gap-5">
          <FilterGroup legend={copy.filter.season} first>
            {SEASONS.map((s) => (
              <Pill key={s} selected={pick.season === s} onPress={() => toggle('season', s)}>
                {copy.filter.seasons[s]}
              </Pill>
            ))}
          </FilterGroup>
          <FilterGroup legend={copy.filter.wearFor}>
            {wearChoices(summary.data?.wearFor ?? []).map((w) => (
              <Pill key={w} selected={pick.wear === w} onPress={() => toggle('wear', w)}>
                {w}
              </Pill>
            ))}
          </FilterGroup>
          <FilterGroup legend={copy.filter.colour}>
            {/* The family as one quartered tile with its name beneath (legacy .rb-ref-fam). */}
            {COLOUR_FAMILIES.map((f) => (
              <Pressable
                key={f.id}
                accessibilityRole="button"
                accessibilityLabel={f.name}
                accessibilityState={{ selected: pick.family === f.id }}
                onPress={() => toggle('family', f.id)}
                style={{ width: 72 }}
                className={`items-center gap-1.5 rounded-crisp border px-1 py-1.5 ${
                  pick.family === f.id ? 'border-selected-line bg-selected' : 'border-transparent'
                }`}
              >
                <FamilyTile family={f} size={40} />
                <Text
                  size="caption"
                  tone={pick.family === f.id ? 'ink' : 'muted'}
                  weight={pick.family === f.id ? 'medium' : 'regular'}
                  numberOfLines={1}
                >
                  {f.name}
                </Text>
              </Pressable>
            ))}
          </FilterGroup>
          {brands.length ? (
            <FilterGroup legend={copy.filter.brand}>
              {brands.map((b) => (
                <Pill key={b} selected={pick.brand === b} onPress={() => toggle('brand', b)}>
                  {b}
                </Pill>
              ))}
            </FilterGroup>
          ) : null}
          <Button
            onPress={() => {
              onApply(pick);
              onClose();
            }}
          >
            {count.data ? copy.filter.show(count.data.total) : copy.filter.title}
          </Button>
          <Button variant="quiet" disabled={!isRefined(pick)} onPress={() => setPick(NO_REFINE)}>
            {copy.filter.clear}
          </Button>
        </View>
      </PrimaryScope>
    </Sheet>
  );
}

// One group of the Filter: its eyebrow, then its choices; a hairline above every group but the first.
function FilterGroup({
  legend,
  first = false,
  children,
}: {
  legend: string;
  first?: boolean;
  children: ReactNode;
}) {
  return (
    <View className={`gap-3 ${first ? '' : 'border-hairline border-t pt-5'}`}>
      <Eyebrow>{legend}</Eyebrow>
      <View className="flex-row flex-wrap gap-2">{children}</View>
    </View>
  );
}

function Pieces() {
  const router = useRouter();
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
  // Every way in starts on the Add pieces sheet (design "Add Piece — Handoff").
  const addPieces = () => router.push('/wardrobe/add');
  const refined = isRefined(refine);
  const filtered = category !== null || refined;

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
          <Button icon="plus" onPress={addPieces}>
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
              <AddRow label={copy.card.addRow} onPress={addPieces} />
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
  const inbox = useInbox();
  const receipts = inbox.data?.items.length ?? 0;
  const waiting = inbox.data?.count ?? 0;
  return (
    <TabScreen
      title={nav.wardrobe}
      toolbar={
        <HeaderRow
          segment={segment}
          onSegment={setSegment}
          addLabel={segment === 'wishlist' ? copy.header.savePiece : copy.header.addPiece}
          onAdd={() =>
            router.push({
              pathname: '/wardrobe/add',
              params: { to: segment === 'wishlist' ? 'wishlist' : 'wardrobe' },
            })
          }
        />
      }
    >
      {waiting > 0 ? (
        <InboxNotice
          receipts={receipts}
          pieces={waiting}
          onOpen={() => router.push('/wardrobe/inbox')}
        />
      ) : null}
      {segment === 'pieces' ? <Pieces /> : null}
      {segment === 'wishlist' ? <WishlistView /> : null}
    </TabScreen>
  );
}
