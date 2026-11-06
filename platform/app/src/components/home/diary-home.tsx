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
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LookPicker } from '@/app/(app)/plan/look-picker';
import { dayWordOf, type PickerMode } from '@/lib/diary';
import { errorCopy } from '@/lib/error-copy';
import { useRestyle } from '@/lib/look-states';
import { setPendingPhoto } from '@/lib/pending-photo';
import { DaySlot } from './day-slot';
import { DiaryStrip } from './diary-strip';
import { ModelPicker } from './model-picker';

// The tray's jobs, and the draft Robes is making for a day (plan 2026-11-03): read every 2 s.
const isRunning = (t: Today | undefined) =>
  (t?.tray.some((j) => !isTerminalJobStatus(j.status)) ?? false) ||
  (t?.diary?.days.some((d) => d.draft?.jobId || d.draft?.look?.framePending) ?? false);

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

// Home as the OOTD diary (Felix 3a · 3k, D7): the greeting and today's weather, the strip, the
// selected day — its looks with Swap · Edit, then her model with Capture · Describe · Pick.
// Describe opens the Draft look drawer for the day (D22); Home holds no prompt box. Alerts live
// behind the bell. The
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
  // The model her looks stand on: the photograph on the day's last page, and the picker's ticks.
  const model = useApi('me.model.get');
  const [choosing, setChoosing] = useState(false);
  const router = useRouter();
  const [drawer, setDrawer] = useState<{ date: string; mode: PickerMode } | null>(null);
  // ↻ on the draft tile: another take, same brief.
  const another = useRestyle();
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
        today={today}
        dayWord={dayWord}
        justSaved={saved}
        model={model.data}
        actions={{
          // Her photograph goes with her to the photo flow for that day.
          onCapture: (file) => {
            setPendingPhoto(file);
            router.push(`/looks/new/photo?day=${current.date}`);
          },
          // Describe opens the Draft look drawer for the day (Felix 3a, D22).
          onDescribe: past ? null : () => router.push(`/looks/draft/new?day=${current.date}`),
          onPick: () => setDrawer({ date: current.date, mode: 'add' }),
          onSwap: () => setDrawer({ date: current.date, mode: 'change' }),
          onRemove: remove,
          onModel: () => setChoosing(true),
        }}
        onAnother={another.restyle}
        anotherBusy={another.busyId !== null && another.busyId === current.draft?.look?.id}
      />

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

      <ModelPicker open={choosing} model={model.data} onClose={() => setChoosing(false)} />
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
