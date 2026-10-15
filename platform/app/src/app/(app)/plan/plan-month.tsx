'use client';

import { useApi } from '@robes/api-client/react';
import { plan } from '@robes/copy';
import { longDate, monthGrid, monthLabel } from '@robes/core/calendar';
import { Skeleton, Text } from '@robes/ui';
import Link from 'next/link';
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
          return (
            <li key={date}>
              <Link
                href={`/plan/${date}`}
                aria-label={plan.week.day(longDate(date), looks)}
                aria-current={isToday ? 'date' : undefined}
                className={`flex min-h-16 flex-col items-center gap-1.5 rounded-crisp border bg-bg pt-2 hover:border-border-control ${
                  isToday ? 'border-ink' : 'border-hairline'
                } ${focus}`}
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
    </section>
  );
}
