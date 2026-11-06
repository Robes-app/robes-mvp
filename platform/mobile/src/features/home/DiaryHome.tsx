import { queryKeys, useApi, useApiClient } from '@robes/api-client/react';
import type { DiaryDay, PlanEntry, Today } from '@robes/contracts';
import { diary as copy, home as homeCopy, today as todayCopy, ui } from '@robes/copy';
import { weekdayLong } from '@robes/core/calendar';
import { greetingName, trayKind, trayState } from '@robes/core/home';
import { WEATHER_STALE_MS, weatherIcon, weatherTemp, weatherWord } from '@robes/core/weather';
import { Icon } from '@robes/icons/native';
import {
  ErrorText,
  Eyebrow,
  Heading,
  MIN_TOUCH,
  PrimaryScope,
  Text,
  useColor,
  useToast,
} from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useTabScroll } from '@/components/TabScreen';
import { isTerminal } from '@/features/looks/ideas';
import { useRestyle } from '@/features/looks/look-states';
import { LookPicker } from '@/features/plan/LookPicker';
import { errorMessage } from '@/lib/errors';
import { DaySlot } from './DaySlot';
import { DiaryStrip } from './DiaryStrip';
import { dayWordOf, type PickerMode } from './diary';
import { ModelPicker } from './ModelPicker';

// The tray's jobs, and the draft Robes is making for a day (plan 2026-11-03): read every 2 s.
const isRunning = (t: Today | undefined) =>
  (t?.tray.some((j) => !isTerminal(j)) ?? false) ||
  (t?.diary?.days.some((d) => d.draft?.jobId || d.draft?.look?.framePending) ?? false);

// Today's cache with one look taken off its day (optimistic; the server read follows).
export function withoutDiaryEntry(id: string) {
  return (old: unknown): unknown => {
    const t = old as Today | undefined;
    if (!t?.diary) return old;
    return {
      ...t,
      diary: {
        ...t.diary,
        days: t.diary.days.map((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== id) })),
      },
    };
  };
}

