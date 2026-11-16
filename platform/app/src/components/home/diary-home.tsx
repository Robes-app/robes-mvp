'use client';

import { queryKeys, useApi } from '@robes/api-client/react';
import type { DiaryDay, Today } from '@robes/contracts';
import { home as homeCopy, today as todayCopy } from '@robes/copy';
import { weekdayLong } from '@robes/core/calendar';
import { greetingName } from '@robes/core/home';
import { WEATHER_STALE_MS, weatherIcon, weatherTemp, weatherWord } from '@robes/core/weather';
import { Icon } from '@robes/icons/web';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { DayCard } from './day-card';
import { DiaryStrip } from './diary-strip';

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

// Home as the OOTD diary (Felix 3a · 3k, D7): the greeting and today's weather, the strip, the
// selected day as its `DayCard` — its looks with Swap · Edit, then her model with Capture ·
// Create · Pick. Home holds no prompt box; alerts live behind the bell. The
// native twin is mobile/src/features/home/DiaryHome.tsx.
export function DiaryHome({
  initial,
  day = null,
  saved = null,
}: {
  initial: Today;
  day?: string | null;
  // The look just saved from its draft (`?saved=`): its card says so for the visit.
  saved?: string | null;
}) {
  const queryClient = useQueryClient();
  useState(() => queryClient.setQueryData(queryKeys.call('today.get'), initial));
  const { data = initial } = useApi('today.get', undefined, {
    initialData: initial,
    // Back from a drawer (Describe, D22) the page's props are the first visit's: read the day
    // again whenever Home mounts.
    refetchOnMount: 'always',
    refetchInterval: (q) => (isRunning(q.state.data) ? 2_000 : false),
  });
  const weather = useApi('today.weather', undefined, {
    staleTime: WEATHER_STALE_MS,
    refetchOnWindowFocus: false,
  });
  const today = data.date;
  const diary = data.diary;
  const inWindow = day && diary?.days.some((d) => d.date === day) ? day : today;
  const [selected, setSelected] = useState(inWindow);
  const current: DiaryDay = diary?.days.find((d) => d.date === selected) ??
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
  const name = greetingName(data.firstName);
  const metaLine = homeCopy.meta(weekdayLong(today), wx?.city ?? null, wx ? weatherTemp(wx) : null);

  return (
    <div
      className="mx-auto flex w-full max-w-[640px] flex-col gap-6 pt-6 pb-8"
      data-home="diary"
      data-selected={current.date}
    >
      <header className="flex flex-col gap-2">
        {/* Below 768 the greeting stands in the bar (the shell's HomeMark); this names the page. */}
        <h1 className="font-display font-light leading-[1.05] text-ink max-md:sr-only md:text-[clamp(36px,5vw,48px)]">
          {todayCopy.greeting(name, data.hour)}
        </h1>
        {/* Today's weather, only ever today's: the day she picks on the strip never moves it. */}
        <p
          className="flex items-center gap-2 font-sans text-[10px] font-normal uppercase tracking-[0.2em] text-ink-faint"
          data-testid="home-meta"
        >
          {metaLine}
          {wx && wxIcon ? <Icon name={wxIcon} size={14} label={weatherWord(wx)} /> : null}
        </p>
      </header>

      {diary ? (
        <DiaryStrip
          days={diary.days}
          today={today}
          selected={current.date}
          onSelect={setSelected}
        />
      ) : null}

      {/* Keyed by the day: a day change starts the pager on its first page (PRD rev 3 §3). */}
      <DayCard
        key={current.date}
        origin="home"
        day={current}
        today={today}
        justSaved={saved}
        forget={(id) =>
          queryClient.setQueryData(queryKeys.call('today.get'), withoutDiaryEntry(id))
        }
        refresh={refresh}
      />
    </div>
  );
}
