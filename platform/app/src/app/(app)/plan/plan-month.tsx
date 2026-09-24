'use client';

import { useApi } from '@robes/api-client/react';
import { plan } from '@robes/copy';
import { monthGrid, monthLabel, shiftMonth } from '@robes/core/calendar';
import { Heading, IconButton, Skeleton, Text } from '@robes/ui';
import Link from 'next/link';
import { useState } from 'react';
import { errorCopy } from '@/lib/error-copy';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Month view (M5 task 4): the whole month as a grid, looks named in their days.
export function PlanMonth({ today }: { today: string }) {
  const [month, setMonth] = useState(today.slice(0, 7));
  const grid = monthGrid(month);
  const query = useApi('plan.get', { input: { from: grid.from, days: grid.days } });
  const byDate = new Map(query.data?.days.map((d) => [d.date, d.entries]) ?? []);
  const label = monthLabel(month);

  return (
    <section aria-label={label} className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <IconButton
          icon="back"
          label={plan.prevMonth}
          onClick={() => setMonth(shiftMonth(month, -1))}
        />
        <Heading level={2} size="md">
          {label}
        </Heading>
        <IconButton
          icon="forward"
          label={plan.nextMonth}
          onClick={() => setMonth(shiftMonth(month, 1))}
        />
      </div>
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
          if (!date) return <li key={`pad-${i}`} aria-hidden className="min-h-20" />;
          const entries = byDate.get(date) ?? [];
          const isToday = date === today;
          return (
            <li
              key={date}
              aria-label={date}
              className={`flex min-h-20 flex-col gap-1 rounded-crisp border p-1 ${isToday ? 'border-ink' : 'border-hairline'}`}
            >
              <Text size="caption" tone={isToday ? undefined : 'muted'}>
                {Number(date.slice(8))}
              </Text>
              {!query.data ? (
                <Skeleton shape="text" className="h-3" />
              ) : (
                <>
                  {entries.slice(0, 2).map((e) => (
                    <Link
                      key={e.id}
                      href={`/look/${e.look.id}`}
                      className="truncate text-xs text-ink underline-offset-2 hover:underline"
                    >
                      {e.look.name}
                    </Link>
                  ))}
                  {entries.length > 2 ? (
                    <Text size="caption" tone="muted">
                      {plan.moreLooks(entries.length - 2)}
                    </Text>
                  ) : null}
                </>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
