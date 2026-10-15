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
import { Skeleton, Text } from '@robes/ui';
import Link from 'next/link';
import { useFeatures } from '@/components/features';
import { DayDots } from '@/components/plan/day-dots';
import { errorCopy } from '@/lib/error-copy';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// Month view: a numeral and one dot per look in each cell; every cell opens its day.
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
      {query.isError ? (
        <Text role="alert" tone="danger">
          {errorCopy(query.error)}
        </Text>
      ) : null}
      <div aria-hidden className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center">
            <Text size="caption" tone="muted">
              {d}
            </Text>
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
          return (
            <li key={date} className="relative">
              {band ? <Band band={band} /> : null}
              <Link
                href={`/plan/${date}`}
                aria-label={plan.week.day(longDate(date), looks)}
                aria-current={isToday ? 'date' : undefined}
                className={`relative flex min-h-16 flex-col items-center gap-1.5 rounded-crisp border pt-2 hover:border-border-control ${
                  isToday ? 'border-ink' : band ? 'border-transparent' : 'border-hairline'
                } ${band ? 'md:pt-9' : 'bg-bg'} ${focus}`}
              >
                <span className="font-display text-lg leading-none text-ink">
                  {Number(date.slice(8))}
                </span>
                {!query.data ? (
                  <Skeleton shape="text" className="h-1.5 w-6" />
                ) : (
                  <DayDots looks={looks} past={date <= today} />
                )}
              </Link>
            </li>
          );
        })}
      </ol>
      {inMonth.length ? (
        <ul aria-label={plan.trips} className="flex flex-col gap-2 pt-3">
          {inMonth.map((t) => (
            <li key={t.id}>
              <Link
                href={`/trip/${t.id}`}
                className={`flex items-center gap-3 rounded-crisp border border-hairline p-3 hover:border-border-control ${focus}`}
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
