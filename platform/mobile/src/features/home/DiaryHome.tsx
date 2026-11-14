import { queryKeys, useApi } from '@robes/api-client/react';
import type { DiaryDay, Today } from '@robes/contracts';
import { home as homeCopy } from '@robes/copy';
import { weekdayLong } from '@robes/core/calendar';
import { WEATHER_STALE_MS, weatherIcon, weatherTemp, weatherWord } from '@robes/core/weather';
import { Icon } from '@robes/icons/native';
import { ErrorText, Eyebrow, PrimaryScope, useColor } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useTabScroll } from '@/components/TabScreen';
import { errorMessage } from '@/lib/errors';
import { usePullRefresh } from '@/lib/pull-refresh';
import { DayCard } from './DayCard';
import { DiaryStrip } from './DiaryStrip';

// The draft Robes is making for a day (plan 2026-11-03): read every 2 s. Home shows no tray of
// jobs (design 1b).
const isRunning = (t: Today | undefined) =>
  t?.diary?.days.some((d) => d.draft?.jobId || d.draft?.look?.framePending) ?? false;

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

// The content's own foot under the last row (pb-6); the tab bar's height is in contentInset.
const BOTTOM_PAD = 24;

// Home as the OOTD diary (Felix 3a · 3k, D7): today's weather (the greeting is in the bar), the
// strip, the selected day as its `DayCard` — its looks with Swap · Edit, then her model with
// Capture · Create · Pick. Home holds no prompt box; alerts live behind the bell. The web twin is app/src/components/home/diary-home.tsx.
export function DiaryHome({
  day = null,
  saved = null,
}: {
  day?: string | null;
  // The look just saved from its draft (`?saved=`): its card says so for the visit.
  saved?: string | null;
} = {}) {
  const tabScroll = useTabScroll();
  const queryClient = useQueryClient();
  const faint = useColor('ink-faint');
  const query = useApi('today.get', undefined, {
    refetchInterval: (q) => (isRunning(q.state.data) ? 2_000 : false),
  });
  // The day's forecast changes slowly: no refetch on every focus or mount.
  const pull = usePullRefresh(query.refetch);
  const weather = useApi('today.weather', undefined, {
    staleTime: WEATHER_STALE_MS,
    refetchOnWindowFocus: false,
  });
  const [picked, setPicked] = useState<string | null>(null);
  // Home opens with nothing to scroll (Felix, 12 Nov): the day's slot gets the height left under
  // the strip, and sizes its page to it.
  const [viewport, setViewport] = useState<number | null>(null);
  const [slotTop, setSlotTop] = useState<number | null>(null);
  const room =
    viewport !== null && slotTop !== null
      ? viewport - (tabScroll.contentInset?.bottom ?? 0) - slotTop - BOTTOM_PAD
      : null;
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
  const refresh = () =>
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('today.get') });

  const wx = weather.data;
  const wxIcon = weatherIcon(wx?.code);
  // Today's weather, only ever today's: the day she picks on the strip never moves it.
  const metaLine = homeCopy.meta(weekdayLong(today), wx?.city ?? null, wx ? weatherTemp(wx) : null);

  return (
    <ScrollView
      {...tabScroll}
      // The tab bar is already in contentInset (TabScreen): the content needs only its own foot
      // under it. Felix, 12 Nov, in place of the 22 on top and the 120 below (redline 7 Nov).
      contentContainerClassName="gap-6 px-5 pt-3 pb-6"
      onLayout={(e) => setViewport(e.nativeEvent.layout.height)}
      keyboardShouldPersistTaps="handled"
      testID="diary-home"
      refreshControl={<RefreshControl {...pull} />}
    >
      <PrimaryScope>
        {/* The greeting stands in the bar (TabScreen's HomeMark); the page opens on today. */}
        <View
          className="flex-row items-center gap-2"
          accessible
          accessibilityLabel={homeCopy.metaSpoken(wx && wxIcon ? weatherWord(wx) : null, metaLine)}
          testID="home-meta"
        >
          <Eyebrow>{metaLine}</Eyebrow>
          {wx && wxIcon ? <Icon name={wxIcon} size={14} color={faint} /> : null}
        </View>

        {diary ? (
          <DiaryStrip
            days={diary.days}
            today={today}
            selected={current.date}
            onSelect={setPicked}
          />
        ) : null}

        {/* Keyed by the day: a day change starts the pager on its first page (PRD rev 3 §3). */}
        <View onLayout={(e) => setSlotTop(e.nativeEvent.layout.y)} testID="day-slot-room">
          <DayCard
            key={current.date}
            origin="home"
            room={room}
            day={current}
            today={today}
            justSaved={saved}
            forget={(id) =>
              queryClient.setQueryData(queryKeys.call('today.get'), withoutDiaryEntry(id))
            }
            refresh={refresh}
          />
        </View>
      </PrimaryScope>
    </ScrollView>
  );
}
