import type { Look } from '@robes/contracts';
import { lookbook as copy, nav, ui } from '@robes/copy';
import { type LookSort, SORT_FROM, SORTS, sortLooks } from '@robes/core/looks';
import {
  CardSkeleton,
  Chip,
  EmptyState,
  IconButton,
  SegmentedControl,
  Text,
} from '@robes/ui-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { TabScreen } from '@/components/TabScreen';
import { errorMessage } from '@/lib/errors';
import { DraftTile, SavedTile, SuggestedTile } from './LookTiles';
import { useLetGo, useLooksByStatus, useRestyle } from './look-states';
import { NewLookBox } from './NewLookBox';

type Tab = 'saved' | 'suggested';
const TABS = [
  { value: 'saved', label: copy.tabs.saved },
  { value: 'suggested', label: copy.tabs.suggested },
] as const;

// The Lookbook (legacy F2–F7): Saved | Suggested; drafts lead Saved as an In progress rail.
export function LooksView() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'suggested' ? 'suggested' : 'saved');
  const saved = useLooksByStatus('saved');
  const drafts = useLooksByStatus('draft');
  const suggested = useLooksByStatus('suggested', { refetch: true });
  const restyle = useRestyle();
  const letGo = useLetGo();
  const [sort, setSort] = useState<LookSort>('newest');
  const current = tab === 'saved' ? saved : suggested;
  const raw = current.data?.items ?? [];
  const sortable = tab === 'saved' && raw.length >= SORT_FROM;
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
        <View className="flex-row gap-2" accessibilityLabel={copy.sort.label}>
          {SORTS.map((s) => (
            <Chip key={s} selected={sort === s} onPress={() => setSort(s)}>
              {copy.sort[s]}
            </Chip>
          ))}
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
                <SavedTile look={item} onPress={() => open(item)} />
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
    </TabScreen>
  );
}
