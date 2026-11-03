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
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { isTerminal } from '@/features/looks/ideas';
import { LookPicker } from '@/features/plan/LookPicker';
import { errorMessage } from '@/lib/errors';
import { DayOneBand } from './DayOneBand';
import { DaySlot } from './DaySlot';
import { DiaryStrip } from './DiaryStrip';
import { dayWordOf, type PickerMode } from './diary';
import { LogSheet } from './LogSheet';
import { PromptBox } from './PromptBox';

const isRunning = (t: Today | undefined) => t?.tray.some((j) => !isTerminal(j)) ?? false;

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

// Home as the OOTD diary (Front Door design 3a · 3k, plan 2026-11-02 §1): the greeting and
// today's weather, the strip, the selected day's slot, and — for today and days ahead — the
// prompt box. Alerts live behind the bell; the day-one band (P3) sits above the strip. The web
// twin is app/src/components/home/diary-home.tsx.
export function DiaryHome({ day = null }: { day?: string | null } = {}) {
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
  const [picked, setPicked] = useState<string | null>(null);
  const [log, setLog] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<{ date: string; mode: PickerMode } | null>(null);
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
  // Her home, with the selected day's weather there: the diary's day when she is home, else the
  // masthead's reading (today's) stands in for the name alone.
  const homePlace =
    !current.place && current.weather?.city
      ? {
          city: current.weather.city,
          weather: { tempRange: current.weather.tempRange, code: current.weather.code },
        }
      : weather.data?.city
        ? { city: weather.data.city, weather: null }
        : null;
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
    // The prompt box's field rides above the keyboard (parity plan N2), as StylePiece's does.
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <ScrollView
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

          <DayOneBand state={data.home.state} />

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
            dayWord={dayWord}
            onAdd={() => setLog(current.date)}
            onChange={() => setDrawer({ date: current.date, mode: 'change' })}
            onRemove={remove}
          />

          {past ? null : (
            <PromptBox
              day={current}
              today={today}
              home={homePlace}
              hasPieces={data.home.state.pics > 0}
            />
          )}

          {data.tray.length > 0 ? <Tray jobs={data.tray} /> : null}

          <LogSheet
            date={log}
            today={today}
            onClose={() => setLog(null)}
            onPick={(date) => {
              setLog(null);
              setDrawer({ date, mode: 'add' });
            }}
          />
          <LookPicker
            date={drawer?.date ?? null}
            today={today}
            mode={drawer?.mode ?? 'add'}
            onClose={() => setDrawer(null)}
            onChanged={refresh}
          />
        </PrimaryScope>
      </ScrollView>
    </KeyboardAvoidingView>
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
