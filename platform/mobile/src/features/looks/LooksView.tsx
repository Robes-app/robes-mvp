import type { Idea, Look } from '@robes/contracts';
import { looks as copy, nav, shell, ui } from '@robes/copy';
import { Card, CardSkeleton, EmptyState, Image, SegmentedControl, Text } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { TabScreen } from '@/components/TabScreen';
import { errorMessage } from '@/lib/errors';
import { renditionUri } from '@/lib/images';
import { useIdeas } from './ideas';
import { useSavedLooks } from './saved-looks';

type Segment = 'saved' | 'ideas';
const SEGMENTS = [
  { value: 'saved', label: shell.segments.saved },
  { value: 'ideas', label: shell.segments.ideas },
] as const;

const DAY_MS = 86_400_000;

type Entry = { kind: 'look'; look: Look } | { kind: 'idea'; idea: Idea };

function LookCard({ look, onPress }: { look: Look; onPress: () => void }) {
  const first = look.pieces.find((p) => p.piece.image)?.piece.image;
  const uri = renditionUri(first, 180);
  return (
    <Card onPress={onPress} accessibilityLabel={look.name} className="flex-1">
      {uri ? <Image source={uri} alt="" blurhash={first?.blurhash} recyclingKey={look.id} /> : null}
      <View className="gap-1 p-2">
        <Text size="small" numberOfLines={1}>
          {look.name}
        </Text>
        <Text size="caption" tone="muted">
          {copy.look.worn(look.timesWorn)}
        </Text>
      </View>
    </Card>
  );
}

function IdeaCard({ idea, onPress }: { idea: Idea; onPress: () => void }) {
  const hero = idea.frames.find((f) => f.status === 'ready');
  const uri = renditionUri(hero?.image, 180);
  const days = idea.expiresAt
    ? Math.max(1, Math.ceil((Date.parse(idea.expiresAt) - Date.now()) / DAY_MS))
    : null;
  return (
    <Card onPress={onPress} accessibilityLabel={idea.title} className="flex-1">
      {uri ? (
        <Image source={uri} alt="" blurhash={hero?.image?.blurhash} recyclingKey={idea.id} />
      ) : null}
      <View className="gap-1 p-2">
        <Text size="small" numberOfLines={1}>
          {idea.title}
        </Text>
        {days !== null && idea.savedAt === null ? (
          <Text size="caption" tone="muted">
            {copy.ideas.expires(days)}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

export function LooksView() {
  const router = useRouter();
  const [segment, setSegment] = useState<Segment>('ideas');
  const { data, isPending, isError, error, refetch, isRefetching } = useIdeas();
  const saved = useSavedLooks();
  const ideas: Entry[] = (data?.items ?? [])
    .filter((i) => (segment === 'saved') === (i.savedAt !== null))
    .map((idea) => ({ kind: 'idea', idea }));
  // Saved: her built looks first, then ideas she kept.
  const items: Entry[] =
    segment === 'saved'
      ? [...(saved.data?.items ?? []).map((look): Entry => ({ kind: 'look', look })), ...ideas]
      : ideas;
  const empty =
    segment === 'ideas'
      ? {
          title: copy.ideas.empty.title,
          body: copy.ideas.empty.body,
          action: { label: copy.ideas.empty.action, onPress: () => router.push('/looks/style') },
        }
      : { title: copy.saved.empty.title, body: copy.saved.empty.body };

  return (
    <TabScreen title={nav.looks}>
      <View className="px-6 pb-3">
        <SegmentedControl
          label={copy.title}
          options={SEGMENTS}
          value={segment}
          onChange={setSegment}
        />
      </View>
      {isPending ? (
        <View className="flex-row gap-3 px-6">
          <CardSkeleton className="flex-1" />
          <CardSkeleton className="flex-1" />
        </View>
      ) : isError ? (
        <EmptyState
          title={errorMessage(error)}
          action={{ label: ui.retry, onPress: () => void refetch() }}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(e) => (e.kind === 'look' ? e.look.id : e.idea.id)}
          numColumns={2}
          columnWrapperClassName="gap-3"
          contentContainerClassName="gap-3 px-6 pb-8"
          renderItem={({ item }) => (
            <View className="flex-1">
              {item.kind === 'look' ? (
                <LookCard look={item.look} onPress={() => router.push(`/look/${item.look.id}`)} />
              ) : (
                <IdeaCard idea={item.idea} onPress={() => router.push(`/idea/${item.idea.id}`)} />
              )}
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void Promise.all([refetch(), saved.refetch()])}
            />
          }
          ListEmptyComponent={<EmptyState {...empty} />}
        />
      )}
    </TabScreen>
  );
}
