'use client';

import { useApi } from '@robes/api-client/react';
import { plan } from '@robes/copy';
import {
  longDate,
  monthGrid,
  monthLabel,
  rangeLabel,
  type TripBand,
  tripBands,
} from '@robes/core/calendar';
import { ErrorText, Skeleton, Text } from '@robes/ui';
import Link from 'next/link';
import { useFeatures } from '@/components/features';
import { DayDots } from '@/components/plan/day-dots';
import { errorCopy } from '@/lib/error-copy';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// Month view (the native twin is mobile/src/features/plan/PlanMonth.tsx): every day on the sunk
// tile, today raised white on the fine edge with a rose dot; Cormorant numerals and a dot per look.
export function PlanMonth({ today, month }: { today: string; month: string }) {
  const grid = monthGrid(month);
  const query = useApi('plan.get', { input: { from: grid.from, days: grid.days } });
  const byDate = new Map(query.data?.days.map((d) => [d.date, d.entries.length]) ?? []);
  // Trips draw only while the trip is live (hidden at launch, legacy 2eacfb4).
  const { trips: tripsOn } = useFeatures();
  const trips = useApi('trips.list', undefined, { enabled: tripsOn });
  const inMonth = (trips.data?.items ?? []).filter(
    (t) => t.dateTo >= grid.from && t.dateFrom.slice(0, 7) <= month,
  );
  const bands = tripBands(inMonth, grid.cells);

  return (
    <section aria-label={monthLabel(month)} className="flex flex-col gap-3">
      {query.isError ? <ErrorText>{errorCopy(query.error)}</ErrorText> : null}
      <div aria-hidden className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center">
            <span className="font-sans text-[9px] tracking-[0.14em] text-ink-faint uppercase">
              {d}
            </span>
          </div>
        ))}
      </div>
      <ol aria-busy={!query.data} className="grid grid-cols-7 gap-1">
        {grid.cells.map((date, i) => {
          // biome-ignore lint/suspicious/noArrayIndexKey: padding cells are fixed grid positions
          if (!date) return <li key={`pad-${i}`} aria-hidden className="min-h-16" />;
          const looks = byDate.get(date) ?? 0;
          const isToday = date === today;
          const band = bands.get(date);
          const state = band
            ? 'border-transparent'
            : isToday
              ? 'border-rule-mid bg-surface-raised'
              : 'border-transparent bg-surface-sunk';
          return (
            <li key={date} className="relative">
              {band ? <Band band={band} /> : null}
              <Link
                href={`/plan/${date}`}
                aria-label={plan.week.day(longDate(date), looks)}
                aria-current={isToday ? 'date' : undefined}
                className={`relative flex min-h-16 flex-col items-start gap-1.5 rounded-soft border px-1.5 pt-1.5 pb-1.5 hover:border-border-control ${state} ${
                  band ? 'md:pt-9' : ''
                } ${focus}`}
              >
                <span
                  className={`flex items-center gap-1 font-display text-lg leading-none ${isToday ? 'text-ink' : 'font-light text-ink-muted'}`}
                >
                  {Number(date.slice(8))}
                  {isToday ? (
                    <i aria-hidden className="block size-1 rounded-pill bg-accent-inspire" />
                  ) : null}
                </span>
                {!query.data ? (
                  <Skeleton shape="text" className="h-1.5 w-6" />
                ) : (
                  <span className="mt-auto">
                    <DayDots looks={looks} past={date <= today} />
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ol>
      <Text size="small" tone="muted" italic className="text-center">
        {plan.monthCaption}
      </Text>
      {inMonth.length ? (
        <ul aria-label={plan.trips} className="flex flex-col gap-2 pt-3">
          {inMonth.map((t) => (
            <li key={t.id}>
              <Link
                href={`/trip/${t.id}`}
                className={`flex items-center gap-3 rounded-soft border border-hairline bg-surface-raised p-3 hover:border-border-control ${focus}`}
              >
                <span className="flex size-11 flex-col items-center justify-center rounded-crisp bg-accent-decor font-display text-lg leading-none text-ink">
                  {Number(t.dateFrom.slice(8))}
                </span>
                <span className="flex flex-col">
                  <span className="font-display text-lg text-ink">{t.destination}</span>
                  <span className="font-sans text-xs text-ink-muted">
                    {plan.tripLine(rangeOf(t), daysOf(t))}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

const rangeOf = (t: { dateFrom: string; dateTo: string }) => rangeLabel(t.dateFrom, t.dateTo);
const daysOf = (t: { dateFrom: string; dateTo: string }) =>
  Math.round((Date.parse(t.dateTo) - Date.parse(t.dateFrom)) / 86_400_000) + 1;

// The trip band fills the cell in mauve, bridging the gutters so a run reads as one colour; only
// the run's ends round. The web writes the name and range in each week's first cell.
function Band({ band }: { band: TripBand }) {
  return (
    <span
      aria-hidden
      className={`absolute inset-y-0 bg-accent-decor ${band.first ? 'left-0 rounded-l-crisp' : '-left-0.5'} ${
        band.last ? 'right-0 rounded-r-crisp' : '-right-0.5'
      }`}
    >
      {band.head ? (
        <span className="absolute inset-x-1.5 top-1.5 hidden truncate font-sans text-[10px] text-ink md:block">
          {band.title} · {band.range}
        </span>
      ) : null}
    </span>
  );
}
