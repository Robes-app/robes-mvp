import type { Look } from '@robes/contracts';
import { lookbook as copy, filters as filterCopy, ui } from '@robes/copy';
import { lookFacets } from '@robes/core/filters';
import { lookbookCounts, showLookbookSearch } from '@robes/core/looks';
import { waitingSeed } from '@robes/core/seeds';
import {
  CardSkeleton,
  EmptyState,
  Eyebrow,
  fonts,
  IconButton,
  maxFontSizeMultiplier,
  Tabs,
} from '@robes/ui-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { TabScreen, TabSticky } from '@/components/TabScreen';
import { FilterRow } from '@/features/filters/FilterRow';
import { FilterSheet } from '@/features/filters/FilterSheet';
import { useLookFilters } from '@/features/filters/use-look-filters';
import { SearchRow } from '@/features/wardrobe/WardrobeHeader';
import { errorMessage } from '@/lib/errors';
import { usePullRefresh } from '@/lib/pull-refresh';
import { DeleteSuggestion } from './DeleteSuggestion';
import { DiarySheet } from './DiarySheet';
import { DraftTile, SavedLookCard, SuggestedTile } from './LookTiles';
import { useLetGo, useLooksByStatus, useSaveLook } from './look-states';
import { NewLookSheet } from './NewLookSheet';

type Tab = 'saved' | 'suggested';
const TABS = [copy.tabs.saved, copy.tabs.suggested] as const;
type TabLabel = (typeof TABS)[number];
const tabOf = (label: TabLabel): Tab => (label === copy.tabs.saved ? 'saved' : 'suggested');
const labelOf = (tab: Tab): TabLabel => (tab === 'saved' ? copy.tabs.saved : copy.tabs.suggested);

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
  const suggested = useLooksByStatus('suggested');
  const letGo = useLetGo();
  const save = useSaveLook(undefined, 'suggested');
  const [newLook, setNewLook] = useState(false);
  const [sheet, setSheet] = useState(false);
  // The calendar on a card opens the same diary sheet, over the grid — she never leaves it.
  const [diary, setDiary] = useState<Look | null>(null);
  // A suggestion's Delete look (its card's menu) asks first (design "Suggested looks" 07).
  const [deleting, setDeleting] = useState<string | null>(null);

  const current = tab === 'saved' ? saved : suggested;
  const pull = usePullRefresh(() => Promise.all([current.refetch(), drafts.refetch()]));
  const all = useMemo(() => (current.data?.items ?? []).map(lookFacets), [current.data]);
  // One filter state for both tabs: switching Saved ↔ Suggested keeps it; the counts follow.
  const filters = useLookFilters(all);
  const items = filters.filtered;
  const draftItems = drafts.data?.items ?? [];
  // A seeded drop waiting in Suggested (the Christmas trial): the Lookbook opens there once, on
  // arrival; a tap on Saved then stays on Saved. Web twin: lookbook.tsx.
  const seed = waitingSeed(suggested.data?.items ?? []);
  const drop = seed ? copy.seedDrops[seed] : undefined;
  const landed = useRef(false);
  useEffect(() => {
    if (landed.current || !suggested.data) return;
    landed.current = true;
    if (seed && !params.tab) setTab('suggested');
  }, [suggested.data, seed, params.tab]);
  // Each tab's count once it holds a look, and the tab in view's always (design "Suggested
  // looks": Saved 1 · Suggested 9, and Suggested 0 when the last has gone). Web twin: lookbook.tsx.
  const counted = lookbookCounts(tab, saved.data?.items.length, suggested.data?.items.length);
  const tabCounts = { [copy.tabs.saved]: counted.saved, [copy.tabs.suggested]: counted.suggested };
  const open = (look: Look) =>
    router.push(look.status === 'draft' ? `/looks/draft/${look.id}` : `/look/${look.id}`);

  const toolbar = (
    <Tabs
      items={TABS}
      value={labelOf(tab)}
      onChange={(label) => setTab(tabOf(label))}
      icons={{ [copy.tabs.saved]: 'bookmark', [copy.tabs.suggested]: 'looks' }}
      counts={tabCounts}
      // New look only on Saved: Suggested is what Robes brings (Annie, P2 15 Nov).
      {...(tab === 'saved'
        ? {
            trailing: (
              <IconButton
                framed
                icon="plus"
                label={copy.newLook}
                onPress={() => setNewLook(true)}
              />
            ),
          }
        : {})}
      testID="lookbook-tabs"
    />
  );

  const header = (
    <View className="gap-4 pb-5">
      {/* Pinned with the tabs in the glass chrome (Robes MVP 2b); in place on Android. */}
      <TabSticky>
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
      </TabSticky>
      {/* Search under the glass (Robes MVP 2b), once there is enough to search (50+ saved looks,
          Annie 16 Nov); the Lookbook has no list view. */}
      {showLookbookSearch(saved.data?.items.length ?? 0, filters.state.query) ? (
        <SearchRow
          placeholder={copy.search}
          value={filters.state.query}
          onChange={filters.setQuery}
          testID="lookbook-search"
        />
      ) : null}
      {tab === 'suggested' && drop ? (
        <View className="gap-[10px] pt-2" testID="seed-header">
          <Eyebrow className="text-accent-warm">{drop.title}</Eyebrow>
          <Text
            className="text-ink"
            style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 28 }}
            maxFontSizeMultiplier={maxFontSizeMultiplier.body}
          >
            {`${drop.line} `}
            <Text className="text-ink-muted" style={{ fontFamily: fonts.displayItalic }}>
              {copy.seedKeep}
            </Text>
          </Text>
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
    <TabScreen glass title={copy.title} toolbar={toolbar}>
      {(tabScroll) => (
        <>
          {current.isPending ? (
            <View
              className="flex-row gap-3 px-5 pt-5"
              style={{ marginTop: tabScroll.contentContainerStyle?.paddingTop ?? 0 }}
            >
              <CardSkeleton className="flex-1" />
              <CardSkeleton className="flex-1" />
            </View>
          ) : current.isError ? (
            <View style={{ paddingTop: tabScroll.contentContainerStyle?.paddingTop ?? 0 }}>
              <EmptyState
                title={errorMessage(current.error)}
                action={{ label: ui.retry, onPress: () => void current.refetch() }}
              />
            </View>
          ) : (
            <FlatList
              {...tabScroll}
              data={items}
              keyExtractor={(l) => l.id}
              numColumns={2}
              columnWrapperClassName="gap-3"
              contentContainerClassName="gap-3 px-5 pt-[14px] pb-8"
              ListHeaderComponent={header}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <View className="flex-1">
                  {tab === 'saved' ? (
                    <SavedLookCard
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
                      onSave={() => save.mutate({ params: { id: item.id }, input: {} })}
                      onDelete={() => setDeleting(item.id)}
                    />
                  )}
                </View>
              )}
              refreshControl={<RefreshControl {...pull} />}
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
                  // All done (design "Suggested looks" 08): the sparkle, one line, back to Saved.
                  <EmptyState
                    icon="looks"
                    title={copy.suggestedEmpty.title}
                    action={{
                      label: copy.suggestedEmpty.action,
                      variant: 'primary',
                      onPress: () => setTab('saved'),
                    }}
                    testID="suggested-empty"
                  />
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
          <DeleteSuggestion id={deleting} onClose={() => setDeleting(null)} />
        </>
      )}
    </TabScreen>
  );
}
