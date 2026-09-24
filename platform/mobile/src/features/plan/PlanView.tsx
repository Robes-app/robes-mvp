import type { PlanEntry } from '@robes/contracts';
import { plan as copy, ui } from '@robes/copy';
import {
  Button,
  Card,
  CardSkeleton,
  EmptyState,
  Eyebrow,
  Field,
  IconButton,
  Image,
  Text,
} from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { errorMessage } from '@/lib/errors';
import { renditionUri } from '@/lib/images';
import { dayLabel, usePlan, useUnpin, useUpdateEntry } from './plan';

function EntryCard({ entry }: { entry: PlanEntry }) {
  const router = useRouter();
  const unpin = useUnpin();
  const update = useUpdateEntry();
  const [activity, setActivity] = useState(entry.activity ?? '');
  const { look } = entry;
  const uri = renditionUri(look.image ?? look.pieces[0]?.piece.image, 80);
  const dirty = activity.trim() !== (entry.activity ?? '');
  return (
    <Card className="gap-3 p-4" testID={`plan-entry-${entry.id}`}>
      <View className="flex-row items-center gap-3">
        {uri ? (
          <View style={{ width: 56 }}>
            <Image source={uri} alt="" blurhash={look.image?.blurhash} />
          </View>
        ) : null}
        <View className="flex-1">
          <Button variant="quiet" onPress={() => router.push(`/look/${look.id}`)}>
            {look.name}
          </Button>
        </View>
        <IconButton
          icon="trash"
          tone="ink-muted"
          label={copy.unpin(look.name)}
          onPress={() => unpin.mutate({ params: { id: entry.id } })}
        />
      </View>
      <Field
        label={copy.activityLabel}
        placeholder={copy.activityPlaceholder}
        value={activity}
        onChangeText={setActivity}
        maxLength={120}
        returnKeyType="done"
        onSubmitEditing={() =>
          dirty &&
          update.mutate({
            params: { id: entry.id },
            input: { activity: activity.trim() || null },
          })
        }
      />
      {dirty ? (
        <Button
          variant="secondary"
          loading={update.isPending}
          loadingLabel={ui.loading}
          onPress={() =>
            update.mutate({
              params: { id: entry.id },
              input: { activity: activity.trim() || null },
            })
          }
        >
          {copy.saveActivity}
        </Button>
      ) : null}
    </Card>
  );
}

// The rolling 30 days (M5): a day with looks shows them; a free day stays quiet.
export function PlanView() {
  const { data, isPending, isError, error, refetch, isRefetching } = usePlan();
  if (isPending) {
    return (
      <View className="gap-3 px-6" accessibilityState={{ busy: true }}>
        <CardSkeleton />
        <CardSkeleton />
      </View>
    );
  }
  if (isError || !data) {
    return (
      <EmptyState
        title={errorMessage(error)}
        action={{ label: ui.retry, onPress: () => void refetch() }}
      />
    );
  }
  const planned = data.days.some((d) => d.entries.length > 0);
  return (
    <FlatList
      testID="plan-list"
      data={data.days}
      keyExtractor={(d) => d.date}
      contentContainerClassName="gap-4 px-6 pb-12"
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
      ListHeaderComponent={
        planned ? null : <EmptyState title={copy.empty.title} body={copy.empty.body} />
      }
      renderItem={({ item: day }) =>
        day.entries.length === 0 ? (
          <View className="flex-row justify-between">
            <Text size="small" tone="muted">
              {dayLabel(day.date, data.from)}
            </Text>
            <Text size="small" tone="muted">
              {copy.free}
            </Text>
          </View>
        ) : (
          <View className="gap-2">
            <Eyebrow>{dayLabel(day.date, data.from)}</Eyebrow>
            {day.entries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </View>
        )
      }
    />
  );
}
