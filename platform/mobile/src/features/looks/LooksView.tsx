import type { Look } from '@robes/contracts';
import { lookbook as copy, filters as filterCopy, ui } from '@robes/copy';
import { lookFacets } from '@robes/core/filters';
import { Icon } from '@robes/icons/native';
import {
  CardSkeleton,
  EmptyState,
  Eyebrow,
  FINE_EDGE,
  fonts,
  IconButton,
  maxFontSizeMultiplier,
  Tabs,
  useColor,
} from '@robes/ui-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import { TabScreen } from '@/components/TabScreen';
import { FilterRow } from '@/features/filters/FilterRow';
import { FilterSheet } from '@/features/filters/FilterSheet';
import { useLookFilters } from '@/features/filters/use-look-filters';
import { NewLookBox } from '@/features/home/HomeBox';
import { errorMessage } from '@/lib/errors';
import { DiarySheet } from './DiarySheet';
import { DraftTile, SavedTile, SuggestedTile } from './LookTiles';
import { useLetGo, useLooksByStatus, useRestyle, useSaveLook } from './look-states';
import { NewLookSheet } from './NewLookSheet';

type Tab = 'saved' | 'suggested';
const TABS = [copy.tabs.saved, copy.tabs.suggested] as const;
type TabLabel = (typeof TABS)[number];
const tabOf = (label: TabLabel): Tab => (label === copy.tabs.saved ? 'saved' : 'suggested');
const labelOf = (tab: Tab): TabLabel => (tab === 'saved' ? copy.tabs.saved : copy.tabs.suggested);
// A pull past this reveals the search (PRD Q6: hidden, drag it down).
const REVEAL_PULL = -48;

