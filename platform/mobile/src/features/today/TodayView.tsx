import { useApi } from '@robes/api-client/react';
import type { Today } from '@robes/contracts';
import { today as copy, looks, type NextDoorTarget, nextLine } from '@robes/copy';
import { Button, Heading, Image, PrimaryScope, Text } from '@robes/ui-native';
import { type Href, useRouter } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { errorMessage } from '@/lib/errors';
import { renditionUri } from '@/lib/images';
import { isTerminal } from '../looks/ideas';
import { dayLabel } from '../plan/plan';

const isRunning = (t: Today | undefined) => t?.tray.some((j) => !isTerminal(j)) ?? false;

function doorHref(target: NextDoorTarget, t: Today): Href | null {
  const look = t.today.find((e) => !e.worn)?.entry.look;
  const routes: Record<NextDoorTarget, Href | null> = {
    addPieces: '/wardrobe',
    newLook: '/looks/new',
    todayLook: look ? `/look/${look.id}` : null,
    plan: '/plan',
    model: '/you/model',
  };
  return routes[target];
}

function trayHref(job: Today['tray'][number]): Href {
  if (job.kind === 'stylenotes_analyse') return '/you/style';
  if (job.kind === 'travel') {
    return job.output.tripId ? `/trip/${job.output.tripId}` : `/trip/job/${job.id}`;
  }
  // Daily looks and their on-demand item renders (look_render) open the daily look.
  if (job.kind === 'daily' || job.output.dailyLookId) {
    return job.output.dailyLookId
      ? `/today/look/${job.output.dailyLookId}`
      : `/today/job/${job.id}`;
  }
  return job.output.ideaId ? `/idea/${job.output.ideaId}` : `/looks/job/${job.id}`;
}

// Today tab (IA §3.2): the same read as the web home, refreshing only while a tray job runs.
export function TodayView() {
  const router = useRouter();
  const query = useApi('today.get', undefined, {
    refetchInterval: (q) => (isRunning(q.state.data) ? 2_000 : false),
  });
  const data = query.data;
  if (query.isError) {
    return (
      <View className="flex-1 justify-center px-6">
        <Text tone="danger">{errorMessage(query.error)}</Text>
      </View>
    );
  }
  const line = data ? nextLine(data.nextStep) : null;
  const door = data && line?.door ? doorHref(line.door.target, data) : null;
  return (
    <ScrollView
      contentContainerClassName="gap-8 px-6 py-8"
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
      }
    >
      <PrimaryScope>
        <View className="gap-3">
          <Heading size="xl">
            {copy.greeting(data?.firstName ?? null, data?.hour ?? new Date().getHours())}
          </Heading>
          {line ? <Text tone="muted">{line.text}</Text> : null}
          {line?.door && door ? (
            <Pressable accessibilityRole="link" onPress={() => router.push(door)}>
              <Text className="underline">{`${line.door.label} →`}</Text>
            </Pressable>
          ) : null}
          <View className="mt-2 flex-row flex-wrap gap-3">
            <Button icon="ask" onPress={() => router.push('/looks/style')}>
              {looks.stylePiece.eyebrow}
            </Button>
            <Button variant="secondary" onPress={() => router.push('/today/style')}>
              {copy.daily.action}
            </Button>
          </View>
        </View>
      </PrimaryScope>

      {data && data.inboxCount > 0 ? (
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push({ pathname: '/wardrobe', params: { segment: 'inbox' } })}
        >
          <Text className="underline">{copy.inbox(data.inboxCount)}</Text>
        </Pressable>
      ) : null}

      {data?.overnight ? (
        <View className="gap-2">
          <Heading size="md">{copy.overnight.title}</Heading>
          <Text>{data.overnight.headline || data.overnight.title}</Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`${copy.overnight.open}: ${data.overnight.headline || data.overnight.title}`}
            onPress={() => router.push(`/today/look/${data.overnight?.id}`)}
          >
            <Text className="underline">{`${copy.overnight.open} →`}</Text>
          </Pressable>
        </View>
      ) : null}

      {data && data.today.length > 0 ? (
        <View className="gap-3">
          <Heading size="md">{copy.todayLooks}</Heading>
          {data.today.map(({ entry, worn }) => {
            const uri = renditionUri(entry.look.image ?? entry.look.pieces[0]?.piece.image, 240);
            return (
              <Pressable
                key={entry.id}
                accessibilityRole="link"
                accessibilityLabel={entry.activity ?? entry.look.name}
                onPress={() => router.push(`/look/${entry.look.id}`)}
                className="flex-row items-center gap-3"
              >
                {uri ? (
                  <View style={{ width: 72 }}>
                    <Image source={uri} alt="" blurhash={entry.look.image?.blurhash} />
                  </View>
                ) : null}
                <View className="flex-1">
                  <Text>{entry.activity ?? entry.look.name}</Text>
                  {worn ? <Text tone="muted">{copy.worn}</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {data ? (
        <View className="gap-3">
          <Heading size="md">{copy.week}</Heading>
          <View className="flex-row gap-1">
            {data.week.map((d) => {
              const label = dayLabel(d.date, data.date);
              return (
                <Pressable
                  key={d.date}
                  accessibilityRole="link"
                  accessibilityLabel={copy.weekDay(label, d.looks)}
                  onPress={() => router.push('/plan')}
                  className="flex-1 items-center gap-1 rounded-crisp border border-hairline py-2"
                >
                  <Text className="text-xs">{label.split(' ')[0]}</Text>
                  <Text className="text-xs">
                    {d.looks > 0 ? '●'.repeat(Math.min(d.looks, 3)) : '·'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {data && data.tray.length > 0 ? (
        <View className="gap-2">
          <Heading size="md">{copy.tray.title}</Heading>
          {data.tray.map((job) => (
            <Pressable
              key={job.id}
              accessibilityRole="link"
              onPress={() => router.push(trayHref(job))}
              className="flex-row justify-between"
            >
              <Text>
                {job.kind === 'stylenotes_analyse'
                  ? copy.tray.styleColour
                  : job.kind === 'travel'
                    ? copy.tray.trip
                    : job.kind === 'daily' || job.output.dailyLookId
                      ? copy.daily.trayTitle
                      : copy.tray.stylePiece}
              </Text>
              <Text tone="muted">
                {!isTerminal(job)
                  ? copy.tray.running
                  : job.status === 'failed' || job.status === 'cancelled'
                    ? copy.tray.failed
                    : copy.tray.ready}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {data && data.ideas.length > 0 ? (
        <View className="gap-3">
          <Heading size="md">{copy.ideas}</Heading>
          {data.ideas.map((idea) => (
            <Pressable
              key={idea.id}
              accessibilityRole="link"
              accessibilityLabel={idea.title}
              onPress={() => router.push(`/idea/${idea.id}`)}
            >
              <Text>{idea.title}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}
