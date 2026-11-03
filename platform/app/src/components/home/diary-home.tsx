'use client';

import { queryKeys, useApi, useApiClient } from '@robes/api-client/react';
import type { DiaryDay, PlanEntry, Today } from '@robes/contracts';
import { diary as copy, home as homeCopy, today as todayCopy, wardrobe } from '@robes/copy';
import { weekdayLong } from '@robes/core/calendar';
import { greetingName, trayKind, trayState } from '@robes/core/home';
import { isTerminalJobStatus } from '@robes/core/jobs';
import { WEATHER_STALE_MS, weatherIcon, weatherTemp, weatherWord } from '@robes/core/weather';
import { Icon } from '@robes/icons/web';
import { Eyebrow, Text, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { LookPicker } from '@/app/(app)/plan/look-picker';
import { dayWordOf, type PickerMode } from '@/lib/diary';
import { errorCopy } from '@/lib/error-copy';
import { DayOneBand } from './day-one-band';
import { DaySlot } from './day-slot';
import { DiaryStrip } from './diary-strip';
import { LogSheet } from './log-sheet';
import { PromptBox } from './prompt-box';

const isRunning = (t: Today | undefined) =>
  t?.tray.some((j) => !isTerminalJobStatus(j.status)) ?? false;

type TrayJob = Today['tray'][number];
function trayHref(job: TrayJob): string {
  const kind = trayKind(job);
  if (kind === 'styleColour') return '/you/style';
  if (kind === 'trip') {
    return job.output.tripId ? `/trip/${job.output.tripId}` : `/trip/job/${job.id}`;
  }
  if (kind === 'daily') {
    return job.output.dailyLookId
      ? `/today/looks/${job.output.dailyLookId}`
      : `/today/style/${job.id}`;
  }
  return job.output.ideaId ? `/looks/ideas/${job.output.ideaId}` : `/looks/style/${job.id}`;
}
const TRAY_TITLE = {
  styleColour: todayCopy.tray.styleColour,
  trip: todayCopy.tray.trip,
  daily: todayCopy.daily.trayTitle,
  stylePiece: todayCopy.tray.stylePiece,
} as const;

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
// prompt box. Alerts live behind the bell; the day-one band (P3) sits above the strip. The native
// twin is mobile/src/features/home/DiaryHome.tsx.
export function DiaryHome({ initial, day = null }: { initial: Today; day?: string | null }) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const toast = useToast();
  useState(() => queryClient.setQueryData(queryKeys.call('today.get'), initial));
  const { data = initial } = useApi('today.get', undefined, {
    initialData: initial,
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
  const [log, setLog] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<{ date: string; mode: PickerMode } | null>(null);
  const current: DiaryDay = diary?.days.find((d) => d.date === selected) ??
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
        toast({
          message: copy.slot.removed,
          action: {
            label: wardrobe.undo,
            onAction: () =>
              void (
                entry.worn
                  ? api.call('looks.wear', {
                      params: { id: entry.look.id },
                      input: { wornOn: date },
                    })
                  : api.call('plan.restore', { params: { id: entry.id } })
              )
                .then(refresh)
                .catch((err) => toast({ message: errorCopy(err) })),
          },
        }),
      )
      .catch((err) => toast({ message: errorCopy(err) }))
      .finally(refresh);
  };

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
        <h1 className="font-display text-[32px] font-light leading-[1.05] text-ink md:text-[clamp(36px,5vw,48px)]">
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

      <DayOneBand state={data.home.state} />

      {diary ? (
        <DiaryStrip
          days={diary.days}
          today={today}
          selected={current.date}
          onSelect={setSelected}
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

      {data.tray.length > 0 ? (
        <section aria-labelledby="tray" className="flex flex-col gap-3">
          <Eyebrow id="tray">{todayCopy.tray.title}</Eyebrow>
          <ul className="flex flex-col gap-2">
            {data.tray.map((job) => (
              <li key={job.id}>
                <Link
                  href={trayHref(job)}
                  className="flex justify-between gap-4 underline-offset-4 hover:underline"
                >
                  <Text>{TRAY_TITLE[trayKind(job)]}</Text>
                  <Text tone="muted" role="status">
                    {todayCopy.tray[trayState(job.status)]}
                  </Text>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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
    </div>
  );
}
