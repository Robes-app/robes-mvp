import type { Look } from '@robes/contracts';
import { lookbook as copy, nav, ui } from '@robes/copy';
import { type LookSort, SORT_FROM, SORTS, sortLooks } from '@robes/core/looks';
import {
  Button,
  CardSkeleton,
  Chip,
  EmptyState,
  Eyebrow,
  IconButton,
  SegmentedControl,
  Sheet,
  Text,
} from '@robes/ui-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { TabScreen } from '@/components/TabScreen';
import { errorMessage } from '@/lib/errors';
import { DiarySheet } from './DiarySheet';
import { DraftTile, SavedTile, SuggestedTile } from './LookTiles';
import { useLetGo, useLooksByStatus, useRestyle } from './look-states';
import { NewLookBox } from './NewLookBox';

type Tab = 'saved' | 'suggested';
// The only axis a saved look can be narrowed by today; Wear-it-for and Vibe need look tags.
const SEASON_BANDS = ['spring_summer', 'autumn_winter', 'year_round'] as const;
type SeasonBandId = (typeof SEASON_BANDS)[number];
const TABS = [
  { value: 'saved', label: copy.tabs.saved },
  { value: 'suggested', label: copy.tabs.suggested },
] as const;

// The Lookbook (legacy F2–F7): Saved | Suggested; drafts lead Saved as an In progress rail.
export function LooksView() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'suggested' ? 'suggested' : 'saved');
  // A door that names a tab (the deck's See Suggested) switches it even while Looks is mounted.
  useEffect(() => {
    if (params.tab === 'suggested' || params.tab === 'saved') setTab(params.tab);
  }, [params.tab]);
  const saved = useLooksByStatus('saved');
  const drafts = useLooksByStatus('draft');
  const suggested = useLooksByStatus('suggested', { refetch: true });
  const restyle = useRestyle();
  const letGo = useLetGo();
  const [sort, setSort] = useState<LookSort>('newest');
  const [sortOpen, setSortOpen] = useState(false);
  const [refineOpen, setRefineOpen] = useState(false);
  const [bands, setBands] = useState<SeasonBandId[]>([]);
  // The calendar on a card opens the same diary sheet, over the grid — she never leaves it.
  const [diary, setDiary] = useState<Look | null>(null);
  const current = tab === 'saved' ? saved : suggested;
  const all = current.data?.items ?? [];
  const raw =
    tab === 'saved' && bands.length
      ? all.filter((l) => bands.includes(l.climateBand as SeasonBandId))
      : all;
  const sortable = tab === 'saved' && all.length >= SORT_FROM;
  const items = sortable ? sortLooks(raw, sort) : raw;
  const draftItems = drafts.data?.items ?? [];
  const count =
    tab === 'saved'
      ? [
          items.length ? copy.count.looks(items.length) : null,
          draftItems.length ? copy.count.inProgress(draftItems.length) : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : items.length
        ? copy.count.suggested(items.length)
        : '';
  const open = (look: Look) => router.push(`/look/${look.id}`);

  const header = (
    <View className="gap-4 pb-3">
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <SegmentedControl label={copy.title} options={TABS} value={tab} onChange={setTab} />
        </View>
        {tab === 'saved' ? (
          <IconButton icon="plus" label={copy.newLook} onPress={() => router.push('/looks/new')} />
        ) : null}
      </View>
      {count ? (
        <Text size="small" tone="muted" testID="looks-count">
          {count}
        </Text>
      ) : null}
      {sortable ? (
        <View className="flex-row flex-wrap gap-2">
          {/* One chip naming the sort in play, opening the three — never three chips. */}
          <Chip onPress={() => setSortOpen(true)}>{`${copy.sort.label} · ${copy.sort[sort]}`}</Chip>
          <Chip
            selected={refineOpen}
            onPress={() => setRefineOpen(!refineOpen)}
          >{`${copy.refine.open}${bands.length ? ` · ${copy.refine.on}` : ''}`}</Chip>
        </View>
      ) : null}
      {refineOpen && sortable ? (
        <View
          accessibilityLabel={copy.refine.title}
          className="gap-3 rounded-soft border border-hairline bg-surface p-4"
        >
          <Eyebrow>{copy.refine.season}</Eyebrow>
          <View className="flex-row flex-wrap gap-2">
            {SEASON_BANDS.map((b) => (
              <Chip
                key={b}
                selected={bands.includes(b)}
                onPress={() =>
                  setBands(bands.includes(b) ? bands.filter((x) => x !== b) : [...bands, b])
                }
              >
                {copy.refine.seasons[b]}
              </Chip>
            ))}
          </View>
          <View className="flex-row items-center justify-between gap-2">
            <Button variant="quiet" disabled={!bands.length} onPress={() => setBands([])}>
              {copy.refine.clear}
            </Button>
            <Button variant="secondary" onPress={() => setRefineOpen(false)}>
              {copy.refine.show(items.length)}
            </Button>
          </View>
        </View>
      ) : null}
      {tab === 'saved' && draftItems.length ? (
        <View className="gap-2">
          <Text size="caption" tone="muted">
            {copy.inProgress}
          </Text>
          <FlatList
            horizontal
            data={draftItems}
            keyExtractor={(l) => l.id}
            contentContainerClassName="gap-3"
            renderItem={({ item }) => <DraftTile look={item} onPress={() => open(item)} />}
          />
        </View>
      ) : null}
    </View>
  );

  return (
    <TabScreen title={nav.looks}>
      {current.isPending ? (
        <View className="flex-row gap-3 px-6">
          <CardSkeleton className="flex-1" />
          <CardSkeleton className="flex-1" />
        </View>
      ) : current.isError ? (
        <EmptyState
          title={errorMessage(current.error)}
          action={{ label: ui.retry, onPress: () => void current.refetch() }}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(l) => l.id}
          numColumns={2}
          columnWrapperClassName="gap-3"
          contentContainerClassName="gap-3 px-6 pb-8"
          ListHeaderComponent={header}
          renderItem={({ item }) => (
            <View className="flex-1">
              {tab === 'saved' ? (
                <SavedTile
                  look={item}
                  onPress={() => open(item)}
                  onDiary={() => setDiary(item)}
                  onDelete={() => letGo(item.id)}
                />
              ) : (
                <SuggestedTile
                  look={item}
                  onPress={() => open(item)}
                  onRemove={() => letGo(item.id)}
                  onSwap={() => restyle.restyle(item.id)}
                  swapping={restyle.busyId === item.id}
                />
              )}
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={current.isRefetching}
              onRefresh={() => void Promise.all([current.refetch(), drafts.refetch()])}
            />
          }
          ListEmptyComponent={
            tab === 'saved' ? (
              draftItems.length ? null : (
                <EmptyState
                  title={copy.savedEmpty.title}
                  body={copy.savedEmpty.body}
                  action={{ label: copy.newLook, onPress: () => router.push('/looks/new') }}
                />
              )
            ) : (
              <View className="gap-4">
                <EmptyState title={copy.suggestedEmpty.title} body={copy.suggestedEmpty.body} />
                <NewLookBox />
              </View>
            )
          }
        />
      )}
      <Sheet open={sortOpen} onClose={() => setSortOpen(false)} title={copy.sort.label}>
        <View className="gap-2">
          {SORTS.map((s) => (
            <Button
              key={s}
              variant={sort === s ? 'secondary' : 'quiet'}
              onPress={() => {
                setSort(s);
                setSortOpen(false);
              }}
            >
              {copy.sort[s]}
            </Button>
          ))}
        </View>
      </Sheet>
      <DiarySheet look={diary} onClose={() => setDiary(null)} />
    </TabScreen>
  );
}
