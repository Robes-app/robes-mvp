'use client';

import { useApiClient } from '@robes/api-client/react';
import type { Today } from '@robes/contracts';
import { home as copy, today as todayCopy } from '@robes/copy';
import { weekdayLong, weekdayShort } from '@robes/core/calendar';
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

const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';
const card = 'flex items-center gap-3.5 rounded-soft border py-2.5 pr-3.5 pl-2.5';

// H3 · the week (activated home): the strip SELECTS a day, its card sits beneath — planned:
// the look and → the day page; nothing planned: Dress {weekday} arms the box on that date.
// Beta's strip: today raised white on the fine edge with its rose label; a day she selects takes
// the warm selected edge. The native twin is mobile/src/features/home/HomeView.tsx (Week).
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
    <section aria-labelledby="home-week" className="flex flex-col gap-2.5" data-testid="home-week">
      <div className="flex min-h-6 items-center justify-between border-hairline border-b">
        <Eyebrow id="home-week">{copy.week.title}</Eyebrow>
        <Link
          href="/plan"
          className="inline-flex min-h-11 items-center font-sans text-[13px] text-ink-muted hover:text-ink"
        >
          {copy.week.diary}
        </Link>
      </div>
      <ol className="grid grid-cols-7 gap-1">
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
                className={`flex h-[70px] w-full flex-col items-center justify-center gap-0.5 rounded-soft border px-1 text-center ${
                  isToday
                    ? 'border-rule-mid bg-surface-raised'
                    : isSel
                      ? 'border-selected-line bg-selected'
                      : 'border-transparent'
                } ${focus}`}
              >
                <span
                  className={`font-sans text-[9px] font-normal uppercase tracking-[0.14em] ${isToday ? 'text-accent-warm' : 'text-ink-faint'}`}
                >
                  {isToday ? copy.week.today : weekdayShort(d.date)}
                </span>
                <span
                  className={`font-display text-[26px] text-ink leading-none ${isToday ? 'font-normal' : 'font-light'}`}
                >
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
          overnight={day.date === data.date ? data.overnight : null}
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
  overnight,
  logging,
  onDress,
  onWore,
}: {
  day: Day;
  today: string;
  hour: number;
  weatherLine: string | null;
  overnight: Today['overnight'];
  logging: boolean;
  onDress: () => void;
  onWore: (lookId: string) => void;
}) {
  const isToday = day.date === today;
  const label = isToday ? copy.week.today : weekdayLong(day.date);
  const look = day.first;
  const eyebrow = (text: string) => (
    <span
      className={`font-sans text-[11px] font-normal uppercase tracking-[0.22em] ${isToday ? 'text-accent-warm' : 'text-ink-faint'}`}
    >
      {text}
    </span>
  );
  const name = (text: string) => (
    <span className="truncate font-display text-[22px] font-light leading-[1.15] text-ink">
      {text}
    </span>
  );
  if (look) {
    const src = look.image ? imageSources(look.image.renditions) : null;
    const evening = isToday && hour >= WORE_IT_HOUR;
    return (
      <div
        className={`${card} border-hairline bg-surface-raised`}
        data-testid="day-card"
        data-state="planned"
      >
        <div className="w-16 shrink-0 overflow-hidden rounded-[6px]">
          {src ? (
            <Image src={src.src} srcSet={src.srcSet} sizes="64px" alt="" aspect="4:5" />
          ) : (
            <div aria-hidden className="aspect-[4/5] bg-surface-sunk" />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {eyebrow(`${label}${day.looks > 1 ? copy.week.looks(day.looks) : ''}`)}
          {name(look.name)}
          {look.worn ? (
            <Text size="caption" tone="muted">
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
            <Text size="caption" tone="muted">
              {weatherLine}
            </Text>
          ) : null}
        </div>
        <Link
          href={`/plan/${day.date}?from=today`}
          aria-label={copy.week.open(look.name)}
          className={`flex size-11 items-center justify-center rounded-pill text-ink-muted hover:text-ink ${focus}`}
        >
          <Icon name="forward" size={18} />
        </Link>
      </div>
    );
  }
  // The look Robes made overnight stands in for an empty today (it used to be a second row).
  if (isToday && overnight) {
    const title = overnight.headline || overnight.title;
    return (
      <Link
        href={`/today/looks/${overnight.id}`}
        aria-label={copy.week.open(title)}
        className={`${card} border-hairline bg-surface-raised ${focus}`}
        data-testid="day-card"
        data-state="overnight"
      >
        <span
          aria-hidden
          className="aspect-[4/5] w-[52px] shrink-0 rounded-[4px] bg-surface-sunk"
        />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          {eyebrow(copy.week.today)}
          {name(title)}
          {weatherLine ? (
            <span className="font-sans text-ink-muted text-xs">{weatherLine}</span>
          ) : null}
        </span>
        <Icon name="forward" size={18} className="text-ink-muted" />
      </Link>
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
      className={`${card} border-border-control border-dashed text-left ${focus}`}
    >
      <span className="flex w-[52px] shrink-0 items-center justify-center text-ink-muted">
        <Icon name="looks" size={22} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        {eyebrow(label)}
        {name(isToday ? copy.week.dressToday : copy.week.dress(label))}
        <span className="font-sans text-ink-muted text-xs">
          {isToday && weatherLine ? weatherLine : copy.week.dressLine}
        </span>
      </span>
      <Icon name="forward" size={18} className="text-ink-muted" />
    </button>
  );
}