// The Lookbook (Front Door PRD rev 3 §5): SAVED · SUGGESTED as underline tabs with their glyphs
// and the + that opens New Look; one filter row (and sheet) shared by both tabs, its counts
// following the tab in view; a search the pull reveals; drafts as the In progress row; then the
// grid. Web twin: app/src/components/looks/lookbook.tsx.
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
  const save = useSaveLook(undefined, 'suggested');
  const [newLook, setNewLook] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [searching, setSearching] = useState(false);
  // The calendar on a card opens the same diary sheet, over the grid — she never leaves it.
  const [diary, setDiary] = useState<Look | null>(null);
  const ink = useColor('ink');
  const muted = useColor('ink-muted');
  const faint = useColor('ink-faint');

  const current = tab === 'saved' ? saved : suggested;
  const all = useMemo(() => (current.data?.items ?? []).map(lookFacets), [current.data]);
  // One filter state for both tabs: switching Saved ↔ Suggested keeps it; the counts follow.
  const filters = useLookFilters(all);
  const items = filters.filtered;
  const draftItems = drafts.data?.items ?? [];
  const open = (look: Look) =>
    router.push(look.status === 'draft' ? `/looks/draft/${look.id}` : `/look/${look.id}`);
  const onPull = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (e.nativeEvent.contentOffset.y < REVEAL_PULL) setSearching(true);
  };

  const toolbar = (
    <Tabs
      items={TABS}
      value={labelOf(tab)}
      onChange={(label) => setTab(tabOf(label))}
      icons={{ [copy.tabs.saved]: 'bookmark', [copy.tabs.suggested]: 'looks' }}
      trailing={
        <IconButton framed icon="plus" label={copy.newLook} onPress={() => setNewLook(true)} />
      }
      testID="lookbook-tabs"
    />
  );

  const header = (
    <View className="gap-4 pb-5">
      <FilterRow
        sheetCount={filters.sheetCount}
        onOpenSheet={() => setSheet(true)}
        seasons={filters.state.seasons}
        onRemoveSeason={filters.toggleSeason}
        quick={filters.quick}
        active={filters.state.wearFor}
        onToggle={filters.toggleWear}
        allCount={filters.allCount}
        onAll={filters.clearWear}
        testID="lookbook-filter-row"
      />
      {searching || filters.state.query ? (
        <View
          className="h-10 flex-row items-center gap-2 rounded-pill border-rule-mid bg-surface-raised px-3.5"
          style={{ borderWidth: FINE_EDGE }}
        >
          <Icon name="search" size={13} color={muted} />
          <TextInput
            autoFocus
            value={filters.state.query}
            onChangeText={filters.setQuery}
            placeholder={copy.search}
            placeholderTextColor={faint}
            accessibilityLabel={copy.search}
            className="min-w-0 flex-1 py-0 text-xs"
            style={{ fontFamily: fonts.sans, color: ink }}
            testID="lookbook-search"
          />
        </View>
      ) : null}
      {tab === 'saved' && draftItems.length ? (
        <View className="gap-[10px]">
          <Eyebrow>{copy.inProgress}</Eyebrow>
          <FlatList
            horizontal
            data={draftItems}
            keyExtractor={(l) => l.id}
            showsHorizontalScrollIndicator={false}
            // The row bleeds past the right gutter so the next draft peeks.
            className="-mr-5"
            contentContainerClassName="gap-[10px] pr-5"
            renderItem={({ item }) => <DraftTile look={item} onPress={() => open(item)} />}
          />
          <View className="mt-3 h-px bg-hairline" />
        </View>
      ) : null}
    </View>
  );

  return (
    <TabScreen toolbar={toolbar}>
      {(tabScroll) => (
        <>
          {current.isPending ? (
            <View className="flex-row gap-3 px-5 pt-5">
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
              {...tabScroll}
              data={items}
              keyExtractor={(l) => l.id}
              numColumns={2}
              columnWrapperClassName="gap-3"
              contentContainerClassName="gap-3 px-5 pt-[14px] pb-8"
              ListHeaderComponent={header}
              onScrollEndDrag={onPull}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <View className="flex-1">
                  {tab === 'saved' ? (
                    <SavedTile
                      look={item}
                      aspect="3:4"
                      onPress={() => open(item)}
                      onDiary={() => setDiary(item)}
                      onDelete={() => letGo(item.id)}
                    />
                  ) : (
                    <SuggestedTile
                      look={item}
                      aspect="3:4"
                      onPress={() => open(item)}
                      onRemove={() => letGo(item.id)}
                      onSwap={() => restyle.restyle(item.id)}
                      swapping={restyle.busyId === item.id}
                      onSave={() => save.mutate({ params: { id: item.id }, input: {} })}
                      saving={save.isPending && save.variables?.params.id === item.id}
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
                filters.active ? (
                  // A filter that matches nothing names it (PRD §5.1): the italic serif line.
                  <Text
                    className="py-8 text-center text-ink text-xl"
                    style={{ fontFamily: fonts.displayItalic }}
                    maxFontSizeMultiplier={maxFontSizeMultiplier.body}
                    testID="lookbook-no-match"
                  >
                    {copy.noMatch}
                  </Text>
                ) : tab === 'saved' ? (
                  draftItems.length ? undefined : (
                    <EmptyState
                      icon="bookmark"
                      title={copy.savedEmpty.title}
                      body={copy.savedEmpty.body}
                      action={{
                        label: `+ ${copy.newLook}`,
                        variant: 'primary',
                        onPress: () => setNewLook(true),
                      }}
                      testID="lookbook-empty"
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
          <FilterSheet
            open={sheet}
            onClose={() => setSheet(false)}
            sections={[
              {
                key: 'season',
                title: filterCopy.season,
                options: filters.seasonSection,
                selected: filters.state.seasons,
                onToggle: (v) => filters.toggleSeason(v as (typeof filters.state.seasons)[number]),
              },
              {
                key: 'wear',
                title: filterCopy.wearFor,
                options: filters.wearSection,
                selected: filters.state.wearFor,
                onToggle: filters.toggleWear,
              },
            ]}
            onClear={filters.clear}
            clearable={filters.active}
            cta={filterCopy.showLooks(items.length)}
            ctaDisabled={items.length === 0}
            testID="lookbook-filter-sheet"
          />
          <NewLookSheet open={newLook} onClose={() => setNewLook(false)} />
          <DiarySheet look={diary} onClose={() => setDiary(null)} />
        </>
      )}
    </TabScreen>
  );
}
