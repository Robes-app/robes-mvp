'use client';

import { useApiClient } from '@robes/api-client/react';
import type { Today } from '@robes/contracts';
import { home as copy, today as todayCopy } from '@robes/copy';
import { weekdayShort } from '@robes/core/calendar';
import { WORE_IT_HOUR } from '@robes/core/home';
import { Icon } from '@robes/icons/web';
import { Eyebrow, Image, Text, useToast } from '@robes/ui';
import Link from 'next/link';
import { useState } from 'react';
import { DayDots } from '@/components/plan/day-dots';
import { dayLabel } from '@/lib/dates';
import { errorCopy } from '@/lib/error-copy';
import { imageSources } from '@/lib/image';

type Day = Today['week'][number];

const weekdayLong = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' });

// H3 · the week (activated home): the strip SELECTS a day, its card sits beneath — planned:
// the look and → the day page; nothing planned: Dress {weekday} arms the box on that date.
export function HomeWeek({
  data,
  weatherLine,
  onDress,
  onChanged,
}: {
  data: Today;
  weatherLine: string | null;
  onDress: (date: string | null) => void;
  onChanged: () => void;
}) {
  const api = useApiClient();
  const toast = useToast();
  const [selected, setSelected] = useState(data.date);
  const [logging, setLogging] = useState(false);
  const day = data.week.find((d) => d.date === selected) ?? data.week[0];
  return (
    <section aria-labelledby="home-week" className="flex flex-col gap-3" data-testid="home-week">
      <div className="flex items-baseline justify-between">
        <Eyebrow id="home-week">{copy.week.title}</Eyebrow>
        <Link href="/plan" className="font-sans text-sm underline underline-offset-4">
          {copy.week.diary}
        </Link>
      </div>
      <ol className="grid grid-cols-7 gap-1.5">
        {data.week.map((d) => {
          const isToday = d.date === data.date;
          const isSel = d.date === selected;
          return (
            <li key={d.date}>
              <button
                type="button"
                aria-pressed={isSel}
                aria-label={todayCopy.weekDay(dayLabel(d.date, data.date), d.looks)}
                aria-current={isToday ? 'date' : undefined}
                onClick={() => setSelected(d.date)}
                className={`flex min-h-[72px] w-full flex-col items-center justify-center gap-1.5 rounded-crisp border px-1 py-2 text-center ${
                  isSel ? 'border-hairline bg-surface' : 'border-transparent'
                } focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring`}
              >
                <span
                  className={`font-sans text-[9px] uppercase tracking-[0.18em] ${isToday ? 'text-accent-warm' : 'text-ink-faint'}`}
                >
                  {isToday ? copy.week.today : weekdayShort(d.date)}
                </span>
                <span className="font-display text-2xl text-ink leading-none">
                  {Number(d.date.slice(8))}
                </span>
                <DayDots looks={d.looks} past={isToday} />
              </button>
            </li>
          );
        })}
      </ol>
      {day ? (
        <DayCard
          day={day}
          today={data.date}
          hour={data.hour}
          weatherLine={day.date === data.date ? weatherLine : null}
          logging={logging}
          onDress={() => onDress(day.date === data.date ? null : day.date)}
          onWore={(lookId) => {
            setLogging(true);
            void api
              .call('looks.wear', { params: { id: lookId }, input: { wornOn: day.date } })
              .then(onChanged)
              .catch((err) => toast({ message: errorCopy(err) }))
              .finally(() => setLogging(false));
          }}
        />
      ) : null}
    </section>
  );
}

function DayCard({
  day,
  today,
  hour,
  weatherLine,
  logging,
  onDress,
  onWore,
}: {
  day: Day;
  today: string;
  hour: number;
  weatherLine: string | null;
  logging: boolean;
  onDress: () => void;
  onWore: (lookId: string) => void;
}) {
  const isToday = day.date === today;
  const label = isToday ? copy.week.today : weekdayLong(day.date);
  const look = day.first;
  if (look) {
    const src = look.image ? imageSources(look.image.renditions) : null;
    const evening = isToday && hour >= WORE_IT_HOUR;
    return (
      <div
        className="flex items-center gap-4 rounded-soft border border-hairline bg-surface p-3"
        data-testid="day-card"
        data-state="planned"
      >
        <div className="w-14 shrink-0 overflow-hidden rounded-crisp">
          {src ? (
            <Image src={src.src} srcSet={src.srcSet} sizes="56px" alt="" aspect="4:5" />
          ) : (
            <div aria-hidden className="aspect-[4/5] bg-surface-sunk" />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Text size="caption" tone="muted" className="uppercase tracking-wider">
            {label}
            {day.looks > 1 ? copy.week.looks(day.looks) : ''}
          </Text>
          <Text className="truncate font-display text-lg">{look.name}</Text>
          {look.worn ? (
            <Text size="small" tone="muted">
              {copy.week.worn}
            </Text>
          ) : evening ? (
            <button
              type="button"
              disabled={logging}
              onClick={() => onWore(look.id)}
              className="self-start font-sans text-sm underline underline-offset-4"
            >
              {copy.week.woreIt}
            </button>
          ) : weatherLine ? (
            <Text size="small" tone="muted">
              {weatherLine}
            </Text>
          ) : null}
        </div>
        <Link
          href={`/plan/${day.date}?from=today`}
          aria-label={copy.week.open(look.name)}
          className="flex size-11 items-center justify-center rounded-pill text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-focus-ring"
        >
          <Icon name="forward" size={20} />
        </Link>
      </div>
    );
  }
  if (day.date < today) {
    return (
      <div className="flex items-center gap-4 p-3" data-testid="day-card" data-state="past">
        <Text size="caption" tone="muted" className="uppercase tracking-wider">
          {label}
        </Text>
        <Text tone="muted">{copy.week.nothing}</Text>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onDress}
      data-testid="day-card"
      data-state="empty"
      className="flex items-center gap-4 rounded-soft border-[1.5px] border-border-control border-dashed p-3 text-left focus-visible:outline-2 focus-visible:outline-focus-ring"
    >
      <span className="flex size-14 shrink-0 items-center justify-center text-ink-muted">
        <Icon name="looks" size={22} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-sans text-ink-muted text-xs uppercase tracking-wider">{label}</span>
        <span className="font-display text-ink text-lg">
          {isToday ? copy.week.dressToday : copy.week.dress(label)}
        </span>
        <span className="font-sans text-ink-muted text-sm">{copy.week.dressLine}</span>
      </span>
      <Icon name="forward" size={20} className="text-ink-muted" />
    </button>
  );
}