// Home as the OOTD diary (Felix 3a · 3k, D7): the greeting and today's weather, the strip, the
// selected day — its looks with Swap · Edit, then her model with Capture · Describe · Pick.
// Describe opens the Draft look sheet for the day (D22); Home holds no prompt box. Alerts live
// behind the bell. The web twin is app/src/components/home/diary-home.tsx.
export function DiaryHome({
  day = null,
  saved = null,
}: {
  day?: string | null;
  // The look just saved from its draft (`?saved=`): its card says so for the visit.
  saved?: string | null;
} = {}) {
  const tabScroll = useTabScroll();
  const api = useApiClient();
  const queryClient = useQueryClient();
  const toast = useToast();
  const faint = useColor('ink-faint');
  const query = useApi('today.get', undefined, {
    refetchInterval: (q) => (isRunning(q.state.data) ? 2_000 : false),
  });
  // The day's forecast changes slowly: no refetch on every focus or mount.
  const weather = useApi('today.weather', undefined, {
    staleTime: WEATHER_STALE_MS,
    refetchOnWindowFocus: false,
  });
  // The model her looks stand on: the photograph on the day's last page, and the picker's ticks.
  const model = useApi('me.model.get');
  const [picked, setPicked] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);
  const router = useRouter();
  const [drawer, setDrawer] = useState<{ date: string; mode: PickerMode } | null>(null);
  // ↻ on the draft tile: another take, same brief.
  const another = useRestyle();
  // The tab stays mounted: a bell nudge or deep link lands on its day whenever it arrives.
  useEffect(() => {
    if (day) setPicked(day);
  }, [day]);
  const data = query.data;
  if (query.isError) {
    return (
      <View className="flex-1 justify-center px-6">
        <ErrorText>{errorMessage(query.error)}</ErrorText>
      </View>
    );
  }
  if (!data) return null;
  const today = data.date;
  const diary = data.diary;
  const inWindow = picked && diary?.days.some((d) => d.date === picked) ? picked : today;
  const current: DiaryDay = diary?.days.find((d) => d.date === inWindow) ??
    diary?.days.find((d) => d.date === today) ?? {
      date: today,
      name: null,
      place: null,
      weather: null,
      entries: [],
      draft: null,
    };
  const past = current.date < today;
  const dayWord = dayWordOf(current.date, today);
  const refresh = () =>
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('today.get') });

  // × on the OOTD: a planned look is unpinned, a worn one has its wear taken back; both undo.
  const remove = (entry: PlanEntry) => {
    queryClient.setQueryData(queryKeys.call('today.get'), withoutDiaryEntry(entry.id));
    const date = current.date;
    const call = entry.worn
      ? api.call('looks.unwear', { params: { id: entry.look.id, date } })
      : api.call('plan.unpin', { params: { id: entry.id } });
    void call
      .then(() =>
        toast.show({
          message: copy.slot.removed,
          action: {
            label: ui.undo,
            onPress: () =>
              void (
                entry.worn
                  ? api.call('looks.wear', {
                      params: { id: entry.look.id },
                      input: { wornOn: date },
                    })
                  : api.call('plan.restore', { params: { id: entry.id } })
              )
                .then(refresh)
                .catch((err) => toast.show({ message: errorMessage(err) })),
          },
        }),
      )
      .catch((err) => toast.show({ message: errorMessage(err) }))
      .finally(refresh);
  };

  const wx = weather.data;
  const wxIcon = weatherIcon(wx?.code);
  const name = greetingName(data.firstName);
  // Today's weather, only ever today's: the day she picks on the strip never moves it.
  const metaLine = homeCopy.meta(weekdayLong(today), wx?.city ?? null, wx ? weatherTemp(wx) : null);

  return (
    <ScrollView
      {...tabScroll}
      contentContainerClassName="gap-6 px-5 pt-[22px] pb-8"
      keyboardShouldPersistTaps="handled"
      testID="diary-home"
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
      }
    >
      <PrimaryScope>
        <View className="gap-2">
          <Heading size="xl" style={{ fontSize: 32, lineHeight: 34 }}>
            {todayCopy.greeting(name, data.hour)}
          </Heading>
          <View
            className="flex-row items-center gap-2"
            accessible
            accessibilityLabel={homeCopy.metaSpoken(
              wx && wxIcon ? weatherWord(wx) : null,
              metaLine,
            )}
            testID="home-meta"
          >
            <Eyebrow>{metaLine}</Eyebrow>
            {wx && wxIcon ? <Icon name={wxIcon} size={14} color={faint} /> : null}
          </View>
        </View>

        {diary ? (
          <DiaryStrip
            days={diary.days}
            today={today}
            selected={current.date}
            onSelect={setPicked}
          />
        ) : null}

        <DaySlot
          day={current}
          today={today}
          dayWord={dayWord}
          justSaved={saved}
          model={model.data}
          actions={{
            // The camera opens on arrival: one tap from the day to her photograph.
            onCapture: () =>
              router.push({
                pathname: '/looks/photo',
                params: { day: current.date, start: 'camera' },
              }),
            // Describe opens the Draft look sheet for the day (Felix 3a, D22).
            onDescribe: past ? null : () => router.push(`/looks/draft/new?day=${current.date}`),
            onPick: () => setDrawer({ date: current.date, mode: 'add' }),
            onSwap: () => setDrawer({ date: current.date, mode: 'change' }),
            onEdit: (entry) => router.push(`/looks/draft/${entry.look.id}?day=${current.date}`),
            onRemove: remove,
            onModel: () => setChoosing(true),
          }}
          onAnother={another.restyle}
          anotherBusy={another.busyId !== null && another.busyId === current.draft?.look?.id}
        />

        {data.tray.length > 0 ? <Tray jobs={data.tray} /> : null}

        <ModelPicker open={choosing} model={model.data} onClose={() => setChoosing(false)} />
        <LookPicker
          date={drawer?.date ?? null}
          today={today}
          mode={drawer?.mode ?? 'add'}
          onClose={() => setDrawer(null)}
          onChanged={refresh}
        />
      </PrimaryScope>
    </ScrollView>
  );
}

type TrayJob = Today['tray'][number];
// Where a tray row opens: the native routes for the web's trayHref (home-view.tsx).
function trayRoute(job: TrayJob): string {
  const kind = trayKind(job);
  if (kind === 'styleColour') return '/you/style';
  if (kind === 'trip') {
    return job.output.tripId ? `/trip/${job.output.tripId}` : `/trip/job/${job.id}`;
  }
  if (kind === 'daily') {
    return job.output.dailyLookId
      ? `/today/look/${job.output.dailyLookId}`
      : `/today/job/${job.id}`;
  }
  return job.output.ideaId ? `/idea/${job.output.ideaId}` : `/looks/job/${job.id}`;
}
const TRAY_TITLE = {
  styleColour: todayCopy.tray.styleColour,
  trip: todayCopy.tray.trip,
  daily: todayCopy.daily.trayTitle,
  stylePiece: todayCopy.tray.stylePiece,
} as const;

// The studio tray: running jobs and ones just finished, each opening where it lands (the web twin
// is home-view.tsx). Twin of diary-home.tsx.
export function Tray({ jobs }: { jobs: TrayJob[] }) {
  const router = useRouter();
  return (
    <View className="gap-3" testID="home-tray">
      <Eyebrow>{todayCopy.tray.title}</Eyebrow>
      <View className="gap-2">
        {jobs.map((job) => {
          const title = TRAY_TITLE[trayKind(job)];
          const state = todayCopy.tray[trayState(job.status)];
          return (
            <Pressable
              key={job.id}
              accessibilityRole="link"
              accessibilityLabel={`${title} · ${state}`}
              onPress={() => router.push(trayRoute(job))}
              style={{ minHeight: MIN_TOUCH }}
              className="flex-row items-center justify-between gap-4"
            >
              <Text>{title}</Text>
              <Text tone="muted">{state}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
